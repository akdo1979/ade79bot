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
const messageLinks = new Map(); // Для связи сообщений

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

bot.action(["ru", "qq", "uz", "kz"], async (ctx) => {
  try {
    const userId = ctx.from.id;
    const lang = ctx.match[0];
    if (!userState[userId]) userState[userId] = { count: 0, tariffSent: false };
    userState[userId].lang = lang;
    userState[userId].count = 0;
    userState[userId].tariffSent = false;
    ctx.answerCbQuery();
    await ctx.reply(translations[lang].greeting);
  } catch (error) {
    console.error("Ошибка при обработке команды выбора языка: ", error);
  }
});

bot.on("text", async (ctx) => {
  try {
    const userId = ctx.from.id;
    const lang = userState[userId]?.lang;

    if (lang) {
      await ctx.reply(translations[lang].waiting);
    }

    // Сохраняем сообщение и создаём кнопку "Ответить клиенту"
    const messageId = ctx.message.message_id;
    messageLinks.set(messageId, userId);

    // Пересылаем владельцу
    await ctx.telegram.sendMessage(
      OWNER_ID,
      `Сообщение от клиента\nID: ${userId}\nТекст: ${ctx.message.text}`,
      Markup.inlineKeyboard([
        [{ text: "Ответить клиенту", callback_data: `reply:${messageId}` }],
      ])
    );
  } catch (error) {
    console.error("Ошибка при обработке текста от клиента: ", error);
  }
});

// Когда оператор отвечает через кнопку
bot.action(/^reply:(\d+)$/, async (ctx) => {
  try {
    const messageId = ctx.match[1];
    const clientId = messageLinks.get(parseInt(messageId)); // Получаем ID клиента по messageId
    const replyText = ctx.message.text;

    if (clientId) {
      const lang = userState[clientId]?.lang || 'ru'; // Получаем язык клиента или русский по умолчанию
      await ctx.telegram.sendMessage(
        clientId,
        replyText,
        { reply_to_message_id: messageId }
      );
      await ctx.reply("Ответ отправлен клиенту.");
    } else {
      await ctx.reply("Ошибка: не найден клиент.");
    }
  } catch (error) {
    console.error("Ошибка при отправке ответа клиенту: ", error);
  }
});

bot.launch().then(() => {
  console.log("✅ Бот A.D.E.I.T. запущен и готов к работе");
});

















