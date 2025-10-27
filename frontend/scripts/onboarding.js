// Onboarding Module

class OnboardingManager {
    constructor() {
        this.states = [];
        this.categories = [];
    }

    async init() {
        try {
            console.log('Initializing onboarding...');

            // Check if managers are available
            if (!window.uiManager || !window.apiManager) {
                throw new Error('Required managers not initialized');
            }

            // Load reference data
            await this.loadReferenceData();

            // Set up form data
            this.setupFormData();

            // Set up event listeners
            this.setupEventListeners();

            console.log('Onboarding initialized successfully');
        } catch (error) {
            console.error('ERROR initializing onboarding:', error);
            window.uiManager.showErrorAlert('Failed to initialize onboarding: ' + error.message);
        }
    }

    async loadReferenceData() {
        try {
            console.log('Loading reference data for onboarding...');
            const data = await window.apiManager.loadReferenceData();
            console.log('Reference data loaded:', data);

            if (!data) {
                throw new Error('No data received from server');
            }

            if (!data.states || !Array.isArray(data.states)) {
                throw new Error('Invalid or missing states data from server');
            }

            // Store states in both onboarding manager and main app instances
            this.states = data.states;
            this.categories = data.categories || [];

            // Also store in the main financial app instance
            if (window.financialApp) {
                window.financialApp.states = data.states;
                window.financialApp.categories = data.categories || [];
                console.log(`Loaded ${window.financialApp.states.length} states and ${window.financialApp.categories.length} categories into main app`);
                console.log('financialApp instance:', window.financialApp);
                console.log('financialApp.states after assignment:', window.financialApp.states);
            } else {
                console.error('window.financialApp not available when trying to store states');
            }

            console.log(`Loaded ${this.states.length} states and ${this.categories.length} categories`);

            if (this.states.length === 0) {
                console.warn('No states found from API, using fallback states');
                this.states = this.getFallbackStates();
                console.log('Fallback states loaded:', this.states.length);
                if (window.financialApp) {
                    window.financialApp.states = this.states;
                    console.log('Fallback states stored in financialApp:', window.financialApp.states.length);
                }
            }

            // Use the main app's populateStateDropdown method
            if (window.financialApp && window.financialApp.populateStateDropdown) {
                // Ensure DOM is ready before populating
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', () => {
                        window.financialApp.populateStateDropdown();
                    });
                } else {
                    window.financialApp.populateStateDropdown();
                }
            } else {
                console.warn('Financial app not available for state dropdown population');
                // Retry after a short delay if financialApp isn't ready yet
                setTimeout(() => {
                    if (window.financialApp && window.financialApp.populateStateDropdown) {
                        console.log('Retrying state dropdown population after delay...');
                        if (document.readyState === 'loading') {
                            document.addEventListener('DOMContentLoaded', () => {
                                window.financialApp.populateStateDropdown();
                            });
                        } else {
                            window.financialApp.populateStateDropdown();
                        }
                    }
                }, 100);
            }
        } catch (error) {
            console.error('ERROR loading reference data:', error);

            // Use fallback states if API fails
            console.log('Using fallback states due to API error');
            this.states = this.getFallbackStates();
            this.categories = this.getFallbackCategories();
            console.log('Fallback states loaded in error case:', this.states.length);

            // Also store fallback data in main app
            if (window.financialApp) {
                window.financialApp.states = this.states;
                window.financialApp.categories = this.categories;
                console.log(`Loaded fallback ${window.financialApp.states.length} states and ${window.financialApp.categories.length} categories into main app`);
                console.log('financialApp.states in error case:', window.financialApp.states);
            } else {
                console.error('window.financialApp not available in error case');
            }

            try {
                // Use the main app's populateStateDropdown method
            if (window.financialApp && window.financialApp.populateStateDropdown) {
                // Ensure DOM is ready before populating
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', () => {
                        window.financialApp.populateStateDropdown();
                    });
                } else {
                    window.financialApp.populateStateDropdown();
                }
            } else {
                console.warn('Financial app not available for state dropdown population');
                // Retry after a short delay if financialApp isn't ready yet
                setTimeout(() => {
                    if (window.financialApp && window.financialApp.populateStateDropdown) {
                        console.log('Retrying state dropdown population after error delay...');
                        if (document.readyState === 'loading') {
                            document.addEventListener('DOMContentLoaded', () => {
                                window.financialApp.populateStateDropdown();
                            });
                        } else {
                            window.financialApp.populateStateDropdown();
                        }
                    }
                }, 200);
            }
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
        console.log('Populating state dropdown');
        const stateSelect = document.getElementById('state');

        if (!stateSelect) {
            console.log('State select element not found on current page');
            return;
        }

        stateSelect.innerHTML = '<option value="">Select your state...</option>';

        if (!this.states || this.states.length === 0) {
            console.error('No states data available to populate dropdown');
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

    setupFormData() {
        // Set up form data using stored email when available
        console.log('Setting up form data...');
        const emailField = document.getElementById('email');
        const emailDisplay = document.getElementById('user-email-display');

        const storedEmail = (function() {
            try { return sessionStorage.getItem('userEmail') || localStorage.getItem('userEmail') || ''; }
            catch { return ''; }
        })();

        if (emailField) {
            emailField.value = storedEmail;
        }
        if (emailDisplay) {
            emailDisplay.textContent = storedEmail;
        }
    }

    setupEventListeners() {
        // Onboarding form submission
        const onboardingForm = document.getElementById('onboarding-form');
        if (onboardingForm) {
            onboardingForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleOnboardingSubmit();
            });
        }

        // Add income button
        const addIncomeBtn = document.getElementById('add-income');
        if (addIncomeBtn) {
            addIncomeBtn.addEventListener('click', () => {
                this.addIncomeEntry();
            });
        }

        // Add debt button
        const addDebtBtn = document.getElementById('add-debt');
        if (addDebtBtn) {
            addDebtBtn.addEventListener('click', () => {
                this.addDebtEntry();
            });
        }
    }

    getOnboardingFormData() {
        try {
            console.log('Getting onboarding form data...');

            const incomes = [];
            document.querySelectorAll('.income-entry').forEach(entry => {
                const name = entry.querySelector('.income-name').value;
                const cadence = entry.querySelector('.income-cadence').value;
                const amount = parseFloat(entry.querySelector('.income-amount').value);

                console.log('Processing income entry:', { name, cadence, amount });

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

                console.log('Processing debt entry:', { type, name, balance, apr, minPayment });

                if (name && balance > 0) {
                    debts.push({ type, name, balance, apr, minPayment });
                }
            });

            // Get form field values with debugging
            const email = (function() {
                try { return sessionStorage.getItem('userEmail') || localStorage.getItem('userEmail') || ''; }
                catch { return ''; }
            })();
            const stateElement = document.getElementById('state');
            const householdSizeElement = document.getElementById('household-size');

            const state = stateElement ? stateElement.value : '';
            const householdSize = householdSizeElement ? parseInt(householdSizeElement.value) : 0;

            console.log('Form field values:');
            console.log('Email:', email);
            console.log('State element:', stateElement);
            console.log('State value:', state);
            console.log('Household size element:', householdSizeElement);
            console.log('Household size value:', householdSize);

            if (!email) {
                throw new Error('Email is required');
            }
            if (!state) {
                throw new Error('State is required but not selected');
            }
            if (!householdSize || householdSize <= 0) {
                throw new Error('Household size must be a positive number');
            }

            const formData = {
                email,
                state,
                householdSize,
                incomes,
                expenses: [],
                debts,
                goals: []
            };

            console.log('Final form data:', formData);
            return formData;
        } catch (error) {
            console.error('ERROR getting onboarding form data:', error);
            throw error;
        }
    }

    async handleOnboardingSubmit() {
        try {
            console.log('=== SUBMITTING ONBOARDING FORM ===');
            const formData = this.getOnboardingFormData();

            if (!formData.email || !formData.state || !formData.householdSize) {
                throw new Error('Please fill in all required fields');
            }

            console.log('Form data validation passed');
            console.log('Form data being submitted:', JSON.stringify(formData, null, 2));

            const response = await window.apiManager.submitOnboarding(formData);
            console.log('Onboarding submission response:', response);

            if (!response || !response.householdId || !response.token) {
                throw new Error('Invalid response from server - missing household ID or token');
            }

            console.log('Response contains householdId:', response.householdId);
            console.log('Response contains token:', response.token ? 'YES' : 'NO');


            // Store authentication data in localStorage for persistence across page navigation
            localStorage.setItem('userEmail', response.email || formData.email);
            localStorage.setItem('authToken', response.token);
            localStorage.setItem('currentHouseholdId', String(response.householdId));
            localStorage.setItem('userId', String(response.userId));
            localStorage.setItem('isAdmin', String(response.isAdmin || false));

            console.log('Stored in localStorage:');
            console.log('- userEmail:', response.email || formData.email);
            console.log('- currentHouseholdId:', response.householdId);

            // Show success message and redirect to login page
            window.uiManager.showSuccessAlert('Welcome! Your financial profile has been created successfully. Please login to access your dashboard.');
            console.log('About to redirect to index.html (login page) in 2 seconds...');
            setTimeout(() => {
                console.log('Redirecting to index.html now...');
                window.location.href = 'index.html';
            }, 2000);
        } catch (error) {
            console.error('=== ERROR SUBMITTING ONBOARDING ===');
            console.error('Error details:', error);
            console.error('Error stack:', error.stack);

            let errorMessage = 'Error creating profile. Please try again.';
            if (error.message.includes('network')) {
                errorMessage = 'Network error. Please check your connection and try again.';
            } else if (error.message.includes('validation')) {
                errorMessage = 'Please check your form data and try again.';
            }

            window.uiManager.showErrorAlert(errorMessage);
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
}

// Create global onboarding manager instance if it doesn't exist
if (typeof window.onboardingManager === 'undefined') {
    window.onboardingManager = new OnboardingManager();
}

// Expose the class globally for other modules if it doesn't exist
if (typeof window.OnboardingManager === 'undefined') {
    window.OnboardingManager = OnboardingManager;
}

console.log('OnboardingManager module loaded successfully');
