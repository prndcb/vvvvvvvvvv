import db from '../../Events/loadDatabase.js';
import { EmbedBuilder } from 'discord.js';
import config from '../../config.json' with { type: 'json' };

export const command = {
	name: 'bl',
	helpname: 'bl <@user | id>',
	description: 'Blacklist un utilisateur définitivement',
	help: 'bl <@user | id>',
	run: async (bot, message, args) => {

		// récup user via mention OU id
		const user =
			message.mentions.users.first() ||
			(await bot.users.fetch(args[0]).catch(() => null));

		if (!user) {
			return message.reply({
				content: `❌ Utilisateur introuvable.\nUtilisation : \`${config.prefix}bl <@user | id>\``
			});
		}

		const userId = user.id;

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

						// ban immédiat s’il est sur le serveur
						const member = await message.guild.members.fetch(userId).catch(() => null);
						if (member) {
							await member.ban({ reason: 'Blacklist permanente' }).catch(() => {});
						}

						const embed = new EmbedBuilder()
							.setColor(config.color)
							.setDescription(
								`✅ **Utilisateur blacklisté définitivement**\n` +
								`👤 ${user.tag}\n` +
								`🆔 \`${userId}\``
							);

						message.reply({ embeds: [embed] });
					}
				);
			}
		);
	}
};
