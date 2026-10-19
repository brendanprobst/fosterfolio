import assert from "node:assert/strict";
import test from "node:test";
import {
  loadPosthogTfEnv,
  parseDotenv,
  posthogTfEnvFromSecrets,
} from "../../scripts/posthog-infisical.mjs";

/** Fakes `infisical export`, answering per --path. `null` makes that path's export fail. */
function fakeInfisical(byPath) {
  const calls = [];
  const run = (_cmd, args) => {
    const path = args[args.indexOf("--path") + 1];
    calls.push({ env: args[args.indexOf("--env") + 1], path });
    const text = byPath[path];
    if (text === null || text === undefined) return { status: 1, stdout: "", stderr: "boom" };
    return { status: 0, stdout: text };
  };
  return { run, calls };
}

test("maps the project ID and host from shared and the API key from sensitive", () => {
  const env = posthogTfEnvFromSecrets({
    shared: {
      POSTHOG_PROJECT_ID: " 42 ",
      POSTHOG_HOST: "https://eu.posthog.com",
      NEXT_PUBLIC_POSTHOG_TOKEN: "phc_keep-out",
    },
    sensitive: {
      POSTHOG_PERSONAL_API_KEY: "phx_test",
      SUPABASE_DB_URL: "postgres://keep-out",
    },
  });
  assert.deepEqual(env, {
    TF_VAR_posthog_project_id: "42",
    TF_VAR_posthog_personal_api_key: "phx_test",
    TF_VAR_posthog_api_host: "https://eu.posthog.com",
  });
});

test("still accepts a project ID and host kept in sensitive", () => {
  const env = posthogTfEnvFromSecrets({
    shared: {},
    sensitive: {
      POSTHOG_PROJECT_ID: "42",
      POSTHOG_HOST: "https://eu.posthog.com",
      POSTHOG_PERSONAL_API_KEY: "phx_test",
    },
  });
  assert.equal(env.TF_VAR_posthog_project_id, "42");
  assert.equal(env.TF_VAR_posthog_api_host, "https://eu.posthog.com");
});

test("prefers shared when both paths have a project ID", () => {
  const env = posthogTfEnvFromSecrets({
    shared: { POSTHOG_PROJECT_ID: "42" },
    sensitive: { POSTHOG_PROJECT_ID: "7", POSTHOG_PERSONAL_API_KEY: "phx_test" },
  });
  assert.equal(env.TF_VAR_posthog_project_id, "42");
});

// GitHub Deploy app can read /fosterfolio/shared, so the personal key must not come from there.
test("ignores a personal API key in shared", () => {
  const env = posthogTfEnvFromSecrets({
    shared: { POSTHOG_PROJECT_ID: "42", POSTHOG_PERSONAL_API_KEY: "phx_leaked" },
    sensitive: {},
  });
  assert.equal(env.TF_VAR_posthog_personal_api_key, undefined);
});

test("leaves the host unset when Infisical does not have one", () => {
  const env = posthogTfEnvFromSecrets({
    shared: { POSTHOG_PROJECT_ID: "42" },
    sensitive: { POSTHOG_PERSONAL_API_KEY: "phx_test" },
  });
  assert.equal(env.TF_VAR_posthog_api_host, undefined);
});

test("loads the ID from shared and the key from sensitive for the chosen env", () => {
  const { run, calls } = fakeInfisical({
    "/fosterfolio/shared": "POSTHOG_PROJECT_ID=42\nNEXT_PUBLIC_POSTHOG_TOKEN=phc_x\n",
    "/fosterfolio/sensitive": 'POSTHOG_PERSONAL_API_KEY="phx_test"\n',
  });

  const loaded = loadPosthogTfEnv({ envName: "dev", projectId: "ws-1", run });

  assert.equal(loaded.status, "loaded");
  assert.deepEqual(loaded.env, {
    TF_VAR_posthog_project_id: "42",
    TF_VAR_posthog_personal_api_key: "phx_test",
  });
  assert.deepEqual(calls, [
    { env: "dev", path: "/fosterfolio/shared" },
    { env: "dev", path: "/fosterfolio/sensitive" },
  ]);
});

test("reports partial when only one path has its value", () => {
  const { run } = fakeInfisical({
    "/fosterfolio/shared": "",
    "/fosterfolio/sensitive": "POSTHOG_PERSONAL_API_KEY=phx_test\n",
  });
  assert.equal(loadPosthogTfEnv({ envName: "dev", projectId: "ws-1", run }).status, "partial");
});

test("uses whichever path it could read when the other export fails", () => {
  const { run } = fakeInfisical({
    "/fosterfolio/shared": null,
    "/fosterfolio/sensitive": "POSTHOG_PROJECT_ID=42\nPOSTHOG_PERSONAL_API_KEY=phx_test\n",
  });
  assert.equal(loadPosthogTfEnv({ envName: "dev", projectId: "ws-1", run }).status, "loaded");
});

test("reports unavailable only when neither path can be read", () => {
  const { run } = fakeInfisical({ "/fosterfolio/shared": null, "/fosterfolio/sensitive": null });
  assert.deepEqual(loadPosthogTfEnv({ envName: "dev", projectId: "ws-1", run }), {
    env: {},
    status: "unavailable",
  });
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
