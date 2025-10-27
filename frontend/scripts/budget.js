// Budget Module - Handles budget page functionality

class BudgetManager {
    constructor(financialApp) {
        this.financialApp = financialApp;
        this.currentBudget = null;
    }

    async generateBudget() {
        try {
            console.log('Generating budget...');
            
            // Validate methodology selection
            const methodologyElement = document.querySelector('input[name="budget-method"]:checked');
            if (!methodologyElement) {
                throw new Error('Please select a budget method');
            }
            const methodology = methodologyElement.value;

            // Validate household ID
            if (!this.financialApp.currentHouseholdId) {
                throw new Error('No household ID available. Please try logging in again.');
            }

            const currentDate = new Date();
            const budgetRequest = {
                householdId: parseInt(this.financialApp.currentHouseholdId),
                methodology: methodology,
                month: currentDate.getMonth() + 1,
                year: currentDate.getFullYear()
            };

            console.log('Budget request:', budgetRequest);
            uiManager.showLoading('Generating your personalized budget...');

            const budgetResponse = await apiManager.createBudget(budgetRequest);
            console.log('Budget response received:', budgetResponse);

            if (budgetResponse && (budgetResponse.budget || budgetResponse.budgetItems)) {
                this.currentBudget = budgetResponse;
                this.financialApp.currentBudget = budgetResponse;
                console.log('Budget generated successfully:', budgetResponse);

                // Display budget categories
                if (budgetResponse.budgetItems && budgetResponse.budgetItems.length > 0) {
                    this.displayBudgetCategories(budgetResponse.budgetItems);
                    // Update budget totals
                    this.updateBudgetTotals();
                } else {
                    console.warn('No budget items in response, showing basic success message');
                    const container = document.getElementById('budget-categories');
                    if (container) {
                        container.innerHTML = `
                            <div class="alert alert-success">
                                <i class="bi bi-check-circle me-2"></i>
                                Budget generated successfully! Refresh the page to see your budget categories.
                            </div>
                        `;
                    }
                }

                uiManager.showSuccessAlert('Budget generated successfully! You can now customize your budget categories.');
                uiManager.hideLoading();

                // Update dashboard if dashboard manager is available
                if (typeof window.dashboardManager !== 'undefined' && window.dashboardManager) {
                    try {
                        window.dashboardManager.updateDashboardWithBudget(budgetResponse);
                    } catch (dashError) {
                        console.warn('Could not update dashboard:', dashError);
                    }
                }
            } else {
                throw new Error('Invalid budget response from server');
            }
        } catch (error) {
            console.error('Error generating budget:', error);
            uiManager.hideLoading();
            
            let errorMessage = 'Error generating budget. Please try again.';
            if (error.message.includes('household')) {
                errorMessage = 'Session expired. Please refresh the page and try again.';
            } else if (error.message.includes('method')) {
                errorMessage = error.message;
            } else if (error.message.includes('network') || error.message.includes('fetch')) {
                errorMessage = 'Connection error. Please check if the server is running and try again.';
            }
            
            uiManager.showErrorAlert(errorMessage);
        }
    }

    displayBudgetCategories(budgetItems) {
        console.log('Displaying budget categories:', budgetItems);

        const container = document.getElementById('budget-categories');
        if (!container) {
            console.error('Budget categories container not found');
            return;
        }

        if (!budgetItems || budgetItems.length === 0) {
            container.innerHTML = `
                <div class="text-center">
                    <div class="alert alert-warning">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        No budget categories available. Please try generating a budget again.
                    </div>
                </div>
            `;
            return;
        }

        // Group categories by type
        const needsCategories = (budgetItems || []).filter(item => item.category?.isNeed);
        const wantsCategories = (budgetItems || []).filter(item => !item.category?.isNeed &&
            !item.category?.name?.toLowerCase().includes('debt') &&
            !item.category?.name?.toLowerCase().includes('emergency') &&
            !item.category?.name?.toLowerCase().includes('retirement'));
        const savingsCategories = (budgetItems || []).filter(item =>
            item.category?.name?.toLowerCase().includes('debt') ||
            item.category?.name?.toLowerCase().includes('emergency') ||
            item.category?.name?.toLowerCase().includes('retirement'));

        console.log('Categorized budget items:', {
            needs: needsCategories.length,
            wants: wantsCategories.length,
            savings: savingsCategories.length
        });

        // Clear existing content
        container.innerHTML = '';

        // Get templates
        const needsTemplate = document.querySelector('[data-category-type="needs"]');
        const wantsTemplate = document.querySelector('[data-category-type="wants"]');
        const savingsTemplate = document.querySelector('[data-category-type="savings"]');
        const categoryTemplate = document.querySelector('.category-item-template');

        if (!needsTemplate || !wantsTemplate || !savingsTemplate || !categoryTemplate) {
            console.error('Budget templates not found, using fallback display');
            this.displayBudgetFallback(budgetItems);
            return;
        }

        // Clone and populate templates
        this.populateCategorySection(needsTemplate, needsCategories, 'needs');
        this.populateCategorySection(wantsTemplate, wantsCategories, 'wants');
        this.populateCategorySection(savingsTemplate, savingsCategories, 'savings');

        // Setup event listeners for all sliders and inputs after a brief delay
        // to ensure DOM elements are fully rendered
        setTimeout(() => {
            this.setupBudgetEventListeners();
            this.updateBudgetTotals();
        }, 100);
    }

