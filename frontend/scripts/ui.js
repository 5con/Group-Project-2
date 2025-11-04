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

        // Only show login if we're on the index page (where these elements exist)
        if (!loginSection || !mainContent) {
            // Silently return - this is expected on pages other than index.html
            return;
        }

        loginSection.style.display = 'block';
        mainContent.classList.add('d-none');

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

                try {
                    await authManager.handleLogin(email, password);
                    this.showMainApp();
                } catch (error) {
                    this.showAlert(error.message, 'danger');
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
            // Silently return - this is expected on pages other than index.html
            return;
        }
        devSection.style.display = devSection.style.display === 'none' ? 'block' : 'none';
    }

    showMainApp() {
        const loginSection = document.getElementById('login-section');
        const mainContent = document.getElementById('main-content');
        const publicInfoSection = document.getElementById('public-info-section');

        // Only show main app if we're on the index page (where these elements exist)
        if (!loginSection || !mainContent) {
            // Silently return - this is expected on pages other than index.html
            return;
        }

        loginSection.style.display = 'none';
        mainContent.classList.remove('d-none');
        
        // Hide public info section when logged in
        if (publicInfoSection) {
            publicInfoSection.style.display = 'none';
        }

        // Populate user email in onboarding form if needed
        this.populateUserEmail();

        // Update profile button with user email
        this.updateProfileButton();

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
    }

    // Global function for logout (called from HTML)
    logout() {
        authManager.logout();
        
        // Reset profile button to show "Profile" instead of user email
        const profileText = document.getElementById('profile-text');
        if (profileText) {
            profileText.textContent = 'Profile';
        }
        
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
        // Clear all authentication data and reset to clean state
        authManager.logout();
        localStorage.clear(); // Clear everything including completed modules
        sessionStorage.clear(); // Clear session data too
        
        // Reset profile button to show "Profile" instead of user email
        const profileText = document.getElementById('profile-text');
        if (profileText) {
            profileText.textContent = 'Profile';
        }
        
        this.showLogin();
    }

    // Global function for showing developer login (called from HTML)
    toggleDeveloperLogin() {
        this.showDeveloperLogin();
    }

    // Check if user is authenticated and redirect if not
    requireAuth() {
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
        if (!authManager || !authManager.isAuthenticated || !authManager.isLoggedIn || !authManager.isLoggedIn()) {
            // Not authenticated, redirect to index.html
            window.location.replace('index.html');
            return false;
        }
        
        return true;
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
