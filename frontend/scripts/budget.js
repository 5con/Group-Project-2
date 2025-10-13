// Budget Module - Handles budget page functionality

class BudgetManager {
    constructor(financialApp) {
        this.financialApp = financialApp;
        this.currentBudget = null;
    }

    async generateBudget() {
        try {
            console.log('Generating budget...');
            const methodology = document.querySelector('input[name="budget-method"]:checked').value;

            if (!this.financialApp.currentHouseholdId) {
                throw new Error('No household ID available');
            }

            const currentDate = new Date();
            const budgetRequest = {
                householdId: this.financialApp.currentHouseholdId,
                methodology: methodology,
                month: currentDate.getMonth() + 1,
                year: currentDate.getFullYear()
            };

            uiManager.showLoading('Generating your personalized budget...');

            const budgetResponse = await apiManager.createBudget(budgetRequest);

            if (budgetResponse && budgetResponse.budget) {
                this.currentBudget = budgetResponse;
                this.financialApp.currentBudget = budgetResponse;
                console.log('Budget generated:', budgetResponse);

                // Display budget categories
                this.displayBudgetCategories(budgetResponse.budgetItems);

                // Update budget totals
                this.updateBudgetTotals();

                uiManager.showSuccessAlert('Budget generated successfully!');
                uiManager.hideLoading();
            } else {
                throw new Error('Invalid budget response');
            }
        } catch (error) {
            console.error('Error generating budget:', error);
            uiManager.hideLoading();
            uiManager.showErrorAlert('Error generating budget. Please try again.');
        }
    }

    displayBudgetCategories(budgetItems) {
        console.log('Displaying budget categories:', budgetItems);

        if (!budgetItems || budgetItems.length === 0) {
            document.getElementById('budget-categories').innerHTML = `
                <div class="text-center">
                    <p class="text-muted">No budget categories available. Please try generating a budget again.</p>
                </div>
            `;
            return;
        }

        // Group categories by type
        const needsCategories = budgetItems.filter(item => item.category?.isNeed);
        const wantsCategories = budgetItems.filter(item => !item.category?.isNeed &&
            !item.category?.name?.toLowerCase().includes('debt') &&
            !item.category?.name?.toLowerCase().includes('emergency') &&
            !item.category?.name?.toLowerCase().includes('retirement'));
        const savingsCategories = budgetItems.filter(item =>
            item.category?.name?.toLowerCase().includes('debt') ||
            item.category?.name?.toLowerCase().includes('emergency') ||
            item.category?.name?.toLowerCase().includes('retirement'));

        // Clear existing content
        document.getElementById('budget-categories').innerHTML = '';

        // Get templates
        const needsTemplate = document.querySelector('[data-category-type="needs"]');
        const wantsTemplate = document.querySelector('[data-category-type="wants"]');
        const savingsTemplate = document.querySelector('[data-category-type="savings"]');
        const categoryTemplate = document.querySelector('.category-item-template');

        if (!needsTemplate || !wantsTemplate || !savingsTemplate || !categoryTemplate) {
            console.error('Budget templates not found');
            return;
        }

        // Clone and populate templates
        this.populateCategorySection(needsTemplate, needsCategories, 'needs');
        this.populateCategorySection(wantsTemplate, wantsCategories, 'wants');
        this.populateCategorySection(savingsTemplate, savingsCategories, 'savings');

        // Setup event listeners for all sliders and inputs
        this.setupBudgetEventListeners();
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
        const element = template.content.cloneNode(true);

        const categoryItem = element.querySelector('.category-item');
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
        // Setup slider event listeners
        document.querySelectorAll('.budget-slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                this.handleSliderChange(e.target);
            });
        });

        // Setup input event listeners
        document.querySelectorAll('.budget-input').forEach(input => {
            input.addEventListener('input', (e) => {
                this.handleInputChange(e.target);
            });
        });

        // Setup lock toggle listeners
        document.querySelectorAll('.category-lock').forEach(lock => {
            lock.addEventListener('change', (e) => {
                this.handleLockToggle(e.target);
            });
        });
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
}

// Create global budget manager instance
let budgetManager;
