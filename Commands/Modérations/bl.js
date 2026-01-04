import db from '../../Events/loadDatabase.js';
import { EmbedBuilder } from 'discord.js';
import config from '../../config.json' with { type: 'json' };

export const command = {
	name: 'bl',
	helpname: 'bl <id>',
	description: 'Blacklist un utilisateur définitivement',
	help: 'bl <id>',
	run: async (bot, message, args) => {

		if (!args[0]) {
			return message.reply({
				content: `❌ Utilisation : \`${config.prefix}bl <id>\``
			});
		}

		const userId = args[0];

		// vérif ID valide
		if (!/^\d{17,20}$/.test(userId)) {
			return message.reply({ content: '❌ ID invalide' });
		}

		db.get(
			'SELECT id FROM blacklist WHERE id = ?',
			[userId],
			(err, row) => {
				if (row) {
					return message.reply({ content: '⚠️ Cet utilisateur est déjà blacklisté.' });
				}

				db.run(
					'INSERT INTO blacklist (id) VALUES (?)',
					[userId],
					async (err) => {
						if (err) {
							console.error(err);
							return message.reply({ content: '❌ Erreur lors du blacklist.' });
						}

						// ban immédiat s'il est sur le serveur
						const member = await message.guild.members.fetch(userId).catch(() => null);
						if (member) {
							await member.ban({ reason: 'Blacklist permanente' }).catch(() => {});
						}

						const embed = new EmbedBuilder()
							.setColor(config.color)
							.setDescription(`✅ **Utilisateur blacklisté définitivement**\nID : \`${userId}\``);

						message.reply({ embeds: [embed] });
					}
				);
			}
		);
	}
};