    displayBudgetFallback(budgetItems) {
        console.log('Using fallback budget display');
        const container = document.getElementById('budget-categories');
        if (!container) return;

        const needsItems = budgetItems.filter(item => item.category?.isNeed);
        const wantsItems = budgetItems.filter(item => !item.category?.isNeed && 
            !item.category?.name?.toLowerCase().includes('debt') &&
            !item.category?.name?.toLowerCase().includes('emergency') &&
            !item.category?.name?.toLowerCase().includes('retirement'));
        const savingsItems = budgetItems.filter(item =>
            item.category?.name?.toLowerCase().includes('debt') ||
            item.category?.name?.toLowerCase().includes('emergency') ||
            item.category?.name?.toLowerCase().includes('retirement'));

        const needsTotal = needsItems.reduce((sum, item) => sum + (item.plannedAmount || 0), 0);
        const wantsTotal = wantsItems.reduce((sum, item) => sum + (item.plannedAmount || 0), 0);
        const savingsTotal = savingsItems.reduce((sum, item) => sum + (item.plannedAmount || 0), 0);

        container.innerHTML = `
            <div class="alert alert-success mb-4">
                <i class="bi bi-check-circle me-2"></i>
                <strong>Budget Generated Successfully!</strong> Your budget has been created with ${budgetItems.length} categories.
            </div>
            
            <div class="row">
                <div class="col-md-4 mb-3">
                    <div class="card border-success">
                        <div class="card-header bg-success text-white">
                            <h5 class="mb-0"><i class="bi bi-house-door me-2"></i>Needs</h5>
                        </div>
                        <div class="card-body">
                            <h3 class="text-success">$${needsTotal.toFixed(2)}</h3>
                            <p class="mb-0">${needsItems.length} categories</p>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-4 mb-3">
                    <div class="card border-warning">
                        <div class="card-header bg-warning text-white">
                            <h5 class="mb-0"><i class="bi bi-emoji-smile me-2"></i>Wants</h5>
                        </div>
                        <div class="card-body">
                            <h3 class="text-warning">$${wantsTotal.toFixed(2)}</h3>
                            <p class="mb-0">${wantsItems.length} categories</p>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-4 mb-3">
                    <div class="card border-primary">
                        <div class="card-header bg-primary text-white">
                            <h5 class="mb-0"><i class="bi bi-piggy-bank me-2"></i>Savings</h5>
                        </div>
                        <div class="card-body">
                            <h3 class="text-primary">$${savingsTotal.toFixed(2)}</h3>
                            <p class="mb-0">${savingsItems.length} categories</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="alert alert-info">
                <i class="bi bi-info-circle me-2"></i>
                Refresh the page to see the full budget editor, or navigate to the dashboard to see your budget summary.
            </div>
        `;
    }

    populateCategorySection(template, categories, type) {
        const container = document.getElementById('budget-categories');
        const section = template.cloneNode(true);
        section.style.display = 'block';

        const categoryContainer = section.querySelector('.category-items');
        const sectionTitle = section.querySelector('.section-title');

        if (categories.length === 0) {
            sectionTitle.innerHTML = `<i class="bi bi-info-circle me-2"></i>No ${type} categories available`;
            sectionTitle.classList.add('text-muted');
        } else {
            categories.forEach(category => {
                const categoryElement = this.createCategoryElement(category, type);
                categoryContainer.appendChild(categoryElement);
            });
        }

        container.appendChild(section);
    }

