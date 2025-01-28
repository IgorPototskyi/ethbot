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
import { Bot, GrammyError, HttpError } from "grammy";
const BotCommands = {
    START: "start",
    STOP: "stop",
    STATUS: "status",
};
const TradePairs = {
    ETHUSDT: "ethusdt",
};
const StreamTypes = {
    KLINE: "kline",
};
const KlineIntervals = {
    ONE_SECOND: "1s",
    ONE_MINUTE: "1m",
    THREE_MINUTES: "3m",
    FIVE_MINUTES: "5m",
    FIFTEEN_MINUTES: "15m",
    THIRTY_MINUTES: "30m",
    ONE_HOUR: "1h",
    TWO_HOURS: "2h",
};
const AlarmDiffSingle = 20;
const AlarmDiffMulti = 40;
config();
if (process.env.BOT_TOKEN) {
    let userIds = [];
    let candles = [];
    let lastTradeData = null;
    const bot = new Bot(process.env.BOT_TOKEN);
    const ws = new WebSocket(`${process.env.BINANCE_API}/${TradePairs.ETHUSDT}@${StreamTypes.KLINE}_${KlineIntervals.FIVE_MINUTES}`);
    const preparePriceMessage = (tradeData) => {
        if (!lastTradeData || lastTradeData.k.t === tradeData.k.t) {
            lastTradeData = tradeData;
            return;
        }
        candles.push(lastTradeData);
        candles = candles.slice(-3);
        const lastCandleDiff = (+lastTradeData.k.c - +lastTradeData.k.o).toFixed(2);
        const lastCandleMaxDiff = (+lastTradeData.k.h - +lastTradeData.k.l).toFixed(2);
        const allCandlesDiff = candles.reduce((acc, item) => {
            const diff = (+item.k.c - +item.k.o).toFixed(2);
            return +(acc + +diff).toFixed(2);
        }, 0);
        const shouldShowSingleMessage = Math.abs(Number(lastCandleDiff)) > AlarmDiffSingle;
        const shouldShowMultiMessage = Math.abs(allCandlesDiff) > AlarmDiffMulti;
        const oneCandleMessage = shouldShowSingleMessage
            ? `1 candle warning: <code>${lastCandleDiff}</code>\n\n`
            : "";
        const multiCandlesMessage = shouldShowMultiMessage
            ? `3 candles warning: <code>${allCandlesDiff}</code>\n\n`
            : "";
        if (shouldShowSingleMessage || shouldShowMultiMessage) {
            const message = oneCandleMessage +
                multiCandlesMessage +
                `Last candle:\n<code>${lastTradeData.k.o} - <b>${lastTradeData.k.c}</b> (${lastCandleDiff})</code>\nMin-max:\n<code>${lastTradeData.k.l} - ${lastTradeData.k.h} (${lastCandleMaxDiff})</code>`;
            userIds.forEach((id) => {
                bot.api.sendMessage(id, message, {
                    parse_mode: "HTML",
                });
            });
        }
        lastTradeData = tradeData;
    };
    ws.onmessage = (event) => {
        const tradeData = JSON.parse(event.data);
        preparePriceMessage(tradeData);
    };
    bot.api.setMyCommands([
        {
            command: BotCommands.START,
            description: "Start the bot",
        },
        {
            command: BotCommands.STOP,
            description: "Stop the bot",
        },
        {
            command: BotCommands.STATUS,
            description: "Check the status",
        },
    ]);
    bot.command(BotCommands.START, (ctx) => __awaiter(void 0, void 0, void 0, function* () {
        const { message, from } = ctx;
        const userId = from === null || from === void 0 ? void 0 : from.id;
        if (!userId)
            return;
        const isActive = userIds.includes(userId);
        const replyMessage = isActive
            ? "You have already started the bot. Watching..."
            : "Start watching <b>ETH</b>...";
        if (!isActive) {
            userIds.push(userId);
            ctx.react("👍");
        }
        ctx.reply(replyMessage, {
            reply_parameters: message
                ? { message_id: message.message_id }
                : undefined,
            parse_mode: "HTML",
        });
    }));
    bot.command(BotCommands.STOP, (ctx) => __awaiter(void 0, void 0, void 0, function* () {
        const { message, from } = ctx;
        const userId = from === null || from === void 0 ? void 0 : from.id;
        if (!userId)
            return;
        const index = userIds.indexOf(userId);
        const isActive = index > -1;
        const replyMessage = isActive
            ? "Stop watching <b>ETH</b>."
            : "Bot is not started";
        if (isActive) {
            userIds.splice(index, 1);
            ctx.react("👍");
        }
        ctx.reply(replyMessage, {
            reply_parameters: message
                ? { message_id: message.message_id }
                : undefined,
            parse_mode: "HTML",
        });
    }));
    bot.command(BotCommands.STATUS, (ctx) => __awaiter(void 0, void 0, void 0, function* () {
        const { message, from } = ctx;
        const userId = from === null || from === void 0 ? void 0 : from.id;
        const replyMessage = userId && userIds.includes(userId)
            ? "Watching <b>ETH</b>..."
            : "Bot is not started";
        ctx.reply(replyMessage, {
            reply_parameters: message
                ? { message_id: message.message_id }
                : undefined,
            parse_mode: "HTML",
        });
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
