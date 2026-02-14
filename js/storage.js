// Storage Manager - Handles all JSON data operations (IndexedDB only)
class StorageManager {
    constructor() {
        this.dbName = 'AccountingAppDB';
        this.dbVersion = 1;
        this.db = null;
        this.init();
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = async () => {
                this.db = request.result;
                await this.initializeDefaultData();
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                const stores = [
                    'users', 'categories', 'products', 'exchange_rates',
                    'transactions', 'creditors_debtors', 'settings'
                ];

                stores.forEach(storeName => {
                    if (!db.objectStoreNames.contains(storeName)) {
                        db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
                    }
                });
            };
        });
    }

    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    async getById(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async add(storeName, item) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(item);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async update(storeName, item) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(item);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async delete(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async exportData() {
        const data = {
            users: await this.getAll('users'),
            categories: await this.getAll('categories'),
            products: await this.getAll('products'),
            exchange_rates: await this.getAll('exchange_rates'),
            transactions: await this.getAll('transactions'),
            creditors_debtors: await this.getAll('creditors_debtors'),
            settings: await this.getAll('settings'),
            exportDate: new Date().toISOString()
        };
        return JSON.stringify(data, null, 2);
    }

    async importData(jsonString, replace = false) {
        try {
            const data = JSON.parse(jsonString);

            if (replace) {
                const stores = ['users', 'categories', 'products', 'exchange_rates',
                    'transactions', 'creditors_debtors', 'settings'
                ];

                for (const storeName of stores) {
                    const transaction = this.db.transaction([storeName], 'readwrite');
                    const store = transaction.objectStore(storeName);
                    await new Promise((resolve, reject) => {
                        const request = store.clear();
                        request.onsuccess = () => resolve();
                        request.onerror = () => reject(request.error);
                    });
                }
            }

            for (const storeName in data) {
                if (storeName === 'exportDate') continue;
                if (Array.isArray(data[storeName])) {
                    for (const item of data[storeName]) {
                        await this.add(storeName, item);
                    }
                }
            }

            return true;
        } catch (error) {
            throw new Error('فشل استيراد البيانات: ' + error.message);
        }
    }

    async initializeDefaultData() {
        const users = await this.getAll('users');
        if (users.length === 0) {
            await this.add('users', {
                email: 'admin@example.com',
                password: 'admin123',
                createdAt: new Date().toISOString()
            });
        }

        const rates = await this.getAll('exchange_rates');
        if (rates.length === 0) {
            await this.add('exchange_rates', {
                name: 'دولار',
                symbol: 'USD',
                rate: 1,
                isBase: true
            });
            await this.add('exchange_rates', {
                name: 'ليرة سورية جديدة',
                symbol: 'NSP',
                rate: 4500,
                conversionFactor: 0.01
            });
            await this.add('exchange_rates', {
                name: 'ليرة سورية قديمة',
                symbol: 'OSP',
                rate: 450000,
                conversionFactor: 100
            });
        } else {
            const newSP = rates.find(r => r.symbol === 'NSP');
            const oldSP = rates.find(r => r.symbol === 'OSP');
            if (newSP && oldSP && !oldSP.autoUpdated) {
                oldSP.rate = newSP.rate * 100;
                oldSP.autoUpdated = true;
                await this.update('exchange_rates', oldSP);
            }
        }

        const settings = await this.getAll('settings');
        if (settings.length === 0) {
            await this.add('settings', {
                baseCurrency: 'USD',
                language: 'ar',
                dateFormat: 'YYYY-MM-DD'
            });
        }
    }
}

const storage = new StorageManager();
