import sys
import os
import math

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend")))

from app.services.wow.freedom_date_calculator import calculate_freedom_date

def test():
    inputs = {
        "current_age": 58,
        "birth_year": 1999,
        "current_monthly_expenses": 60000,
        "expected_inflation": 0.06,
        "annual_investment_return": 0.12,
        "withdrawal_rate": 0.04,
        "current_net_worth": 1000000,
        "monthly_savings": 30000,
        "stepup_rate": 0.10
    }
    
    print("Inputs:", inputs)
    res = calculate_freedom_date(**inputs)
    
    expected = {
        "fi_number": 18000000.0,
        "years_to_fi": 15.88824878,
        "years_to_fi_stepup": 17.17049963,
        "fi_achievement_year": 2072.88824878,
        "fi_age_at_achievement": 73.88824878,
        "remaining_gap": 17000000.0,
        "percent_fi_achieved": 0.05555556,
        "annual_withdrawal": 720000.0,
        "monthly_income_at_fi": 60000.0,
        "monthly_income_inflation_10": 107450.8618,
        "monthly_income_inflation_20": 192428.1283,
        "safe_fi_buffer": 27000000.0
    }
    
    print("\nParity Check:")
    print(f"%-30s | %-15s | %-15s | %s" % ("Field", "Expected", "Actual", "Diff"))
    print("-" * 75)
    
    success = True
    for k, val in expected.items():
        actual = res[k]
        diff = abs(val - actual)
        print(f"%-30s | %-15.8f | %-15.8f | %.8f" % (k, val, actual, diff))
        if diff > 1e-4:
            print(f"ERROR: Discrepancy in {k}! Expected {val}, got {actual}")
            success = False
            
    print("\nFreedom Date Message:")
    print("Expected: 🎉 YOUR FINANCIAL FREEDOM DATE: December 1, 2072 at age 73.9!")
    print("Actual:  ", res["freedom_date_message"])
    
    if "December 1, 2072" not in res["freedom_date_message"] or "age 73.9!" not in res["freedom_date_message"]:
        print("ERROR: Freedom Date Message does not match!")
        success = False
        
    if success:
        print("\nSUCCESS: All values match Excel to at least 4 decimal places!")
    else:
        print("\nFAILURE: Mismatches detected.")

if __name__ == "__main__":
    test()
