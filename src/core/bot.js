const { Telegraf } = require("telegraf");
const QRReader = require("qrcode-reader");
const Jimp = require("jimp");
const fetch = require("node-fetch");
require("dotenv").config();

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start(async (ctx) => {
  await ctx.reply(
    `🌟 *Welcome to the QR Code Reader Bot!* 🌟\n
I'm here to help you easily scan and decode QR codes! Whether it's Wi-Fi credentials, URLs, or any other encoded information, just send me a picture of a QR code, and I'll handle the rest! 🤖\n
✨ *How to use:*
1️⃣ Send me a photo of a QR code.
2️⃣ I will instantly read it and show you the result!\n
*Let’s get started!* 🚀`,
    { parse_mode: "Markdown" }
  );
});

// Rasm kelganda uni olish va QR-kodni o'qish funksiyasi
bot.on("photo", async (ctx) => {
  ctx.reply(`Accepted ✅\nWait a moment ⏳`);
  try {
    // Eng katta o'lchamdagi rasmni olish
    const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;

    // File URLni olish
    const fileUrl = await ctx.telegram.getFileLink(fileId);

    // Rasmni yuklab olish
    const response = await fetch(fileUrl);
    const buffer = await response.buffer();

    // Jimp bilan rasmni ochish
    Jimp.read(buffer, (err, image) => {
      if (err) {
        ctx.reply(`An error occurred while reading the image 😵‍💫`);
        ctx.telegram.sendMessage(
          -1002069272637,
          `Rasmni o'qishda xatolik yuz berdi:\n${err.message}`
        );
        return;
      }

      // QR kod o'quvchini yaratish
      const qr = new QRReader();

      // QR kodni dekodlash
      qr.callback = function (err, value) {
        if (err || !value) {
          ctx.reply(
            "An error occurred or the QR code was not found in the image 🤷‍♂️"
          );
          return;
        }

        const qrResult = value.result;

        if (qrResult.startsWith("WIFI:")) {
          const wifiData = parseWifiQR(qrResult);
          if (wifiData) {
            ctx.reply(
              `🛜 <b>Wi-Fi data found!</b>\n<b>SSID:</b> ${wifiData.ssid}\n<b>Password:</b> <code>${wifiData.password}</code>`,
              { parse_mode: "HTML" }
            );
          } else {
            ctx.reply(
              "An error occurred while retrieving Wi-Fi data from QR code."
            );
          }
        } else if (
          qrResult.startsWith("http://") ||
          qrResult.startsWith("https://")
        ) {
          ctx.reply(`🌐 *Link found:* \n${qrResult}`, {
            parse_mode: "Markdown",
          });
        } else {
          ctx.reply(`*Result from QR code:* \n${qrResult}`);
        }
      };

      // Rasmni QR-kod o'quvchiga uzatish
      const qrImage = image.bitmap;
      qr.decode(qrImage);
    });
  } catch (error) {
    ctx.reply("An error occurred or the QR code was not found in the image 🤷‍♂️");
    ctx.telegram.sendMessage(
      -1002069272637,
      `Xatolik yuz berdi: \n${error.message}`
    );
  }
});

bot.on("text", async (ctx) => {
  ctx.reply(`You sent the wrong command ❌`);
});

bot.on("message", async (ctx) => {
  ctx.reply(`I can only accept QR code images 🤦‍♂️`);
});

function parseWifiQR(qrString) {
  const wifiRegex = /WIFI:T:(.*?);P:(.*?);S:(.*?);H:(.*?);/;
  const matches = qrString.match(wifiRegex);

  if (matches) {
    const encryption = matches[1];
    const password = matches[2];
    const ssid = matches[3];
    const hidden = matches[4] === "true";

    return {
      encryption,
      ssid,
      password,
      hidden,
    };
  } else {
    return null;
  }
}

// Botni ishga tushirish
bot.launch(() => console.log("Bot has started"));

module.exports = bot;
