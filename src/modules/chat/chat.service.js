import { asyncHandler } from "../../utils/response/error.response.js";
import { successResponse } from "../../utils/response/success.response.js";
import { conversationModel } from "../../DB/model/Conversation.model.js";
import { messageModel } from "../../DB/model/Message.model.js";

export const getConversations = asyncHandler(async (req, res, next) => {
    const userId = req.user._id;

    const conversations = await conversationModel
        .find({ participants: userId })
        .populate("participants", "username email profilePicture")
        .populate("lastMessage")
        .sort({ updatedAt: -1 });

    return successResponse({
        res,
        status: 200,
        message: "Conversations fetched successfully",
        data: { conversations },
    });
});

export const getMessages = asyncHandler(async (req, res, next) => {
    const { conversationId } = req.params;

    const messages = await messageModel
        .find({ conversationId })
        .populate("senderId", "username profilePicture")
        .sort({ createdAt: 1 });

    return successResponse({
        res,
        status: 200,
        message: "Messages fetched successfully",
        data: { messages },
    });
});

export const sendMessage = asyncHandler(async (req, res, next) => {
    const userId = req.user._id;
    const { recipientId, text } = req.body;

    let conversation = await conversationModel.findOne({
        participants: { $all: [userId, recipientId] },
    });

    if (!conversation) {
        conversation = await conversationModel.create({
            participants: [userId, recipientId],
        });
    }

    const message = await messageModel.create({
        conversationId: conversation._id,
        senderId: userId,
        text,
    });

    conversation.lastMessage = message._id;
    await conversation.save();

    return successResponse({
        res,
        status: 201,
        message: "Message sent",
        data: { message },
    });
});

