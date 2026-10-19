# Error alarms for the two Lambdas, emailed through SNS. Each address must confirm the
# subscription from the email AWS sends after the first apply.
#
# Lambda's Errors metric counts invocations that threw or timed out. Express turns route
# errors into 500 responses, so an API error here means a crash, a timeout or a cold start
# that failed (for example a missing SSM parameter).

resource "aws_sns_topic" "alarms" {
  name = "${local.name_prefix}-alarms"
}

resource "aws_sns_topic_subscription" "alarms_email" {
  for_each = toset(var.alarm_email_addresses)

  topic_arn = aws_sns_topic.alarms.arn
  protocol  = "email"
  endpoint  = each.value
}

# Hourly job: alarm when 2 of the last 3 runs failed, so one transient PostHog or Supabase
# error doesn't page. A job that fails every hour alarms within about 2 hours.
resource "aws_cloudwatch_metric_alarm" "analytics_rollup_errors" {
  alarm_name          = "${local.name_prefix}-analytics-rollup-errors"
  alarm_description   = "The hourly analytics rollup failed in 2 of the last 3 hours. Check its CloudWatch logs."
  namespace           = "AWS/Lambda"
  metric_name         = "Errors"
  dimensions          = { FunctionName = aws_lambda_function.analytics_rollup.function_name }
  statistic           = "Sum"
  period              = 3600
  evaluation_periods  = 3
  datapoints_to_alarm = 2
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  # A disabled schedule (no PostHog credentials) has no datapoints and shouldn't alarm.
  treat_missing_data = "notBreaching"
  alarm_actions      = [aws_sns_topic.alarms.arn]
  ok_actions         = [aws_sns_topic.alarms.arn]
}

resource "aws_cloudwatch_metric_alarm" "api_errors" {
  alarm_name          = "${local.name_prefix}-api-errors"
  alarm_description   = "The API Lambda crashed or timed out 3 or more times in 5 minutes. Check its CloudWatch logs."
  namespace           = "AWS/Lambda"
  metric_name         = "Errors"
  dimensions          = { FunctionName = aws_lambda_function.api.function_name }
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 3
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  ok_actions          = [aws_sns_topic.alarms.arn]
}
