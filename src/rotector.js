import { config } from "./config.js";

export class RotectorError extends Error {
  constructor(message, { status = null, body = null } = {}) {
    super(message);
    this.name = "RotectorError";
    this.status = status;
    this.body = body;
  }
}

function headers() {
  const output = {
    Accept: "application/json",
    "User-Agent": "FAPD-Discord-Bot/1.0 (+private moderation bot)"
  };

  if (config.rotector.apiKey) {
    output[config.rotector.authHeader] = `${config.rotector.authPrefix}${config.rotector.apiKey}`;
  }

  return output;
}

async function getJson(pathname) {
  const url = `${config.rotector.baseUrl}${pathname}`;

  const response = await fetch(url, {
    method: "GET",
    headers: headers()
  });

  const text = await response.text();
  let body = null;

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }
  }

  if (response.status === 404) {
    return {
      found: false,
      flagged: false,
      confidence: "unknown",
      status: "not_found",
      raw: body
    };
  }

  if (!response.ok) {
    throw new RotectorError(`Rotector request failed with HTTP ${response.status}.`, {
      status: response.status,
      body
    });
  }

  return body ?? {};
}

export async function lookupDiscordUser(discordUserId) {
  return await getJson(`/v1/lookup/discord/user/${encodeURIComponent(discordUserId)}`);
}

export async function lookupRobloxUser(robloxUserId) {
  return await getJson(`/v1/lookup/roblox/user/${encodeURIComponent(robloxUserId)}`);
}

export async function lookupRobloxGroup(groupId) {
  return await getJson(`/v1/lookup/roblox/group/${encodeURIComponent(groupId)}`);
}

function flattenValues(value, seen = new Set()) {
  if (value === null || value === undefined) return [];
  if (["string", "number", "boolean"].includes(typeof value)) return [String(value)];
  if (seen.has(value)) return [];
  seen.add(value);

  if (Array.isArray(value)) {
    return value.flatMap(item => flattenValues(item, seen));
  }

  if (typeof value === "object") {
    return Object.values(value).flatMap(item => flattenValues(item, seen));
  }

  return [];
}

function findFirstString(data, keys) {
  if (!data || typeof data !== "object") return null;

  const lowerKeys = new Set(keys.map(key => key.toLowerCase()));
  const stack = [data];
  const seen = new Set();

  while (stack.length > 0) {
    const item = stack.pop();
    if (!item || typeof item !== "object" || seen.has(item)) continue;
    seen.add(item);

    for (const [key, value] of Object.entries(item)) {
      if (lowerKeys.has(key.toLowerCase()) && value !== null && value !== undefined) {
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
          return String(value);
        }
      }

      if (typeof value === "object") stack.push(value);
    }
  }

  return null;
}

export function analyzeRotectorPayload(data) {
  const allText = flattenValues(data).join(" ").toLowerCase();

  const explicitFlag = findFirstString(data, [
    "flagged",
    "isFlagged",
    "is_flagged",
    "matched",
    "detected",
    "confirmed"
  ]);

  const status = findFirstString(data, [
    "status",
    "flagStatus",
    "flag_status",
    "risk",
    "riskLevel",
    "risk_level",
    "category",
    "classification",
    "type",
    "flagType",
    "flag_type"
  ]);

  const confidence = findFirstString(data, [
    "confidence",
    "score",
    "probability"
  ]);

  const strongHitWords = [
    "confirmed",
    "flagged",
    "dangerous",
    "exposed",
    "nsfw",
    "condo",
    "predator",
    "inappropriate"
  ];

  const safeWords = [
    "unflagged",
    "not_flagged",
    "not flagged",
    "clear",
    "none",
    "not_found"
  ];

  let flagged = false;

  if (explicitFlag) {
    flagged = ["true", "yes", "1", "flagged", "confirmed", "detected"].includes(explicitFlag.toLowerCase());
  }

  if (!flagged && status) {
    const lowered = status.toLowerCase();
    flagged = strongHitWords.some(word => lowered.includes(word)) && !safeWords.some(word => lowered.includes(word));
  }

  if (!flagged) {
    flagged = strongHitWords.some(word => allText.includes(word)) && !safeWords.some(word => allText.includes(word));
  }

  return {
    flagged,
    status: status ?? (flagged ? "flagged" : "unflagged/unknown"),
    confidence: confidence ?? "unknown",
    summary: buildSummary(data),
    raw: data
  };
}

export function buildSummary(data) {
  if (!data || typeof data !== "object") return "No structured response returned.";

  const likelyFields = [
    "reason",
    "reasons",
    "flags",
    "violations",
    "evidence",
    "sources",
    "matches",
    "accounts",
    "robloxUsers",
    "roblox_users",
    "discordUsers",
    "discord_users"
  ];

  const parts = [];

  for (const field of likelyFields) {
    if (data[field] !== undefined && data[field] !== null) {
      parts.push(`${field}: ${formatValue(data[field])}`);
    }
  }

  if (parts.length > 0) return parts.join("\n").slice(0, 1800);

  return formatValue(data).slice(0, 1800);
}

function formatValue(value) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
