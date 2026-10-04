// auth.js

export function getCurrentUser() {
    return localStorage.getItem('currentUserDisplay');
}

export async function loginUser(username, password) {
    if (username === 'senthil123' && password === '123456') {
        localStorage.setItem('currentUserDisplay', username);
        window.location.href = 'app.html';
        return { success: true };
    } else {
        return { success: false, message: "Invalid username or password." };
    }
}

export async function logoutUser() {
    try {
        localStorage.removeItem('currentUserDisplay');
        window.location.href = 'index.html';
        return { success: true };
    } catch (error) {
        console.error("Logout Error:", error);
        return { success: false, message: error.message };
    }
}
