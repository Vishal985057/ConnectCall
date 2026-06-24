import { Server } from "socket.io";

export const connectToSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "*",
      methods: ["GET", "POST"],
    },
  });

  // path -> [socketId, ...]
  const connections = {};
  // path -> first socket id (the host)
  const hosts = {};
  // path -> waiting users [{ id, name }]
  const waitingUsers = {};
  // socketId -> display name
  const participantNames = {};
  // path -> chat history
  const messages = {};
  const timeOnline = {};

  io.on("connection", (socket) => {
    // ── Join request ─────────────────────────────────────────────────────────
    socket.on("join-call", (path, userName) => {
      const name = (userName || "Guest").trim();
      participantNames[socket.id] = name;

      if (!connections[path] || connections[path].length === 0) {
        connections[path] = [socket.id];
        hosts[path] = socket.id;
        timeOnline[socket.id] = new Date();
        socket.emit("existing-users", [], {});
        return;
      }

      if (!waitingUsers[path]) waitingUsers[path] = [];
      waitingUsers[path].push({ id: socket.id, name });
      socket.emit("waiting-for-host");

      const hostId = hosts[path];
      if (hostId) {
        io.to(hostId).emit("user-waiting", { id: socket.id, name });
      }
    });

    // ── Host admits a waiting user ────────────────────────────────────────────
    socket.on("admit-user", (waitingSocketId) => {
      const key = Object.keys(connections).find((k) => connections[k].includes(socket.id));
      if (!key || hosts[key] !== socket.id) return;

      if (waitingUsers[key]) {
        waitingUsers[key] = waitingUsers[key].filter((u) => u.id !== waitingSocketId);
      }

      const existingIds = [...connections[key]];
      for (const id of existingIds) {
        io.to(id).emit("user-joined", waitingSocketId);
      }

      connections[key].push(waitingSocketId);
      timeOnline[waitingSocketId] = new Date();

      const nameMap = {};
      for (const id of existingIds) {
        nameMap[id] = participantNames[id] || `User ${id.slice(0, 4)}`;
      }
      io.to(waitingSocketId).emit("existing-users", existingIds, nameMap);

      if (messages[key]) {
        for (const msg of messages[key]) {
          io.to(waitingSocketId).emit("chat-message", msg.data, msg.sender, msg.socket_id_of_sender);
        }
      }
    });

    // ── Host denies a waiting user ────────────────────────────────────────────
    socket.on("deny-user", (waitingSocketId) => {
      const key = Object.keys(connections).find((k) => connections[k].includes(socket.id));
      if (!key || hosts[key] !== socket.id) return;

      if (waitingUsers[key]) {
        waitingUsers[key] = waitingUsers[key].filter((u) => u.id !== waitingSocketId);
      }
      io.to(waitingSocketId).emit("join-denied");
    });

    // ── WebRTC signaling ──────────────────────────────────────────────────────
    socket.on("signal", (toId, message) => {
      io.to(toId).emit("signal", socket.id, message);
    });

    // ── Chat ──────────────────────────────────────────────────────────────────
    socket.on("chat-message", (data, sender) => {
      const key = Object.keys(connections).find((k) => connections[k].includes(socket.id));
      if (!key) return;
      if (!messages[key]) messages[key] = [];
      messages[key].push({ sender, data, socket_id_of_sender: socket.id });
      for (const id of connections[key]) {
        io.to(id).emit("chat-message", data, sender, socket.id);
      }
    });

    // ── Name announce ─────────────────────────────────────────────────────────
    socket.on("user-name", (name) => {
      participantNames[socket.id] = name;
      const key = Object.keys(connections).find((k) => connections[k].includes(socket.id));
      if (!key) return;
      for (const id of connections[key]) {
        if (id !== socket.id) io.to(id).emit("user-name", socket.id, name);
      }
    });

    // ── Mute status ───────────────────────────────────────────────────────────
    socket.on("mute-status", (micOn, videoOn) => {
      const key = Object.keys(connections).find((k) => connections[k].includes(socket.id));
      if (!key) return;
      for (const id of connections[key]) {
        if (id !== socket.id) io.to(id).emit("mute-status", socket.id, micOn, videoOn);
      }
    });

    // ── Hand raise / lower ────────────────────────────────────────────────────
    socket.on("raise-hand", () => {
      const key = Object.keys(connections).find((k) => connections[k].includes(socket.id));
      if (!key) return;
      for (const id of connections[key]) {
        if (id !== socket.id) io.to(id).emit("hand-raised", socket.id);
      }
    });

    socket.on("lower-hand", () => {
      const key = Object.keys(connections).find((k) => connections[k].includes(socket.id));
      if (!key) return;
      for (const id of connections[key]) {
        if (id !== socket.id) io.to(id).emit("hand-lowered", socket.id);
      }
    });

    // ── Disconnect ────────────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      delete timeOnline[socket.id];
      delete participantNames[socket.id];

      for (const key of Object.keys(connections)) {
        const idx = connections[key].indexOf(socket.id);
        if (idx !== -1) {
          connections[key].splice(idx, 1);

          if (hosts[key] === socket.id) {
            if (connections[key].length > 0) {
              hosts[key] = connections[key][0];
              io.to(hosts[key]).emit("you-are-host");
              if (waitingUsers[key]?.length) {
                for (const w of waitingUsers[key]) {
                  io.to(hosts[key]).emit("user-waiting", w);
                }
              }
            } else {
              delete hosts[key];
            }
          }

          for (const id of connections[key]) {
            io.to(id).emit("user-left", socket.id);
          }

          if (connections[key].length === 0) {
            delete connections[key];
            delete messages[key];
            delete waitingUsers[key];
          }
          break;
        }
      }

      for (const key of Object.keys(waitingUsers)) {
        if (waitingUsers[key]) {
          waitingUsers[key] = waitingUsers[key].filter((u) => u.id !== socket.id);
        }
      }
    });
  });

  return io;
};
