import { Schema, type InferSchemaType } from 'mongoose'
import { connection } from '../connection'

/**
 * Single-document atomic sequence for minting monotonic IDs.
 * Currently `{ _id: 'quote' }` backs Quote.global_id.
 */
const counterSchema = new Schema(
  {
    _id: String,
    seq: { type: Number, default: 0 },
  },
  { versionKey: false },
)

export type CounterDoc = InferSchemaType<typeof counterSchema>

export const Counter = connection.model('Counter', counterSchema)
