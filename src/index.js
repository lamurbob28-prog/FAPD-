import {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  PermissionFlagsBits
} from "discord.js";

import { config, validateActionMode } from "./config.js";
import { commandsJson } from "./commands.js";
import {
  lookupDiscordUser,
  lookupRobloxUser,
  lookupRobloxGroup,
  analyzeRotectorPayload
} from "./rotector.js";
import {
  addDiscordWhitelist,
  removeDiscordWhitelist,
  listDiscordWhitelist,
  isWhitelistedDiscord,
  rememberFlag
} from "./storage.js";
import { makeScanEmbed, makeErrorEmbed } from "./embeds.js";

validateActionMode();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.GuildMember]
});

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(config.discordToken);
  await rest.put(
    Routes.applicationGuildCommands(config.clientId, config.guildId),
    { body: commandsJson }
  );
}

async function fetchModLogChannel(guild) {
  const channel = await guild.channels.fetch(config.modLogChannelId).catch(() => null);
  if (!channel || !channel.isTextBased()) return null;
  return channel;
}

async function takeConfiguredAction(member, reason) {
  if (config.actionMode === "log") {
    return "Logged only. No action taken.";
  }

  if (config.actionMode === "timeout") {
    if (!member.moderatable) return "Wanted to timeout, but member is not moderatable.";
    const ms = Math.max(1, config.timeoutMinutes) * 60 * 1000;
    await member.timeout(ms, reason);
    return `Timed out for ${config.timeoutMinutes} minute(s).`;
  }

  if (config.actionMode === "kick") {
    if (!member.kickable) return "Wanted to kick, but member is not kickable.";
    await member.kick(reason);
    return "Kicked.";
  }

  if (config.actionMode === "ban") {
    if (!member.bannable) return "Wanted to ban, but member is not bannable.";
    await member.ban({ reason, deleteMessageSeconds: 0 });
    return "Banned.";
  }

  return "No action taken.";
}

async function scanDiscordTarget({ guild, user, reasonTitle = "FAPD Discord Check" }) {
  const payload = await lookupDiscordUser(user.id);
  const analysis = analyzeRotectorPayload(payload);

  const embed = makeScanEmbed({
    title: reasonTitle,
    targetLabel: `${user.tag ?? user.username} (${user.id})`,
    analysis
  });

  if (analysis.flagged) {
    await rememberFlag(guild.id, user.id, {
      type: "discord_user",
      targetId: user.id,
      targetTag: user.tag ?? user.username,
      status: analysis.status,
      confidence: analysis.confidence,
      summary: analysis.summary
    });
  }

  return { payload, analysis, embed };
}

client.once("ready", async () => {
  console.log(`FAPD online as ${client.user.tag}.`);
  console.log(`Action mode: ${config.actionMode}`);

  try {
    await registerCommands();
    console.log("Slash commands synced.");
  } catch (error) {
    console.error("Failed to register slash commands:", error);
  }
});

