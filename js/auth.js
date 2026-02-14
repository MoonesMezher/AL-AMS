// Authentication Module
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        const loadingEl = document.getElementById('app-loading');
        if (loadingEl) {
            loadingEl.style.display = 'none';
        }

        try {
            await storage.init();
            await storage.initializeDefaultData();
        } catch (e) {
            console.error('Storage initialization failed:', e);
        }

        const session = localStorage.getItem('userSession');
        if (session) {
            try {
                this.currentUser = JSON.parse(session);
                const users = await storage.getAll('users');
                const user = users.find(u => u.email === this.currentUser.email);
                if (user) {
                    UIHelper.showScreen('dashboard');
                    return;
                }
                localStorage.removeItem('userSession');
                this.currentUser = null;
            } catch (e) {
                localStorage.removeItem('userSession');
                this.currentUser = null;
            }
        }
        UIHelper.showScreen('login');
    }

    async login(email, password) {
        try {
            await storage.init();
            await storage.initializeDefaultData();

            const users = await storage.getAll('users');
            const user = users.find(u => u.email === email && u.password === password);

            if (user) {
                this.currentUser = { email: user.email, id: user.id };
                localStorage.setItem('userSession', JSON.stringify(this.currentUser));
                UIHelper.showScreen('dashboard');
                UIHelper.showToast('تم تسجيل الدخول بنجاح', 'success');
                return true;
            } else {
                UIHelper.showToast('البريد الإلكتروني أو كلمة المرور غير صحيحة', 'error');
                return false;
            }
        } catch (error) {
            UIHelper.showToast('حدث خطأ أثناء تسجيل الدخول', 'error');
            return false;
        }
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('userSession');
        UIHelper.showScreen('login');
        UIHelper.showToast('تم تسجيل الخروج', 'info');
    }

    isAuthenticated() {
        return this.currentUser !== null;
    }
}

const auth = new AuthManager();
