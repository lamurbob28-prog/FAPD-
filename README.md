# FAPD Bot

**FAPD** stands for **Flagged Account Patrol Detector**, because apparently normal moderation names were too emotionally stable.

This is a private Discord moderation bot that checks Discord users, Roblox users, and Roblox groups against Rotector's API, then logs suspicious results for staff review.

It is designed to start in **log-only mode**. Do not turn on auto-kick or auto-ban until you test false positives. A bot should not be a guillotine with a JavaScript runtime.

## Features

- `/fapd-check @user` - check a Discord user through Rotector.
- `/fapd-checkroblox roblox_id` - check a Roblox user ID.
- `/fapd-checkgroup group_id` - check a Roblox group ID.
- `/fapd-whitelist add @user` - whitelist a Discord user.
- `/fapd-whitelist remove @user` - remove a Discord user from whitelist.
- `/fapd-whitelist list` - list whitelisted users.
- Auto-scans new Discord joins with `guildMemberAdd`.
- Logs flagged joins to a private mod-log channel.
- Optional actions: `log`, `timeout`, `kick`, or `ban`.
- Flexible Rotector API key header support.
- Local JSON whitelist/audit storage.

## Important safety rules

1. Keep `ACTION_MODE=log` at first.
2. Send results only to staff/mod-log, not public channels.
3. Treat Rotector results as moderation leads, not perfect truth.
4. Use whitelists and appeals.
5. Do not store or publish sensitive evidence longer than necessary.
6. Do not use this to harass users, stalk alts, or run public shame boards.

## Requirements

- Node.js 20+
- A Discord application/bot token
- Guild Members privileged intent enabled in the Discord Developer Portal
- Rotector API access if your endpoint requires a key

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create `.env`

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Fill these values:

```env
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_discord_application_client_id
GUILD_ID=your_server_id
MOD_LOG_CHANNEL_ID=your_private_mod_log_channel_id
```

Rotector defaults:

```env
ROTECTOR_API_BASE=https://roscoe.rotector.com
ROTECTOR_API_KEY=
ROTECTOR_AUTH_HEADER=Authorization
ROTECTOR_AUTH_PREFIX=Bearer 
```

If Rotector gives you a different API key format, change these:

```env
ROTECTOR_AUTH_HEADER=x-api-key
ROTECTOR_AUTH_PREFIX=
```

### 3. Enable Discord privileged intent

In the Discord Developer Portal:

1. Open your application.
2. Go to **Bot**.
3. Enable **Server Members Intent** / **Guild Members Intent**.
4. Save changes.

Without this, join scanning will not fire. The bot will sit there like a mall cop with no radio.

### 4. Invite the bot

Use OAuth2 URL Generator with scopes:

- `bot`
- `applications.commands`

Bot permissions:

- View Channels
- Send Messages
- Embed Links
- Moderate Members, only needed for timeout mode
- Kick Members, only needed for kick mode
- Ban Members, only needed for ban mode

For first testing, log-only mode does **not** need kick/ban permissions.

### 5. Register slash commands

```bash
npm run register
```

Or just run the bot. It registers commands on startup too:

```bash
npm start
```

## Recommended first run config

```env
ACTION_MODE=log
TIMEOUT_MINUTES=60
EPHEMERAL_COMMANDS=true
```

After a week of testing, if the bot is accurate enough, you can use:

```env
ACTION_MODE=timeout
```

Do not start with:

```env
ACTION_MODE=ban
```

unless you enjoy explaining to innocent users why your bot went full courtroom executioner.

## Commands

### Check a Discord user

```text
/fapd-check user:@Someone
```

### Check a Roblox user ID

```text
/fapd-checkroblox roblox_id:123456789
```

### Check a Roblox group ID

```text
/fapd-checkgroup group_id:123456
```

### Whitelist a user

```text
/fapd-whitelist add user:@TrustedUser
```

### Remove a user from whitelist

```text
/fapd-whitelist remove user:@TrustedUser
```

### List whitelist

```text
/fapd-whitelist list
```

## File layout

```text
fapd-bot/
  src/
    commands.js
    config.js
    embeds.js
    index.js
    register-commands.js
    rotector.js
    storage.js
  data/
    .gitkeep
  .env.example
  .gitignore
  package.json
  README.md
```

## Notes on Rotector response parsing

The bot uses flexible parsing because API payloads can change. It looks for common fields like:

- `flagged`
- `isFlagged`
- `status`
- `flagStatus`
- `riskLevel`
- `confidence`
- `reason`
- `reasons`
- `violations`
- `evidence`

If Rotector's response schema is stricter in your API dashboard, update `src/rotector.js` in `analyzeRotectorPayload()` to match exactly.

## Disclaimer

FAPD is not affiliated with Discord, Roblox, or Rotector. It is a private moderation helper. Human review still matters, tragically.
