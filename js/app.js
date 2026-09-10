import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { db, state } from "./firebase-config.js";
import { initAuth } from "./auth.js";
import { initAdminGlobalHandlers, renderAdminModalContent } from "./admin.js";
import { renderCatalog } from "./catalog.js";
import { runOptimization, initBatchHandlers } from "./batch.js";

document.addEventListener("DOMContentLoaded", () => {
    initAuth();
    initAdminGlobalHandlers();
    initBatchHandlers();

    // Attach search handlers
    document.getElementById("catalog-search")?.addEventListener("input", renderCatalog);
    document.getElementById("catalog-location-filter")?.addEventListener("change", renderCatalog);

    // Database Listeners
    onValue(ref(db, 'locations'), (snapshot) => {
        state.cachedLocations = snapshot.val() || {};
        renderCatalog();
        runOptimization();
    });

    onValue(ref(db, 'ingredients'), (snapshot) => {
        state.cachedIngredients = snapshot.val() || {};
        renderCatalog();
        runOptimization();
    });

    onValue(ref(db, 'recipes'), (snapshot) => {
        state.cachedRecipes = snapshot.val() || {};
        runOptimization();
    });

    onValue(ref(db, 'prices'), (snapshot) => {
        state.cachedPrices = snapshot.val() || {};
        renderCatalog();
        runOptimization();
    });
});