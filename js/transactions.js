// Transactions Management Module
class TransactionManager {
    constructor() {
        this.init();
    }

    init() {
        const addSaleBtn = document.getElementById('add-sale-btn');
        if (addSaleBtn) addSaleBtn.addEventListener('click', () => this.showSaleModal());

        const addPurchaseBtn = document.getElementById('add-purchase-btn');
        if (addPurchaseBtn) addPurchaseBtn.addEventListener('click', () => this.showPurchaseModal());

        const addExpenseBtn = document.getElementById('add-expense-btn');
        if (addExpenseBtn) addExpenseBtn.addEventListener('click', () => this.showExpenseModal());

        const dateFilter = document.getElementById('transaction-date-filter');
        if (dateFilter) dateFilter.addEventListener('change', () => this.loadTransactions());

        const typeFilter = document.getElementById('transaction-type-filter');
        if (typeFilter) typeFilter.addEventListener('change', () => this.loadTransactions());

        const transactionsScreen = document.getElementById('transactions-screen');
        if (transactionsScreen) {
            const observer = new MutationObserver(() => {
                if (transactionsScreen.classList.contains('active')) {
                    this.loadTransactions();
                }
            });
            observer.observe(transactionsScreen, { attributes: true, attributeFilter: ['class'] });
        }
    }

    async loadTransactions() {
            const transactions = await storage.getAll('transactions');
            const products = await storage.getAll('products');
            const exchangeRates = await storage.getAll('exchange_rates');

            const dateFilterEl = document.getElementById('transaction-date-filter');
            const typeFilterEl = document.getElementById('transaction-type-filter');
            const dateFilter = dateFilterEl ? dateFilterEl.value : '';
            const typeFilter = typeFilterEl ? typeFilterEl.value : '';

            let filtered = transactions;

            if (dateFilter) {
                filtered = filtered.filter(t => t.date.startsWith(dateFilter));
            }

            if (typeFilter) {
                filtered = filtered.filter(t => t.type === typeFilter);
            }

            // Sort by date (newest first)
            filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

            const container = document.getElementById('transactions-list');
            container.innerHTML = '';

            if (filtered.length === 0) {
                container.innerHTML = '<p>لا توجد معاملات</p>';
                return;
            }

            filtered.forEach(transaction => {
                        const rate = exchangeRates.find(r => r.id === transaction.currencyId);
                        const product = transaction.productId ? products.find(p => p.id === transaction.productId) : null;

                        const typeLabels = {
                            sale: 'بيع',
                            purchase: 'شراء',
                            expense: 'مصروف'
                        };

                        const typeColors = {
                            sale: 'success',
                            purchase: 'info',
                            expense: 'warning'
                        };

                        const item = UIHelper.createListItem({
                                    id: transaction.id,
                                    content: `
                    <h4>${typeLabels[transaction.type] || transaction.type}</h4>
                    ${product ? `<p>المنتج: ${product.name}</p>` : ''}
                    <p>المبلغ: ${transaction.amount} ${rate?.symbol || ''}</p>
                    ${transaction.quantity ? `<p>الكمية: ${transaction.quantity}</p>` : ''}
                    <p>التاريخ: ${UIHelper.formatDate(transaction.date)}</p>
                    ${transaction.description ? `<p>الوصف: ${transaction.description}</p>` : ''}
                    ${transaction.partyId ? `<p>الطرف: ${transaction.partyName || ''}</p>` : ''}
                `
            }, [
                { name: 'delete', label: 'حذف', type: 'danger' }
            ]);

            item.classList.add('transaction-item', transaction.type);
            item.querySelector('[data-action="delete"]').onclick = () => this.deleteTransaction(transaction.id);
            container.appendChild(item);
        });
    }

