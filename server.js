require("dotenv").config();
const Fastify = require("fastify");
const { Telegraf, Markup } = require("telegraf");
const fs = require("fs");

const fastify = Fastify({ logger: false });
const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const OWNER_ID = 7797626310;

const translations = {
  ru: {
    greeting: "\uD83D\uDC4B Привет! Я ассистент A.D.E.I.T.\n\nЯ помогу тебе с вопросами по amoCRM. Просто задай свой вопрос!",
    waiting: "\uD83D\uDCDE Вам ответит первый освободившийся сотрудник. Спасибо за ожидание!",
  },
  uz: {
    greeting: "\uD83D\uDC4B Salom! Men A.D.E.I.T. yordamchisiman.\n\nMen amoCRM bo\u2018yicha savollarga yordam beraman. Savolingizni yuboring!",
    waiting: "\uD83D\uDCDE Birinchi bo'shashgan xodim javob beradi. Kutganingiz uchun rahmat!",
  },
  kz: {
    greeting: "\uD83D\uDC4B \u0421\u04d9\u043b\u0435\u043c! \u041c\u0435\u043d A.D.E.I.T. \u043a\u04e9\u043c\u0435\u043a\u0448\u0456\u0441\u0456\u043c\u0456\u043d.\n\n\u041c\u0435\u043d amoCRM бойынша сұрақтарыңа көмектесемін. Сұрағыңды жібер.",
    waiting: "\uD83D\uDCDE Бірінші босайтын қызметкер жауап береді. Күткенің үшін рахмет!",
  },
  qq: {
    greeting: "\uD83D\uDC4B Salam! Men A.D.E.I.T. jardemshisimmen.\n\nMen sagan amoCRM haqqinda jardem beremen. Sawalyndi jaz.",
    waiting: "\uD83D\uDCDE Birinşi bo'sağan xodim jawap beredi. Kütkeniñ üşin rahmet!",
  },
};

let users = {};
try {
  users = JSON.parse(fs.readFileSync("users.json"));
} catch (error) {
  console.error("Ошибка чтения users.json:", error);
}

function saveUsers() {
  fs.writeFileSync("users.json", JSON.stringify(users, null, 2));
}

const pendingReplies = {};

bot.start(async (ctx) => {
  const userId = ctx.from.id;
  users[userId] = { lang: null, notified: false };
  saveUsers();

  await ctx.reply(
    "Пожалуйста, выберите язык / Тілді таңдаңыз / Tilni tanlang / Tildi tańlań:",
    Markup.inlineKeyboard([
      [{ text: "Русский 🇷🇺", callback_data: "ru" }],
      [{ text: "Qaraqalpaqsha 🇷🇼", callback_data: "qq" }],
      [{ text: "O‘zbekcha 🇺🇿", callback_data: "uz" }],
      [{ text: "Қазақша 🇰🇿", callback_data: "kz" }],
    ])
  );
});

bot.action(["ru", "qq", "uz", "kz"], async (ctx) => {
  const userId = ctx.from.id;
  const lang = ctx.match.input;

  if (!users[userId]) {
    users[userId] = { notified: false };
  }
  users[userId].lang = lang;
  saveUsers();

  try {
    await ctx.editMessageText("\uD83D\uDC4C", { reply_markup: { inline_keyboard: [] } });

    setTimeout(async () => {
      try {
        await ctx.deleteMessage();
      } catch (error) {
        console.error("Ошибка при удалении сообщения:", error);
      }
    }, 1500);

    await ctx.reply(translations[lang].greeting);
  } catch (error) {
    console.error("Ошибка при обработке выбора языка:", error);
  }
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

  const lang = users[senderId]?.lang || "ru";

  if (!users[senderId]) {
    users[senderId] = { lang, notified: false };
  }

  if (!users[senderId].notified) {
    await ctx.reply(translations[lang].waiting);
    users[senderId].notified = true;
    saveUsers();
  }

  try {
    await ctx.telegram.sendMessage(
      OWNER_ID,
      `💬 Сообщение от клиента\nID: ${senderId}\nТекст: ${ctx.message.text}\nЯзык: ${translations[lang] ? lang : "ru"}`,
      Markup.inlineKeyboard([
        [Markup.button.callback("Ответить клиенту", `reply_${senderId}`)]
      ])
    );
  } catch (error) {
    console.error("Ошибка при пересылке сообщения владельцу:", error);
  }
});

// Обработка аудио сообщений
bot.on("audio", async (ctx) => {
  const senderId = ctx.from.id;
  const lang = users[senderId]?.lang || "ru";

  if (!users[senderId]) {
    users[senderId] = { lang, notified: false };
  }

  if (!users[senderId].notified) {
    await ctx.reply(translations[lang].waiting);
    users[senderId].notified = true;
    saveUsers();
  }

  const audioFile = ctx.message.audio;
  try {
    await ctx.telegram.sendAudio(OWNER_ID, audioFile.file_id, {
      caption: `🎵 Аудио сообщение от клиента ID: ${senderId}`,
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback("Ответить клиенту", `reply_${senderId}`)]
      ])
    });
  } catch (error) {
    console.error("Ошибка при пересылке аудио:", error);
  }
});

// Обработка голосовых сообщений
bot.on("voice", async (ctx) => {
  const senderId = ctx.from.id;
  const lang = users[senderId]?.lang || "ru";

  if (!users[senderId]) {
    users[senderId] = { lang, notified: false };
  }

  if (!users[senderId].notified) {
    await ctx.reply(translations[lang].waiting);
    users[senderId].notified = true;
    saveUsers();
  }

  const voiceFile = ctx.message.voice;
  try {
    await ctx.telegram.sendVoice(OWNER_ID, voiceFile.file_id, {
      caption: `🎤 Голосовое сообщение от клиента ID: ${senderId}`,
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback("Ответить клиенту", `reply_${senderId}`)]
      ])
    });
  } catch (error) {
    console.error("Ошибка при пересылке голосового сообщения:", error);
  }
});

bot.on("callback_query", async (ctx) => {
  const data = ctx.callbackQuery.data;

  if (data.startsWith("reply_")) {
    const userId = data.split("_")[1];
    pendingReplies[ctx.from.id] = userId;

    await ctx.answerCbQuery();
    await ctx.reply("✍️ Напишите ответ для клиента, и он получит его напрямую.");
  } else {
    await ctx.answerCbQuery();
  }
});

fastify.post("/webhook", async (request, reply) => {
  try {
    await bot.handleUpdate(request.body);
  } catch (error) {
    console.error("Ошибка обработки webhook:", error);
  }
  reply.send({ status: "ok" });
});

fastify.get("/", async (request, reply) => {
  return "Bot is alive!";
});

const PORT = process.env.PORT || 10000;
fastify.listen({ port: PORT, host: "0.0.0.0" }, async (err) => {
  if (err) {
    console.error("Ошибка запуска Fastify:", err);
    process.exit(1);
  }
  console.log(`🌐 Fastify сервер работает на порту ${PORT}`);

  try {
    const webhookUrl = `${process.env.RENDER_EXTERNAL_URL || "https://ade79bot.onrender.com"}/webhook`;
    await bot.telegram.setWebhook(webhookUrl);
    console.log("✅ Webhook установлен:", webhookUrl);
  } catch (error) {
    console.error("❌ Ошибка установки Webhook:", error);
  }
});
