import { ActivityType } from "discord.js";

export default {
	name: 'clientReady',
	async execute(bot) {
		await bot.application.commands.set(bot.arrayOfSlashCommands);

		bot.user.setPresence({
			activities: [{ name: 'Substance', type: ActivityType.Streaming, url: 'https://www.tiktok.com/@missirelia?_r=1&_t=ZN-92fcGQXZvUs' }], status: 'online'
		});
	}
};
