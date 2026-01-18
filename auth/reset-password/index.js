import { fetcherClient, setError } from "../../fetcher.js"
const authCard = document.getElementsByClassName("auth-card")[0]
const resetForm = document.getElementById("reset-form")
const tokenError = document.getElementById("token-error")

// Get the current page url
const url = new URL(location.href)
const qs = new URLSearchParams(window.location.href)

// Retrieve required query string values
const userShortId = url.origin + url.pathname + "?" + 'user_short_id_token' // Query string key name
let userIDToken = qs.get(userShortId)
let token = qs.get('token')


if (typeof userIDToken !== 'string' || userIDToken.trim() === '' || typeof token != 'string' || token.trim() === '') {
    resetForm.setAttribute("hidden", true)
    setError(tokenError, "Unable to retrieve require data to reset your password")
}

// Clean userIDToken and token.
// Python Backend console prefixes both value with 3D
if (userIDToken.startsWith('3D'))
    userIDToken = userIDToken.substring(2)
if (token.startsWith('3D'))
    token = token.substring(2)

async function resetPassword() {
    const password = document.getElementById("password").value.trim()
    const password2 = document.getElementById("password2").value.trim()
    const resetError = document.getElementById("reset-error")
    const passwordError = document.getElementById("password-error")

    const res = await fetcherClient("auth/password/reset", {
        method: "POST",
        body: JSON.stringify({ password, password2, user_short_id_token: userIDToken.trim(), token: token.trim() })
    })
    if (res === null) {
        setError(resetError, "Network error occurred. Please try again.")
    }
    else {
        const data = await res.json();
        console.log(data)
        if (res.ok) {
            setError(resetError, '')
            window.location.href = "/auth/login"
        } else {
            setError(resetError, '')
            const { password, token, detail, non_field_errors } = data
            setError(passwordError, password)
            setError(resetError, token || non_field_errors || detail)
        }
    }

}


resetForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    const resetBtn = document.getElementById("reset-btn")

    resetBtn.setAttribute("disabled", true)
    resetBtn.setAttribute("style", "background: rgba(7, 82, 173, 1)")
    resetBtn.innerText = "Please wait..."

    await resetPassword()

    resetBtn.removeAttribute("disabled")
    resetBtn.setAttribute("style", "background: normal")
    resetBtn.innerText = "Log in"
})