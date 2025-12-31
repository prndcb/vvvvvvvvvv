import { ActivityType } from "discord.js";

export default {
  name: "clientReady",
  async execute(bot) {
    await bot.application.commands.set(bot.arrayOfSlashCommands);

    // Activité Streaming avec lien TikTok
    bot.user.setPresence({
      activities: [{
        name: "Substance",
        type: ActivityType.Streaming,
        url: "https://www.tiktok.com/@missirelia"
      }],
      status: "online"
    });
  }
};
