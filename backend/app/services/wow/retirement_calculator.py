from typing import List, Dict, Any

def calculate_retirement_predictor(
    current_age: float,
    expected_retirement_age: float,
    life_expectancy: float,
    current_monthly_expenses: float,
    expected_inflation_rate: float,
    current_monthly_income: float,
    savings_rate: float,
    expected_investment_return: float,
    post_retirement_return: float
) -> Dict[str, Any]:
    years_to_retirement = expected_retirement_age - current_age
    years_in_retirement = life_expectancy - expected_retirement_age
    monthly_savings = current_monthly_income * savings_rate
    
    # C18: Current Monthly Expenses * (1 + Inflation)^YearsToRetirement
    monthly_expenses_at_retirement = current_monthly_expenses * ((1 + expected_inflation_rate) ** years_to_retirement)
    annual_expenses_at_retirement = monthly_expenses_at_retirement * 12
    
    # C20: C19*(1-(1+C9)^(-C16))/(C13-C9)*((1+C13))
    rate_diff = post_retirement_return - expected_inflation_rate
    if rate_diff == 0:
        rate_diff = 0.0001
        
    required_retirement_corpus = (
        annual_expenses_at_retirement *
        (1 - (1 + expected_inflation_rate) ** (-years_in_retirement)) /
        rate_diff *
        (1 + post_retirement_return)
    )
    
    # C21: C10*C11*12*((1+C12)^C15-1)/C12*(1+C12)
    if expected_investment_return == 0:
        savings_corpus_at_retirement = monthly_savings * 12 * years_to_retirement
    else:
        savings_corpus_at_retirement = (
            monthly_savings * 12 *
            (((1 + expected_investment_return) ** years_to_retirement - 1) / expected_investment_return) *
            (1 + expected_investment_return)
        )
        
    corpus_surplus_deficit = savings_corpus_at_retirement - required_retirement_corpus
    
    if corpus_surplus_deficit >= 0:
        track_status = "✅ On Track! Your savings plan is sufficient"
    else:
        track_status = "⚠️ Gap detected! Increase savings rate or delay retirement"
        
    # Sensitivity Table: ages: 45, 48, 50, 52, 54, 55, 56, 57, 58, 60, 62, 65
    sensitivity_ages = [45.0, 48.0, 50.0, 52.0, 54.0, 55.0, 56.0, 57.0, 58.0, 60.0, 62.0, 65.0]
    sensitivity_table = []
    
    for age in sensitivity_ages:
        if age <= current_age or age >= life_expectancy:
            continue
        
        y_to_ret = age - current_age
        y_in_ret = life_expectancy - age
        m_exp_ret = current_monthly_expenses * ((1 + expected_inflation_rate) ** y_to_ret)
        a_exp_ret = m_exp_ret * 12
        
        corp_needed = (
            a_exp_ret *
            (1 - (1 + expected_inflation_rate) ** (-y_in_ret)) /
            rate_diff *
            (1 + post_retirement_return)
        )
        sensitivity_table.append({"age": age, "corpus_needed": corp_needed})
        
    return {
        "years_to_retirement": years_to_retirement,
        "years_in_retirement": years_in_retirement,
        "monthly_savings": monthly_savings,
        "monthly_expenses_at_retirement": monthly_expenses_at_retirement,
        "required_retirement_corpus": required_retirement_corpus,
        "savings_corpus_at_retirement": savings_corpus_at_retirement,
        "corpus_surplus_deficit": corpus_surplus_deficit,
        "track_status": track_status,
        "sensitivity_table": sensitivity_table
    }
