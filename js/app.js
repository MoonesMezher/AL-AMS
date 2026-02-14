// Main Application Controller
class App {
    constructor() {
        this.init();
    }

    async init() {
        // Show loading indicator
        const loadingEl = document.getElementById('app-loading');
        if (loadingEl) {
            loadingEl.style.display = 'flex';
        }
        
        // Register service worker
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered');
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }

        // Initialize storage (auth.init will handle showing the correct screen)
        await storage.init();
        await storage.initializeDefaultData();

        // Setup navigation
        this.setupNavigation();

        // Setup login form
        document.getElementById('login-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            await auth.login(email, password);
        });

        // Setup logout
        document.getElementById('logout-btn')?.addEventListener('click', () => {
            auth.logout();
        });

        // Update dashboard when shown
        const dashboardScreen = document.getElementById('dashboard-screen');
        if (dashboardScreen) {
            const observer = new MutationObserver(() => {
                if (dashboardScreen.classList.contains('active')) {
                    reports.updateDashboard();
                }
            });
            observer.observe(dashboardScreen, { attributes: true, attributeFilter: ['class'] });
        }

        // Close modal on overlay click
        document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
            if (e.target.id === 'modal-overlay') {
                UIHelper.hideModal();
            }
        });
    }

    setupNavigation() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const screen = e.target.dataset.screen;
                if (auth.isAuthenticated()) {
                    UIHelper.showScreen(screen);
                }
            });
        });
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new App();
    });
} else {
    new App();
}
