// Initialize Socket.IO connection
const socket = io('http://localhost:3000');

// DOM Elements
const authModal = document.getElementById('auth-modal');
const chatContainer = document.getElementById('chat-container');
const authForm = document.getElementById('auth-form');
const usernameInput = document.getElementById('username');
const currentUserSpan = document.getElementById('current-user');
const logoutBtn = document.getElementById('logout-btn');
const roomsList = document.getElementById('rooms-list');
const createRoomForm = document.getElementById('create-room-form');
const newRoomInput = document.getElementById('new-room-name');
const currentRoomHeading = document.getElementById('current-room');
const messagesContainer = document.getElementById('messages');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const sendButton = messageForm.querySelector('button[type="submit"]');
const formatButtons = document.querySelectorAll('.format-btn');

// Theme Management
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = themeToggle.querySelector('i');

// Check for saved theme preference
const savedTheme = localStorage.getItem('theme') || 'light';
document.body.setAttribute('data-theme', savedTheme);
updateThemeIcon(savedTheme);

// Theme toggle click handler
themeToggle.addEventListener('click', () => {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
});

function updateThemeIcon(theme) {
    themeIcon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
}

// State
let currentUser = null;
let currentRoom = null;
let rooms = new Set();
let roomUserCounts = new Map();

// Authentication
authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = usernameInput.value.trim();
    console.log('Attempting to authenticate with username:', username);
    
    if (username) {
        socket.emit('authenticate', { username }, (response) => {
            console.log('Authentication response:', response);
            if (response.success) {
                currentUser = username;
                currentUserSpan.innerHTML = `<i class="fas fa-user"></i> ${username}`;
                authModal.classList.add('hidden');
                chatContainer.classList.remove('hidden');
                messageInput.disabled = false;
                sendButton.disabled = false;
                console.log('Successfully authenticated and joined chat');
            } else {
                console.log('Authentication failed - username taken');
                alert('Username is already taken. Please choose another one.');
            }
        });
    }
});

// Logout
logoutBtn.addEventListener('click', () => {
    socket.emit('logout');
    currentUser = null;
    currentRoom = null;
    rooms.clear();
    roomUserCounts.clear();
    roomsList.innerHTML = '';
    messagesContainer.innerHTML = '';
    currentRoomHeading.innerHTML = '<i class="fas fa-hashtag"></i> Select a Room';
    messageInput.disabled = true;
    sendButton.disabled = true;
    chatContainer.classList.add('hidden');
    authModal.classList.remove('hidden');
    usernameInput.value = '';
});

// Room Management
createRoomForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const roomName = newRoomInput.value.trim();
    if (roomName && !rooms.has(roomName)) {
        socket.emit('createRoom', { roomName });
        newRoomInput.value = '';
    }
});

// Mobile Navigation
const mobileNavToggle = document.getElementById('mobile-nav-toggle');
const sidebar = document.querySelector('.sidebar');
const chatMain = document.querySelector('.chat-main');

mobileNavToggle.addEventListener('click', () => {
    sidebar.classList.toggle('active');
    mobileNavToggle.querySelector('i').classList.toggle('fa-bars');
    mobileNavToggle.querySelector('i').classList.toggle('fa-times');
});

// Close sidebar when clicking outside on mobile
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 && 
        !sidebar.contains(e.target) && 
        !mobileNavToggle.contains(e.target) && 
        sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
        mobileNavToggle.querySelector('i').classList.add('fa-bars');
        mobileNavToggle.querySelector('i').classList.remove('fa-times');
    }
});

// Handle window resize
window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        sidebar.classList.remove('active');
        mobileNavToggle.querySelector('i').classList.add('fa-bars');
        mobileNavToggle.querySelector('i').classList.remove('fa-times');
    }
});

// Close sidebar when joining a room on mobile
function joinRoom(roomName) {
    if (currentRoom) {
        socket.emit('leaveRoom', { roomName: currentRoom });
    }
    currentRoom = roomName;
    currentRoomHeading.innerHTML = `<i class="fas fa-hashtag"></i> ${roomName} <span class="user-count">(${roomUserCounts.get(roomName) || 0} users)</span>`;
    messagesContainer.innerHTML = '';
    socket.emit('joinRoom', { roomName });
    
    // Close sidebar on mobile after joining room
    if (window.innerWidth <= 768) {
        sidebar.classList.remove('active');
        mobileNavToggle.querySelector('i').classList.add('fa-bars');
        mobileNavToggle.querySelector('i').classList.remove('fa-times');
    }
}

