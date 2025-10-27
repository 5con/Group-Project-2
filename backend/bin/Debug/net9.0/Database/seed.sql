-- Seed Data for Financial Management System

-- Insert Categories
INSERT INTO Categories (Name, IsNeed, ParentId) VALUES
('Housing', 1, NULL),
('Utilities', 1, NULL),
('Groceries', 1, NULL),
('Transportation', 1, NULL),
('Medical/Health', 1, NULL),
('Insurance', 1, NULL),
('Childcare', 1, NULL),
('Minimum Debt Payments', 1, NULL),
('Dining Out', 0, NULL),
('Entertainment', 0, NULL),
('Personal', 0, NULL),
('Subscriptions', 0, NULL),
('Misc', 0, NULL),
('Emergency Fund', 0, NULL),
('Sinking Funds', 0, NULL),
('Extra Debt Payments', 0, NULL),
('Retirement/Long-term', 0, NULL);

-- Insert State Parameters
INSERT INTO StateParams (State, ColaIndex, EstEffectiveTaxRate) VALUES
('AL', 0.87, 0.18), ('AK', 1.27, 0.15), ('AZ', 0.95, 0.16), ('AR', 0.85, 0.19),
('CA', 1.35, 0.22), ('CO', 1.05, 0.17), ('CT', 1.15, 0.20), ('DE', 0.98, 0.18),
('FL', 0.97, 0.15), ('GA', 0.91, 0.18), ('HI', 1.60, 0.21), ('ID', 0.93, 0.17),
('IL', 0.95, 0.19), ('IN', 0.88, 0.17), ('IA', 0.89, 0.18), ('KS', 0.87, 0.17),
('KY', 0.88, 0.18), ('LA', 0.92, 0.17), ('ME', 0.96, 0.18), ('MD', 1.10, 0.21),
('MA', 1.25, 0.19), ('MI', 0.91, 0.17), ('MN', 1.02, 0.20), ('MS', 0.82, 0.17),
('MO', 0.88, 0.16), ('MT', 0.96, 0.17), ('NE', 0.90, 0.18), ('NV', 0.98, 0.15),
('NH', 1.05, 0.15), ('NJ', 1.18, 0.20), ('NM', 0.88, 0.16), ('NY', 1.25, 0.22),
('NC', 0.90, 0.18), ('ND', 0.94, 0.15), ('OH', 0.89, 0.17), ('OK', 0.86, 0.17),
('OR', 1.08, 0.21), ('PA', 0.98, 0.18), ('RI', 1.05, 0.18), ('SC', 0.89, 0.17),
('SD', 0.91, 0.15), ('TN', 0.90, 0.15), ('TX', 0.92, 0.15), ('UT', 0.95, 0.18),
('VT', 1.05, 0.18), ('VA', 1.00, 0.18), ('WA', 1.10, 0.19), ('WV', 0.83, 0.17),
('WI', 0.94, 0.18), ('WY', 0.95, 0.15);

