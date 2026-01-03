import { PermissionsBitField } from "discord.js";
import db from "../Events/loadDatabase.js";

export const command = {
  name: "unbl",
  aliases: ["unblacklist"],

  async run(bot, message, args) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("❌ Permission refusée.");
    }

    const userId = args[0]?.replace(/[<@!>]/g, "");
    if (!userId) return message.reply("❌ ID ou mention invalide.");

    db.run("DELETE FROM blacklist WHERE user = ?", [userId]);

    message.channel.send(`✅ Utilisateur retiré de la blacklist.`);
  }
};
