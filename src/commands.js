import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";

export const commandBuilders = [
  new SlashCommandBuilder()
    .setName("fapd-check")
    .setDescription("Check a Discord user with Rotector.")
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("Discord user to check")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  new SlashCommandBuilder()
    .setName("fapd-checkroblox")
    .setDescription("Check a Roblox user ID with Rotector.")
    .addStringOption(option =>
      option
        .setName("roblox_id")
        .setDescription("Roblox user ID, not username")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  new SlashCommandBuilder()
    .setName("fapd-checkgroup")
    .setDescription("Check a Roblox group ID with Rotector.")
    .addStringOption(option =>
      option
        .setName("group_id")
        .setDescription("Roblox group ID")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  new SlashCommandBuilder()
    .setName("fapd-whitelist")
    .setDescription("Manage the Discord whitelist for FAPD.")
    .addSubcommand(subcommand =>
      subcommand
        .setName("add")
        .setDescription("Add a Discord user to the FAPD whitelist.")
        .addUserOption(option =>
          option
            .setName("user")
            .setDescription("User to whitelist")
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("remove")
        .setDescription("Remove a Discord user from the FAPD whitelist.")
        .addUserOption(option =>
          option
            .setName("user")
            .setDescription("User to remove")
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("list")
        .setDescription("List whitelisted Discord users.")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder()
    .setName("fapd-ping")
    .setDescription("Check whether FAPD is alive.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
];

export const commandsJson = commandBuilders.map(command => command.toJSON());
