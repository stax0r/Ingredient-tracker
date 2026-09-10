import { ref, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { db, state, showToast, DISCORD_WEBHOOK_URL, DEFAULT_BOT_NAME } from "./firebase-config.js";

export function openAdminModal(tab) {
    state.activeAdminTab = tab;
    const modal = document.getElementById("admin-modal");
    if (modal) {
        modal.classList.remove("hidden");
    }
}

export function closeAdminModal() {
    const modal = document.getElementById("admin-modal");
    if (modal) {
        modal.classList.add("hidden");
    }
}

export function initAdminGlobalHandlers() {
    window.openAdminModal = openAdminModal;
    window.closeAdminModal = closeAdminModal;

    window.openGuestModal = () => {
        const modal = document.getElementById("guest-modal");
        if (modal) {
            modal.classList.remove("hidden");
            window.toggleGuestFormFields(); // Reset visible fields based on select state
        }
    };

    window.closeGuestModal = () => {
        const modal = document.getElementById("guest-modal");
        if (modal) {
            modal.classList.add("hidden");
        }
    };

    window.toggleGuestFormFields = () => {
        const type = document.getElementById("guest-contrib-type")?.value || "price";
        const priceFields = document.getElementById("guest-price-fields");
        const locationFields = document.getElementById("guest-location-fields");
        const letterFields = document.getElementById("guest-letter-fields");

        if (priceFields) priceFields.classList.toggle("hidden", type !== "price");
        if (locationFields) locationFields.classList.toggle("hidden", type !== "location");
        if (letterFields) letterFields.classList.toggle("hidden", type !== "letter");
    };

    window.submitGuestWebhookRequest = async () => {
        const type = document.getElementById("guest-contrib-type")?.value;
        const author = document.getElementById("guest-author")?.value.trim() || "A Guild Member";
        let contentMessage = "";

        if (type === 'price') {
            const ingSelect = document.getElementById("guest-ingredient-select");
            const locSelect = document.getElementById("guest-location-select");
            const priceVal = document.getElementById("guest-price-amount")?.value;
            
            if (!ingSelect?.value || !locSelect?.value || !priceVal) {
                return showToast("Please fill all price fields.", "error");
            }
            const ingText = ingSelect.options[ingSelect.selectedIndex]?.text;
            const locText = locSelect.options[locSelect.selectedIndex]?.text;
            contentMessage = `💰 **Price Update**\n• **By:** ${author}\n• **Ingredient:** ${ingText}\n• **Location:** ${locText}\n• **Price:** ${priceVal} Gold`;
        } else if (type === 'location') {
            const hold = document.getElementById("guest-loc-hold")?.value.trim();
            const town = document.getElementById("guest-loc-town")?.value.trim();
            if (!hold || !town) return showToast("Fill in both hold and town fields.", "error");
            contentMessage = `📍 **Location Request**\n• **By:** ${author}\n• **Location:** ${hold} / ${town}`;
        } else {
            const letter = document.getElementById("guest-letter-content")?.value.trim();
            if (!letter) return showToast("Write a missive before sending.", "error");
            contentMessage = `📜 **Sealed Letter**\n• **From:** ${author}\n\n"${letter}"`;
        }

        if (!DISCORD_WEBHOOK_URL || DISCORD_WEBHOOK_URL.includes("DISCORD_WEBHOOK_PLACEHOLDER")) {
            showToast("Webhook URL not configured. Action logged locally.", "info");
            window.closeGuestModal();
            return;
        }

        try {
            await fetch(DISCORD_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: DEFAULT_BOT_NAME || "Guild Scribe", content: contentMessage })
            });
            showToast("Missive sent successfully!", "success");
            window.closeGuestModal();
        } catch (err) {
            showToast("Error delivering missive: " + err.message, "error");
        }
    };
}