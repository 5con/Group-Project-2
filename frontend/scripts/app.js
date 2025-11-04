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
            // CRITICAL: Don't initialize on standalone pages (dashboard, budget, modules, account)
            const currentPage = window.location.pathname.split('/').pop() || '';
            const standalonePages = ['dashboard.html', 'budget.html', 'modules.html', 'account.html'];
            if (standalonePages.includes(currentPage)) {
                console.log('[APP.INIT] Standalone page detected - skipping app.init() on:', currentPage);
                return;
            }
            
            // CRITICAL: Don't initialize if onboarding redirect is in progress
            if (window.onboardingRedirectInProgress) {
                console.log('[APP.INIT] Onboarding redirect in progress - skipping app.init()');
                return;
            }
            
            // CRITICAL: Check if onboarding was just completed - if so, don't show login
            // This check must happen BEFORE any async operations
            const onboardingCompleted = localStorage.getItem('onboardingCompleted') === 'true';
            if (onboardingCompleted || window.onboardingJustCompleted) {
                console.log('[APP.INIT] Onboarding just completed - skipping app.init() to prevent interference');
                console.log('[APP.INIT] onboardingCompleted:', onboardingCompleted, 'onboardingJustCompleted:', window.onboardingJustCompleted);
                return;
            }
            
            console.log('[APP.INIT] Starting app initialization...');

            // Check if managers are available
            if (!authManager || !uiManager || !apiManager) {
                throw new Error('Required managers not initialized. Check console for module loading errors.');
            }

            // Load reference data first before showing any UI
            console.log('[APP.INIT] Loading reference data before showing UI...');
            uiManager.showLoading('Loading application data...');
            await this.loadReferenceData();
            uiManager.hideLoading();

            // Check again after async operations (in case something changed)
            const onboardingCompletedAfterLoad = localStorage.getItem('onboardingCompleted') === 'true';
            if (onboardingCompletedAfterLoad || window.onboardingJustCompleted) {
                console.log('[APP.INIT] Onboarding just completed (after load) - redirecting to dashboard');
                window.location.replace('dashboard.html');
                return;
            }
            
            // Check if user is already authenticated
            if (authManager.isAuthenticated && authManager.getCurrentUser()) {
                console.log('[APP.INIT] User already authenticated, checking user status');
                // User is already authenticated, check if they're first-time or existing
                await this.checkFirstTimeUser();
            } else {
                // Final check before showing login - maybe onboarding completed during async operations
                const finalOnboardingCheck = localStorage.getItem('onboardingCompleted') === 'true';
                if (finalOnboardingCheck || window.onboardingJustCompleted) {
                    console.log('[APP.INIT] Onboarding completed - redirecting to dashboard instead of showing login');
                    window.location.replace('dashboard.html');
                    return;
                }
                
                // Show login screen for unauthenticated users
                console.log('[APP.INIT] Showing login screen for unauthenticated user');
                uiManager.showLogin();
            }

            console.log('App initialization completed successfully');
        } catch (error) {
            console.error('CRITICAL ERROR during app initialization:', error);
            uiManager.hideLoading();
            uiManager.showErrorAlert('Failed to initialize application: ' + error.message);
        }
    }

    async checkFirstTimeUser() {
        try {
            // CRITICAL: Check if onboarding was just completed - if so, don't do anything
            const onboardingCompleted = localStorage.getItem('onboardingCompleted') === 'true';
            if (onboardingCompleted || window.onboardingJustCompleted) {
                console.log('[CHECKFIRSTTIME] Onboarding just completed - skipping check');
                return;
            }
            
            console.log('[CHECKFIRSTTIME] Checking if user is first-time...');

            if (!authManager.getCurrentUser()) {
                throw new Error('No authenticated user found');
            }

            const userEmail = authManager.getCurrentUser().email;
            const isDeveloper = authManager.isInDeveloperMode();
            console.log('[CHECKFIRSTTIME] Checking user status for:', userEmail, 'Developer mode:', isDeveloper);

            // For developers, always show onboarding (every time)
            if (isDeveloper) {
                console.log('[CHECKFIRSTTIME] Developer mode detected, showing onboarding');
                // Ensure reference data is loaded before showing onboarding
                if (this.states.length === 0 || this.categories.length === 0) {
                    console.log('[CHECKFIRSTTIME] Reference data not loaded yet, loading now...');
                    await this.loadReferenceData();
                }
                uiManager.showSection('onboarding');
                return;
            }

            // For regular users, check if they're first-time
            const userStatus = await apiManager.checkFirstTimeUser(userEmail);
            console.log('[CHECKFIRSTTIME] User status received:', userStatus);

            // Check again after async operation
            const onboardingCompletedAfterCheck = localStorage.getItem('onboardingCompleted') === 'true';
            if (onboardingCompletedAfterCheck || window.onboardingJustCompleted) {
                console.log('[CHECKFIRSTTIME] Onboarding completed during check - skipping');
                return;
            }

            if (userStatus.isFirstTime) {
                console.log('[CHECKFIRSTTIME] First-time user detected, showing onboarding');
                // First-time user, show onboarding
                // Ensure reference data is loaded before showing onboarding
                if (this.states.length === 0 || this.categories.length === 0) {
                    console.log('[CHECKFIRSTTIME] Reference data not loaded yet, loading now...');
                    await this.loadReferenceData();
                }
                uiManager.showSection('onboarding');
            } else {
                console.log('[CHECKFIRSTTIME] Existing user detected, showing dashboard');
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
            // Ensure reference data is loaded before showing onboarding
            if (this.states.length === 0 || this.categories.length === 0) {
                console.log('Reference data not loaded yet, loading now...');
                await this.loadReferenceData();
            }
            uiManager.showSection('onboarding');

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

    populateStateDropdown() {
        const stateSelect = document.getElementById('state');

        // Only populate if we're on a page that has the state dropdown (index.html)
        if (!stateSelect) {
            // Silently return - this is expected on pages other than index.html
            return;
        }

        console.log('=== POPULATING STATE DROPDOWN ===');
        console.log('populateStateDropdown called');

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
            if (state) {
                // Handle both 'State' (from API) and 'state' (from fallback) property names
                const stateCode = state.State || state.state;
                const stateName = state.StateName || state.State || state.state || stateCode;

                if (stateCode) {
                    const option = document.createElement('option');
                    option.value = stateCode;
                    option.textContent = stateName;
                    stateSelect.appendChild(option);
                }
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

            // CRITICAL: Preserve existing auth state - user is already logged in
            // Get email from formData (which should match logged-in user from authManager)
            const userEmail = formData.email;
            
            // CRITICAL: Preserve existing auth token from login - don't create a new one
            // The user logged in, so we should use their existing token
            let authToken = authManager.authToken || localStorage.getItem('authToken');
            
            // If we still don't have a token, check if response provides one
            if (!authToken && response.token) {
                authToken = response.token;
            }
            
            // Only create a new token if we absolutely don't have one (shouldn't happen if user logged in)
            if (!authToken) {
                console.warn('WARNING: No existing auth token found, creating new one');
                authToken = 'onboarding-session-' + Date.now();
            }
            
            // CRITICAL: Preserve userId from existing auth if available
            const existingUserId = authManager.currentUser?.userId || response.userId;
            
            // Set authentication state to keep user logged in - PRESERVE existing state
            authManager.authToken = authToken;
            authManager.isAuthenticated = true;
            authManager.currentUser = { email: userEmail, userId: existingUserId };
            authManager.isDeveloperMode = false;
            
            // Save ALL auth data to localStorage to ensure persistence
            // Do this multiple times to ensure it's saved
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('userEmail', userEmail);
            if (typeof existingUserId !== 'undefined') {
                localStorage.setItem('userId', String(existingUserId));
            } else {
                // Ensure userId is set even if undefined
                localStorage.setItem('userId', '0');
            }
            localStorage.setItem('isDeveloperMode', 'false');
            
            // Mark that onboarding was just completed (for dashboard to show welcome message)
            // This flag also tells dashboard.html to skip auth check
            localStorage.setItem('onboardingCompleted', 'true');
            localStorage.setItem('onboardingHouseholdId', String(response.householdId));
            
            // Verify the data was saved - triple check with multiple reads
            const savedToken = localStorage.getItem('authToken');
            const savedEmail = localStorage.getItem('userEmail');
            const savedUserId = localStorage.getItem('userId');
            console.log('Auth data saved - Token:', savedToken ? 'Present' : 'Missing', 'Email:', savedEmail, 'UserId:', savedUserId);
            console.log('AuthManager state - isAuthenticated:', authManager.isAuthenticated, 'currentUser:', authManager.currentUser);
            
            // Final verification - read back one more time
            const finalToken = localStorage.getItem('authToken');
            const finalEmail = localStorage.getItem('userEmail');
            console.log('Final verification - Token:', finalToken ? 'Confirmed' : 'MISSING', 'Email:', finalEmail || 'MISSING');
            
            if (!finalToken || !finalEmail) {
                console.error('ERROR: Failed to save auth data to localStorage after multiple attempts');
                throw new Error('Failed to save authentication data. Please try again.');
            }
            
            // Setup auth headers for future API calls
            authManager.setupAuthHeaders();
            
            console.log('=== ONBOARDING COMPLETE - REDIRECTING TO DASHBOARD ===');
            console.log('User authentication state saved after onboarding - redirecting to dashboard.html');
            console.log('Auth data will be available on dashboard:', { token: finalToken ? 'YES' : 'NO', email: finalEmail || 'NO' });
            console.log('Final verification - checking localStorage one more time before redirect:');
            console.log('  - authToken:', localStorage.getItem('authToken') ? 'PRESENT' : 'MISSING');
            console.log('  - userEmail:', localStorage.getItem('userEmail') || 'MISSING');
            console.log('  - userId:', localStorage.getItem('userId') || 'MISSING');
            console.log('  - onboardingCompleted:', localStorage.getItem('onboardingCompleted') || 'MISSING');
            console.log('  - onboardingHouseholdId:', localStorage.getItem('onboardingHouseholdId') || 'MISSING');

            // CRITICAL: Set flags to prevent any other code from running
            // This prevents app.init() or any other code from interfering
            window.onboardingRedirectInProgress = true;
            window.onboardingJustCompleted = true;
            
            // CRITICAL: Ensure all flags are set before redirect
            // Double-check that everything is saved
            if (!localStorage.getItem('authToken') || !localStorage.getItem('userEmail')) {
                console.error('CRITICAL ERROR: Auth data not in localStorage before redirect!');
                throw new Error('Failed to save authentication data. Please try again.');
            }
            
            console.log('=== EXECUTING REDIRECT TO dashboard.html NOW ===');
            console.log('Current URL:', window.location.href);
            console.log('About to redirect to dashboard.html...');
            
            // CRITICAL: Stop ALL event propagation and prevent any other code from running
            if (window.stop) {
                window.stop(); // Stop page loading
            }
            
            // CRITICAL: Use window.location.replace immediately - this should stop all execution
            console.log('Executing window.location.replace("dashboard.html")...');
            window.location.replace('dashboard.html');
            
            // Force immediate redirect - try multiple methods
            window.location.href = 'dashboard.html';
            window.location = 'dashboard.html';
            
            // This code should NEVER execute - if it does, something is very wrong
            console.error('CRITICAL: Redirect code executed - this should not happen!');
            alert('Redirect failed - please manually navigate to dashboard.html');
        } catch (error) {
            console.error('ERROR submitting onboarding:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                formData: error.formData
            });

            // CRITICAL: If this is the redirect error we threw, ignore it
            if (error.message.includes('Redirect should have happened')) {
                console.log('Redirect error - this is expected, ignoring');
                return;
            }

            // CRITICAL: Even if there's an error, if we have auth data, try to redirect anyway
            // This prevents the user from being stuck on the login page
            const hasAuthData = localStorage.getItem('authToken') && localStorage.getItem('userEmail');
            const onboardingCompleted = localStorage.getItem('onboardingCompleted') === 'true';
            
            if (hasAuthData && onboardingCompleted) {
                console.log('ERROR occurred but auth data exists - attempting redirect anyway');
                window.onboardingRedirectInProgress = true;
                window.onboardingJustCompleted = true;
                window.location.replace('dashboard.html');
                return;
            }

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
        if (!container) {
            console.error('Income container not found');
            return;
        }
        
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
                        <input type="number" class="form-control income-amount" placeholder="Amount" step="50" required>
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
        const removeBtn = entry.querySelector('.remove-income');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                entry.remove();
            });
        }
    }

    addDebtEntry() {
        const container = document.getElementById('debt-container');
        if (!container) {
            console.error('Debt container not found');
            return;
        }
        
        const entry = document.createElement('div');
        entry.className = 'debt-entry border rounded p-3 mb-3';
        entry.innerHTML = `
            <div class="row g-2">
                <div class="col-12 col-md-2 mb-2">
                    <label class="form-label small text-muted mb-1">Debt Type</label>
                    <select class="form-select debt-type form-select-sm" required>
                        <option value="">Type...</option>
                        <option value="credit-card">Credit Card</option>
                        <option value="student-loan">Student Loan</option>
                        <option value="auto-loan">Auto Loan</option>
                        <option value="mortgage">Mortgage</option>
                        <option value="personal-loan">Personal Loan</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <div class="col-12 col-md-2 mb-2">
                    <label class="form-label small text-muted mb-1">Debt Name</label>
                    <input type="text" class="form-control debt-name form-control-sm" placeholder="e.g., Chase Visa" required>
                </div>
                <div class="col-6 col-md-2 mb-2">
                    <label class="form-label small text-muted mb-1">Balance</label>
                    <div class="input-group input-group-sm">
                        <span class="input-group-text">$</span>
                        <input type="number" class="form-control debt-balance" placeholder="0.00" step="50" required>
                    </div>
                </div>
                <div class="col-6 col-md-2 mb-2">
                    <label class="form-label small text-muted mb-1">APR (%)</label>
                    <div class="input-group input-group-sm">
                        <input type="number" class="form-control debt-apr" placeholder="0" step="1" min="0" max="100">
                        <span class="input-group-text">%</span>
                    </div>
                </div>
                <div class="col-6 col-md-2 mb-2">
                    <label class="form-label small text-muted mb-1">Min Payment</label>
                    <div class="input-group input-group-sm">
                        <span class="input-group-text">$</span>
                        <input type="number" class="form-control debt-min-payment" placeholder="0.00" step="50">
                    </div>
                </div>
                <div class="col-6 col-md-2 mb-2 d-flex align-items-end">
                    <button type="button" class="btn btn-outline-danger btn-sm w-100 remove-debt" title="Remove debt">
                        <i class="bi bi-trash"></i> Remove
                    </button>
                </div>
            </div>
        `;

        container.appendChild(entry);

        // Add remove functionality
        entry.querySelector('.remove-debt').addEventListener('click', () => {
            entry.remove();
        });
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

    async loadBudgetAndShowDashboard() {
        console.log('Loading budget data and showing dashboard');
        uiManager.showSection('dashboard');

        if (!this.currentHouseholdId) {
            console.error('No household ID available');
            uiManager.showErrorAlert('Error: No household found. Please try logging in again.');
            return;
        }

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

                // Show success message about budget generation
                uiManager.showSuccessAlert('Your personalized budget has been generated! Review and customize it using the budget builder.');
            } else {
                console.warn('No budget data found, generating new budget...');
                await this.generateNewBudget();
            }
        } catch (error) {
            console.error('Error loading budget data:', error);
            uiManager.showErrorAlert('Error loading your budget. Please try refreshing the page.');
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
        if (dashboardManager) {
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
        if (dashboardManager) {
        uiManager.showSection('reports');
        // Generate and display reports
            dashboardManager.generateReports();
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    toggleCategoryView() {
        if (dashboardManager) {
            dashboardManager.toggleCategoryView();
                } else {
            console.error('Dashboard manager not initialized');
        }
    }

    generateReports() {
        if (dashboardManager) {
            dashboardManager.generateReports();
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    // Data Loading Methods - Now handled by dashboardManager
    async loadDashboardData() {
        if (dashboardManager) {
            await dashboardManager.loadDashboardData();
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    updateDashboardWithBudget(budgetData) {
        if (dashboardManager) {
            dashboardManager.updateDashboardWithBudget(budgetData);
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    updateBudgetCategoriesDisplay(budgetItems) {
        if (dashboardManager) {
            dashboardManager.updateBudgetCategoriesDisplay(budgetItems);
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    updateBudgetBreakdownCards(needs, wants, savingsDebt) {
        if (dashboardManager) {
            dashboardManager.updateBudgetBreakdownCards(needs, wants, savingsDebt);
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    updateProgressBarAmounts(needs, wants, savingsDebt) {
        if (dashboardManager) {
            dashboardManager.updateProgressBarAmounts(needs, wants, savingsDebt);
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    updateDebtSnowballDisplay(snowballData) {
        if (dashboardManager) {
            dashboardManager.updateDebtSnowballDisplay(snowballData);
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    showEmptyDebtState() {
        if (dashboardManager) {
            dashboardManager.showEmptyDebtState();
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    updateDebtSummary(totalMonths) {
        if (dashboardManager) {
            dashboardManager.updateDebtSummary(totalMonths);
                } else {
            console.error('Dashboard manager not initialized');
        }
    }

    updateDebtTimeline(projection) {
        if (dashboardManager) {
            dashboardManager.updateDebtTimeline(projection);
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    updateDebtMilestones(projection) {
        if (dashboardManager) {
            dashboardManager.updateDebtMilestones(projection);
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    updateDebtNextAction(projection) {
        if (dashboardManager) {
            dashboardManager.updateDebtNextAction(projection);
            } else {
            console.error('Dashboard manager not initialized');
        }
    }

    updateProjectionDisplay(projectionData) {
        if (dashboardManager) {
            dashboardManager.updateProjectionDisplay(projectionData);
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    updateContextualTips() {
        if (dashboardManager) {
            dashboardManager.updateContextualTips();
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    updateBudgetPerformanceTip() {
        if (dashboardManager) {
            dashboardManager.updateBudgetPerformanceTip();
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    updateEmergencyFundTip() {
        if (dashboardManager) {
            dashboardManager.updateEmergencyFundTip();
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    updateStateComparisonTip() {
        if (dashboardManager) {
            dashboardManager.updateStateComparisonTip();
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    updateNextMilestoneTip() {
        if (dashboardManager) {
            dashboardManager.updateNextMilestoneTip();
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    updateEmergencyFundTracking() {
        if (dashboardManager) {
            dashboardManager.updateEmergencyFundTracking();
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    adjustEmergencyFund() {
        if (dashboardManager) {
            dashboardManager.adjustEmergencyFund();
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    showEmptyProjectionState() {
        if (dashboardManager) {
            dashboardManager.showEmptyProjectionState();
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    updateProjectionMetrics(projectionData) {
        if (dashboardManager) {
            dashboardManager.updateProjectionMetrics(projectionData);
            } else {
            console.error('Dashboard manager not initialized');
        }
    }

    updateMonthlyProjection(projectionData) {
        if (dashboardManager) {
            dashboardManager.updateMonthlyProjection(projectionData);
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    updateProjectionMilestones(months) {
        if (dashboardManager) {
            dashboardManager.updateProjectionMilestones(months);
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    createProjectionTable(months) {
        if (dashboardManager) {
            dashboardManager.createProjectionTable(months);
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    findEmergencyFundMilestone(months) {
        if (dashboardManager) {
            return dashboardManager.findEmergencyFundMilestone(months);
        } else {
            console.error('Dashboard manager not initialized');
        return 0;
        }
    }

    findFirstDebtPayoff(months) {
        if (dashboardManager) {
            return dashboardManager.findFirstDebtPayoff(months);
        } else {
            console.error('Dashboard manager not initialized');
        return 0;
        }
    }

    findFullEmergencyFundMilestone(months) {
        if (dashboardManager) {
            return dashboardManager.findFullEmergencyFundMilestone(months);
        } else {
            console.error('Dashboard manager not initialized');
        return 0;
        }
    }

    getTotalDebtBalance() {
        if (dashboardManager) {
            return dashboardManager.getTotalDebtBalance();
        } else {
            console.error('Dashboard manager not initialized');
        return 0;
        }
    }

    // Chart Management Methods
    updateBudgetChart() {
        if (dashboardManager) {
            dashboardManager.updateBudgetChart();
            } else {
            console.error('Dashboard manager not initialized');
        }
    }

    loadBudgetOverview() {
        if (dashboardManager) {
            dashboardManager.loadBudgetOverview();
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    loadMonthlyTrends() {
        if (dashboardManager) {
            dashboardManager.loadMonthlyTrends();
        } else {
            console.error('Dashboard manager not initialized');
        }
    }

    // Budget Management Methods - Now handled by budgetManager
    async generateBudget() {
        if (budgetManager) {
            await budgetManager.generateBudget();
        } else {
            console.error('Budget manager not initialized');
            uiManager.showErrorAlert('Budget functionality not available');
        }
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
        const onboardingForm = document.getElementById('onboarding-form');
        if (onboardingForm) {
            // Remove any existing listeners first
            const newForm = onboardingForm.cloneNode(true);
            onboardingForm.parentNode.replaceChild(newForm, onboardingForm);
            
            newForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                
                console.log('[ONBOARDING FORM] Form submitted, calling handleOnboardingSubmit');
                
                try {
                    await this.handleOnboardingSubmit();
                    console.log('[ONBOARDING FORM] handleOnboardingSubmit completed - redirect should have happened');
                } catch (error) {
                    console.error('[ONBOARDING FORM] Error in handleOnboardingSubmit:', error);
                    
                    // CRITICAL: Even if there's an error, check if we have auth data and redirect
                    const hasAuthData = localStorage.getItem('authToken') && localStorage.getItem('userEmail');
                    const onboardingCompleted = localStorage.getItem('onboardingCompleted') === 'true';
                    
                    if (hasAuthData && onboardingCompleted) {
                        console.log('[ONBOARDING FORM] Redirecting to dashboard after error - auth data exists');
                        window.onboardingRedirectInProgress = true;
                        window.onboardingJustCompleted = true;
                        window.location.replace('dashboard.html');
                        return;
                    }
                    
                    // If redirect error (expected), ignore it
                    if (error.message && error.message.includes('Redirect should have happened')) {
                        console.log('[ONBOARDING FORM] Redirect error - this is expected, ignoring');
                        return;
                    }
                }
            });
        }

        // Add income button - use event delegation for dynamic content
        const addIncomeBtn = document.getElementById('add-income');
        if (addIncomeBtn) {
            // Remove any existing listeners by cloning
            const newBtn = addIncomeBtn.cloneNode(true);
            addIncomeBtn.parentNode.replaceChild(newBtn, addIncomeBtn);
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.addIncomeEntry();
            });
            console.log('Add income button listener attached');
        } else {
            console.warn('Add income button not found - may not be on current page');
        }

        // Add debt button - use event delegation for dynamic content
        const addDebtBtn = document.getElementById('add-debt');
        if (addDebtBtn) {
            // Remove any existing listeners by cloning
            const newBtn = addDebtBtn.cloneNode(true);
            addDebtBtn.parentNode.replaceChild(newBtn, addDebtBtn);
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.addDebtEntry();
            });
            console.log('Add debt button listener attached');
        } else {
            console.warn('Add debt button not found - may not be on current page');
        }
        
        // Add remove listeners to existing income entries (first entry)
        document.querySelectorAll('.remove-income').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const entry = btn.closest('.income-entry');
                if (entry) {
                    // Don't remove if it's the only entry
                    const allEntries = document.querySelectorAll('.income-entry');
                    if (allEntries.length > 1) {
                        entry.remove();
                    } else {
                        alert('You must have at least one income entry');
                    }
                }
            });
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

// Initialize budget and dashboard managers
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

    // Initialize budget manager if budget.js loaded
    let budgetManager = undefined;
    if (typeof BudgetManager !== 'undefined') {
        budgetManager = new BudgetManager(financialApp);
        console.log('Budget manager initialized');
    } else {
        console.warn('Budget manager not available - budget.js may not have loaded correctly');
    }

    // Initialize dashboard manager if dashboard.js loaded
    let dashboardManager = undefined;
    if (typeof DashboardManager !== 'undefined') {
        dashboardManager = new DashboardManager(financialApp);
        console.log('Dashboard manager initialized');
    } else {
        console.warn('Dashboard manager not available - dashboard.js may not have loaded correctly');
    }

    // Expose managers globally for cross-module access (they should already be defined)
    window.authManager = authManager;
    window.uiManager = uiManager;
    window.apiManager = apiManager;
    window.financialApp = financialApp;
    
    // Only expose managers if they were initialized
    if (budgetManager !== undefined) {
        window.budgetManager = budgetManager;
    }
    if (dashboardManager !== undefined) {
        window.dashboardManager = dashboardManager;
    }

    console.log('All modules loaded and globals exposed successfully');

} catch (error) {
    console.error('ERROR setting up global modules:', error);
}

// Expose functions globally for onclick handlers
window.showDashboard = () => window.location.href = 'dashboard.html';
window.showBudgetSection = () => window.location.href = 'budget.html';
window.showModulesSection = () => window.location.href = 'modules.html';
window.addTransaction = () => financialApp.addTransaction();
window.viewReports = () => financialApp.viewReports();
window.toggleCategoryView = () => financialApp.toggleCategoryView();
window.adjustEmergencyFund = () => financialApp.adjustEmergencyFund();