    createCategoryElement(category, type) {
        const template = document.querySelector('.category-item-template');
        if (!template) {
            console.error('Category item template not found');
            return document.createElement('div');
        }

        // Clone the entire template div, not using .content since it's not a <template> tag
        const element = template.cloneNode(true);
        element.style.display = 'block';
        element.classList.remove('category-item-template');

        const categoryItem = element.querySelector('.category-item');
        if (!categoryItem) {
            console.error('Category item element not found in template');
            return element;
        }

        const categoryId = category.categoryId || category.id;

        // Replace template placeholders
        categoryItem.innerHTML = categoryItem.innerHTML
            .replace(/{id}/g, categoryId)
            .replace(/{name}/g, category.category?.name || 'Unknown Category')
            .replace(/{description}/g, this.getCategoryDescription(category.category?.name))
            .replace(/{plannedAmount}/g, (category.plannedAmount || 0).toFixed(2))
            .replace(/{maxAmount}/g, this.calculateMaxAmount(category, type));

        return categoryItem;
    }

    getCategoryDescription(categoryName) {
        const descriptions = {
            'Housing': 'Rent, mortgage, property taxes, home insurance',
            'Groceries': 'Food, beverages, household supplies',
            'Transportation': 'Gas, public transit, car payments, insurance',
            'Utilities': 'Electricity, water, gas, internet, phone',
            'Insurance': 'Health, auto, life, renters insurance',
            'Medical/Health': 'Doctor visits, medications, dental care',
            'Childcare': 'Daycare, babysitting, school expenses',
            'Minimum Debt Payments': 'Required minimum payments on debts',
            'Dining Out': 'Restaurants, fast food, coffee shops',
            'Entertainment': 'Movies, games, hobbies, subscriptions',
            'Personal': 'Clothing, haircuts, personal care',
            'Subscriptions': 'Streaming, magazines, apps, memberships',
            'Misc': 'Miscellaneous personal expenses',
            'Emergency Fund': 'Building financial security buffer',
            'Sinking Funds': 'Saving for planned future expenses',
            'Extra Debt Payments': 'Additional payments beyond minimum',
            'Retirement/Long-term': '401k, IRA, long-term investments'
        };

        return descriptions[categoryName] || 'Category expenses';
    }

    calculateMaxAmount(category, type) {
        // Calculate reasonable maximum based on category type and current budget
        const baseAmount = category.plannedAmount || 0;
        const multiplier = type === 'needs' ? 2 : type === 'wants' ? 1.5 : 1.2;
        return Math.round(baseAmount * multiplier);
    }

    setupBudgetEventListeners() {
        console.log('Setting up budget event listeners...');
        
        try {
            // Setup slider event listeners
            const sliders = document.querySelectorAll('.budget-slider');
            console.log(`Found ${sliders.length} budget sliders`);
            sliders.forEach((slider, index) => {
                // Remove existing listener if any
                slider.removeEventListener('input', this.handleSliderChange);
                
                slider.addEventListener('input', (e) => {
                    this.handleSliderChange(e.target);
                });
                console.log(`Attached slider listener ${index + 1}/${sliders.length}`);
            });

            // Setup input event listeners
            const inputs = document.querySelectorAll('.budget-input');
            console.log(`Found ${inputs.length} budget inputs`);
            inputs.forEach((input, index) => {
                // Remove existing listener if any
                input.removeEventListener('input', this.handleInputChange);
                
                input.addEventListener('input', (e) => {
                    this.handleInputChange(e.target);
                });
                console.log(`Attached input listener ${index + 1}/${inputs.length}`);
            });

            // Setup lock toggle listeners
            const locks = document.querySelectorAll('.category-lock');
            console.log(`Found ${locks.length} category locks`);
            locks.forEach((lock, index) => {
                // Remove existing listener if any
                lock.removeEventListener('change', this.handleLockToggle);
                
                lock.addEventListener('change', (e) => {
                    this.handleLockToggle(e.target);
                });
                console.log(`Attached lock listener ${index + 1}/${locks.length}`);
            });

            console.log('Budget event listeners setup completed');
        } catch (error) {
            console.error('Error setting up budget event listeners:', error);
        }
    }

