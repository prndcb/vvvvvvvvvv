import db from '../../Events/loadDatabase.js';
import { EmbedBuilder } from 'discord.js';
import config from '../../config.json' with { type: 'json' };

export const command = {
	name: 'unbl',
	helpname: 'unbl <id>',
	description: 'Retire un utilisateur de la blacklist',
	help: 'unbl <id>',
	run: async (bot, message, args) => {

		if (!args[0]) {
			return message.reply({
				content: `❌ Utilisation : \`${config.prefix}unbl <id>\``
			});
		}

		const userId = args[0];

		db.run(
			'DELETE FROM blacklist WHERE id = ?',
			[userId],
			function () {
				if (this.changes === 0) {
					return message.reply({ content: '⚠️ Cet utilisateur n’est pas blacklisté.' });
				}

				const embed = new EmbedBuilder()
					.setColor(config.color)
					.setDescription(`✅ **Utilisateur retiré de la blacklist**\nID : \`${userId}\``);

				message.reply({ embeds: [embed] });
			}
		);
	}
};
