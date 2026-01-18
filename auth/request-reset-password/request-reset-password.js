import { fetcherClient, setError } from "../../fetcher.js"
const requestForm = document.getElementById("request-form")
const requestError = document.getElementById('server-error')

async function requestResetPassword() {
    const email = document.getElementById("email").value
    if (email.trim() === "") {
        setError(requestError, "Enter valid input")
        return
    }
    const res = await fetcherClient("auth/password/request", {
        method: "POST",
        body: JSON.stringify({ email })
    })
    if (res === null) {
        "Network error occurred. Please try again."
    }
    else {
        const data = await res.json();
        if (res.ok) {
            setError(requestError, '')
            window.location.href = "/auth/request-password-confirmed"
        } else {
            setError(requestError, data.non_field_error || data.detail)
        }
    }
}


requestForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    const requestBtn = document.getElementById("request-btn")

    requestBtn.setAttribute("disabled", true)
    requestBtn.setAttribute("style", "background: rgba(7, 82, 173, 1)")
    requestBtn.innerText = "Please wait..."

    await requestResetPassword()

    requestBtn.removeAttribute("disabled")
    requestBtn.setAttribute("style", "background: normal")
    requestBtn.innerText = "Log in"
})