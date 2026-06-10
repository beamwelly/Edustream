from typing import List, Dict, Any

def calculate_cost_of_delay(
    monthly_sip_amount: float,
    expected_annual_return: float,
    target_age: float,
    current_age: float
) -> Dict[str, Any]:
    # starting ages listed in Excel: 25, 27, 30, 32, 35, 38, 40, 42, 45, 48, 50
    ages = [25.0, 27.0, 30.0, 32.0, 35.0, 38.0, 40.0, 42.0, 45.0, 48.0, 50.0]
    
    # Calculate corpus starting at age 25 to act as base
    # E12: IF(25>=C7,0,C5*(((1+C6/12)^((C7-25)*12)-1)/(C6/12))*(1+C6/12))
    base_age = 25.0
    r_monthly = expected_annual_return / 12
    
    if base_age >= target_age:
        corpus_at_25 = 0.0
    else:
        months_25 = (target_age - base_age) * 12
        if r_monthly == 0:
            corpus_at_25 = monthly_sip_amount * months_25
        else:
            corpus_at_25 = monthly_sip_amount * (((1 + r_monthly) ** months_25 - 1) / r_monthly) * (1 + r_monthly)
            
    delay_table = []
    for start_age in ages:
        # C12: MAX(0, C7 - start_age)
        years_to_invest = max(0.0, target_age - start_age)
        
        # D12: IF(start_age<=C7,C5*12*(C7-start_age),0)
        if start_age <= target_age:
            total_invested = monthly_sip_amount * 12 * (target_age - start_age)
        else:
            total_invested = 0.0
            
        # E12: IF(start_age>=C7,0,C5*(((1+C6/12)^((C7-start_age)*12)-1)/(C6/12))*(1+C6/12))
        if start_age >= target_age:
            corpus_at_target = 0.0
        else:
            months = (target_age - start_age) * 12
            if r_monthly == 0:
                corpus_at_target = monthly_sip_amount * months
            else:
                corpus_at_target = monthly_sip_amount * (((1 + r_monthly) ** months - 1) / r_monthly) * (1 + r_monthly)
                
        # F12: corpus_at_target - corpus_at_25
        vs_starting_at_25 = corpus_at_target - corpus_at_25
        
        # G12: IF(E12=0,0,(E12-E12_base)/E12_base)
        if corpus_at_25 == 0:
            delay_cost_percent = 0.0
        else:
            delay_cost_percent = vs_starting_at_25 / corpus_at_25
            
        delay_table.append({
            "start_age": start_age,
            "years_to_invest": years_to_invest,
            "total_invested": total_invested,
            "corpus_at_target": corpus_at_target,
            "vs_starting_at_25": vs_starting_at_25,
            "delay_cost_percent": delay_cost_percent
        })
        
    # Generate dynamic warning text based on user's current_age input vs starting at 25
    # C8 = current_age
    current_point = None
    # find closest matching start_age or calculate dynamically for the specific current_age
    months_curr = (target_age - current_age) * 12
    if current_age >= target_age:
        corpus_at_curr = 0.0
    else:
        if r_monthly == 0:
            corpus_at_curr = monthly_sip_amount * months_curr
        else:
            corpus_at_curr = monthly_sip_amount * (((1 + r_monthly) ** months_curr - 1) / r_monthly) * (1 + r_monthly)
            
    loss = corpus_at_curr - corpus_at_25
    pct = (loss / corpus_at_25) * -1 if corpus_at_25 > 0 else 0.0
    
    warning_text = (
        f"💥 Starting at {int(current_age)} instead of 25: "
        f"You lose ₹{round(abs(loss)):,} in corpus — {pct * 100:.1f}% penalty!"
    )
    
    return {
        "warning_text": warning_text,
        "delay_table": delay_table
    }
