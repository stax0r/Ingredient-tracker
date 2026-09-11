document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("footer-custom-content");
    if (!container) return;

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://cdnjs.buymeacoffee.com/1.0.0/button.prod.min.js";
    script.setAttribute("data-name", "bmc-button");
    script.setAttribute("data-slug", "stax0r");
    script.setAttribute("data-color", "#000000");
    script.setAttribute("data-emoji", "🍺");
    script.setAttribute("data-font", "Poppins");
    script.setAttribute("data-text", "Buy me a beer");
    script.setAttribute("data-outline-color", "#ffffff");
    script.setAttribute("data-font-color", "#ffffff");
    script.setAttribute("data-coffee-color", "#FFDD00");

    container.appendChild(script);
});