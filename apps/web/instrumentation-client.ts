import { getAnalyticsAdapter } from "@client/lib/analytics/getAnalyticsAdapter";

// Ad blockers block PostHog for a meaningful share of visitors.
// Follow-up: proxy ingestion through a CloudFront path on our own domain.
getAnalyticsAdapter().initFromEnv();
