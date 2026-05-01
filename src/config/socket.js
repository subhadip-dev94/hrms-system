const { Server } = require('socket.io');

let io;

function initSocket(httpServer, sessionMiddleware) {
  io = new Server(httpServer, {
    transports: ['websocket'],
    cors: { origin: process.env.APP_URL || '*' },
  });

  // Share express-session with socket.io so we can read req.session.user
  io.use((socket, next) => {
    sessionMiddleware(socket.request, socket.request.res || {}, next);
  });

  // Reject unauthenticated connections
  io.use((socket, next) => {
    if (!socket.request.session?.user) return next(new Error('Unauthorized'));
    socket.user = socket.request.session.user;
    next();
  });

  io.on('connection', (socket) => {
    const { _id, role, employeeId } = socket.user;
    // Personal rooms for targeting specific users
    socket.join(`user:${_id}`);
    socket.join(`role:${role}`);
    if (employeeId) socket.join(`emp:${employeeId}`);
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

// Emit to a specific User._id
function emitToUser(userId, event, data) {
  getIO().to(`user:${userId}`).emit(event, data);
}

// Emit to a specific Employee._id
function emitToEmployee(employeeId, event, data) {
  getIO().to(`emp:${employeeId}`).emit(event, data);
}

// Emit to everyone with a given role
function emitToRole(role, event, data) {
  getIO().to(`role:${role}`).emit(event, data);
}

// Emit to multiple roles
function emitToRoles(roles, event, data) {
  roles.forEach((r) => getIO().to(`role:${r}`).emit(event, data));
}

// Emit to all connected authenticated users
function emitToAll(event, data) {
  getIO().emit(event, data);
}

module.exports = { initSocket, getIO, emitToUser, emitToEmployee, emitToRole, emitToRoles, emitToAll };
