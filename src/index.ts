import { config } from "dotenv";
import { Bot, GrammyError, HttpError, Keyboard, InlineKeyboard } from "grammy";

config();

if (process.env.BOT_TOKEN) {
  const bot = new Bot(process.env.BOT_TOKEN);

  bot.api.setMyCommands([
    {
      command: "start",
      description: "Start the bot",
    },
    {
      command: "mood",
      description: "Check a mood",
    },
    {
      command: "share",
      description: "Share contact or location",
    },
    { command: "inline_keyboard", description: "Show inline keyboard" },
  ]);

  bot.command(["start", "start2"], async (ctx) => {
    const { from, message } = ctx;
    console.log(from);

    ctx.react("👍");
    ctx.reply("Hello! <span class='tg-spoiler'>!!!!</span>", {
      reply_parameters: message
        ? { message_id: message.message_id }
        : undefined,
      parse_mode: "HTML",
    });
  });

  bot.command("mood", async (ctx) => {
    // const keyboard = new Keyboard()
    //   .text("Ok")
    //   .row()
    //   .text("Good")
    //   .row()
    //   .text("Bad")
    //   .resized()
    //   .oneTime();

    const labels = ["Ok", "Good", "Bad"];
    const rows = labels.map((label) => [Keyboard.text(label)]);
    const keyboard = Keyboard.from(rows).resized().oneTime();

    await ctx.reply("How are you today?", {
      reply_markup: keyboard,
    });
  });

  bot.command("share", async (ctx) => {
    const keyboard = new Keyboard()
      .requestContact("Contact")
      .requestLocation("Location")
      .requestPoll("Poll")
      .resized()
      .placeholder("Choose...")
      .oneTime();

    await ctx.reply("Share your contact or location:", {
      reply_markup: keyboard,
    });
  });

  bot.command("inline_keyboard", async (ctx) => {
    const keyboard = new InlineKeyboard()
      .text("First", "first")
      .text("Second", "second")
      .text("Third", "third");

    await ctx.reply("Chose a button", {
      reply_markup: keyboard,
    });
  });

  // bot.callbackQuery(["first", "second", "third"], async (ctx) => {
  //   await ctx.answerCallbackQuery();
  //   await ctx.reply("You clicked the button!");
  // });
  bot.on("callback_query:data", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(`You clicked the ${ctx.callbackQuery.data} button!`);
  });

  bot.on("msg").filter(
    (ctx) => ctx.from?.id === 123,
    async (ctx) => {
      await ctx.reply("Hello admin!");
    }
  );

  bot.hears(/eth/, async (ctx) => {
    ctx.reply("You mentioned Ethereum!");
  });

  // bot.on("message", async (ctx) => { // :text, :voice, :photo, ::url
  //   await ctx.reply("You can send me a message!");
  // });

  bot.catch(({ ctx, error }) => {
    console.error(`Error while handling update ${ctx.update.update_id}:`);

    if (error instanceof HttpError) {
      console.error(`HTTP error: ${error}`);
    } else if (error instanceof GrammyError) {
      console.error(`An error occurred: ${error.description}`);
    } else {
      console.error(`Unknown error: ${error}`);
    }
  });

  bot.start();
}
