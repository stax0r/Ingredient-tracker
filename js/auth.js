import { ref, push, update, remove, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { db, state, showToast, DISCORD_WEBHOOK_URL, DEFAULT_BOT_NAME } from "./firebase-config.js";

export function openAdminModal(tab) {
    state.activeAdminTab = tab;
    const titles = {
        locations: "📍 Manage Locations",
        ingredients: "🌿 Manage Ingredients Catalog",
        recipes: "📜 Manage Potion Recipes"
    };
    document.getElementById("admin-modal-title").textContent = titles[tab];
    renderAdminModalContent(tab);
    document.getElementById("admin-modal").classList.remove("hidden");
    document.getElementById("admin-modal").classList.add("flex");
}

export function closeAdminModal() {
    const modal = document.getElementById("admin-modal");
    if (modal) {
        modal.classList.remove("flex");
        modal.classList.add("hidden");
    }
}

export function renderAdminModalContent(tab) {
    const container = document.getElementById("admin-modal-content");
    if (!container) return;

    if (tab === 'locations') {
        const sortedLocations = Object.entries(state.cachedLocations).sort((a, b) => {
            const textA = `${a[1].hold} / ${a[1].town}`.toLowerCase();
            const textB = `${b[1].hold} / ${b[1].town}`.toLowerCase();
            return textA.localeCompare(textB);
        });

        let listHtml = sortedLocations.map(([id, loc]) => `
            <div class="flex gap-2 items-center bg-zinc-950 p-2 rounded border border-red-950">
                <input type="text" id="edit-loc-hold-${id}" value="${loc.hold}" class="w-1/2 bg-zinc-900 border border-red-950 rounded px-2 py-1 text-xs text-white">
                <input type="text" id="edit-loc-town-${id}" value="${loc.town}" class="w-1/2 bg-zinc-900 border border-red-950 rounded px-2 py-1 text-xs text-white">
                <button onclick="updateLocation('${id}')" class="bg-red-900 hover:bg-red-800 border border-red-700 px-2 py-1 rounded text-xs font-semibold text-white">Save</button>
                <button onclick="deleteLocation('${id}')" class="bg-zinc-800 hover:bg-zinc-700 border border-red-950 text-red-300 px-2 py-1 rounded text-xs">✕</button>
            </div>
        `).join("");

        container.innerHTML = `
            <form id="location-form" onsubmit="handleLocationSubmit(event)" class="space-y-2 pb-4 border-b border-red-950">
                <input type="text" id="loc-hold" placeholder="Hold / Region" required class="w-full bg-zinc-950 border border-red-950 rounded p-2 text-xs text-red-100">
                <input type="text" id="loc-town" placeholder="City / Town" required class="w-full bg-zinc-950 border border-red-950 rounded p-2 text-xs text-red-100">
                <button type="submit" class="w-full bg-red-900 hover:bg-red-800 border border-red-700 py-1.5 rounded text-xs font-semibold text-white">Add Location</button>
            </form>
            <div class="space-y-2 max-h-60 overflow-y-auto pr-1">${listHtml || '<p class="text-xs text-red-400 italic">No locations found.</p>'}</div>
        `;
    }
}

export function initAdminGlobalHandlers() {
    window.openAdminModal = openAdminModal;
    window.closeAdminModal = closeAdminModal;

    window.openGuestModal = () => {
        document.getElementById("guest-modal").classList.remove("hidden");
        document.getElementById("guest-modal").classList.add("flex");
    };

    window.closeGuestModal = () => {
        document.getElementById("guest-modal").classList.remove("flex");
        document.getElementById("guest-modal").classList.add("hidden");
    };

    window.toggleGuestFormFields = () => {
        const type = document.getElementById("guest-contrib-type").value;
        document.getElementById("guest-price-fields").classList.toggle("hidden", type !== 'price');
        document.getElementById("guest-location-fields").classList.toggle("hidden", type !== 'location');
        document.getElementById("guest-letter-fields").classList.toggle("hidden", type !== 'letter');
    };

    window.submitGuestWebhookRequest = async () => {
        const type = document.getElementById("guest-contrib-type").value;
        const author = document.getElementById("guest-author").value.trim() || "A Guild Member";
        let contentMessage = "";

        if (type === 'price') {
            const ingSelect = document.getElementById("guest-ingredient-select");
            const locSelect = document.getElementById("guest-location-select");
            const priceVal = document.getElementById("guest-price-amount").value;
            if (!ingSelect.value || !locSelect.value || !priceVal) return showToast("Fill all price fields.", "error");
            contentMessage = `💰 **Price Update**\n• **By:** ${author}\n• **Ingredient:** ${ingSelect.options[ingSelect.selectedIndex]?.text}\n• **Price:** ${priceVal} Gold`;
        } else if (type === 'location') {
            const hold = document.getElementById("guest-loc-hold").value.trim();
            const town = document.getElementById("guest-loc-town").value.trim();
            if (!hold || !town) return showToast("Fill hold and town fields.", "error");
            contentMessage = `📍 **Location Request**\n• **By:** ${author}\n• **Location:** ${hold} / ${town}`;
        } else {
            const letter = document.getElementById("guest-letter-content").value.trim();
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
        e.preventDefault();
        const ingredientId = document.getElementById("price-ingredient-select").value;
        const locationId = document.getElementById("price-location-select").value;
        const price = parseFloat(document.getElementById("price-amount").value);

        set(ref(db, `prices/${ingredientId}_${locationId}`), {
            ingredientId, locationId, price, updatedAt: new Date().toISOString()
        }).then(() => {
            showToast("Price recorded!", "success");
            e.target.reset();
        });
    };
}