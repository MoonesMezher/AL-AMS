// Inventory Management Module
class InventoryManager {
    constructor() {
        this.init();
    }

    init() {
        // Category events
        const addCategoryBtn = document.getElementById('add-category-btn');
        if (addCategoryBtn) addCategoryBtn.addEventListener('click', () => this.showCategoryModal());

        // Product events
        const addProductBtn = document.getElementById('add-product-btn');
        if (addProductBtn) addProductBtn.addEventListener('click', () => this.showProductModal());

        const productSearch = document.getElementById('product-search');
        if (productSearch) productSearch.addEventListener('input', (e) => this.searchProducts(e.target.value));

        // Tab switching
        document.querySelectorAll('[data-tab]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                UIHelper.showTab(e.target.dataset.tab);
                if (e.target.dataset.tab === 'categories') {
                    this.loadCategories();
                } else if (e.target.dataset.tab === 'products') {
                    this.loadProducts();
                }
            });
        });

        // Load data when screen is shown
        const inventoryScreen = document.getElementById('inventory-screen');
        if (inventoryScreen) {
            const observer = new MutationObserver(() => {
                if (inventoryScreen.classList.contains('active')) {
                    this.loadCategories();
                    this.loadProducts();
                }
            });
            observer.observe(inventoryScreen, { attributes: true, attributeFilter: ['class'] });
        }
    }

    async loadCategories() {
        const categories = await storage.getAll('categories');
        const container = document.getElementById('categories-list');
        container.innerHTML = '';

        if (categories.length === 0) {
            container.innerHTML = '<p>لا توجد فئات</p>';
            return;
        }

        categories.forEach(category => {
            const item = UIHelper.createListItem({
                id: category.id,
                content: `
                    <h4>${category.name}</h4>
                    <p>عدد المنتجات: ${category.productCount || 0}</p>
                `
            }, [
                { name: 'edit', label: 'تعديل', type: 'info' },
                { name: 'delete', label: 'حذف', type: 'danger' }
            ]);

            item.querySelector('[data-action="edit"]').onclick = () => this.showCategoryModal(category);
            item.querySelector('[data-action="delete"]').onclick = () => this.deleteCategory(category.id);
            container.appendChild(item);
        });
    }

    async loadProducts(searchTerm = '') {
        const products = await storage.getAll('products');
        const categories = await storage.getAll('categories');
        const exchangeRates = await storage.getAll('exchange_rates');
        const container = document.getElementById('products-list');
        container.innerHTML = '';

        let filteredProducts = products;
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filteredProducts = products.filter(p => {
                const category = categories.find(c => c.id === p.categoryId);
                return p.name.toLowerCase().includes(term) ||
                    p.brand.toLowerCase().includes(term) ||
                    (category && category.name.toLowerCase().includes(term));
            });
        }

        if (filteredProducts.length === 0) {
            container.innerHTML = '<p>لا توجد منتجات</p>';
            return;
        }

        for (const product of filteredProducts) {
            const category = categories.find(c => c.id === product.categoryId);
            const stockClass = product.stock === 0 ? 'stock-out' : (product.stock < 10 ? 'stock-low' : '');

            // Calculate prices in all currencies
            const baseRate = exchangeRates.find(r => r.isBase) || exchangeRates[0];
            let pricesHtml = '<div style="margin-top: 0.5rem;"><strong>الأسعار بجميع العملات:</strong><br>';

            for (const rate of exchangeRates) {
                if (rate.isBase) {
                    // Base currency - use original prices
                    const costInBase = product.costPrice;
                    const sellingInBase = product.sellingPrice;
                    pricesHtml += `${rate.name} (${rate.symbol}): التكلفة: ${costInBase.toFixed(2)} | البيع: ${sellingInBase.toFixed(2)}<br>`;
                } else {
                    // Convert prices
                    let costConverted, sellingConverted;

                    // Special handling for Syrian pounds
                    if (rate.symbol === 'OSP' && baseRate.symbol === 'USD') {
                        // USD to Old SP: multiply by rate
                        costConverted = product.costPrice * rate.rate;
                        sellingConverted = product.sellingPrice * rate.rate;
                    } else if (rate.symbol === 'NSP' && baseRate.symbol === 'USD') {
                        // USD to New SP: multiply by rate
                        costConverted = product.costPrice * rate.rate;
                        sellingConverted = product.sellingPrice * rate.rate;
                    } else if (rate.symbol === 'OSP' && baseRate.symbol !== 'USD') {
                        // Convert through base
                        const costInBase = product.costPrice * (baseRate.rate / 1);
                        costConverted = costInBase * (rate.rate / 1);
                        const sellingInBase = product.sellingPrice * (baseRate.rate / 1);
                        sellingConverted = sellingInBase * (rate.rate / 1);
                    } else {
                        // Normal conversion
                        costConverted = product.costPrice * (rate.rate / baseRate.rate);
                        sellingConverted = product.sellingPrice * (rate.rate / baseRate.rate);
                    }

                    pricesHtml += `${rate.name} (${rate.symbol}): التكلفة: ${costConverted.toFixed(2)} | البيع: ${sellingConverted.toFixed(2)}<br>`;
                }
            }
            pricesHtml += '</div>';

            const item = UIHelper.createListItem({
                id: product.id,
                content: `
                    <h4>${product.name} - ${product.brand}</h4>
                    <p>الفئة: ${category?.name || 'غير محدد'}</p>
                    <p class="${stockClass}">المخزون: ${product.stock}</p>
                    ${pricesHtml}
                `
            }, [
                { name: 'edit', label: 'تعديل', type: 'info' },
                { name: 'delete', label: 'حذف', type: 'danger' }
            ]);

            item.querySelector('[data-action="edit"]').onclick = () => this.showProductModal(product);
            item.querySelector('[data-action="delete"]').onclick = () => this.deleteProduct(product.id);
            container.appendChild(item);
        }
    }

    searchProducts(term) {
        this.loadProducts(term);
    }

    showCategoryModal(category = null) {
        const content = `
            <h3>${category ? 'تعديل فئة' : 'إضافة فئة'}</h3>
            <form id="category-form">
                <div class="form-group">
                    <label for="category-name">اسم الفئة:</label>
                    <input type="text" id="category-name" value="${category?.name || ''}" required>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" onclick="UIHelper.hideModal()">إلغاء</button>
                    <button type="submit" class="btn btn-primary">حفظ</button>
                </div>
            </form>
        `;
        UIHelper.showModal(content);

        document.getElementById('category-form').onsubmit = async(e) => {
            e.preventDefault();
            const name = document.getElementById('category-name').value;

            if (category) {
                category.name = name;
                await storage.update('categories', category);
                UIHelper.showToast('تم تحديث الفئة بنجاح', 'success');
            } else {
                await storage.add('categories', { name, productCount: 0 });
                UIHelper.showToast('تم إضافة الفئة بنجاح', 'success');
            }

            UIHelper.hideModal();
            this.loadCategories();
        };
    }

    async showProductModal(product = null) {
        const categories = await storage.getAll('categories');
        const exchangeRates = await storage.getAll('exchange_rates');

        const categoryOptions = categories.map(c =>
            `<option value="${c.id}" ${product?.categoryId === c.id ? 'selected' : ''}>${c.name}</option>`
        ).join('');

        const content = `
            <h3>${product ? 'تعديل منتج' : 'إضافة منتج'}</h3>
            <form id="product-form">
                <div class="form-group">
                    <label for="product-name">اسم المنتج:</label>
                    <input type="text" id="product-name" value="${product?.name || ''}" required>
                </div>
                <div class="form-group">
                    <label for="product-brand">العلامة التجارية:</label>
                    <input type="text" id="product-brand" value="${product?.brand || ''}" required>
                </div>
                <div class="form-group">
                    <label for="product-category">الفئة:</label>
                    <select id="product-category" required>
                        <option value="">اختر الفئة</option>
                        ${categoryOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label for="product-cost">سعر التكلفة:</label>
                    <input type="number" id="product-cost" step="0.01" value="${product?.costPrice || 0}" required>
                </div>
                <div class="form-group">
                    <label for="product-selling">سعر البيع:</label>
                    <input type="number" id="product-selling" step="0.01" value="${product?.sellingPrice || 0}" required>
                </div>
                <div class="form-group">
                    <label for="product-stock">المخزون:</label>
                    <input type="number" id="product-stock" value="${product?.stock || 0}" required>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" onclick="UIHelper.hideModal()">إلغاء</button>
                    <button type="submit" class="btn btn-primary">حفظ</button>
                </div>
            </form>
        `;
        UIHelper.showModal(content);

        document.getElementById('product-form').onsubmit = async(e) => {
            e.preventDefault();
            const productData = {
                name: document.getElementById('product-name').value,
                brand: document.getElementById('product-brand').value,
                categoryId: parseInt(document.getElementById('product-category').value),
                costPrice: parseFloat(document.getElementById('product-cost').value),
                sellingPrice: parseFloat(document.getElementById('product-selling').value),
                stock: parseInt(document.getElementById('product-stock').value),
                prices: ""
            };

            if (product) {
                productData.id = product.id;
                await storage.update('products', productData);
                UIHelper.showToast('تم تحديث المنتج بنجاح', 'success');
            } else {
                await storage.add('products', productData);
                UIHelper.showToast('تم إضافة المنتج بنجاح', 'success');
            }

            UIHelper.hideModal();
            this.loadProducts();
        };
    }

    async deleteCategory(id) {
        const confirmed = await UIHelper.confirm('هل أنت متأكد من حذف هذه الفئة؟');
        if (confirmed) {
            // Check if category has products
            const products = await storage.getAll('products');
            const hasProducts = products.some(p => p.categoryId === id);

            if (hasProducts) {
                UIHelper.showToast('لا يمكن حذف الفئة لأنها تحتوي على منتجات', 'error');
                return;
            }

            await storage.delete('categories', id);
            UIHelper.showToast('تم حذف الفئة بنجاح', 'success');
            this.loadCategories();
        }
    }

    async deleteProduct(id) {
        const confirmed = await UIHelper.confirm('هل أنت متأكد من حذف هذا المنتج؟');
        if (confirmed) {
            await storage.delete('products', id);
            UIHelper.showToast('تم حذف المنتج بنجاح', 'success');
            this.loadProducts();
        }
    }

    async getProduct(id) {
        return await storage.getById('products', id);
    }
}

const inventory = new InventoryManager();