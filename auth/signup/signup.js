import { fetcherClient, setError, Auth } from "../../fetcher.js"
const signupForm = document.getElementById("signup-form")

async function signup() {
    const username = document.getElementById("username").value.trim()
    const first_name = document.getElementById("first-name").value.trim()
    const last_name = document.getElementById("last-name").value.trim()
    const phone_number = document.getElementById("phone-number").value.trim()
    const email = document.getElementById("email").value.trim()
    const password = document.getElementById("password").value.trim()
    const password2 = document.getElementById("password2").value.trim()

    // Errors
    const usernameError = document.getElementById("username-error")
    const emailError = document.getElementById("email-error")
    const phoneNumberError = document.getElementById("phone-number-error")
    const passwordError = document.getElementById("password-error")
    const serverError = document.getElementById("server-error")

    const res = await fetcherClient("auth/register", {
        method: "POST",
        body: JSON.stringify({ email, phone_number, password2, username, first_name, last_name, password })
    })
    if (res === null) {
        setError(loginError, "Network error occurred. Please try again.")
    }
    else {
        const data = await res.json();
        if (res.ok) {
            window.location.href = "/auth/login"
        } else {
            serverError.innerText = ''

            const { username, email, phone_number, password } = data
            setError(usernameError, username)
            setError(emailError, email)
            setError(phoneNumberError, phone_number)
            setError(passwordError, password)
            if (data.non_field_errors || data.detail)
                setError(serverError, data.non_field_errors || data.detail)
            else
                serverError.innerText = ''
        }
    }
}


signupForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    const loginBtn = document.getElementById("signup-btn")

    loginBtn.setAttribute("disabled", true)
    loginBtn.setAttribute("style", "background: rgba(7, 82, 173, 1)")
    loginBtn.innerText = "Please wait..."

    await signup()

    loginBtn.removeAttribute("disabled")
    loginBtn.setAttribute("style", "background: normal")
    loginBtn.innerText = "Sign Up"
})

