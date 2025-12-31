import config from "../config.json" with { type: "json" };
import { EmbedBuilder } from "discord.js";
import db from "./loadDatabase.js";

const spamMap = new Map();
const processingUsers = new Set();  // Empêche le traitement en parallèle
const userAlertCooldown = new Map(); // Cooldown pour alertes

// ======================
// Centralisation alertes avec cooldown
// ======================
const sendAlert = async (message, text) => {
  const now = Date.now();
  const last = userAlertCooldown.get(message.author.id) || 0;
  if (now - last < 1000) return; // 1 seconde de cooldown
  userAlertCooldown.set(message.author.id, now);

  const embed = new EmbedBuilder()
    .setColor(config.color)
    .setDescription(text);

  const msg = await message.channel.send({ embeds: [embed] }).catch(console.error);
  if (msg) setTimeout(() => msg.delete().catch(console.error), 3000);
};

// ======================
// Vérification bypass
// ======================
const bypass = async (userId) => {
  return new Promise(resolve => {
    db.get('SELECT id FROM owner WHERE id = ?', [userId], (err, row) => {
      if (row) return resolve(true);
      db.get('SELECT id FROM whitelist WHERE id = ?', [userId], (err2, row2) => resolve(!!row2));
    });
  });
};

// ======================
// Fonctions AntiRaid
// ======================
const antiLink = async (message) => {
  if (await bypass(message.author.id)) return;

  db.get('SELECT antilink, type FROM antiraid WHERE guild = ?', [message.guild.id], async (err, row) => {
    if (!row?.antilink) return;

    const links = message.content.match(/(?:https?|ftp):\/\/[^\s/$.?#].[^\s]*/gi) || [];
    const isInvite = /(discord\.gg\/[^\s]+|discord(app)?\.com\/invite\/[^\s]+)/i.test(message.content);
    const gifPattern = /\.(gif)$/i;
    const wldom = /(tenor\.com|giphy\.com)/i;
    const isGif = links.some(link => gifPattern.test(link) || wldom.test(link));

    if (!links.length || isGif) return;

    if ((isInvite && row.type === 'invite') || row.type === 'all') {
      message.delete().catch(console.error);
      await sendAlert(message, `Vous n'avez pas le droit d'envoyer des liens <@${message.author.id}>`);

      db.get('SELECT punition FROM punish WHERE guild = ? AND module = ?', [message.guild.id, 'antilink'], async (err, pun) => {
        const sanction = pun?.punition || 'timeout';
        const member = message.member;
        if (!member) return;

        try {
          if (sanction === 'ban') await member.ban({ reason: 'Antilink' });
          else if (sanction === 'kick') await member.kick('Antilink');
          else if (sanction === 'derank') await member.roles.set([], 'Antilink');
          else await member.timeout(60000, 'Antilink');
        } catch (e) { console.error(e); }
      });
    }
  });
};

const antiEveryone = async (message) => {
  if (await bypass(message.author.id)) return;

  db.get('SELECT antieveryone FROM antiraid WHERE guild = ?', [message.guild.id], async (err, row) => {
    if (!row?.antieveryone || !message.mentions.everyone) return;

    try {
      await message.delete();
      const sanctionRow = await new Promise(resolve => {
        db.get('SELECT punition FROM punish WHERE guild = ? AND module = ?', [message.guild.id, 'antieveryone'], (err2, r) => resolve(r));
      });
      const sanction = sanctionRow?.punition || 'timeout';
      const member = message.member;
      if (!member) return;

      if (sanction === 'ban') await member.ban({ reason: 'AntiEveryone' });
      else if (sanction === 'kick') await member.kick('AntiEveryone');
      else if (sanction === 'derank') await member.roles.set([], 'AntiEveryone');
      else await member.timeout(60000, 'AntiEveryone');

    } catch (error) { console.error('Erreur AntiEveryone:', error); }
  });
};

const antiSpam = async (message) => {
  if (await bypass(message.author.id)) return;

  db.get('SELECT antispam, nombremessage, sous, timeout FROM antiraid WHERE guild = ?', [message.guild.id], async (err, row) => {
    if (!row?.antispam) return;

    const count = row.nombremessage;
    const sous = row.sous;
    const timeoutMs = row.timeout;

    const now = Date.now();
    if (!spamMap.has(message.guild.id)) spamMap.set(message.guild.id, new Map());
    const guildSpam = spamMap.get(message.guild.id);

    let userTimestamps = guildSpam.get(message.author.id) || [];
    userTimestamps = userTimestamps.filter(ts => now - ts < sous);
    userTimestamps.push(now);
    guildSpam.set(message.author.id, userTimestamps);

    if (userTimestamps.length >= count) {
      db.get('SELECT punition FROM punish WHERE guild = ? AND module = ?', [message.guild.id, 'antispam'], async (err, pun) => {
        const sanction = pun?.punition || 'timeout';
        const member = message.member;
        if (!member) return;

        try {
          if (sanction === 'ban') { await member.ban({ reason: 'Antispam' }); await sendAlert(message, `<@${message.author.id}> a été banni pour spam.`); }
          else if (sanction === 'kick') { await member.kick('Antispam'); await sendAlert(message, `<@${message.author.id}> a été kick pour spam.`); }
          else if (sanction === 'derank') { await member.roles.set([], 'Antispam'); await sendAlert(message, `<@${message.author.id}> a été dérank pour spam.`); }
          else { await member.timeout(timeoutMs, 'Antispam'); await sendAlert(message, `<@${message.author.id}> a été timeout pour spam.`); }

          guildSpam.set(message.author.id, []);
        } catch (e) { console.error(e); }
      });
    }
  });
};

// ======================
// Gestion commandes
// ======================
const handleCommands = async (message, bot, config) => {
  const prefixPing = () => message.reply({ content: `Mon préfixe est \`${config.prefix}\`.`, allowedMentions: { repliedUser: false } });

  if (message.content.startsWith(`<@${bot.user.id}>`)) {
    const args = message.content.slice(`<@${bot.user.id}>`.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();

    if (!commandName) return prefixPing();

    const commandFile = bot.commands.get(commandName);
    if (!commandFile) return prefixPing();

    await commandFile.run(bot, message, args, config);

  } else if (message.content.startsWith(config.prefix)) {
    const args = message.content.slice(config.prefix.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();

    const commandFile = bot.commands.get(commandName);
    if (!commandFile) return;

    await commandFile.run(bot, message, args, config);
  }
};

// ======================
// Export listener unique avec lock
// ======================
export default {
  name: 'messageCreate',
  async execute(message, bot, config) {
    if (!message.guild || message.author.bot) return;
    if (processingUsers.has(message.author.id)) return; // Empêche doublons
    processingUsers.add(message.author.id);

    try {
      await antiLink(message);
      await antiEveryone(message);
      await antiSpam(message);
      await handleCommands(message, bot, config);
    } finally {
      processingUsers.delete(message.author.id);
    }
  },
  once: false,
};
