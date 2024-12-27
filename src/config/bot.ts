import { Bot, Context, session, SessionFlavor } from 'grammy';
import { FileFlavor, hydrateFiles } from '@grammyjs/files';
import { SessionData } from '../interfaces/session-data';

type CustomContext = FileFlavor<Context> & SessionFlavor<SessionData>

const bot = new Bot<CustomContext>(process.env.BOT_TOKEN!);

bot.use(
  session({
    initial: (): SessionData => ({
      command: null,
      params: null
    })
  })
)

bot
  .api
  .config
  .use(hydrateFiles(bot.token))

export { bot }
