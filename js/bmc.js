document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("footer-custom-content");
    if (!container) return;

    // Direct link button element styled to match the Buy Me a Coffee widget
    const link = document.createElement("a");
    link.href = "https://www.buymeacoffee.com/stax0r";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = "inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg text-xs font-semibold border border-white hover:bg-zinc-800 transition shadow-md";
    link.innerHTML = `<span>🍺</span> <span>Buy me a beer</span>`;

    container.appendChild(link);
});