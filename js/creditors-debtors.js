// Creditors & Debtors Management Module
class CreditorsDebtorsManager {
    constructor() {
        this.init();
    }

    init() {
        document.getElementById('add-party-btn')?.addEventListener('click', () => this.showPartyModal());
        
        document.querySelectorAll('[data-tab="debtors"], [data-tab="creditors"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                UIHelper.showTab(e.target.dataset.tab);
                if (e.target.dataset.tab === 'debtors') {
                    this.loadDebtors();
                } else if (e.target.dataset.tab === 'creditors') {
                    this.loadCreditors();
                }
            });
        });

        const screen = document.getElementById('creditors-debtors-screen');
        if (screen) {
            const observer = new MutationObserver(() => {
                if (screen.classList.contains('active')) {
                    this.loadDebtors();
                    this.loadCreditors();
                }
            });
            observer.observe(screen, { attributes: true, attributeFilter: ['class'] });
        }
    }

    async loadDebtors() {
        const parties = await storage.getAll('creditors_debtors');
        const debtors = parties.filter(p => p.type === 'debtor');
        const container = document.getElementById('debtors-list');
        container.innerHTML = '';

        if (debtors.length === 0) {
            container.innerHTML = '<p>لا يوجد مدينون</p>';
            return;
        }

        debtors.forEach(party => {
            const balanceClass = (party.balance || 0) > 0 ? 'balance-positive' : '';
            
            const item = UIHelper.createListItem({
                id: party.id,
                content: `
                    <h4>${party.name}</h4>
                    <p>${party.phone || ''} ${party.address || ''}</p>
                    <p class="${balanceClass}">الرصيد: ${party.balance || 0}</p>
                `
            }, [
                { name: 'view', label: 'عرض التفاصيل', type: 'info' },
                { name: 'payment', label: 'تسجيل دفعة', type: 'success' },
                { name: 'edit', label: 'تعديل', type: 'info' },
                { name: 'delete', label: 'حذف', type: 'danger' }
            ]);

            item.querySelector('[data-action="view"]').onclick = () => this.showPartyDetails(party);
            item.querySelector('[data-action="payment"]').onclick = () => this.showPaymentModal(party);
            item.querySelector('[data-action="edit"]').onclick = () => this.showPartyModal(party);
            item.querySelector('[data-action="delete"]').onclick = () => this.deleteParty(party.id);
            container.appendChild(item);
        });
    }

    async loadCreditors() {
        const parties = await storage.getAll('creditors_debtors');
        const creditors = parties.filter(p => p.type === 'creditor');
        const container = document.getElementById('creditors-list');
        container.innerHTML = '';

        if (creditors.length === 0) {
            container.innerHTML = '<p>لا يوجد دائنون</p>';
            return;
        }

        creditors.forEach(party => {
            const balance = party.balance || 0;
            const balanceClass = balance < 0 ? 'balance-negative' : '';
            
            const item = UIHelper.createListItem({
                id: party.id,
                content: `
                    <h4>${party.name}</h4>
                    <p>${party.phone || ''} ${party.address || ''}</p>
                    <p class="${balanceClass}">الرصيد: ${Math.abs(balance)}</p>
                `
            }, [
                { name: 'view', label: 'عرض التفاصيل', type: 'info' },
                { name: 'payment', label: 'تسجيل دفعة', type: 'success' },
                { name: 'edit', label: 'تعديل', type: 'info' },
                { name: 'delete', label: 'حذف', type: 'danger' }
            ]);

            item.querySelector('[data-action="view"]').onclick = () => this.showPartyDetails(party);
            item.querySelector('[data-action="payment"]').onclick = () => this.showPaymentModal(party);
            item.querySelector('[data-action="edit"]').onclick = () => this.showPartyModal(party);
            item.querySelector('[data-action="delete"]').onclick = () => this.deleteParty(party.id);
            container.appendChild(item);
        });
    }

    showPartyModal(party = null) {
        const content = `
            <h3>${party ? 'تعديل طرف' : 'إضافة طرف'}</h3>
            <form id="party-form">
                <div class="form-group">
                    <label for="party-name">الاسم:</label>
                    <input type="text" id="party-name" value="${party?.name || ''}" required>
                </div>
                <div class="form-group">
                    <label for="party-type">النوع:</label>
                    <select id="party-type" required>
                        <option value="debtor" ${party?.type === 'debtor' ? 'selected' : ''}>مدين</option>
                        <option value="creditor" ${party?.type === 'creditor' ? 'selected' : ''}>دائن</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="party-phone">الهاتف:</label>
                    <input type="text" id="party-phone" value="${party?.phone || ''}">
                </div>
                <div class="form-group">
                    <label for="party-address">العنوان:</label>
                    <textarea id="party-address" rows="2">${party?.address || ''}</textarea>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" onclick="UIHelper.hideModal()">إلغاء</button>
                    <button type="submit" class="btn btn-primary">حفظ</button>
                </div>
            </form>
        `;
        UIHelper.showModal(content);

        document.getElementById('party-form').onsubmit = async (e) => {
            e.preventDefault();
            const partyData = {
                name: document.getElementById('party-name').value,
                type: document.getElementById('party-type').value,
                phone: document.getElementById('party-phone').value,
                address: document.getElementById('party-address').value,
                balance: party?.balance || 0
            };

            if (party) {
                partyData.id = party.id;
                await storage.update('creditors_debtors', partyData);
                UIHelper.showToast('تم تحديث الطرف بنجاح', 'success');
            } else {
                await storage.add('creditors_debtors', partyData);
                UIHelper.showToast('تم إضافة الطرف بنجاح', 'success');
            }
            
            UIHelper.hideModal();
            this.loadDebtors();
            this.loadCreditors();
        };
    }

    async showPaymentModal(party) {
        const exchangeRates = await storage.getAll('exchange_rates');
        const currencyOptions = exchangeRates.map(r => 
            `<option value="${r.id}">${r.name} (${r.symbol})</option>`
        ).join('');

        const content = `
            <h3>تسجيل دفعة - ${party.name}</h3>
            <form id="payment-form">
                <div class="form-group">
                    <label for="payment-amount">المبلغ:</label>
                    <input type="number" id="payment-amount" step="0.01" required>
                </div>
                <div class="form-group">
                    <label for="payment-currency">العملة:</label>
                    <select id="payment-currency" required>
                        ${currencyOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label for="payment-description">الوصف:</label>
                    <textarea id="payment-description" rows="3"></textarea>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" onclick="UIHelper.hideModal()">إلغاء</button>
                    <button type="submit" class="btn btn-success">حفظ</button>
                </div>
            </form>
        `;
        UIHelper.showModal(content);

        document.getElementById('payment-form').onsubmit = async (e) => {
            e.preventDefault();
            await this.processPayment(party);
        };
    }

    async processPayment(party) {
        const amount = parseFloat(document.getElementById('payment-amount').value);
        const currencyId = parseInt(document.getElementById('payment-currency').value);
        const description = document.getElementById('payment-description').value;

        // Update party balance
        if (party.type === 'debtor') {
            party.balance = (party.balance || 0) - amount;
        } else {
            party.balance = (party.balance || 0) + amount;
        }
        await storage.update('creditors_debtors', party);

        // Create transaction
        const transaction = {
            type: party.type === 'debtor' ? 'payment_received' : 'payment_paid',
            amount,
            currencyId,
            partyId: party.id,
            partyName: party.name,
            description,
            date: new Date().toISOString()
        };

        await storage.add('transactions', transaction);
        UIHelper.showToast('تم تسجيل الدفعة بنجاح', 'success');
        UIHelper.hideModal();
        this.loadDebtors();
        this.loadCreditors();
    }

    async showPartyDetails(party) {
        const transactions = await storage.getAll('transactions');
        const partyTransactions = transactions.filter(t => t.partyId === party.id)
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        const transactionsHtml = partyTransactions.map(t => `
            <div class="list-item transaction-item ${t.type}">
                <div class="list-item-info">
                    <h4>${t.type === 'sale' ? 'بيع' : t.type === 'purchase' ? 'شراء' : t.type === 'payment_received' ? 'دفعة مستلمة' : 'دفعة مدفوعة'}</h4>
                    <p>المبلغ: ${t.amount}</p>
                    <p>التاريخ: ${UIHelper.formatDate(t.date)}</p>
                    ${t.description ? `<p>${t.description}</p>` : ''}
                </div>
            </div>
        `).join('');

        const content = `
            <h3>تفاصيل ${party.name}</h3>
            <div class="party-details">
                <p><strong>النوع:</strong> ${party.type === 'debtor' ? 'مدين' : 'دائن'}</p>
                ${party.phone ? `<p><strong>الهاتف:</strong> ${party.phone}</p>` : ''}
                ${party.address ? `<p><strong>العنوان:</strong> ${party.address}</p>` : ''}
                <p><strong>الرصيد:</strong> <span class="${party.balance > 0 ? 'balance-positive' : 'balance-negative'}">${party.balance || 0}</span></p>
            </div>
            <h4 style="margin-top: 1.5rem;">سجل المعاملات</h4>
            <div class="list-container">
                ${partyTransactions.length > 0 ? transactionsHtml : '<p>لا توجد معاملات</p>'}
            </div>
            <div class="modal-actions">
                <button type="button" class="btn btn-secondary" onclick="UIHelper.hideModal()">إغلاق</button>
            </div>
        `;
        UIHelper.showModal(content);
    }

    async deleteParty(id) {
        const confirmed = await UIHelper.confirm('هل أنت متأكد من حذف هذا الطرف؟');
        if (confirmed) {
            // Check if party has transactions
            const transactions = await storage.getAll('transactions');
            const hasTransactions = transactions.some(t => t.partyId === id);
            
            if (hasTransactions) {
                UIHelper.showToast('لا يمكن حذف الطرف لأنه لديه معاملات', 'error');
                return;
            }

            await storage.delete('creditors_debtors', id);
            UIHelper.showToast('تم حذف الطرف بنجاح', 'success');
            this.loadDebtors();
            this.loadCreditors();
        }
    }
}

const creditorsDebtors = new CreditorsDebtorsManager();