// Message Handling
messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const message = messageInput.value.trim();
    if (message && currentRoom) {
        socket.emit('message', {
            room: currentRoom,
            message,
            username: currentUser
        });
        messageInput.value = '';
    }
});

// Prevent Enter key from triggering file manager
messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        messageForm.dispatchEvent(new Event('submit'));
    }
});

// Text Formatting
formatButtons.forEach(button => {
    button.addEventListener('click', () => {
        const format = button.dataset.format;
        const start = messageInput.selectionStart;
        const end = messageInput.selectionEnd;
        const text = messageInput.value;
        let formattedText = '';

        switch (format) {
            case 'bold':
                formattedText = `**${text.substring(start, end)}**`;
                break;
            case 'italic':
                formattedText = `*${text.substring(start, end)}*`;
                break;
            case 'link':
                const url = prompt('Enter URL:');
                if (url) {
                    formattedText = `[${text.substring(start, end)}](${url})`;
                }
                break;
        }

        if (formattedText) {
            messageInput.value = text.substring(0, start) + formattedText + text.substring(end);
            messageInput.focus();
            messageInput.setSelectionRange(start + formattedText.length, start + formattedText.length);
        }
    });
});

// Socket Event Handlers
socket.on('roomList', (roomList) => {
    console.log('Received room list:', roomList);
    rooms = new Set(roomList);
    roomsList.innerHTML = '';
    roomList.forEach(room => {
        const li = document.createElement('li');
        const userCount = roomUserCounts.get(room) || 0;
        li.innerHTML = `
            <span class="room-name">${room}</span>
            <span class="room-users">${userCount} users</span>
        `;
        li.addEventListener('click', () => joinRoom(room));
        roomsList.appendChild(li);
    });
});

socket.on('roomUsersCount', ({ room, count }) => {
    roomUserCounts.set(room, count);
    if (room === currentRoom) {
        currentRoomHeading.innerHTML = `<i class="fas fa-hashtag"></i> ${room} <span class="user-count">(${count} users)</span>`;
    }
    // Update room list
    const roomElement = Array.from(roomsList.children).find(li => li.querySelector('.room-name').textContent === room);
    if (roomElement) {
        roomElement.querySelector('.room-users').textContent = `${count} users`;
    }
});

socket.on('totalUsers', (count) => {
    console.log(`Total users online: ${count}`);
});

