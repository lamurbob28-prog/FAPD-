import { EmbedBuilder } from "discord.js";

export function makeScanEmbed({ title, targetLabel, analysis, source = "Rotector" }) {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(`**Target:** ${targetLabel}\n**Result:** ${analysis.flagged ? "⚠️ Flagged" : "✅ No flag detected / unknown"}\n**Status:** ${analysis.status}\n**Confidence:** ${analysis.confidence}`)
    .addFields({
      name: "Details",
      value: analysis.summary?.slice(0, 1024) || "No details returned."
    })
    .setFooter({ text: `Source: ${source}. Review manually. Unflagged does not guarantee safe.` })
    .setTimestamp();

  return embed;
}

export function makeErrorEmbed(title, error) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription("The scan failed. Tiny moderation machine coughed up a bolt.")
    .addFields({
      name: "Error",
      value: String(error?.message || error).slice(0, 1024)
    })
    .setTimestamp();
}
