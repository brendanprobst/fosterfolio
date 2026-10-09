import { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import serverlessExpress from '@vendia/serverless-express';
import { createApp } from '@api/app';
import { loadSupabaseEnvFromSsm } from '@api/lambdaEnv';

let cachedServer: ReturnType<typeof serverlessExpress> | null = null;

async function bootstrapServer() {
  await loadSupabaseEnvFromSsm();
  const app = createApp();
  return serverlessExpress({ app });
}

export const handler = async (event: APIGatewayProxyEventV2, context: Context) => {
  if (!cachedServer) {
    cachedServer = await bootstrapServer();
  }

  return cachedServer(event, context, () => undefined);
};
