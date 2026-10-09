import { FOSTERFOLIO_DAILY_AGGREGATE_HOGQL } from '@api/application/analytics/fosterfolioDailyQuery';
import { SupabaseAdapter } from '@api/infrastructure/adapters/supabase/SupabaseAdapter';
import { AnalyticsDailyRepository } from '@api/infrastructure/repositories/AnalyticsDailyRepository';
import { loadSupabaseEnvFromSsm } from '@api/lambdaEnv';
import { PostHogProvider, runRollup } from '@lattice/analytics/server';

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const handler = async (): Promise<{ rows: number }> => {
  await loadSupabaseEnvFromSsm();

  const provider = new PostHogProvider({
    host: process.env.POSTHOG_HOST?.trim() || 'https://us.posthog.com',
    projectId: requireEnv('POSTHOG_PROJECT_ID'),
    personalApiKey: requireEnv('POSTHOG_PERSONAL_API_KEY'),
  });
  const repository = new AnalyticsDailyRepository(new SupabaseAdapter());
  return runRollup({
    provider,
    query: { hogql: FOSTERFOLIO_DAILY_AGGREGATE_HOGQL },
    upsert: async (rows) => {
      await repository.upsert(
        rows.map((row) => ({
          petId: row.pet_id,
          linkId: row.link_id,
          channelKey: row.channel_key,
          city: row.city,
          day: row.day,
          views: row.views,
          approxVisitors: row.approx_visitors,
          formOpens: row.form_opens,
        }))
      );
    },
  });
};
