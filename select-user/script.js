import { Auth, clientResourceGetter, fetcherClient, getCurrentUser } from "../fetcher.js"
import { popToast } from "../utils.js"
async function loadAllUsers() {
    const res = await clientResourceGetter("users", {requireAuth: false})
    return res
}
async function handleStartConversation(user2ID) {
    const res = await fetcherClient("one-to-one-chat", { method: "POST", requireAuth: true, body: JSON.stringify({ user2_short_id: user2ID }) })
    if (!res) {
        popToast("error", "Something went wrong. Please try again")
        return
    }
    if (res.ok) {
        const roomID = (await res.json()).short_id
        window.location.href = "/chat-room/#" + roomID
    } else {
        try {
            const d = await res.json()
            popToast('error', d.member || d.detail || res.statusText)
        } catch {
            popToast('error', res.statusText)
        }
    }
}
async function initPage() {
    if (!Auth.get("auth_token") && !Auth.get('refresh')) {
        window.location.href = '/auth/login'
    }
    const user = await getCurrentUser()
    const userContainer = document.querySelector(".users-container")
    const allUsers = await loadAllUsers()

    if (allUsers) {
        allUsers.map((u) => {
            if (user.short_id !== u.short_id) {
                const html = `<div style="margin-bottom:10px; display: flex; justify-content: space-between; align-items: center">
                <div>
                <p style="margin: 0">
                ${u.first_name} ${u.last_name}
                </p>
                <span style="color: gray">@${u.username}</span>
                </div>
                <button id='${u.short_id}_btn' style="padding-inline: 5px; padding-block: 3px;">💬</button>
                </div>`
                userContainer.insertAdjacentHTML("beforeend", html)
                document.getElementById(u.short_id + "_btn").onclick = () => handleStartConversation(u.short_id)
            }
        })
    }else{
        const html = `<i>No users to chat with.</i>`
        userContainer.insertAdjacentHTML("beforeend", html)
    }


}

window.onload = initPage