    async showSaleModal() {
        const products = await storage.getAll('products');
        const exchangeRates = await storage.getAll('exchange_rates');
        const parties = await storage.getAll('creditors_debtors');

        const productOptions = products.map(p => 
            `<option value="${p.id}" data-price="${p.sellingPrice}">${p.name} - ${p.brand} (المخزون: ${p.stock})</option>`
        ).join('');

        const currencyOptions = exchangeRates.map(r => 
            `<option value="${r.id}">${r.name} (${r.symbol})</option>`
        ).join('');

        const partyOptions = parties.filter(p => p.type === 'debtor').map(p => 
            `<option value="${p.id}">${p.name}</option>`
        ).join('');

        const content = `
            <h3>إضافة عملية بيع</h3>
            <form id="sale-form">
                <div class="form-group">
                    <label for="sale-product">المنتج:</label>
                    <select id="sale-product" required>
                        <option value="">اختر المنتج</option>
                        ${productOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label for="sale-quantity">الكمية:</label>
                    <input type="number" id="sale-quantity" min="1" value="1" required>
                </div>
                <div class="form-group">
                    <label for="sale-amount">المبلغ:</label>
                    <input type="number" id="sale-amount" step="0.01" required>
                </div>
                <div class="form-group">
                    <label for="sale-currency">العملة:</label>
                    <select id="sale-currency" required>
                        ${currencyOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label for="sale-party">العميل (اختياري):</label>
                    <select id="sale-party">
                        <option value="">نقدي</option>
                        ${partyOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label for="sale-description">الوصف:</label>
                    <textarea id="sale-description" rows="3"></textarea>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" onclick="UIHelper.hideModal()">إلغاء</button>
                    <button type="submit" class="btn btn-success">حفظ</button>
                </div>
            </form>
        `;
        UIHelper.showModal(content);

        // Auto-fill amount when product selected
        document.getElementById('sale-product').addEventListener('change', (e) => {
            const option = e.target.options[e.target.selectedIndex];
            const price = option.dataset.price;
            if (price) {
                document.getElementById('sale-amount').value = price;
            }
        });

        document.getElementById('sale-form').onsubmit = async (e) => {
            e.preventDefault();
            await this.processSale();
        };
    }

    async processSale() {
        const productId = parseInt(document.getElementById('sale-product').value);
        const quantity = parseInt(document.getElementById('sale-quantity').value);
        const amount = parseFloat(document.getElementById('sale-amount').value);
        const currencyId = parseInt(document.getElementById('sale-currency').value);
        const partyId = document.getElementById('sale-party').value ? parseInt(document.getElementById('sale-party').value) : null;
        const description = document.getElementById('sale-description').value;

        const product = await storage.getById('products', productId);
        
        if (product.stock < quantity) {
            UIHelper.showToast('المخزون غير كافي', 'error');
            return;
        }

        // Update product stock
        product.stock -= quantity;
        await storage.update('products', product);

        // Get party name if exists
        let partyName = null;
        if (partyId) {
            const party = await storage.getById('creditors_debtors', partyId);
            partyName = party.name;
            // Update party balance
            party.balance = (party.balance || 0) + amount;
            await storage.update('creditors_debtors', party);
        }

        // Create transaction
        const transaction = {
            type: 'sale',
            productId,
            quantity,
            amount,
            currencyId,
            partyId,
            partyName,
            description,
            date: new Date().toISOString()
        };

        await storage.add('transactions', transaction);
        UIHelper.showToast('تم تسجيل عملية البيع بنجاح', 'success');
        UIHelper.hideModal();
        this.loadTransactions();
    }

    async showPurchaseModal() {
        const products = await storage.getAll('products');
        const exchangeRates = await storage.getAll('exchange_rates');
        const parties = await storage.getAll('creditors_debtors');

        const productOptions = products.map(p => 
            `<option value="${p.id}">${p.name} - ${p.brand}</option>`
        ).join('');

        const currencyOptions = exchangeRates.map(r => 
            `<option value="${r.id}">${r.name} (${r.symbol})</option>`
        ).join('');

        const partyOptions = parties.filter(p => p.type === 'creditor').map(p => 
            `<option value="${p.id}">${p.name}</option>`
        ).join('');

        const content = `
            <h3>إضافة عملية شراء</h3>
            <form id="purchase-form">
                <div class="form-group">
                    <label for="purchase-product">المنتج:</label>
                    <select id="purchase-product" required>
                        <option value="">اختر المنتج</option>
                        ${productOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label for="purchase-quantity">الكمية:</label>
                    <input type="number" id="purchase-quantity" min="1" value="1" required>
                </div>
                <div class="form-group">
                    <label for="purchase-amount">المبلغ:</label>
                    <input type="number" id="purchase-amount" step="0.01" required>
                </div>
                <div class="form-group">
                    <label for="purchase-currency">العملة:</label>
                    <select id="purchase-currency" required>
                        ${currencyOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label for="purchase-party">المورد (اختياري):</label>
                    <select id="purchase-party">
                        <option value="">نقدي</option>
                        ${partyOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label for="purchase-description">الوصف:</label>
                    <textarea id="purchase-description" rows="3"></textarea>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" onclick="UIHelper.hideModal()">إلغاء</button>
                    <button type="submit" class="btn btn-info">حفظ</button>
                </div>
            </form>
        `;
        UIHelper.showModal(content);

        document.getElementById('purchase-form').onsubmit = async (e) => {
            e.preventDefault();
            await this.processPurchase();
        };
    }

