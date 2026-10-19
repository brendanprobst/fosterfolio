import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';

type SsmClientLike = Pick<SSMClient, 'send'>;

const SUPABASE_ENV = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const;

/** Read by `readInquirySecrets`, which refuses to start production without them. */
const INQUIRY_SECRET_ENV = ['TURNSTILE_SECRET_KEY', 'INQUIRY_SOURCE_TOKEN_SECRET'] as const;

/**
 * For each `NAME`, reads the SSM parameter named by `NAME_PARAM` into `NAME`.
 * A value already set wins, and a missing `NAME_PARAM` is skipped. Callers decide what is required.
 */
export async function loadEnvFromSsm(
  names: readonly string[],
  client: SsmClientLike = new SSMClient({})
): Promise<void> {
  await Promise.all(
    names.map(async (envName) => {
      if (process.env[envName]) return;
      const parameterName = process.env[`${envName}_PARAM`];
      if (!parameterName) return;

      const result = await client.send(
        new GetParameterCommand({ Name: parameterName, WithDecryption: true })
      );
      const value = result.Parameter?.Value;
      if (!value) {
        throw new Error(`Missing SSM parameter value for ${parameterName}`);
      }
      process.env[envName] = value;
    })
  );
}

export async function loadSupabaseEnvFromSsm(): Promise<void> {
  await loadEnvFromSsm(SUPABASE_ENV);
}

/** Everything the API Lambda reads from SSM. The analytics rollup needs only Supabase. */
export async function loadApiEnvFromSsm(): Promise<void> {
  await loadEnvFromSsm([...SUPABASE_ENV, ...INQUIRY_SECRET_ENV]);
}