socket.on('message', (data) => {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${data.username === currentUser ? 'sent' : 'received'}`;
    
    const messageInfo = document.createElement('div');
    messageInfo.className = 'message-info';
    messageInfo.textContent = `${data.username} • ${new Date(data.timestamp).toLocaleTimeString()}`;
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.innerHTML = formatMessage(data.message);
    
    messageDiv.appendChild(messageInfo);
    messageDiv.appendChild(messageContent);
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
});

socket.on('userJoined', (data) => {
    const notification = document.createElement('div');
    notification.className = 'message system';
    notification.textContent = `${data.username} joined the room`;
    messagesContainer.appendChild(notification);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
});

socket.on('userLeft', (data) => {
    const notification = document.createElement('div');
    notification.className = 'message system';
    notification.textContent = `${data.username} left the room`;
    messagesContainer.appendChild(notification);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
});

// Message Formatting Helper
function formatMessage(message) {
    // Format bold text
    message = message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Format italic text
    message = message.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Format links
    message = message.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');
    return message;
}

// Error Handling
socket.on('error', (error) => {
    console.error('Socket error:', error);
    alert('An error occurred. Please try again.');
});

// Connection Status
socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
    alert('Connection lost. Please refresh the page.');
});

socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
    alert('Failed to connect to the server. Please check if the server is running.');
});

// Mobile Formatting Tools
const formattingTools = document.querySelector('.formatting-tools');
const messageInputContainer = document.querySelector('.message-input-container');

// Toggle formatting tools on mobile
messageInput.addEventListener('focus', () => {
    if (window.innerWidth <= 768) {
        formattingTools.classList.add('active');
    }
});

messageInput.addEventListener('blur', () => {
    if (window.innerWidth <= 768) {
        formattingTools.classList.remove('active');
    }
});

// Handle keyboard on mobile
messageInput.addEventListener('keydown', (e) => {
    if (window.innerWidth <= 768) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            messageForm.dispatchEvent(new Event('submit'));
        }
    }
});

// Swipe gestures for sidebar
let touchStartX = 0;
let touchEndX = 0;

document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
});

document.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
});

function handleSwipe() {
    const swipeThreshold = 50;
    const swipeDistance = touchEndX - touchStartX;

    if (Math.abs(swipeDistance) > swipeThreshold) {
        if (swipeDistance > 0) {
            // Swipe right - open sidebar
            sidebar.classList.add('active');
            mobileNavToggle.querySelector('i').classList.remove('fa-bars');
            mobileNavToggle.querySelector('i').classList.add('fa-times');
        } else {
            // Swipe left - close sidebar
            sidebar.classList.remove('active');
            mobileNavToggle.querySelector('i').classList.add('fa-bars');
            mobileNavToggle.querySelector('i').classList.remove('fa-times');
        }
    }
}

// Pull to refresh functionality
let touchStartY = 0;
let touchEndY = 0;
let isRefreshing = false;

messagesContainer.addEventListener('touchstart', (e) => {
    if (messagesContainer.scrollTop === 0) {
        touchStartY = e.touches[0].clientY;
    }
});

messagesContainer.addEventListener('touchmove', (e) => {
    if (messagesContainer.scrollTop === 0 && !isRefreshing) {
        touchEndY = e.touches[0].clientY;
        const pullDistance = touchEndY - touchStartY;
        
        if (pullDistance > 0) {
            e.preventDefault();
            messagesContainer.style.transform = `translateY(${pullDistance * 0.3}px)`;
        }
    }
});

messagesContainer.addEventListener('touchend', () => {
    if (messagesContainer.scrollTop === 0) {
        const pullDistance = touchEndY - touchStartY;
        
        if (pullDistance > 100) {
            isRefreshing = true;
            messagesContainer.style.transform = 'translateY(50px)';
            
            // Simulate refresh
            setTimeout(() => {
                messagesContainer.style.transform = 'translateY(0)';
                isRefreshing = false;
                // Here you could add actual refresh logic
                socket.emit('refreshMessages', { room: currentRoom });
            }, 1000);
        } else {
            messagesContainer.style.transform = 'translateY(0)';
        }
    }
});

// Handle virtual keyboard on mobile
window.addEventListener('resize', () => {
    if (window.innerWidth <= 768) {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }
});

// Message Reactions
const reactions = ['👍', '❤️', '😂', '😮', '😢', '👏'];
let selectedMessage = null;

// Create reaction picker
function createReactionPicker() {
    const picker = document.createElement('div');
    picker.className = 'reaction-picker';
    reactions.forEach(reaction => {
        const button = document.createElement('button');
        button.className = 'reaction-btn';
        button.textContent = reaction;
        button.addEventListener('click', () => addReaction(reaction));
        picker.appendChild(button);
    });
    return picker;
}

// Add reaction to message
function addReaction(reaction) {
    if (selectedMessage) {
        socket.emit('addReaction', {
            room: currentRoom,
            messageId: selectedMessage.dataset.messageId,
            reaction,
            username: currentUser
        });
        selectedMessage = null;
        document.querySelector('.reaction-picker')?.remove();
    }
}

// Handle message long press
messagesContainer.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const message = e.target.closest('.message');
    if (message && !message.classList.contains('system')) {
        showMessageMenu(e, message);
    }
});

// Handle touch long press
let longPressTimer;
messagesContainer.addEventListener('touchstart', (e) => {
    const message = e.target.closest('.message');
    if (message && !message.classList.contains('system')) {
        longPressTimer = setTimeout(() => {
            showMessageMenu(e, message);
        }, 500);
    }
});

messagesContainer.addEventListener('touchend', () => {
    clearTimeout(longPressTimer);
});

function showMessageMenu(e, message) {
    selectedMessage = message;
    const menu = document.createElement('div');
    menu.className = 'message-menu';
    
    const options = [
        { icon: 'fa-smile', text: 'Add Reaction', action: () => showReactionPicker(e) },
        { icon: 'fa-reply', text: 'Reply', action: () => replyToMessage(message) },
        { icon: 'fa-copy', text: 'Copy', action: () => copyMessage(message) },
        { icon: 'fa-share', text: 'Forward', action: () => forwardMessage(message) },
        { icon: 'fa-thumbtack', text: 'Pin Message', action: () => togglePinMessage(message) },
        { icon: 'fa-language', text: 'Translate', action: () => translateMessage(message) },
        { icon: 'fa-bookmark', text: 'Bookmark', action: () => toggleBookmark(message) },
        { icon: 'fa-tag', text: 'Add Tag', action: () => addTagToMessage(message) },
        { icon: 'fa-share-alt', text: 'Share', action: () => shareMessage(message) },
        { icon: 'fa-bell', text: 'Set Reminder', action: () => setMessageReminder(message) }
    ];

    if (message.classList.contains('sent')) {
        options.push(
            { icon: 'fa-edit', text: 'Edit', action: () => editMessage(message) },
            { icon: 'fa-trash', text: 'Delete', action: () => deleteMessage(message) }
        );
    }

    options.forEach(option => {
        const button = document.createElement('button');
        button.innerHTML = `<i class="fas ${option.icon}"></i> ${option.text}`;
        button.addEventListener('click', () => {
            option.action();
            menu.remove();
        });
        menu.appendChild(button);
    });

    document.body.appendChild(menu);
    positionMenu(menu, e);
}

function positionMenu(menu, e) {
    const rect = menu.getBoundingClientRect();
    const x = e.clientX || e.touches[0].clientX;
    const y = e.clientY || e.touches[0].clientY;
    
    menu.style.left = `${Math.min(x, window.innerWidth - rect.width)}px`;
    menu.style.top = `${Math.min(y, window.innerHeight - rect.height)}px`;
}

function showReactionPicker(e) {
    const picker = createReactionPicker();
    document.body.appendChild(picker);
    positionMenu(picker, e);
}

// Image Sharing
const imageInput = document.createElement('input');
imageInput.type = 'file';
imageInput.accept = 'image/*';
imageInput.style.display = 'none';
document.body.appendChild(imageInput);

const imageButton = document.createElement('button');
imageButton.className = 'format-btn';
imageButton.innerHTML = '<i class="fas fa-image"></i>';
imageButton.title = 'Share Image';
imageButton.addEventListener('click', () => imageInput.click());
document.querySelector('.formatting-tools').appendChild(imageButton);

imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            socket.emit('message', {
                room: currentRoom,
                message: `<img src="${event.target.result}" alt="Shared image" class="shared-image">`,
                username: currentUser,
                type: 'image'
            });
        };
        reader.readAsDataURL(file);
    }
});

// Voice Messages
let mediaRecorder;
let audioChunks = [];
let isRecording = false;

const voiceButton = document.createElement('button');
voiceButton.className = 'format-btn';
voiceButton.innerHTML = '<i class="fas fa-microphone"></i>';
voiceButton.title = 'Voice Message';
document.querySelector('.formatting-tools').appendChild(voiceButton);

voiceButton.addEventListener('click', async () => {
    if (!isRecording) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            
            mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.onload = (event) => {
                    socket.emit('message', {
                        room: currentRoom,
                        message: `<audio controls src="${event.target.result}"></audio>`,
                        username: currentUser,
                        type: 'voice'
                    });
                };
                reader.readAsDataURL(audioBlob);
            };
            
            mediaRecorder.start();
            isRecording = true;
            voiceButton.classList.add('recording');
        } catch (err) {
            console.error('Error accessing microphone:', err);
            alert('Could not access microphone');
        }
    } else {
        mediaRecorder.stop();
        isRecording = false;
        voiceButton.classList.remove('recording');
    }
});

// Offline Support
window.addEventListener('online', () => {
    socket.connect();
    showNotification('Back online');
});

window.addEventListener('offline', () => {
    socket.disconnect();
    showNotification('You are offline');
});

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Socket event handlers for new features
socket.on('reaction', (data) => {
    const message = document.querySelector(`[data-message-id="${data.messageId}"]`);
    if (message) {
        let reactionsDiv = message.querySelector('.message-reactions');
        if (!reactionsDiv) {
            reactionsDiv = document.createElement('div');
            reactionsDiv.className = 'message-reactions';
            message.appendChild(reactionsDiv);
        }
        
        const reaction = document.createElement('span');
        reaction.className = 'reaction';
        reaction.textContent = `${data.reaction} ${data.count}`;
        reactionsDiv.appendChild(reaction);
    }
});

// Message Search
const searchButton = document.createElement('button');
searchButton.className = 'format-btn';
searchButton.innerHTML = '<i class="fas fa-search"></i>';
searchButton.title = 'Search Messages';
document.querySelector('.formatting-tools').appendChild(searchButton);

const searchOverlay = document.createElement('div');
searchOverlay.className = 'search-overlay hidden';
searchOverlay.innerHTML = `
    <div class="search-container">
        <input type="text" placeholder="Search messages..." class="search-input">
        <div class="search-results"></div>
    </div>
`;
document.body.appendChild(searchOverlay);

searchButton.addEventListener('click', () => {
    searchOverlay.classList.remove('hidden');
    searchOverlay.querySelector('input').focus();
});

searchOverlay.addEventListener('click', (e) => {
    if (e.target === searchOverlay) {
        searchOverlay.classList.add('hidden');
    }
});

let searchTimeout;
searchOverlay.querySelector('input').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        const query = e.target.value.trim();
        if (query) {
            socket.emit('searchMessages', { room: currentRoom, query });
        }
    }, 300);
});

socket.on('searchResults', (results) => {
    const resultsContainer = searchOverlay.querySelector('.search-results');
    resultsContainer.innerHTML = '';
    
    results.forEach(result => {
        const div = document.createElement('div');
        div.className = 'search-result';
        div.innerHTML = `
            <div class="search-result-info">
                <span class="search-result-user">${result.username}</span>
                <span class="search-result-time">${new Date(result.timestamp).toLocaleString()}</span>
            </div>
            <div class="search-result-content">${formatMessage(result.message)}</div>
        `;
        div.addEventListener('click', () => {
            scrollToMessage(result.id);
            searchOverlay.classList.add('hidden');
        });
        resultsContainer.appendChild(div);
    });
});

// Message Forwarding
function forwardMessage(message) {
    const rooms = Array.from(document.querySelectorAll('#rooms-list li'));
    const menu = document.createElement('div');
    menu.className = 'forward-menu';
    menu.innerHTML = '<h3>Forward to:</h3>';
    
    rooms.forEach(room => {
        if (room.textContent !== currentRoom) {
            const button = document.createElement('button');
            button.textContent = room.textContent;
            button.addEventListener('click', () => {
                socket.emit('forwardMessage', {
                    messageId: message.dataset.messageId,
                    fromRoom: currentRoom,
                    toRoom: room.textContent
                });
                menu.remove();
            });
            menu.appendChild(button);
        }
    });
    
    document.body.appendChild(menu);
    positionMenu(menu, { clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 });
}

// Message Pinning
let pinnedMessages = new Set();

function togglePinMessage(message) {
    const messageId = message.dataset.messageId;
    if (pinnedMessages.has(messageId)) {
        pinnedMessages.delete(messageId);
        message.classList.remove('pinned');
    } else {
        pinnedMessages.add(messageId);
        message.classList.add('pinned');
        socket.emit('pinMessage', { room: currentRoom, messageId });
    }
}

socket.on('messagePinned', (data) => {
    const message = document.querySelector(`[data-message-id="${data.messageId}"]`);
    if (message) {
        message.classList.add('pinned');
        pinnedMessages.add(data.messageId);
    }
});

// Read Receipts
let lastReadMessage = null;

function updateReadReceipt(message) {
    if (message && message !== lastReadMessage) {
        lastReadMessage = message;
        socket.emit('messageRead', {
            room: currentRoom,
            messageId: message.dataset.messageId
        });
    }
}

socket.on('messageRead', (data) => {
    const message = document.querySelector(`[data-message-id="${data.messageId}"]`);
    if (message) {
        const readBy = message.querySelector('.read-by') || document.createElement('div');
        readBy.className = 'read-by';
        readBy.textContent = `Read by ${data.username}`;
        message.appendChild(readBy);
    }
});

// Typing Indicators
let typingTimeout;

messageInput.addEventListener('input', () => {
    socket.emit('typing', { room: currentRoom, username: currentUser });
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        socket.emit('stopTyping', { room: currentRoom, username: currentUser });
    }, 1000);
});

socket.on('userTyping', (data) => {
    if (data.username !== currentUser) {
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'typing-indicator';
        typingIndicator.textContent = `${data.username} is typing...`;
        messagesContainer.appendChild(typingIndicator);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        setTimeout(() => {
            typingIndicator.remove();
        }, 3000);
    }
});

// Message Translation
const translateButton = document.createElement('button');
translateButton.className = 'format-btn';
translateButton.innerHTML = '<i class="fas fa-language"></i>';
translateButton.title = 'Translate Message';
document.querySelector('.formatting-tools').appendChild(translateButton);

function translateMessage(message) {
    const originalText = message.querySelector('.message-content').textContent;
    socket.emit('translateMessage', {
        room: currentRoom,
        messageId: message.dataset.messageId,
        text: originalText
    });
}

socket.on('messageTranslated', (data) => {
    const message = document.querySelector(`[data-message-id="${data.messageId}"]`);
    if (message) {
        const translation = document.createElement('div');
        translation.className = 'message-translation';
        translation.innerHTML = `
            <div class="translation-header">Translated to ${data.language}</div>
            <div class="translation-content">${data.translatedText}</div>
        `;
        message.appendChild(translation);
    }
});

// Message Scheduling
const scheduleButton = document.createElement('button');
scheduleButton.className = 'format-btn';
scheduleButton.innerHTML = '<i class="fas fa-clock"></i>';
scheduleButton.title = 'Schedule Message';
document.querySelector('.formatting-tools').appendChild(scheduleButton);

function scheduleMessage() {
    const message = messageInput.value.trim();
    if (!message) return;

    const scheduleOverlay = document.createElement('div');
    scheduleOverlay.className = 'schedule-overlay';
    scheduleOverlay.innerHTML = `
        <div class="schedule-container">
            <h3>Schedule Message</h3>
            <input type="datetime-local" class="schedule-time">
            <div class="schedule-actions">
                <button class="cancel-btn">Cancel</button>
                <button class="schedule-btn">Schedule</button>
            </div>
        </div>
    `;

    document.body.appendChild(scheduleOverlay);
    const timeInput = scheduleOverlay.querySelector('.schedule-time');
    timeInput.min = new Date().toISOString().slice(0, 16);

    scheduleOverlay.querySelector('.cancel-btn').addEventListener('click', () => {
        scheduleOverlay.remove();
    });

    scheduleOverlay.querySelector('.schedule-btn').addEventListener('click', () => {
        const scheduledTime = new Date(timeInput.value);
        socket.emit('scheduleMessage', {
            room: currentRoom,
            message,
            scheduledTime,
            username: currentUser
        });
        messageInput.value = '';
        scheduleOverlay.remove();
    });
}

scheduleButton.addEventListener('click', scheduleMessage);

// Message Reminders
function setMessageReminder(message) {
    const reminderOverlay = document.createElement('div');
    reminderOverlay.className = 'reminder-overlay';
    reminderOverlay.innerHTML = `
        <div class="reminder-container">
            <h3>Set Reminder</h3>
            <input type="datetime-local" class="reminder-time">
            <div class="reminder-actions">
                <button class="cancel-btn">Cancel</button>
                <button class="reminder-btn">Set Reminder</button>
            </div>
        </div>
    `;

    document.body.appendChild(reminderOverlay);
    const timeInput = reminderOverlay.querySelector('.reminder-time');
    timeInput.min = new Date().toISOString().slice(0, 16);

    reminderOverlay.querySelector('.cancel-btn').addEventListener('click', () => {
        reminderOverlay.remove();
    });

    reminderOverlay.querySelector('.reminder-btn').addEventListener('click', () => {
        const reminderTime = new Date(timeInput.value);
        socket.emit('setReminder', {
            room: currentRoom,
            messageId: message.dataset.messageId,
            reminderTime,
            username: currentUser
        });
        reminderOverlay.remove();
    });
}

// Message Bookmarking
let bookmarkedMessages = new Set();

function toggleBookmark(message) {
    const messageId = message.dataset.messageId;
    if (bookmarkedMessages.has(messageId)) {
        bookmarkedMessages.delete(messageId);
        message.classList.remove('bookmarked');
    } else {
        bookmarkedMessages.add(messageId);
        message.classList.add('bookmarked');
        socket.emit('bookmarkMessage', { room: currentRoom, messageId });
    }
}

// Message Categories/Tags
const tagButton = document.createElement('button');
tagButton.className = 'format-btn';
tagButton.innerHTML = '<i class="fas fa-tag"></i>';
tagButton.title = 'Add Tag';
document.querySelector('.formatting-tools').appendChild(tagButton);

function addTagToMessage(message) {
    const tagOverlay = document.createElement('div');
    tagOverlay.className = 'tag-overlay';
    tagOverlay.innerHTML = `
        <div class="tag-container">
            <h3>Add Tag</h3>
            <input type="text" class="tag-input" placeholder="Enter tag">
            <div class="tag-actions">
                <button class="cancel-btn">Cancel</button>
                <button class="tag-btn">Add Tag</button>
            </div>
        </div>
    `;

    document.body.appendChild(tagOverlay);

    tagOverlay.querySelector('.cancel-btn').addEventListener('click', () => {
        tagOverlay.remove();
    });

    tagOverlay.querySelector('.tag-btn').addEventListener('click', () => {
        const tag = tagOverlay.querySelector('.tag-input').value.trim();
        if (tag) {
            socket.emit('addTag', {
                room: currentRoom,
                messageId: message.dataset.messageId,
                tag
            });
            tagOverlay.remove();
        }
    });
}

// Message Sharing
function shareMessage(message) {
    if (navigator.share) {
        const messageContent = message.querySelector('.message-content').textContent;
        const messageInfo = message.querySelector('.message-info').textContent;
        
        navigator.share({
            title: 'Shared Message',
            text: `${messageInfo}\n${messageContent}`,
            url: window.location.href
        }).catch(console.error);
    } else {
        // Fallback for browsers that don't support Web Share API
        const text = message.querySelector('.message-content').textContent;
        navigator.clipboard.writeText(text).then(() => {
            showNotification('Message copied to clipboard');
        });
    }
}

// Message Export
const exportButton = document.createElement('button');
exportButton.className = 'format-btn';
exportButton.innerHTML = '<i class="fas fa-download"></i>';
exportButton.title = 'Export Messages';
document.querySelector('.formatting-tools').appendChild(exportButton);

function exportMessages() {
    const messages = Array.from(document.querySelectorAll('.message:not(.system)'));
    const exportData = messages.map(message => ({
        username: message.querySelector('.message-info').textContent.split('•')[0].trim(),
        timestamp: message.querySelector('.message-info').textContent.split('•')[1].trim(),
        content: message.querySelector('.message-content').textContent,
        tags: Array.from(message.querySelectorAll('.message-tag')).map(tag => tag.textContent)
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-export-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

exportButton.addEventListener('click', exportMessages);

// Socket event handlers for new features
socket.on('messageScheduled', (data) => {
    showNotification(`Message scheduled for ${new Date(data.scheduledTime).toLocaleString()}`);
});

socket.on('reminderSet', (data) => {
    showNotification(`Reminder set for ${new Date(data.reminderTime).toLocaleString()}`);
});

socket.on('messageBookmarked', (data) => {
    const message = document.querySelector(`[data-message-id="${data.messageId}"]`);
    if (message) {
        message.classList.add('bookmarked');
        bookmarkedMessages.add(data.messageId);
    }
});

socket.on('tagAdded', (data) => {
    const message = document.querySelector(`[data-message-id="${data.messageId}"]`);
    if (message) {
        const tag = document.createElement('span');
        tag.className = 'message-tag';
        tag.textContent = data.tag;
        message.appendChild(tag);
    }
}); 