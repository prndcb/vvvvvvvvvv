const { PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
    name: 'clear',
    description: 'Supprime tous les messages récents d’un utilisateur dans TOUS les salons (max ~14 jours)',
    usage: '+clear @user',
    cooldown: 30, // secondes – évite l'abus

    async execute(message, args, client) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return message.reply("Tu as besoin de la permission **Gérer les messages**.");
        }

        if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return message.reply("Je n'ai pas la permission **Gérer les messages** sur ce serveur.");
        }

        const user = message.mentions.users.first() ||
                     client.users.cache.get(args[0]) ||
                     (await client.users.fetch(args[0]).catch(() => null));

        if (!user) {
            return message.reply("Mentionne un utilisateur valide.\nExemple : `+clear @Pseudo` ou `+clear 123456789012345678`");
        }

        await message.reply(`Recherche des messages de ${user.tag} dans tous les salons… (ça peut prendre du temps)`);

        let totalDeleted = 0;
        const channels = message.guild.channels.cache.filter(ch =>
            ch.isTextBased() && // TextChannel, NewsChannel, ThreadChannel, etc.
            !ch.isThread() || ch.parentId // on inclut les threads
        );

        const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;

        for (const channel of channels.values()) {
            if (!channel.permissionsFor(message.guild.members.me).has(PermissionFlagsBits.ManageMessages)) {
                continue; // skip si pas la perm
            }

            try {
                let lastId;
                let moreMessages = true;

                while (moreMessages) {
                    const options = { limit: 100 };
                    if (lastId) options.before = lastId;

                    const fetched = await channel.messages.fetch(options).catch(() => new Map());

                    if (fetched.size === 0) break;

                    const userMessages = fetched.filter(msg =>
                        msg.author.id === user.id &&
                        !msg.system &&
                        msg.createdTimestamp > twoWeeksAgo // bulkDelete refuse les + vieux
                    );

                    if (userMessages.size === 0) {
                        moreMessages = false;
                        continue;
                    }

                    try {
                        const deleted = await channel.bulkDelete(userMessages, true);
                        totalDeleted += deleted.size;
                    } catch (err) {
                        console.error(`Erreur bulkDelete dans #${channel.name}:`, err);
                        // fallback : delete 1 par 1 (très lent)
                        for (const msg of userMessages.values()) {
                            await msg.delete().catch(() => {});
                            totalDeleted++;
                            await new Promise(r => setTimeout(r, 400)); // anti rate-limit
                        }
                    }

                    lastId = fetched.lastKey();
                    if (!lastId) moreMessages = false;

                    await new Promise(r => setTimeout(r, 1200)); // pause anti-rate-limit
                }
            } catch (err) {
                console.error(`Erreur dans le salon #${channel.name}:`, err);
            }
        }

        const reply = await message.channel.send(
            `Opération terminée.\n` +
            `**${totalDeleted}** message(s) de ${user.tag} supprimé(s) dans tous les salons.\n` +
            (totalDeleted === 0 ? "(soit aucun trouvé, soit tous > 14 jours)" : "")
        );

        setTimeout(() => reply.delete().catch(() => {}), 8000);
    }
};
