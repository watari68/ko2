const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const config = require('./config/config');
const authRoutes = require('./routes/auth.routes');
const characterRoutes = require('./routes/character.routes');
const { setupGameHandlers } = require('./services/gameService');

// Express app setup
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('../client'));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/characters', characterRoutes);

// MongoDB connection
mongoose.connect(config.dbUri)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Create HTTP server and socket.io instance
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Game state management
const gameState = {
  players: {},
  npcs: {},
  mobs: {},
  zones: {}
};

// Initialize game world
require('./services/worldInitializer').initGameWorld(gameState);

// Set up socket.io event handlers
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  setupGameHandlers(io, socket, gameState);
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (socket.playerId) {
      // Remove player from world
      delete gameState.players[socket.playerId];
      // Broadcast player left
      socket.broadcast.emit('playerLeft', socket.playerId);
    }
  });
});

// Game loop for server-side logic (10 updates per second)
const TICK_RATE = 100;
setInterval(() => {
  require('./services/gameLoop').update(gameState);
  io.emit('worldUpdate', gameState);
}, TICK_RATE);

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});