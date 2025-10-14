// Main Application Module

class FinancialApp {
    constructor() {
        this.currentHouseholdId = null;
        this.currentBudget = null;
        this.householdData = null;
        this.states = [];
        this.categories = [];
        this.budgetChart = null;
        this.trendsChart = null;
        this.categoryViewMode = 'cards'; // 'cards' or 'table'
    }

    async init() {
        try {
            console.log('Starting app initialization...');

            const isAccountPage = window.location.pathname.includes('account.html');
            if (isAccountPage) {
                console.log('On account page - skipping auth checks, loading reference data only');
                await this.loadReferenceData();
                return; // Let account.js handle the rest
            }

            // Check if managers are available
            if (!window.uiManager || !window.apiManager) {
                throw new Error('Required managers not initialized. Check console for module loading errors.');
            }

            // Check authentication state
            let userEmail, currentHouseholdId;

            try {
                // Prefer session, fallback to local for userEmail
                userEmail = sessionStorage.getItem('userEmail') || localStorage.getItem('userEmail');
                currentHouseholdId = localStorage.getItem('currentHouseholdId');
            } catch (storageError) {
                console.error('Error accessing localStorage:', storageError);
                // Clear potentially corrupted localStorage data
                this.clearCorruptedStorage();
                userEmail = null;
                currentHouseholdId = null;
            }

            console.log('Authentication check:');
            console.log('- userEmail:', userEmail);
            console.log('- currentHouseholdId:', currentHouseholdId);

            if (!userEmail) {
                // User not logged in, show login on index
                console.log('User not authenticated, redirecting to login page');
                if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
                    window.location.href = 'index.html';
                    return;
                }
                uiManager.showLogin();
                return;
            }

            // Resolve household by email if missing from storage
            if (!currentHouseholdId) {
                console.log('No household in storage; attempting lookup by email');
                try {
                    const res = await fetch(`http://localhost:5267/api/onboarding/household/by-email/${encodeURIComponent(userEmail)}`);
                    if (res.ok) {
                        const hh = await res.json();
                        currentHouseholdId = String(hh.id || hh.Id);
                        localStorage.setItem('currentHouseholdId', currentHouseholdId);
                    } else {
                        // Send new users to onboarding
                        window.location.href = 'onboarding.html';
                        return;
                    }
                } catch (err) {
                    // Offline fallback to account setup
                    window.location.href = 'account.html';
                    return;
                }
            }

            // Validate that the stored household ID is actually valid by trying to load household data
            console.log('Validating stored household ID...');
            try {
                const testHouseholdData = await apiManager.loadHouseholdData(currentHouseholdId);
                if (!testHouseholdData || !testHouseholdData.id) {
                    console.log('Invalid household data, clearing localStorage and redirecting to login');
                    this.clearCorruptedStorage();
                    if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
                        window.location.href = 'index.html';
                        return;
                    }
                    uiManager.showLogin();
                    return;
                }
                console.log('Household ID is valid, proceeding with app initialization');
            } catch (error) {
                console.log('Error validating household ID, clearing localStorage and redirecting to login:', error.message);
                this.clearCorruptedStorage();
                if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
                    window.location.href = 'index.html';
                    return;
                }
                uiManager.showLogin();
                return;
            }

            // User is authenticated and has household data, load the app
            console.log('User authenticated with household data, loading application...');

            // Load reference data first before showing any UI
            console.log('Loading reference data before showing UI...');
            uiManager.showLoading('Loading application data...');
            await this.loadReferenceData();
            uiManager.hideLoading();

            // Set current household ID (household data already loaded and validated above)
            console.log('Setting current household ID');
            this.currentHouseholdId = currentHouseholdId;

            // Show dashboard and load budget data
            console.log('Showing dashboard and loading budget data');
            uiManager.showSection('dashboard');
            await this.loadBudgetAndShowDashboard();

            // Initialize managers after app initialization
            console.log('Initializing managers after app setup...');
            if (typeof window.ensureManagersInitialized === 'function') {
                ensureManagersInitialized();
            } else if (typeof window.initializeManagers === 'function') {
                initializeManagers();
            }

            // Setup event listeners after managers are initialized
            // Use a small delay to ensure managers are ready
            setTimeout(() => {
                this.setupEventListeners();
            }, 50);

            console.log('App initialization completed successfully');
        } catch (error) {
            console.error('CRITICAL ERROR during app initialization:', error);
            if (window.uiManager && window.uiManager.hideLoading) {
                window.uiManager.hideLoading();
            }
            if (window.uiManager && window.uiManager.showErrorAlert) {
                window.uiManager.showErrorAlert('Failed to initialize application: ' + error.message);
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
            { State: 'AL', ColaIndex: 0.87, EstEffectiveTaxRate: 0.18 },
            { State: 'AK', ColaIndex: 1.27, EstEffectiveTaxRate: 0.15 },
            { State: 'AZ', ColaIndex: 0.95, EstEffectiveTaxRate: 0.16 },
            { State: 'AR', ColaIndex: 0.85, EstEffectiveTaxRate: 0.19 },
            { State: 'CA', ColaIndex: 1.35, EstEffectiveTaxRate: 0.22 },
            { State: 'CO', ColaIndex: 1.05, EstEffectiveTaxRate: 0.17 },
            { State: 'CT', ColaIndex: 1.15, EstEffectiveTaxRate: 0.20 },
            { State: 'DE', ColaIndex: 0.98, EstEffectiveTaxRate: 0.18 },
            { State: 'FL', ColaIndex: 0.97, EstEffectiveTaxRate: 0.15 },
            { State: 'GA', ColaIndex: 0.91, EstEffectiveTaxRate: 0.18 },
            { State: 'HI', ColaIndex: 1.60, EstEffectiveTaxRate: 0.21 },
            { State: 'ID', ColaIndex: 0.93, EstEffectiveTaxRate: 0.17 },
            { State: 'IL', ColaIndex: 0.95, EstEffectiveTaxRate: 0.19 },
            { State: 'IN', ColaIndex: 0.88, EstEffectiveTaxRate: 0.17 },
            { State: 'IA', ColaIndex: 0.89, EstEffectiveTaxRate: 0.18 },
            { State: 'KS', ColaIndex: 0.87, EstEffectiveTaxRate: 0.17 },
            { State: 'KY', ColaIndex: 0.88, EstEffectiveTaxRate: 0.18 },
            { State: 'LA', ColaIndex: 0.92, EstEffectiveTaxRate: 0.17 },
            { State: 'ME', ColaIndex: 0.96, EstEffectiveTaxRate: 0.18 },
            { State: 'MD', ColaIndex: 1.10, EstEffectiveTaxRate: 0.21 },
            { State: 'MA', ColaIndex: 1.25, EstEffectiveTaxRate: 0.19 },
            { State: 'MI', ColaIndex: 0.91, EstEffectiveTaxRate: 0.17 },
            { State: 'MN', ColaIndex: 1.02, EstEffectiveTaxRate: 0.20 },
            { State: 'MS', ColaIndex: 0.82, EstEffectiveTaxRate: 0.17 },
            { State: 'MO', ColaIndex: 0.88, EstEffectiveTaxRate: 0.16 },
            { State: 'MT', ColaIndex: 0.96, EstEffectiveTaxRate: 0.17 },
            { State: 'NE', ColaIndex: 0.90, EstEffectiveTaxRate: 0.18 },
            { State: 'NV', ColaIndex: 0.98, EstEffectiveTaxRate: 0.15 },
            { State: 'NH', ColaIndex: 1.05, EstEffectiveTaxRate: 0.15 },
            { State: 'NJ', ColaIndex: 1.18, EstEffectiveTaxRate: 0.20 },
            { State: 'NM', ColaIndex: 0.88, EstEffectiveTaxRate: 0.16 },
            { State: 'NY', ColaIndex: 1.25, EstEffectiveTaxRate: 0.22 },
            { State: 'NC', ColaIndex: 0.90, EstEffectiveTaxRate: 0.18 },
            { State: 'ND', ColaIndex: 0.94, EstEffectiveTaxRate: 0.15 },
            { State: 'OH', ColaIndex: 0.89, EstEffectiveTaxRate: 0.17 },
            { State: 'OK', ColaIndex: 0.86, EstEffectiveTaxRate: 0.17 },
            { State: 'OR', ColaIndex: 1.08, EstEffectiveTaxRate: 0.21 },
            { State: 'PA', ColaIndex: 0.98, EstEffectiveTaxRate: 0.18 },
            { State: 'RI', ColaIndex: 1.05, EstEffectiveTaxRate: 0.18 },
            { State: 'SC', ColaIndex: 0.89, EstEffectiveTaxRate: 0.17 },
            { State: 'SD', ColaIndex: 0.91, EstEffectiveTaxRate: 0.15 },
            { State: 'TN', ColaIndex: 0.90, EstEffectiveTaxRate: 0.15 },
            { State: 'TX', ColaIndex: 0.92, EstEffectiveTaxRate: 0.15 },
            { State: 'UT', ColaIndex: 0.95, EstEffectiveTaxRate: 0.18 },
            { State: 'VT', ColaIndex: 1.05, EstEffectiveTaxRate: 0.18 },
            { State: 'VA', ColaIndex: 1.00, EstEffectiveTaxRate: 0.18 },
            { State: 'WA', ColaIndex: 1.10, EstEffectiveTaxRate: 0.19 },
            { State: 'WV', ColaIndex: 0.83, EstEffectiveTaxRate: 0.17 },
            { State: 'WI', ColaIndex: 0.94, EstEffectiveTaxRate: 0.18 },
            { State: 'WY', ColaIndex: 0.95, EstEffectiveTaxRate: 0.15 }
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

    populateStateDropdown(dropdownId = 'state') {
        console.log('=== POPULATING STATE DROPDOWN ===');
        console.log('populateStateDropdown called');
        console.log('financialApp instance:', this);
        console.log('financialApp.states:', this.states);
        console.log('financialApp.states length:', this.states ? this.states.length : 'undefined');

        const stateSelect = document.getElementById(dropdownId);

        if (!stateSelect) {
            console.log(`State select element with id '${dropdownId}' not found on current page`);
            return;
        }

        stateSelect.innerHTML = '<option value="">Select your state...</option>';

        if (!this.states || this.states.length === 0) {
            console.error('No states data available to populate dropdown');
            console.error('States array:', this.states);
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
            if (state) {
                // Handle both 'State' (from API) and 'state' (from fallback) property names
                const stateCode = state.State || state.state;
                const stateName = state.StateName || state.State || state.state || stateCode;

                if (stateCode) {
                    const option = document.createElement('option');
                    option.value = stateCode;
                    option.textContent = stateName;
                    stateSelect.appendChild(option);
                } else {
                    console.warn(`State ${index} missing state code:`, state);
                }
            } else {
                console.warn(`State ${index} is null/undefined`);
            }
        });

        console.log('State dropdown populated successfully');
    }

    // Form Management Methods (now handled by onboarding.js for onboarding page)

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

    async loadBudgetAndShowDashboard() {
        console.log('Loading budget data and showing dashboard');
        uiManager.showSection('dashboard');

        if (!this.currentHouseholdId) {
            console.error('No household ID available');
            uiManager.showErrorAlert('Error: No household found. Please try logging in again.');
            return;
        }

        // Delegate to dashboard manager if available
        if (typeof window.dashboardManager !== 'undefined' && window.dashboardManager) {
            await window.dashboardManager.loadBudgetAndShowDashboard();
            return;
        }

        // Fallback implementation
        try {
            // Load household data first
            this.householdData = await apiManager.loadHouseholdData(this.currentHouseholdId);
            console.log('Household data loaded:', this.householdData);

            // Load the latest budget for this household
            const currentDate = new Date();
            const budgetData = await apiManager.loadBudgetData(this.currentHouseholdId, `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`);

            if (budgetData && budgetData.length > 0) {
                const latestBudget = budgetData[0]; // Get the most recent budget
                this.currentBudget = latestBudget;

                console.log('Budget data loaded:', latestBudget);

                // Update dashboard with budget data
                this.updateDashboardWithBudget(latestBudget);

                // Show success message about budget being loaded
                uiManager.showSuccessAlert('Your budget has been loaded successfully!');
            } else {
                console.log('No budget data found, showing empty state');
                // Show empty state instead of auto-generating
                uiManager.showInfoAlert('Welcome! Create your first budget to get started with financial planning.');
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
            
            let errorMessage = 'Error loading your data. Please try refreshing the page.';
            if (error.message.includes('household') || error.message.includes('not found')) {
                errorMessage = 'Account data not found. Please complete onboarding or contact support.';
            } else if (error.message.includes('network') || error.message.includes('fetch')) {
                errorMessage = 'Connection error. Please check if the server is running and try again.';
            }
            
            uiManager.showErrorAlert(errorMessage);
        }
    }

    async generateNewBudget() {
        try {
            console.log('Generating new budget for household:', this.currentHouseholdId);

            const currentDate = new Date();
            const budgetRequest = {
                householdId: this.currentHouseholdId,
                methodology: "50/30/20",
                month: currentDate.getMonth() + 1,
                year: currentDate.getFullYear()
            };

            const budgetResponse = await apiManager.createBudget(budgetRequest);

            if (budgetResponse && budgetResponse.budget) {
                this.currentBudget = budgetResponse;
                console.log('New budget generated:', budgetResponse);

                this.updateDashboardWithBudget(budgetResponse);
                uiManager.showSuccessAlert('Your personalized budget has been generated!');
            }
        } catch (error) {
            console.error('Error generating budget:', error);
            uiManager.showErrorAlert('Error generating your budget. Please try again.');
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

    // Transaction and Reporting Methods - Now handled by dashboardManager
    addTransaction() {
        if (typeof dashboardManager !== 'undefined' && dashboardManager) {
            uiManager.showSection('transactions');
            // Focus on the transaction form if it exists
            const transactionForm = document.getElementById('transactionForm');
            if (transactionForm) {
                transactionForm.scrollIntoView({ behavior: 'smooth' });
            }
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    viewReports() {
        if (typeof dashboardManager !== 'undefined' && dashboardManager) {
            uiManager.showSection('reports');
            // Generate and display reports
            dashboardManager.generateReports();
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    toggleCategoryView() {
        if (typeof dashboardManager !== 'undefined' && dashboardManager) {
            dashboardManager.toggleCategoryView();
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    generateReports() {
        if (typeof dashboardManager !== 'undefined' && dashboardManager) {
            dashboardManager.generateReports();
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    // Data Loading Methods - Now handled by dashboardManager
    async loadDashboardData() {
        if (typeof dashboardManager !== 'undefined' && dashboardManager) {
            await dashboardManager.loadDashboardData();
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    updateDashboardWithBudget(budgetData) {
        if (typeof dashboardManager !== 'undefined' && dashboardManager) {
            dashboardManager.updateDashboardWithBudget(budgetData);
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    updateBudgetCategoriesDisplay(budgetItems) {
        if (typeof dashboardManager !== 'undefined' && dashboardManager) {
            dashboardManager.updateBudgetCategoriesDisplay(budgetItems);
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    updateBudgetBreakdownCards(needs, wants, savingsDebt) {
        if (typeof dashboardManager !== 'undefined' && dashboardManager) {
            dashboardManager.updateBudgetBreakdownCards(needs, wants, savingsDebt);
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    updateProgressBarAmounts(needs, wants, savingsDebt) {
        if (typeof dashboardManager !== 'undefined' && dashboardManager) {
            dashboardManager.updateProgressBarAmounts(needs, wants, savingsDebt);
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    updateDebtSnowballDisplay(snowballData) {
        if (typeof dashboardManager !== 'undefined' && dashboardManager) {
            dashboardManager.updateDebtSnowballDisplay(snowballData);
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    showEmptyDebtState() {
        if (typeof dashboardManager !== 'undefined' && dashboardManager) {
            dashboardManager.showEmptyDebtState();
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    updateDebtSummary(totalMonths) {
        if (typeof dashboardManager !== 'undefined' && dashboardManager) {
            dashboardManager.updateDebtSummary(totalMonths);
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    updateDebtTimeline(projection) {
        if (typeof dashboardManager !== 'undefined' && dashboardManager) {
            dashboardManager.updateDebtTimeline(projection);
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    updateDebtMilestones(projection) {
        if (typeof dashboardManager !== 'undefined' && dashboardManager) {
            dashboardManager.updateDebtMilestones(projection);
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    updateDebtNextAction(projection) {
        if (typeof dashboardManager !== 'undefined' && dashboardManager) {
            dashboardManager.updateDebtNextAction(projection);
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    updateProjectionDisplay(projectionData) {
        if (typeof dashboardManager !== 'undefined' && dashboardManager) {
            dashboardManager.updateProjectionDisplay(projectionData);
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    updateContextualTips() {
        if (typeof dashboardManager !== 'undefined' && dashboardManager) {
            dashboardManager.updateContextualTips();
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    updateBudgetPerformanceTip() {
        if (typeof dashboardManager !== 'undefined' && dashboardManager) {
            dashboardManager.updateBudgetPerformanceTip();
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    updateEmergencyFundTip() {
        if (typeof dashboardManager !== 'undefined' && dashboardManager) {
            dashboardManager.updateEmergencyFundTip();
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    updateStateComparisonTip() {
        if (typeof dashboardManager !== 'undefined' && dashboardManager) {
            dashboardManager.updateStateComparisonTip();
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    updateNextMilestoneTip() {
        if (typeof dashboardManager !== 'undefined' && dashboardManager) {
            dashboardManager.updateNextMilestoneTip();
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    updateEmergencyFundTracking() {
        if (typeof dashboardManager !== 'undefined' && dashboardManager) {
            dashboardManager.updateEmergencyFundTracking();
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    adjustEmergencyFund() {
        if (typeof dashboardManager !== 'undefined' && dashboardManager) {
            dashboardManager.adjustEmergencyFund();
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    showEmptyProjectionState() {
        if (typeof dashboardManager !== 'undefined' && dashboardManager) {
            dashboardManager.showEmptyProjectionState();
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    updateProjectionMetrics(projectionData) {
        if (typeof dashboardManager !== 'undefined' && dashboardManager) {
            dashboardManager.updateProjectionMetrics(projectionData);
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    updateMonthlyProjection(projectionData) {
        if (typeof dashboardManager !== 'undefined' && dashboardManager) {
            dashboardManager.updateMonthlyProjection(projectionData);
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    updateProjectionMilestones(months) {
        if (typeof dashboardManager !== 'undefined' && dashboardManager) {
            dashboardManager.updateProjectionMilestones(months);
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    createProjectionTable(months) {
        if (typeof dashboardManager !== 'undefined' && dashboardManager) {
            dashboardManager.createProjectionTable(months);
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    findEmergencyFundMilestone(months) {
        if (typeof dashboardManager !== 'undefined' && dashboardManager) {
            return dashboardManager.findEmergencyFundMilestone(months);
        } else {
            console.error('Dashboard manager not initialized');
            return 0;
        }
    }

    findFirstDebtPayoff(months) {
        if (typeof dashboardManager !== 'undefined' && dashboardManager) {
            return dashboardManager.findFirstDebtPayoff(months);
        } else {
            console.error('Dashboard manager not initialized');
            return 0;
        }
    }

    findFullEmergencyFundMilestone(months) {
        if (typeof dashboardManager !== 'undefined' && dashboardManager) {
            return dashboardManager.findFullEmergencyFundMilestone(months);
        } else {
            console.error('Dashboard manager not initialized');
            return 0;
        }
    }

    getTotalDebtBalance() {
        if (typeof dashboardManager !== 'undefined' && dashboardManager) {
            return dashboardManager.getTotalDebtBalance();
        } else {
            console.error('Dashboard manager not initialized');
            return 0;
        }
    }

    // Chart Management Methods
    updateBudgetChart() {
        if (typeof dashboardManager !== 'undefined' && dashboardManager) {
            dashboardManager.updateBudgetChart();
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    loadBudgetOverview() {
        if (typeof dashboardManager !== 'undefined' && dashboardManager) {
            dashboardManager.loadBudgetOverview();
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    loadMonthlyTrends() {
        if (typeof dashboardManager !== 'undefined' && dashboardManager) {
            dashboardManager.loadMonthlyTrends();
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    // Budget Management Methods - Now handled by budgetManager
    async generateBudget() {
        if (typeof window.budgetManager !== 'undefined' && window.budgetManager) {
            await window.budgetManager.generateBudget();
        } else {
            console.log('Budget manager not available, using fallback budget generation');
            try {
                const methodology = document.querySelector('input[name="budget-method"]:checked')?.value || "50/30/20";

                if (!this.currentHouseholdId) {
                    throw new Error('No household ID available');
                }

                const currentDate = new Date();
                const budgetRequest = {
                    householdId: parseInt(this.currentHouseholdId),
                    methodology: methodology,
                    month: currentDate.getMonth() + 1,
                    year: currentDate.getFullYear()
                };

                console.log('Generating budget with request:', budgetRequest);
                uiManager.showLoading('Generating your personalized budget...');

                const budgetResponse = await apiManager.createBudget(budgetRequest);

                if (budgetResponse && (budgetResponse.budget || budgetResponse.budgetItems)) {
                    this.currentBudget = budgetResponse;
                    console.log('Budget generated successfully:', budgetResponse);

                    // Update dashboard if we're on dashboard page
                    if (typeof window.dashboardManager !== 'undefined' && window.dashboardManager) {
                        window.dashboardManager.updateDashboardWithBudget(budgetResponse);
                    }

                    // If on budget page, try to display categories
                    const budgetContainer = document.getElementById('budget-categories');
                    if (budgetContainer && budgetResponse.budgetItems) {
                        this.displayBudgetFallback(budgetResponse.budgetItems);
                    }

                    uiManager.showSuccessAlert('Budget generated successfully!');
                    uiManager.hideLoading();
                } else {
                    throw new Error('Invalid budget response from server');
                }
            } catch (error) {
                console.error('Error in fallback budget generation:', error);
                uiManager.hideLoading();
                uiManager.showErrorAlert('Error generating budget: ' + error.message);
            }
        }
    }

    displayBudgetFallback(budgetItems) {
        const container = document.getElementById('budget-categories');
        if (!container || !budgetItems || budgetItems.length === 0) return;

        container.innerHTML = `
            <div class="alert alert-success">
                <i class="bi bi-check-circle me-2"></i>
                Budget generated successfully! ${budgetItems.length} categories created.
                <br><small>Navigate to the budget page to view and adjust your budget in detail.</small>
            </div>
            <div class="row">
                ${budgetItems.slice(0, 6).map(item => `
                    <div class="col-md-4 mb-3">
                        <div class="card">
                            <div class="card-body">
                                <h6 class="card-title">${item.category?.name || 'Category'}</h6>
                                <p class="card-text h5 text-primary">$${(item.plannedAmount || 0).toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                `).join('')}
                ${budgetItems.length > 6 ? `
                    <div class="col-12">
                        <p class="text-muted text-center">... and ${budgetItems.length - 6} more categories</p>
                    </div>
                ` : ''}
            </div>
        `;
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
        try {
            console.log('Setting up event listeners...');

            // Budget method change (only on budget page)
            const budgetMethodInputs = document.querySelectorAll('input[name="budget-method"]');
            if (budgetMethodInputs.length > 0) {
                budgetMethodInputs.forEach(radio => {
                    radio.addEventListener('change', () => {
                        this.updateBudgetMethodDescription();
                    });
                });
                console.log('Budget method change listeners attached');
            }

            // Generate budget button (on both budget and dashboard pages)
            const generateBudgetBtn = document.getElementById('generate-budget');
            if (generateBudgetBtn) {
                generateBudgetBtn.addEventListener('click', async () => {
                    console.log('Generate budget button clicked');
                    try {
                        if (typeof window.budgetManager !== 'undefined' && window.budgetManager) {
                            await window.budgetManager.generateBudget();
                        } else {
                            console.log('Budget manager not available, calling app method');
                            await this.generateBudget();
                        }
                    } catch (error) {
                        console.error('Error generating budget:', error);
                        uiManager.showErrorAlert('Error generating budget. Please try again.');
                    }
                });
                console.log('Generate budget button listener attached');
            }

            // Save budget button (only on budget page)
            const saveBudgetBtn = document.getElementById('save-budget');
            if (saveBudgetBtn) {
                saveBudgetBtn.addEventListener('click', async () => {
                    console.log('Save budget button clicked');
                    try {
                        if (typeof window.budgetManager !== 'undefined' && window.budgetManager) {
                            await window.budgetManager.saveBudget();
                        } else {
                            uiManager.showErrorAlert('Budget manager not available');
                        }
                    } catch (error) {
                        console.error('Error saving budget:', error);
                        uiManager.showErrorAlert('Error saving budget. Please try again.');
                    }
                });
                console.log('Save budget button listener attached');
            }

            // Chart type toggle (only on dashboard page)
            const chartTypeInputs = document.querySelectorAll('input[name="chart-type"]');
            if (chartTypeInputs.length > 0) {
                chartTypeInputs.forEach(radio => {
                    radio.addEventListener('change', () => {
                        if (this.currentBudget) {
                            this.updateBudgetChart();
                        }
                    });
                });
                console.log('Chart type toggle listeners attached');
            }

            console.log('Event listeners setup completed');
        } catch (error) {
            console.error('Error setting up event listeners:', error);
        }
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

    clearCorruptedStorage() {
        try {
            console.log('Clearing potentially corrupted localStorage data...');
            sessionStorage.removeItem('userEmail');
            localStorage.removeItem('currentHouseholdId');
            console.log('localStorage cleared successfully');
        } catch (error) {
            console.error('Error clearing localStorage:', error);
        }
    }
}

// Create global app instance if it doesn't exist
if (typeof window.financialApp === 'undefined') {
    window.financialApp = new FinancialApp();
}

// Initialize managers with better error handling
function initializeManagers() {
    try {
        console.log('Initializing managers...');

        // Check core managers
        if (typeof window.uiManager === 'undefined') {
            console.error('ERROR: uiManager not found - ui.js may not have loaded correctly');
            return false;
        }

        if (typeof window.apiManager === 'undefined') {
            console.error('ERROR: apiManager not found - api.js may not have loaded correctly');
            return false;
        }

        console.log('Core managers (uiManager, apiManager) found and ready');

        // Initialize budget manager if available and not already initialized
        if (typeof window.BudgetManager !== 'undefined') {
            if (typeof window.budgetManager === 'undefined' && window.financialApp) {
                try {
                    window.budgetManager = new BudgetManager(window.financialApp);
                    console.log('Budget manager initialized successfully');
                } catch (error) {
                    console.error('Error initializing budget manager:', error);
                }
            } else if (window.budgetManager) {
                console.log('Budget manager already initialized');
                // Make sure it has the app reference
                if (!window.budgetManager.financialApp && window.financialApp) {
                    window.budgetManager.financialApp = window.financialApp;
                }
            } else {
                console.log('Budget manager cannot be initialized - financialApp not ready');
            }
        } else {
            console.log('Budget manager class not available (budget.js may not be loaded)');
        }

        // Initialize dashboard manager if available and not already initialized  
        if (typeof window.DashboardManager !== 'undefined') {
            if (typeof window.dashboardManager === 'undefined' && window.financialApp) {
                try {
                    window.dashboardManager = new DashboardManager(window.financialApp);
                    console.log('Dashboard manager initialized successfully');
                } catch (error) {
                    console.error('Error initializing dashboard manager:', error);
                }
            } else if (window.dashboardManager) {
                console.log('Dashboard manager already initialized');
                // Make sure it has the app reference
                if (!window.dashboardManager.financialApp && window.financialApp) {
                    window.dashboardManager.financialApp = window.financialApp;
                }
            } else {
                console.log('Dashboard manager cannot be initialized - financialApp not ready');
            }
        } else {
            console.log('Dashboard manager class not available (dashboard.js may not be loaded)');
        }

        console.log('Manager initialization completed');
        return true;

    } catch (error) {
        console.error('ERROR during manager initialization:', error);
        return false;
    }
}

// Retry mechanism for manager initialization
function ensureManagersInitialized() {
    let attempts = 0;
    const maxAttempts = 3;
    
    const tryInitialize = () => {
        attempts++;
        console.log(`Manager initialization attempt ${attempts}/${maxAttempts}`);
        
        const success = initializeManagers();
        if (!success && attempts < maxAttempts) {
            console.log('Retrying manager initialization in 100ms...');
            setTimeout(tryInitialize, 100);
        } else if (!success) {
            console.error('Failed to initialize managers after', maxAttempts, 'attempts');
        }
    };
    
    tryInitialize();
}

// Initialize managers immediately if possible, or set up deferred initialization
if (window.financialApp) {
    initializeManagers();
} else {
    console.log('Financial app not ready, will initialize managers after app initialization');
}

// Navigation functions
window.showDashboard = () => window.location.href = 'dashboard.html';
window.showBudgetSection = () => window.location.href = 'budget.html';
window.showModulesSection = () => window.location.href = 'modules.html';
window.addTransaction = () => financialApp.addTransaction();
window.viewReports = () => financialApp.viewReports();
window.toggleCategoryView = () => financialApp.toggleCategoryView();
window.adjustEmergencyFund = () => financialApp.adjustEmergencyFund();