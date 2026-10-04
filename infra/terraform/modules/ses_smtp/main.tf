locals {
  mail_from_domain = "mail.${var.domain}"
  smtp_host        = "email-smtp.${var.aws_region}.amazonaws.com"
  smtp_port        = "465"
  push_to_supabase = var.supabase_access_token != "" && var.supabase_project_ref != ""
}

resource "aws_sesv2_email_identity" "domain" {
  email_identity = var.domain
}

resource "aws_route53_record" "dkim" {
  count = 3

  zone_id = var.zone_id
  name    = "${aws_sesv2_email_identity.domain.dkim_signing_attributes[0].tokens[count.index]}._domainkey.${var.domain}"
  type    = "CNAME"
  ttl     = 600
  records = ["${aws_sesv2_email_identity.domain.dkim_signing_attributes[0].tokens[count.index]}.dkim.amazonses.com"]
}

resource "aws_sesv2_email_identity_mail_from_attributes" "domain" {
  email_identity         = aws_sesv2_email_identity.domain.email_identity
  mail_from_domain       = local.mail_from_domain
  behavior_on_mx_failure = "USE_DEFAULT_VALUE"

  depends_on = [
    aws_route53_record.mail_from_mx,
    aws_route53_record.mail_from_spf,
  ]
}

resource "aws_route53_record" "mail_from_mx" {
  zone_id = var.zone_id
  name    = local.mail_from_domain
  type    = "MX"
  ttl     = 600
  records = ["10 feedback-smtp.${var.aws_region}.amazonses.com"]
}

resource "aws_route53_record" "mail_from_spf" {
  zone_id = var.zone_id
  name    = local.mail_from_domain
  type    = "TXT"
  ttl     = 600
  records = ["v=spf1 include:amazonses.com ~all"]
}

resource "aws_iam_user" "smtp" {
  name          = "${var.name_prefix}-ses-smtp"
  force_destroy = true
  tags          = var.tags
}

resource "aws_iam_user_policy" "smtp_send" {
  name = "${var.name_prefix}-ses-smtp-send"
  user = aws_iam_user.smtp.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "ses:SendRawEmail"
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_access_key" "smtp" {
  user = aws_iam_user.smtp.name
}

data "external" "smtp_password" {
  program = ["node", "${path.module}/smtp_password.mjs"]

  query = {
    secret = aws_iam_access_key.smtp.secret
    region = var.aws_region
  }
}

resource "aws_ssm_parameter" "smtp_username" {
  name        = "${trimsuffix(var.ssm_path_prefix, "/")}/ses/smtp_username"
  description = "SES SMTP username for Supabase Auth."
  type        = "SecureString"
  value       = aws_iam_access_key.smtp.id
  tags        = var.tags
}

resource "aws_ssm_parameter" "smtp_password" {
  name        = "${trimsuffix(var.ssm_path_prefix, "/")}/ses/smtp_password"
  description = "SES SMTP password for Supabase Auth."
  type        = "SecureString"
  value       = data.external.smtp_password.result.password
  tags        = var.tags
}

resource "terraform_data" "supabase_auth_smtp" {
  count = local.push_to_supabase ? 1 : 0

  input = {
    project_ref = var.supabase_project_ref
    token       = var.supabase_access_token
    host        = local.smtp_host
    port        = local.smtp_port
    user        = aws_iam_access_key.smtp.id
    password    = data.external.smtp_password.result.password
    from_email  = var.from_email
    from_name   = var.from_name
  }

  provisioner "local-exec" {
    command = "node ${path.module}/configure_supabase_smtp.mjs"
    environment = {
      SUPABASE_ACCESS_TOKEN = self.input.token
      SUPABASE_PROJECT_REF  = self.input.project_ref
      SMTP_HOST             = self.input.host
      SMTP_PORT             = self.input.port
      SMTP_USER             = self.input.user
      SMTP_PASS             = self.input.password
      SMTP_ADMIN_EMAIL      = self.input.from_email
      SMTP_SENDER_NAME      = self.input.from_name
    }
  }
}
