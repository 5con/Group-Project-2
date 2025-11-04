// Account Page Logic

(function () {
    function restoreAuthFromStorage() {
        try {
            const token = localStorage.getItem('authToken');
            const email = localStorage.getItem('userEmail');
            const userId = localStorage.getItem('userId');
            const isDev = localStorage.getItem('isDeveloperMode') === 'true';

            if (!token || !email) return false;

            // Rehydrate minimal auth state for this standalone page
            if (window.authManager) {
                authManager.authToken = token;
                authManager.currentUser = { email: email, userId: userId ? parseInt(userId) : undefined };
                authManager.isAuthenticated = true;
                authManager.isDeveloperMode = isDev;
                authManager.setupAuthHeaders();
            }
            return true;
        } catch (_) {
            return false;
        }
    }

    function setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    function showAlert(id, message) {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.remove('d-none');
        el.textContent = message;
    }

    async function loadHousehold(email) {
        try {
            const status = await apiManager.checkFirstTimeUser(email);
            if (status.isFirstTime) {
                showAlert('account-warning-alert', 'No household found yet. Complete onboarding to create your household.');
                return null;
            }
            const hh = await apiManager.loadHouseholdData(status.householdId);
            return hh;
        } catch (err) {
            showAlert('account-error-alert', err.message || 'Failed to load account data.');
            return null;
        }
    }

    function renderUserCard() {
        const user = authManager?.getCurrentUser?.() || {};
        setText('account-email', user.email || '-');
        setText('account-user-id', (user.userId != null ? String(user.userId) : '-'));
        setText('account-mode', authManager?.isInDeveloperMode?.() ? 'Developer' : 'Standard');
    }

    function renderHousehold(hh) {
        if (!hh) return;
        setText('account-household-id', `ID: ${hh.id}`);
        setText('account-state', hh.state || '-');
        setText('account-household-size', hh.householdSize != null ? String(hh.householdSize) : '-');
        setText('account-income-count', Array.isArray(hh.incomes) ? String(hh.incomes.length) : '0');
        setText('account-debt-count', Array.isArray(hh.debts) ? String(hh.debts.length) : '0');
        setText('account-budget-count', Array.isArray(hh.budgets) ? String(hh.budgets.length) : '0');
    }

    document.addEventListener('DOMContentLoaded', async () => {
        console.log('[ACCOUNT.JS] DOMContentLoaded handler starting');
        
        // CRITICAL: Check if onboarding was just completed - if so, don't redirect
        const onboardingCompleted = localStorage.getItem('onboardingCompleted') === 'true';
        console.log('[ACCOUNT.JS] onboardingCompleted:', onboardingCompleted, 'onboardingJustCompleted:', window.onboardingJustCompleted);
        
        // Try to restore auth
        let ok = restoreAuthFromStorage();
        console.log('[ACCOUNT.JS] Initial auth restoration result:', ok);
        
        // If auth restoration failed but onboarding was just completed, try again
        if (!ok && (onboardingCompleted || window.onboardingJustCompleted)) {
            console.log('[ACCOUNT.JS] Onboarding completed - attempting to restore auth');
            const token = localStorage.getItem('authToken');
            const email = localStorage.getItem('userEmail');
            const userId = localStorage.getItem('userId');
            
            if (token && email && window.authManager) {
                authManager.authToken = token;
                authManager.currentUser = { email: email, userId: userId ? parseInt(userId) : undefined };
                authManager.isAuthenticated = true;
                authManager.isDeveloperMode = false;
                authManager.setupAuthHeaders();
                ok = true;
                console.log('[ACCOUNT.JS] Auth restored successfully after onboarding');
            } else {
                console.error('[ACCOUNT.JS] Failed to restore auth - token:', !!token, 'email:', !!email, 'authManager:', !!window.authManager);
            }
        }
        
        // Check if user is authenticated now
        const isAuthenticated = window.authManager && (authManager.isAuthenticated || (authManager.isLoggedIn && authManager.isLoggedIn()));
        console.log('[ACCOUNT.JS] Final auth check - isAuthenticated:', isAuthenticated, 'ok:', ok);
        
        // Only show "not logged in" message if auth failed AND onboarding wasn't just completed
        if (!ok && !isAuthenticated && !onboardingCompleted && !window.onboardingJustCompleted) {
            console.log('[ACCOUNT.JS] User not authenticated and onboarding not completed - showing alert');
            showAlert('account-info-alert', 'You are not logged in. Please sign in on the home page.');
            // Don't redirect - let the user see the message
            return;
        }

        // If we get here, user should be authenticated (either from onboarding or normal login)
        try {
            renderUserCard();
            const user = authManager.getCurrentUser();
            if (user) {
                console.log('[ACCOUNT.JS] Loading household data for user:', user.email);
                const household = await loadHousehold(user.email);
                renderHousehold(household);
            } else {
                console.warn('[ACCOUNT.JS] No user found after auth restoration');
            }
        } catch (error) {
            console.error('[ACCOUNT.JS] Error loading account data:', error);
            showAlert('account-error-alert', error.message || 'Unexpected error.');
        }
    });
})();


