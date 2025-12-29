import { SUPABASE_URL, SUPABASE_ANON_KEY, N8N_WEBHOOK_URL, FAMILY_PASSWORD_ENCRYPTED, ADMIN_USERNAME } from './config.js';

// Initialize Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Configuration ---
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB Limit (Adjust this number if needed)

// State
let currentUser = JSON.parse(localStorage.getItem('rayaduvamsam_user')) || null;

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const messagesList = document.getElementById('messages-list');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const mediaInput = document.getElementById('media-upload');
const uploadProgress = document.getElementById('upload-progress');
const displayNameInput = document.getElementById('display-name');
const passwordInput = document.getElementById('family-password');
const chatHeaderTitle = document.querySelector('.header-info h2');

// --- Authentication Logic ---

function verifyPassword(inputPassword) {
    try {
        const bytes = CryptoJS.AES.decrypt(FAMILY_PASSWORD_ENCRYPTED, inputPassword);
        const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
        return decryptedData === inputPassword;
    } catch (e) {
        return false;
    }
}

async function handleLogin(e) {
    e.preventDefault();
    loginError.textContent = '';

    const name = displayNameInput.value.trim();
    const password = passwordInput.value;

    if (!name || !password) {
        loginError.textContent = 'Please fill in all fields.';
        return;
    }

    if (verifyPassword(password)) {
        currentUser = { name, joinedAt: new Date().toISOString() };
        currentUser.isAdmin = (name === ADMIN_USERNAME);
        localStorage.setItem('rayaduvamsam_user', JSON.stringify(currentUser));
        showChat();
    } else {
        loginError.textContent = 'Incorrect family password.';
        passwordInput.value = '';
    }
}

function handleLogout() {
    localStorage.removeItem('rayaduvamsam_user');
    currentUser = null;
    window.location.reload();
}

function showChat() {
    loginScreen.classList.remove('active');
    chatScreen.classList.add('active');

    const adminBadge = currentUser.isAdmin ? ' (Admin)' : '';
    chatHeaderTitle.textContent = `Rayaduvamsam | ${currentUser.name}${adminBadge}`;

    // --- NEW: Request Notification Permission ---
    if ('Notification' in window && Notification.permission !== 'granted') {
        Notification.requestPermission();
    }

    initializeChat();
}

// --- Chat Logic ---

async function initializeChat() {
    await fetchMessages();
    subscribeToMessages();
    window.scrollToBottom();
}

async function fetchMessages() {
    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(100);

    if (error) {
        console.error('Error fetching messages:', error);
        return;
    }

    messagesList.innerHTML = '<div class="message-date-divider">Start of conversation</div>';
    data.forEach(msg => renderMessage(msg));
}

function subscribeToMessages() {
    const channel = supabase
        .channel('public:messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
            renderMessage(payload.new);
            window.scrollToBottom();
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (payload) => {
            removeMessageFromDOM(payload.old.id);
        })
        .subscribe();
}

