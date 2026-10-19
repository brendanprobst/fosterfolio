# @lattice/analytics

Cookieless first-touch attribution and one `posthog-js` browser client. The package does not know about Fosterfolio pets or inquiries. The app passes the query param, storage key, and resolve URL.

Ad blockers block PostHog for a meaningful share of visitors. Follow-up: proxy ingestion through a CloudFront path on our own domain.

Attribution resolves once per session and is never overwritten: a matching query code via the public resolve API, otherwise the referrer map, otherwise `direct`.
