import { Server } from "socket.io";
import { decodedToken } from "./utils/security/token.security.js";

let ioInstance = null;
const onlineUsers = new Map();

export const initSocket = (server) => {
    ioInstance = new Server(server, {
        cors: {
            origin: true,
            credentials: true
        },
    });

    ioInstance.on("connection", (socket) => {
        // Register user connection
        socket.on("register_user", (userId) => {
            if (userId) {
                onlineUsers.set(userId.toString(), socket.id);
                ioInstance.emit("user_status_changed", { userId, status: "online" });
            }
        });

        // Join conversation room
        socket.on("join_conversation", (conversationId) => {
            socket.join(conversationId);
        });

        // Leave conversation room
        socket.on("leave_conversation", (conversationId) => {
            socket.leave(conversationId);
        });

        // Real-time message exchange
        socket.on("send_realtime_message", (data) => {
            // Broadcast to the conversation room
            ioInstance.to(data.conversationId).emit("new_message", data);

            // Also notify direct recipient if online
            const recipientSocket = onlineUsers.get(data.recipientId?.toString());
            if (recipientSocket) {
                ioInstance.to(recipientSocket).emit("message_notification", data);
            }
        });

        // Real-time typing indicators
        socket.on("typing", (data) => {
            socket.to(data.conversationId).emit("user_typing", data);
        });

        socket.on("stop_typing", (data) => {
            socket.to(data.conversationId).emit("user_stop_typing", data);
        });

        // Handle disconnect
        socket.on("disconnect", () => {
            for (const [userId, sockId] of onlineUsers.entries()) {
                if (sockId === socket.id) {
                    onlineUsers.delete(userId);
                    ioInstance.emit("user_status_changed", { userId, status: "offline" });
                    break;
                }
            }
        });
    });

    return ioInstance;
};

export const getIO = () => ioInstance;

export const emitToUser = (userId, event, payload) => {
    if (!ioInstance || !userId) return;
    const socketId = onlineUsers.get(userId.toString());
    if (socketId) {
        ioInstance.to(socketId).emit(event, payload);
    }
};
