from typing import Dict, Any, List

def calculate_sip_home_loan_impact(
    monthly_sip: float,
    sip_return: float,
    sip_duration: float,
    stepup_rate: float,
    loan_amount: float,
    loan_rate: float,
    loan_tenure: float,
    down_payment: float,
    appreciation_rate: float,
    tax_benefit: float
) -> Dict[str, Any]:
    # ------------------
    # SIP Calculations
    # ------------------
    r_sip = sip_return / 12
    months_sip = sip_duration * 12
    
    if r_sip == 0:
        simple_sip_corpus = monthly_sip * months_sip
    else:
        simple_sip_corpus = monthly_sip * (((1 + r_sip) ** months_sip - 1) / r_sip) * (1 + r_sip)
        
    total_amount_invested = monthly_sip * 12 * sip_duration
    wealth_gain = simple_sip_corpus - total_amount_invested
    
    # C14: C5*12*((((1+C6)^C7-(1+C8)^C7))/(C6-C8))*(1+C6)
    if sip_return == stepup_rate:
        stepup_rate_adj = stepup_rate - 0.0001
    else:
        stepup_rate_adj = stepup_rate
        
    stepup_sip_corpus = (
        monthly_sip * 12 * 
        ((((1 + sip_return) ** sip_duration - (1 + stepup_rate_adj) ** sip_duration)) / (sip_return - stepup_rate_adj)) * 
        (1 + sip_return)
    )
    
    return_multiple = simple_sip_corpus / total_amount_invested if total_amount_invested > 0 else 0.0
    
    # ------------------
    # Loan Calculations
    # ------------------
    r_loan = loan_rate / 12
    months_loan = loan_tenure * 12
    if r_loan == 0:
        monthly_emi = loan_amount / months_loan if months_loan > 0 else 0.0
    else:
        monthly_emi = (
            loan_amount * (r_loan * (1 + r_loan) ** months_loan) /
            (((1 + r_loan) ** months_loan) - 1)
        )
        
    total_amount_paid = monthly_emi * loan_tenure * 12
    total_interest_paid = total_amount_paid - loan_amount
    
    # Property Value at Maturity
    property_value_maturity = loan_amount * ((1 + appreciation_rate) ** loan_tenure)
    net_property_gain = property_value_maturity - (loan_amount + down_payment + total_interest_paid)
    
    # SIP EMI Invested (EMI * SIP Compound Return)
    if r_sip == 0:
        sip_emi_invested = monthly_emi * months_loan
    else:
        sip_emi_invested = monthly_emi * (((1 + r_sip) ** months_loan - 1) / r_sip) * (1 + r_sip)
        
    sip_advantage_over_property = sip_emi_invested - net_property_gain
    
    # Combined Analysis
    total_monthly_outflow = monthly_sip + monthly_emi
    combined_sip_corpus = simple_sip_corpus
    combined_property_net = property_value_maturity - total_interest_paid
    combined_wealth = combined_sip_corpus + combined_property_net
    effective_emi = (monthly_emi * 12 - tax_benefit) / 12
    
    if combined_wealth > (simple_sip_corpus + property_value_maturity):
        beaten_amount = combined_wealth - simple_sip_corpus
        recommendation_msg = f"✅ Balanced approach beats pure SIP by ₹{round(beaten_amount):,}"
    else:
        recommendation_msg = "📊 Review strategy — pure SIP may be better"
        
    # ------------------------------------
    # Chart Series Generation (Yearly)
    # ------------------------------------
    
    # 1. SIP Growth Series
    sip_series = []
    curr_stepup_sip = monthly_sip
    stepup_bal = 0.0
    stepup_invested_cum = 0.0
    for y in range(0, int(sip_duration) + 1):
        if y == 0:
            sip_series.append({
                "year": 0,
                "simple_balance": 0.0,
                "simple_invested": 0.0,
                "stepup_balance": 0.0,
                "stepup_invested": 0.0
            })
            continue
            
        m_simple = y * 12
        if r_sip == 0:
            simple_bal = monthly_sip * m_simple
        else:
            simple_bal = monthly_sip * (((1 + r_sip) ** m_simple - 1) / r_sip) * (1 + r_sip)
            
        # Calculate stepup for this year
        year_contrib = 0.0
        for m in range(12):
            year_contrib += curr_stepup_sip * ((1 + r_sip) ** (12 - m))
        stepup_bal = stepup_bal * ((1 + sip_return) ** 1) + year_contrib
        stepup_invested_cum += curr_stepup_sip * 12
        
        sip_series.append({
            "year": y,
            "simple_balance": round(simple_bal, 2),
            "simple_invested": round(monthly_sip * 12 * y, 2),
            "stepup_balance": round(stepup_bal, 2),
            "stepup_invested": round(stepup_invested_cum, 2)
        })
        curr_stepup_sip *= (1 + stepup_rate)

    # 2. Loan Amortization & Property Appreciation Series
    loan_series = []
    rem_bal = loan_amount
    cum_principal = 0.0
    cum_interest = 0.0
    
    max_years = int(max(loan_tenure, sip_duration))
    
    for y in range(0, max_years + 1):
        # Property Value Compounding
        prop_val = (loan_amount + down_payment) * ((1 + appreciation_rate) ** y)
        
        if y == 0:
            loan_series.append({
                "year": 0,
                "remaining_balance": round(loan_amount, 2),
                "principal_paid": 0.0,
                "interest_paid": 0.0,
                "property_value": round(prop_val, 2)
            })
            continue
            
        # Run 12 months of amortization if tenure is not exceeded
        if y <= loan_tenure:
            year_interest = 0.0
            year_principal = 0.0
            for _ in range(12):
                interest_m = rem_bal * r_loan
                principal_m = monthly_emi - interest_m
                if rem_bal < principal_m:
                    principal_m = rem_bal
                rem_bal -= principal_m
                year_interest += interest_m
                year_principal += principal_m
            cum_principal += year_principal
            cum_interest += year_interest
        else:
            # Loan already paid off
            year_principal = 0.0
            year_interest = 0.0
            rem_bal = 0.0
            
        loan_series.append({
            "year": y,
            "remaining_balance": round(rem_bal, 2),
            "principal_paid": round(cum_principal, 2),
            "interest_paid": round(cum_interest, 2),
            "property_value": round(prop_val, 2)
        })
        
    return {
        "simple_sip_corpus": simple_sip_corpus,
        "total_amount_invested": total_amount_invested,
        "wealth_gain": wealth_gain,
        "stepup_sip_corpus": stepup_sip_corpus,
        "return_multiple": return_multiple,
        "monthly_emi": monthly_emi,
        "total_amount_paid": total_amount_paid,
        "total_interest_paid": total_interest_paid,
        "property_value_maturity": property_value_maturity,
        "net_property_gain": net_property_gain,
        "sip_emi_invested": sip_emi_invested,
        "sip_advantage_over_property": sip_advantage_over_property,
        "total_monthly_outflow": total_monthly_outflow,
        "combined_sip_corpus": combined_sip_corpus,
        "combined_property_net": combined_property_net,
        "combined_wealth": combined_wealth,
        "effective_emi": effective_emi,
        "recommendation_msg": recommendation_msg,
        "sip_series": sip_series,
        "loan_series": loan_series
    }