    async processPurchase() {
        const productId = parseInt(document.getElementById('purchase-product').value);
        const quantity = parseInt(document.getElementById('purchase-quantity').value);
        const amount = parseFloat(document.getElementById('purchase-amount').value);
        const currencyId = parseInt(document.getElementById('purchase-currency').value);
        const partyId = document.getElementById('purchase-party').value ? parseInt(document.getElementById('purchase-party').value) : null;
        const description = document.getElementById('purchase-description').value;

        const product = await storage.getById('products', productId);
        
        // Update product stock
        product.stock += quantity;
        // Update cost price if needed
        if (amount / quantity < product.costPrice || product.costPrice === 0) {
            product.costPrice = amount / quantity;
        }
        await storage.update('products', product);

        // Get party name if exists
        let partyName = null;
        if (partyId) {
            const party = await storage.getById('creditors_debtors', partyId);
            partyName = party.name;
            // Update party balance
            party.balance = (party.balance || 0) - amount;
            await storage.update('creditors_debtors', party);
        }

        // Create transaction
        const transaction = {
            type: 'purchase',
            productId,
            quantity,
            amount,
            currencyId,
            partyId,
            partyName,
            description,
            date: new Date().toISOString()
        };

        await storage.add('transactions', transaction);
        UIHelper.showToast('تم تسجيل عملية الشراء بنجاح', 'success');
        UIHelper.hideModal();
        this.loadTransactions();
    }

    async showExpenseModal() {
        const exchangeRates = await storage.getAll('exchange_rates');

        const currencyOptions = exchangeRates.map(r => 
            `<option value="${r.id}">${r.name} (${r.symbol})</option>`
        ).join('');

        const content = `
            <h3>إضافة مصروف</h3>
            <form id="expense-form">
                <div class="form-group">
                    <label for="expense-amount">المبلغ:</label>
                    <input type="number" id="expense-amount" step="0.01" required>
                </div>
                <div class="form-group">
                    <label for="expense-currency">العملة:</label>
                    <select id="expense-currency" required>
                        ${currencyOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label for="expense-description">الوصف:</label>
                    <textarea id="expense-description" rows="3" required></textarea>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" onclick="UIHelper.hideModal()">إلغاء</button>
                    <button type="submit" class="btn btn-warning">حفظ</button>
                </div>
            </form>
        `;
        UIHelper.showModal(content);

        document.getElementById('expense-form').onsubmit = async (e) => {
            e.preventDefault();
            await this.processExpense();
        };
    }

    async processExpense() {
        const amount = parseFloat(document.getElementById('expense-amount').value);
        const currencyId = parseInt(document.getElementById('expense-currency').value);
        const description = document.getElementById('expense-description').value;

        const transaction = {
            type: 'expense',
            amount,
            currencyId,
            description,
            date: new Date().toISOString()
        };

        await storage.add('transactions', transaction);
        UIHelper.showToast('تم تسجيل المصروف بنجاح', 'success');
        UIHelper.hideModal();
        this.loadTransactions();
    }

    async deleteTransaction(id) {
        const confirmed = await UIHelper.confirm('هل أنت متأكد من حذف هذه المعاملة؟');
        if (confirmed) {
            const transaction = await storage.getById('transactions', id);
            
            // Reverse stock changes for sales/purchases
            if (transaction.type === 'sale' && transaction.productId) {
                const product = await storage.getById('products', transaction.productId);
                product.stock += transaction.quantity;
                await storage.update('products', product);
            } else if (transaction.type === 'purchase' && transaction.productId) {
                const product = await storage.getById('products', transaction.productId);
                product.stock -= transaction.quantity;
                await storage.update('products', product);
            }

            // Reverse party balance changes
            if (transaction.partyId) {
                const party = await storage.getById('creditors_debtors', transaction.partyId);
                if (transaction.type === 'sale') {
                    party.balance -= transaction.amount;
                } else if (transaction.type === 'purchase') {
                    party.balance += transaction.amount;
                }
                await storage.update('creditors_debtors', party);
            }

            await storage.delete('transactions', id);
            UIHelper.showToast('تم حذف المعاملة بنجاح', 'success');
            this.loadTransactions();
        }
    }
}

const transactions = new TransactionManager();