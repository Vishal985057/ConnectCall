import { Server } from "socket.io";

export const connectToSocket = (server) => {
  const io = new Server(server, {
    cors: { origin: process.env.FRONTEND_URL || "*", methods: ["GET","POST"] },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // roomId -> socketId[]
  const rooms = {};
  // roomId -> hostSocketId
  const hosts = {};
  // roomId -> [{id, name}]
  const waiting = {};
  // socketId -> name
  const names = {};
  // roomId -> message[]
  const chatLogs = {};

  io.on("connection", socket => {

    socket.on("join-call", (roomId, userName) => {
      const name = (userName || "Guest").trim();
      names[socket.id] = name;

      if (!rooms[roomId] || rooms[roomId].length === 0) {
        // First person — becomes host immediately
        rooms[roomId] = [socket.id];
        hosts[roomId] = socket.id;
        socket.join(roomId);
        socket.emit("you-are-host");
        socket.emit("existing-users", [], {});
        return;
      }

      // Put in waiting room, notify host
      if (!waiting[roomId]) waiting[roomId] = [];
      waiting[roomId].push({ id: socket.id, name });
      socket.emit("waiting-for-host");
      if (hosts[roomId]) io.to(hosts[roomId]).emit("user-waiting", { id: socket.id, name });
    });

    socket.on("admit-user", waitId => {
      const roomId = Object.keys(rooms).find(k => rooms[k].includes(socket.id));
      if (!roomId || hosts[roomId] !== socket.id) return;

      if (waiting[roomId]) waiting[roomId] = waiting[roomId].filter(u => u.id !== waitId);

      const existing = [...rooms[roomId]];
      // Tell everyone already in the room that a new user joined
      existing.forEach(id => io.to(id).emit("user-joined", waitId));
      // Tell the new user who's already there
      const nameMap = {};
      existing.forEach(id => { nameMap[id] = names[id] || id; });
      io.to(waitId).emit("existing-users", existing, nameMap);
      // Replay chat history
      (chatLogs[roomId] || []).forEach(m => io.to(waitId).emit("chat-message", m.text, m.sender, m.sid));

      rooms[roomId].push(waitId);
      const ws = io.sockets.sockets.get(waitId);
      if (ws) ws.join(roomId);
    });

    socket.on("deny-user", waitId => {
      const roomId = Object.keys(rooms).find(k => rooms[k].includes(socket.id));
      if (!roomId || hosts[roomId] !== socket.id) return;
      if (waiting[roomId]) waiting[roomId] = waiting[roomId].filter(u => u.id !== waitId);
      io.to(waitId).emit("join-denied");
    });

    socket.on("signal", (toId, payload) => io.to(toId).emit("signal", socket.id, payload));

    socket.on("chat-message", (text, sender) => {
      const roomId = Object.keys(rooms).find(k => rooms[k].includes(socket.id));
      if (!roomId) return;
      if (!chatLogs[roomId]) chatLogs[roomId] = [];
      chatLogs[roomId].push({ text, sender, sid: socket.id });
      rooms[roomId].forEach(id => {
        if (id !== socket.id) io.to(id).emit("chat-message", text, sender, socket.id);
      });
    });

    socket.on("mute-status", (micOn, videoOn) => {
      const roomId = Object.keys(rooms).find(k => rooms[k].includes(socket.id));
      if (!roomId) return;
      rooms[roomId].forEach(id => {
        if (id !== socket.id) io.to(id).emit("mute-status", socket.id, micOn, videoOn);
      });
    });

    socket.on("raise-hand", () => {
      const roomId = Object.keys(rooms).find(k => rooms[k].includes(socket.id));
      if (!roomId) return;
      rooms[roomId].forEach(id => { if (id !== socket.id) io.to(id).emit("hand-raised", socket.id); });
    });

    socket.on("lower-hand", () => {
      const roomId = Object.keys(rooms).find(k => rooms[k].includes(socket.id));
      if (!roomId) return;
      rooms[roomId].forEach(id => { if (id !== socket.id) io.to(id).emit("hand-lowered", socket.id); });
    });

    socket.on("user-name", name => {
      names[socket.id] = name;
      const roomId = Object.keys(rooms).find(k => rooms[k].includes(socket.id));
      if (!roomId) return;
      rooms[roomId].forEach(id => { if (id !== socket.id) io.to(id).emit("peer-name", socket.id, name); });
    });

    socket.on("disconnect", () => {
      delete names[socket.id];
      // Remove from any waiting lists
      Object.keys(waiting).forEach(rid => {
        if (waiting[rid]) waiting[rid] = waiting[rid].filter(u => u.id !== socket.id);
      });
      // Remove from rooms
      const roomId = Object.keys(rooms).find(k => rooms[k].includes(socket.id));
      if (!roomId) return;
      rooms[roomId] = rooms[roomId].filter(id => id !== socket.id);
      // Notify others
      rooms[roomId].forEach(id => io.to(id).emit("user-left", socket.id));
      // Re-assign host
      if (hosts[roomId] === socket.id) {
        if (rooms[roomId].length > 0) {
          hosts[roomId] = rooms[roomId][0];
          io.to(hosts[roomId]).emit("you-are-host");
          (waiting[roomId] || []).forEach(u => io.to(hosts[roomId]).emit("user-waiting", u));
        } else {
          delete hosts[roomId];
          delete rooms[roomId];
          delete chatLogs[roomId];
          delete waiting[roomId];
        }
      }
    });
  });
  return io;
};
