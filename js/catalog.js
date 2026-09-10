import { state } from "./firebase-config.js";

export function renderCatalog() {
    const query = (document.getElementById("catalog-search")?.value || "").toLowerCase();
    const selectedLocFilter = document.getElementById("catalog-location-filter")?.value;
    const container = document.getElementById("catalog-container");

    if (!container) return;

    const filteredIngredients = Object.entries(state.cachedIngredients).filter(([id, ing]) => {
        const matchesSearch = ing.name.toLowerCase().includes(query);
        if (!matchesSearch) return false;

        if (selectedLocFilter) {
            return Object.values(state.cachedPrices).some(p => p.ingredientId === id && p.locationId === selectedLocFilter);
        }
        return true;
    }).sort((a, b) => a[1].name.toLowerCase().localeCompare(b[1].name.toLowerCase()));

    if (filteredIngredients.length === 0) {
        container.innerHTML = '<p class="text-sm text-red-400 italic">No matching ingredients found.</p>';
        return;
    }

    container.innerHTML = filteredIngredients.map(([ingId, ing]) => {
        const offers = Object.values(state.cachedPrices)
            .filter(p => p.ingredientId === ingId && (!selectedLocFilter || p.locationId === selectedLocFilter))
            .sort((a, b) => a.price - b.price);

        const offersHtml = offers.length === 0 
            ? '<p class="text-xs text-zinc-500 italic">No price records yet.</p>'
            : offers.map((offer, idx) => {
                const loc = state.cachedLocations[offer.locationId] || { hold: "Unknown", town: "Unknown" };
                return `
                    <div class="flex justify-between items-center p-1.5 rounded text-xs ${idx === 0 ? 'bg-zinc-950 text-red-100 border border-red-900 font-medium' : 'bg-zinc-900/50 text-red-400'}">
                        <span>${loc.hold} / ${loc.town} ${idx === 0 ? '⭐' : ''}</span>
                        <span class="font-mono">${offer.price} Gold</span>
                    </div>`;
            }).join("");

        return `
            <div class="bg-zinc-950/60 border border-red-950 rounded-lg p-4 space-y-2 flex flex-col h-48">
                <h3 class="font-bold text-red-100 text-sm border-b border-red-950 pb-1 flex-shrink-0">${ing.name}</h3>
                <div class="space-y-1 overflow-y-auto pr-1 flex-1">${offersHtml}</div>
            </div>`;
    }).join("");
}