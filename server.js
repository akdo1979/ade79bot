require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const OWNER_ID = 7797626310;

const translations = {
  ru: {
    greeting: "👋 Привет! Я ассистент A.D.E.I.T.\n\nЯ помогу тебе с вопросами по amoCRM. Просто задай свой вопрос!",
    waiting: "📞 Вам ответит первый свободившийся сотрудник. Спасибо за ожидание!",
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
const messageToClientMap = {};

bot.start((ctx) => {
  const userId = ctx.from.id;
  userState[userId] = { lang: null, count: 0, tariffSent: false };
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

bot.action(["ru", "qq", "uz", "kz"], (ctx) => {
  const userId = ctx.from.id;
  const lang = ctx.match[0];
  if (!userState[userId]) userState[userId] = { count: 0, tariffSent: false };
  userState[userId].lang = lang;
  userState[userId].count = 0;
  userState[userId].tariffSent = false;
  ctx.answerCbQuery();
  ctx.reply(translations[lang].greeting);
});

bot.on("text", async (ctx) => {
  const userId = ctx.from.id;

  // Если владелец отвечает на сообщение клиента
  if (userId === OWNER_ID && ctx.message.reply_to_message) {
    const repliedMessageId = ctx.message.reply_to_message.message_id;
    const clientId = messageToClientMap[repliedMessageId];

    if (clientId) {
      await ctx.telegram.sendMessage(clientId, ctx.message.text);
    }
    return;
  }

  const lang = userState[userId]?.lang;
  if (lang) {
    ctx.reply(translations[lang].waiting);
  }

  // Пересылаем сообщение владельцу и сохраняем ID отправителя
  const forwardedMessage = await ctx.telegram.sendMessage(
    OWNER_ID,
    `Сообщение от клиента:\nID: ${userId}\n\n${ctx.message.text}`
  );

  // Связываем message_id отправленного сообщения с ID клиента
  messageToClientMap[forwardedMessage.message_id] = userId;
});

bot.launch().then(() => {
  console.log("✅ Бот A.D.E.I.T. запущен и готов к работе");
});













