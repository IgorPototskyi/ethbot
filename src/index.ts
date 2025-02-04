import { config } from "dotenv";
import { Bot, GrammyError, HttpError } from "grammy";
import WebSocket from "ws";

interface TradeData {
  e: string; // Event type
  E: number; // Event time
  s: string; // Symbol
  k: {
    t: number; // Kline start time
    T: number; // Kline close time
    s: string; // Symbol
    i: string; // Interval
    f: number; // First trade ID
    L: number; // Last trade ID
    o: string; // Open price
    c: string; // Close price
    h: string; // High price
    l: string; // Low price
    v: string; // Base asset volume
    n: number; // Number of trades
    x: boolean; // Is this kline closed?
    q: string; // Quote asset volume
    V: string; // Taker buy base asset volume
    Q: string; // Taker buy quote asset volume
    B: string; // Ignore
  };
}

const BotCommands = {
  START: "start",
  STOP: "stop",
  STATUS: "status",
} as const;

const TradePairs = {
  ETHUSDT: "ethusdt",
} as const;

const StreamTypes = {
  KLINE: "kline",
} as const;

const KlineIntervals = {
  ONE_SECOND: "1s",
  ONE_MINUTE: "1m",
  THREE_MINUTES: "3m",
  FIVE_MINUTES: "5m",
  FIFTEEN_MINUTES: "15m",
  THIRTY_MINUTES: "30m",
  ONE_HOUR: "1h",
  TWO_HOURS: "2h",
} as const;

const DefaultInterval = KlineIntervals.FIVE_MINUTES;

const AlarmConfig = [
  {
    candlesCount: 1,
    alarmDiff: 15,
  },
  {
    candlesCount: 3,
    alarmDiff: 30,
  },
  {
    candlesCount: 5,
    alarmDiff: 40,
  },
];

const MaxCandles = Math.max(
  ...AlarmConfig.map(({ candlesCount }) => candlesCount)
);

config();

const getTradeSum = (acc: number, item: TradeData) => {
  const diff = (+item.k.c - +item.k.o).toFixed(2);

  return +(acc + +diff).toFixed(2);
};

const getSign = (value: number) => (value > 0 ? "+" : "");

const getCandleMessage = (candlesCount: number, diff: number) =>
  `${
    candlesCount * parseInt(DefaultInterval) + DefaultInterval.slice(-1)
  } warning: <code>${getSign(diff)}${diff}</code>\n`;

if (process.env.BOT_TOKEN) {
  let userIds: number[] = [];
  let candles: TradeData[] = []; // last MaxCandles
  let lastTradeData: TradeData | null = null;
  let ws: WebSocket | null = null;

  const bot = new Bot(process.env.BOT_TOKEN);

  const getDiff = (count: number) =>
    candles.slice(-count).reduce(getTradeSum, 0);

  const generateMessage = () => {
    let message = "";

    const diffMessages = AlarmConfig.map(({ candlesCount, alarmDiff }) => {
      const diff = getDiff(candlesCount);

      return Math.abs(diff) > alarmDiff
        ? getCandleMessage(candlesCount, diff)
        : "";
    }).filter(Boolean);

    const lastCandle = candles[candles.length - 1];

    if (diffMessages.length && lastCandle) {
      const lastCandleDiff = getTradeSum(0, lastCandle);

      const lastCandleMessage = `\nLast candle:\n<code>${lastCandle.k.o} - <b>${
        lastCandle.k.c
      }</b> (${getSign(lastCandleDiff)}${lastCandleDiff})</code>`;

      message = diffMessages.join("") + lastCandleMessage;
    }

    return message;
  };

  const processTradeData = (tradeData: TradeData) => {
    if (!lastTradeData || lastTradeData.k.t === tradeData.k.t) {
      lastTradeData = tradeData;
      return;
    }

    candles.push(lastTradeData);
    candles = candles.slice(-MaxCandles);

    const message = generateMessage();

    if (message.length) {
      userIds.forEach((id: number) => {
        bot.api.sendMessage(id, message, {
          parse_mode: "HTML",
        });
      });
    }

    lastTradeData = tradeData;
  };

  const openWebSocket = () => {
    ws = new WebSocket(
      `${process.env.BINANCE_API}/${TradePairs.ETHUSDT}@${StreamTypes.KLINE}_${DefaultInterval}`
    );

    ws.onmessage = (event) => {
      const tradeData: TradeData = JSON.parse(event.data as string);
      processTradeData(tradeData);
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

  bot.command(BotCommands.START, async (ctx) => {
    const { message, from } = ctx;

    const userId = from?.id;

    if (!userId) return;

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

    if (ws?.readyState !== WebSocket.OPEN) {
      openWebSocket();
    }
  });

  bot.command(BotCommands.STOP, async (ctx) => {
    const { message, from } = ctx;

    const userId = from?.id;

    if (!userId) return;

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
      ws?.close();
      lastTradeData = null;
      candles = [];
    }
  });

  bot.command(BotCommands.STATUS, async (ctx) => {
    const { message, from } = ctx;

    const userId = from?.id;

    const replyMessage =
      userId && userIds.includes(userId)
        ? "Watching <b>ETH</b>..."
        : "Bot is not started";

    ctx.reply(replyMessage, {
      reply_parameters: message
        ? { message_id: message.message_id }
        : undefined,
      parse_mode: "HTML",
    });
  });

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
