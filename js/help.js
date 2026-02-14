// Help/Instructions Module
class HelpManager {
    constructor() {
        this.init();
    }

    init() {
        const helpScreen = document.getElementById('help-screen');
        if (helpScreen) {
            const observer = new MutationObserver(() => {
                if (helpScreen.classList.contains('active')) {
                    // Help content is static in HTML, no need to load anything
                }
            });
            observer.observe(helpScreen, { attributes: true, attributeFilter: ['class'] });
        }
    }
}

const help = new HelpManager();
