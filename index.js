import Discord, {
  Client,
  Collection,
  Partials,
  GatewayIntentBits,
  EmbedBuilder,
  ActivityType
} from "discord.js";
import { GiveawaysManager } from "discord-giveaways";
import express from "express";
import config from "./config.json" with { type: "json" };

// =====================
//  KEEP ALIVE (RENDER)
// =====================
const app = express();
app.get("/", (_, res) => res.send("Bot alive"));
app.listen(3000, () => console.log("[WEB] Serveur HTTP lancé (Render OK)"));

// =====================
//   CLIENT DISCORD
// =====================
const bot = new Client({
  intents: Object.values(GatewayIntentBits),
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.User,
    Partials.GuildMember,
    Partials.Reaction,
    Partials.ThreadMember,
    Partials.GuildScheduledEvent
  ]
});

bot.commands = new Collection();
bot.slashCommands = new Collection();
bot.setMaxListeners(70);

// =====================
//     LOGIN RENDER
// =====================
const TOKEN = process.env.DISCORD_TOKEN;
if (!TOKEN) {
  console.error("❌ DISCORD_TOKEN manquant (Render > Environment Variables)");
  process.exit(1);
}

bot.login(TOKEN)
  .then(() => {
    console.log(`[INFO] ${bot.user.tag} est connecté`);
    console.log(
      `[INVITE] https://discord.com/oauth2/authorize?client_id=${bot.user.id}&permissions=8&scope=bot`
    );
  })
  .catch(() => {
    console.error("❌ Token invalide ou intents non autorisés");
    process.exit(1);
  });

// =====================
//  GIVEAWAYS MANAGER
// =====================
bot.giveawaysManager = new GiveawaysManager(bot, {
  storage: "./giveaways.json",
  updateCountdownEvery: 5000,
  default: {
    botsCanWin: false,
    embedColor: config.color,
    reaction: "🎉"
  }
});

bot.giveawaysManager.on("giveawayEnded", async (giveaway, winners) => {
  const channel = await bot.channels.fetch(giveaway.channelId);
  const message = await channel.messages.fetch(giveaway.messageId);

  setTimeout(async () => {
    const reaction = message.reactions.cache.get("🎉");
    let participantsCount = 0;

    if (reaction) {
      const users = await reaction.users.fetch();
      participantsCount = users.filter(u => !u.bot).size;
    }

    const embed = new EmbedBuilder()
      .setTitle(giveaway.prize)
      .setDescription(
        `Fin: <t:${Math.floor(giveaway.endAt / 1000)}:F>\n` +
        `Organisé par: ${giveaway.hostedBy?.id || giveaway.hostedBy}\n` +
        `Participants: ${participantsCount}\n` +
        `Gagnant(s): ${winners.map(w => `<@${w.id}>`).join(", ") || "Aucun"}`
      )
      .setColor(config.color);

    await message.edit({ embeds: [embed], components: [] });
  }, 1000);
});

// =====================
//      HANDLERS
// =====================
import loadCommands from "./Handler/Commands.js";
import loadSlash from "./Handler/slashCommands.js";
import loadEvents from "./Handler/Events.js";
import anticrash from "./Handler/anticrash.js";

await loadCommands(bot);   // charge toutes les commandes
await loadSlash(bot);      // charge les slash commands
loadEvents(bot);           // écoute READY, messageCreate etc
anticrash(bot);            // gestion crash
