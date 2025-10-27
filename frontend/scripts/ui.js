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
        const loginSection = document.getElementById('login-section');
        const mainContent = document.getElementById('main-content');
        const mainNavbar = document.getElementById('main-navbar');

        if (!loginSection) {
            console.error('Login section element not found in DOM');
            return;
        }

        if (!mainContent) {
            console.error('Main content element not found in DOM');
            return;
        }

        // Show login section and hide main content and navigation
        loginSection.style.display = 'block';
        mainContent.classList.add('d-none');
        if (mainNavbar) {
            mainNavbar.classList.add('d-none');
        }

        // Set up login event listeners
        this.setupLoginEventListeners();
    }

    setupLoginEventListeners() {
        // Handle login form submission with proper authentication
        const form = document.getElementById('login-form');
        if (!form) return;
        form.addEventListener('submit', async (e) => {
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
                console.log('Attempting login with email:', email);

                // Use the API manager's login method
                const response = await window.apiManager.login(email, password);

                if (response && response.token) {
                    console.log('Login successful, showing main application...');

                    // Show success message
                    this.showSuccessAlert('Login successful! Loading your dashboard...');

                    // Show main application content instead of redirecting
                    this.showMainApp();
                } else {
                    throw new Error('Invalid response from server');
                }
            } catch (error) {
                console.error('Login error:', error);

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


    showMainApp() {
        const loginSection = document.getElementById('login-section');
        const mainContent = document.getElementById('main-content');
        const mainNavbar = document.getElementById('main-navbar');

        if (!loginSection) {
            console.error('Login section element not found in DOM');
            return;
        }

        if (!mainContent) {
            console.error('Main content element not found in DOM');
            return;
        }

        // Hide login section and show main content and navigation
        loginSection.style.display = 'none';
        mainContent.classList.remove('d-none');
        if (mainNavbar) {
            mainNavbar.classList.remove('d-none');
        }

        // Populate user email in onboarding form if needed
        this.populateUserEmail();

        // Set up navigation event listeners
        this.setupNavigation();

        // Initialize dashboard after showing main app
        if (window.financialApp) {
            // Show dashboard section and load data
            this.showSection('dashboard');
            window.financialApp.loadBudgetAndShowDashboard();
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


    clearAuthData() {
        // Clear all data and reset to clean state
        localStorage.clear(); // Clear everything including completed modules
        sessionStorage.clear(); // Clear session data too

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
