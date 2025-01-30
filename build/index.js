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
import WebSocket from "ws";
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
const AlarmDiffCandles1 = 15;
const AlarmDiffCandles3 = 30;
const AlarmDiffCandles5 = 40;
config();
const getTradeSum = (acc, item) => {
    const diff = (+item.k.c - +item.k.o).toFixed(2);
    return +(acc + +diff).toFixed(2);
};
const getCandleMessage = (condition, candlesCount, diff) => condition ? `${candlesCount} candles warning: <code>${diff}</code>\n\n` : "";
if (process.env.BOT_TOKEN) {
    let userIds = [];
    let candles = [];
    let lastTradeData = null;
    let ws = null;
    const bot = new Bot(process.env.BOT_TOKEN);
    const preparePriceMessage = (tradeData) => {
        if (!lastTradeData || lastTradeData.k.t === tradeData.k.t) {
            lastTradeData = tradeData;
            return;
        }
        candles.push(lastTradeData);
        candles = candles.slice(-5);
        const lastCandleDiff = (+lastTradeData.k.c - +lastTradeData.k.o).toFixed(2);
        const lastCandleMaxDiff = (+lastTradeData.k.h - +lastTradeData.k.l).toFixed(2);
        const diffCandles3 = candles.slice(-3).reduce(getTradeSum, 0);
        const diffCandles5 = candles.reduce(getTradeSum, 0);
        const shouldShowMessage1 = Math.abs(+lastCandleDiff) > AlarmDiffCandles1;
        const shouldShowMessage3 = Math.abs(diffCandles3) > AlarmDiffCandles3;
        const shouldShowMessage5 = Math.abs(diffCandles5) > AlarmDiffCandles5;
        if (shouldShowMessage1 || shouldShowMessage3 || shouldShowMessage5) {
            const lastCandleMessage = `Last candle:\n<code>${lastTradeData.k.o} - <b>${lastTradeData.k.c}</b> (${lastCandleDiff})</code>\n`;
            const minMaxMessage = `Min-max:\n<code>${lastTradeData.k.l} - ${lastTradeData.k.h} (${lastCandleMaxDiff})</code>`;
            const message = getCandleMessage(shouldShowMessage1, 1, +lastCandleDiff) +
                getCandleMessage(shouldShowMessage3, 3, diffCandles3) +
                getCandleMessage(shouldShowMessage5, 5, diffCandles5) +
                lastCandleMessage +
                minMaxMessage;
            userIds.forEach((id) => {
                bot.api.sendMessage(id, message, {
                    parse_mode: "HTML",
                });
            });
        }
        lastTradeData = tradeData;
    };
    const openWebSocket = () => {
        ws = new WebSocket(`${process.env.BINANCE_API}/${TradePairs.ETHUSDT}@${StreamTypes.KLINE}_${KlineIntervals.FIVE_MINUTES}`);
        ws.onmessage = (event) => {
            const tradeData = JSON.parse(event.data);
            preparePriceMessage(tradeData);
        };
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
        if ((ws === null || ws === void 0 ? void 0 : ws.readyState) !== WebSocket.OPEN) {
            openWebSocket();
        }
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
        if (!userIds.length) {
            ws === null || ws === void 0 ? void 0 : ws.close();
        }
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
