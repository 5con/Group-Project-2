// UI Management Module

class UIManager {
    constructor() {
        this.sections = {
            login: 'login-section',
            main: 'main-content',
            onboarding: 'onboarding-section',
            dashboard: 'dashboard-section',
            budget: 'budget-section',
            modules: 'modules-section'
        };
    }

    showLogin() {
        // CRITICAL: Don't show login if onboarding redirect is in progress
        if (window.onboardingRedirectInProgress) {
            console.log('Onboarding redirect in progress - skipping showLogin()');
            return;
        }
        
        // CRITICAL: Don't show login if onboarding was just completed
        const onboardingCompleted = localStorage.getItem('onboardingCompleted') === 'true';
        if (onboardingCompleted) {
            console.log('Onboarding just completed - skipping showLogin()');
            return;
        }
        
        const loginSection = document.getElementById('login-section');
        const mainContent = document.getElementById('main-content');
        const publicInfoSection = document.getElementById('public-info-section');
        const mainNavbar = document.getElementById('main-navbar');

        // Only show login if we're on the index page (where these elements exist)
        if (!loginSection || !mainContent) {
            // Silently return - this is expected on pages other than index.html
            return;
        }

        // Show login section and hide main content and navigation
        loginSection.style.display = 'block';
        mainContent.classList.add('d-none');
        if (mainNavbar) {
            mainNavbar.classList.add('d-none');
        }
        
        // Show public info section when not logged in
        if (publicInfoSection) {
            publicInfoSection.style.display = 'block';
        }

        // Reset profile button to show "Profile" instead of user email
        const profileText = document.getElementById('profile-text');
        if (profileText) {
            profileText.textContent = 'Profile';
        }

        // Hide navigation items when not logged in
        this.updateNavigationVisibility();

        // Set up login event listeners
        this.setupLoginEventListeners();
    }

