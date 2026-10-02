import { logger } from '../../core/logger'
import { generateQuote } from '../../services/quote-api/client'
import type { QuoteMessage } from '../../services/quote-api/types'
import { DEFAULT_BACKGROUND } from '../quote/color'
import { syntheticId } from '../quote/sender'

const log = logger.child({ module: 'demo-sticker' })

type Line = readonly [name: string, text: string]

/**
 * A tiny made-up chat (same joke everywhere, written natively per language):
 * "going to bed early" -> "what time is it?" -> "3:47, but earlier than yesterday".
 */
const DIALOGS: Record<string, readonly [Line, Line, Line]> = {
  uk: [['Оля', 'Сьогодні лягаю раніше.'], ['Макс', 'А котра година?'], ['Оля', '03:47. Зате раніше, ніж учора 😌']],
  en: [['Alex', 'Going to bed early tonight.'], ['Sam', 'What time is it?'], ['Alex', '3:47 AM. But earlier than yesterday 😌']],
  ru: [['Аня', 'Сегодня ложусь пораньше.'], ['Макс', 'И который час?'], ['Аня', '03:47. Зато раньше, чем вчера 😌']],
  be: [['Воля', 'Сёння кладуся раней.'], ['Макс', 'А колькі зараз?'], ['Воля', '03:47. Затое раней, чым учора 😌']],
  pl: [['Ola', 'Dziś idę wcześniej spać.'], ['Max', 'Która godzina?'], ['Ola', '03:47. Ale wcześniej niż wczoraj 😌']],
  de: [['Lena', 'Heute gehe ich früh ins Bett.'], ['Max', 'Wie spät ist es?'], ['Lena', '03:47. Aber früher als gestern 😌']],
  fr: [['Léa', 'Ce soir, je me couche tôt.'], ['Max', 'Il est quelle heure ?'], ['Léa', '03h47. Mais plus tôt qu’hier 😌']],
  es: [['Lucía', 'Hoy me acuesto temprano.'], ['Max', '¿Qué hora es?'], ['Lucía', '03:47. Pero más temprano que ayer 😌']],
  it: [['Giulia', 'Stasera vado a letto presto.'], ['Marco', 'Che ore sono?'], ['Giulia', '03:47. Ma prima di ieri 😌']],
  pt: [['Ana', 'Hoje vou dormir cedo.'], ['Pedro', 'Que horas são?'], ['Ana', '03:47. Mas mais cedo que ontem 😌']],
  nl: [['Lotte', 'Vandaag ga ik vroeg slapen.'], ['Max', 'Hoe laat is het?'], ['Lotte', '03:47. Maar wel vroeger dan gisteren 😌']],
  tr: [['Ayşe', 'Bu akşam erken yatıyorum.'], ['Mert', 'Saat kaç?'], ['Ayşe', '03:47. Ama dünden erken 😌']],
  az: [['Aysel', 'Bu gün tez yatıram.'], ['Murad', 'Saat neçədir?'], ['Aysel', '03:47. Amma dünənkindən tezdir 😌']],
  uz: [['Dilnoza', 'Bugun erta yotaman.'], ['Aziz', 'Soat nechi?'], ['Dilnoza', '03:47. Lekin kechagidan erta 😌']],
  id: [['Dina', 'Malam ini aku tidur cepat.'], ['Budi', 'Sekarang jam berapa?'], ['Dina', '03.47. Tapi lebih cepat dari kemarin 😌']],
  ja: [['ゆき', '今日は早めに寝るね。'], ['けん', '今何時？'], ['ゆき', '3:47。でも昨日よりは早い 😌']],
  ko: [['지수', '오늘은 일찍 잘 거야.'], ['민준', '지금 몇 시야?'], ['지수', '3시 47분. 그래도 어제보다는 일찍이야 😌']],
  zh: [['小雨', '今晚我要早点睡。'], ['阿杰', '现在几点了？'], ['小雨', '凌晨3:47。但比昨天早 😌']],
  ar: [['ليلى', 'الليلة سأنام باكرًا.'], ['عمر', 'كم الساعة الآن؟'], ['ليلى', '3:47 فجرًا. لكنه أبكر من أمس 😌']],
}

/** The demo dialog as quote-api messages. Fictional senders use synthetic ids (never looked up on Telegram). */
export function demoMessages(locale: string): QuoteMessage[] {
  const dialog = DIALOGS[locale] ?? DIALOGS['en']!
  let prev: string | undefined
  return dialog.map(([name, text], i) => {
    const id = syntheticId(name)
    const firstInStreak = prev !== name
    prev = name
    return {
      message_id: i + 1,
      avatar: true,
      chatId: id,
      text,
      from: { id, first_name: name, name: firstInStreak ? name : false, synthetic: true },
    }
  })
}

/** Renders the demo once through the same quote-api path /q uses (default sticker spec: 512x768 @2x webp). */
export async function renderDemoSticker(locale: string): Promise<Buffer> {
  const result = await generateQuote({
    type: 'quote',
    format: 'webp',
    width: 512,
    height: 768,
    scale: 2,
    backgroundColor: DEFAULT_BACKGROUND,
    emojiBrand: 'apple',
    messages: demoMessages(locale),
  })
  return result.image
}

/** Sends either a cached sticker file_id or fresh bytes; resolves to the resulting file_id. */
export type DemoSend = (media: string | Buffer) => Promise<string | undefined>

/**
 * In-memory locale -> sticker file_id cache with in-flight render dedupe.
 * Memory only: after a restart the demo is simply re-rendered once per locale.
 */
export class DemoStickerCache {
  private readonly fileIds = new Map<string, string>()
  private readonly rendering = new Map<string, Promise<Buffer>>()

  constructor(private readonly render: (locale: string) => Promise<Buffer> = renderDemoSticker) {}

  get(locale: string): string | undefined {
    return this.fileIds.get(locale)
  }

  /**
   * Delivers the demo sticker. Cached -> resend by file_id (falls back to a
   * re-render if Telegram rejects the id). Never throws; false = nothing sent.
   */
  async deliver(locale: string, send: DemoSend): Promise<boolean> {
    try {
      const cached = this.fileIds.get(locale)
      if (cached) {
        try {
          await send(cached)
          return true
        } catch {
          this.fileIds.delete(locale)
        }
      }
      let pending = this.rendering.get(locale)
      if (!pending) {
        pending = this.render(locale).finally(() => this.rendering.delete(locale))
        this.rendering.set(locale, pending)
      }
      const fileId = await send(await pending)
      if (fileId) this.fileIds.set(locale, fileId)
      return true
    } catch (err) {
      log.debug({ err, locale }, 'demo sticker skipped')
      return false
    }
  }
}

export const demoStickers = new DemoStickerCache()
