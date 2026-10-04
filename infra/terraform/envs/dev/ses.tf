locals {
  supabase_project_ref = try(regex("^https://([^.]+)\\.supabase\\.co/?$", var.supabase_url)[0], "")
}

module "ses_smtp" {
  count  = var.enable_ses_smtp ? 1 : 0
  source = "../../modules/ses_smtp"

  # Placeholders keep count = 0 valid in environments that have not opted in.
  domain          = trimspace(coalesce(var.ses_domain, "example.com"))
  from_email      = trimspace(coalesce(var.ses_from_email, "auth@example.com"))
  from_name       = trimspace(var.ses_from_name)
  zone_id         = coalesce(local.route53_zone_id, "Z0000000000000000")
  aws_region      = var.aws_region
  name_prefix     = local.name_prefix
  ssm_path_prefix = local.ssm_path_prefix
  tags            = local.default_tags

  supabase_project_ref  = local.supabase_project_ref
  supabase_access_token = var.supabase_access_token
}