function renderMessage(msg) {
    if (document.getElementById(`msg-${msg.id}`)) return;

    const isMe = msg.sender_name === currentUser.name;
    const canDelete = isMe || (currentUser && currentUser.isAdmin);

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isMe ? 'mine' : 'theirs'}`;
    messageDiv.id = `msg-${msg.id}`;

    const date = new Date(msg.created_at);
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let contentHtml = '';

    if (msg.message_type === 'text') {
        contentHtml = escapeHtml(msg.content);

    } else if (msg.message_type === 'image') {
        contentHtml = `
            <div class="message-media" style="border-radius: 12px; overflow: hidden; cursor: pointer;">
                <img 
                    src="${msg.content}" 
                    alt="Image" 
                    loading="lazy" 
                    referrerpolicy="no-referrer"
                    onload="window.scrollToBottom()"
                    onclick="window.open(this.src, '_blank')"
                    style="width: 100%; display: block;">
            </div>`;

    } else if (msg.message_type === 'video') {
        contentHtml = `
            <div class="message-media" style="max-width: 320px; border-radius: 12px; overflow: hidden; background: #000;">
                <video 
                    src="${msg.content}" 
                    controls 
                    playsinline 
                    preload="metadata"
                    referrerpolicy="no-referrer"
                    onloadedmetadata="window.scrollToBottom()"
                    style="width: 100%; display: block; aspect-ratio: 16/9;">
                </video>
            </div>`;
    }

    const deleteBtn = canDelete ? `<button class="delete-msg-btn" onclick="window.deleteMessage('${msg.id}')"><i class="ri-delete-bin-line"></i></button>` : '';

    messageDiv.innerHTML = `
        <div class="message-sender">${escapeHtml(msg.sender_name)}</div>
        <div class="message-bubble">
            ${contentHtml}
            <div class="message-footer">
                <span class="message-time">${timeStr}</span>
                ${deleteBtn}
            </div>
        </div>
    `;

    messagesList.appendChild(messageDiv);
    // --- NEW: Send Notification if tab is hidden ---
    // Only notify if:
    // 1. It's not my own message
    // 2. The tab is hidden/minimized
    // 3. We have permission
    if (!isMe && document.hidden && Notification.permission === "granted") {
        const title = `New message from ${msg.sender_name}`;
        const body = msg.message_type === 'text' ? msg.content : `Sent a ${msg.message_type}`;

        const notification = new Notification(title, {
            body: body,
            // You can add an icon here if you have one in your project folder
            // icon: 'icon.png' 
        });

        // Clicking the notification brings the user back to the chat window
        notification.onclick = function () {
            window.focus();
            notification.close();
        };
    }

}

function removeMessageFromDOM(id) {
    const el = document.getElementById(`msg-${id}`);
    if (el) {
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 300);
    }
}

window.deleteMessage = async function (id) {
    if (!confirm('Delete this message?')) return;
    removeMessageFromDOM(id);
    await supabase.from('messages').delete().eq('id', id);
};

async function handleSendMessage(e) {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (!text) return;

    messageInput.value = '';

    const { data, error } = await supabase
        .from('messages')
        .insert({ sender_name: currentUser.name, content: text, message_type: 'text' })
        .select()
        .single();

    if (data) {
        renderMessage(data);
        window.scrollToBottom();
    }
}

async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    // --- NEW: Check File Size ---
    if (file.size > MAX_FILE_SIZE) {
        alert(`File too large! Please upload files smaller than ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
        mediaInput.value = ''; // Reset the input so they can try again
        return;
    }

    if (N8N_WEBHOOK_URL.includes('YOUR_N8N')) {
        alert('Please configure N8N_WEBHOOK_URL in config.js');
        mediaInput.value = '';
        return;
    }

    uploadProgress.classList.remove('hidden');

    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('filename', file.name);
        formData.append('mimeType', file.type);
        formData.append('sender', currentUser.name);

        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('Upload failed');

        const result = await response.json();

        if (!result.link) throw new Error('No link returned from webhook');

        const type = file.type.startsWith('video/') ? 'video' : 'image';

        const { data, error } = await supabase
            .from('messages')
            .insert({
                sender_name: currentUser.name,
                content: result.link,
                message_type: type
            })
            .select()
            .single();

        if (error) throw error;

        if (data) {
            renderMessage(data);
            window.scrollToBottom();
        }

    } catch (err) {
        console.error('File upload error:', err);
        alert('Failed to upload file. ' + err.message);
    } finally {
        uploadProgress.classList.add('hidden');
        mediaInput.value = '';
    }
}

window.scrollToBottom = function () {
    const chatContainer = document.querySelector('.chat-container');
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// --- Initialization ---

if (currentUser) {
    currentUser.isAdmin = (currentUser.name === ADMIN_USERNAME);
    showChat();
} else {
    loginScreen.classList.add('active');
}

loginForm.addEventListener('submit', handleLogin);
logoutBtn.addEventListener('click', handleLogout);
messageForm.addEventListener('submit', handleSendMessage);
mediaInput.addEventListener('change', handleFileUpload);