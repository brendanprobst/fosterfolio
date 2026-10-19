import type { AnalyticsAdapter } from "../AnalyticsAdapter";
import { initFosterfolioAnalytics } from "../initFosterfolioAnalytics";
import { getPostHogBrowserClient } from "@lattice/analytics";
import type { PostHog } from "posthog-js";

/**
 * PostHog Cloud / self-hosted via `posthog-js` (see `docs/playbooks/posthog-analytics.md`).
 */
export class PostHogAnalyticsAdapter implements AnalyticsAdapter {
  private didInit = false;

  isEnabled(): boolean {
    return true;
  }

  initFromEnv(): void {
    if (this.didInit) {
      return;
    }
    this.didInit = true;
    initFosterfolioAnalytics();
  }

  capturePageView(href: string): void {
    getPostHogBrowserClient()?.capture("$pageview", {
      $current_url: href,
    });
  }

  getPostHogClient(): PostHog | null {
    return getPostHogBrowserClient();
  }
}
