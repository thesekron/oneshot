import { createServer } from "http";
import { Server, Socket } from "socket.io";

const port = process.env.PORT || 3002;

const httpServer = createServer((_req, res) => {
  res.writeHead(200);
  res.end("OneShot relay server");
});

const io = new Server(httpServer, {
  cors: { origin: "*" },
  maxHttpBufferSize: 50 * 1024 * 1024, // 50 MB – large enough for scene data
});

// ── state ────────────────────────────────────────────────────────────────────

/** roomId → connected socket IDs */
const rooms = new Map<string, Set<string>>();

/** socketId → roomId (reverse lookup) */
const socketRoom = new Map<string, string>();

/** followed socketId → set of follower socket IDs */
const followedBy = new Map<string, Set<string>>();

// ── helpers ──────────────────────────────────────────────────────────────────

function joinRoom(socket: Socket, roomId: string) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
  }
  const room = rooms.get(roomId)!;
  const isFirst = room.size === 0;

  room.add(socket.id);
  socket.join(roomId);
  socketRoom.set(socket.id, roomId);

  if (isFirst) {
    socket.emit("first-in-room");
  } else {
    // Tell existing members about the new arrival
    socket.to(roomId).emit("new-user", socket.id);
  }

  // Give everyone (including the new joiner) the current member list
  io.to(roomId).emit("room-user-change", [...room]);
}

function leaveRoom(socket: Socket) {
  const roomId = socketRoom.get(socket.id);
  if (!roomId) return;

  const room = rooms.get(roomId);
  if (room) {
    room.delete(socket.id);
    socket.leave(roomId);
    if (room.size === 0) {
      rooms.delete(roomId);
    } else {
      io.to(roomId).emit("room-user-change", [...room]);
    }
  }

  socketRoom.delete(socket.id);
}

function cleanupFollowers(socketId: string) {
  // Remove this socket as a follower from everyone it was following
  for (const followers of followedBy.values()) {
    followers.delete(socketId);
  }
  // Remove the entry for anyone who was following this socket
  followedBy.delete(socketId);
}

// ── connection handling ──────────────────────────────────────────────────────

io.on("connection", (socket: Socket) => {
  socket.emit("init-room");

  socket.on("join-room", (roomId: string) => {
    if (!roomId || typeof roomId !== "string") return;
    leaveRoom(socket); // leave any previous room first
    joinRoom(socket, roomId);
  });

  // Persistent broadcast (elements, scene updates)
  socket.on(
    "server-broadcast",
    (roomId: string, encryptedData: ArrayBuffer, iv: Uint8Array) => {
      if (socketRoom.get(socket.id) !== roomId) return;
      socket.to(roomId).emit("client-broadcast", encryptedData, iv);
    },
  );

  // Volatile broadcast (cursor position, idle state – OK to drop)
  socket.on(
    "server-volatile-broadcast",
    (roomId: string, encryptedData: ArrayBuffer, iv: Uint8Array) => {
      if (socketRoom.get(socket.id) !== roomId) return;
      socket.volatile.to(roomId).emit("client-broadcast", encryptedData, iv);
    },
  );

  // User-follow (viewport sync)
  socket.on(
    "user-follow",
    (payload: {
      userToFollow: { socketId: string; username: string };
      action: "FOLLOW" | "UNFOLLOW";
    }) => {
      const targetId = payload?.userToFollow?.socketId;
      if (!targetId) return;

      if (!followedBy.has(targetId)) {
        followedBy.set(targetId, new Set());
      }
      const followers = followedBy.get(targetId)!;

      if (payload.action === "FOLLOW") {
        followers.add(socket.id);
      } else {
        followers.delete(socket.id);
      }

      // Tell the followed user who is watching them so they can relay viewport
      io.to(targetId).emit("user-follow-room-change", [...followers]);
    },
  );

  socket.on("disconnect", () => {
    leaveRoom(socket);
    cleanupFollowers(socket.id);
  });
});

// ── start ────────────────────────────────────────────────────────────────────

httpServer.listen(port, () => {
  console.log(`OneShot relay server listening on port ${port}`);
});