-- Insert Financial Modules
INSERT INTO FinancialModules (Title, Description, [Order], Content) VALUES
('Budgeting Basics', 'Learn the foundations of tracking income and expenses, creating budgets, and cash-flow control', 1, '{"sections":[{"title":"Budget Methods","content":"Learn about zero-based, 50/30/20, and envelope budgeting methods. The 50/30/20 rule allocates 50% to needs, 30% to wants, and 20% to savings/debt. Zero-based budgeting gives every dollar a purpose. Envelope system uses cash for different categories.","interactive":{"type":"quiz","question":"Which budgeting method gives every dollar a specific purpose?","options":["50/30/20","Zero-based","Envelope System"],"correct":1}},{"title":"Fixed vs Variable Costs","content":"Fixed costs stay the same each month (rent, insurance) while variable costs change (groceries, entertainment). Track both to understand your spending patterns.","interactive":{"type":"sorting","items":["Rent","Groceries","Car Insurance","Dining Out"],"categories":{"Fixed":["Rent","Car Insurance"],"Variable":["Groceries","Dining Out"]}}}]}'),
('Banking & Cash Management', 'How accounts work and optimizing for fees, yield, and access', 2, '{"sections":[{"title":"Account Types","content":"Checking accounts for daily transactions, savings for emergencies, high-yield savings for better interest, CDs for locked funds with higher rates, money market for liquidity with some yield.","interactive":{"type":"matching","pairs":[{"left":"Daily transactions","right":"Checking"},{"left":"Emergency fund","right":"High-yield savings"},{"left":"Locked funds, higher interest","right":"CD"}]}},{"title":"Account Security","content":"Use strong passwords, enable 2FA, monitor accounts regularly, avoid public WiFi for banking, use credit cards over debit for fraud protection.","interactive":{"type":"checklist","items":["Strong unique passwords","Two-factor authentication","Regular account monitoring","Credit card preference over debit"]}}]}'),
('Credit & Debt Management', 'Building credit responsibly and reducing costly debt', 3, '{"sections":[{"title":"Credit Scores","content":"Credit scores range from 300-850. Factors include payment history (35%), amounts owed (30%), length of history (15%), new credit (10%), and credit mix (10%).","interactive":{"type":"percentage","question":"What percentage of your credit score comes from payment history?","correct":35}},{"title":"Debt Strategies","content":"Snowball method: pay smallest debts first for motivation. Avalanche method: pay highest interest first for savings. Both work - choose based on your personality.","interactive":{"type":"comparison","question":"Compare snowball vs avalanche methods","option1":"Snowball - smallest debts first","option2":"Avalanche - highest interest first"}}]}'),
('Saving & Emergency Funds', 'Short-term buffers and goal-based savings', 4, '{"sections":[{"title":"Emergency Fund","content":"3-6 months of essential expenses in an easily accessible account. Start with $1,000, then build to 3 months, then 6 months for job security.","interactive":{"type":"calculator","inputs":[{"name":"monthly_expenses","label":"Monthly Essential Expenses"}],"formula":"emergency_fund = monthly_expenses * 3","output":"3-month emergency fund target"}},{"title":"Savings Goals","content":"Use SMART goals (Specific, Measurable, Achievable, Relevant, Time-bound). Break large goals into smaller milestones. Automate transfers to savings accounts.","interactive":{"type":"goal_setting","fields":["goal_name","target_amount","target_date","monthly_savings"]}}]}'),
('Investing Fundamentals', 'Why invest, risk/return, and time horizon basics', 5, '{"sections":[{"title":"Investment Types","content":"Stocks: ownership in companies, high risk/reward. Bonds: loans to entities, lower risk. ETFs: baskets of investments, diversified. Mutual funds: professionally managed, varied fees.","interactive":{"type":"categorization","items":["Apple Stock","US Treasury Bond","S&P 500 ETF","Vanguard Mutual Fund"],"categories":{"Stocks":["Apple Stock"],"Bonds":["US Treasury Bond"],"ETFs":["S&P 500 ETF"],"Mutual Funds":["Vanguard Mutual Fund"]}}},{"title":"Risk & Return","content":"Risk and return are related - higher potential returns come with higher risk. Your risk tolerance depends on age, goals, and emotional comfort with volatility.","interactive":{"type":"slider","question":"Rate your risk tolerance (1-10)","explanation":"Higher scores suit younger investors with long time horizons"}}]}'),
('Portfolio Construction & Risk', 'Building and maintaining a diversified portfolio', 6, '{"sections":[{"title":"Asset Allocation","content":"Determine your mix of stocks, bonds, and cash based on goals and risk tolerance. Rule of thumb: 100 - age = stock percentage.","interactive":{"type":"allocation","age":30,"stocks":70,"bonds":30}},{"title":"Diversification","content":"Don''t put all eggs in one basket. Diversify across asset classes, sectors, geographies, and investment styles to reduce risk.","interactive":{"type":"diversification","portfolio":["Tech stocks only","Mixed US stocks","Global stocks + bonds"],"risk_level":[9,5,3]}}]}'),
('Retirement & Tax-Advantaged Accounts', 'Using accounts to accelerate long-term wealth', 7, '{"sections":[{"title":"Account Types","content":"401(k): employer-sponsored, pre-tax contributions. Roth IRA: after-tax contributions, tax-free growth. Traditional IRA: pre-tax contributions, taxable withdrawals.","interactive":{"type":"benefits","accounts":[{"name":"401(k)","tax_advantage":"Pre-tax contributions"},{"name":"Roth IRA","tax_advantage":"Tax-free growth"}]}},{"title":"Employer Match","content":"Free money! Contribute at least enough to get the full employer match - it''s an immediate 50-100% return on your investment.","interactive":{"type":"match_calculator","employer_match":50,"max_match":6,"salary":50000,"contribution":3,"result":"You should contribute 6% to get full match"}}]}'),
('Taxes 101 (Personal Finance Focus)', 'How taxes affect take-home pay and investing', 8, '{"sections":[{"title":"Tax Basics","content":"Progressive tax system: higher income = higher rates. Marginal rate is what you pay on your last dollar. Effective rate is what you actually pay.","interactive":{"type":"tax_calculator","income":75000,"filing_status":"single","result":{"marginal_rate":22,"effective_rate":15,"take_home":63750}}},{"title":"Tax-Advantaged Investing","content":"Tax-loss harvesting: sell losing investments to offset gains. Municipal bonds: tax-exempt interest. Retirement accounts grow tax-deferred.","interactive":{"type":"strategy","situation":"You have $10k in gains and $3k in losses","action":"Tax-loss harvest to offset gains"}}]}'),
('Insurance & Risk Management', 'Protecting income, assets, and liabilities', 9, '{"sections":[{"title":"Essential Coverages","content":"Health insurance for medical costs, auto insurance for vehicle damage/liability, homeowners/renters for property and liability protection.","interactive":{"type":"coverage_quiz","scenarios":[{"situation":"Car accident","coverage":"Auto insurance"},{"situation":"House fire","coverage":"Homeowners insurance"}]}},{"title":"Deductibles & Premiums","content":"Higher deductibles = lower premiums but more out-of-pocket costs when you need coverage. Choose based on your emergency fund and risk tolerance.","interactive":{"type":"tradeoff","high_deductible":{"premium":800,"out_of_pocket":2000},"low_deductible":{"premium":1200,"out_of_pocket":500}}}]}'),
('Asset Ownership (Real Estate, Vehicles, Business, Equity Comp)', 'Big-ticket assets and ownership structures', 10, '{"sections":[{"title":"Buy vs Rent","content":"Buy if you''ll stay 5+ years, have stable income, and can afford maintenance/taxes. Rent if you need flexibility or have uncertain future plans.","interactive":{"type":"decision_tree","factors":["Time horizon","Financial stability","Maintenance willingness"],"recommendation":"Buy if all factors align"}},{"title":"Vehicle Ownership","content":"Total cost of ownership includes purchase price, insurance, maintenance, fuel, and depreciation. Consider reliability over luxury features.","interactive":{"type":"tco_calculator","car_price":25000,"insurance":1200,"maintenance":800,"fuel":2000,"years":5,"result":35000}}]}'),
('Financial Planning & Life Events', 'Holistic planning across milestones', 11, '{"sections":[{"title":"SMART Goals","content":"Specific, Measurable, Achievable, Relevant, Time-bound. Break big goals into smaller milestones with specific deadlines and action steps.","interactive":{"type":"goal_builder","template":"By [date], I will [specific action] to achieve [measurable goal] because [relevance]"}},{"title":"Estate Planning Basics","content":"Will: who gets your assets. Power of Attorney: who makes decisions if you''re incapacitated. Healthcare directive: your medical wishes. Beneficiaries on accounts.","interactive":{"type":"documents","required":["Will","Power of Attorney","Healthcare Directive"],"optional":["Trust","Life Insurance"]}}]}'),
('Fraud, Consumer Rights & Behavioral Finance', 'Protecting yourself and making better money decisions', 12, '{"sections":[{"title":"Common Scams","content":"Phishing emails, fake IRS calls, romance scams, investment fraud. Never give personal info to unsolicited requests. Verify before acting.","interactive":{"type":"scenario","situation":"Email claiming you''re owed money","red_flags":["Unsolicited","Urgency","Requests personal info"],"action":"Delete and report"}},{"title":"Behavioral Biases","content":"Loss aversion: fear of loss > joy of gain. Overconfidence: overestimating knowledge. Present bias: prioritizing today over tomorrow. Awareness helps better decisions.","interactive":{"type":"bias_identification","examples":[{"bias":"I check my portfolio 5x daily","type":"Overconfidence"},{"bias":"I avoid selling losers","type":"Loss aversion"}]}}]}');

