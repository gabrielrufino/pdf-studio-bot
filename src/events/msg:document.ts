import { bot } from "../config/bot";

bot.on('msg:document', async (ctx) => {
  const file = await ctx.getFile()
  console.log({ file })
  const path = await file.download()
  console.log({ path })
  ctx.reply('File')
})
