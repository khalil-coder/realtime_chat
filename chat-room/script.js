import { fetcherClient, Auth, clientResourceGetter, setError, getCurrentUser } from "../fetcher.js"
import { popToast, wsChatGroupConnection } from '../utils.js'
function initPage() {
    let chatRoomID = window.location.hash
    if (!chatRoomID || typeof chatRoomID !== 'string') {
        window.location.href = "/"
    }
    chatRoomID = chatRoomID.substring(1)

    if (!Auth.get("auth_token") && !Auth.get('refresh'))
        window.location.href = '/auth/login'
    return chatRoomID
}


const refreshBtn = document.getElementById('refresh-btn');



async function initWs() {
    const chatRoomID = initPage()
    // State Management
    const messagesList = document.getElementById('messages-list');
    const errorMsgContainer = document.getElementById('smth-went-wrong');
    const errorMsg = document.getElementById('error-msg');
    const appContainer = document.getElementById('app-container');
    const chatForm = document.getElementById('chat-form');
    const activeChatGroupName = document.getElementById('active-chat-name');
    const msgInput = document.getElementById('msg-input');
    const viewport = document.getElementById('message-viewport');

    function renderMessage(msg, prepend = false) {
        const html = msg.type === "action" ? `
        <p style="text-align: center; color: grey;">${msg.content}</p>
        ` : `
        <div class="msg-row ${msg.type}">
            <div class="bubble">
                ${msg.type === 'in' ? `<small style="display:block; font-weight:600; margin-bottom:4px;">${msg.sender}</small>` : ''}
                ${msg.content}
                <small style="display:block; text-align:right; font-size:0.7rem; opacity:0.7; margin-top:4px;">${msg.time}</small>
            </div>
        </div>
    `;
        if (prepend) {
            messagesList.insertAdjacentHTML('afterbegin', html);
        } else {
            messagesList.insertAdjacentHTML('beforeend', html);
        }
    }

    async function getChatRoom(chatRoomID) {
        return clientResourceGetter(`one-to-one-chat/${chatRoomID}`, { requireAuth: true })
    }
    async function loadPastMessages(messages, user_short_id) {
        if (typeof messages !== "object") return
        if (messages?.length === 0) {
            messagesList.insertAdjacentHTML('afterbegin', `<i style="text-align:center; transform: translateY(500%)">Start new conversation 💬👤</i>`);
            return
        }
        messages.map((m) => {
            const msgData = {
                id: Date.now(m.created_at),
                content: m.content,
                type: m.type === "action" ? m.type : (m.sender_short_id === user_short_id ? "out" : "in"),
                sender: `${m.sender_first_name} ${m.sender_last_name} (${m.sender_username})`,
                time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            renderMessage(msgData)
        })
    }

    // Get chat room
    const room = await getChatRoom(chatRoomID)
    const statusCode = room.statusCode
    if (!room || statusCode) {
        appContainer.style.display = "none"
        errorMsgContainer.removeAttribute('hidden')

        if (statusCode === 404) {
            setError(errorMsg, "Chat room does not exist")
            refreshBtn.setAttribute("hidden", "hidden")
        }

        if (statusCode === 403) {
            setError(errorMsg, "Access denied. You are not allowed to access this chat room.")
            refreshBtn.setAttribute("hidden", true)
        }
        return
    } else {
        appContainer.style.display = "flex"
        errorMsgContainer.style.display = "none"
    }

    // Get current user
    const user = await getCurrentUser()
    // Set chat group name
    activeChatGroupName.textContent = user.short_id === room.user1 ? room.user2_name : room.user1_name






    async function sendMessage(content) {
        await fetcherClient(`one-to-one-chat/${chatRoomID}/create_chat_room_message/`, {
            requireAuth: true, method: "POST", body: JSON.stringify({ content })
        })

    }

    // Fetch group messages
    const messages = await clientResourceGetter(`one-to-one-chat/${chatRoomID}/chat_room_messages`)
    await loadPastMessages(messages, user.short_id)
    viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });


    // 3. UI Interactions
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!msgInput.value.trim()) return;
        sendMessage(msgInput.value);
        msgInput.value = '';
    });






    const ws = await wsChatGroupConnection(chatRoomID, "chat_room")
    ws.onmessage = function (event) {
        const data = JSON.parse(event.data);
        console.log(data)
        const msgData = {
            id: Date.now(),
            content: data.content,
            type: data.sender_id === user.short_id ? "out" : "in",
            sender: `${data.sender} (${data.sender_username})`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        renderMessage(msgData);
        // Scroll to bottom
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
        // console.log("New data:", data);
    };
    ws.onopen = function (event) {
        console.log("WebSocket connection established.");
    };
}

window.onload = initWs

refreshBtn.onclick = initWs