    setupLoginEventListeners() {
        // Regular login form - only set up if it exists
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('login-email').value;
                const password = document.getElementById('login-password').value;

                if (!email) {
                    this.showAlert('Please enter an email address', 'danger');
                    return;
                }

                if (!password) {
                    this.showAlert('Please enter a password', 'danger');
                    return;
                }

                try {
                    await authManager.handleLogin(email, password);
                    this.showMainApp();
                } catch (error) {
                    let errorMessage = 'Login failed. Please check your credentials and try again.';
                    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
                        errorMessage = 'Invalid email or password. Please try again.';
                    } else if (error.message.includes('network') || error.message.includes('fetch')) {
                        errorMessage = 'Network error. Please check your connection and try again.';
                    }
                    this.showAlert(errorMessage, 'danger');
                }
            });
        }

        // Developer login form - only set up if it exists
        const devLoginForm = document.getElementById('developer-login-form');
        if (devLoginForm) {
            devLoginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const password = document.getElementById('dev-password').value;

                try {
                    await authManager.handleDeveloperLogin(password);
                    this.showMainApp();
                } catch (error) {
                    this.showAlert(error.message, 'danger');
                }
            });
        }
    }

    showDeveloperLogin() {
        const devSection = document.getElementById('developer-login-section');
        if (!devSection) {
            return;
        }
        devSection.style.display = devSection.style.display === 'none' ? 'block' : 'none';
    }

    showMainApp() {
        const loginSection = document.getElementById('login-section');
        const mainContent = document.getElementById('main-content');
        const publicInfoSection = document.getElementById('public-info-section');
        const mainNavbar = document.getElementById('main-navbar');

        // Only show main app if we're on the index page (where these elements exist)
        if (!loginSection || !mainContent) {
            // Silently return - this is expected on pages other than index.html
            return;
        }

        // Hide login section and show main content and navigation
        loginSection.style.display = 'none';
        mainContent.classList.remove('d-none');
        if (mainNavbar) {
            mainNavbar.classList.remove('d-none');
        }
        
        // Hide public info section when logged in
        if (publicInfoSection) {
            publicInfoSection.style.display = 'none';
        }

        // Populate user email in onboarding form if needed
        this.populateUserEmail();

        // Update profile button with user email
        this.updateProfileButton();

        // Show navigation items when logged in
        this.updateNavigationVisibility();

        // Set up navigation event listeners
        this.setupNavigation();
        
        // CRITICAL: Ensure event listeners for onboarding form are set up
        // This ensures add income/debt buttons work when onboarding section is shown
        if (window.financialApp && typeof window.financialApp.setupEventListeners === 'function') {
            console.log('[UIMANAGER] Setting up event listeners for onboarding form');
            window.financialApp.setupEventListeners();
        }
    }

    populateUserEmail() {
        const emailInput = document.getElementById('email');
        const userEmailDisplay = document.getElementById('user-email-display');

        if (emailInput && userEmailDisplay) {
            // Only set stored email if field is empty and we're not on account page during setup
            if (!emailInput.value) {
                const storedEmail = localStorage.getItem('userEmail');
                if (storedEmail) {
                    emailInput.value = storedEmail;
                    userEmailDisplay.textContent = storedEmail;
                }
                // Don't set demo email - leave fields empty for new users
            }
        }
    }

    updateProfileButton() {
        const profileText = document.getElementById('profile-text');
        if (profileText) {
            // Only show email if user is actually logged in
            let email = null;
            if (authManager && authManager.isLoggedIn && authManager.isLoggedIn()) {
                // User is logged in, get email from authManager
                if (authManager.getCurrentUser) {
                    const user = authManager.getCurrentUser();
                    if (user && user.email) {
                        email = user.email;
                    }
                }
                
                // Fallback to localStorage if authManager doesn't have it yet
                if (!email) {
                    email = localStorage.getItem('userEmail');
                }
            }
            
            // Update the text if we have an email and user is logged in
            if (email && authManager && authManager.isLoggedIn && authManager.isLoggedIn()) {
                // Truncate long emails for display (show first 22 chars + ...)
                const displayEmail = email.length > 25 ? email.substring(0, 22) + '...' : email;
                profileText.textContent = displayEmail;
            } else {
                profileText.textContent = 'Profile';
            }
        }
    }

    updateNavigationVisibility() {
        // Check if user is logged in - check multiple sources
        let isLoggedIn = false;
        
        // Check authManager first
        if (authManager) {
            if (authManager.isLoggedIn && typeof authManager.isLoggedIn === 'function') {
                isLoggedIn = authManager.isLoggedIn();
            } else if (authManager.isAuthenticated) {
                isLoggedIn = true;
            }
        }
        
        // Also check localStorage as backup
        if (!isLoggedIn) {
            const token = localStorage.getItem('authToken');
            const email = localStorage.getItem('userEmail');
            if (token && email) {
                isLoggedIn = true;
                // Try to restore auth state if not already set
                if (authManager && !authManager.isAuthenticated) {
                    authManager.authToken = token;
                    authManager.currentUser = { email: email, userId: localStorage.getItem('userId') ? parseInt(localStorage.getItem('userId')) : undefined };
                    authManager.isAuthenticated = true;
                    authManager.setupAuthHeaders();
                }
            }
        }
        
        // Check for onboarding completion - if completed, user should be logged in
        const onboardingCompleted = localStorage.getItem('onboardingCompleted') === 'true';
        if (onboardingCompleted && !isLoggedIn) {
            const token = localStorage.getItem('authToken');
            const email = localStorage.getItem('userEmail');
            if (token && email) {
                isLoggedIn = true;
            }
        }
        
        console.log('[updateNavigationVisibility] isLoggedIn:', isLoggedIn, 'onboardingCompleted:', onboardingCompleted);
        
        // Navigation items to hide/show based on auth status
        const protectedNavItems = [
            'nav-item-dashboard',
            'nav-item-budget',
            'nav-item-modules',
            'nav-item-account',
            'nav-item-profile',
            'nav-item-logout'
        ];
        
        protectedNavItems.forEach(itemId => {
            const item = document.getElementById(itemId);
            if (item) {
                if (isLoggedIn || onboardingCompleted) {
                    item.style.display = '';
                    console.log('[updateNavigationVisibility] Showing nav item:', itemId);
                } else {
                    item.style.display = 'none';
                    console.log('[updateNavigationVisibility] Hiding nav item:', itemId);
                }
            }
        });
    }

    showSection(sectionName) {
        // Hide all sections
        Object.values(this.sections).forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                section.classList.add('d-none');
            }
        });

        // Show selected section
        const targetSection = document.getElementById(this.sections[sectionName]);
        if (targetSection) {
            targetSection.classList.remove('d-none');

            // Special handling for onboarding section
            if (sectionName === 'onboarding' && window.financialApp) {
                // Ensure state dropdown is populated when showing onboarding
                try {
                    window.financialApp.populateStateDropdown();
                } catch (error) {
                    console.error('Error populating state dropdown:', error);
                }
            }
        }
    }

    showAlert(message, type = 'info') {
        // Create and show a Bootstrap alert
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(alertDiv);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    showSuccessAlert(message) {
        this.showAlert(message, 'success');
    }

    showErrorAlert(message) {
        this.showAlert(message, 'danger');
    }

    showLoading(message = 'Loading...') {
        // Remove existing loading overlay if present
        this.hideLoading();

        // Create loading overlay
        const loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'loading-overlay';
        loadingOverlay.className = 'd-flex justify-content-center align-items-center position-fixed w-100 h-100 bg-dark bg-opacity-50';
        loadingOverlay.style.zIndex = '9999';
        loadingOverlay.innerHTML = `
            <div class="bg-white p-4 rounded shadow text-center">
                <div class="spinner-border text-primary mb-3" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <div class="text-muted">${message}</div>
            </div>
        `;

        document.body.appendChild(loadingOverlay);
    }

    hideLoading() {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.remove();
        }
    }

    setupNavigation() {
        // Navigation link handlers
        const navDashboard = document.getElementById('nav-dashboard');
        if (navDashboard) {
            navDashboard.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSection('dashboard');
                // Also call the app method if available
                if (window.financialApp && window.financialApp.showDashboard) {
                    window.financialApp.showDashboard();
                }
            });
        }

        const navBudget = document.getElementById('nav-budget');
        if (navBudget) {
            navBudget.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSection('budget');
                // Also call the app method if available
                if (window.financialApp && window.financialApp.showBudgetSection) {
                    window.financialApp.showBudgetSection();
                }
            });
        }

        const navModules = document.getElementById('nav-modules');
        if (navModules) {
            navModules.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSection('modules');
                // Also call the app method if available
                if (window.financialApp && window.financialApp.showModulesSection) {
                    window.financialApp.showModulesSection();
                }
            });
        }

        // Logout handler
        const navLogout = document.getElementById('nav-logout');
        if (navLogout) {
            navLogout.addEventListener('click', (e) => {
                e.preventDefault();
                if (confirm('Are you sure you want to logout?')) {
                    this.clearAuthData();
                }
            });
        }
    }

    // Global function for logout (called from HTML)
    logout() {
        authManager.logout();
        
        // Reset profile button to show "Profile" instead of user email
        const profileText = document.getElementById('profile-text');
        if (profileText) {
            profileText.textContent = 'Profile';
        }
        
        // Hide navigation items when logged out
        this.updateNavigationVisibility();
        
        const loginSection = document.getElementById('login-section');
        const mainContent = document.getElementById('main-content');
        
        // If we're on index.html, show the login section
        if (loginSection && mainContent) {
            this.showLogin();
        } else {
            // Otherwise, redirect to index.html (login page)
            window.location.href = 'index.html';
        }
    }

    clearAuthData() {
        // Clear all data and reset to clean state
        localStorage.clear(); // Clear everything including completed modules
        sessionStorage.clear(); // Clear session data too
        
        // Reset profile button to show "Profile" instead of user email
        const profileText = document.getElementById('profile-text');
        if (profileText) {
            profileText.textContent = 'Profile';
        }
        
        // Hide navigation and show login
        const mainNavbar = document.getElementById('main-navbar');
        if (mainNavbar) {
            mainNavbar.classList.add('d-none');
        }

        this.showLogin(); // Show login page after clearing data
    }

    // ============= EXPORT FUNCTIONALITY =============
    
    /**
     * Setup export buttons
     */
    setupExportButtons() {
        // Export budget button
        const exportBudgetBtn = document.getElementById('export-budget-btn');
        if (exportBudgetBtn) {
            exportBudgetBtn.addEventListener('click', () => this.exportBudget());
        }

        // Export household button
        const exportHouseholdBtn = document.getElementById('export-household-btn');
        if (exportHouseholdBtn) {
            exportHouseholdBtn.addEventListener('click', () => this.exportHousehold());
        }

        // Export goals button
        const exportGoalsBtn = document.getElementById('export-goals-btn');
        if (exportGoalsBtn) {
            exportGoalsBtn.addEventListener('click', () => this.exportGoals());
        }

        // Export transactions button
        const exportTransactionsBtn = document.getElementById('export-transactions-btn');
        if (exportTransactionsBtn) {
            exportTransactionsBtn.addEventListener('click', () => this.exportTransactions());
        }
    }

    // Check if user is authenticated and redirect if not
    requireAuth() {
        // CRITICAL: Check for onboarding completion FIRST - if onboarding was just completed,
        // we should NOT redirect, even if auth restoration hasn't happened yet
        const onboardingCompleted = localStorage.getItem('onboardingCompleted') === 'true';
        
        // Also check the immediate flag set by dashboard.html
        if (window.onboardingJustCompleted) {
            console.log('[requireAuth] Onboarding just completed - preventing redirect');
            return true;
        }
        
        // Try to restore auth from localStorage first
        if (authManager && !authManager.isAuthenticated) {
            const token = localStorage.getItem('authToken');
            const email = localStorage.getItem('userEmail');
            
            if (token && email && window.authManager) {
                authManager.authToken = token;
                authManager.currentUser = { email: email, userId: localStorage.getItem('userId') ? parseInt(localStorage.getItem('userId')) : undefined };
                authManager.isAuthenticated = true;
                authManager.isDeveloperMode = localStorage.getItem('isDeveloperMode') === 'true';
                authManager.setupAuthHeaders();
            }
        }
        
        // Check if user is now authenticated
        // If onboarding was just completed, don't redirect - let the dashboard handle it
        const isAuthenticated = authManager && authManager.isAuthenticated && (!authManager.isLoggedIn || authManager.isLoggedIn());
        
        if (!isAuthenticated && !onboardingCompleted && !window.onboardingJustCompleted) {
            // Not authenticated and onboarding wasn't just completed, redirect to index.html
            window.location.replace('index.html');
            return false;
        }
        
        return true;
    }

    /**
     * Export budget to CSV
     */
    async exportBudget() {
        const householdId = localStorage.getItem('householdId');
        if (!householdId) {
            this.showErrorAlert('No household selected');
            return;
        }

        try {
            const currentDate = new Date();
            const month = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
            
            await apiManager.exportBudget(householdId, month, 'csv');
            this.showSuccessAlert('Budget exported successfully!');
        } catch (error) {
            console.error('Error exporting budget:', error);
            this.showErrorAlert('Failed to export budget');
        }
    }

    /**
     * Export household data to JSON
     */
    async exportHousehold() {
        const householdId = localStorage.getItem('householdId');
        if (!householdId) {
            this.showErrorAlert('No household selected');
            return;
        }

        try {
            await apiManager.exportHouseholdData(householdId, 'json');
            this.showSuccessAlert('Household data exported successfully!');
        } catch (error) {
            console.error('Error exporting household:', error);
            this.showErrorAlert('Failed to export household data');
        }
    }

    /**
     * Export goals to CSV
     */
    async exportGoals() {
        const householdId = localStorage.getItem('householdId');
        if (!householdId) {
            this.showErrorAlert('No household selected');
            return;
        }

        try {
            await apiManager.exportGoals(householdId, 'csv');
            this.showSuccessAlert('Goals exported successfully!');
        } catch (error) {
            console.error('Error exporting goals:', error);
            this.showErrorAlert('Failed to export goals');
        }
    }

    /**
     * Export transactions to CSV
     */
    async exportTransactions() {
        const householdId = localStorage.getItem('householdId');
        if (!householdId) {
            this.showErrorAlert('No household selected');
            return;
        }

        try {
            await apiManager.exportTransactions(householdId, 'csv');
            this.showSuccessAlert('Transactions exported successfully!');
        } catch (error) {
            console.error('Error exporting transactions:', error);
            this.showErrorAlert('Failed to export transactions');
        }
    }
}

// Create global UI instance if it doesn't exist
if (typeof window.uiManager === 'undefined') {
    window.uiManager = new UIManager();
}

// Expose the class globally for other modules if it doesn't exist
if (typeof window.UIManager === 'undefined') {
    window.UIManager = UIManager;
}

// clearAuthData function is now defined in app.js

// Add a global reset function for troubleshooting
if (typeof window.resetApp === 'undefined') {
    window.resetApp = () => {
        console.log('Resetting application state...');
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = 'index.html';
    };
}

// Add error handling and logging
console.log('UIManager module loaded successfully');
