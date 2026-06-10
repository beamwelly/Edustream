import math
from datetime import datetime
from typing import Dict, Any

def calculate_freedom_date(
    current_age: float,
    birth_year: float,
    current_monthly_expenses: float,
    expected_inflation: float,
    annual_investment_return: float,
    withdrawal_rate: float,
    current_net_worth: float,
    monthly_savings: float,
    stepup_rate: float
) -> Dict[str, Any]:
    # C16: C7*12/C10
    fi_number = current_monthly_expenses * 12 / withdrawal_rate
    
    # C17: C7*12*(1+C8)^20/C10
    fi_number_inflation_20 = current_monthly_expenses * 12 * ((1 + expected_inflation) ** 20) / withdrawal_rate
    
    # C18: LN((C16-C11)*(C9/12)/(C12)+1)/(LN(1+C9/12)*12)
    # Let's avoid log of negative or division by zero:
    r_monthly = annual_investment_return / 12
    if monthly_savings <= 0:
        years_to_fi = 999.0
    else:
        log_numerator = (fi_number - current_net_worth) * r_monthly / monthly_savings + 1
        if log_numerator <= 0:
            # Already achieved or unreachable mathematically
            years_to_fi = 0.0
        else:
            if r_monthly == 0:
                years_to_fi = (fi_number - current_net_worth) / (monthly_savings * 12)
            else:
                years_to_fi = math.log(log_numerator) / (math.log(1 + r_monthly) * 12)
                
    # C19: LN(C16*C9/(C12*12)+1)/LN(1+C9)
    if monthly_savings <= 0:
        years_to_fi_stepup = 999.0
    else:
        log_num_step = fi_number * annual_investment_return / (monthly_savings * 12) + 1
        if log_num_step <= 0:
            years_to_fi_stepup = 0.0
        else:
            if annual_investment_return == 0:
                years_to_fi_stepup = fi_number / (monthly_savings * 12)
            else:
                years_to_fi_stepup = math.log(log_num_step) / math.log(1 + annual_investment_return)
                
    # C20: YEAR(TODAY())+C18
    current_year = datetime.now().year
    fi_achievement_year = current_year + years_to_fi
    
    # C21: C5+C18
    fi_age_at_achievement = current_age + years_to_fi
    
    # F5: C16
    fi_target = fi_number
    
    # F6: C11
    current_net_worth_val = current_net_worth
    
    # F7: F5-F6
    remaining_gap = fi_target - current_net_worth_val
    
    # F8: F6/F5
    percent_fi_achieved = current_net_worth_val / fi_target if fi_target > 0 else 0.0
    
    # F9: C18
    years_remaining = years_to_fi
    
    # F10: C12
    monthly_saved = monthly_savings
    
    # F11: IF(F8<0.25,"🌱 Early Stage",IF(F8<0.5,"🌿 Growing",IF(F8<0.75,"🌳 Halfway!",IF(F8<1,"🔥 Almost There!","🎊 FI ACHIEVED!"))))
    if percent_fi_achieved < 0.25:
        progress_milestone = "🌱 Early Stage"
    elif percent_fi_achieved < 0.5:
        progress_milestone = "🌿 Growing"
    elif percent_fi_achieved < 0.75:
        progress_milestone = "🌳 Halfway!"
    elif percent_fi_achieved < 1.0:
        progress_milestone = "🔥 Almost There!"
    else:
        progress_milestone = "🎊 FI ACHIEVED!"
        
    # F14: C16*0.04
    # Note: Using withdrawal_rate instead of hardcoded 0.04 to remain dynamic
    annual_withdrawal = fi_number * withdrawal_rate
    
    # F15: F14/12
    monthly_income_at_fi = annual_withdrawal / 12
    
    # F16: F15*(1+C8)^10
    monthly_income_inflation_10 = monthly_income_at_fi * ((1 + expected_inflation) ** 10)
    
    # F17: F15*(1+C8)^20
    monthly_income_inflation_20 = monthly_income_at_fi * ((1 + expected_inflation) ** 20)
    
    # F18: C16*1.5
    safe_fi_buffer = fi_number * 1.5
    
    # B23: CONCATENATE("🎉 YOUR FINANCIAL FREEDOM DATE: January 1, ",TEXT(C20,"0")," at age ",TEXT(C21,"0.0"),"!")
    freedom_date_message = (
        f"🎉 YOUR FINANCIAL FREEDOM DATE: January 1, {round(fi_achievement_year)} "
        f"at age {fi_age_at_achievement:.1f}!"
    )
    
    # Timeline Projection Series
    timeline_series = []
    project_years = max(10, min(40, math.ceil(years_to_fi) + 5)) if years_to_fi < 999 else 25
    
    curr_nw_simple = current_net_worth
    curr_nw_stepup = current_net_worth
    curr_savings = monthly_savings * 12
    
    for y in range(0, project_years + 1):
        target_at_y = fi_target * ((1 + expected_inflation) ** y)
        
        timeline_series.append({
            "year": current_year + y,
            "age": round(current_age + y),
            "simple_net_worth": round(curr_nw_simple, 2),
            "stepup_net_worth": round(curr_nw_stepup, 2),
            "fi_target": round(target_at_y, 2)
        })
        
        # Compound simple
        curr_nw_simple = curr_nw_simple * (1 + annual_investment_return) + (monthly_savings * 12)
        # Compound step-up
        curr_nw_stepup = curr_nw_stepup * (1 + annual_investment_return) + curr_savings
        curr_savings *= (1 + stepup_rate)
        
    return {
        "fi_number": fi_number,
        "fi_number_inflation_20": fi_number_inflation_20,
        "years_to_fi": years_to_fi,
        "years_to_fi_stepup": years_to_fi_stepup,
        "fi_achievement_year": fi_achievement_year,
        "fi_age_at_achievement": fi_age_at_achievement,
        "fi_target": fi_target,
        "current_net_worth_val": current_net_worth_val,
        "remaining_gap": remaining_gap,
        "percent_fi_achieved": percent_fi_achieved,
        "years_remaining": years_remaining,
        "monthly_saved": monthly_saved,
        "progress_milestone": progress_milestone,
        "annual_withdrawal": annual_withdrawal,
        "monthly_income_at_fi": monthly_income_at_fi,
        "monthly_income_inflation_10": monthly_income_inflation_10,
        "monthly_income_inflation_20": monthly_income_inflation_20,
        "safe_fi_buffer": safe_fi_buffer,
        "freedom_date_message": freedom_date_message,
        "timeline_series": timeline_series
    }
