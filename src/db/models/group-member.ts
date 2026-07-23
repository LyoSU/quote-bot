import { Schema, type InferSchemaType, type Types } from 'mongoose'
import { connection } from '../connection'

/**
 * One row per (group, telegram_id). Populated opportunistically when a user
 * quotes or is quoted — the only reliable "user was present here" signal we get
 * without subscribing to chat_member events. The webapp resolves "My groups"
 * from this in one indexed lookup instead of scanning the quotes collection.
 */
const groupMemberSchema = new Schema(
  {
    group: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    telegram_id: { type: Number, required: true },
    firstSeenAt: { type: Date, default: Date.now },
    /** Last positive Bot API membership check performed by quotly-webapp. */
    verifiedAt: Date,
  },
  { versionKey: false },
)

// Primary lookup ("which groups is this user in?") + dedup guard.
groupMemberSchema.index({ telegram_id: 1, group: 1 }, { unique: true })
// Secondary ("who's in this group?").
groupMemberSchema.index({ group: 1, telegram_id: 1 })

export type GroupMemberDoc = InferSchemaType<typeof groupMemberSchema> & {
  _id: Types.ObjectId
}

export const GroupMember = connection.model('GroupMember', groupMemberSchema)