    handleSliderChange(slider) {
        const categoryId = slider.id.replace('slider-', '');
        const amount = parseFloat(slider.value);
        const input = document.getElementById(`input-${categoryId}`);
        const currentLabel = document.getElementById(`current-${categoryId}`);

        if (input) input.value = amount;
        if (currentLabel) currentLabel.textContent = `$${amount}`;

        this.updateBudgetTotals();
        this.checkGuardrails(categoryId, amount);
    }

    handleInputChange(input) {
        const categoryId = input.id.replace('input-', '');
        const amount = parseFloat(input.value) || 0;
        const slider = document.getElementById(`slider-${categoryId}`);
        const currentLabel = document.getElementById(`current-${categoryId}`);

        if (slider) slider.value = amount;
        if (currentLabel) currentLabel.textContent = `$${amount}`;

        this.updateBudgetTotals();
        this.checkGuardrails(categoryId, amount);
    }

    handleLockToggle(lock) {
        const categoryId = lock.id.replace('lock-', '');
        const categoryItem = lock.closest('.category-item');
        const slider = categoryItem.querySelector('.budget-slider');
        const input = categoryItem.querySelector('.budget-input');

        if (lock.checked) {
            // Lock the category - disable inputs
            if (slider) slider.disabled = true;
            if (input) input.disabled = true;
            categoryItem.classList.add('locked-category');
        } else {
            // Unlock the category - enable inputs
            if (slider) slider.disabled = false;
            if (input) input.disabled = false;
            categoryItem.classList.remove('locked-category');
        }
    }

    updateBudgetTotals() {
        const needsTotal = this.calculateSectionTotal('needs-categories');
        const wantsTotal = this.calculateSectionTotal('wants-categories');
        const savingsTotal = this.calculateSectionTotal('savings-categories');

        const totalAllocated = needsTotal + wantsTotal + savingsTotal;

        // Get net income from current budget
        const netIncome = this.financialApp.currentBudget?.summary?.netIncome || 0;
        const remaining = netIncome - totalAllocated;

        // Update display
        document.getElementById('needs-total').textContent = `$${needsTotal.toFixed(2)}`;
        document.getElementById('wants-total').textContent = `$${wantsTotal.toFixed(2)}`;
        document.getElementById('savings-total').textContent = `$${savingsTotal.toFixed(2)}`;

        document.getElementById('total-allocated').textContent = `$${totalAllocated.toFixed(2)} allocated`;
        document.getElementById('remaining-amount').textContent = `$${remaining.toFixed(2)} remaining`;

        // Show over-budget warning
        const overBudgetAlert = document.getElementById('over-budget-alert');
        if (remaining < 0) {
            overBudgetAlert.style.display = 'inline-block';
            overBudgetAlert.textContent = `Over by $${Math.abs(remaining).toFixed(2)}`;
        } else {
            overBudgetAlert.style.display = 'none';
        }

        // Update percentages
        this.updateSectionPercentages(needsTotal, wantsTotal, savingsTotal, netIncome);
    }

    calculateSectionTotal(sectionId) {
        const section = document.getElementById(sectionId);
        if (!section) return 0;

        const inputs = section.querySelectorAll('.budget-input');
        return Array.from(inputs).reduce((sum, input) => {
            return sum + (parseFloat(input.value) || 0);
        }, 0);
    }

    updateSectionPercentages(needsTotal, wantsTotal, savingsTotal, netIncome) {
        if (netIncome <= 0) return;

        const needsPercentage = (needsTotal / netIncome * 100).toFixed(1);
        const wantsPercentage = (wantsTotal / netIncome * 100).toFixed(1);
        const savingsPercentage = (savingsTotal / netIncome * 100).toFixed(1);

        // Update progress bars in dashboard (if visible)
        this.updateProgressBar('needs', needsPercentage, needsTotal);
        this.updateProgressBar('wants', wantsPercentage, wantsTotal);
        this.updateProgressBar('savings', savingsPercentage, savingsTotal);
    }

