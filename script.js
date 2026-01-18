import { fetcherClient, getCurrentUser, Auth, clientResourceGetter } from './fetcher.js'
import { wsHomePageChatGroupConnectionHandler, wsChatGroupConnection } from "./utils.js"
import { popToast } from "./utils.js"
if (!Auth.get("auth_token") && !Auth.get('refresh'))
    window.location.href = '/auth/login'


const optionsCard = document.querySelector('.options-card');
const options = document.querySelector('.options');
const chatList = document.querySelector('#chat-list');
const createGroup = document.getElementById('create-group');
const roomTabBtn = document.querySelector('#room-tab-btn')
const groupTabBtn = document.querySelector('#group-tab-btn')
const CACHES = { "groups": [], "rooms": [] }



function showOptionCard(optionsCard, options, headingText) {
    optionsCard.style.display = 'block'
    const heading = `
            <div style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: start">
            <h4>${headingText}</h4>
            <button id="close-card" style="border: none; padding: 5px; background: transparent;">X</button>
            </div>
            `
    options.insertAdjacentHTML("afterbegin", heading)

    //  Close options card
    document.getElementById('close-card').onclick = () => {
        optionsCard.style.display = 'none'
        options.innerHTML = ''
    }
}


async function newChatGroup(name, description) {
    const res = await fetcherClient(`chat-group`, { method: "POST", body: JSON.stringify({ name, description }), requireAuth: true })
    if (!res) {
        popToast("error", "Something went wrong. Please try again")
    }
    if (res.ok) {
        popToast("success", "You added a new group")
        const groupID = (await res.json()).short_id
        window.location.href = location.href + "chat-group/#" + groupID
    } else {
        try {
            const d = await res.json()
            popToast('error', d.name || d.description || d.detail || d.non_field_errors || res.statusText)
        } catch {
            popToast('error', res.statusText)
        }
    }
}
function newGroupHandler(optionsCard, options) {
    showOptionCard(optionsCard, options, "Create New Group")
    const html = `
            <form id="add-group-form" style="display: grid; gap: 8px">
                <div style="width: 100%">
                    <input style="width: 100%; padding: 5px"
                        required
                        type="text"
                        id="group-name"
                        placeholder="Name"
                        />
                    </div>
                    <div>
                        <textarea
                        rows=8
                        style="width: 100%; padding: 5px"
                            required
                            id="group-description"
                            placeholder="Description"
                        ></textarea>
                    </div>
                    <button type="submit">Create</button>
                </form>
            `
    options.insertAdjacentHTML('beforeend', html)
    document.querySelector("#add-group-form").addEventListener("submit", (e) => {
        e.preventDefault()
        const groupName = document.querySelector("#group-name").value
        const groupDescription = document.querySelector("#group-description").value
        newChatGroup(groupName.trim(), groupDescription.trim())
    })
}
function chatItemTemplate(item, user, hasNewMsg) {
    if (!item || typeof item !== "object")
        return
    const itemID = item.short_id
    const navigateTo = item.user1 ? "/chat-room/" : "/chat-group/"
    const html = `<a id='${itemID}-href' style="text-decoration:none" href=${navigateTo + '#' + itemID}>
                <div class="chat-row active" data-name="Dev Team" data-status="Online">
                    <div class="avatar group-icon">${item.user1 ? "👤" : "👥"}</div>
                        <div class="chat-details">
                            <div class="chat-top">
                            <span class="chat-name">${item.name || (item.user1 === user.short_id ? item.user2_name : item.user1_name)}</span>
                            <span class="chat-time">${item.sent_at ? new Date(item.sent_at).toLocaleString() : new Date(item.created_at).toLocaleString()}</span>
                        </div>
                        <div class="chat-bottom">
                        <div>
                            <span  id='${itemID}_last_msg'>
                            ${item.sender_short_id === user.short_id ? "You:" : item.sender ? (item.sender + ":") : ""}
                            ${item.last_message ? item.last_message : "Start conversation 💬"}
                            </span>
                        </div>
                    <span id="${itemID}-unread-msg" style='${hasNewMsg ? "width: 10px; height: 10px; background: orange; border-radius: 50%;" : ""}'></span>
                        </div>
                    </div>
                </div>
            </a >
            `
    if (hasNewMsg) {
        chatList.insertAdjacentHTML("afterbegin", html)
    } else {
        chatList.insertAdjacentHTML("beforeend", html)
    }
    document.getElementById(itemID + "-href").onclick = () => {
        if (hasNewMsg)
            localStorage.removeItem(itemID + "-item")
    }
}
async function tabsHandler(currentTab, user) {
    const wss = {}
    chatList.innerHTML = ""
    if (currentTab === "groups") {

        roomTabBtn.style.border = "none"
        groupTabBtn.style.border = "1px solid"
    }
    else {
        groupTabBtn.style.border = "none"
        roomTabBtn.style.border = "1px solid"
    }
    if (currentTab === "groups") {
        async function fetchGroups() {
            if (CACHES.groups.length < 1) {

                const res = await clientResourceGetter("users/me/chat_groups", { requireAuth: true })
                if (res == null || res.statusCode)
                    return
                CACHES.groups = res || []
                CACHES.groups.map(async (g) => wss[g.short_id] = await wsChatGroupConnection(g.short_id, "chat_group"))
            }
            if (CACHES.groups.length > 0) {
                CACHES.groups.forEach(async (group) => {
                    const gID = group.short_id;
                    const hasNewMsg = localStorage.getItem(gID + "-item")
                    chatItemTemplate(group, user, hasNewMsg)
                });
            }
            else {
                chatList.insertAdjacentHTML("afterbegin", '<i>No group available</i>')
            }
        }
        await fetchGroups()

    } else {
        async function fetchRooms() {
            if (CACHES.rooms.length < 1) {
                const res = await clientResourceGetter("users/me/chat_rooms")
                if (res == null || res.statusCode)
                    return
                CACHES.rooms = res || []
                CACHES.rooms.map(async (room) => wss[room.short_id] = await wsChatGroupConnection(room.short_id, "chat_room")
                )
            }
            if (CACHES.rooms.length > 0)
                CACHES.rooms.forEach(async (room) => {
                    const roomID = room.short_id;
                    const hasNewMsg = localStorage.getItem(roomID + "-item")
                    chatItemTemplate(room, user, hasNewMsg)
                });
            else {
                chatList.insertAdjacentHTML("afterbegin", '<i>No mate to chat with. Start new conversation</i>')
            }
        }
        await fetchRooms()

    }
    if (wss)
        wsHomePageChatGroupConnectionHandler(wss)
}
function showPlusOptions() {
    document.querySelector('#add').onclick = () => {
        const options = document.querySelector("#options ul")
        options.classList.toggle("option-items")
    }

}
async function initPage() {
    // load or get current user
    const user = await getCurrentUser()
    showPlusOptions()
    document.getElementById('user-full-name').textContent = user.first_name + " " + user.last_name
    document.getElementById('username').textContent = "@" + user.username

    tabsHandler("rooms", user)

    roomTabBtn.onclick = () => tabsHandler("rooms", user)
    groupTabBtn.onclick = () => tabsHandler("groups", user)
    createGroup.onclick = () => newGroupHandler(optionsCard, options)


    document.getElementById("logout-btn").onclick = ()=>{
        Auth.clear();
        window.location.href = "/auth/login"
    }

}
window.onload = initPage
console.clear()

