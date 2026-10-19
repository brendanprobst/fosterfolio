import { GetParameterCommand } from '@aws-sdk/client-ssm';
import { loadEnvFromSsm } from '@api/lambdaEnv';

const NAMES = ['LAMBDA_ENV_TEST_A', 'LAMBDA_ENV_TEST_B'];

function fakeSsm(values: Record<string, string | undefined>) {
  const requested: string[] = [];
  const client = {
    send: async (command: GetParameterCommand) => {
      const name = command.input.Name ?? '';
      requested.push(name);
      return { Parameter: { Value: values[name] } };
    },
  };
  return { client: client as unknown as Parameters<typeof loadEnvFromSsm>[1], requested };
}

describe('loadEnvFromSsm', () => {
  afterEach(() => {
    for (const name of NAMES) {
      delete process.env[name];
      delete process.env[`${name}_PARAM`];
    }
  });

  it('reads each NAME from the SSM parameter named by NAME_PARAM', async () => {
    process.env.LAMBDA_ENV_TEST_A_PARAM = '/app/a';
    process.env.LAMBDA_ENV_TEST_B_PARAM = '/app/b';
    const { client, requested } = fakeSsm({ '/app/a': 'value-a', '/app/b': 'value-b' });

    await loadEnvFromSsm(NAMES, client);

    expect(process.env.LAMBDA_ENV_TEST_A).toBe('value-a');
    expect(process.env.LAMBDA_ENV_TEST_B).toBe('value-b');
    expect(requested.sort()).toEqual(['/app/a', '/app/b']);
  });

  it('keeps a value that is already set and skips names with no _PARAM', async () => {
    process.env.LAMBDA_ENV_TEST_A = 'from-env';
    process.env.LAMBDA_ENV_TEST_A_PARAM = '/app/a';
    const { client, requested } = fakeSsm({ '/app/a': 'from-ssm' });

    await loadEnvFromSsm(NAMES, client);

    expect(process.env.LAMBDA_ENV_TEST_A).toBe('from-env');
    expect(process.env.LAMBDA_ENV_TEST_B).toBeUndefined();
    expect(requested).toEqual([]);
  });

  it('throws when the parameter exists but has no value', async () => {
    process.env.LAMBDA_ENV_TEST_A_PARAM = '/app/a';
    const { client } = fakeSsm({});

    await expect(loadEnvFromSsm(NAMES, client)).rejects.toThrow(
      'Missing SSM parameter value for /app/a'
    );
  });
});
