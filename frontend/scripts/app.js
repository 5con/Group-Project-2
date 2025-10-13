// Main Application Module

class FinancialApp {
    constructor() {
        this.currentHouseholdId = null;
        this.currentBudget = null;
        this.states = [];
        this.categories = [];
        this.budgetChart = null;
        this.trendsChart = null;
        this.categoryViewMode = 'cards'; // 'cards' or 'table'
    }

    async init() {
        try {
            console.log('Starting app initialization...');

            // Check if managers are available
            if (!authManager || !uiManager || !apiManager) {
                throw new Error('Required managers not initialized. Check console for module loading errors.');
            }

            // Always show login screen first for initial page load
            // This ensures users see the login screen when they first visit
            console.log('Showing login screen initially');
            uiManager.showLogin();

            // Always require fresh login - don't check stored authentication
            console.log('Fresh login required for all users');

            console.log('App initialization completed successfully');
        } catch (error) {
            console.error('CRITICAL ERROR during app initialization:', error);
            uiManager.showErrorAlert('Failed to initialize application: ' + error.message);
        }
    }

    async checkFirstTimeUser() {
        try {
            console.log('Checking if user is first-time...');

            if (!authManager.getCurrentUser()) {
                throw new Error('No authenticated user found');
            }

            const userEmail = authManager.getCurrentUser().email;
            const isDeveloper = authManager.isInDeveloperMode();
            console.log('Checking user status for:', userEmail, 'Developer mode:', isDeveloper);

            // For developers, always show onboarding (every time)
            if (isDeveloper) {
                console.log('Developer mode detected, showing onboarding');
                uiManager.showSection('onboarding');
                await this.loadReferenceData();
                return;
            }

            // For regular users, check if they're first-time
            const userStatus = await apiManager.checkFirstTimeUser(userEmail);
            console.log('User status received:', userStatus);

            if (userStatus.isFirstTime) {
                console.log('First-time user detected, showing onboarding');
                // First-time user, show onboarding
                uiManager.showSection('onboarding');
                // Load reference data for onboarding form
                await this.loadReferenceData();
            } else {
                console.log('Existing user detected, showing dashboard');
                // User has completed onboarding, show dashboard
                this.currentHouseholdId = userStatus.householdId;
                uiManager.showSection('dashboard');
            }
        } catch (error) {
            console.error('ERROR checking user status:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                user: authManager.getCurrentUser(),
                isDeveloper: authManager.isInDeveloperMode()
            });

            // Default to onboarding on error and load reference data
            uiManager.showSection('onboarding');

            // Always try to load reference data for the onboarding form
            try {
                await this.loadReferenceData();
            } catch (refError) {
                console.error('ERROR loading reference data after user check failed:', refError);
                uiManager.showErrorAlert('Error loading form data. Please try refreshing the page.');
            }

            if (error.message.includes('network') || error.message.includes('fetch')) {
                uiManager.showErrorAlert('Network error. Please check if the server is running and try again.');
            } else {
                uiManager.showErrorAlert('Error checking user status. Please try refreshing the page.');
            }
        }
    }

    async loadReferenceData() {
        try {
            console.log('=== LOADING REFERENCE DATA ===');
            console.log('Loading reference data...');
            const data = await apiManager.loadReferenceData();
            console.log('Reference data loaded:', data);

            if (!data) {
                throw new Error('No data received from server');
            }

            if (!data.states || !Array.isArray(data.states)) {
                throw new Error('Invalid or missing states data from server');
            }

            if (!data.categories || !Array.isArray(data.categories)) {
                throw new Error('Invalid or missing categories data from server');
            }

            this.states = data.states;
            this.categories = data.categories;
            console.log(`Loaded ${this.states.length} states and ${this.categories.length} categories`);

            if (this.states.length === 0) {
                console.warn('No states found from API, using fallback states');
                this.states = this.getFallbackStates();
            }

            this.populateStateDropdown();
        } catch (error) {
            console.error('ERROR loading reference data:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                data: error.data
            });

            // Use fallback states if API fails
            console.log('Using fallback states due to API error');
            this.states = this.getFallbackStates();
            this.categories = this.getFallbackCategories();

            try {
                this.populateStateDropdown();
            } catch (populateError) {
                console.error('ERROR populating state dropdown with fallback data:', populateError);
            }

            let errorMessage = 'Error loading reference data. Please refresh the page.';
            if (error.message.includes('network') || error.message.includes('fetch')) {
                errorMessage = 'Network error. Please check if the server is running on port 5267.';
            } else if (error.message.includes('No states found')) {
                errorMessage = 'Database not properly seeded. Please restart the server.';
            }

            uiManager.showErrorAlert(errorMessage);
        }
    }

    getFallbackStates() {
        return [
            { state: 'AL', colaIndex: 0.87, estEffectiveTaxRate: 0.18 },
            { state: 'AK', colaIndex: 1.27, estEffectiveTaxRate: 0.15 },
            { state: 'AZ', colaIndex: 0.95, estEffectiveTaxRate: 0.16 },
            { state: 'AR', colaIndex: 0.85, estEffectiveTaxRate: 0.19 },
            { state: 'CA', colaIndex: 1.35, estEffectiveTaxRate: 0.22 },
            { state: 'CO', colaIndex: 1.05, estEffectiveTaxRate: 0.17 },
            { state: 'CT', colaIndex: 1.15, estEffectiveTaxRate: 0.20 },
            { state: 'DE', colaIndex: 0.98, estEffectiveTaxRate: 0.18 },
            { state: 'FL', colaIndex: 0.97, estEffectiveTaxRate: 0.15 },
            { state: 'GA', colaIndex: 0.91, estEffectiveTaxRate: 0.18 },
            { state: 'HI', colaIndex: 1.60, estEffectiveTaxRate: 0.21 },
            { state: 'ID', colaIndex: 0.93, estEffectiveTaxRate: 0.17 },
            { state: 'IL', colaIndex: 0.95, estEffectiveTaxRate: 0.19 },
            { state: 'IN', colaIndex: 0.88, estEffectiveTaxRate: 0.17 },
            { state: 'IA', colaIndex: 0.89, estEffectiveTaxRate: 0.18 },
            { state: 'KS', colaIndex: 0.87, estEffectiveTaxRate: 0.17 },
            { state: 'KY', colaIndex: 0.88, estEffectiveTaxRate: 0.18 },
            { state: 'LA', colaIndex: 0.92, estEffectiveTaxRate: 0.17 },
            { state: 'ME', colaIndex: 0.96, estEffectiveTaxRate: 0.18 },
            { state: 'MD', colaIndex: 1.10, estEffectiveTaxRate: 0.21 },
            { state: 'MA', colaIndex: 1.25, estEffectiveTaxRate: 0.19 },
            { state: 'MI', colaIndex: 0.91, estEffectiveTaxRate: 0.17 },
            { state: 'MN', colaIndex: 1.02, estEffectiveTaxRate: 0.20 },
            { state: 'MS', colaIndex: 0.82, estEffectiveTaxRate: 0.17 },
            { state: 'MO', colaIndex: 0.88, estEffectiveTaxRate: 0.16 },
            { state: 'MT', colaIndex: 0.96, estEffectiveTaxRate: 0.17 },
            { state: 'NE', colaIndex: 0.90, estEffectiveTaxRate: 0.18 },
            { state: 'NV', colaIndex: 0.98, estEffectiveTaxRate: 0.15 },
            { state: 'NH', colaIndex: 1.05, estEffectiveTaxRate: 0.15 },
            { state: 'NJ', colaIndex: 1.18, estEffectiveTaxRate: 0.20 },
            { state: 'NM', colaIndex: 0.88, estEffectiveTaxRate: 0.16 },
            { state: 'NY', colaIndex: 1.25, estEffectiveTaxRate: 0.22 },
            { state: 'NC', colaIndex: 0.90, estEffectiveTaxRate: 0.18 },
            { state: 'ND', colaIndex: 0.94, estEffectiveTaxRate: 0.15 },
            { state: 'OH', colaIndex: 0.89, estEffectiveTaxRate: 0.17 },
            { state: 'OK', colaIndex: 0.86, estEffectiveTaxRate: 0.17 },
            { state: 'OR', colaIndex: 1.08, estEffectiveTaxRate: 0.21 },
            { state: 'PA', colaIndex: 0.98, estEffectiveTaxRate: 0.18 },
            { state: 'RI', colaIndex: 1.05, estEffectiveTaxRate: 0.18 },
            { state: 'SC', colaIndex: 0.89, estEffectiveTaxRate: 0.17 },
            { state: 'SD', colaIndex: 0.91, estEffectiveTaxRate: 0.15 },
            { state: 'TN', colaIndex: 0.90, estEffectiveTaxRate: 0.15 },
            { state: 'TX', colaIndex: 0.92, estEffectiveTaxRate: 0.15 },
            { state: 'UT', colaIndex: 0.95, estEffectiveTaxRate: 0.18 },
            { state: 'VT', colaIndex: 1.05, estEffectiveTaxRate: 0.18 },
            { state: 'VA', colaIndex: 1.00, estEffectiveTaxRate: 0.18 },
            { state: 'WA', colaIndex: 1.10, estEffectiveTaxRate: 0.19 },
            { state: 'WV', colaIndex: 0.83, estEffectiveTaxRate: 0.17 },
            { state: 'WI', colaIndex: 0.94, estEffectiveTaxRate: 0.18 },
            { state: 'WY', colaIndex: 0.95, estEffectiveTaxRate: 0.15 }
        ];
    }

    getFallbackCategories() {
        return [
            { name: 'Housing', isNeed: true },
            { name: 'Utilities', isNeed: true },
            { name: 'Groceries', isNeed: true },
            { name: 'Transportation', isNeed: true },
            { name: 'Medical/Health', isNeed: true },
            { name: 'Insurance', isNeed: true },
            { name: 'Childcare', isNeed: true },
            { name: 'Minimum Debt Payments', isNeed: true },
            { name: 'Dining Out', isNeed: false },
            { name: 'Entertainment', isNeed: false },
            { name: 'Personal', isNeed: false },
            { name: 'Subscriptions', isNeed: false },
            { name: 'Misc', isNeed: false },
            { name: 'Emergency Fund', isNeed: false },
            { name: 'Sinking Funds', isNeed: false },
            { name: 'Extra Debt Payments', isNeed: false },
            { name: 'Retirement/Long-term', isNeed: false }
        ];
    }

    populateStateDropdown() {
        console.log('=== POPULATING STATE DROPDOWN ===');
        console.log('populateStateDropdown called');
        const stateSelect = document.getElementById('state');

        if (!stateSelect) {
            console.error('State select element not found!');
            return;
        }

        console.log(`Current states array length: ${this.states ? this.states.length : 'undefined'}`);
        stateSelect.innerHTML = '<option value="">Select your state...</option>';

        if (!this.states || this.states.length === 0) {
            console.error('No states data available to populate dropdown');
            // Add a fallback option
            const fallbackOption = document.createElement('option');
            fallbackOption.value = 'CA';
            fallbackOption.textContent = 'California (Fallback)';
            stateSelect.appendChild(fallbackOption);
            return;
        }

        console.log(`Populating state dropdown with ${this.states.length} states`);
        this.states.forEach((state, index) => {
            console.log(`Adding state ${index}:`, state);
            if (state && state.State) {
            const option = document.createElement('option');
            option.value = state.State;
            option.textContent = state.State;
            stateSelect.appendChild(option);
            }
        });

        console.log('State dropdown populated successfully');
    }

    // Form Management Methods
    getOnboardingFormData() {
        const incomes = [];
        document.querySelectorAll('.income-entry').forEach(entry => {
            const name = entry.querySelector('.income-name').value;
            const cadence = entry.querySelector('.income-cadence').value;
            const amount = parseFloat(entry.querySelector('.income-amount').value);

            if (name && amount > 0) {
                incomes.push({ name, cadence, grossAmount: amount });
            }
        });

        const debts = [];
        document.querySelectorAll('.debt-entry').forEach(entry => {
            const type = entry.querySelector('.debt-type').value;
            const name = entry.querySelector('.debt-name').value;
            const balance = parseFloat(entry.querySelector('.debt-balance').value);
            const apr = parseFloat(entry.querySelector('.debt-apr').value);
            const minPayment = parseFloat(entry.querySelector('.debt-min-payment').value);

            if (name && balance > 0) {
                debts.push({ type, name, balance, apr, minPayment });
            }
        });

        return {
            email: authManager.getCurrentUser().email,
            state: document.getElementById('state').value,
            householdSize: parseInt(document.getElementById('household-size').value),
            incomes,
            expenses: [], // Empty for now
            debts,
            goals: [] // Empty for now
        };
    }

    async handleOnboardingSubmit() {
        try {
            console.log('Submitting onboarding form...');
            const formData = this.getOnboardingFormData();

            if (!formData.email || !formData.state || !formData.householdSize) {
                throw new Error('Please fill in all required fields');
            }

            console.log('Form data validation passed');
            const response = await apiManager.submitOnboarding(formData);
            console.log('Onboarding submission response:', response);

            if (!response || !response.householdId) {
                throw new Error('Invalid response from server');
            }

            this.currentHouseholdId = response.householdId;
            console.log('Household ID set:', this.currentHouseholdId);

            // Show success message and redirect to dashboard
            uiManager.showSuccessAlert('Welcome! Your financial profile has been created.');
            setTimeout(() => {
                this.showDashboard();
            }, 2000);
        } catch (error) {
            console.error('ERROR submitting onboarding:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                formData: error.formData
            });

            let errorMessage = 'Error creating profile. Please try again.';
            if (error.message.includes('network')) {
                errorMessage = 'Network error. Please check your connection and try again.';
            } else if (error.message.includes('validation')) {
                errorMessage = 'Please check your form data and try again.';
            }

            uiManager.showErrorAlert(errorMessage);
        }
    }

    addIncomeEntry() {
        const container = document.getElementById('income-container');
        const entry = document.createElement('div');
        entry.className = 'income-entry border rounded p-3 mb-3';
        entry.innerHTML = `
            <div class="row">
                <div class="col-md-4 mb-2">
                    <input type="text" class="form-control income-name" placeholder="Income Source" required>
                </div>
                <div class="col-md-3 mb-2">
                    <select class="form-select income-cadence">
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Bi-weekly</option>
                        <option value="semimonthly">Semi-monthly</option>
                        <option value="monthly" selected>Monthly</option>
                    </select>
                </div>
                <div class="col-md-4 mb-2">
                    <div class="input-group">
                        <span class="input-group-text">$</span>
                        <input type="number" class="form-control income-amount" placeholder="Amount" step="0.01" required>
                    </div>
                </div>
                <div class="col-md-1 mb-2">
                    <button type="button" class="btn btn-outline-danger remove-income">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `;

        container.appendChild(entry);

        // Add remove functionality
        entry.querySelector('.remove-income').addEventListener('click', () => {
            entry.remove();
        });
    }

    addDebtEntry() {
        // This would be implemented to add debt entries to the form
        // For now, it's a placeholder
        console.log('Add debt entry functionality would be implemented here');
    }

    // Navigation Methods
    showDashboard() {
        console.log('Showing dashboard section');
        uiManager.showSection('dashboard');
        if (this.currentHouseholdId) {
            this.loadDashboardData();
        } else {
            console.log('No household ID available for dashboard');
        }
    }

    showBudgetSection() {
        console.log('Showing budget section');
        uiManager.showSection('budget');
    }

    showModulesSection() {
        console.log('Showing modules section');
        uiManager.showSection('modules');
        // If modulesManager exists (on modules.html page), initialize it
        if (typeof modulesManager !== 'undefined') {
            modulesManager.init();
        }
    }

    // Transaction and Reporting Methods
    addTransaction() {
        uiManager.showSection('transactions');
        // Focus on the transaction form if it exists
        const transactionForm = document.getElementById('transactionForm');
        if (transactionForm) {
            transactionForm.scrollIntoView({ behavior: 'smooth' });
        }
    }

    viewReports() {
        uiManager.showSection('reports');
        // Generate and display reports
        this.generateReports();
    }

    toggleCategoryView() {
        const budgetSection = document.getElementById('budget');
        if (budgetSection) {
            const categoryView = budgetSection.querySelector('.category-view');
            const listView = budgetSection.querySelector('.list-view');

            if (categoryView && listView) {
                // Toggle between category and list view
                if (categoryView.style.display === 'none') {
                    categoryView.style.display = 'block';
                    listView.style.display = 'none';
                } else {
                    categoryView.style.display = 'none';
                    listView.style.display = 'block';
                }
            }
        }
    }

    generateReports() {
        // Generate financial reports and visualizations
        if (this.currentHouseholdId) {
            this.loadMonthlyTrends();
            this.updateBudgetChart();
            // Additional report generation logic can be added here
        }
    }

    // Data Loading Methods
    async loadDashboardData() {
        if (!this.currentHouseholdId) {
            console.warn('No household ID available for loading dashboard data');
            return;
        }

        try {
            console.log('Loading dashboard data for household:', this.currentHouseholdId);
            const householdData = await apiManager.loadHouseholdData(this.currentHouseholdId);
            console.log('Dashboard data loaded:', householdData);

            if (!householdData) {
                throw new Error('No data received from server');
            }

            this.updateDashboardCards(householdData);
            this.loadBudgetOverview();
            this.loadMonthlyTrends();
        } catch (error) {
            console.error('ERROR loading dashboard data:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                householdId: this.currentHouseholdId
            });

            uiManager.showErrorAlert('Error loading dashboard data. Please try refreshing the page.');
        }
    }

    updateDashboardCards(householdData) {
        // Calculate and update dashboard summary cards
        const totalIncome = householdData.incomes?.reduce((sum, income) => sum + income.grossAmount, 0) || 0;

        document.getElementById('total-income').textContent = `$${totalIncome.toFixed(2)}`;
        // Other dashboard card updates would go here
    }

    // Chart Management Methods
    updateBudgetChart() {
        // Budget chart update logic would go here
        console.log('Budget chart update would be implemented here');
    }

    loadBudgetOverview() {
        // Budget overview loading logic would go here
        console.log('Budget overview loading would be implemented here');
    }

    loadMonthlyTrends() {
        // Monthly trends loading logic would go here
        console.log('Monthly trends loading would be implemented here');
    }

    // Budget Management Methods
    generateBudget() {
        // Budget generation logic would go here
        console.log('Budget generation would be implemented here');
    }

    // Module Management Methods
    async loadModules() {
        try {
            console.log('Loading financial modules...');

            // If modulesManager exists (on modules.html), use it for detailed display
            if (typeof modulesManager !== 'undefined') {
                modulesManager.displayModulesGrid();
                return;
            }

            // For index.html modules section, show basic module cards
            const modulesContainer = document.getElementById('modules-container');
            if (modulesContainer) {
                this.displayModulesOverview(modulesContainer);
            }
        } catch (error) {
            console.error('ERROR loading modules:', error);
            uiManager.showErrorAlert('Error loading learning modules. Please try refreshing the page.');
        }
    }

    displayModulesOverview(container) {
        container.innerHTML = `
            <div class="row">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header bg-primary text-white">
                            <h4 class="mb-0">Financial Learning Modules</h4>
                        </div>
                        <div class="card-body">
                            <p class="lead">Explore our comprehensive financial literacy training program with 12 interactive modules.</p>
                            <div class="row">
                                <div class="col-md-4 mb-3">
                                    <div class="card h-100 border-primary">
                                        <div class="card-body text-center">
                                            <i class="bi bi-calculator fs-1 text-primary mb-3"></i>
                                            <h5>Budgeting</h5>
                                            <p class="small text-muted">Master income and expense tracking</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-4 mb-3">
                                    <div class="card h-100 border-success">
                                        <div class="card-body text-center">
                                            <i class="bi bi-bank fs-1 text-success mb-3"></i>
                                            <h5>Banking & Cash Management</h5>
                                            <p class="small text-muted">Optimize your banking relationships</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-4 mb-3">
                                    <div class="card h-100 border-warning">
                                        <div class="card-body text-center">
                                            <i class="bi bi-credit-card fs-1 text-warning mb-3"></i>
                                            <h5>Credit & Debt Management</h5>
                                            <p class="small text-muted">Build healthy credit habits</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="text-center">
                                <button class="btn btn-primary btn-lg" onclick="window.location.href='modules.html'">
                                    <i class="bi bi-arrow-right me-2"></i>Explore All Modules
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Event Listener Setup
    setupEventListeners() {
        // Onboarding form submission
        document.getElementById('onboarding-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleOnboardingSubmit();
        });

        // Add income button
        document.getElementById('add-income').addEventListener('click', () => {
            this.addIncomeEntry();
        });

        // Add debt button
        document.getElementById('add-debt').addEventListener('click', () => {
            this.addDebtEntry();
        });

        // Budget method change
        document.querySelectorAll('input[name="budget-method"]').forEach(radio => {
            radio.addEventListener('change', () => {
                this.updateBudgetMethodDescription();
            });
        });

        // Generate budget button
        document.getElementById('generate-budget').addEventListener('click', () => {
            this.generateBudget();
        });

        // Chart type toggle
        document.querySelectorAll('input[name="chart-type"]').forEach(radio => {
            radio.addEventListener('change', () => {
                if (this.currentBudget) {
                    this.updateBudgetChart();
                }
            });
        });
    }

    updateBudgetMethodDescription() {
        // Budget method description update logic would go here
        console.log('Budget method description update would be implemented here');
    }

    // Utility Methods
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    formatDate(date) {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(new Date(date));
    }
}

// Create global app instance
const financialApp = new FinancialApp();

try {
    // Check if managers are already created by their respective modules
    if (typeof authManager === 'undefined') {
        console.error('ERROR: authManager not found - auth.js may not have loaded correctly');
    } else {
        console.log('authManager found and ready');
    }

    if (typeof uiManager === 'undefined') {
        console.error('ERROR: uiManager not found - ui.js may not have loaded correctly');
    } else {
        console.log('uiManager found and ready');
    }

    if (typeof apiManager === 'undefined') {
        console.error('ERROR: apiManager not found - api.js may not have loaded correctly');
    } else {
        console.log('apiManager found and ready');
    }

    // Expose managers globally for cross-module access (they should already be defined)
    window.authManager = authManager;
    window.uiManager = uiManager;
    window.apiManager = apiManager;
    window.financialApp = financialApp;

    console.log('All modules loaded and globals exposed successfully');

} catch (error) {
    console.error('ERROR setting up global modules:', error);
}

// Expose functions globally for onclick handlers
window.showDashboard = () => financialApp.showDashboard();
window.showBudgetSection = () => financialApp.showBudgetSection();
window.showModulesSection = () => financialApp.showModulesSection();
window.addTransaction = () => financialApp.addTransaction();
window.viewReports = () => financialApp.viewReports();
window.toggleCategoryView = () => financialApp.toggleCategoryView();