// Account Page Logic

(function () {
    function getStoredUserEmail() {
        return sessionStorage.getItem('userEmail') || localStorage.getItem('userEmail');
    }

    function setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    function showAlert(id, message) {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.remove('d-none');
        el.textContent = message;
    }

    async function loadHousehold(email) {
        try {
            // Prefer stored household id (from onboarding) if present, otherwise fall back to stored id
            const storedHouseholdId = localStorage.getItem('currentHouseholdId');
            const householdId = storedHouseholdId ? parseInt(storedHouseholdId, 10) : null;
            const hh = await apiManager.loadHouseholdData(householdId);
            return hh;
        } catch (err) {
            console.log('No household found, user needs to complete onboarding');
            return null;
        }
    }

    async function setupOnboardingForm() {
        // Populate email field
        const email = getStoredUserEmail();
        const emailInput = document.getElementById('email');
        const emailDisplay = document.getElementById('user-email-display');

        emailInput.value = email;
        emailDisplay.textContent = email;

        // Add event listener to update display when email changes
        emailInput.addEventListener('input', function() {
            emailDisplay.textContent = this.value || 'Not set';
        });

        // Setup form submission
        document.getElementById('onboarding-form').addEventListener('submit', handleOnboardingSubmit);

        // Setup dynamic form handlers (same as onboarding.js)
        setupIncomeHandlers();
        setupDebtHandlers();
        await populateStateDropdown();
    }

    async function handleOnboardingSubmit(e) {
        e.preventDefault();

        try {
            const formData = collectOnboardingFormData();

            // Submit onboarding data
            const result = await apiManager.submitOnboarding(formData);

            // Store household ID and email in localStorage
            localStorage.setItem('currentHouseholdId', result.householdId);
            sessionStorage.setItem('userEmail', formData.email);

            // Show success message and redirect to dashboard
            showAlert('account-info-alert', 'Profile created successfully! Redirecting to dashboard...');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);

        } catch (error) {
            showAlert('account-error-alert', error.message || 'Failed to create profile.');
        }
    }

    function collectOnboardingFormData() {
        const email = document.getElementById('email').value || getStoredUserEmail();
        const state = document.getElementById('state').value;
        const householdSize = parseInt(document.getElementById('household-size').value);

        // Collect income data
        const incomes = [];
        document.querySelectorAll('.income-entry').forEach(entry => {
            const name = entry.querySelector('.income-name').value;
            const cadence = entry.querySelector('.income-cadence').value;
            const amount = parseFloat(entry.querySelector('.income-amount').value);

            if (name && amount > 0) {
                incomes.push({ name, cadence, grossAmount: amount });
            }
        });

        // Collect debt data
        const debts = [];
        document.querySelectorAll('.debt-entry').forEach(entry => {
            const name = entry.querySelector('.debt-name').value;
            const balance = parseFloat(entry.querySelector('.debt-balance').value);
            const apr = parseFloat(entry.querySelector('.debt-apr').value) || 0;
            const minPayment = parseFloat(entry.querySelector('.debt-min-payment').value) || 0;

            if (name && balance > 0) {
                debts.push({ name, balance, apr, minPayment });
            }
        });

        return { email, state, householdSize, incomes, debts };
    }

    function setupIncomeHandlers() {
        // Add income button
        document.getElementById('add-income').addEventListener('click', () => {
            addIncomeEntry();
        });

        // Remove income buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-income')) {
                e.target.closest('.income-entry').remove();
            }
        });
    }

    function setupDebtHandlers() {
        // Add debt button
        document.getElementById('add-debt').addEventListener('click', () => {
            addDebtEntry();
        });

        // Remove debt buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-debt')) {
                e.target.closest('.debt-entry').remove();
            }
        });
    }

    function addIncomeEntry() {
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
    }

    function addDebtEntry() {
        const container = document.getElementById('debt-container');
        const entry = document.createElement('div');
        entry.className = 'debt-entry border rounded p-3 mb-3';
        entry.innerHTML = `
            <div class="row">
                <div class="col-md-3 mb-2">
                    <input type="text" class="form-control debt-name" placeholder="Debt Name" required>
                </div>
                <div class="col-md-3 mb-2">
                    <div class="input-group">
                        <span class="input-group-text">$</span>
                        <input type="number" class="form-control debt-balance" placeholder="Balance" step="0.01" required>
                    </div>
                </div>
                <div class="col-md-2 mb-2">
                    <div class="input-group">
                        <input type="number" class="form-control debt-apr" placeholder="APR %" step="0.01">
                        <span class="input-group-text">%</span>
                    </div>
                </div>
                <div class="col-md-3 mb-2">
                    <div class="input-group">
                        <span class="input-group-text">$</span>
                        <input type="number" class="form-control debt-min-payment" placeholder="Min Payment" step="0.01">
                    </div>
                </div>
                <div class="col-md-1 mb-2">
                    <button type="button" class="btn btn-outline-danger remove-debt">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `;
        container.appendChild(entry);
    }

    async function populateStateDropdown() {
        // First ensure reference data is loaded
        if (window.financialApp && (!window.financialApp.states || window.financialApp.states.length === 0)) {
            console.log('States not loaded, loading reference data first...');
            if (window.onboardingManager && window.onboardingManager.loadReferenceData) {
                await window.onboardingManager.loadReferenceData();
            } else if (window.financialApp && window.financialApp.loadReferenceData) {
                await window.financialApp.loadReferenceData();
            }
        }

        // Use the main app's populateStateDropdown method if available
        if (window.financialApp && window.financialApp.populateStateDropdown) {
            window.financialApp.populateStateDropdown('state');
        }
    }

    function renderUserCard() {
        const email = getStoredUserEmail();
        setText('account-email', email || 'No email set');
        setText('account-user-id', 'N/A');
        setText('account-mode', 'Standard');
    }

    function renderHousehold(hh) {
        if (!hh) return;
        setText('account-household-id', `ID: ${hh.id}`);
        setText('account-state', hh.state || '-');
        setText('account-household-size', hh.householdSize != null ? String(hh.householdSize) : '-');
        setText('account-income-count', Array.isArray(hh.incomes) ? String(hh.incomes.length) : '0');
        setText('account-debt-count', Array.isArray(hh.debts) ? String(hh.debts.length) : '0');
        setText('account-budget-count', Array.isArray(hh.budgets) ? String(hh.budgets.length) : '0');
    }

    // Edit Profile Functions
    let currentHouseholdData = null;

    async function showEditProfile() {
        document.getElementById('edit-profile-section').classList.remove('d-none');
        // Populate state dropdown before loading current profile data
        if (window.financialApp && window.financialApp.populateStateDropdown) {
            // First ensure reference data is loaded
            if (!window.financialApp.states || window.financialApp.states.length === 0) {
                console.log('States not loaded for edit profile, loading reference data first...');
                if (window.onboardingManager && window.onboardingManager.loadReferenceData) {
                    await window.onboardingManager.loadReferenceData();
                } else if (window.financialApp && window.financialApp.loadReferenceData) {
                    await window.financialApp.loadReferenceData();
                }
            }
            window.financialApp.populateStateDropdown('edit-state');
        }
        loadCurrentProfileData();
    }

    function hideEditProfile() {
        document.getElementById('edit-profile-section').classList.add('d-none');
        // Reset form
        document.getElementById('edit-profile-form').reset();
        document.getElementById('edit-income-container').innerHTML = '';
        document.getElementById('edit-debt-container').innerHTML = '';
    }

    async function loadCurrentProfileData() {
        try {
            const email = getStoredUserEmail();
            if (!email) return;

            const household = await loadHousehold(email);
            if (!household) return;

            currentHouseholdData = household;

            // Populate form fields
            document.getElementById('edit-state').value = household.state || '';
            document.getElementById('edit-household-size').value = household.householdSize || '';

            // Load income entries
            loadEditIncomeEntries(household.incomes || []);

            // Load debt entries
            loadEditDebtEntries(household.debts || []);

        } catch (error) {
            showAlert('account-error-alert', 'Failed to load profile data for editing.');
        }
    }

    function loadEditIncomeEntries(incomes) {
        const container = document.getElementById('edit-income-container');
        container.innerHTML = '';

        if (incomes.length === 0) {
            addEditIncomeEntry();
        } else {
            incomes.forEach(income => addEditIncomeEntry(income));
        }
    }

    function loadEditDebtEntries(debts) {
        const container = document.getElementById('edit-debt-container');
        container.innerHTML = '';

        if (debts.length === 0) {
            addEditDebtEntry();
        } else {
            debts.forEach(debt => addEditDebtEntry(debt));
        }
    }

    function addEditIncomeEntry(incomeData = null) {
        const container = document.getElementById('edit-income-container');
        const entry = document.createElement('div');
        entry.className = 'income-entry-edit border rounded p-3 mb-3';
        entry.innerHTML = `
            <div class="row">
                <div class="col-md-4 mb-2">
                    <input type="text" class="form-control edit-income-name" placeholder="Income Source" value="${incomeData?.name || ''}" required>
                </div>
                <div class="col-md-3 mb-2">
                    <select class="form-select edit-income-cadence">
                        <option value="weekly" ${incomeData?.cadence === 'weekly' ? 'selected' : ''}>Weekly</option>
                        <option value="biweekly" ${incomeData?.cadence === 'biweekly' ? 'selected' : ''}>Bi-weekly</option>
                        <option value="semimonthly" ${incomeData?.cadence === 'semimonthly' ? 'selected' : ''}>Semi-monthly</option>
                        <option value="monthly" ${incomeData?.cadence === 'monthly' || !incomeData ? 'selected' : ''}>Monthly</option>
                    </select>
                </div>
                <div class="col-md-4 mb-2">
                    <div class="input-group">
                        <span class="input-group-text">$</span>
                        <input type="number" class="form-control edit-income-amount" placeholder="Amount" step="0.01" value="${incomeData?.grossAmount || ''}" required>
                    </div>
                </div>
                <div class="col-md-1 mb-2">
                    <button type="button" class="btn btn-outline-danger remove-edit-income">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `;

        container.appendChild(entry);

        // Add remove functionality
        entry.querySelector('.remove-edit-income').addEventListener('click', () => {
            entry.remove();
        });
    }

    function addEditDebtEntry(debtData = null) {
        const container = document.getElementById('edit-debt-container');
        const entry = document.createElement('div');
        entry.className = 'debt-entry-edit border rounded p-3 mb-3';
        entry.innerHTML = `
            <div class="row">
                <div class="col-md-3 mb-2">
                    <select class="form-select edit-debt-type">
                        <option value="credit_card" ${debtData?.type === 'credit_card' ? 'selected' : ''}>Credit Card</option>
                        <option value="student_loan" ${debtData?.type === 'student_loan' ? 'selected' : ''}>Student Loan</option>
                        <option value="personal_loan" ${debtData?.type === 'personal_loan' ? 'selected' : ''}>Personal Loan</option>
                        <option value="mortgage" ${debtData?.type === 'mortgage' ? 'selected' : ''}>Mortgage</option>
                        <option value="auto_loan" ${debtData?.type === 'auto_loan' ? 'selected' : ''}>Auto Loan</option>
                        <option value="other" ${debtData?.type === 'other' || !debtData ? 'selected' : ''}>Other</option>
                    </select>
                </div>
                <div class="col-md-3 mb-2">
                    <input type="text" class="form-control edit-debt-name" placeholder="Debt Name" value="${debtData?.name || ''}" required>
                </div>
                <div class="col-md-2 mb-2">
                    <div class="input-group">
                        <span class="input-group-text">$</span>
                        <input type="number" class="form-control edit-debt-balance" placeholder="Balance" step="0.01" value="${debtData?.balance || ''}" required>
                    </div>
                </div>
                <div class="col-md-2 mb-2">
                    <div class="input-group">
                        <input type="number" class="form-control edit-debt-apr" placeholder="APR %" step="0.01" value="${debtData?.apr || ''}">
                        <span class="input-group-text">%</span>
                    </div>
                </div>
                <div class="col-md-2 mb-2">
                    <div class="input-group">
                        <span class="input-group-text">$</span>
                        <input type="number" class="form-control edit-debt-min-payment" placeholder="Min Payment" step="0.01" value="${debtData?.minPayment || ''}" required>
                    </div>
                </div>
                <div class="col-md-0 mb-2">
                    <button type="button" class="btn btn-outline-danger remove-edit-debt">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `;

        container.appendChild(entry);

        // Add remove functionality
        entry.querySelector('.remove-edit-debt').addEventListener('click', () => {
            entry.remove();
        });
    }

    async function handleEditProfileSubmit(event) {
        event.preventDefault();

        try {
            const incomes = [];
            document.querySelectorAll('.income-entry-edit').forEach(entry => {
                const name = entry.querySelector('.edit-income-name').value;
                const cadence = entry.querySelector('.edit-income-cadence').value;
                const amount = parseFloat(entry.querySelector('.edit-income-amount').value);

                if (name && amount > 0) {
                    incomes.push({ name, cadence, grossAmount: amount });
                }
            });

            const debts = [];
            document.querySelectorAll('.debt-entry-edit').forEach(entry => {
                const type = entry.querySelector('.edit-debt-type').value;
                const name = entry.querySelector('.edit-debt-name').value;
                const balance = parseFloat(entry.querySelector('.edit-debt-balance').value);
                const apr = parseFloat(entry.querySelector('.edit-debt-apr').value) || 0;
                const minPayment = parseFloat(entry.querySelector('.edit-debt-min-payment').value);

                if (name && balance > 0) {
                    debts.push({ type, name, balance, apr, minPayment });
                }
            });

            const updateData = {
                email: getStoredUserEmail(),
                state: document.getElementById('edit-state').value,
                householdSize: parseInt(document.getElementById('edit-household-size').value),
                incomes,
                expenses: [], // Keep existing expenses
                debts,
                goals: [] // Keep existing goals
            };

            // Update household data
            await apiManager.updateHousehold(currentHouseholdData.id, updateData);

            // Update localStorage
            localStorage.setItem('currentHouseholdId', String(currentHouseholdData.id));

            showAlert('account-info-alert', 'Profile updated successfully!');
            hideEditProfile();

            // Refresh the display
            setTimeout(() => {
                location.reload();
            }, 1500);

        } catch (error) {
            showAlert('account-error-alert', 'Failed to update profile: ' + error.message);
        }
    }

    // Expose functions globally
    window.showEditProfile = showEditProfile;
    window.hideEditProfile = hideEditProfile;
    window.addEditIncomeEntry = addEditIncomeEntry;
    window.addEditDebtEntry = addEditDebtEntry;

    document.addEventListener('DOMContentLoaded', async () => {
        console.log('[ACCOUNT.JS] DOMContentLoaded handler starting');
        
        // CRITICAL: Check if onboarding was just completed - if so, don't redirect
        const onboardingCompleted = localStorage.getItem('onboardingCompleted') === 'true';
        console.log('[ACCOUNT.JS] onboardingCompleted:', onboardingCompleted, 'onboardingJustCompleted:', window.onboardingJustCompleted);
        
        // Try to restore auth
        let ok = restoreAuthFromStorage();
        console.log('[ACCOUNT.JS] Initial auth restoration result:', ok);
        
        // If auth restoration failed but onboarding was just completed, try again
        if (!ok && (onboardingCompleted || window.onboardingJustCompleted)) {
            console.log('[ACCOUNT.JS] Onboarding completed - attempting to restore auth');
            const token = localStorage.getItem('authToken');
            const email = localStorage.getItem('userEmail');
            const userId = localStorage.getItem('userId');
            
            if (token && email && window.authManager) {
                authManager.authToken = token;
                authManager.currentUser = { email: email, userId: userId ? parseInt(userId) : undefined };
                authManager.isAuthenticated = true;
                authManager.isDeveloperMode = false;
                authManager.setupAuthHeaders();
                ok = true;
                console.log('[ACCOUNT.JS] Auth restored successfully after onboarding');
            } else {
                console.error('[ACCOUNT.JS] Failed to restore auth - token:', !!token, 'email:', !!email, 'authManager:', !!window.authManager);
            }
        }
        
        // Check if user is authenticated now
        const isAuthenticated = window.authManager && (authManager.isAuthenticated || (authManager.isLoggedIn && authManager.isLoggedIn()));
        console.log('[ACCOUNT.JS] Final auth check - isAuthenticated:', isAuthenticated, 'ok:', ok);
        
        // Only show "not logged in" message if auth failed AND onboarding wasn't just completed
        if (!ok && !isAuthenticated && !onboardingCompleted && !window.onboardingJustCompleted) {
            console.log('[ACCOUNT.JS] User not authenticated and onboarding not completed - showing alert');
            showAlert('account-info-alert', 'You are not logged in. Please sign in on the home page.');
            // Don't redirect - let the user see the message
            return;
        }

        // If we get here, user should be authenticated (either from onboarding or normal login)
        try {
            renderUserCard();
            const user = authManager.getCurrentUser();
            if (user) {
                console.log('[ACCOUNT.JS] Loading household data for user:', user.email);
                const household = await loadHousehold(user.email);
                renderHousehold(household);
            } else {
                console.warn('[ACCOUNT.JS] No user found after auth restoration');
            }
        } catch (error) {
            console.error('[ACCOUNT.JS] Error loading account data:', error);
            showAlert('account-error-alert', error.message || 'Unexpected error.');
        }
    });
})();


