import { PermissionsBitField } from "discord.js";
import db from "../Events/loadDatabase.js";

export const command = {
  name: "bl",
  aliases: ["blacklist"],

  async run(bot, message, args) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("❌ Permission refusée.");
    }

    const user =
      message.mentions.users.first() ||
      await bot.users.fetch(args[0]).catch(() => null);

    if (!user) return message.reply("❌ Utilisateur invalide.");

    db.get("SELECT user FROM blacklist WHERE user = ?", [user.id], async (err, row) => {
      if (row) {
        return message.reply("⚠️ Cet utilisateur est déjà blacklisté.");
      }

      db.run("INSERT INTO blacklist (user) VALUES (?)", [user.id]);

      try {
        await message.guild.members.ban(user.id, {
          reason: "Blacklist permanente"
        });
      } catch {}

      message.channel.send(`⛔ **${user.tag}** blacklisté définitivement.`);
    });
  }
};
