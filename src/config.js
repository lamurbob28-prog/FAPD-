import "dotenv/config";

function readBool(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return ["1", "true", "yes", "y", "on"].includes(String(value).toLowerCase());
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

export const config = {
  discordToken: requireEnv("DISCORD_TOKEN"),
  clientId: requireEnv("CLIENT_ID"),
  guildId: requireEnv("GUILD_ID"),
  modLogChannelId: requireEnv("MOD_LOG_CHANNEL_ID"),

  rotector: {
    baseUrl: (process.env.ROTECTOR_API_BASE || "https://roscoe.rotector.com").replace(/\/$/, ""),
    apiKey: process.env.ROTECTOR_API_KEY || "",
    authHeader: process.env.ROTECTOR_AUTH_HEADER || "Authorization",
    authPrefix: process.env.ROTECTOR_AUTH_PREFIX ?? "Bearer "
  },

  actionMode: (process.env.ACTION_MODE || "log").toLowerCase(),
  timeoutMinutes: Number(process.env.TIMEOUT_MINUTES || 60),
  ephemeralCommands: readBool(process.env.EPHEMERAL_COMMANDS, true)
};

export function validateActionMode() {
  const allowed = new Set(["log", "timeout", "kick", "ban"]);
  if (!allowed.has(config.actionMode)) {
    throw new Error(`Invalid ACTION_MODE=${config.actionMode}. Use log, timeout, kick, or ban.`);
  }
}
