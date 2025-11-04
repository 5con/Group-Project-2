// Financial Literacy & Budgeting App - Main Entry Point

// Enhanced script loading checker with detailed diagnostics
function checkScriptLoading() {
    const coreRequiredGlobals = ['financialApp', 'uiManager', 'apiManager'];
    const optionalGlobals = ['BudgetManager', 'DashboardManager'];
    const missing = [];
    const optional = [];

    // Check core required globals
    coreRequiredGlobals.forEach(global => {
        if (typeof window[global] === 'undefined') {
            missing.push(global);
        }
    });

    // Check optional globals (log but don't fail)
    optionalGlobals.forEach(global => {
        if (typeof window[global] === 'undefined') {
            optional.push(global);
        }
    });

    // Report status
    if (missing.length > 0) {
        console.error('ERROR: Missing required global objects:', missing);
        console.error('Script loading order may be incorrect or some scripts failed to load');
        
        // Provide specific guidance for missing globals
        missing.forEach(global => {
            switch(global) {
                case 'financialApp':
                    console.error('- financialApp: Check if app.js loaded correctly');
                    break;
                case 'uiManager':
                    console.error('- uiManager: Check if ui.js loaded correctly');
                    break;
                case 'apiManager':
                    console.error('- apiManager: Check if api.js loaded correctly and has no syntax errors');
                    break;
            }
        });
        return false;
    }

    if (optional.length > 0) {
        console.log('Optional manager classes not loaded:', optional);
        console.log('This is normal if the corresponding scripts are not included on this page');
    }

    console.log('All required scripts loaded successfully');
    console.log('Available managers:', {
        uiManager: typeof window.uiManager !== 'undefined',
        apiManager: typeof window.apiManager !== 'undefined',
        budgetManager: typeof window.budgetManager !== 'undefined',
        dashboardManager: typeof window.dashboardManager !== 'undefined'
    });
    
    return true;
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Skip initialization on standalone pages (dashboard, budget, modules, account)
        // These pages handle their own initialization
        const currentPage = window.location.pathname.split('/').pop() || '';
        const standalonePages = ['dashboard.html', 'budget.html', 'modules.html', 'account.html'];
        if (standalonePages.includes(currentPage)) {
            console.log(`Skipping main.js initialization on standalone page: ${currentPage}`);
            return;
        }

        console.log('=== Financial Literacy App Initialization Started ===');
        console.log('DOM Content Loaded - checking script loading...');

        // Check if all required scripts loaded
        if (!checkScriptLoading()) {
            throw new Error('Script loading check failed - some required scripts are missing');
        }

        console.log('Initializing Financial Literacy App...');

        // Validate financialApp exists and is properly structured
        if (typeof financialApp === 'undefined') {
            console.error('financialApp is undefined. Checking window.financialApp...');
            if (typeof window.financialApp !== 'undefined') {
                console.log('Found financialApp on window object, using that');
                window.financialApp = window.financialApp;
            } else {
                throw new Error('financialApp is not available. app.js may have failed to load or has syntax errors.');
            }
        }

        if (typeof financialApp.init !== 'function') {
            console.error('financialApp exists but init method is missing:', financialApp);
            throw new Error('financialApp.init is not a function. The app may not be properly initialized.');
        }

        // CRITICAL: Check if onboarding was just completed BEFORE calling init
        const onboardingCompleted = localStorage.getItem('onboardingCompleted') === 'true';
        if (onboardingCompleted || window.onboardingJustCompleted) {
            console.log('[MAIN.JS] Onboarding just completed - skipping app.init() and redirecting to dashboard');
            window.location.replace('dashboard.html');
            return;
        }
        
        await financialApp.init();
        
        // Update profile button with user email after initialization
        if (window.uiManager && typeof window.uiManager.updateProfileButton === 'function') {
            uiManager.updateProfileButton();
        }
        
        // Update navigation visibility based on auth status
        if (window.uiManager && typeof window.uiManager.updateNavigationVisibility === 'function') {
            uiManager.updateNavigationVisibility();
        }
        
        console.log('=== Financial Literacy App initialized successfully ===');
        
    } catch (error) {
        console.error('=== CRITICAL ERROR during app initialization ===');
        console.error('Error:', error);
        console.error('Stack:', error.stack);

        // Provide detailed error information
        console.error('Browser info:', {
            userAgent: navigator.userAgent,
            url: window.location.href,
            timestamp: new Date().toISOString()
        });

        // Show user-friendly error message with recovery options
        let errorMsg = `Application failed to start: ${error.message}\n\n`;
        
        if (error.message.includes('Script loading')) {
            errorMsg += 'This appears to be a script loading issue. Try:\n';
            errorMsg += '1. Refreshing the page\n';
            errorMsg += '2. Clearing your browser cache\n';
            errorMsg += '3. Checking your internet connection\n';
        } else if (error.message.includes('syntax') || error.message.includes('apiManager')) {
            errorMsg += 'This appears to be a code syntax issue. Try:\n';
            errorMsg += '1. Refreshing the page\n';
            errorMsg += '2. Clearing browser cache and cookies\n';
            errorMsg += '3. Contact support if the issue persists\n';
        } else {
            errorMsg += 'Try refreshing the page. If the issue persists, please contact support.\n';
        }
        
        errorMsg += '\nCheck the browser console (F12) for more technical details.';
        alert(errorMsg);
    }
});
