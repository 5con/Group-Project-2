// Dashboard Module - Handles dashboard page functionality

class DashboardManager {
    constructor(financialApp) {
        this.financialApp = financialApp;
        this.householdData = null;
    }

    async loadBudgetAndShowDashboard() {
        console.log('Loading budget data and showing dashboard');
        uiManager.showSection('dashboard');

        if (!this.financialApp.currentHouseholdId) {
            console.error('No household ID available');
            uiManager.showErrorAlert('Error: No household found. Please try logging in again.');
            return;
        }

        try {
            // Load household data first
            this.householdData = await apiManager.loadHouseholdData(this.financialApp.currentHouseholdId);
            console.log('Household data loaded:', this.householdData);

            // Update basic dashboard cards with household data
            this.updateDashboardCards(this.householdData);

            // Try to load existing budget data
            const currentDate = new Date();
            const budgetData = await apiManager.loadBudgetData(this.financialApp.currentHouseholdId, `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`);

            if (budgetData && budgetData.length > 0) {
                const latestBudget = budgetData[0]; // Get the most recent budget
                this.financialApp.currentBudget = latestBudget;

                console.log('Budget data loaded:', latestBudget);

                // Update dashboard with budget data
                this.updateDashboardWithBudget(latestBudget);

                // Show success message about budget being loaded
                uiManager.showSuccessAlert('Your budget has been loaded successfully!');
            } else {
                console.log('No existing budget found, showing empty state');
                this.showBudgetEmptyState();
            }
        } catch (error) {
            console.error('Error loading household data:', error);
            
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
            console.log('Generating new budget for household:', this.financialApp.currentHouseholdId);

            const currentDate = new Date();
            const budgetRequest = {
                householdId: this.financialApp.currentHouseholdId,
                methodology: "50/30/20",
                month: currentDate.getMonth() + 1,
                year: currentDate.getFullYear()
            };

            const budgetResponse = await apiManager.createBudget(budgetRequest);

            if (budgetResponse && budgetResponse.budget) {
                this.financialApp.currentBudget = budgetResponse;
                console.log('New budget generated:', budgetResponse);

                this.updateDashboardWithBudget(budgetResponse);
                uiManager.showSuccessAlert('Your personalized budget has been generated!');
            }
        } catch (error) {
            console.error('Error generating budget:', error);
            uiManager.showErrorAlert('Error generating your budget. Please try again.');
        }
    }

