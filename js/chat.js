// chat.js
(function() {
    let lastMessageId = 0;
    let pollInterval = null;
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('chat-send-btn');

    function appendMessage(msg) {
        const div = document.createElement('div');
        div.className = 'chat-message';
        const avatarUrl = (msg.avatar && msg.avatar !== 'default.png') ? '/uploads/avatars/' + msg.avatar : null;
        const avatarHtml = avatarUrl ? `<img class="avatar" src="${avatarUrl}" alt="" />` : `<div class="avatar" style="display:flex;align-items:center;justify-content:center;font-size:18px;color:#666;">👤</div>`;
        div.innerHTML = `
        ${avatarHtml}
        <div class="msg-content">
        <span class="user">${msg.username}</span>
        <span class="time">${new Date(msg.timestamp * 1000).toLocaleTimeString()}</span>
        <div class="text">${msg.message}</div>
        </div>
        `;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function pollMessages() {
        if (!window.Auth.currentUser()) return;
        fetch('/api/chat.php?since=' + lastMessageId)
        .then(res => res.json())
        .then(messages => {
            if (messages.length) {
                messages.forEach(msg => {
                    if (msg.user_id !== window.Auth.currentUser().id) {
                        Utils.playNotificationSound();
                    }
                    appendMessage(msg);
                    if (msg.id > lastMessageId) lastMessageId = msg.id;
                });
            }
        })
        .catch(console.warn);
    }

    function startPolling() {
        if (pollInterval) clearInterval(pollInterval);
        fetch('/api/chat.php?since=0')
        .then(res => res.json())
        .then(messages => {
            chatMessages.innerHTML = '';
            messages.forEach(msg => {
                appendMessage(msg);
                if (msg.id > lastMessageId) lastMessageId = msg.id;
            });
        })
        .catch(console.warn);
        pollInterval = setInterval(pollMessages, 3000);
    }

    function stopPolling() {
        if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
    }

    function sendMessage(text) {
        if (!window.Auth.currentUser()) return;
        fetch('/api/chat.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        })
        .then(res => res.json())
        .then(msg => {
            if (msg.id) {
                appendMessage(msg);
                if (msg.id > lastMessageId) lastMessageId = msg.id;
                chatInput.value = '';
            } else {
                alert('Ошибка отправки');
            }
        })
        .catch(console.warn);
    }

    chatSendBtn.addEventListener('click', function() {
        const text = chatInput.value.trim();
        if (text) sendMessage(text);
    });
        chatInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const text = chatInput.value.trim();
                if (text) sendMessage(text);
            }
        });

        window.Chat = {
            startPolling: startPolling,
            stopPolling: stopPolling,
            sendMessage: sendMessage
        };
})();
