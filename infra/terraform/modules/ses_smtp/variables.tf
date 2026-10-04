variable "domain" {
  description = "Apex domain to verify in SES (for example fosterfolio.com)."
  type        = string
}

variable "from_email" {
  description = "From address Supabase Auth uses. Must be an address on var.domain."
  type        = string
}

variable "from_name" {
  description = "Display name on Auth emails."
  type        = string
}

variable "zone_id" {
  description = "Route 53 hosted zone that owns var.domain."
  type        = string
}

variable "aws_region" {
  description = "Region of the SES identity and SMTP endpoint."
  type        = string
}

variable "name_prefix" {
  description = "Prefix for the IAM user and SSM parameter path."
  type        = string
}

variable "ssm_path_prefix" {
  description = "SSM path prefix. SMTP username and password are stored under ses/."
  type        = string
}

variable "tags" {
  description = "Tags applied to supported resources."
  type        = map(string)
  default     = {}
}

variable "supabase_project_ref" {
  description = "Supabase project ref that should send Auth mail through this identity."
  type        = string
  default     = ""
}

variable "supabase_access_token" {
  description = "Supabase account access token. When set, Terraform pushes the SMTP settings to Auth."
  type        = string
  sensitive   = true
  default     = ""
}
