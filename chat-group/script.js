import { fetcherClient, Auth, clientResourceGetter, setError, getCurrentUser } from "../fetcher.js"
import { popToast, wsChatGroupConnection } from '../utils.js'
function initPage() {
    let chatGroupID = window.location.hash
    if (!chatGroupID || typeof chatGroupID !== 'string') {
        window.location.href = "/"
    }
    chatGroupID = chatGroupID.substring(1)

    if (!Auth.get("auth_token") && !Auth.get('refresh'))
        window.location.href = '/auth/login'
    return chatGroupID
}


const refreshBtn = document.getElementById('refresh-btn');
function showMemberCard(membersCard, members, headingText) {
    membersCard.style.display = 'block'
    const heading = `
            <div style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: start">
            <h4>${headingText}</h4>
            <button id="close-card" style="border: none; padding: 5px; background: transparent;">X</button>
            </div>
            `
    members.insertAdjacentHTML("afterbegin", heading)

    //  Close members card
    document.getElementById('close-card').onclick = () => {
        membersCard.style.display = 'none'
        members.innerHTML = ''
    }
}
async function addGroupMember(userID, groupID, currentEl) {
    const res = await fetcherClient(`chat-group/${groupID}/add_member`, { method: "POST", body: JSON.stringify({ user_short_id: userID }), requireAuth: true })
    if (!res) {
        popToast("error", "Something went wrong. Please try again")
    }
    if (res.ok) {
        popToast("success", "A new member was added to the group")
        currentEl.parentElement.remove()
    } else {
        try {
            const d = await res.json()
            popToast('error', d.member || d.detail || res.statusText)
        } catch {
            popToast('error', res.statusText)
        }
    }
}
async function removeGroupMember(userID, groupID, currentEl) {
    const res = await fetcherClient(`chat-group/${groupID}/remove_member`, { method: "POST", body: JSON.stringify({ user_short_id: userID }), requireAuth: true })
    if (!res) {
        popToast("error", "Something went wrong. Please try again")
    }
    if (res.ok) {
        popToast("success", "User was removed from the group")
        currentEl.parentElement.remove()
    } else {
        try {
            const d = await res.json()
            popToast('error', d.member || d.detail || res.statusText)
        } catch {
            popToast('error', res.statusText)
        }
    }
}
async function deleteChatGroup(groupID) {
    const res = await fetcherClient(`chat-group/${groupID}/`, { method: "DELETE", requireAuth: true })
    if (!res) {
        popToast("error", "Something went wrong. Please try again")
    }
    if (res.ok) {
        popToast("success", "Chat group was deleted")
        window.location.href = "/"
    } else {
        try {
            const d = await res.json()
            popToast('error', d.member || d.detail || res.statusText)
        } catch {
            popToast('error', res.statusText)
        }
    }
}

async function leaveChatGroup(userID, groupID) {
    const res = await fetcherClient(`chat-group/${groupID}/leave_group`, { method: "POST", body: JSON.stringify({ user_short_id: userID }), requireAuth: true })
    if (!res) {
        popToast("error", "Something went wrong. Please try again")
    }
    if (res.ok) {
        popToast("success", "You left the group")
        window.location.href = "/"
    } else {
        try {
            const d = await res.json()
            popToast('error', d.member || d.detail || res.statusText)
        } catch {
            popToast('error', res.statusText)
        }
    }
}

async function editChatGroup(groupID, name, description) {
    const res = await fetcherClient(`chat-group/${groupID}/`, { method: "PATCH", body: JSON.stringify({ name, description }), requireAuth: true })
    if (!res) {
        popToast("error", "Something went wrong. Please try again")
    }
    if (res.ok) {
        popToast("success", "Success!")
        window.location.reload()
    } else {
        try {
            const d = await res.json()
            popToast('error', d.member || d.detail || res.statusText)
        } catch {
            popToast('error', res.statusText)
        }
    }
}


