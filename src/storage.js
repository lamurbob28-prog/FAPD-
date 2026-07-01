import fs from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.resolve("data");
const DATA_FILE = path.join(DATA_DIR, "fapd.json");

const defaultData = {
  version: 1,
  guilds: {}
};

async function ensureFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify(defaultData, null, 2), "utf8");
  }
}

export async function readData() {
  await ensureFile();
  const raw = await fs.readFile(DATA_FILE, "utf8");

  try {
    const parsed = JSON.parse(raw);
    parsed.guilds ??= {};
    return parsed;
  } catch {
    return structuredClone(defaultData);
  }
}

export async function writeData(data) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

function getGuildState(data, guildId) {
  data.guilds[guildId] ??= {
    whitelistDiscord: [],
    whitelistRoblox: [],
    notes: {},
    lastSeenFlags: {}
  };

  data.guilds[guildId].whitelistDiscord ??= [];
  data.guilds[guildId].whitelistRoblox ??= [];
  data.guilds[guildId].notes ??= {};
  data.guilds[guildId].lastSeenFlags ??= {};

  return data.guilds[guildId];
}

export async function isWhitelistedDiscord(guildId, discordUserId) {
  const data = await readData();
  const state = getGuildState(data, guildId);
  return state.whitelistDiscord.includes(String(discordUserId));
}

export async function addDiscordWhitelist(guildId, discordUserId) {
  const data = await readData();
  const state = getGuildState(data, guildId);
  const id = String(discordUserId);

  if (!state.whitelistDiscord.includes(id)) {
    state.whitelistDiscord.push(id);
  }

  await writeData(data);
  return state.whitelistDiscord;
}

export async function removeDiscordWhitelist(guildId, discordUserId) {
  const data = await readData();
  const state = getGuildState(data, guildId);
  const id = String(discordUserId);

  state.whitelistDiscord = state.whitelistDiscord.filter(item => item !== id);
  await writeData(data);
  return state.whitelistDiscord;
}

export async function listDiscordWhitelist(guildId) {
  const data = await readData();
  const state = getGuildState(data, guildId);
  return state.whitelistDiscord;
}

export async function rememberFlag(guildId, targetId, payload) {
  const data = await readData();
  const state = getGuildState(data, guildId);

  state.lastSeenFlags[String(targetId)] = {
    savedAt: new Date().toISOString(),
    payload
  };

  // Keep the file from becoming a fossil museum.
  const entries = Object.entries(state.lastSeenFlags);
  if (entries.length > 200) {
    const sorted = entries.sort((a, b) => String(a[1].savedAt).localeCompare(String(b[1].savedAt)));
    state.lastSeenFlags = Object.fromEntries(sorted.slice(-200));
  }

  await writeData(data);
}
