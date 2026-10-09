import { spawnSync } from "node:child_process";

/**
 * Maps Infisical /fosterfolio/sensitive keys onto Terraform variables.
 * The personal API key stays out of /fosterfolio/shared so GitHub Deploy app cannot read it.
 */
export function posthogTfEnvFromSecrets(secrets) {
  const env = {};
  const projectId = secrets.POSTHOG_PROJECT_ID?.trim();
  const apiKey = secrets.POSTHOG_PERSONAL_API_KEY?.trim();
  const host = secrets.POSTHOG_HOST?.trim();
  if (projectId) env.TF_VAR_posthog_project_id = projectId;
  if (apiKey) env.TF_VAR_posthog_personal_api_key = apiKey;
  if (host) env.TF_VAR_posthog_api_host = host;
  return env;
}

export function parseDotenv(text) {
  const secrets = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    secrets[key] = value;
  }
  return secrets;
}

export function loadPosthogTfEnv({ envName, projectId, run = spawnSync }) {
  const result = run(
    "infisical",
    [
      "export",
      "--env",
      envName,
      "--path",
      "/fosterfolio/sensitive",
      "--projectId",
      projectId,
      "--format",
      "dotenv",
    ],
    { encoding: "utf8" },
  );
  if (result.error || result.status !== 0) {
    return { env: {}, status: "unavailable" };
  }
  const env = posthogTfEnvFromSecrets(parseDotenv(result.stdout || ""));
  const hasId = Boolean(env.TF_VAR_posthog_project_id);
  const hasKey = Boolean(env.TF_VAR_posthog_personal_api_key);
  if (hasId && hasKey) return { env, status: "loaded" };
  if (hasId || hasKey) return { env, status: "partial" };
  return { env, status: "missing" };
}
