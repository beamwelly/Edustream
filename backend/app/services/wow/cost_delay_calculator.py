from typing import List, Dict, Any

def calculate_cost_of_delay(
    monthly_sip_amount: float,
    expected_annual_return: float,
    target_age: float,
    current_age: float
) -> Dict[str, Any]:
    # starting ages listed in Excel offsets relative to current_age:
    # 0, 2, 5, 7, 10, 13, 15, 17, 20, 23, 25
    offsets = [0.0, 2.0, 5.0, 7.0, 10.0, 13.0, 15.0, 17.0, 20.0, 23.0, 25.0]
    ages = [current_age + offset for offset in offsets]
    
    # Calculate corpus starting at current_age to act as base (E12 in Excel)
    base_age = current_age
    r_monthly = expected_annual_return / 12
    
    if base_age >= target_age:
        base_corpus = 0.0
    else:
        months_base = (target_age - base_age) * 12
        if r_monthly == 0:
            base_corpus = monthly_sip_amount * months_base
        else:
            base_corpus = monthly_sip_amount * (((1 + r_monthly) ** months_base - 1) / r_monthly) * (1 + r_monthly)
            
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
                
        # F12: corpus_at_target - base_corpus (vs Starting at current_age)
        vs_starting_at_base = corpus_at_target - base_corpus
        
        # G12: IF(E12=0,0,(E12-E12_base)/E12_base)
        if base_corpus == 0:
            delay_cost_percent = 0.0
        else:
            delay_cost_percent = vs_starting_at_base / base_corpus
            
        delay_table.append({
            "start_age": start_age,
            "years_to_invest": years_to_invest,
            "total_invested": total_invested,
            "corpus_at_target": corpus_at_target,
            "vs_starting_at_25": vs_starting_at_base,  # keep key name for frontend compatibility
            "delay_cost_percent": delay_cost_percent
        })
        
    # Generate dynamic warning text based on user's current_age vs current_age + 13 (6th row, index 5)
    # C8 = current_age
    age_13 = current_age + 13.0
    months_13 = (target_age - age_13) * 12
    if age_13 >= target_age:
        corpus_at_13 = 0.0
    else:
        if r_monthly == 0:
            corpus_at_13 = monthly_sip_amount * months_13
        else:
            corpus_at_13 = monthly_sip_amount * (((1 + r_monthly) ** months_13 - 1) / r_monthly) * (1 + r_monthly)
            
    loss = corpus_at_13 - base_corpus
    pct = (loss / base_corpus) * -1 if base_corpus > 0 else 0.0
    
    warning_text = (
        f"💥 Starting at {int(round(age_13))} instead of {int(round(current_age))}: "
        f"You lose ₹{round(loss):,} in corpus — {pct * 100:.1f}% penalty!"
    )
    
    return {
        "warning_text": warning_text,
        "delay_table": delay_table
    }
