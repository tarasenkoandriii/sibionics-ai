const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

function isTruthyEnv(value: unknown) {
  return TRUE_VALUES.has(String(value || "false").trim().toLowerCase());
}

export function isSaasModeEnabled() {
  return isTruthyEnv(process.env.SAAS_MODE);
}

export function isMiniAppMenuEnabled() {
  return isTruthyEnv(process.env.MINI_APP);
}
