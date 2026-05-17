import type { NextFunction } from 'grammy'
import type { CustomContext } from '../types/custom-context.type'
import en from '../locales/en.json'
import es from '../locales/es.json'
import pt from '../locales/pt.json'
import { userRepository } from '../repositories'

const locales: Record<string, Record<string, string>> = {
  en,
  pt,
  es,
}

export async function i18nMiddleware(ctx: CustomContext, next: NextFunction) {
  const userId = ctx.from?.id
  let language = ctx.session.language

  if (!language && userId) {
    const user = await userRepository.findByTelegramId(userId)
    if (user?.language) {
      language = user.language
    }
    else if (ctx.from?.language_code && ['en', 'pt', 'es'].includes(ctx.from.language_code)) {
      language = ctx.from.language_code as any
    }
    else {
      language = 'en' as any
    }

    ctx.session.language = language
  }

  if (!language) {
    language = 'en' as any
  }

  const translations = locales[language] || locales.en

  ctx.t = (key: string) => translations[key] || key

  return next()
}
