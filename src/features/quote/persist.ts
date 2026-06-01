import { Types } from 'mongoose'
import type { GroupDoc, UserDoc } from '../../db/models'
import { Counter, Quote } from '../../db/models'
import { trackMember } from '../../db/member-tracker'
import { logger } from '../../core/logger'
import type { QuoteFormat, QuoteMessage, QuoteType } from '../../services/quote-api/types'
import { denormalizeQuote, type DenormalizeContext } from './denormalize'

const log = logger.child({ module: 'quote-persist' })

/** Hard cap on the archived payload — mirrors the legacy 1MB guard. */
const PAYLOAD_BYTES_CAP = 1_000_000

/** The renderer payload, stored verbatim so the webapp can re-render. */
export interface QuotePayload {
  version: 1
  messages: QuoteMessage[]
  backgroundColor: string
  emojiBrand: string
  scale: number
  width: number
  height: number
  type: QuoteType
  format: QuoteFormat
}

export interface PersistQuoteParams {
  group?: GroupDoc
  user?: UserDoc
  fileId: string
  fileUniqueId: string
  localId: number | null
  /** Pre-minted id for the guest path (the rating callback needs it to exist). */
  presetId?: Types.ObjectId
  payload: QuotePayload
  ctxMessage: DenormalizeContext
  privacy: boolean
  rateEnabled: boolean
  /** Whether to archive text/authors (group `settings.archive.storeText`). */
  storeText: boolean
  /** Guest mode: the chat the quote was summoned from. */
  callerChat?: { id: number }
}

interface QuoteDocInput {
  _id?: Types.ObjectId
  group?: Types.ObjectId
  user?: Types.ObjectId
  file_id: string
  file_unique_id: string
  local_id?: number
  global_id?: number
  payload?: QuotePayload
  authors?: ReturnType<typeof denormalizeQuote>['authors']
  hasVoice?: boolean
  hasMedia?: boolean
  messageCount?: number
  source?: { chat_id?: number; message_ids?: number[]; date: Date }
  rate?: { votes: { name: string; vote: Types.ObjectId[] }[]; score: number }
}

async function mintGlobalId(): Promise<number | undefined> {
  try {
    const counter = await Counter.findOneAndUpdate(
      { _id: 'quote' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, projection: { seq: 1 } },
    ).lean<{ seq: number }>()
    return counter?.seq
  } catch (err) {
    log.error({ err }, 'Counter $inc failed')
    return undefined
  }
}

/**
 * Persists the generated quote. Runs off the hot path (the caller schedules it
 * after the sticker is sent), so all the CPU work — JSON sizing, denormalize,
 * member dedup — stays off the response latency. Atomic create; no full-doc
 * save races.
 */
export async function persistQuote(params: PersistQuoteParams): Promise<void> {
  try {
    const doc: QuoteDocInput = {
      file_id: params.fileId,
      file_unique_id: params.fileUniqueId,
    }
    if (params.presetId) doc._id = params.presetId
    if (params.group) doc.group = params.group._id
    if (params.user) doc.user = params.user._id
    if (params.localId != null) doc.local_id = params.localId

    let authorTgIds: number[] = []

    if (params.storeText) {
      const bytes = Buffer.byteLength(JSON.stringify(params.payload), 'utf8')
      if (bytes <= PAYLOAD_BYTES_CAP) {
        doc.payload = params.payload
        const denorm = denormalizeQuote(params.payload.messages, params.ctxMessage, {
          privacy: params.privacy,
        })
        doc.authors = denorm.authors
        doc.hasVoice = denorm.hasVoice
        doc.hasMedia = denorm.hasMedia
        doc.messageCount = denorm.messageCount
        doc.source = params.callerChat
          ? { chat_id: params.callerChat.id, message_ids: denorm.source.message_ids, date: denorm.source.date }
          : denorm.source
        authorTgIds = denorm.authors
          .map((a) => a.telegram_id)
          .filter((id): id is number => typeof id === 'number' && id > 0)
      } else {
        log.warn({ bytes }, 'payload exceeds cap, skipping archive fields')
      }
    }

    if (params.rateEnabled) {
      doc.rate = {
        votes: [
          { name: '👍', vote: [] },
          { name: '👎', vote: [] },
        ],
        score: 0,
      }
    }

    doc.global_id = await mintGlobalId()

    await Quote.create(doc)

    // Membership signal: quoter + quoted authors.
    if (params.group) {
      const quoterTgId = params.user?.telegram_id
      const ids = new Set<number>(authorTgIds)
      if (typeof quoterTgId === 'number' && quoterTgId > 0) ids.add(quoterTgId)
      for (const id of ids) trackMember(params.group._id, id)
    }
  } catch (err) {
    log.error({ err }, 'post-send persist failed')
  }
}
