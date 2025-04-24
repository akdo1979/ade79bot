require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");
const express = require("express");
const axios = require("axios");

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const app = express();

const operatorId = 7797626310;
const notifiedUsers = new Set(); // Чтобы не дублировать автоответ клиенту

// Клиент пишет сообщение
bot.on("text", async (ctx) => {
  const userId = ctx.from.id;
  const messageText = ctx.message.text;

  // Если пишет не оператор
  if (userId !== operatorId) {
    // Ответить клиенту только один раз
    if (!notifiedUsers.has(userId)) {
      await ctx.reply("Спасибо за обращение! С вами обязательно свяжутся.");
      notifiedUsers.add(userId);
    }

    // Переслать оператору с кнопкой ответа
    await bot.telegram.sendMessage(
      operatorId,
      `Сообщение от клиента\nID: ${userId}\nТекст: ${messageText}`,
      Markup.inlineKeyboard([
        Markup.button.callback("Ответить", `reply_${userId}_${messageText}`),
      ])
    );
  }
});

// Оператор нажимает кнопку "Ответить"
bot.on("callback_query", async (ctx) => {
  const data = ctx.callbackQuery.data;

  if (data.startsWith("reply_")) {
    const [, userId, ...textParts] = data.split("_");
    const originalText = textParts.join("_");

    ctx.session = ctx.session || {};
    ctx.session.replyTo = userId;

    await ctx.reply(`Напишите ответ для клиента ID ${userId}:`);
  }

  await ctx.answerCbQuery(); // Убирает "загрузка" у кнопки
});

// Оператор пишет ответ
bot.on("text", async (ctx) => {
  const userId = ctx.from.id;
  const messageText = ctx.message.text;

  if (userId === operatorId && ctx.session && ctx.session.replyTo) {
    const targetId = ctx.session.replyTo;

    await bot.telegram.sendMessage(targetId, messageText);
    await ctx.reply("Ответ отправлен клиенту.");
    delete ctx.session.replyTo;
  }
});

// Express сервер для пинга Glitch
app.get("/", (req, res) => {
  res.send("Бот работает!");
});
app.listen(3000, () => {
  console.log("Express server is running");
});

// Запуск бота
bot.launch();



