    updateProgressBar(type, percentage, amount) {
        const progressElement = document.getElementById(`${type}-progress`);
        const percentageElement = document.getElementById(`${type}-percentage`);
        const amountElement = document.getElementById(`${type}-amount-text`);

        if (progressElement) {
            progressElement.style.width = `${Math.min(percentage, 100)}%`;
        }

        if (percentageElement) {
            percentageElement.textContent = `${percentage}%`;
        }

        if (amountElement) {
            amountElement.textContent = `$${amount.toFixed(2)} allocated`;
        }
    }

    checkGuardrails(categoryId, amount) {
        // Basic guardrail checking - this could be expanded with more sophisticated rules
        const alertElement = document.getElementById(`alert-${categoryId}`);

        if (alertElement) {
            // For now, just show alert if amount seems unusually high
            // In a real implementation, this would check against state benchmarks
            if (amount > 1000) {
                alertElement.style.display = 'block';
                alertElement.title = 'Amount seems high - consider reviewing this expense';
            } else {
                alertElement.style.display = 'none';
            }
        }
    }

    async saveBudget() {
        try {
            if (!this.currentBudget || !this.currentBudget.budget) {
                uiManager.showErrorAlert('No budget to save. Please generate a budget first.');
                return;
            }

            console.log('Saving budget...');
            uiManager.showLoading('Saving your budget...');

            // Collect current budget amounts from the UI
            const categoryAmounts = {};
            const budgetInputs = document.querySelectorAll('.budget-input');
            
            budgetInputs.forEach(input => {
                const categoryId = input.id.replace('input-', '');
                const amount = parseFloat(input.value) || 0;
                categoryAmounts[categoryId] = amount;
            });

            // Prepare update request
            const updateRequest = {
                categoryAmounts: categoryAmounts,
                notes: 'Updated via budget interface'
            };

            // Call API to update budget
            const response = await fetch(`http://localhost:5267/api/budget/${this.currentBudget.budget.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateRequest)
            });

            if (response.ok) {
                const updatedBudget = await response.json();
                this.currentBudget = { ...this.currentBudget, budget: updatedBudget };
                this.financialApp.currentBudget = this.currentBudget;
                
                console.log('Budget saved successfully:', updatedBudget);
                uiManager.showSuccessAlert('Budget saved successfully!');
                
                // Update dashboard if dashboard manager is available
                if (typeof window.dashboardManager !== 'undefined' && window.dashboardManager) {
                    window.dashboardManager.updateDashboardWithBudget(this.currentBudget);
                }
            } else {
                const error = await response.text();
                throw new Error(`Failed to save budget: ${error}`);
            }
            
            uiManager.hideLoading();
        } catch (error) {
            console.error('Error saving budget:', error);
            uiManager.hideLoading();
            uiManager.showErrorAlert('Error saving budget: ' + error.message);
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

    // ============= INTERACTIVE BUDGET EDITOR FEATURES =============
    
    /**
     * Debounced live recalculation for budget changes
     */
    async recalculateBudgetLive() {
        if (!this.financialApp.currentHouseholdId || !this.currentBudget) {
            console.warn('Cannot recalculate without household and budget');
            return;
        }

        try {
            // Gather current category amounts from DOM
            const categoryAmounts = {};
            const categoryInputs = document.querySelectorAll('[data-category-id]');
            
            categoryInputs.forEach(input => {
                const categoryId = parseInt(input.dataset.categoryId);
                const amount = parseFloat(input.value) || 0;
                categoryAmounts[categoryId] = amount;
            });

            // Call API for live recalculation
            const result = await apiManager.recalculateBudgetLive(
                this.financialApp.currentHouseholdId,
                categoryAmounts
            );

            // Update UI with validation results
            this.displayRecalculationResults(result);
        } catch (error) {
            console.error('Error during live recalculation:', error);
        }
    }

    /**
     * Display recalculation results including validation and projections
     */
    displayRecalculationResults(result) {
        const container = document.getElementById('budget-live-results');
        if (!container) return;

        const { validation, financial, debtProjections } = result;

        let html = `
            <div class="card mb-3">
                <div class="card-header bg-${financial.surplus >= 0 ? 'success' : 'danger'} text-white">
                    <h5 class="mb-0">
                        <i class="bi bi-calculator me-2"></i>
                        ${financial.surplus >= 0 ? 'Surplus' : 'Deficit'}: ${this.formatCurrency(Math.abs(financial.surplus))}
                    </h5>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-4">
                            <p class="mb-1 text-muted">Net Income</p>
                            <h6>${this.formatCurrency(financial.netIncome)}</h6>
                        </div>
                        <div class="col-md-4">
                            <p class="mb-1 text-muted">Total Budgeted</p>
                            <h6>${this.formatCurrency(financial.totalBudgeted)}</h6>
                        </div>
                        <div class="col-md-4">
                            <p class="mb-1 text-muted">Balance</p>
                            <h6 class="text-${financial.surplus >= 0 ? 'success' : 'danger'}">
                                ${this.formatCurrency(financial.surplus)}
                            </h6>
                        </div>
                    </div>
                    
                    <hr>
                    
                    <div class="row">
                        <div class="col-md-4">
                            <p class="mb-1 text-muted">Needs</p>
                            <div class="d-flex justify-content-between">
                                <span>${this.formatCurrency(financial.totalNeeds)}</span>
                                <span class="text-muted">${financial.needsPercentage.toFixed(1)}%</span>
                            </div>
                            <div class="progress" style="height: 6px;">
                                <div class="progress-bar bg-success" style="width: ${financial.needsPercentage}%"></div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <p class="mb-1 text-muted">Wants</p>
                            <div class="d-flex justify-content-between">
                                <span>${this.formatCurrency(financial.totalWants)}</span>
                                <span class="text-muted">${financial.wantsPercentage.toFixed(1)}%</span>
                            </div>
                            <div class="progress" style="height: 6px;">
                                <div class="progress-bar bg-warning" style="width: ${financial.wantsPercentage}%"></div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <p class="mb-1 text-muted">Savings</p>
                            <div class="d-flex justify-content-between">
                                <span>${this.formatCurrency(financial.totalSavings)}</span>
                                <span class="text-muted">${financial.savingsPercentage.toFixed(1)}%</span>
                            </div>
                            <div class="progress" style="height: 6px;">
                                <div class="progress-bar bg-primary" style="width: ${financial.savingsPercentage}%"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add validation warnings
        if (validation && validation.violations && validation.violations.length > 0) {
            html += `
                <div class="alert alert-warning">
                    <h6><i class="bi bi-exclamation-triangle me-2"></i>Guardrail Warnings</h6>
                    <ul class="mb-0">
                        ${validation.violations.map(v => `
                            <li>${v.categoryName}: ${v.message} (${v.actualPercentage.toFixed(1)}% vs ${v.benchmarkPercentage.toFixed(1)}%)</li>
                        `).join('')}
                    </ul>
                </div>
            `;
        }

        // Add debt projection summary
        if (debtProjections && debtProjections.snowball) {
            html += `
                <div class="card mb-3">
                    <div class="card-header">
                        <h6 class="mb-0"><i class="bi bi-graph-down me-2"></i>Debt Payoff Projection</h6>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-6">
                                <p class="mb-1 text-muted">Snowball Method</p>
                                <p class="mb-0">
                                    <strong>${debtProjections.snowball.monthsToPayoff}</strong> months
                                    | Interest: ${this.formatCurrency(debtProjections.snowball.totalInterestPaid)}
                                </p>
                            </div>
                            ${debtProjections.avalanche ? `
                                <div class="col-md-6">
                                    <p class="mb-1 text-muted">Avalanche Method</p>
                                    <p class="mb-0">
                                        <strong>${debtProjections.avalanche.monthsToPayoff}</strong> months
                                        | Interest: ${this.formatCurrency(debtProjections.avalanche.totalInterestPaid)}
                                    </p>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;
    }

    /**
     * Setup debounced listeners for live recalculation
     */
    setupLiveRecalculation() {
        let debounceTimer;
        const categoryInputs = document.querySelectorAll('[data-category-id]');
        
        categoryInputs.forEach(input => {
            input.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.recalculateBudgetLive();
                }, 500); // 500ms debounce
            });
        });
    }

    /**
     * Load and display debt method comparison
     */
    async loadDebtComparison() {
        if (!this.financialApp.currentHouseholdId) return;

        try {
            const comparison = await apiManager.compareDebtMethods(
                this.financialApp.currentHouseholdId,
                0 // Will use budget surplus
            );

            this.displayDebtComparison(comparison);
        } catch (error) {
            console.error('Error loading debt comparison:', error);
        }
    }

    /**
     * Display debt method comparison
     */
    displayDebtComparison(comparison) {
        const container = document.getElementById('debt-comparison');
        if (!container) return;

        const { snowball, avalanche, recommendation } = comparison;

        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h5 class="mb-0"><i class="bi bi-graph-down me-2"></i>Debt Payoff Strategy Comparison</h5>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-striped">
                            <thead>
                                <tr>
                                    <th>Method</th>
                                    <th>Months to Payoff</th>
                                    <th>Total Interest</th>
                                    <th>Interest Saved</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr class="${recommendation.method === 'Snowball' ? 'table-success' : ''}">
                                    <td><strong>Snowball</strong> ${recommendation.method === 'Snowball' ? '<span class="badge bg-success">Recommended</span>' : ''}</td>
                                    <td>${snowball.monthsToPayoff}</td>
                                    <td>${this.formatCurrency(snowball.totalInterestPaid)}</td>
                                    <td>${this.formatCurrency(snowball.interestSavedVsMinimums)}</td>
                                </tr>
                                <tr class="${recommendation.method === 'Avalanche' ? 'table-success' : ''}">
                                    <td><strong>Avalanche</strong> ${recommendation.method === 'Avalanche' ? '<span class="badge bg-success">Recommended</span>' : ''}</td>
                                    <td>${avalanche.monthsToPayoff}</td>
                                    <td>${this.formatCurrency(avalanche.totalInterestPaid)}</td>
                                    <td>${this.formatCurrency(avalanche.interestSavedVsMinimums)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div class="alert alert-info mb-0">
                        <strong>Recommendation:</strong> ${recommendation.reason}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Load and display 12-month projection
     */
    async load12MonthProjection() {
        if (!this.financialApp.currentHouseholdId) return;

        try {
            const currentDate = new Date();
            const startMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
            
            const projection = await apiManager.get12MonthProjection(
                this.financialApp.currentHouseholdId,
                startMonth
            );

            this.display12MonthProjection(projection);
        } catch (error) {
            console.error('Error loading 12-month projection:', error);
        }
    }

    /**
     * Display 12-month projection chart
     */
    display12MonthProjection(projection) {
        const container = document.getElementById('projection-12month');
        if (!container) return;

        const { months, summary } = projection;

        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h5 class="mb-0"><i class="bi bi-calendar3 me-2"></i>12-Month Financial Projection</h5>
                </div>
                <div class="card-body">
                    <div class="row mb-3">
                        <div class="col-md-3">
                            <p class="mb-1 text-muted">Total Debt Reduction</p>
                            <h6>${this.formatCurrency(summary.totalDebtReduction)}</h6>
                        </div>
                        <div class="col-md-3">
                            <p class="mb-1 text-muted">Total Savings Growth</p>
                            <h6>${this.formatCurrency(summary.totalSavingsGrowth)}</h6>
                        </div>
                        <div class="col-md-3">
                            <p class="mb-1 text-muted">Debts Paid Off</p>
                            <h6>${summary.debtsPaidOff}</h6>
                        </div>
                        <div class="col-md-3">
                            <p class="mb-1 text-muted">Goals Completed</p>
                            <h6>${summary.goalsCompleted}</h6>
                        </div>
                    </div>
                    <div class="table-responsive">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>Month</th>
                                    <th>Surplus</th>
                                    <th>Debt Balance</th>
                                    <th>Savings</th>
                                    <th>EF Progress</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${months.slice(0, 12).map(m => `
                                    <tr>
                                        <td>${m.month}</td>
                                        <td class="text-${m.surplus >= 0 ? 'success' : 'danger'}">
                                            ${this.formatCurrency(m.surplus)}
                                        </td>
                                        <td>${this.formatCurrency(m.totalDebtBalance)}</td>
                                        <td>${this.formatCurrency(m.totalSavingsBalance)}</td>
                                        <td>${m.emergencyFundPercentage.toFixed(0)}%</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }
}

// Create global budget manager instance
let budgetManager;

// Ensure a manager instance exists when DOM is ready and app is present
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.budgetManager === 'undefined' && typeof window.financialApp !== 'undefined') {
        try {
            window.budgetManager = new BudgetManager(window.financialApp);
            console.log('Budget manager auto-initialized on DOMContentLoaded');
        } catch (err) {
            console.error('Failed to auto-initialize budgetManager:', err);
        }
    }
});