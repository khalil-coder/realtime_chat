// api/fetcher-client
const baseUrl = "http://localhost:8000"
export async function fetcherClient(url, options = {}) {

    // Normalize url
    if (!url.endsWith("/")) {
        url = url + "/"
    }

    // Add queryparams
    if (options.queryParams && options.queryParams.length > 0) {
        url = url + "?" + options.queryParams.join("&")
    }
    const doFetch = async (token) => {

        const headers = { ...(options.headers) };
        headers["Content-Type"] = "application/json"
        if (options.requireAuth && token)
            headers["Authorization"] = `Bearer ${token}`;
        return await fetch(`${baseUrl}/${url}`, {
            ...options,
            headers
        });
    }
    let responseOk = true
    let response = null
    try {
        const token = Auth.get("auth_token")
        let res = await doFetch(token)
        if (res.status == 401 && options.requireAuth) {
            // -------- REFRESH ACCESS TOKEN --------
            const access = await refreshToken()
            if (typeof access !== 'string' || access.trim() === '') {
                responseOk = false
            } else {
                res = await doFetch(access)
            }
        }
        response = res

    } catch (err) {
        console.error(`Error fetching ${url}:`, err);
        return null
    }
    let href = '/auth/login';
    if (options.nextUrl) {
        href += `?nextUrl=${encodeURIComponent(options.nextUrl)}`
    }
    if (!responseOk)
        window.location.href = href
    return response

}


/**
 * Generic resource getter for fetching JSON from authenticated endpoints.
 * Ensures returned data is a plain JSON object.
 */
export async function clientResourceGetter(
    url,
    options = {}, redirectOnNotFound = false, redirectOnForbidden = false
) {
    let requireAuth = options?.requireAuth
    if (!requireAuth && requireAuth != false) {
        requireAuth = true
    }



    const response = await fetcherClient(url, { ...options, requireAuth });
    if (!response)
        return null

    if (redirectOnForbidden) {
        if (response.status === 403) {
            window.location.href = '/forbidden';
            return null
        }
    }
    if (redirectOnNotFound) {

        if (response.status === 404) {
            window.location.href = '/not-found';
            return null
        }
    }
    if (!response.ok) {
        if (options?.logErrors) {
            console.error(`Failed to fetch ${url}:`, response.status, response.statusText);
        }
        return { detail: null, statusCode: response.status };
    }
    return await response.json();

}


export async function getCurrentUser() {
    let user = localStorage.getItem("user_payload")
    let hasRequiredKeys = true
    try {
        user = JSON.parse(user)
        const keys = ['username', 'first_name', 'last_name', 'email']
        for (let k of keys) {
            if (!Object.hasOwn(user, k) || !Object.getOwnPropertyDescriptor(user, k)) {
                hasRequiredKeys = false
                break;
            }
        }
    } catch { }

    if (user && typeof user === 'object' && hasRequiredKeys) {
        return user
    }
    user = await clientResourceGetter("users/me")
    if (user) {
        localStorage.setItem("user_payload", JSON.stringify(user))
    }

    return user

}

export async function refreshToken() {
    const refresh = Auth.get("refresh")
    if (typeof refresh !== 'string' || refresh.trim() === "")
        return
    try {
        const res = await fetch(`${baseUrl}/auth/token/refresh/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh }),
            cache: "no-store",
        })
        if (!res.ok) return null

        const data = await res.json()
        Auth.setTokens(data.access, undefined)

        return data.access
    } catch {
        return null
    }
}


export const Auth = {
    // 1. Save tokens (usually called after login)
    setTokens(access, refresh) {
        if (typeof access === 'string' && access.trim() != "") {
            // Access token (shorter life, e.g., 30 mins)
            document.cookie = `auth_token=${access}; path=/; max-age=3600; SameSite=Lax; Secure`;
        }
        if (typeof refresh === 'string' && refresh.trim() != "") {
            // Refresh token (longer life, e.g., 7 days)
            document.cookie = `refresh=${refresh}; path=/; max-age=604800; SameSite=Lax; Secure`;
        }
    },

    // 2. Get a specific token
    get(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    },

    // 3. Clear tokens (Logout)
    clear() {
        document.cookie = "auth_token=; path=/; max-age=0";
        document.cookie = "refresh=; path=/; max-age=0";
    }
};



export function setError(el, error) {
    if (error && error.length > 0) {
        el.innerText = error
        return true
    }
    el.innerText = ''
    return false
}

