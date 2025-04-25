require("dotenv").config();
const Fastify = require("fastify");
const { Telegraf, Markup } = require("telegraf");

const fastify = Fastify({ logger: false });
const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const OWNER_ID = 7797626310;

const translations = {
  ru: {
    greeting: "👋 Привет! Я ассистент A.D.E.I.T.\n\nЯ помогу тебе с вопросами по amoCRM. Просто задай свой вопрос!",
    waiting: "📞 Вам ответит первый освободившийся сотрудник. Спасибо за ожидание!",
  },
  uz: {
    greeting: "👋 Salom! Men A.D.E.I.T. yordamchisiman.\n\nMen amoCRM bo‘yicha savollarga yordam beraman. Savolingizni yuboring!",
    waiting: "📞 Birinchi bo'lib bo'shashgan xodim javob beradi. Kutganingiz uchun rahmat!",
  },
  kz: {
    greeting: "👋 Сәлем! Мен A.D.E.I.T. көмекшісімін.\n\nМен amoCRM бойынша сұрақтарыңа көмектесемін. Сұрағыңды жібер.",
    waiting: "📞 Бірінші босайтын қызметкер жауап береді. Күткенің үшін рахмет!",
  },
  qq: {
    greeting: "👋 Salam! Men A.D.E.I.T. jardemshisimmen.\n\nMen sagan amoCRM haqqinda jardem beremen. Sawalyndi jaz.",
    waiting: "📞 Birinşi bo'sağan xodim jawap beredi. Kütkeniñ üşin rahmet!",
  },
};

const userState = {};
const pendingReplies = {};

bot.start((ctx) => {
  const userId = ctx.from.id;
  userState[userId] = { lang: null, count: 0, tariffSent: false, notified: false };
  ctx.reply(
    "Пожалуйста, выберите язык / Тілді таңдаңыз / Tilni tanlang / Tildi tańlań:",
    Markup.inlineKeyboard([ 
      [{ text: "Русский 🇷🇺", callback_data: "ru" }], 
      [{ text: "Каракалпакский 🇷🇼", callback_data: "qq" }], 
      [{ text: "Узбекский 🇺🇿", callback_data: "uz" }], 
      [{ text: "Казахский 🇰🇿", callback_data: "kz" }], 
    ])
  );
});

bot.action(["ru", "qq", "uz", "kz"], async (ctx) => {
  const userId = ctx.from.id;
  const lang = ctx.match.input;

  if (!userState[userId]) {
    userState[userId] = { count: 0, tariffSent: false, notified: false };
  }

  userState[userId].lang = lang;
  userState[userId].count = 0;
  userState[userId].tariffSent = false;
  userState[userId].notified = false;

  await ctx.answerCbQuery();
  await ctx.reply(translations[lang].greeting);
});

bot.on("text", async (ctx) => {
  const senderId = ctx.from.id;

  if (pendingReplies[senderId]) {
    const targetUserId = pendingReplies[senderId];
    delete pendingReplies[senderId];

    const replyText = ctx.message?.text || "";

    if (!replyText.trim()) {
      return ctx.reply("❌ Ошибка: пустой текст сообщения.");
    }

    try {
      await ctx.telegram.sendMessage(targetUserId, replyText);
      await ctx.reply("✅ Ответ отправлен клиенту.");
    } catch (error) {
      console.error("Ошибка при отправке ответа клиенту:", error);
      await ctx.reply("❌ Ошибка при отправке ответа клиенту.");
    }

    return;
  }

  const lang = userState[senderId]?.lang || "ru";

  if (!userState[senderId]) {
    userState[senderId] = { lang, count: 0, tariffSent: false, notified: false };
  }

  if (!userState[senderId].notified) {
    await ctx.reply(translations[lang].waiting);
    userState[senderId].notified = true;
  }

  try {
    await ctx.telegram.sendMessage(
      OWNER_ID,
      `💬 Сообщение от клиента\nID: ${senderId}\nТекст: ${ctx.message.text}\nЯзык: ${translations[lang] ? lang : 'ru'}`,
      Markup.inlineKeyboard([ 
        [Markup.button.callback("Ответить клиенту", `reply_${senderId}`)] 
      ])
    );
  } catch (error) {
    console.error("Ошибка при пересылке сообщения владельцу:", error);
  }
});

bot.on("callback_query", async (ctx) => {
  const data = ctx.callbackQuery.data;

  if (data.startsWith("reply_")) {
    const userId = data.split("_")[1];
    pendingReplies[ctx.from.id] = userId;

    await ctx.answerCbQuery();
    await ctx.reply("✍️ Напишите ответ для клиента, и он получит его напрямую.");
  }
});

// --- Fastify-пинг для UptimeRobot ---
fastify.get("/", async (request, reply) => {
  return "Bot is alive!";
});

// --- Запуск Fastify-сервера ---
const PORT = process.env.PORT || 3000;
fastify.listen({ port: PORT, host: "0.0.0.0" }, (err) => {
  if (err) {
    console.error("Ошибка запуска Fastify:", err);
    process.exit(1);
  }
  console.log(`🌐 Fastify сервер работает на порту ${PORT}`);
});

// --- Запуск Telegram-бота ---
bot.launch().then(() => {
  console.log("✅ Бот A.D.E.I.T. запущен и готов к работе");
});









