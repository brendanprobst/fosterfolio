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

# Handled 5xx responses (route returns 500 without throwing) never bump Lambda's Errors metric.
# The API logs one "API_5XX status=..." line per 5xx response (apps/api/utils/serverErrorLog.ts);
# this filter turns each line into a metric the alarm below can watch.
resource "aws_cloudwatch_log_metric_filter" "api_5xx" {
  name           = "${local.name_prefix}-api-5xx"
  log_group_name = "/aws/lambda/${aws_lambda_function.api.function_name}"
  pattern        = "\"API_5XX\""

  metric_transformation {
    name          = "Api5xxCount"
    namespace     = "Fosterfolio/API"
    value         = "1"
    default_value = "0"
  }
}

resource "aws_cloudwatch_metric_alarm" "api_5xx" {
  alarm_name          = "${local.name_prefix}-api-5xx"
  alarm_description   = "The API returned a 5xx response, including handled errors. Search the API log group for API_5XX, then check the stack trace logged just before it."
  namespace           = "Fosterfolio/API"
  metric_name         = "Api5xxCount"
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  ok_actions          = [aws_sns_topic.alarms.arn]
}
