// Financial Literacy & Budgeting App - Main Entry Point

// Script loading checker
function checkScriptLoading() {
    const requiredGlobals = ['financialApp', 'authManager', 'uiManager', 'apiManager'];
    const missing = [];

    requiredGlobals.forEach(global => {
        if (typeof window[global] === 'undefined') {
            missing.push(global);
        }
    });

    if (missing.length > 0) {
        console.error('ERROR: Missing required global objects:', missing);
        console.error('Script loading order may be incorrect or some scripts failed to load');
        return false;
    }

    console.log('All required scripts loaded successfully');
    return true;
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
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
            throw new Error('Script loading check failed');
        }

        console.log('Initializing Financial Literacy App...');

        if (typeof financialApp === 'undefined') {
            throw new Error('financialApp is not defined. Check if app.js loaded correctly.');
        }

        if (typeof financialApp.init !== 'function') {
            throw new Error('financialApp.init is not a function');
        }

        financialApp.init();
        
        // Update profile button with user email after initialization
        if (window.uiManager && typeof window.uiManager.updateProfileButton === 'function') {
            uiManager.updateProfileButton();
        }
        
        console.log('=== Financial Literacy App initialized successfully ===');
    } catch (error) {
        console.error('=== CRITICAL ERROR during app initialization ===');
        console.error('Error:', error);
        console.error('Stack:', error.stack);

        // Show user-friendly error message
        const errorMsg = `Failed to initialize application: ${error.message}\n\nPlease check the browser console for more details and try refreshing the page.`;
        alert(errorMsg);
    }
});
