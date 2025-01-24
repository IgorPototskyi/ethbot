var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
    bot.command(["start", "start2"], (ctx) => __awaiter(void 0, void 0, void 0, function* () {
        const { from, message } = ctx;
        console.log(from);
        ctx.react("👍");
        ctx.reply("Hello! <span class='tg-spoiler'>!!!!</span>", {
            reply_parameters: message
                ? { message_id: message.message_id }
                : undefined,
            parse_mode: "HTML",
        });
    }));
    bot.command("mood", (ctx) => __awaiter(void 0, void 0, void 0, function* () {
        const labels = ["Ok", "Good", "Bad"];
        const rows = labels.map((label) => [Keyboard.text(label)]);
        const keyboard = Keyboard.from(rows).resized().oneTime();
        yield ctx.reply("How are you today?", {
            reply_markup: keyboard,
        });
    }));
    bot.command("share", (ctx) => __awaiter(void 0, void 0, void 0, function* () {
        const keyboard = new Keyboard()
            .requestContact("Contact")
            .requestLocation("Location")
            .requestPoll("Poll")
            .resized()
            .placeholder("Choose...")
            .oneTime();
        yield ctx.reply("Share your contact or location:", {
            reply_markup: keyboard,
        });
    }));
    bot.command("inline_keyboard", (ctx) => __awaiter(void 0, void 0, void 0, function* () {
        const keyboard = new InlineKeyboard()
            .text("First", "first")
            .text("Second", "second")
            .text("Third", "third");
        yield ctx.reply("Chose a button", {
            reply_markup: keyboard,
        });
    }));
    bot.on("callback_query:data", (ctx) => __awaiter(void 0, void 0, void 0, function* () {
        yield ctx.answerCallbackQuery();
        yield ctx.reply(`You clicked the ${ctx.callbackQuery.data} button!`);
    }));
    bot.on("msg").filter((ctx) => { var _a; return ((_a = ctx.from) === null || _a === void 0 ? void 0 : _a.id) === 123; }, (ctx) => __awaiter(void 0, void 0, void 0, function* () {
        yield ctx.reply("Hello admin!");
    }));
    bot.hears(/eth/, (ctx) => __awaiter(void 0, void 0, void 0, function* () {
        ctx.reply("You mentioned Ethereum!");
    }));
    bot.catch(({ ctx, error }) => {
        console.error(`Error while handling update ${ctx.update.update_id}:`);
        if (error instanceof HttpError) {
            console.error(`HTTP error: ${error}`);
        }
        else if (error instanceof GrammyError) {
            console.error(`An error occurred: ${error.description}`);
        }
        else {
            console.error(`Unknown error: ${error}`);
        }
    });
    bot.start();
}
