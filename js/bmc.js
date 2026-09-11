document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("footer-custom-content");
    if (!container) return;

    container.innerHTML = `
        <a href="https://www.buymeacoffee.com/stax0r" target="_blank" rel="noopener noreferrer" class="inline-flex items-center hover:opacity-90 transition-opacity">
            <img src="https://img.buymeacoffee.com/button-api/?text=Buy me a beer&emoji=🍺&slug=stax0r&button_colour=7f1d1d&font_colour=ffffff&font_family=Poppins&outline_colour=ffffff&coffee_colour=FFDD00" alt="Buy me a beer" class="h-9 w-auto" />
        </a>
    `;
});