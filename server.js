require("dotenv").config();
const { Telegraf } = require("telegraf");
const fetch = require("node-fetch");

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const BOT_NAME = process.env.BOT_NAME || "A.D.E.I.T";

// Обработка входящих сообщений
bot.on("text", async (ctx) => {
  const userMessage = ctx.message.text;

  // Отправка сообщения в GPT через Groq API
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "mixtral-8x7b-32768",
        messages: [
          { role: "system", content: `Ты ассистент компании, работаешь под именем ${BOT_NAME}. Ты дружелюбно и понятно объясняешь клиентам как работает amoCRM.` },
          { role: "user", content: userMessage }
        ]
      })
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content;

    if (reply) {
      await ctx.reply(reply);
    } else {
      await ctx.reply("Извините, не могу сейчас ответить. Попробуйте позже.");
    }
  } catch (error) {
    console.error("Ошибка при обращении к Groq:", error);
    await ctx.reply("Произошла ошибка при обработке запроса.");
  }
});

bot.launch();
console.log(`${BOT_NAME} запущен и ждёт сообщений в Telegram`);
