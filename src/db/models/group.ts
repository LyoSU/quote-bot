import { Schema, type InferSchemaType, type Types } from 'mongoose'
import { connection } from '../connection'

/**
 * Group settings + per-chat quote configuration. Schema kept 1:1.
 *
 * Note: `settings.aiMode` is retained for data compatibility; AI features are
 * dropped and the new bot never reads it.
 */
const groupSchema = new Schema(
  {
    group_id: { type: Number, index: true, unique: true, required: true },
    title: String,
    username: String,
    invite_link: String,
    memberCount: Number,
    settings: {
      locale: String,
      quote: {
        backgroundColor: { type: String },
        emojiSuffix: { type: String },
        emojiBrand: { type: String },
        partialMode: { type: String },
      },
      rate: { type: Boolean, default: true },
      hidden: { type: Boolean, default: true },
      privacy: { type: Boolean, default: false },
      randomQuoteGab: { type: Number, default: 800 },
      aiMode: { type: String, default: 'sarcastic' },
      archive: {
        storeText: { type: Boolean, default: true },
      },
    },
    stickerSet: {
      name: String,
      create: { type: Boolean, default: false },
    },
    topSet: {
      name: String,
      create: { type: Boolean, default: false },
      lastUpdate: Date,
      stickers: [
        {
          quote: { type: Schema.Types.ObjectId, ref: 'Quote' },
          fileId: String,
          fileUniqueId: String,
        },
      ],
    },
    lastRandomQuote: { type: Date, default: Date.now },
    available: {
      check: Boolean,
      active: Boolean,
    },
    quoteCounter: { type: Number, default: 0 },
  },
  { timestamps: true },
)

export type GroupDoc = InferSchemaType<typeof groupSchema> & {
  _id: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

export const Group = connection.model('Group', groupSchema)
