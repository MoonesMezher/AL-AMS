// Settings Module
class SettingsManager {
    constructor() {
        this.init();
    }

    init() {
        document.getElementById('add-exchange-rate-btn')?.addEventListener('click', () => this.showExchangeRateModal());
        
        document.querySelectorAll('[data-tab="exchange-rates"], [data-tab="backup"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                UIHelper.showTab(e.target.dataset.tab);
                if (e.target.dataset.tab === 'exchange-rates') {
                    this.loadExchangeRates();
                }
            });
        });

        document.getElementById('export-btn')?.addEventListener('click', () => this.exportData());
        document.getElementById('import-btn')?.addEventListener('click', () => {
            document.getElementById('import-file').click();
        });
        document.getElementById('import-file')?.addEventListener('change', (e) => this.importData(e));

        const screen = document.getElementById('settings-screen');
        if (screen) {
            const observer = new MutationObserver(() => {
                if (screen.classList.contains('active')) {
                    this.loadExchangeRates();
                }
            });
            observer.observe(screen, { attributes: true, attributeFilter: ['class'] });
        }
    }

    async loadExchangeRates() {
        const rates = await storage.getAll('exchange_rates');
        const container = document.getElementById('exchange-rates-list');
        container.innerHTML = '';

        if (rates.length === 0) {
            container.innerHTML = '<p>لا توجد أسعار صرف</p>';
            return;
        }

        rates.forEach(rate => {
            const item = UIHelper.createListItem({
                id: rate.id,
                content: `
                    <h4>${rate.name} (${rate.symbol})</h4>
                    <p>السعر: ${rate.rate} ${rate.isBase ? '(العملة الأساسية)' : ''}</p>
                `
            }, [
                { name: 'edit', label: 'تعديل', type: 'info' },
                { name: 'delete', label: 'حذف', type: 'danger' }
            ]);

            item.querySelector('[data-action="edit"]').onclick = () => this.showExchangeRateModal(rate);
            item.querySelector('[data-action="delete"]').onclick = () => this.deleteExchangeRate(rate.id);
            container.appendChild(item);
        });
    }

    showExchangeRateModal(rate = null) {
        const content = `
            <h3>${rate ? 'تعديل سعر الصرف' : 'إضافة سعر صرف'}</h3>
            <form id="exchange-rate-form">
                <div class="form-group">
                    <label for="rate-name">الاسم:</label>
                    <input type="text" id="rate-name" value="${rate?.name || ''}" required>
                </div>
                <div class="form-group">
                    <label for="rate-symbol">الرمز:</label>
                    <input type="text" id="rate-symbol" value="${rate?.symbol || ''}" required>
                </div>
                <div class="form-group">
                    <label for="rate-value">السعر:</label>
                    <input type="number" id="rate-value" step="0.01" value="${rate?.rate || 1}" required>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="rate-is-base" ${rate?.isBase ? 'checked' : ''}>
                        العملة الأساسية
                    </label>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" onclick="UIHelper.hideModal()">إلغاء</button>
                    <button type="submit" class="btn btn-primary">حفظ</button>
                </div>
            </form>
        `;
        UIHelper.showModal(content);

        document.getElementById('exchange-rate-form').onsubmit = async (e) => {
            e.preventDefault();
            const isBase = document.getElementById('rate-is-base').checked;
            const symbol = document.getElementById('rate-symbol').value;
            const newRate = parseFloat(document.getElementById('rate-value').value);

            // If setting as base, unset other base rates
            if (isBase) {
                const allRates = await storage.getAll('exchange_rates');
                for (const r of allRates) {
                    if (r.isBase && (!rate || r.id !== rate.id)) {
                        r.isBase = false;
                        await storage.update('exchange_rates', r);
                    }
                }
            }

            const rateData = {
                name: document.getElementById('rate-name').value,
                symbol: symbol,
                rate: newRate,
                isBase: isBase
            };

            if (rate) {
                rateData.id = rate.id;
                await storage.update('exchange_rates', rateData);
                
                // إذا تم تحديث سعر الليرة السورية الجديدة، حدث القديمة تلقائياً
                if (symbol === 'NSP') {
                    const allRates = await storage.getAll('exchange_rates');
                    const oldSP = allRates.find(r => r.symbol === 'OSP');
                    if (oldSP) {
                        // 1000 قديمة = 10 جديدة، لذا السعر القديم = السعر الجديد * 100
                        oldSP.rate = newRate * 100;
                        await storage.update('exchange_rates', oldSP);
                    }
                }
                // إذا تم تحديث سعر الليرة السورية القديمة، حدث الجديدة تلقائياً
                else if (symbol === 'OSP') {
                    const allRates = await storage.getAll('exchange_rates');
                    const newSP = allRates.find(r => r.symbol === 'NSP');
                    if (newSP) {
                        // 1000 قديمة = 10 جديدة، لذا السعر الجديد = السعر القديم / 100
                        newSP.rate = newRate / 100;
                        await storage.update('exchange_rates', newSP);
                    }
                }
                
                UIHelper.showToast('تم تحديث سعر الصرف بنجاح', 'success');
            } else {
                await storage.add('exchange_rates', rateData);
                
                // إذا تم إضافة ليرة سورية جديدة، أضف القديمة تلقائياً إذا لم تكن موجودة
                if (symbol === 'NSP') {
                    const allRates = await storage.getAll('exchange_rates');
                    const oldSP = allRates.find(r => r.symbol === 'OSP');
                    if (!oldSP) {
                        await storage.add('exchange_rates', {
                            name: 'ليرة سورية قديمة',
                            symbol: 'OSP',
                            rate: newRate * 100,
                            conversionFactor: 100
                        });
                    }
                }
                
                UIHelper.showToast('تم إضافة سعر الصرف بنجاح', 'success');
            }
            
            UIHelper.hideModal();
            this.loadExchangeRates();
        };
    }

    async deleteExchangeRate(id) {
        const rate = await storage.getById('exchange_rates', id);
        if (rate.isBase) {
            UIHelper.showToast('لا يمكن حذف العملة الأساسية', 'error');
            return;
        }

        const confirmed = await UIHelper.confirm('هل أنت متأكد من حذف سعر الصرف هذا؟');
        if (confirmed) {
            await storage.delete('exchange_rates', id);
            UIHelper.showToast('تم حذف سعر الصرف بنجاح', 'success');
            this.loadExchangeRates();
        }
    }

    async exportData() {
        try {
            const data = await storage.exportData();
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            UIHelper.showToast('تم تصدير البيانات بنجاح', 'success');
        } catch (error) {
            UIHelper.showToast('فشل تصدير البيانات: ' + error.message, 'error');
        }
    }

    async importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const confirmed = await UIHelper.confirm('هل تريد استبدال جميع البيانات الحالية؟ سيتم حذف جميع البيانات الحالية.');
            if (confirmed) {
                await storage.importData(text, true);
                UIHelper.showToast('تم استيراد البيانات بنجاح', 'success');
                // Reload the app
                location.reload();
            }
        } catch (error) {
            UIHelper.showToast('فشل استيراد البيانات: ' + error.message, 'error');
        }
        
        // Reset file input
        event.target.value = '';
    }
}

const settings = new SettingsManager();
