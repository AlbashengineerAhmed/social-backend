import mongoose, { Schema, Types, model } from "mongoose";

const conversationSchema = new Schema(
    {
        participants: [
            {
                type: Types.ObjectId,
                ref: "User",
                required: true,
            },
        ],
        lastMessage: {
            type: Types.ObjectId,
            ref: "Message",
        },
    },
    {
        timestamps: true,
    }
);

export const conversationModel =
    mongoose.models.Conversation || model("Conversation", conversationSchema);

