import { ref, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { db, state, showToast, DISCORD_WEBHOOK_URL, DEFAULT_BOT_NAME } from "./firebase-config.js";

export function openAdminModal(tab) {
    state.activeAdminTab = tab;
    const modal = document.getElementById("admin-modal");
    if (modal) {
        modal.classList.remove("hidden");
        modal.classList.add("flex");
    }
}

export function closeAdminModal() {
    const modal = document.getElementById("admin-modal");
    if (modal) {
        modal.classList.remove("flex");
        modal.classList.add("hidden");
    }
}

export function initAdminGlobalHandlers() {
    // Explicitly bind handlers to window object so HTML onclick attributes can reach them
    window.openAdminModal = openAdminModal;
    window.closeAdminModal = closeAdminModal;

    window.openGuestModal = () => {
        const modal = document.getElementById("guest-modal");
        if (modal) {
            modal.classList.remove("hidden");
            modal.classList.add("flex");
        }
    };

    window.closeGuestModal = () => {
        const modal = document.getElementById("guest-modal");
        if (modal) {
            modal.classList.remove("flex");
            modal.classList.add("hidden");
        }
    };

    window.toggleGuestFormFields = () => {
        const type = document.getElementById("guest-contrib-type")?.value;
        document.getElementById("guest-price-fields")?.classList.toggle("hidden", type !== 'price');
        document.getElementById("guest-location-fields")?.classList.toggle("hidden", type !== 'location');
        document.getElementById("guest-letter-fields")?.classList.toggle("hidden", type !== 'letter');
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
                return showToast("Fill all price fields.", "error");
            }
            contentMessage = `💰 **Price Update**\n• **By:** ${author}\n• **Ingredient:** ${ingSelect.options[ingSelect.selectedIndex]?.text}\n• **Price:** ${priceVal} Gold`;
        } else if (type === 'location') {
            const hold = document.getElementById("guest-loc-hold")?.value.trim();
            const town = document.getElementById("guest-loc-town")?.value.trim();
            if (!hold || !town) return showToast("Fill hold and town fields.", "error");
            contentMessage = `📍 **Location Request**\n• **By:** ${author}\n• **Location:** ${hold} / ${town}`;
        } else {
            const letter = document.getElementById("guest-letter-content")?.value.trim();
            if (!letter) return showToast("Write a missive first.", "error");
            contentMessage = `📜 **Sealed Letter**\n• **From:** ${author}\n\n"${letter}"`;
        }

        if (!DISCORD_WEBHOOK_URL || DISCORD_WEBHOOK_URL.includes("DISCORD_WEBHOOK_PLACEHOLDER")) {
            showToast("Missive recorded locally (Webhook URL omitted).", "info");
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

    window.handlePriceSubmit = (e) => {
        if (e && e.preventDefault) e.preventDefault();
        
        const ingredientId = document.getElementById("price-ingredient-select")?.value;
        const locationId = document.getElementById("price-location-select")?.value;
        const price = parseFloat(document.getElementById("price-amount")?.value);

        if (!ingredientId || !locationId || isNaN(price)) {
            showToast("Please complete all price fields.", "error");
            return;
        }

        set(ref(db, `prices/${ingredientId}_${locationId}`), {
            ingredientId, locationId, price, updatedAt: new Date().toISOString()
        }).then(() => {
            showToast("Price recorded!", "success");
            const form = document.getElementById("direct-price-form");
            if (form) form.reset();
        }).catch(err => showToast("Error saving price: " + err.message, "error"));
    };
}