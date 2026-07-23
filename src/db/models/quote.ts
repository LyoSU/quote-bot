import { Schema, type InferSchemaType, type Types } from 'mongoose'
import { connection } from '../connection'

/** Denormalized author, embedded with no _id overhead (× millions of rows). */
const authorSchema = new Schema(
  {
    telegram_id: Number,
    first_name: String,
    last_name: String,
    username: String,
    title: String,
    name: String,
  },
  { _id: false },
)

/**
 * The quote-api payload — the ground truth POSTed to /generate.webp. Stored
 * verbatim so the webapp / future re-renderers can feed it back and get an
 * identical sticker.
 */
const payloadSchema = new Schema(
  {
    version: { type: Number, default: 1 },
    messages: [Schema.Types.Mixed],
    backgroundColor: String,
    emojiBrand: String,
    scale: Number,
    width: Number,
    height: Number,
    type: String,
    format: String,
  },
  { _id: false },
)

const quoteSchema = new Schema(
  {
    group: { type: Schema.Types.ObjectId, ref: 'Group' },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    file_id: { type: String },
    file_unique_id: { type: String, index: true, unique: true, required: true },
    rate: {
      votes: [
        {
          type: Object,
          name: String,
          vote: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        },
      ],
      score: { type: Number },
    },

    // V2 additions — all optional, legacy docs keep working.
    payload: payloadSchema,
    authors: [authorSchema],
    hasVoice: { type: Boolean, default: false },
    hasMedia: { type: Boolean, default: false },
    messageCount: Number,
    source: {
      chat_id: Number,
      message_ids: [Number],
      date: Date,
    },
    local_id: Number,
    global_id: Number,
    forgottenAt: Date,
  },
  { timestamps: true },
)

// Distinguishes legacy (never had payload) from forgotten (payload unset by
// /qforget).
quoteSchema.virtual('legacy').get(function (this: { payload?: unknown; forgottenAt?: unknown }) {
  return !this.payload && !this.forgottenAt
})
quoteSchema.virtual('forgotten').get(function (this: { forgottenAt?: unknown }) {
  return !!this.forgottenAt
})

// Existing indexes — preserved.
quoteSchema.index({ group: 1, 'rate.score': -1 })
quoteSchema.index({ 'rate.votes.vote': 1, 'rate.score': -1 })

// V2 indexes — partial so they only cover new-style docs.
quoteSchema.index(
  { group: 1, local_id: 1 },
  { unique: true, partialFilterExpression: { local_id: { $exists: true } } },
)
quoteSchema.index(
  { global_id: 1 },
  { unique: true, partialFilterExpression: { global_id: { $exists: true } } },
)
quoteSchema.index({ group: 1, createdAt: -1 })
quoteSchema.index(
  { 'authors.telegram_id': 1, group: 1 },
  { partialFilterExpression: { 'authors.0': { $exists: true } } },
)

export type QuoteDoc = InferSchemaType<typeof quoteSchema> & {
  _id: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

export const Quote = connection.model('Quote', quoteSchema)
