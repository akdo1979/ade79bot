require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

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

bot.on("text", (ctx) => {
  const userId = ctx.from.id;
  const lang = userState[userId]?.lang;
  if (lang) {
    // После того как клиент отправляет свой вопрос, отправляем сообщение, что ответит сотрудник
    ctx.reply(translations[lang].waiting);
  }
});

bot.launch().then(() => {
  console.log("✅ Бот A.D.E.I.T. запущен и готов к работе");
});