-- Insert Admin User (password is 'admin123' - BCrypt hashed)
INSERT INTO Users (Email, PasswordHash, IsAdmin, Locale, HasCompletedOnboarding, CreatedAt) VALUES
('admin@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIiLNVPo8i', 1, 'en-US', 1, datetime('now'));

-- Insert Test Users with Households (password is 'password123' - BCrypt hashed)
INSERT INTO Users (Email, PasswordHash, IsAdmin, Locale, HasCompletedOnboarding, CreatedAt) VALUES
('john.doe@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIiLNVPo8i', 0, 'en-US', 1, datetime('now')),
('jane.smith@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIiLNVPo8i', 0, 'en-US', 1, datetime('now')),
('bob.johnson@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIiLNVPo8i', 0, 'en-US', 1, datetime('now'));

-- Insert Test Households
INSERT INTO Households (UserId, State, HouseholdSize) VALUES
(2, 'CA', 2),
(3, 'TX', 4),
(4, 'NY', 1);

-- Update users with current household
UPDATE Users SET CurrentHouseholdId = 1 WHERE Id = 2;
UPDATE Users SET CurrentHouseholdId = 2 WHERE Id = 3;
UPDATE Users SET CurrentHouseholdId = 3 WHERE Id = 4;

-- Insert Test Incomes
INSERT INTO Incomes (HouseholdId, Name, Cadence, GrossAmount) VALUES
(1, 'Software Engineer Salary', 'monthly', 8500.00),
(1, 'Freelance Work', 'monthly', 1500.00),
(2, 'Teacher Salary', 'monthly', 4500.00),
(2, 'Spouse Income', 'monthly', 5000.00),
(3, 'Consultant', 'monthly', 12000.00);

