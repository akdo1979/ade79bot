require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");

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

bot.action(["ru", "qq", "uz", "kz"], (ctx) => {
  const userId = ctx.from.id;
  const lang = ctx.match[0];
  if (!userState[userId]) userState[userId] = {};
  userState[userId] = { lang, count: 0, tariffSent: false, notified: false };
  ctx.answerCbQuery();
  ctx.reply(translations[lang].greeting);
});

bot.on("text", (ctx) => {
  const userId = ctx.from.id;

  // Если отвечает оператор на сообщение клиента
  if (userId === OWNER_ID && ctx.message.reply_to_message) {
    const parts = ctx.message.reply_to_message.text.split('\n');
    const idLine = parts.find(line => line.startsWith('ID:'));
    const clientId = idLine ? parseInt(idLine.replace('ID:', '').trim()) : null;

    if (clientId) {
      ctx.telegram.sendMessage(clientId, ctx.message.text)
        .catch(err => {
          console.error("Ошибка при отправке ответа клиенту: ", err);
        });
    }
    return;
  }

  // Если пишет клиент
  if (!userState[userId]) {
    userState[userId] = { lang: null, count: 0, tariffSent: false, notified: false };
  }

  const lang = userState[userId].lang;

  if (lang && !userState[userId].notified) {
    ctx.reply(translations[lang].waiting);
    userState[userId].notified = true;
  }

  // Пересылаем владельцу с кнопкой "Ответить клиенту"
  ctx.telegram.sendMessage(
    OWNER_ID,
    `Сообщение от клиента\nID: ${userId}\nТекст: ${ctx.message.text}`,
    Markup.inlineKeyboard([
      [Markup.button.callback("✉️ Ответить клиенту", `reply_${userId}`)],
    ])
  );
});

// Обработка callback-кнопки от оператора
bot.action(/reply_(\d+)/, async (ctx) => {
  const clientId = ctx.match[1];
  try {
    await ctx.reply(`Введите сообщение клиенту (ID: ${clientId}), ответом на это сообщение.`);
  } catch (err) {
    console.error("Ошибка при обработке reply-кнопки:", err);
  }
  await ctx.answerCbQuery();
});

bot.launch().then(() => {
  console.log("✅ Бот A.D.E.I.T. запущен и готов к работе");
});



















