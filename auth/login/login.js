import { fetcherClient, Auth } from "../../fetcher.js"
const loginForm = document.getElementById("login-form")
const loginError = document.getElementById('login-error')

async function login() {
    const email = document.getElementById("email").value
    const password = document.getElementById("password").value
    if (email.trim() === "" || password.trim() === "") {
        loginError.innerText = "Enter valid input"
        return
    }
    const res = await fetcherClient("auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
    })
    if (res === null) {
        console.log("Something went wrong")
    }
    else {
        const data = await res.json();
        if (res.ok) {
            loginError.innerText = ''
            const { access, refresh } = data
            Auth.setTokens(access, refresh)
            window.location.href = "/"
        } else {
            loginError.innerText = data.login
        }
    }
}


loginForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    const loginBtn = document.getElementById("login-btn")

    loginBtn.setAttribute("disabled", true)
    loginBtn.setAttribute("style", "background: rgba(7, 82, 173, 1)")
    loginBtn.innerText = "Please wait..."

    await login()

    loginBtn.removeAttribute("disabled")
    loginBtn.setAttribute("style", "background: normal")
    loginBtn.innerText = "Log in"
})