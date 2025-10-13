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

        if (!loginSection) {
            console.error('Login section element not found in DOM');
            return;
        }

        if (!mainContent) {
            console.error('Main content element not found in DOM');
            return;
        }

        loginSection.style.display = 'block';
        mainContent.classList.add('d-none');

        // Set up login event listeners
        this.setupLoginEventListeners();
    }

    setupLoginEventListeners() {
        // Regular login form
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            try {
                await authManager.handleLogin(email, password);
                this.showMainApp();
            } catch (error) {
                this.showAlert(error.message, 'danger');
            }
        });

        // Developer login form
        document.getElementById('developer-login-form').addEventListener('submit', async (e) => {
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

    showDeveloperLogin() {
        const devSection = document.getElementById('developer-login-section');
        devSection.style.display = devSection.style.display === 'none' ? 'block' : 'none';
    }

    showMainApp() {
        const loginSection = document.getElementById('login-section');
        const mainContent = document.getElementById('main-content');

        if (!loginSection) {
            console.error('Login section element not found in DOM');
            return;
        }

        if (!mainContent) {
            console.error('Main content element not found in DOM');
            return;
        }

        loginSection.style.display = 'none';
        mainContent.classList.remove('d-none');

        // Populate user email in onboarding form if needed
        this.populateUserEmail();

        // Set up navigation event listeners
        this.setupNavigation();
    }

    populateUserEmail() {
        if (authManager.getCurrentUser() && authManager.getCurrentUser().email) {
            const emailInput = document.getElementById('email');
            const userEmailDisplay = document.getElementById('user-email-display');

            if (emailInput) {
                emailInput.value = authManager.getCurrentUser().email;
            }

            if (userEmailDisplay) {
                userEmailDisplay.textContent = authManager.getCurrentUser().email;
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
    }

    // Global function for logout (called from HTML)
    logout() {
        authManager.logout();
        this.showLogin();
    }

    clearAuthData() {
        // Clear all authentication data and reset to clean state
        authManager.logout();
        localStorage.clear(); // Clear everything including completed modules
        sessionStorage.clear(); // Clear session data too
        this.showLogin();
    }

    // Global function for showing developer login (called from HTML)
    toggleDeveloperLogin() {
        this.showDeveloperLogin();
    }
}

// Create global UI instance
const uiManager = new UIManager();

// Expose the class globally for other modules
window.UIManager = UIManager;

// Expose utility functions globally for debugging/testing
window.clearAuthData = () => uiManager.clearAuthData();
window.logout = () => uiManager.logout();
window.showDeveloperLogin = () => uiManager.showDeveloperLogin();

// Add error handling and logging
console.log('UIManager module loaded successfully');