client.on("guildMemberAdd", async member => {
  try {
    if (await isWhitelistedDiscord(member.guild.id, member.id)) return;

    const { analysis, embed } = await scanDiscordTarget({
      guild: member.guild,
      user: member.user,
      reasonTitle: "FAPD Join Scan"
    });

    if (!analysis.flagged) return;

    const actionResult = await takeConfiguredAction(
      member,
      `FAPD Rotector flag: ${analysis.status}`
    );

    embed.addFields({
      name: "Configured action",
      value: actionResult.slice(0, 1024)
    });

    const modLog = await fetchModLogChannel(member.guild);
    if (modLog) {
      await modLog.send({
        content: `FAPD flagged a new join: <@${member.id}>`,
        embeds: [embed]
      });
    } else {
      console.warn("Mod log channel not found or not text-based.");
    }
  } catch (error) {
    console.error("Join scan failed:", error);

    const modLog = await fetchModLogChannel(member.guild);
    if (modLog) {
      await modLog.send({
        embeds: [makeErrorEmbed("FAPD Join Scan Failed", error)]
      });
    }
  }
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const ephemeral = config.ephemeralCommands;

  try {
    if (interaction.commandName === "fapd-ping") {
      await interaction.reply({
        content: "FAPD is alive. The cursed radar dish is spinning.",
        ephemeral
      });
      return;
    }

    if (interaction.commandName === "fapd-check") {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
        await interaction.reply({ content: "You need Moderate Members permission.", ephemeral: true });
        return;
      }

      const user = interaction.options.getUser("user", true);
      await interaction.deferReply({ ephemeral });

      if (await isWhitelistedDiscord(interaction.guild.id, user.id)) {
        await interaction.editReply(`✅ ${user.tag} is whitelisted. No scan run.`);
        return;
      }

      const { embed } = await scanDiscordTarget({
        guild: interaction.guild,
        user,
        reasonTitle: "FAPD Manual Discord Check"
      });

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (interaction.commandName === "fapd-checkroblox") {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
        await interaction.reply({ content: "You need Moderate Members permission.", ephemeral: true });
        return;
      }

      const robloxId = interaction.options.getString("roblox_id", true).trim();
      await interaction.deferReply({ ephemeral });

      const payload = await lookupRobloxUser(robloxId);
      const analysis = analyzeRotectorPayload(payload);
      const embed = makeScanEmbed({
        title: "FAPD Manual Roblox User Check",
        targetLabel: `Roblox user ID ${robloxId}`,
        analysis
      });

      if (analysis.flagged) {
        await rememberFlag(interaction.guild.id, `roblox:${robloxId}`, {
          type: "roblox_user",
          targetId: robloxId,
          status: analysis.status,
          confidence: analysis.confidence,
          summary: analysis.summary
        });
      }

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (interaction.commandName === "fapd-checkgroup") {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
        await interaction.reply({ content: "You need Moderate Members permission.", ephemeral: true });
        return;
      }

      const groupId = interaction.options.getString("group_id", true).trim();
      await interaction.deferReply({ ephemeral });

      const payload = await lookupRobloxGroup(groupId);
      const analysis = analyzeRotectorPayload(payload);
      const embed = makeScanEmbed({
        title: "FAPD Manual Roblox Group Check",
        targetLabel: `Roblox group ID ${groupId}`,
        analysis
      });

      if (analysis.flagged) {
        await rememberFlag(interaction.guild.id, `roblox-group:${groupId}`, {
          type: "roblox_group",
          targetId: groupId,
          status: analysis.status,
          confidence: analysis.confidence,
          summary: analysis.summary
        });
      }

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (interaction.commandName === "fapd-whitelist") {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({ content: "You need Manage Server permission.", ephemeral: true });
        return;
      }

      const subcommand = interaction.options.getSubcommand();

      if (subcommand === "add") {
        const user = interaction.options.getUser("user", true);
        await addDiscordWhitelist(interaction.guild.id, user.id);
        await interaction.reply({ content: `✅ Added ${user.tag} to the FAPD whitelist.`, ephemeral: true });
        return;
      }

      if (subcommand === "remove") {
        const user = interaction.options.getUser("user", true);
        await removeDiscordWhitelist(interaction.guild.id, user.id);
        await interaction.reply({ content: `✅ Removed ${user.tag} from the FAPD whitelist.`, ephemeral: true });
        return;
      }

      if (subcommand === "list") {
        const ids = await listDiscordWhitelist(interaction.guild.id);
        const body = ids.length > 0
          ? ids.map(id => `• <@${id}> (${id})`).join("\n")
          : "Whitelist is empty.";

        await interaction.reply({ content: body.slice(0, 1900), ephemeral: true });
        return;
      }
    }
  } catch (error) {
    console.error("Interaction failed:", error);

    const embed = makeErrorEmbed("FAPD Command Failed", error);

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ embeds: [embed] }).catch(() => null);
    } else {
      await interaction.reply({ embeds: [embed], ephemeral: true }).catch(() => null);
    }
  }
});

process.on("SIGINT", () => {
  console.log("FAPD shutting down.");
  client.destroy();
  process.exit(0);
});

await client.login(config.discordToken);
