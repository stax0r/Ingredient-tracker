import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyDTQPUXzYr8UAawpvNce6wbXJC07-ZOmeo",
    authDomain: "alchemy-price-tracker.firebaseapp.com",
    databaseURL: "https://alchemy-price-tracker-default-rtdb.firebaseio.com",
    projectId: "alchemy-price-tracker",
    storageBucket: "alchemy-price-tracker.firebasestorage.app",
    messagingSenderId: "357962236614",
    appId: "1:357962236614:web:770c78966226a35f138dc7",
    measurementId: "G-J94V9BMR1Q"
};

export const DISCORD_WEBHOOK_URL = "DISCORD_WEBHOOK_PLACEHOLDER";
export const DEFAULT_BOT_NAME = "DEFAULT_BOT_NAME_PLACEHOLDER";

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

export const state = {
    cachedRecipes: {},
    cachedIngredients: {},
    cachedLocations: {},
    cachedPrices: {},
    currentBatch: [],
    activeAdminTab: 'locations'
};

export function showToast(message, type = 'success') {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    const bgColors = {
        success: "bg-zinc-900 border-red-800 text-red-100",
        error: "bg-red-950 border-red-700 text-red-100",
        info: "bg-zinc-900 border-zinc-700 text-zinc-100"
    };

    toast.className = `pointer-events-auto px-4 py-3 rounded-lg border shadow-xl text-xs flex items-center gap-3 transition-all duration-300 transform translate-y-2 opacity-0 ${bgColors[type] || bgColors.success}`;
    toast.innerHTML = `<span>${message}</span>`;
    
    container.appendChild(toast);
    
    setTimeout(() => toast.classList.remove("translate-y-2", "opacity-0"), 10);
    setTimeout(() => {
        toast.classList.add("translate-y-2", "opacity-0");
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}