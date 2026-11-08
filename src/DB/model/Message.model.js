import mongoose, { Schema, Types, model } from "mongoose";

const messageSchema = new Schema(
    {
        conversationId: {
            type: Types.ObjectId,
            ref: "Conversation",
            required: true,
        },
        senderId: {
            type: Types.ObjectId,
            ref: "User",
            required: true,
        },
        text: {
            type: String,
            required: true,
            trim: true,
        },
        isRead: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

export const messageModel =
    mongoose.models.Message || model("Message", messageSchema);

