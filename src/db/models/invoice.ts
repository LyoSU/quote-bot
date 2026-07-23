import { Schema, type InferSchemaType, type Types } from 'mongoose'
import { connection } from '../connection'

/** Payment record. Reused for Telegram Stars (XTR) donations. */
const invoiceSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    amount: Number,
    status: { type: Number, default: 0 },
  },
  { timestamps: true },
)

export type InvoiceDoc = InferSchemaType<typeof invoiceSchema> & {
  _id: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

export const Invoice = connection.model('Invoice', invoiceSchema)
