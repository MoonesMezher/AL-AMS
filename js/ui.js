// UI Helper Functions
class UIHelper {
    static showScreen(screenId) {
        // Hide loading indicator
        const loadingEl = document.getElementById('app-loading');
        if (loadingEl) {
            loadingEl.style.display = 'none';
        }
        
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Show target screen
        const targetScreen = document.getElementById(screenId + '-screen');
        if (targetScreen) {
            targetScreen.classList.add('active');
        }
        
        // Update nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.screen === screenId) {
                btn.classList.add('active');
            }
        });
    }

    static showTab(tabId) {
        // Hide all tabs in current screen
        const currentScreen = document.querySelector('.screen.active');
        currentScreen.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        currentScreen.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Show selected tab
        const tabContent = document.getElementById(tabId + '-tab');
        const tabBtn = currentScreen.querySelector(`[data-tab="${tabId}"]`);
        if (tabContent) tabContent.classList.add('active');
        if (tabBtn) tabBtn.classList.add('active');
    }

    static showModal(content) {
        const modal = document.getElementById('modal-content');
        modal.innerHTML = content;
        document.getElementById('modal-overlay').classList.add('active');
    }

    static hideModal() {
        document.getElementById('modal-overlay').classList.remove('active');
    }

    static showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    static formatCurrency(amount, currency = '') {
        return new Intl.NumberFormat('ar-SA', {
            style: 'currency',
            currency: currency || 'USD'
        }).format(amount);
    }

    // Convert between old and new Syrian pounds
    static async convertCurrency(amount, fromCurrencyId, toCurrencyId) {
        const exchangeRates = await storage.getAll('exchange_rates');
        const fromRate = exchangeRates.find(r => r.id === fromCurrencyId);
        const toRate = exchangeRates.find(r => r.id === toCurrencyId);

        if (!fromRate || !toRate) return amount;

        // Special handling for old/new Syrian pounds
        const isFromOldSP = fromRate.symbol === 'OSP';
        const isToNewSP = toRate.symbol === 'NSP';
        const isFromNewSP = fromRate.symbol === 'NSP';
        const isToOldSP = toRate.symbol === 'OSP';

        if (isFromOldSP && isToNewSP) {
            // 1000 old = 10 new, so divide by 100
            return amount / 100;
        } else if (isFromNewSP && isToOldSP) {
            // 10 new = 1000 old, so multiply by 100
            return amount * 100;
        }

        // Normal conversion through base currency
        const baseRate = exchangeRates.find(r => r.isBase) || exchangeRates[0];
        const amountInBase = amount * (fromRate.rate / baseRate.rate);
        return amountInBase / (toRate.rate / baseRate.rate);
    }

    static formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-SA');
    }

    static createListItem(item, actions = []) {
            const div = document.createElement('div');
            div.className = 'list-item';
            div.innerHTML = `
            <div class="list-item-info">
                ${item.content}
            </div>
            <div class="list-item-actions">
                ${actions.map(action => 
                    `<button class="btn btn-${action.type} btn-small" data-action="${action.name}" data-id="${item.id}">${action.label}</button>`
                ).join('')}
            </div>
        `;
        return div;
    }

    static confirm(message) {
        return new Promise((resolve) => {
            const content = `
                <h3>تأكيد</h3>
                <p>${message}</p>
                <div class="modal-actions">
                    <button class="btn btn-secondary" id="confirm-cancel">إلغاء</button>
                    <button class="btn btn-danger" id="confirm-ok">تأكيد</button>
                </div>
            `;
            this.showModal(content);
            
            document.getElementById('confirm-ok').onclick = () => {
                this.hideModal();
                resolve(true);
            };
            document.getElementById('confirm-cancel').onclick = () => {
                this.hideModal();
                resolve(false);
            };
        });
    }
}