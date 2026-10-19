import {
  FOSTERFOLIO_DAILY_AGGREGATE_HOGQL,
  ROLLUP_ROW_LIMIT,
} from '@api/application/analytics/fosterfolioDailyQuery';
import { FOSTERFOLIO_OWNER_DAILY_HOGQL, mapOwnerDailyRow } from '@api/application/analytics/ownerDailyQuery';
import { RollupRowVerifier, type RollupSkipCounts } from '@api/application/analytics/verifyRollupRows';
import { SupabaseAdapter } from '@api/infrastructure/adapters/supabase/SupabaseAdapter';
import { AnalyticsDailyRepository } from '@api/infrastructure/repositories/AnalyticsDailyRepository';
import { AnalyticsOwnerDailyRepository } from '@api/infrastructure/repositories/AnalyticsOwnerDailyRepository';
import { PetRepository } from '@api/infrastructure/repositories/PetRepository';
import { TrackedLinkRepository } from '@api/infrastructure/repositories/TrackedLinkRepository';
import { UserRepository } from '@api/infrastructure/repositories/UserRepository';
import { loadSupabaseEnvFromSsm } from '@api/lambdaEnv';
import { Logger } from '@api/utils/logger';
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
  const adapter = new SupabaseAdapter();
  const repository = new AnalyticsDailyRepository(adapter);
  const ownerRepository = new AnalyticsOwnerDailyRepository(adapter);
  const verifier = new RollupRowVerifier(
    new PetRepository(adapter),
    new UserRepository(adapter),
    new TrackedLinkRepository(adapter)
  );

  const ownerRecords = await provider.queryRecords({ hogql: FOSTERFOLIO_OWNER_DAILY_HOGQL });
  const ownerRows = ownerRecords
    .map((row) => mapOwnerDailyRow(row))
    .filter((row): row is NonNullable<typeof row> => row !== null);
  let written = 0;
  let skipped: RollupSkipCounts = {};
  const petRollup = await runRollup({
    provider,
    query: { hogql: FOSTERFOLIO_DAILY_AGGREGATE_HOGQL },
    upsert: async (rows) => {
      const verified = await verifier.verify({
        petRows: rows.map((row) => ({
          petId: row.pet_id,
          linkId: row.link_id,
          channelKey: row.channel_key,
          city: row.city,
          day: row.day,
          views: row.views,
          approxVisitors: row.approx_visitors,
          formOpens: row.form_opens,
        })),
        ownerRows,
      });
      await repository.upsert(verified.petRows);
      await ownerRepository.upsert(verified.ownerRows);
      written = verified.petRows.length + verified.ownerRows.length;
      skipped = verified.skipped;
    },
  });

  const petQueried = petRollup.rows + petRollup.skipped;
  if (petQueried >= ROLLUP_ROW_LIMIT || ownerRecords.length >= ROLLUP_ROW_LIMIT) {
    Logger.warning(
      `[analytics-rollup] query hit the ${ROLLUP_ROW_LIMIT}-row limit ` +
        `(pet ${petQueried}, owner ${ownerRecords.length}); ` +
        'some rows from the oldest days were not refreshed'
    );
  }

  const malformed = petRollup.skipped + ownerRecords.length - ownerRows.length;
  if (malformed > 0) skipped.malformed = (skipped.malformed ?? 0) + malformed;
  if (Object.keys(skipped).length > 0) {
    // Counts only: the skipped values are attacker-controlled.
    Logger.warning(`[analytics-rollup] skipped untrusted rows ${JSON.stringify(skipped)}`);
  }
  return { rows: written };
};
