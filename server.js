require("dotenv").config();
const Fastify = require("fastify");
const { Telegraf, Markup, session } = require("telegraf");
const fs = require("fs");

const fastify = Fastify({ logger: false });
const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
bot.use(session()); // оставим, может пригодиться

const OWNER_ID = 7797626310;

const translations = {
  ru: {
    greeting: "👋 Привет! Я ассистент A.D.E.I.T.\n\nЯ помогу тебе с вопросами по amoCRM. Просто задай свой вопрос!",
    waiting: "📞 Вам ответит первый освободившийся сотрудник. Спасибо за ожидание!",
  },
  uz: {
    greeting: "👋 Salom! Men A.D.E.I.T. yordamchisiman.\n\nMen amoCRM bo‘yicha savollarga yordam beraman. Savolingizni yuboring!",
    waiting: "📞 Birinchi bo'shashgan xodim javob beradi. Kutganingiz uchun rahmat!",
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

let users = {};
try {
  users = JSON.parse(fs.readFileSync("users.json"));
} catch (error) {
  console.error("Ошибка чтения users.json:", error);
}

function saveUsers() {
  fs.writeFileSync("users.json", JSON.stringify(users, null, 2));
}

const ownerReplySession = {}; // для временного хранения reply ID

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
    await ctx.editMessageText("👌", { reply_markup: { inline_keyboard: [] } });

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

// От клиента: текст
bot.on("text", async (ctx, next) => {
  const senderId = ctx.from.id;
  if (senderId === OWNER_ID && ownerReplySession[senderId]) return next();

  if (!users[senderId]) {
    users[senderId] = { lang: "ru", notified: false };
  }

  const lang = users[senderId].lang || "ru";

  if (!users[senderId].notified) {
    await ctx.reply(translations[lang].waiting);
    users[senderId].notified = true;
    saveUsers();
  }

  try {
    await ctx.telegram.sendMessage(
      OWNER_ID,
      `💬 Сообщение от клиента\nID: ${senderId}\nТекст: ${ctx.message.text}\nЯзык: ${lang}`,
      Markup.inlineKeyboard([
        [Markup.button.callback("Ответить клиенту", `reply_${senderId}`)],
      ])
    );
  } catch (error) {
    console.error("Ошибка при пересылке сообщения владельцу:", error);
  }
});

// От клиента: голос
bot.on("voice", async (ctx, next) => {
  const senderId = ctx.from.id;
  if (senderId === OWNER_ID && ownerReplySession[senderId]) return next();

  const lang = users[senderId]?.lang || "ru";

  if (!users[senderId]?.notified) {
    await ctx.reply(translations[lang].waiting);
    users[senderId] = users[senderId] || {};
    users[senderId].notified = true;
    saveUsers();
  }

  try {
    await ctx.telegram.sendVoice(OWNER_ID, ctx.message.voice.file_id);
    await ctx.telegram.sendMessage(
      OWNER_ID,
      `Голосовое сообщение от клиента\nID: ${senderId}\nЯзык: ${lang}`,
      Markup.inlineKeyboard([
        [Markup.button.callback("Ответить клиенту", `reply_${senderId}`)],
      ])
    );
  } catch (error) {
    console.error("Ошибка при пересылке голосового сообщения:", error);
  }
});

// Ответ владельца — установить ID клиента
bot.action(/reply_(\d+)/, async (ctx) => {
  const targetUserId = Number(ctx.match[1]);
  ownerReplySession[ctx.from.id] = targetUserId;

  await ctx.answerCbQuery();
  await ctx.reply("☝️ Ответьте клиенту", {
    reply_to_message_id: ctx.callbackQuery.message.message_id,
  });
});

// Ответ владельца клиенту
bot.on(["text", "voice"], async (ctx) => {
  if (ctx.from.id !== OWNER_ID) return;

  const targetUserId = ownerReplySession[ctx.from.id];
  if (!targetUserId) return;

  delete ownerReplySession[ctx.from.id];

  try {
    if (ctx.message.voice) {
      await ctx.telegram.sendVoice(targetUserId, ctx.message.voice.file_id);
      await ctx.reply("✅ Голосовое сообщение отправлено клиенту.");
    } else if (ctx.message.text) {
      await ctx.telegram.sendMessage(targetUserId, ctx.message.text);
      await ctx.reply("✅ Ответ отправлен клиенту.");
    }
  } catch (error) {
    console.error("Ошибка при отправке ответа клиенту:", error);
    await ctx.reply("❌ Ошибка при отправке ответа клиенту.");
  }
});

// Webhook Fastify
fastify.post("/webhook", async (request, reply) => {
  try {
    await bot.handleUpdate(request.body);
  } catch (error) {
    console.error("Ошибка обработки webhook:", error);
  }
  reply.send({ status: "ok" });
});

fastify.get("/", async () => "Bot is alive!");

const PORT = process.env.PORT || 10000;
fastify.listen({ port: PORT, host: "0.0.0.0" }, async (err) => {
  if (err) {
    console.error("Ошибка запуска Fastify:", err);
    process.exit(1);
  }
  console.log(`🌐 Fastify сервер работает на порту ${PORT}`);

  try {
    const webhookUrl = `${process.env.RENDER_EXTERNAL_URL}/webhook`;
    await bot.telegram.setWebhook(webhookUrl);
    console.log("✅ Webhook установлен:", webhookUrl);
  } catch (error) {
    console.error("❌ Ошибка установки Webhook:", error);
  }
});
