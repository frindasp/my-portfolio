import { Server as NetServer } from "http";
import { NextApiRequest } from "next";
import { Server as ServerIO } from "socket.io";
import { NextApiResponseServerIO } from "@/lib/socket-types";

export const config = {
  api: {
    bodyParser: false,
  },
};

const ioHandler = (req: NextApiRequest, res: NextApiResponseServerIO) => {
  if (!res.socket.server.io) {
    console.log(">>> [Socket.io] First connection. Initializing server...");
    const httpServer: NetServer = res.socket.server as any;
    const io = new ServerIO(httpServer, {
      path: "/api/socket",
      addTrailingSlash: false,
    });

    res.socket.server.io = io;

    io.on("connection", (socket) => {
      console.log(">>> [Socket.io] New client connected:", socket.id);

      socket.on("join-chat", (userId) => {
        socket.join(`chat-${userId}`);
        console.log(`>>> [Socket.io] User ${socket.id} joined room: chat-${userId}`);
      });

      socket.on("client-message", (data) => {
        const room = data.room;
        if (room) {
          console.log(`>>> [Socket.io] Broadcasting message to ${room}`);
          // Broadcast to everyone in the room except the sender
          socket.to(room).emit("receive-message", data);
        }
      });

      socket.on("disconnect", () => {
        console.log(">>> [Socket.io] Client disconnected:", socket.id);
      });
    });
  } else {
    // console.log(">>> [Socket.io] Server already running");
  }
  res.end();
};

export default ioHandler;
