import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';

async function loadSsmEnvVar(
  client: SSMClient,
  envName: 'SUPABASE_URL' | 'SUPABASE_SERVICE_ROLE_KEY',
  parameterEnvName: 'SUPABASE_URL_PARAM' | 'SUPABASE_SERVICE_ROLE_KEY_PARAM',
): Promise<void> {
  if (process.env[envName]) {
    return;
  }

  const parameterName = process.env[parameterEnvName];
  if (!parameterName) {
    return;
  }

  const result = await client.send(
    new GetParameterCommand({
      Name: parameterName,
      WithDecryption: true,
    })
  );

  const value = result.Parameter?.Value;
  if (!value) {
    throw new Error(`Missing SSM parameter value for ${parameterName}`);
  }

  process.env[envName] = value;
}

export async function loadSupabaseEnvFromSsm(): Promise<void> {
  const ssmClient = new SSMClient({});
  await loadSsmEnvVar(ssmClient, 'SUPABASE_URL', 'SUPABASE_URL_PARAM');
  await loadSsmEnvVar(ssmClient, 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY_PARAM');
}
