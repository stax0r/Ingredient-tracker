import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { auth, showToast } from "./firebase-config.js";
import { closeAdminModal } from "./admin.js";

export function initAuth() {
    window.handleLogin = async () => {
        const email = document.getElementById("auth-email")?.value;
        const password = document.getElementById("auth-password")?.value;

        if (!email || !password) {
            showToast("Please enter both email and password.", "error");
            return;
        }

        try {
            await signInWithEmailAndPassword(auth, email, password);
            showToast("Successfully signed in!", "success");
        } catch (err) {
            showToast("Login error: " + err.message, "error");
        }
    };

    window.handleSignOut = () => {
        signOut(auth);
        showToast("Signed out successfully.", "info");
    };

    onAuthStateChanged(auth, (user) => {
        const outView = document.getElementById("logged-out-view");
        const inView = document.getElementById("logged-in-view");
        const adminToggles = document.getElementById("admin-toggles");
        const guestContribBtn = document.getElementById("guest-contrib-btn");
        const priceLoggerSection = document.getElementById("price-logger-section");

        const isLoggedIn = !!user;

        if (outView) outView.classList.toggle("hidden", isLoggedIn);
        if (inView) inView.classList.toggle("hidden", !isLoggedIn);
        if (adminToggles) adminToggles.classList.toggle("hidden", !isLoggedIn);
        if (priceLoggerSection) priceLoggerSection.classList.toggle("hidden", !isLoggedIn);
        
        // Show guest button ONLY when logged out
        if (guestContribBtn) guestContribBtn.classList.toggle("hidden", isLoggedIn);

        if (isLoggedIn) {
            const userDisplay = document.getElementById("user-display");
            if (userDisplay) userDisplay.textContent = user.email;
        } else {
            closeAdminModal();
        }
    });
}