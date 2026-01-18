import { Auth, refreshToken } from "./fetcher.js"
export function popToast(type, message) {
    const body = document.querySelector('body')
    const style = `
        border-radius: 15px;
        place-self: center;
        position: fixed;
        top: 10px;
        background: ${type === 'success' ? "#25d12eff" : "#ca4242ff"};
        z-index: 60;
        padding-inline: 10px;
        padding-block: 5px;
        color: white;
        box-shadow: 0 0 5px 1px #1310104d
        `
    let toast = `
    <div style='${style}' id="toast">
    ${message}
    </div>
    `
    body.insertAdjacentHTML('afterbegin', toast)

    setTimeout(() => {
        document.getElementById("toast").remove()
    }, 2000)
}

export async function wsChatGroupConnection(chatGroupOrRoomID, connectionPath) {
    if (!chatGroupOrRoomID || !connectionPath) return
    let token = Auth.get("auth_token")
    if (!token) {
        token = await refreshToken()
        if (!token)
            window.location.href = "/auth/login"
    }
    const ws = new WebSocket(`ws://${location.hostname}:8000/ws/${connectionPath}/${chatGroupOrRoomID}/?token=${token}`);
    return ws

}
/**
 * Handles realtime notifications at homepage
 * @param {WebSocket[]} wss
 * @returns void
 */
export async function wsHomePageChatGroupConnectionHandler(wss) {
    if (!wss || typeof wss !== "object")
        return
    // Get current ws instance
    Object.entries(wss).map(([id, ws]) => {
        ws.onmessage = (e) => {
            const data = JSON.parse(e.data)
            const groupOrRoomID = data.group_id || data.room_id
            if (groupOrRoomID === id) {
                const lastMsg = document.getElementById(`${groupOrRoomID}_last_msg`)
                if (lastMsg) {
                    lastMsg.innerText = (data.sender || "") + ": " + data.content;
                    localStorage.setItem(groupOrRoomID + '-item', "notif")
                    const notif = document.getElementById(groupOrRoomID + "-unread-msg")
                    if (notif) {
                        notif.setAttribute("style", "width: 10px; height: 10px; background: orange; border-radius: 50%;")
                    }
                }
            }
        }
    })

}