// Reports & Analytics Module
class ReportsManager {
    constructor() {
        this.init();
    }

    init() {
        document.querySelectorAll('[data-tab="general-report"], [data-tab="category-report"], [data-tab="item-report"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                UIHelper.showTab(e.target.dataset.tab);
                if (e.target.dataset.tab === 'general-report') {
                    this.loadGeneralReport();
                } else if (e.target.dataset.tab === 'category-report') {
                    this.loadCategoryReport();
                } else if (e.target.dataset.tab === 'item-report') {
                    this.loadItemReport();
                }
            });
        });

        const screen = document.getElementById('reports-screen');
        if (screen) {
            const observer = new MutationObserver(() => {
                if (screen.classList.contains('active')) {
                    this.loadGeneralReport();
                    this.updateDashboard();
                }
            });
            observer.observe(screen, { attributes: true, attributeFilter: ['class'] });
        }
    }

    async updateDashboard() {
        const transactions = await storage.getAll('transactions');
        const products = await storage.getAll('products');
        const exchangeRates = await storage.getAll('exchange_rates');
        const baseRate = exchangeRates.find(r => r.isBase) || exchangeRates[0];

        let totalProfit = 0;
        let totalCost = 0;
        let totalPaid = 0;
        let totalSales = 0;

        transactions.forEach(transaction => {
            const rate = exchangeRates.find(r => r.id === transaction.currencyId);
            const convertedAmount = rate ? transaction.amount * (rate.rate / baseRate.rate) : transaction.amount;

            if (transaction.type === 'sale') {
                totalSales += convertedAmount;
                if (transaction.productId) {
                    const product = products.find(p => p.id === transaction.productId);
                    if (product) {
                        const profit = (transaction.amount / transaction.quantity) - product.costPrice;
                        totalProfit += profit * transaction.quantity * (rate.rate / baseRate.rate);
                    }
                }
            } else if (transaction.type === 'purchase') {
                totalCost += convertedAmount;
            } else if (transaction.type === 'expense') {
                totalPaid += convertedAmount;
            }
        });

        document.getElementById('total-profit').textContent = totalProfit.toFixed(2);
        document.getElementById('total-cost').textContent = totalCost.toFixed(2);
        document.getElementById('total-paid').textContent = totalPaid.toFixed(2);
        document.getElementById('total-sales').textContent = totalSales.toFixed(2);
    }

    async loadGeneralReport() {
        const transactions = await storage.getAll('transactions');
        const products = await storage.getAll('products');
        const exchangeRates = await storage.getAll('exchange_rates');
        const baseRate = exchangeRates.find(r => r.isBase) || exchangeRates[0];

        let totalProfit = 0;
        let totalCost = 0;
        let totalPaid = 0;
        let totalSales = 0;
        let totalReceived = 0;

        transactions.forEach(transaction => {
            const rate = exchangeRates.find(r => r.id === transaction.currencyId);
            const convertedAmount = rate ? transaction.amount * (rate.rate / baseRate.rate) : transaction.amount;

            if (transaction.type === 'sale') {
                totalSales += convertedAmount;
                if (transaction.productId) {
                    const product = products.find(p => p.id === transaction.productId);
                    if (product) {
                        const profit = (transaction.amount / transaction.quantity) - product.costPrice;
                        totalProfit += profit * transaction.quantity * (rate.rate / baseRate.rate);
                    }
                }
            } else if (transaction.type === 'purchase') {
                totalCost += convertedAmount;
            } else if (transaction.type === 'expense') {
                totalPaid += convertedAmount;
            } else if (transaction.type === 'payment_received') {
                totalReceived += convertedAmount;
            }
        });

        const content = `
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>إجمالي الربح</h3>
                    <p class="stat-value">${totalProfit.toFixed(2)}</p>
                </div>
                <div class="stat-card">
                    <h3>إجمالي التكلفة</h3>
                    <p class="stat-value">${totalCost.toFixed(2)}</p>
                </div>
                <div class="stat-card">
                    <h3>إجمالي المبيعات</h3>
                    <p class="stat-value">${totalSales.toFixed(2)}</p>
                </div>
                <div class="stat-card">
                    <h3>إجمالي المصروفات</h3>
                    <p class="stat-value">${totalPaid.toFixed(2)}</p>
                </div>
                <div class="stat-card">
                    <h3>إجمالي المستلم</h3>
                    <p class="stat-value">${totalReceived.toFixed(2)}</p>
                </div>
                <div class="stat-card">
                    <h3>صافي الربح</h3>
                    <p class="stat-value">${(totalProfit - totalPaid).toFixed(2)}</p>
                </div>
            </div>
        `;

        document.getElementById('general-report-content').innerHTML = content;
    }

    async loadCategoryReport() {
        const categories = await storage.getAll('categories');
        const products = await storage.getAll('products');
        const transactions = await storage.getAll('transactions');
        const exchangeRates = await storage.getAll('exchange_rates');
        const baseRate = exchangeRates.find(r => r.isBase) || exchangeRates[0];

        const categoryStats = categories.map(category => {
            const categoryProducts = products.filter(p => p.categoryId === category.id);
            let categoryProfit = 0;
            let categorySales = 0;
            let stockValue = 0;

            categoryProducts.forEach(product => {
                stockValue += product.costPrice * product.stock;
                
                const productTransactions = transactions.filter(t => 
                    t.productId === product.id && t.type === 'sale'
                );

                productTransactions.forEach(transaction => {
                    const rate = exchangeRates.find(r => r.id === transaction.currencyId);
                    const convertedAmount = rate ? transaction.amount * (rate.rate / baseRate.rate) : transaction.amount;
                    categorySales += convertedAmount;
                    
                    const profit = (transaction.amount / transaction.quantity) - product.costPrice;
                    categoryProfit += profit * transaction.quantity * (rate.rate / baseRate.rate);
                });
            });

            return {
                category,
                profit: categoryProfit,
                sales: categorySales,
                stockValue,
                productCount: categoryProducts.length
            };
        });

        const content = `
            <div class="list-container">
                ${categoryStats.map(stat => `
                    <div class="list-item">
                        <div class="list-item-info">
                            <h4>${stat.category.name}</h4>
                            <p>عدد المنتجات: ${stat.productCount}</p>
                            <p>الربح: ${stat.profit.toFixed(2)}</p>
                            <p>المبيعات: ${stat.sales.toFixed(2)}</p>
                            <p>قيمة المخزون: ${stat.stockValue.toFixed(2)}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        document.getElementById('category-report-content').innerHTML = content;
    }

    async loadItemReport() {
        const products = await storage.getAll('products');
        const categories = await storage.getAll('categories');
        const transactions = await storage.getAll('transactions');
        const exchangeRates = await storage.getAll('exchange_rates');
        const baseRate = exchangeRates.find(r => r.isBase) || exchangeRates[0];

        const itemStats = products.map(product => {
            const category = categories.find(c => c.id === product.categoryId);
            let totalCost = 0;
            let totalSales = 0;
            let profit = 0;
            let quantitySold = 0;

            const productTransactions = transactions.filter(t => t.productId === product.id);
            
            productTransactions.forEach(transaction => {
                const rate = exchangeRates.find(r => r.id === transaction.currencyId);
                const convertedAmount = rate ? transaction.amount * (rate.rate / baseRate.rate) : transaction.amount;

                if (transaction.type === 'sale') {
                    totalSales += convertedAmount;
                    quantitySold += transaction.quantity;
                    profit += (transaction.amount / transaction.quantity - product.costPrice) * transaction.quantity * (rate.rate / baseRate.rate);
                } else if (transaction.type === 'purchase') {
                    totalCost += convertedAmount;
                }
            });

            return {
                product,
                category: category?.name || 'غير محدد',
                totalCost,
                totalSales,
                profit,
                quantitySold,
                stock: product.stock
            };
        });

        const content = `
            <div class="list-container">
                ${itemStats.map(stat => `
                    <div class="list-item">
                        <div class="list-item-info">
                            <h4>${stat.product.name} - ${stat.product.brand}</h4>
                            <p>الفئة: ${stat.category}</p>
                            <p>إجمالي التكلفة: ${stat.totalCost.toFixed(2)}</p>
                            <p>إجمالي المبيعات: ${stat.totalSales.toFixed(2)}</p>
                            <p>الربح: ${stat.profit.toFixed(2)}</p>
                            <p>الكمية المباعة: ${stat.quantitySold}</p>
                            <p>المخزون الحالي: ${stat.stock}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        document.getElementById('item-report-content').innerHTML = content;
    }
}

const reports = new ReportsManager();
