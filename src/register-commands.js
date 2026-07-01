import { REST, Routes } from "discord.js";
import { config } from "./config.js";
import { commandsJson } from "./commands.js";

const rest = new REST({ version: "10" }).setToken(config.discordToken);

console.log("Registering FAPD slash commands...");
await rest.put(
  Routes.applicationGuildCommands(config.clientId, config.guildId),
  { body: commandsJson }
);
console.log("FAPD slash commands registered for the guild.");
