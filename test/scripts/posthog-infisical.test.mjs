import assert from "node:assert/strict";
import test from "node:test";
import { parseDotenv, posthogTfEnvFromSecrets } from "../../scripts/posthog-infisical.mjs";

test("maps PostHog sensitive keys onto Terraform variables", () => {
  const env = posthogTfEnvFromSecrets({
    POSTHOG_PROJECT_ID: " 42 ",
    POSTHOG_PERSONAL_API_KEY: "phx_test",
    POSTHOG_HOST: "https://eu.posthog.com",
    SUPABASE_DB_URL: "postgres://keep-out",
  });
  assert.deepEqual(env, {
    TF_VAR_posthog_project_id: "42",
    TF_VAR_posthog_personal_api_key: "phx_test",
    TF_VAR_posthog_api_host: "https://eu.posthog.com",
  });
});

test("leaves the host unset when Infisical does not have one", () => {
  const env = posthogTfEnvFromSecrets({
    POSTHOG_PROJECT_ID: "42",
    POSTHOG_PERSONAL_API_KEY: "phx_test",
  });
  assert.equal(env.TF_VAR_posthog_api_host, undefined);
});

test("parses a dotenv export", () => {
  const secrets = parseDotenv(`
# comment
POSTHOG_PROJECT_ID=99
POSTHOG_PERSONAL_API_KEY="phx_quoted"
SUPABASE_DB_URL=postgres://example
`);
  assert.equal(secrets.POSTHOG_PROJECT_ID, "99");
  assert.equal(secrets.POSTHOG_PERSONAL_API_KEY, "phx_quoted");
});
