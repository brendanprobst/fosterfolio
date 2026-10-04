output "smtp_host" {
  description = "SES SMTP endpoint."
  value       = local.smtp_host
}

output "smtp_port" {
  description = "SES SMTP port (implicit TLS)."
  value       = local.smtp_port
}

output "from_email" {
  description = "From address configured for Auth mail."
  value       = var.from_email
}

output "identity_arn" {
  description = "SES email identity ARN."
  value       = aws_sesv2_email_identity.domain.arn
}

output "smtp_username_parameter_name" {
  description = "SSM name of the SMTP username."
  value       = aws_ssm_parameter.smtp_username.name
}

output "smtp_password_parameter_name" {
  description = "SSM name of the SMTP password."
  value       = aws_ssm_parameter.smtp_password.name
}

output "supabase_auth_smtp_configured" {
  description = "True when this apply pushed SMTP settings to Supabase Auth."
  value       = nonsensitive(local.push_to_supabase)
}
