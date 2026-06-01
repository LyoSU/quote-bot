import { Schema, type InferSchemaType, type Types } from 'mongoose'
import { connection } from '../connection'

/** Time-series RPS/latency samples. Capped collection (~100MB / 100k docs). */
const statsSchema = new Schema(
  {
    rps: Number,
    responseTime: Number,
    date: { type: Date, index: true },
  },
  { capped: { size: 1000 * 1000 * 100, max: 100_000 } },
)

export type StatsDoc = InferSchemaType<typeof statsSchema> & { _id: Types.ObjectId }

export const Stats = connection.model('Stats', statsSchema)
