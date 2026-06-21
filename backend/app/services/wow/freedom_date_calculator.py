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
    # Input validation checks
    if withdrawal_rate <= 0:
        raise ValueError("Withdrawal rate must be greater than 0")
    if current_age <= 0:
        raise ValueError("Current age must be greater than 0")
    if birth_year != int(birth_year):
        raise ValueError("Birth year must be an integer")

    # C16: C7*12/C10
    fi_number = current_monthly_expenses * 12 / withdrawal_rate
    
    # C17: C7*12*(1+C8)^20/C10
    fi_number_inflation_20 = current_monthly_expenses * 12 * ((1 + expected_inflation) ** 20) / withdrawal_rate
    
    # Check if already financially independent
    if current_net_worth >= fi_number:
        years_to_fi = 0.0
        years_to_fi_stepup = 0.0
    else:
        # C18: LN((C16-C11)*(C9/12)/(C12)+1)/(LN(1+C9/12)*12)
        r_monthly = annual_investment_return / 12
        if monthly_savings <= 0:
            years_to_fi = 999.0
        else:
            log_val = ((fi_number - current_net_worth) * r_monthly / monthly_savings) + 1
            if log_val <= 0:
                years_to_fi = 999.0
            else:
                if r_monthly == 0:
                    years_to_fi = (fi_number - current_net_worth) / (monthly_savings * 12)
                else:
                    years_to_fi = math.log(log_val) / (math.log(1 + r_monthly) * 12)
                    
        # C19: LN(C16*C9/(C12*12)+1)/LN(1+C9)
        if monthly_savings <= 0:
            years_to_fi_stepup = 999.0
        else:
            log_val_step = (fi_number * annual_investment_return / (monthly_savings * 12)) + 1
            if log_val_step <= 0:
                years_to_fi_stepup = 999.0
            else:
                if annual_investment_return == 0:
                    years_to_fi_stepup = fi_number / (monthly_savings * 12)
                else:
                    years_to_fi_stepup = math.log(log_val_step) / math.log(1 + annual_investment_return)
                    
    # Clamp years to FI to avoid negative values
    years_to_fi = max(0.0, years_to_fi)
    years_to_fi_stepup = max(0.0, years_to_fi_stepup)
                
    # C20: =(C6+C5)+C18 (Birth Year + Current Age + Years to FI)
    fi_achievement_year = birth_year + current_age + years_to_fi
    
    # C21: C20-C6 (Achievement Year - Birth Year)
    fi_age_at_achievement = fi_achievement_year - birth_year
    
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
        
    # F14: C16*0.04 (Strictly 4% withdrawal rate for annual withdrawal)
    annual_withdrawal = fi_number * 0.04
    
    # F15: F14/12
    monthly_income_at_fi = annual_withdrawal / 12
    
    # F16: F15*(1+C8)^10
    monthly_income_inflation_10 = monthly_income_at_fi * ((1 + expected_inflation) ** 10)
    
    # F17: F15*(1+C8)^20
    monthly_income_inflation_20 = monthly_income_at_fi * ((1 + expected_inflation) ** 20)
    
    # F18: C16*1.5
    safe_fi_buffer = fi_number * 1.5
    
    # B23: CONCATENATE("🎉 YOUR FINANCIAL FREEDOM DATE: ", CHOOSE(...), " 1, ", INT(C20), " at age ", C21)
    if current_net_worth >= fi_number:
        freedom_date_message = "🎉 Congratulations! You are already financially independent"
    elif years_to_fi < 999:
        c20 = fi_achievement_year
        c21 = fi_age_at_achievement
        fractional_year = c20 - math.floor(c20)
        # Excel ROUND((C20-INT(C20))*12+1, 0)
        month_num = int(math.floor(fractional_year * 12 + 1 + 0.5))
        month_num = min(12, max(1, month_num))
        months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
        month_name = months[month_num - 1]
        year_val = int(math.floor(c20))
        freedom_date_message = (
            f"🎉 YOUR FINANCIAL FREEDOM DATE: {month_name} 1, {year_val} "
            f"at age {c21:.1f}!"
        )
    else:
        freedom_date_message = "📊 Financial Freedom date is not reachable with current savings rate."
    
    # Timeline Projection Series
    timeline_series = []
    project_years = max(10, min(40, math.ceil(years_to_fi) + 5)) if years_to_fi < 999 else 25
    
    current_year = datetime.now().year
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