    async loadDashboardData() {
        if (!this.financialApp.currentHouseholdId) {
            console.warn('No household ID available for loading dashboard data');
            return;
        }

        try {
            console.log('Loading dashboard data for household:', this.financialApp.currentHouseholdId);
            const householdData = await apiManager.loadHouseholdData(this.financialApp.currentHouseholdId);
            console.log('Dashboard data loaded:', householdData);

            if (!householdData) {
                throw new Error('No data received from server');
            }

            this.householdData = householdData;
            // Store household data in the main app for other components to use
            this.financialApp.householdData = householdData;
            
            this.updateDashboardCards(householdData);
            
            // Also load current budget if it exists and update dashboard with it
            if (this.financialApp.currentBudget) {
                this.updateDashboardWithBudget(this.financialApp.currentBudget);
            }
            
            this.loadBudgetOverview();
            this.loadMonthlyTrends();
            
            console.log('Dashboard data loading completed successfully');
        } catch (error) {
            console.error('ERROR loading dashboard data:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                householdId: this.financialApp.currentHouseholdId
            });

            uiManager.showErrorAlert('Error loading dashboard data. Please try refreshing the page.');
        }
    }

    updateDashboardCards(householdData) {
        console.log('Updating dashboard cards with household data:', householdData);
        
        // Calculate total monthly income
        let totalMonthlyIncome = 0;
        if (householdData.incomes && householdData.incomes.length > 0) {
            totalMonthlyIncome = householdData.incomes.reduce((sum, income) => {
                let monthlyAmount = income.grossAmount || 0;
                
                // Convert to monthly based on cadence
                switch (income.cadence?.toLowerCase()) {
                    case 'weekly':
                        monthlyAmount = monthlyAmount * 4.33;
                        break;
                    case 'biweekly':
                        monthlyAmount = monthlyAmount * 2.17;
                        break;
                    case 'semimonthly':
                        monthlyAmount = monthlyAmount * 2;
                        break;
                    case 'monthly':
                    default:
                        // Already monthly
                        break;
                }
                
                return sum + monthlyAmount;
            }, 0);
        }

        // Calculate estimated net income (rough estimate - 20% taxes)
        const estimatedTaxRate = 0.20; // Default 20% if no state data
        const estimatedTax = totalMonthlyIncome * estimatedTaxRate;
        const netIncome = totalMonthlyIncome - estimatedTax;

        // Update income cards
        const totalIncomeElement = document.getElementById('total-income');
        if (totalIncomeElement) {
            totalIncomeElement.textContent = `$${totalMonthlyIncome.toFixed(2)}`;
        }

        const netIncomeElement = document.getElementById('net-income');
        if (netIncomeElement) {
            netIncomeElement.textContent = `$${netIncome.toFixed(2)}`;
        }

        // Calculate total budgeted (if budget exists)
        let totalBudgeted = 0;
        if (this.financialApp.currentBudget && this.financialApp.currentBudget.budgetItems) {
            totalBudgeted = this.financialApp.currentBudget.budgetItems.reduce((sum, item) => {
                return sum + (item.plannedAmount || 0);
            }, 0);
        } else if (this.financialApp.currentBudget && this.financialApp.currentBudget.summary) {
            totalBudgeted = this.financialApp.currentBudget.summary.totalBudgeted || 0;
        }

        const budgetedElement = document.getElementById('total-budgeted');
        if (budgetedElement) {
            budgetedElement.textContent = `$${totalBudgeted.toFixed(2)}`;
        }

        // Calculate remaining budget
        const remaining = netIncome - totalBudgeted;
        const remainingElement = document.getElementById('remaining-budget');
        if (remainingElement) {
            remainingElement.textContent = `$${remaining.toFixed(2)}`;
            
            // Update card color based on remaining amount
            const card = remainingElement.closest('.card');
            if (card) {
                card.className = remaining >= 0 ? 'card bg-success text-white' : 'card bg-danger text-white';
            }
        }

        // Store calculated values for other methods
        this.calculatedNetIncome = netIncome;
        this.calculatedTotalIncome = totalMonthlyIncome;

        console.log('Dashboard cards updated:', {
            totalMonthlyIncome: totalMonthlyIncome.toFixed(2),
            netIncome: netIncome.toFixed(2),
            totalBudgeted: totalBudgeted.toFixed(2),
            remaining: remaining.toFixed(2)
        });
    }

    updateDashboardWithBudget(budgetData) {
        console.log('Updating dashboard with budget data:', budgetData);

        // Update budget summary cards
        if (budgetData.summary) {
            const summary = budgetData.summary;

            // Update income card
            const incomeCard = document.getElementById('total-income');
            if (incomeCard) {
                incomeCard.textContent = `$${summary.grossIncome?.toFixed(2) || '0.00'}`;
            }

            // Update net income card
            const netIncomeCard = document.getElementById('net-income');
            if (netIncomeCard) {
                netIncomeCard.textContent = `$${summary.netIncome?.toFixed(2) || '0.00'}`;
            }

            // Update total budgeted card
            const budgetedCard = document.getElementById('total-budgeted');
            if (budgetedCard) {
                budgetedCard.textContent = `$${summary.totalBudgeted?.toFixed(2) || '0.00'}`;
            }
        }

        // Update budget categories display
        this.updateBudgetCategoriesDisplay(budgetData.budgetItems);

        // Update debt snowball information if available
        if (budgetData.snowballProjection) {
            this.updateDebtSnowballDisplay(budgetData.snowballProjection);
        }

        // Update 12-month projection if available
        if (budgetData.projection) {
            this.updateProjectionDisplay(budgetData.projection);
        }

        // Update contextual tips and insights
        this.updateContextualTips();

        // Update emergency fund tracking
        this.updateEmergencyFundTracking();
    }

    updateBudgetCategoriesDisplay(budgetItems) {
        console.log('Updating budget categories display with:', budgetItems);

        // Group budget items by category type
        const items = budgetItems || [];
        const needsItems = items.filter(item => item.category?.isNeed);
        const wantsItems = items.filter(item => !item.category?.isNeed && !item.category?.name?.toLowerCase().includes('debt') && !item.category?.name?.toLowerCase().includes('emergency') && !item.category?.name?.toLowerCase().includes('retirement'));
        const savingsDebtItems = items.filter(item => item.category?.name?.toLowerCase().includes('debt') || item.category?.name?.toLowerCase().includes('emergency') || item.category?.name?.toLowerCase().includes('retirement'));

        // Update the budget breakdown cards
        this.updateBudgetBreakdownCards(needsItems, wantsItems, savingsDebtItems);
    }

    updateBudgetBreakdownCards(needs, wants, savingsDebt) {
        // Update Needs card
        const needsCard = document.getElementById('needs-amount');
        if (needsCard) {
            const needsTotal = needs.reduce((sum, item) => sum + (item.plannedAmount || 0), 0);
            needsCard.textContent = `$${needsTotal.toFixed(2)}`;
        }

        // Update Wants card
        const wantsCard = document.getElementById('wants-amount');
        if (wantsCard) {
            const wantsTotal = wants.reduce((sum, item) => sum + (item.plannedAmount || 0), 0);
            wantsCard.textContent = `$${wantsTotal.toFixed(2)}`;
        }

        // Update Savings/Debt card
        const savingsCard = document.getElementById('savings-amount');
        if (savingsCard) {
            const savingsTotal = savingsDebt.reduce((sum, item) => sum + (item.plannedAmount || 0), 0);
            savingsCard.textContent = `$${savingsTotal.toFixed(2)}`;
        }

        // Update progress bar amounts
        this.updateProgressBarAmounts(needs, wants, savingsDebt);
    }

    updateProgressBarAmounts(needs, wants, savingsDebt) {
        const needsTotal = needs.reduce((sum, item) => sum + (item.plannedAmount || 0), 0);
        const wantsTotal = wants.reduce((sum, item) => sum + (item.plannedAmount || 0), 0);
        const savingsTotal = savingsDebt.reduce((sum, item) => sum + (item.plannedAmount || 0), 0);

        // Update progress bar amount texts
        const needsAmountText = document.getElementById('needs-amount-text');
        if (needsAmountText) {
            needsAmountText.textContent = `$${needsTotal.toFixed(2)} allocated`;
        }

        const wantsAmountText = document.getElementById('wants-amount-text');
        if (wantsAmountText) {
            wantsAmountText.textContent = `$${wantsTotal.toFixed(2)} allocated`;
        }

        const savingsAmountText = document.getElementById('savings-amount-text');
        if (savingsAmountText) {
            savingsAmountText.textContent = `$${savingsTotal.toFixed(2)} allocated`;
        }
    }

    updateDebtSnowballDisplay(snowballData) {
        console.log('Updating debt snowball display:', snowballData);

        if (!snowballData || !snowballData.projection || snowballData.projection.length === 0) {
            this.showEmptyDebtState();
            return;
        }

        const projection = snowballData.projection;
        const totalMonths = snowballData.totalMonths || 0;

        // Update debt summary badges
        this.updateDebtSummary(totalMonths);

        // Update debt timeline visualization
        this.updateDebtTimeline(projection);

        // Update next action recommendations
        this.updateDebtNextAction(projection);
    }

    showBudgetEmptyState() {
        // Show empty state when no budget data is available
        console.log('Showing budget empty state');
        
        // Update budget totals to show zeros
        const totalBudgetedElement = document.getElementById('total-budgeted');
        if (totalBudgetedElement) {
            totalBudgetedElement.textContent = '$0.00';
        }

        // Show create budget call-to-action in budget breakdown section
        const budgetBreakdownSection = document.querySelector('.budget-breakdown');
        if (budgetBreakdownSection) {
            const container = budgetBreakdownSection.querySelector('.row') || budgetBreakdownSection;
            container.innerHTML = `
                <div class="col-12 mb-4">
                    <div class="card bg-light border-primary">
                        <div class="card-body text-center p-4">
                            <i class="bi bi-wallet2 display-4 text-primary mb-3"></i>
                            <h3 class="card-title">Create Your First Budget</h3>
                            <p class="card-text text-muted">
                                Get started by creating a personalized budget. We'll help you allocate your income 
                                across needs, wants, and savings based on proven budgeting methods.
                            </p>
                            <div class="mt-4">
                                <a href="budget.html" class="btn btn-primary btn-lg me-2">
                                    <i class="bi bi-magic me-2"></i>Create Budget
                                </a>
                                <button class="btn btn-outline-primary btn-lg" onclick="dashboardManager.generateNewBudget()">
                                    <i class="bi bi-lightning me-2"></i>Quick Generate
                                </button>
                            </div>
                            <p class="small text-muted mt-3 mb-0">
                                Takes less than 2 minutes to set up your personalized budget
                            </p>
                        </div>
                    </div>
                </div>
            `;
        }

        // Show empty states for other sections
        this.showEmptyDebtState();
        this.showEmptyProjectionState();

        // Update contextual tips for new users
        this.updateContextualTipsForNewUser();
    }

    showEmptyDebtState() {
        // Show empty state when no debt data is available
        const debtFocusBadge = document.getElementById('current-debt-focus');
        const monthsBadge = document.getElementById('months-to-debt-free');
        const progressFill = document.getElementById('debt-progress-fill');
        const nextAction = document.getElementById('next-action');

        if (debtFocusBadge) debtFocusBadge.textContent = 'No active debt';
        if (monthsBadge) monthsBadge.textContent = '-';
        if (progressFill) progressFill.style.width = '0%';

        // Hide milestone amounts
        ['milestone-1-amount', 'milestone-2-amount', 'milestone-3-amount'].forEach(id => {
            const element = document.getElementById(id);
            if (element) element.textContent = '$0';
        });

        if (nextAction) {
            nextAction.innerHTML = `
                <div class="alert alert-info">
                    <i class="bi bi-lightbulb me-2"></i>
                    <strong>Add debt information</strong> during onboarding to see your personalized debt payoff strategy.
                </div>
            `;
        }
    }

    updateDebtSummary(totalMonths) {
        const debtFocusBadge = document.getElementById('current-debt-focus');
        const monthsBadge = document.getElementById('months-to-debt-free');

        if (debtFocusBadge) debtFocusBadge.textContent = 'Multiple debts';
        if (monthsBadge) {
            if (totalMonths > 0) {
                const years = Math.floor(totalMonths / 12);
                const months = totalMonths % 12;
                let timeText = '';
                if (years > 0) {
                    timeText = `${years}y ${months}m`;
                } else {
                    timeText = `${months}m`;
                }
                monthsBadge.textContent = timeText;
            } else {
                monthsBadge.textContent = '-';
            }
        }
    }

    updateDebtTimeline(projection) {
        if (!projection || projection.length === 0) return;

        // Update progress bar
        const progressFill = document.getElementById('debt-progress-fill');
        if (progressFill) {
            const totalMonths = projection.length;
            const currentMonth = Math.min(totalMonths, 12); // Show first 12 months or total if less
            const progressPercentage = (currentMonth / Math.max(totalMonths, 12)) * 100;
            progressFill.style.width = `${progressPercentage}%`;
        }

        // Update milestones (simplified for demo - would be more sophisticated in real implementation)
        this.updateDebtMilestones(projection);
    }

    updateDebtMilestones(projection) {
        const milestones = ['milestone-1-amount', 'milestone-2-amount', 'milestone-3-amount'];

        if (projection.length > 0) {
            // Find significant debt payoff points
            const totalMonths = projection.length;

            // Milestone 1: First major debt payoff (around 25% of timeline)
            const milestone1Month = Math.floor(totalMonths * 0.25);
            if (milestone1Month < projection.length) {
                const remainingBalance = projection[milestone1Month]?.remainingBalance || 0;
                document.getElementById('milestone-1-amount').textContent = `$${remainingBalance.toFixed(0)}`;
            }

            // Milestone 2: Second major debt payoff (around 75% of timeline)
            const milestone2Month = Math.floor(totalMonths * 0.75);
            if (milestone2Month < projection.length) {
                const remainingBalance = projection[milestone2Month]?.remainingBalance || 0;
                document.getElementById('milestone-2-amount').textContent = `$${remainingBalance.toFixed(0)}`;
            }

            // Milestone 3: Debt free (final month)
            const finalBalance = projection[projection.length - 1]?.remainingBalance || 0;
            document.getElementById('milestone-3-amount').textContent = `$${finalBalance.toFixed(0)}`;
        }
    }

    updateDebtNextAction(projection) {
        const nextAction = document.getElementById('next-action');
        if (!nextAction) return;

        if (projection.length > 0) {
            const nextMonth = projection[0];
            const debtsRemaining = nextMonth?.debtsRemaining || 0;

            if (debtsRemaining > 1) {
                nextAction.innerHTML = `
                    <div class="alert alert-success">
                        <i class="bi bi-check-circle me-2"></i>
                        <strong>Focus on smallest debt</strong><br>
                        <small>Pay minimums on all debts, extra payment to smallest balance</small>
                    </div>
                `;
            } else if (debtsRemaining === 1) {
                nextAction.innerHTML = `
                    <div class="alert alert-warning">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        <strong>Final debt payoff</strong><br>
                        <small>You're almost debt-free! Keep making payments.</small>
                    </div>
                `;
            } else {
                nextAction.innerHTML = `
                    <div class="alert alert-success">
                        <i class="bi bi-trophy me-2"></i>
                        <strong>Debt-free!</strong><br>
                        <small>Congratulations! Now focus on building emergency fund.</small>
                    </div>
                `;
            }
        }
    }

    updateProjectionDisplay(projectionData) {
        console.log('Updating projection display:', projectionData);

        if (!projectionData) {
            this.showEmptyProjectionState();
            return;
        }

        // Update projection summary metrics
        this.updateProjectionMetrics(projectionData);

        // Update monthly projection details
        this.updateMonthlyProjection(projectionData);
    }

    showEmptyProjectionState() {
        // Show empty state when no projection data is available
        const savingsElement = document.getElementById('projected-savings');
        const debtMonthsElement = document.getElementById('debt-freedom-months');
        const monthlyProjection = document.getElementById('monthly-projection');

        if (savingsElement) savingsElement.textContent = '$0';
        if (debtMonthsElement) debtMonthsElement.textContent = '0';
        if (monthlyProjection) {
            monthlyProjection.innerHTML = '<p class="text-muted">Complete onboarding to see your 12-month financial projection.</p>';
        }
    }

    updateProjectionMetrics(projectionData) {
        // Calculate projected savings over 12 months
        const monthlySavings = this.financialApp.currentBudget?.summary?.netIncome * 0.2 || 0; // 20% for savings
        const projectedSavings = monthlySavings * 12;

        // Update savings projection
        const savingsElement = document.getElementById('projected-savings');
        if (savingsElement) {
            savingsElement.textContent = `$${projectedSavings.toFixed(0)}`;
        }

        // Update debt freedom timeline (from snowball data)
        const snowballData = this.financialApp.currentBudget?.snowballProjection;
        const totalMonths = snowballData?.totalMonths || 0;

        const debtMonthsElement = document.getElementById('debt-freedom-months');
        if (debtMonthsElement) {
            if (totalMonths > 0) {
                debtMonthsElement.textContent = totalMonths;
            } else {
                debtMonthsElement.textContent = '∞';
            }
        }

        // Update new projection elements if they exist
        const projectionSavings = document.getElementById('projection-savings');
        if (projectionSavings) {
            projectionSavings.textContent = `$${projectedSavings.toFixed(0)}`;
        }

        const projectionDebtReduction = document.getElementById('projection-debt-reduction');
        if (projectionDebtReduction) {
            const totalDebt = this.getTotalDebtBalance();
            projectionDebtReduction.textContent = `$${totalDebt.toFixed(0)}`;
        }

        const projectionEmergencyFund = document.getElementById('projection-emergency-fund');
        if (projectionEmergencyFund) {
            const emergencyFundTarget = this.financialApp.currentBudget?.summary?.netIncome * 3 || 0; // 3 months expenses
            projectionEmergencyFund.textContent = `$${Math.min(projectedSavings, emergencyFundTarget).toFixed(0)}`;
        }
    }

    updateMonthlyProjection(projectionData) {
        const monthlyProjection = document.getElementById('monthly-projection');
        if (!monthlyProjection) return;

        // Generate sample monthly projection data (in real implementation, this would come from backend)
        const months = [];
        const netIncome = this.financialApp.currentBudget?.summary?.netIncome || 0;

        for (let i = 1; i <= 12; i++) {
            const monthData = {
                month: i,
                income: netIncome,
                expenses: netIncome * 0.8, // Assume 80% spent
                savings: netIncome * 0.2,  // 20% saved
                debtBalance: Math.max(0, this.getTotalDebtBalance() - (netIncome * 0.1 * i)) // Reduce debt by 10% of income per month
            };
            months.push(monthData);
        }

        // Update projection milestones
        this.updateProjectionMilestones(months);

        // Create monthly projection table
        this.createProjectionTable(months);
    }

    updateProjectionMilestones(months) {
        const milestonesContainer = document.getElementById('projection-milestones');
        if (!milestonesContainer) return;

        // Find key milestone months
        const emergencyFundMonth = this.findEmergencyFundMilestone(months);
        const firstDebtPayoffMonth = this.findFirstDebtPayoff(months);
        const fullEmergencyFundMonth = this.findFullEmergencyFundMilestone(months);

        // Update milestone display
        const milestoneItems = milestonesContainer.querySelectorAll('.milestone-item');
        if (milestoneItems.length >= 3) {
            if (emergencyFundMonth > 0) {
                milestoneItems[0].innerHTML = `
                    <div class="d-flex justify-content-between align-items-center">
                        <span><i class="bi bi-calendar me-2"></i>Month ${emergencyFundMonth}</span>
                        <span class="badge bg-info">3-Month Emergency Fund</span>
                    </div>
                `;
            }

            if (firstDebtPayoffMonth > 0) {
                milestoneItems[1].innerHTML = `
                    <div class="d-flex justify-content-between align-items-center">
                        <span><i class="bi bi-calendar me-2"></i>Month ${firstDebtPayoffMonth}</span>
                        <span class="badge bg-success">First Debt Paid Off</span>
                    </div>
                `;
            }

            if (fullEmergencyFundMonth > 0) {
                milestoneItems[2].innerHTML = `
                    <div class="d-flex justify-content-between align-items-center">
                        <span><i class="bi bi-calendar me-2"></i>Month ${fullEmergencyFundMonth}</span>
                        <span class="badge bg-primary">6-Month Emergency Fund</span>
                    </div>
                `;
            }
        }
    }

    createProjectionTable(months) {
        const tableBody = document.getElementById('projection-table-body');
        if (!tableBody) return;

        tableBody.innerHTML = '';

        months.slice(0, 6).forEach((month, index) => { // Show first 6 months in detailed view
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>Month ${month.month}</td>
                <td>$${month.income.toFixed(0)}</td>
                <td>$${month.expenses.toFixed(0)}</td>
                <td class="text-success">$${month.savings.toFixed(0)}</td>
                <td>$${month.debtBalance.toFixed(0)}</td>
            `;
            tableBody.appendChild(row);
        });
    }

    findEmergencyFundMilestone(months) {
        const monthlySavings = this.financialApp.currentBudget?.summary?.netIncome * 0.2 || 0;
        const emergencyFundTarget = (this.financialApp.currentBudget?.summary?.netIncome * 3) || 0; // 3 months expenses

        let cumulativeSavings = 0;
        for (let i = 0; i < months.length; i++) {
            cumulativeSavings += months[i].savings;
            if (cumulativeSavings >= emergencyFundTarget) {
                return i + 1;
            }
        }
        return 0;
    }

    findFirstDebtPayoff(months) {
        const totalDebt = this.getTotalDebtBalance();
        let remainingDebt = totalDebt;

        for (let i = 0; i < months.length; i++) {
            remainingDebt -= months[i].income * 0.1; // Assume 10% of income goes to debt
            if (remainingDebt <= 0) {
                return i + 1;
            }
        }
        return 0;
    }

    findFullEmergencyFundMilestone(months) {
        const monthlySavings = this.financialApp.currentBudget?.summary?.netIncome * 0.2 || 0;
        const fullEmergencyFundTarget = (this.financialApp.currentBudget?.summary?.netIncome * 6) || 0; // 6 months expenses

        let cumulativeSavings = 0;
        for (let i = 0; i < months.length; i++) {
            cumulativeSavings += months[i].savings;
            if (cumulativeSavings >= fullEmergencyFundTarget) {
                return i + 1;
            }
        }
        return 0;
    }

    getTotalDebtBalance() {
        // Calculate total debt from household data
        if (this.householdData && this.householdData.debts) {
            return this.householdData.debts.reduce((sum, debt) => sum + debt.balance, 0);
        }
        return 0;
    }

    updateContextualTips() {
        console.log('Updating contextual tips and insights');

        // Update budget performance tip
        this.updateBudgetPerformanceTip();

        // Update emergency fund tip
        this.updateEmergencyFundTip();

        // Update state comparison tip
        this.updateStateComparisonTip();

        // Update next milestone tip
        this.updateNextMilestoneTip();
    }

    updateContextualTipsForNewUser() {
        console.log('Updating contextual tips for new user');

        // Update budget performance tip for new users
        const budgetPerformanceTip = document.getElementById('budget-performance-tip');
        if (budgetPerformanceTip) {
            budgetPerformanceTip.textContent = 'Create your first budget to see personalized performance insights and recommendations.';
        }

        // Update emergency fund tip for new users
        const emergencyFundTip = document.getElementById('emergency-fund-tip');
        if (emergencyFundTip) {
            emergencyFundTip.textContent = 'Start with a $1,000 beginner emergency fund, then work toward 3-6 months of expenses.';
        }

        // Update state comparison tip
        this.updateStateComparisonTip();

        // Update next milestone tip for new users
        const nextMilestoneTip = document.getElementById('next-milestone-tip');
        if (nextMilestoneTip) {
            nextMilestoneTip.textContent = 'Your first milestone: Create a budget to track your income and expenses effectively.';
        }
    }

    updateBudgetPerformanceTip() {
        const tipElement = document.getElementById('budget-performance-tip');
        if (!tipElement) return;

        if (!this.financialApp.currentBudget || !this.financialApp.currentBudget.budgetItems) {
            tipElement.textContent = 'Complete your budget setup to see performance insights.';
            return;
        }

        const needsItems = this.financialApp.currentBudget.budgetItems.filter(item => item.category?.isNeed);
        const wantsItems = this.financialApp.currentBudget.budgetItems.filter(item => !item.category?.isNeed &&
            !item.category?.name?.toLowerCase().includes('debt') &&
            !item.category?.name?.toLowerCase().includes('emergency'));
        const savingsItems = this.financialApp.currentBudget.budgetItems.filter(item =>
            item.category?.name?.toLowerCase().includes('debt') ||
            item.category?.name?.toLowerCase().includes('emergency'));

        const needsTotal = needsItems.reduce((sum, item) => sum + (item.plannedAmount || 0), 0);
        const wantsTotal = wantsItems.reduce((sum, item) => sum + (item.plannedAmount || 0), 0);
        const savingsTotal = savingsItems.reduce((sum, item) => sum + (item.plannedAmount || 0), 0);
        const netIncome = this.financialApp.currentBudget.summary?.netIncome || 0;

        if (netIncome <= 0) {
            tipElement.textContent = 'Add income information to see budget performance tips.';
            return;
        }

        const needsPercentage = (needsTotal / netIncome * 100);
        const wantsPercentage = (wantsTotal / netIncome * 100);
        const savingsPercentage = (savingsTotal / netIncome * 100);

        let tip = '';

        // Check if close to 50/30/20 rule
        if (Math.abs(needsPercentage - 50) <= 5 && Math.abs(wantsPercentage - 30) <= 5 && Math.abs(savingsPercentage - 20) <= 5) {
            tip = 'Excellent! You\'re following the 50/30/20 rule perfectly. This balanced approach maximizes both financial security and enjoyment.';
        } else if (needsPercentage > 55) {
            tip = 'Your needs category is a bit high. Consider reviewing housing, utilities, or transportation costs for potential savings.';
        } else if (wantsPercentage > 35) {
            tip = 'Your wants category is elevated. You might be living above your means - consider cutting back on discretionary spending.';
        } else if (savingsPercentage < 15) {
            tip = 'Your savings rate is below recommended levels. Try to increase savings to at least 15-20% for better financial security.';
        } else {
            tip = 'You\'re on a great path! Keep monitoring your budget categories to ensure they align with your financial goals.';
        }

        tipElement.textContent = tip;
    }

    updateEmergencyFundTip() {
        const tipElement = document.getElementById('emergency-fund-tip');
        if (!tipElement) return;

        if (!this.householdData || !this.householdData.incomes) {
            tipElement.textContent = 'Add income information to see emergency fund recommendations.';
            return;
        }

        const monthlyIncome = this.householdData.incomes.reduce((sum, income) =>
            sum + (income.grossAmount * (income.cadence === 'weekly' ? 4.33 : income.cadence === 'biweekly' ? 2.17 : 1)), 0);

        const recommendedFund = monthlyIncome * 3; // 3 months expenses
        const fullFund = monthlyIncome * 6; // 6 months expenses

        tipElement.textContent = `Aim for $${recommendedFund.toFixed(0)} (3 months) to $${fullFund.toFixed(0)} (6 months) of expenses. Start with a $1,000 beginner emergency fund.`;
    }

    updateStateComparisonTip() {
        const tipElement = document.getElementById('state-comparison-tip');
        if (!tipElement || !this.householdData) return;

        const state = this.householdData.state;
        if (!state) {
            tipElement.textContent = 'Add your state information to see regional comparisons.';
            return;
        }

        // Get state COLA data
        const stateData = this.financialApp.states.find(s => s.State === state);
        if (!stateData) {
            tipElement.textContent = 'Regional comparison data not available for your state.';
            return;
        }

        const colaIndex = stateData.ColaIndex || 1;
        let comparison = '';

        if (colaIndex > 1.2) {
            comparison = 'Your state has a high cost of living. You\'re doing well compared to similar households in expensive areas.';
        } else if (colaIndex < 0.9) {
            comparison = 'Your state has a lower cost of living. This gives you an advantage in building wealth faster.';
        } else {
            comparison = 'Your state has an average cost of living. You\'re performing well compared to similar households.';
        }

        tipElement.textContent = comparison;
    }

    updateNextMilestoneTip() {
        const tipElement = document.getElementById('next-milestone-tip');
        if (!tipElement) return;

        // Determine next logical milestone based on current situation
        const hasEmergencyFund = this.householdData?.goals?.some(goal => goal.type === 'emergency_fund') || false;
        const hasDebt = this.householdData?.debts?.length > 0 || false;
        const hasSavings = this.householdData?.goals?.some(goal => goal.type === 'savings') || false;

        let nextMilestone = '';

        if (hasDebt) {
            nextMilestone = 'Pay off your highest-interest debt first. This will save you money on interest and free up cash flow.';
        } else if (!hasEmergencyFund) {
            nextMilestone = 'Build a 3-month emergency fund. This provides a safety net for unexpected expenses.';
        } else if (!hasSavings) {
            nextMilestone = 'Start saving for your goals. Whether it\'s a vacation, new car, or retirement, consistent saving pays off.';
        } else {
            nextMilestone = 'You\'re building great financial habits! Consider increasing retirement contributions or investing in your future.';
        }

        tipElement.textContent = nextMilestone;
    }

    updateEmergencyFundTracking() {
        console.log('Updating emergency fund tracking');

        const currentAmountElement = document.getElementById('current-fund-amount');
        const targetAmountElement = document.getElementById('target-fund-amount');
        const progressBar = document.getElementById('emergency-fund-progress-bar');
        const monthlyContributionElement = document.getElementById('monthly-contribution');
        const completionDateElement = document.getElementById('completion-date');

        if (!currentAmountElement || !targetAmountElement || !progressBar) return;

        // Get current emergency fund savings from budget
        const emergencyFundCategory = this.financialApp.currentBudget?.budgetItems?.find(item =>
            item.category?.name?.toLowerCase().includes('emergency'));
        const currentAmount = emergencyFundCategory?.plannedAmount || 0;

        // Get target based on selection
        const targetSelect = document.getElementById('emergency-fund-target');
        const targetType = targetSelect?.value || '6months';

        let targetAmount = 0;
        if (targetType === '1000') {
            targetAmount = 1000;
        } else {
            // Calculate based on monthly expenses (approximate from income)
            const monthlyExpenses = this.financialApp.currentBudget?.summary?.netIncome * 0.8 || 0;
            targetAmount = targetType === '3months' ? monthlyExpenses * 3 : monthlyExpenses * 6;
        }

        // Update display
        currentAmountElement.textContent = `$${currentAmount.toFixed(0)}`;
        targetAmountElement.textContent = `$${targetAmount.toFixed(0)}`;

        // Update progress bar
        const progressPercentage = targetAmount > 0 ? (currentAmount / targetAmount * 100) : 0;
        progressBar.style.width = `${Math.min(progressPercentage, 100)}%`;

        // Update monthly contribution (from emergency fund allocation)
        if (monthlyContributionElement) {
            monthlyContributionElement.textContent = `$${currentAmount.toFixed(0)}`;
        }

        // Calculate completion date
        if (currentAmount < targetAmount && targetAmount > 0) {
            const monthsNeeded = Math.ceil((targetAmount - currentAmount) / currentAmount);
            const completionDate = new Date();
            completionDate.setMonth(completionDate.getMonth() + monthsNeeded);

            if (completionDateElement) {
                completionDateElement.textContent = completionDate.toLocaleDateString('en-US', {
                    month: 'short',
                    year: 'numeric'
                });
            }
        } else {
            if (completionDateElement) {
                completionDateElement.textContent = 'Complete!';
            }
        }

        // Setup target change listener
        if (targetSelect) {
            targetSelect.addEventListener('change', () => {
                this.updateEmergencyFundTracking();
            });
        }
    }

    adjustEmergencyFund() {
        // Show modal or navigate to budget section for adjustment
        uiManager.showSection('budget');
        uiManager.showSuccessAlert('Adjust your emergency fund allocation in the budget builder.');
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

// Create global dashboard manager instance
let dashboardManager;

// Safe auto-initializer: ensure dashboardManager is created when financialApp becomes available
if (typeof window.dashboardManager === 'undefined') {
    if (typeof window !== 'undefined' && window.financialApp) {
        try {
            window.dashboardManager = new DashboardManager(window.financialApp);
            console.log('Dashboard manager auto-initialized (immediate)');
        } catch (err) {
            console.error('Failed to auto-initialize dashboardManager immediately:', err);
        }
    } else {
        // Defer until DOMContentLoaded so that app.js or inline initializers can run first
        document.addEventListener('DOMContentLoaded', () => {
            if (typeof window.dashboardManager === 'undefined' && window.financialApp && typeof DashboardManager !== 'undefined') {
                try {
                    window.dashboardManager = new DashboardManager(window.financialApp);
                    console.log('Dashboard manager auto-initialized on DOMContentLoaded');
                } catch (err) {
                    console.error('Failed to auto-initialize dashboardManager on DOMContentLoaded:', err);
                }
            }
        });
    }
}