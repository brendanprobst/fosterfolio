# Cross-variable rules for optional custom web hostname + Route 53 (Terraform 1.5+).

check "web_custom_domain_route53" {
  assert {
    condition = (
      var.web_custom_domain == null ||
      trimspace(var.web_custom_domain) == "" ||
      !var.manage_web_dns_in_route53 ||
      (
        var.create_route53_hosted_zone ? (
          var.route53_zone_name != null && trimspace(var.route53_zone_name) != ""
          ) : (
          var.route53_hosted_zone_id != null && trimspace(var.route53_hosted_zone_id) != ""
        )
      )
    )
    error_message = "When web_custom_domain is set, either create_route53_hosted_zone with route53_zone_name, or route53_hosted_zone_id (without creating a zone), must be set."
  }
}

check "ses_smtp_config" {
  assert {
    condition = !var.enable_ses_smtp || (
      var.ses_domain != null &&
      trimspace(var.ses_domain) != "" &&
      var.ses_from_email != null &&
      endswith(lower(trimspace(var.ses_from_email)), "@${lower(trimspace(var.ses_domain))}") &&
      trimspace(var.ses_from_name) != "" &&
      local.route53_zone_id != null &&
      trimspace(local.route53_zone_id) != ""
    )
    error_message = "enable_ses_smtp requires ses_domain, an ses_from_email on that domain, ses_from_name, and a Route 53 zone (create_route53_hosted_zone or route53_hosted_zone_id)."
  }
}

check "route53_create_not_with_existing_zone_id" {
  assert {
    condition = !(
      var.create_route53_hosted_zone &&
      var.route53_hosted_zone_id != null &&
      trimspace(var.route53_hosted_zone_id) != ""
    )
    error_message = "Do not set both create_route53_hosted_zone and route53_hosted_zone_id; use create + route53_zone_name, or an existing route53_hosted_zone_id."
  }
}