-- Insert Test Expenses
INSERT INTO Expenses (HouseholdId, Name, CategoryId, Cadence, Amount, IsRecurring) VALUES
(1, 'Rent', 1, 'monthly', 2500.00, 1),
(1, 'Electric Bill', 2, 'monthly', 150.00, 1),
(1, 'Grocery Shopping', 3, 'weekly', 200.00, 1),
(2, 'Mortgage', 1, 'monthly', 1800.00, 1),
(2, 'Car Payment', 4, 'monthly', 450.00, 1),
(3, 'Apartment Rent', 1, 'monthly', 3500.00, 1);

-- Insert Test Debts
INSERT INTO Debts (HouseholdId, Type, Name, Balance, Apr, MinPayment) VALUES
(1, 'credit_card', 'Chase Visa', 3500.00, 18.99, 105.00),
(2, 'student_loan', 'Federal Student Loan', 25000.00, 4.5, 280.00),
(2, 'auto_loan', 'Car Loan', 15000.00, 5.2, 450.00),
(3, 'credit_card', 'Amex', 8500.00, 21.99, 255.00);

-- Insert Test Goals
INSERT INTO Goals (HouseholdId, Type, Name, TargetAmount, TargetDate, Priority) VALUES
(1, 'emergency_fund', 'Emergency Fund', 15000.00, date('now', '+12 months'), 1),
(1, 'savings', 'Vacation Fund', 5000.00, date('now', '+6 months'), 2),
(2, 'debt_payoff', 'Pay off Student Loans', 25000.00, date('now', '+36 months'), 1),
(3, 'savings', 'Down Payment for House', 80000.00, date('now', '+24 months'), 1);

-- Insert Test Budgets
INSERT INTO Budgets (HouseholdId, Methodology, Month, Notes) VALUES
(1, '50/30/20', date('now', 'start of month'), 'Initial budget for John'),
(2, 'zero_based', date('now', 'start of month'), 'Initial budget for Jane'),
(3, '50/30/20', date('now', 'start of month'), 'Initial budget for Bob');

-- Insert Test Budget Items (simplified)
INSERT INTO BudgetItems (BudgetId, CategoryId, PlannedAmount) VALUES
(1, 1, 2500.00), (1, 2, 300.00), (1, 3, 600.00), (1, 9, 400.00), (1, 14, 1000.00),
(2, 1, 1800.00), (2, 2, 250.00), (2, 3, 800.00), (2, 4, 500.00), (2, 16, 500.00),
(3, 1, 3500.00), (3, 2, 200.00), (3, 3, 700.00), (3, 9, 600.00), (3, 14, 2000.00);

-- Insert Test Transactions
INSERT INTO Transactions (HouseholdId, Date, CategoryId, Amount, Note) VALUES
(1, date('now', '-5 days'), 3, 85.50, 'Whole Foods'),
(1, date('now', '-3 days'), 9, 45.00, 'Restaurant dinner'),
(2, date('now', '-7 days'), 1, 1800.00, 'Mortgage payment'),
(2, date('now', '-4 days'), 3, 120.00, 'Costco run'),
(3, date('now', '-2 days'), 9, 150.00, 'Client lunch');

-- Insert Test Settings
INSERT INTO Settings (HouseholdId, StrictMode, GuardrailOverridesJson) VALUES
(1, 0, '{}'),
(2, 1, '{"housing_max": 0.35}'),
(3, 0, '{}');

