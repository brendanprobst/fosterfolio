import { spawnSync } from "node:child_process";

const SHARED_PATH = "/fosterfolio/shared";
const SENSITIVE_PATH = "/fosterfolio/sensitive";

/**
 * Maps Infisical secrets onto Terraform variables. The project ID and host aren't secret and
 * live in /fosterfolio/shared (a copy in /fosterfolio/sensitive still works; shared wins).
 * The personal API key is read only from /fosterfolio/sensitive, so GitHub Deploy app, which
 * can read shared, never supplies it.
 */
export function posthogTfEnvFromSecrets({ shared = {}, sensitive = {} }) {
  const env = {};
  const projectId = shared.POSTHOG_PROJECT_ID?.trim() || sensitive.POSTHOG_PROJECT_ID?.trim();
  const apiKey = sensitive.POSTHOG_PERSONAL_API_KEY?.trim();
  const host = shared.POSTHOG_HOST?.trim() || sensitive.POSTHOG_HOST?.trim();
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

function exportPath({ envName, projectId, path, run }) {
  const result = run(
    "infisical",
    ["export", "--env", envName, "--path", path, "--projectId", projectId, "--format", "dotenv"],
    { encoding: "utf8" },
  );
  if (result.error || result.status !== 0) return null;
  return parseDotenv(result.stdout || "");
}

export function loadPosthogTfEnv({ envName, projectId, run = spawnSync }) {
  const shared = exportPath({ envName, projectId, path: SHARED_PATH, run });
  const sensitive = exportPath({ envName, projectId, path: SENSITIVE_PATH, run });
  if (!shared && !sensitive) {
    return { env: {}, status: "unavailable" };
  }
  const env = posthogTfEnvFromSecrets({ shared: shared ?? {}, sensitive: sensitive ?? {} });
  const hasId = Boolean(env.TF_VAR_posthog_project_id);
  const hasKey = Boolean(env.TF_VAR_posthog_personal_api_key);
  if (hasId && hasKey) return { env, status: "loaded" };
  if (hasId || hasKey) return { env, status: "partial" };
  return { env, status: "missing" };
}
