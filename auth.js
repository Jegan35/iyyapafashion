// auth.js
import { auth } from './firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const DOMAIN_SUFFIX = "@iyyapafashion.com";

// ==========================================
// Authentication State Observer
// ==========================================
onAuthStateChanged(auth, (user) => {
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath.endsWith('index.html') || currentPath === '/' || currentPath.endsWith('/');

    if (user) {
        // User is signed in. Save display name locally for the UI
        const displayUsername = user.email.replace(DOMAIN_SUFFIX, '');
        localStorage.setItem('currentUserDisplay', displayUsername);
        
        if (isLoginPage) {
            window.location.href = 'app.html';
        }
    } else {
        // No user is signed in.
        // --- LOGIN BYPASS FOR DESIGN PHASE ---
        // localStorage.removeItem('currentUserDisplay');
        // if (!isLoginPage) {
        //     window.location.href = 'index.html';
        // }
        localStorage.setItem('currentUserDisplay', 'Designer (Bypass Mode)');
    }
});

// ==========================================
// Login Function
// ==========================================
export async function loginUser(username, password) {
    try {
        // --- MOCK LOGIN FOR DESIGN PHASE ---
        // Accepting all logins temporarily to unblock you during design!
        localStorage.setItem('currentUserDisplay', username || 'Designer');
        window.location.href = 'app.html';
        return { success: true };

        // Convert the simple username (senthil123) into the required Firebase email format
        // const emailToLogin = username + DOMAIN_SUFFIX;
        
        const userCredential = await signInWithEmailAndPassword(auth, emailToLogin, password);
        return { success: true, user: userCredential.user };
    } catch (error) {
        console.error("Login Error:", error.code, error.message);
        let message = "An error occurred during login.";
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            message = "Invalid username or password.";
        } else if (error.code === 'auth/network-request-failed') {
            message = "Network error. Please check your connection.";
        } else {
            message = `Error: ${error.message} (${error.code})`;
        }
        return { success: false, message };
    }
}

// ==========================================
// Logout Function
// ==========================================
export async function logoutUser() {
    try {
        localStorage.removeItem('currentUserDisplay');
        window.location.href = 'index.html';
        signOut(auth); // fire and forget
        return { success: true };
    } catch (error) {
        console.error("Logout Error:", error);
        return { success: false, message: error.message };
    }
}

export function getCurrentUser() {
    return localStorage.getItem('currentUserDisplay');
}
