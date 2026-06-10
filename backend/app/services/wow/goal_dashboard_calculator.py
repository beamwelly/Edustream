from typing import List, Dict, Any

def calculate_goal_dashboard(
    goals: List[Dict[str, Any]]
) -> Dict[str, Any]:
    calculated_goals = []
    
    total_target = 0.0
    total_saved = 0.0
    total_sip = 0.0
    
    for g in goals:
        name = g.get("name", "")
        target = float(g.get("target_amount", 0.0))
        saved = float(g.get("current_saved", 0.0))
        sip = float(g.get("monthly_sip", 0.0))
        timeline = float(g.get("timeline_years", 0.0))
        
        # G6: D6/C6
        percent_achieved = saved / target if target > 0 else 0.0
        
        # H6: IF(D6>=C6,"✅ Done!",IF(D6/C6>=0.75,"🔥 Almost!",IF(D6/C6>=0.5,"🌿 Half way",IF(D6/C6>=0.25,"🌱 Growing","🚀 Just Started"))))
        if saved >= target:
            status = "✅ Done!"
        elif percent_achieved >= 0.75:
            status = "🔥 Almost!"
        elif percent_achieved >= 0.5:
            status = "🌿 Half way"
        elif percent_achieved >= 0.25:
            status = "🌱 Growing"
        else:
            status = "🚀 Just Started"
            
        total_target += target
        total_saved += saved
        total_sip += sip
        
        calculated_goals.append({
            "name": name,
            "target_amount": target,
            "current_saved": saved,
            "monthly_sip": sip,
            "timeline_years": timeline,
            "percent_achieved": percent_achieved,
            "status": status
        })
        
    # F16: D16/C16 (total_saved / total_target)
    overall_percent_achieved = total_saved / total_target if total_target > 0 else 0.0
    
    return {
        "goals": calculated_goals,
        "total_target": total_target,
        "total_saved": total_saved,
        "total_sip": total_sip,
        "overall_percent_achieved": overall_percent_achieved
    }
