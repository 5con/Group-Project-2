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
        // Handle login form submission (demo mode - no auth required)
        const form = document.getElementById('login-form');
        if (!form) return;
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;

            if (!email) {
                this.showAlert('Please enter an email address', 'danger');
                return;
            }

            // Store email in sessionStorage so login is required each session
            try {
                sessionStorage.setItem('userEmail', email);
            } catch (err) {
                // Fallback to localStorage if sessionStorage unavailable
                localStorage.setItem('userEmail', email);
            }

            // Determine destination: existing household -> dashboard, else -> onboarding
            try {
                const res = await fetch(`http://localhost:5267/api/onboarding/household/by-email/${encodeURIComponent(email)}`);
                if (res.ok) {
                    const hh = await res.json();
                    const id = hh.id ?? hh.Id;
                    if (id) localStorage.setItem('currentHouseholdId', String(id));
                    window.location.href = 'dashboard.html';
                } else {
                    window.location.href = 'onboarding.html';
                }
            } catch (err) {
                // Backend not reachable: fall back to account setup
                window.location.href = 'account.html';
            }
        });
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
        const emailInput = document.getElementById('email');
        const userEmailDisplay = document.getElementById('user-email-display');

        if (emailInput && userEmailDisplay) {
            // Only set demo email if field is empty and we're not on account page during setup
            if (!emailInput.value) {
                const storedEmail = localStorage.getItem('userEmail');
                if (storedEmail) {
                    emailInput.value = storedEmail;
                    userEmailDisplay.textContent = storedEmail;
                } else {
                    emailInput.value = 'demo@example.com';
                    userEmailDisplay.textContent = 'demo@example.com';
                }
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


    clearAuthData() {
        // Clear all data and reset to clean state
        localStorage.clear(); // Clear everything including completed modules
        sessionStorage.clear(); // Clear session data too
        this.showLogin(); // Show login page after clearing data
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

// Expose utility functions globally for debugging/testing if they don't exist
if (typeof window.clearAuthData === 'undefined') {
    window.clearAuthData = () => window.uiManager.clearAuthData();
}

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
