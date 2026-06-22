import { Schema, type InferSchemaType, type Types } from 'mongoose'
import { connection } from '../connection'

/**
 * User profile + preferences. Schema kept 1:1 with the legacy collection so the
 * new bot reads/writes the same production data.
 *
 * Note: `adv` is retained for data compatibility even though the in-house ad
 * system is dropped (only gramads remains). It is never written by the new bot.
 */
const userSchema = new Schema(
  {
    telegram_id: { type: Number, index: true, unique: true, required: true },
    first_name: { type: String },
    last_name: { type: String },
    full_name: { type: String, index: true },
    username: { type: String },
    status: String,
    settings: {
      locale: String,
      quote: {
        backgroundColor: { type: String },
        emojiSuffix: { type: String },
        emojiBrand: { type: String },
        partialMode: { type: String },
        format: { type: String },
        media: { type: Boolean },
        showReply: { type: Boolean },
        crop: { type: Boolean },
      },
      hidden: { type: Boolean, default: true },
      privacy: { type: Boolean, default: false },
    },
    tempStickerSet: {
      name: String,
      create: { type: Boolean, default: false },
    },
    adv: {
      moderator: Boolean,
      credit: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
)

export type UserDoc = InferSchemaType<typeof userSchema> & {
  _id: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

export const User = connection.model('User', userSchema)