function showChatGroupOption() {
    document.querySelector('#show-options').onclick = () => {
        const options = document.querySelector(".chat-options ul")
        options.classList.toggle("options")
    }

}
async function initWs() {
    const chatGroupID = initPage()
    showChatGroupOption()
    // State Management
    const messagesList = document.getElementById('messages-list');
    const errorMsgContainer = document.getElementById('smth-went-wrong');
    const errorMsg = document.getElementById('error-msg');
    const appContainer = document.getElementById('app-container');
    const chatForm = document.getElementById('chat-form');
    const activeChatGroupName = document.getElementById('active-chat-name');
    const msgInput = document.getElementById('msg-input');
    const viewport = document.getElementById('message-viewport');
    const addMemberBtn = document.getElementById("add-member-btn")
    const deleteGroupBtn = document.getElementById("delete-group-btn")
    const editGroupBtn = document.getElementById("edit-group-btn")
    const membersCard = document.querySelector('.members-card')
    const members = document.querySelector('.members')
    const groupInfoBtn = document.querySelector('#see-group-info-btn')
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

    async function getChatGroup(chatGroupID) {
        return clientResourceGetter(`chat-group/${chatGroupID}`, { requireAuth: true })
    }
    async function loadPastMessages(messages, user_short_id) {
        if (!messages) return
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

    // Get chat group
    const group = await getChatGroup(chatGroupID)
    const statusCode = group.statusCode
    if (!group || statusCode) {
        appContainer.style.display = "none"
        errorMsgContainer.removeAttribute('hidden')

        if (statusCode === 404) {
            setError(errorMsg, "Chat group does not exist")
            refreshBtn.setAttribute("hidden", "hidden")
        }

        if (statusCode === 403) {
            setError(errorMsg, "Access denied. You are not allowed to access the group chat because you are not a member.")
            refreshBtn.setAttribute("hidden", true)
        }
        return
    } else {
        appContainer.style.display = "flex"
        errorMsgContainer.style.display = "none"
    }

    // Set chat group name
    activeChatGroupName.textContent = group.name

    // Get current user
    const user = await getCurrentUser()

    // hide add button if user is not the group owner
    if (user.short_id !== group.chat_group_creator) {
        addMemberBtn.remove()
        deleteGroupBtn.remove()
        editGroupBtn.remove()
    } else {
        addMemberBtn.onclick = async () => {
            const nonGroupMembers = await clientResourceGetter(`chat-group/${chatGroupID}/non_group_members/`)
            showMemberCard(membersCard, members, 'Add members')
            if (nonGroupMembers && nonGroupMembers.length > 0) {
                nonGroupMembers.map((m) => {
                    const html = `
                    <div style="margin-bottom:3px; display: flex; justify-content: space-between; align-items: center">
                        <div>
                        <p>
                        ${m.first_name} ${m.last_name}
                        </p>
                        <span style="color: gray">@${m.username}</span>
                        </div>
                        <button id='${m.short_id}' style="padding-inline: 5px; padding-block: 3px;">Add</button>
                    </div>
                    `
                    members.insertAdjacentHTML("beforeend", html)
                    document.getElementById(m.short_id).onclick = () => addGroupMember(m.short_id, chatGroupID, document.getElementById(m.short_id))
                })
            } else {
                members.insertAdjacentHTML("beforeend", '<i>No users to add to the group</i>')
            }

        }
        // delete chat group
        deleteGroupBtn.onclick = () => {
            showMemberCard(membersCard, members, "Are you sure?")
            const html = `
        <p style="margin-bottom: 5px;">
        You are about to delete this group. All messages and members associated with this group will be removed.
        </p>
        <button style=" background: rgb(228, 36, 36); border: none; padding-block: 5px; color: white" id="confirm-delete-btn">Continue</button>
        `
            members.insertAdjacentHTML('beforeend', html)
            document.getElementById("confirm-delete-btn").onclick = () => deleteChatGroup(chatGroupID)
        }

        editGroupBtn.onclick = () => {
            showMemberCard(membersCard, members, "Update Group Info")
            const html = `
            <form id="edit-form" style="display: grid; gap: 8px">
                <div style="width: 100%">
                    <input style="width: 100%; padding: 5px"
                        required
                        type="text"
                        id="group-name"
                        placeholder="Name"
                        value='${group.name}'
                        />
                    </div>
                    <div>
                        <textarea
                        rows=8
                        style="width: 100%; padding: 5px"
                            required
                            id="group-description"
                            placeholder="Description"
                        >${group.description}</textarea>
                    </div>
                    <button type="submit">Save Changes</button>
                </form>
            `
            members.insertAdjacentHTML('beforeend', html)
            document.querySelector("#edit-form").addEventListener("submit", (e) => {
                e.preventDefault()
                const groupName = document.querySelector("#group-name").value
                const groupDescription = document.querySelector("#group-description").value
                editChatGroup(chatGroupID, groupName, groupDescription)
            })
        }

    }

    // See all members
    document.getElementById('see-members-btn').onclick = async () => {
        const groupMembers = await clientResourceGetter(`chat-group/${chatGroupID}/group_members/`)
        showMemberCard(membersCard, members, 'Group members')
        if (groupMembers && groupMembers.length > 0) {
            groupMembers.map((m) => {
                const html = `
                    <div style="margin-bottom:3px; display: flex; justify-content: space-between; align-items: center">
                        <div>
                        <p>
                        ${m.first_name} ${m.last_name}
                        </p>
                        <span style="color: gray">@${m.username}</span>
                        </div>
                        ${m.short_id !== group.chat_group_creator && user.short_id == group.chat_group_creator ?
                        `<button class="remove-member" id="${m.short_id}" style="padding-inline: 5px; padding-block: 3px;">Remove</button>`
                        : ""
                    }
                        ${m.short_id === group.chat_group_creator ?
                        "<p>Admin</p>"
                        : ""
                    }
                    </div>
                    `
                members.insertAdjacentHTML("beforeend", html)

                // Remove member action
                const removeBtn = document.getElementById(m.short_id)
                if (removeBtn)
                    removeBtn.onclick = () => removeGroupMember(m.short_id, chatGroupID, document.getElementById(m.short_id))
            })
        } else {
            members.insertAdjacentHTML("beforeend", '<i>No users in this group</i>')
        }
    }
    // See group info
    groupInfoBtn.onclick = () => {
        showMemberCard(membersCard, members, 'Group Info')
        const html = `
                    <div style="margin-bottom: 10px">
                        <h4 style="text-align: center; margin-bottom: 5px">
                        ${group.name}
                        </h4>
                        <p>${group.description}</p>
                    </div>
                    `
        members.insertAdjacentHTML("beforeend", html)
    }

    // Leave group action
    if (user.short_id === group.chat_group_creator) {
        // Creator can not leave the group but can delete it
        document.getElementById('leave-group-btn').remove()
    } else {

        document.getElementById('leave-group-btn').onclick = () => {
            showMemberCard(membersCard, members, "Are you sure?")
            const html = `
        <p style="margin-bottom: 5px;">
        You are about to leave this group. It'll be impossible for you to come back here
        unless you are added again by admin.
        </p>
        <button style=" background: rgb(228, 36, 36); border: none; padding-block: 5px; color: white" id="confirm-leave-btn">Continue</button>
        `
            members.insertAdjacentHTML('beforeend', html)
            document.getElementById("confirm-leave-btn").onclick = () => leaveChatGroup(user.short_id, chatGroupID)
        }
    }



    async function sendMessage(content) {
        await fetcherClient(`chat-group/${chatGroupID}/create_chat_group_message/`, {
            requireAuth: true, method: "POST", body: JSON.stringify({ content })
        })

    }

    // Fetch group messages
    const messages = await clientResourceGetter(`chat-group/${chatGroupID}/chat_group_messages`)
    await loadPastMessages(messages, user.short_id)
    viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });


    // 3. UI Interactions
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!msgInput.value.trim()) return;
        sendMessage(msgInput.value);
        msgInput.value = '';
    });






    // const notificationBadge = document.getElementById("notification-badge");
    // const notificationList = document.getElementById("notification-list");
    const ws = await wsChatGroupConnection(chatGroupID, "chat_group")
    ws.onmessage = function (event) {
        const data = JSON.parse(event.data);
        const msgData = {
            id: Date.now(),
            content: data.content,
            type: data.type === "action" ? data.type : (data.sender_id === user.short_id ? "out" : "in"),
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