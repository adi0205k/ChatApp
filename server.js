const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Serve static files
app.use(express.static('.'));

// Store active users and rooms
const activeUsers = new Set();
const rooms = new Map(); // Map of room name to Set of users

// Function to broadcast room users count
function broadcastRoomUsers(roomName) {
    if (rooms.has(roomName)) {
        const userCount = rooms.get(roomName).size;
        io.to(roomName).emit('roomUsersCount', {
            room: roomName,
            count: userCount
        });
    }
}

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Authentication
    socket.on('authenticate', ({ username }, callback) => {
        console.log('Authentication attempt for username:', username);
        if (activeUsers.has(username)) {
            console.log('Username already taken:', username);
            callback({ success: false });
        } else {
            console.log('Username accepted:', username);
            activeUsers.add(username);
            socket.username = username;
            callback({ success: true });
            // Send current room list to the new user
            const roomList = Array.from(rooms.keys());
            console.log('Sending room list to user:', roomList);
            socket.emit('roomList', roomList);
            // Send total users count
            socket.emit('totalUsers', activeUsers.size);
        }
    });

    // Create room
    socket.on('createRoom', ({ roomName }) => {
        console.log('Create room attempt:', roomName);
        if (!rooms.has(roomName)) {
            console.log('Creating new room:', roomName);
            rooms.set(roomName, new Set());
            io.emit('roomList', Array.from(rooms.keys()));
        }
    });

    // Join room
    socket.on('joinRoom', ({ roomName }) => {
        console.log('Join room attempt:', roomName, 'by user:', socket.username);
        if (rooms.has(roomName)) {
            const roomUsers = rooms.get(roomName);
            roomUsers.add(socket.username);
            socket.join(roomName);
            console.log('User joined room:', socket.username, 'in room:', roomName);
            socket.to(roomName).emit('userJoined', { username: socket.username });
            broadcastRoomUsers(roomName);
        }
    });

    // Leave room
    socket.on('leaveRoom', ({ roomName }) => {
        if (rooms.has(roomName)) {
            const roomUsers = rooms.get(roomName);
            roomUsers.delete(socket.username);
            socket.leave(roomName);
            socket.to(roomName).emit('userLeft', { username: socket.username });
            
            // Remove room if empty
            if (roomUsers.size === 0) {
                rooms.delete(roomName);
                io.emit('roomList', Array.from(rooms.keys()));
            }
            broadcastRoomUsers(roomName);
        }
    });

    // Handle messages
    socket.on('message', ({ room, message, username }) => {
        if (rooms.has(room)) {
            io.to(room).emit('message', {
                username,
                message,
                timestamp: new Date().toISOString()
            });
        }
    });

    // Handle logout
    socket.on('logout', () => {
        if (socket.username) {
            activeUsers.delete(socket.username);
            // Remove user from all rooms
            rooms.forEach((users, roomName) => {
                if (users.has(socket.username)) {
                    users.delete(socket.username);
                    socket.to(roomName).emit('userLeft', { username: socket.username });
                    broadcastRoomUsers(roomName);
                    if (users.size === 0) {
                        rooms.delete(roomName);
                        io.emit('roomList', Array.from(rooms.keys()));
                    }
                }
            });
            // Broadcast updated total users count
            io.emit('totalUsers', activeUsers.size);
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        if (socket.username) {
            activeUsers.delete(socket.username);
            // Remove user from all rooms
            rooms.forEach((users, roomName) => {
                if (users.has(socket.username)) {
                    users.delete(socket.username);
                    socket.to(roomName).emit('userLeft', { username: socket.username });
                    broadcastRoomUsers(roomName);
                    if (users.size === 0) {
                        rooms.delete(roomName);
                        io.emit('roomList', Array.from(rooms.keys()));
                    }
                }
            });
            // Broadcast updated total users count
            io.emit('totalUsers', activeUsers.size);
        }
    });
});

// Start server
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Available rooms:', Array.from(rooms.keys()));
}); 