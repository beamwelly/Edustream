import { useState, useEffect, useRef } from "react";
import { 
  ChevronLeft, 
  Save, 
  RotateCcw, 
  Loader2, 
  Search, 
  TrendingUp, 
  ShieldAlert, 
  FileText, 
  Download, 
  Check, 
  AlertTriangle, 
  XCircle, 
  Info, 
  Calendar, 
  User, 
  MapPin, 
  Briefcase, 
  GraduationCap, 
  Users, 
  Landmark, 
  AlertCircle,
  HelpCircle,
  BookOpen,
  Mail,
  MessageSquare,
  FileCheck,
  ChevronRight
} from "lucide-react";
import { PageHeader, Card, Button } from "@/components/common";
import { apiFetch } from "@/services/api";
import { jsPDF } from "jspdf";
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar, Cell, PieChart, Pie, Legend } from "recharts";
import { toast } from "sonner";

// Options from Excel _Lists sheet
const REVIEW_TYPE_OPTIONS = ['New Client', 'Annual Review', 'Portfolio Rebalance', 'Goal Review', 'Other'];
const AGE_OPTIONS = ['18–25', '26–35', '36–45', '46–55', '56–65', '66+'];
const INCOME_OPTIONS = ['< ₹5 Lakhs', '₹5–10 Lakhs', '₹10–25 Lakhs', '₹25–50 Lakhs', '₹50L–1 Crore', '> ₹1 Crore'];
const NET_WORTH_OPTIONS = ['< ₹25 Lakhs', '₹25–50 Lakhs', '₹50L–1 Crore', '₹1–5 Crores', '₹5–10 Crores', '> ₹10 Crores'];
const OCCUPATION_OPTIONS = ['Salaried', 'Self-Employed', 'Business Owner', 'Professional (Doctor/CA/Lawyer)', 'Retired', 'Other'];
const EDUCATION_OPTIONS = ['Below Graduate', 'Graduate', 'Post-Graduate', 'Professional Degree'];
const MARITAL_OPTIONS = ['Single', 'Married', 'Married with Children', 'Divorced / Widowed'];
const TAX_SLAB_OPTIONS = ['Nil / New Regime', '5%', '10%', '15%', '20%', '30%'];

const GOAL_OPTIONS = ['Wealth Creation', 'Retirement Planning', "Child's Education", 'Home Purchase', 'Tax Saving', 'Regular Income', 'Capital Preservation', 'Legacy / Estate Planning'];
const HORIZON_OPTIONS = ['< 1 Year', '1–3 Years', '3–5 Years', '5–10 Years', '> 10 Years'];
const SURPLUS_OPTIONS = ['< ₹1 Lakh', '₹1–5 Lakhs', '₹5–10 Lakhs', '₹10–25 Lakhs', '₹25–50 Lakhs', '₹50L–1 Crore', '> ₹1 Crore'];
const RETURN_OPTIONS = ['FD-like (6–7%)', 'Moderate (10–12%)', 'Market-Linked (12–15%)', 'Aggressive (>15%)'];
const INCOME_REQ_OPTIONS = ['Yes – Monthly', 'Yes – Quarterly', 'Yes – Annually', 'No'];

const REACTION_OPTIONS = ['Sell Everything (Score 1)', 'Sell Some (Score 2)', 'Hold & Wait (Score 3)', 'Buy More (Score 4)', 'Buy Very Aggressively (Score 5)'];
const KNOWLEDGE_OPTIONS = ['Novice – Never invested', 'Basic – FD/PPF only', 'Intermediate – MF investor', 'Advanced – Equity/PMS', 'Expert – Derivatives/AIF'];
const EXPERIENCE_OPTIONS = ['Never', 'Less than 1 Year', '1–3 Years', '3–5 Years', '> 5 Years'];
const RISK_PCT_OPTIONS = ['< 10% of Savings', '10–25%', '25–50%', '50–75%', '> 75%'];
const RISK_ATTITUDE_OPTIONS = ['Safety first – minimal risk', 'Modest growth with low risk', 'Balanced risk-return', 'Growth with higher risk', 'Maximum returns at any risk'];
const LOAN_OPTIONS = ['Yes – Major Liabilities', 'Yes – Minor Liabilities', 'No Loans'];
const EMERGENCY_OPTIONS = ['Yes', 'No', 'Partially'];

const TAX_PRIORITY_OPTIONS = ['Very High', 'High', 'Moderate', 'Low', 'Not a Priority'];
const TAX_AWARE_OPTIONS = ['Yes – Fully Aware', 'Aware but Need Clarity', 'Not Aware'];
const RESIDENCY_OPTIONS = ['Resident Indian', 'NRI', 'PIO / OCI', 'Foreign National'];
const FATCA_OPTIONS = ['Yes', 'No', 'Not Sure'];

const AWARE_OPTIONS = ['Yes – Fully Aware', 'Heard of It', 'Not Aware'];
const INS_10X_OPTIONS = ['Yes', 'No', 'Not Sure'];
const INTEREST_ULIP_OPTIONS = ['Yes', 'No', 'Maybe'];
const ACTIVE_PASSIVE_OPTIONS = ['Actively Managed', 'Passively Managed (Index)', 'Both / No Preference'];
const INT_DIV_OPTIONS = ['Yes', 'No', 'Maybe'];
const GROWTH_IDCW_OPTIONS = ['Growth Option', 'IDCW – Monthly', 'IDCW – Quarterly', 'IDCW – Annual', 'No Preference'];
const COMM_OPTIONS = ['Email', 'WhatsApp', 'Physical Mail', 'Mobile App'];

const RISK_PROFILE_OPTIONS = ['Conservative', 'Moderately Conservative', 'Moderate', 'Moderately Aggressive', 'Aggressive', 'Very Aggressive'];
const URGENCY_OPTIONS = ['Immediate', 'This Month', 'This Quarter', 'No Urgency'];
const NEXT_STEP_OPTIONS = ['Send Product Proposal', 'Schedule Follow-up', 'Complete KYC', 'Risk Profiling Pending', 'Awaiting Client Decision', 'Closed – Invested'];

// Mappings from options to scores (strict replication of Excel values)
const mapAgeScore = (val: string) => {
  if (val === '18–25') return 5;
  if (val === '26–35') return 5;
  if (val === '36–45') return 4;
  if (val === '46–55') return 3;
  if (val === '56–65') return 2;
  if (val === '66+') return 1;
  return 0;
};
const mapHorizonScore = (val: string) => {
  if (val === '< 1 Year') return 1;
  if (val === '1–3 Years') return 2;
  if (val === '3–5 Years') return 3;
  if (val === '5–10 Years') return 4;
  if (val === '> 10 Years') return 5;
  return 0;
};
const mapIncomeScore = (val: string) => {
  if (val === '< ₹5 Lakhs') return 1;
  if (val === '₹5–10 Lakhs') return 2;
  if (val === '₹10–25 Lakhs') return 3;
  if (val === '₹25–50 Lakhs') return 4;
  if (val === '> ₹50 Lakhs' || val === '₹50L–1 Crore' || val === '> ₹1 Crore') return 5;
  return 0;
};
const mapNetWorthScore = (val: string) => {
  if (val === '< ₹25 Lakhs') return 1;
  if (val === '₹25–50 Lakhs') return 2;
  if (val === '₹50L–1 Crore') return 3;
  if (val === '₹1–5 Crores') return 4;
  if (val === '> ₹5 Crores' || val === '₹5–10 Crores' || val === '> ₹10 Crores') return 5;
  return 0;
};
const mapReactionScore = (val: string) => {
  if (val?.includes('Score 1') || val === 'Sell Everything') return 1;
  if (val?.includes('Score 2') || val === 'Sell Some') return 2;
  if (val?.includes('Score 3') || val === 'Hold & Wait') return 3;
  if (val?.includes('Score 4') || val === 'Buy More') return 4;
  if (val?.includes('Score 5') || val === 'Buy Very Aggressively') return 5;
  return 0;
};
const mapKnowledgeScore = (val: string) => {
  if (val?.includes('Novice')) return 1;
  if (val?.includes('Basic')) return 2;
  if (val?.includes('Intermediate')) return 3;
  if (val?.includes('Advanced')) return 4;
  if (val?.includes('Expert')) return 5;
  return 0;
};
const mapExperienceScore = (val: string) => {
  if (val === 'Never') return 1;
  if (val === '< 1 Year' || val === 'Less than 1 Year') return 2;
  if (val === '1–3 Years') return 3;
  if (val === '3–5 Years') return 4;
  if (val === '> 5 Years') return 5;
  return 0;
};
const mapRiskSavingsScore = (val: string) => {
  if (val?.includes('< 10%')) return 1;
  if (val?.includes('10–25%')) return 2;
  if (val?.includes('25–50%')) return 3;
  if (val?.includes('50–75%')) return 4;
  if (val?.includes('> 75%')) return 5;
  return 0;
};
const mapLiquidityScore = (val: string) => {
  if (val === '< 1 Week') return 1;
  if (val === '1–3 Months') return 2;
  if (val === '3–12 Months') return 3;
  if (val === '1–3 Years') return 4;
  if (val === '> 3 Years') return 5;
  return 0;
};
const mapLoansScore = (val: string) => {
  if (val?.includes('Major Liabilities')) return 1;
  if (val?.includes('Minor Liabilities')) return 3;
  if (val?.includes('No Loans')) return 5;
  return 0;
};

const calculateSuitability = (dimension: string, product: string, inputs: {
  riskProfile: string;
  horizon: string;
  surplus: string;
  liquidityNeed: string;
  taxPriority: string;
  investorCategory: string;
}) => {
  const rp = inputs.riskProfile;
  const horizon = inputs.horizon;
  const surplus = inputs.surplus;
  const liq = inputs.liquidityNeed;

  if (dimension === "Risk Profile") {
    if (!rp) return "—";
    if (product === "Mutual Funds") {
      if (["Conservative", "Mod. Conservative", "Moderate", "Mod. Aggressive", "Aggressive", "Very Aggressive"].includes(rp)) return "✅";
      return "❌";
    }
    if (product === "Direct Equity") {
      if (["Mod. Aggressive", "Aggressive", "Very Aggressive"].includes(rp)) return "✅";
      if (rp === "Moderate") return "⚠";
      return "❌";
    }
    if (product === "Insurance") {
      if (["Conservative", "Mod. Conservative", "Moderate"].includes(rp)) return "✅";
      return "⚠";
    }
    if (product === "PMS") {
      if (["Mod. Aggressive", "Aggressive", "Very Aggressive"].includes(rp)) return "✅";
      if (rp === "Moderate") return "⚠";
      return "❌";
    }
    if (product === "AIF") {
      if (["Aggressive", "Very Aggressive"].includes(rp)) return "✅";
      if (rp === "Mod. Aggressive") return "⚠";
      return "❌";
    }
    if (product === "SIF") {
      if (["Mod. Aggressive", "Aggressive", "Very Aggressive"].includes(rp)) return "✅";
      if (rp === "Moderate") return "⚠";
      return "❌";
    }
  }

  if (dimension === "Horizon") {
    if (!horizon) return "—";
    if (product === "Mutual Funds") return "✅";
    if (product === "Direct Equity") {
      if (["3–5 Years", "5–10 Years", "> 10 Years"].includes(horizon)) return "✅";
      if (horizon === "1–3 Years") return "⚠";
      return "❌";
    }
    if (product === "Insurance") {
      if (["5–10 Years", "> 10 Years"].includes(horizon)) return "✅";
      if (horizon === "3–5 Years") return "⚠";
      return "❌";
    }
    if (product === "PMS") {
      if (["3–5 Years", "5–10 Years", "> 10 Years"].includes(horizon)) return "✅";
      if (horizon === "1–3 Years") return "⚠";
      return "❌";
    }
    if (product === "AIF") {
      if (["5–10 Years", "> 10 Years"].includes(horizon)) return "✅";
      if (horizon === "3–5 Years") return "⚠";
      return "❌";
    }
    if (product === "SIF") {
      if (["3–5 Years", "5–10 Years", "> 10 Years"].includes(horizon)) return "✅";
      return "⚠";
    }
  }

  if (dimension === "Surplus") {
    if (!surplus) return "—";
    if (product === "Mutual Funds") return "✅";
    if (product === "Direct Equity") {
      if (["₹1–5 Lakhs", "₹5–10 Lakhs", "₹10–25 Lakhs", "₹25–50 Lakhs", "₹50L–1 Crore", "> ₹1 Crore"].includes(surplus)) return "✅";
      return "⚠";
    }
    if (product === "Insurance") return "✅";
    if (product === "PMS") {
      if (["₹25–50 Lakhs", "₹50L–1 Crore", "> ₹1 Crore"].includes(surplus)) return "✅";
      if (surplus === "₹10–25 Lakhs") return "⚠";
      return "❌";
    }
    if (product === "AIF") {
      if (surplus === "> ₹1 Crore") return "✅";
      if (surplus === "₹50L–1 Crore") return "⚠";
      return "❌";
    }
    if (product === "SIF") {
      if (["₹10–25 Lakhs", "₹25–50 Lakhs", "₹50L–1 Crore", "> ₹1 Crore"].includes(surplus)) return "✅";
      if (surplus === "₹5–10 Lakhs") return "⚠";
      return "❌";
    }
  }

  if (dimension === "Liquidity Need") {
    if (!liq) return "—";
    if (product === "Mutual Funds") return "✅";
    if (product === "Direct Equity") {
      if (["Moderate (1–3 Months)", "Low (3Y+ OK)", "Very Low (5Y+ OK)"].includes(liq)) return "✅";
      return "⚠";
    }
    if (product === "Insurance") {
      if (["Low (3Y+ OK)", "Very Low (5Y+ OK)"].includes(liq)) return "✅";
      if (liq === "Moderate (1–3 Months)") return "⚠";
      return "❌";
    }
    if (product === "PMS") {
      if (["Low (3Y+ OK)", "Very Low (5Y+ OK)"].includes(liq)) return "✅";
      if (liq === "Moderate (1–3 Months)") return "❌"; // wait, Excel returns NO (❌)
      return "❌";
    }
    if (product === "AIF") {
      if (liq === "Very Low (5Y+ OK)") return "✅";
      if (liq === "Low (3Y+ OK)") return "⚠";
      return "❌";
    }
    if (product === "SIF") {
      if (["Low (3Y+ OK)", "Very Low (5Y+ OK)"].includes(liq)) return "✅";
      return "⚠";
    }
  }

  return "—";
};

interface NeedsDiscoveryPageProps {
  onBack: () => void;
}

export function NeedsDiscoveryPage({ onBack }: NeedsDiscoveryPageProps) {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"Saved" | "Saving..." | "Unsaved Changes">("Saved");

  const isLoaded = useRef(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Core State containing all components
  const [clientDiscovery, setClientDiscovery] = useState({
    clientName: "",
    advisorName: "",
    meetingDate: "",
    clientId: "",
    location: "",
    reviewType: "New Client",
    
    // Demographics
    age: "", // text/number
    annualIncome: "",
    netWorth: "",
    occupation: "",
    education: "",
    maritalStatus: "",
    taxSlab: "",
    
    // Objectives & Goals
    primaryGoal: "",
    timeHorizon: "",
    lumpSum: "",
    sipAmount: "", // free text
    returnExpectation: "",
    requireIncome: "",
    existingInvestments: "",
    
    // Risk Profiling Questionnaire
    riskReaction: "",
    knowledgeLevel: "",
    marketExperience: "",
    savingsAtRisk: "",
    riskAttitude: "",
    outstandingLoans: "",
    emergencyFund: "",
    
    // Tax Planning & Regulatory
    taxSavingPriority: "",
    taxAware: "",
    residencyStatus: "",
    fatcaReporting: "",
    
    // Product screening
    awarePMS: "",
    awareAIF: "",
    awareSIF: "",
    lifeInsurance10x: "",
    interestedULIP: "",
    activePassivePref: "",
    specificFundHouse: "",
    intDiversification: "",
    growthIdcwPref: "",
    communicationPref: "",
    
    // Advisor Assessment
    assessedRiskProfile: "",
    urgencyDecision: "",
    keyConcerns: "",
    productsDiscussed: "",
    nextStep: "",
  });

  const [riskCalculator, setRiskCalculator] = useState({
    ageRange: "",
    horizon: "",
    income: "",
    netWorth: "",
    reaction: "",
    knowledge: "",
    experience: "",
    riskSavings: "",
    liquidity: "",
    loans: ""
  });

  const [suitabilityCheck, setSuitabilityCheck] = useState({
    riskProfile: "",
    horizon: "",
    surplus: "",
    liquidityNeed: "",
    taxPriority: "",
    investorCategory: ""
  });

  const [dashboardNotes, setDashboardNotes] = useState({
    notes: ""
  });

  // Helper function to format in Indian currency
  const formatIndianCurrency = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return "₹0";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(num);
  };

  const safeText = (val: any) => {
    if (val === undefined || val === null || String(val).trim() === "" || String(val).trim().toUpperCase() === "N/A") {
      return "—";
    }
    return String(val).trim();
  };

  // Convert client age text to age range category
  const getAgeRangeFromNumber = (ageStr: string) => {
    const ageNum = parseInt(ageStr, 10);
    if (isNaN(ageNum)) return "";
    if (ageNum >= 18 && ageNum <= 25) return "18–25";
    if (ageNum >= 26 && ageNum <= 35) return "26–35";
    if (ageNum >= 36 && ageNum <= 45) return "36–45";
    if (ageNum >= 46 && ageNum <= 55) return "46–55";
    if (ageNum >= 56 && ageNum <= 65) return "56–65";
    if (ageNum >= 66) return "66+";
    return "";
  };

  // Auto-fill risk calculator inputs based on demographic questions
  useEffect(() => {
    if (!loading) {
      setRiskCalculator(prev => {
        const autoAge = getAgeRangeFromNumber(clientDiscovery.age);
        const autoHorizon = clientDiscovery.timeHorizon;
        
        // Income mapping
        let autoIncome = "";
        if (clientDiscovery.annualIncome) {
          if (["₹50L–1 Crore", "> ₹1 Crore"].includes(clientDiscovery.annualIncome)) {
            autoIncome = "> ₹50 Lakhs";
          } else {
            autoIncome = clientDiscovery.annualIncome;
          }
        }

        // Net Worth mapping
        let autoNW = "";
        if (clientDiscovery.netWorth) {
          if (["₹5–10 Crores", "> ₹10 Crores"].includes(clientDiscovery.netWorth)) {
            autoNW = "> ₹5 Crores";
          } else {
            autoNW = clientDiscovery.netWorth;
          }
        }

        // Reaction mapping
        let autoReaction = "";
        if (clientDiscovery.riskReaction) {
          autoReaction = clientDiscovery.riskReaction.split(" (Score")[0];
        }

        // Knowledge mapping
        let autoKnowledge = "";
        if (clientDiscovery.knowledgeLevel) {
          autoKnowledge = clientDiscovery.knowledgeLevel.split(" – ")[0];
        }

        // Experience mapping
        let autoExperience = "";
        if (clientDiscovery.marketExperience) {
          autoExperience = clientDiscovery.marketExperience === "Less than 1 Year" ? "< 1 Year" : clientDiscovery.marketExperience;
        }

        // savings willing to risk mapping
        let autoRiskSavings = "";
        if (clientDiscovery.savingsAtRisk) {
          autoRiskSavings = clientDiscovery.savingsAtRisk.split(" of Savings")[0];
        }

        // Loans mapping
        let autoLoans = "";
        if (clientDiscovery.outstandingLoans) {
          autoLoans = clientDiscovery.outstandingLoans.replace("Yes – ", "");
        }

        return {
          ...prev,
          ageRange: autoAge || prev.ageRange,
          horizon: autoHorizon || prev.horizon,
          income: autoIncome || prev.income,
          netWorth: autoNW || prev.netWorth,
          reaction: autoReaction || prev.reaction,
          knowledge: autoKnowledge || prev.knowledge,
          experience: autoExperience || prev.experience,
          riskSavings: autoRiskSavings || prev.riskSavings,
          loans: autoLoans || prev.loans,
        };
      });
    }
  }, [clientDiscovery.age, clientDiscovery.timeHorizon, clientDiscovery.annualIncome, clientDiscovery.netWorth, clientDiscovery.riskReaction, clientDiscovery.knowledgeLevel, clientDiscovery.marketExperience, clientDiscovery.savingsAtRisk, clientDiscovery.outstandingLoans, loading]);

  // Auto-calculate risk score
  const calculateTotalRiskScore = () => {
    let score = 0;
    let count = 0;

    if (riskCalculator.ageRange) { score += mapAgeScore(riskCalculator.ageRange); count++; }
    if (riskCalculator.horizon) { score += mapHorizonScore(riskCalculator.horizon); count++; }
    if (riskCalculator.income) { score += mapIncomeScore(riskCalculator.income); count++; }
    if (riskCalculator.netWorth) { score += mapNetWorthScore(riskCalculator.netWorth); count++; }
    if (riskCalculator.reaction) { score += mapReactionScore(riskCalculator.reaction); count++; }
    if (riskCalculator.knowledge) { score += mapKnowledgeScore(riskCalculator.knowledge); count++; }
    if (riskCalculator.experience) { score += mapExperienceScore(riskCalculator.experience); count++; }
    if (riskCalculator.riskSavings) { score += mapRiskSavingsScore(riskCalculator.riskSavings); count++; }
    if (riskCalculator.liquidity) { score += mapLiquidityScore(riskCalculator.liquidity); count++; }
    if (riskCalculator.loans) { score += mapLoansScore(riskCalculator.loans); count++; }

    return { totalScore: score, answeredCount: count };
  };

  const { totalScore, answeredCount } = calculateTotalRiskScore();

  const getRiskProfileFromScore = (score: number) => {
    if (answeredCount < 10) return "";
    if (score <= 17) return "Conservative";
    if (score <= 25) return "Moderately Conservative";
    if (score <= 33) return "Moderate";
    if (score <= 40) return "Moderately Aggressive";
    if (score <= 47) return "Aggressive";
    return "Very Aggressive";
  };

  const calculatedRiskProfile = getRiskProfileFromScore(totalScore);

  // Auto-fill Suitability inputs
  useEffect(() => {
    if (!loading) {
      setSuitabilityCheck(prev => {
        let mappedRP = "";
        if (calculatedRiskProfile) {
          mappedRP = calculatedRiskProfile === "Moderately Conservative" ? "Mod. Conservative" : 
                     calculatedRiskProfile === "Moderately Aggressive" ? "Mod. Aggressive" : 
                     calculatedRiskProfile;
        }

        // Investor Category mapping based on Net Worth
        let autoCategory = "";
        if (clientDiscovery.netWorth) {
          if (["< ₹25 Lakhs", "₹25–50 Lakhs", "₹50L–1 Crore", "₹1–5 Crores"].includes(clientDiscovery.netWorth)) {
            autoCategory = "Retail (< ₹5Cr NW)";
          } else if (["₹5–10 Crores", "> ₹10 Crores"].includes(clientDiscovery.netWorth)) {
            autoCategory = "HNI (₹5Cr+ NW)";
          }
        }

        return {
          ...prev,
          riskProfile: mappedRP || prev.riskProfile,
          horizon: clientDiscovery.timeHorizon || prev.horizon,
          surplus: clientDiscovery.lumpSum || prev.surplus,
          taxPriority: clientDiscovery.taxSavingPriority || prev.taxPriority,
          investorCategory: autoCategory || prev.investorCategory,
        };
      });
    }
  }, [calculatedRiskProfile, clientDiscovery.timeHorizon, clientDiscovery.lumpSum, clientDiscovery.taxSavingPriority, clientDiscovery.netWorth, loading]);

  // Load persistence data
  useEffect(() => {
    const fetchDiscoveryData = async () => {
      try {
        const res = await apiFetch<any>("/api/needs-discovery");
        if (res) {
          if (res.client_discovery_json && Object.keys(res.client_discovery_json).length > 0) {
            setClientDiscovery(prev => ({ ...prev, ...res.client_discovery_json }));
          }
          if (res.risk_calculator_json && Object.keys(res.risk_calculator_json).length > 0) {
            setRiskCalculator(prev => ({ ...prev, ...res.risk_calculator_json }));
          }
          if (res.suitability_check_json && Object.keys(res.suitability_check_json).length > 0) {
            setSuitabilityCheck(prev => ({ ...prev, ...res.suitability_check_json }));
          }
          if (res.dashboard_json && Object.keys(res.dashboard_json).length > 0) {
            setDashboardNotes(prev => ({ ...prev, ...res.dashboard_json }));
          }
        }
      } catch (err) {
        console.error("Failed to fetch Needs Discovery data", err);
      } finally {
        setLoading(false);
        isLoaded.current = true;
      }
    };
    fetchDiscoveryData();
  }, []);

  // Save persistence data
  const handleSaveData = async (showToast = false) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    setSaveStatus("Saving...");
    try {
      await apiFetch("/api/needs-discovery", {
        method: "PUT",
        body: JSON.stringify({
          client_discovery_json: clientDiscovery,
          risk_calculator_json: riskCalculator,
          suitability_check_json: suitabilityCheck,
          dashboard_json: dashboardNotes
        })
      });
      setHasUnsavedChanges(false);
      setSaveStatus("Saved");
      if (showToast) {
        toast.success("Saved Successfully");
      }
    } catch (err) {
      console.error("Failed to save Needs Discovery data", err);
      setSaveStatus("Unsaved Changes");
      if (showToast) {
        toast.error("Failed to save discovery data.");
      }
    }
  };

  // Debounced Autosave functionality
  useEffect(() => {
    if (!isLoaded.current) return;
    setHasUnsavedChanges(true);
    setSaveStatus("Unsaved Changes");

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      handleSaveData(false);
    }, 1500);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [clientDiscovery, riskCalculator, suitabilityCheck, dashboardNotes]);

  // Reset form data
  const handleResetData = async () => {
    if (!confirm("Are you sure you want to clear all data? This cannot be undone.")) return;
    try {
      await apiFetch("/api/needs-discovery/reset", { method: "POST" });
      setClientDiscovery({
        clientName: "",
        advisorName: "",
        meetingDate: "",
        clientId: "",
        location: "",
        reviewType: "New Client",
        age: "",
        annualIncome: "",
        netWorth: "",
        occupation: "",
        education: "",
        maritalStatus: "",
        taxSlab: "",
        primaryGoal: "",
        timeHorizon: "",
        lumpSum: "",
        sipAmount: "",
        returnExpectation: "",
        requireIncome: "",
        existingInvestments: "",
        riskReaction: "",
        knowledgeLevel: "",
        marketExperience: "",
        savingsAtRisk: "",
        riskAttitude: "",
        outstandingLoans: "",
        emergencyFund: "",
        taxSavingPriority: "",
        taxAware: "",
        residencyStatus: "",
        fatcaReporting: "",
        awarePMS: "",
        awareAIF: "",
        awareSIF: "",
        lifeInsurance10x: "",
        interestedULIP: "",
        activePassivePref: "",
        specificFundHouse: "",
        intDiversification: "",
        growthIdcwPref: "",
        communicationPref: "",
        assessedRiskProfile: "",
        urgencyDecision: "",
        keyConcerns: "",
        productsDiscussed: "",
        nextStep: "",
      });
      setRiskCalculator({
        ageRange: "",
        horizon: "",
        income: "",
        netWorth: "",
        reaction: "",
        knowledge: "",
        experience: "",
        riskSavings: "",
        liquidity: "",
        loans: ""
      });
      setSuitabilityCheck({
        riskProfile: "",
        horizon: "",
        surplus: "",
        liquidityNeed: "",
        taxPriority: "",
        investorCategory: ""
      });
      setDashboardNotes({ notes: "" });
      setHasUnsavedChanges(false);
      setSaveStatus("Saved");
      toast.success("Form reset successfully.");
    } catch (err) {
      console.error("Failed to reset Needs Discovery data", err);
      toast.error("Failed to reset form data.");
    }
  };

  const updateDiscoveryField = (key: keyof typeof clientDiscovery, value: string) => {
    setClientDiscovery(prev => ({ ...prev, [key]: value }));
  };

  const updateRiskCalcField = (key: keyof typeof riskCalculator, value: string) => {
    setRiskCalculator(prev => ({ ...prev, [key]: value }));
  };

  const updateSuitabilityField = (key: keyof typeof suitabilityCheck, value: string) => {
    setSuitabilityCheck(prev => ({ ...prev, [key]: value }));
  };

  // Suitability check logic helper
  const getSuitabilityStatus = (dimension: string, product: string) => {
    return calculateSuitability(dimension, product, suitabilityCheck);
  };

  // Overall recommendation suitability metrics for Recharts
  const products = ["Mutual Funds", "Direct Equity", "Insurance", "PMS", "AIF", "SIF"];
  const dimensions = ["Risk Profile", "Horizon", "Surplus", "Liquidity Need"];
  
  const chartData = products.map(p => {
    let suitableCount = 0;
    let conditionalCount = 0;
    let unsuitableCount = 0;
    
    dimensions.forEach(d => {
      const status = getSuitabilityStatus(d, p);
      if (status === "✅") suitableCount++;
      else if (status === "⚠") conditionalCount++;
      else if (status === "❌") unsuitableCount++;
    });
    
    return {
      name: p,
      "Suitable": suitableCount,
      "Conditional": conditionalCount,
      "Unsuitable": unsuitableCount
    };
  });

  // PDF Export Engine (Strict replication of 10 sections over 5 pages)
  // TAB-SPECIFIC PDF GENERATORS
  const generateDashboardReport = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });
    const dateStr = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
    
    const drawHeader = (pageNum: number) => {
      doc.setFillColor(15, 118, 110); 
      doc.rect(0, 0, 210, 22, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("MASTERCLASS", 15, 10);
      doc.setFontSize(8.5);
      doc.text("CLIENT NEEDS DISCOVERY TOOL", 15, 17);
      doc.setFont("helvetica", "normal");
      doc.text("DASHBOARD REPORT", 90, 17);
      doc.text(`Date: ${dateStr}`, 145, 17);
      doc.text(`Page ${pageNum} of 1`, 185, 17);
    };

    drawHeader(1);
    
    let y = 32;
    // Executive Summary
    doc.setTextColor(15, 118, 110);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("EXECUTIVE SUMMARY", 15, y);
    doc.setDrawColor(229, 231, 235);
    doc.line(15, y + 2, 195, y + 2);
    
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(55, 65, 81);
    const summaryText = `This report presents a high-level summary of the client needs discovery process completed for ${clientDiscovery.clientName || "the client"}. By consolidating core demographics, financial parameters, calculated risk tolerance, and product suitability scores, this dashboard offers a comprehensive baseline for personalized portfolio construction and wealth advisory.`;
    const summaryLines = doc.splitTextToSize(summaryText, 180);
    doc.text(summaryLines, 15, y);
    y += (summaryLines.length * 4) + 4;

    // Client Info Card Grid
    doc.setFillColor(249, 250, 251);
    doc.rect(15, y, 180, 24, "F");
    doc.setDrawColor(229, 231, 235);
    doc.rect(15, y, 180, 24, "D");
    
    doc.setFontSize(7.5);
    doc.setTextColor(107, 114, 128);
    doc.text("CLIENT NAME", 18, y + 5);
    doc.text("RM / ADVISOR", 75, y + 5);
    doc.text("LOCATION", 135, y + 5);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(31, 41, 55);
    doc.text(safeText(clientDiscovery.clientName), 18, y + 9);
    doc.text(safeText(clientDiscovery.advisorName), 75, y + 9);
    doc.text(safeText(clientDiscovery.location), 135, y + 9);
    
    doc.setFontSize(7.5);
    doc.setTextColor(107, 114, 128);
    doc.setFont("helvetica", "normal");
    doc.text("ANNUAL INCOME", 18, y + 15);
    doc.text("NET WORTH", 75, y + 15);
    doc.text("TIME HORIZON", 135, y + 15);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(31, 41, 55);
    doc.text(safeText(clientDiscovery.annualIncome), 18, y + 19);
    doc.text(safeText(clientDiscovery.netWorth), 75, y + 19);
    doc.text(safeText(clientDiscovery.timeHorizon), 135, y + 19);
    
    y += 30;

    // KPI Summary boxes (4 column boxes)
    doc.setFillColor(243, 244, 246);
    doc.rect(15, y, 42, 16, "F");
    doc.rect(61, y, 42, 16, "F");
    doc.rect(107, y, 42, 16, "F");
    doc.rect(153, y, 42, 16, "F");
    
    doc.setFontSize(7);
    doc.setTextColor(107, 114, 128);
    doc.setFont("helvetica", "normal");
    doc.text("TOTAL RISK SCORE", 18, y + 5);
    doc.text("RISK CATEGORY", 64, y + 5);
    doc.text("SUITABILITY STATUS", 110, y + 5);
    doc.text("PROFILE COMPLETION", 156, y + 5);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 118, 110);
    doc.text(`${totalScore} / 50`, 18, y + 11);
    doc.text(calculatedRiskProfile || "Incomplete", 64, y + 11);
    doc.text(suitabilityCheck.riskProfile ? "Configured" : "Incomplete", 110, y + 11);
    
    // Calculate profile completion health percentage
    let completedCount = 0;
    const fieldsToTrack = Object.values(clientDiscovery);
    fieldsToTrack.forEach(f => { if (f && String(f).trim() !== "") completedCount++; });
    const completionPct = Math.round((completedCount / fieldsToTrack.length) * 100);
    doc.text(`${completionPct}%`, 156, y + 11);
    
    y += 24;

    // Charts Container
    doc.setTextColor(15, 118, 110);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("VISUAL METRICS & ANALYTICS", 15, y);
    doc.setDrawColor(229, 231, 235);
    doc.line(15, y + 2, 195, y + 2);
    
    y += 8;

    // DRAW RISK METER GAUGE (Segmented Progress Bar)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);
    doc.text("Client Risk Meter", 15, y);
    
    y += 3;
    doc.setFillColor(243, 244, 246);
    doc.rect(15, y, 180, 6, "F");
    doc.setFillColor(220, 252, 231); // green
    doc.rect(15, y, 58, 6, "F");
    doc.setFillColor(204, 251, 241); // teal
    doc.rect(73, y, 58, 6, "F");
    doc.setFillColor(254, 226, 226); // red
    doc.rect(131, y, 64, 6, "F");
    
    const pct = Math.min(Math.max(totalScore / 50, 0), 1);
    const pointerX = 15 + (pct * 180);
    doc.setFillColor(15, 118, 110);
    doc.rect(pointerX - 1.5, y - 1.5, 3, 9, "F");
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(107, 114, 128);
    doc.text("Conservative (0-16)", 15, y + 9);
    doc.text("Moderate (17-33)", 73, y + 9);
    doc.text("Aggressive (34-50)", 131, y + 9);
    doc.setFont("helvetica", "bold");
    doc.text(`Current: ${totalScore}`, pointerX, y - 3, { align: "center" });

    y += 18;

    // DRAW PRODUCT SUITABILITY STACKED BAR CHART
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);
    doc.text("Product Suitability Dimension Match count", 15, y);
    
    y += 4;
    // Axes
    doc.setDrawColor(156, 163, 175);
    doc.line(35, y, 35, y + 36); // Y-axis
    doc.line(35, y + 36, 195, y + 36); // X-axis
    
    const chartProducts = ["MF", "Equity", "Insurance", "PMS", "AIF", "SIF"];
    const barWidth = 12;
    const barSpacing = 13;
    
    chartProducts.forEach((prod, idx) => {
      const xBar = 42 + (idx * (barWidth + barSpacing));
      
      let suitable = 0;
      let conditional = 0;
      let unsuitable = 0;
      
      const dims = ["Risk Profile", "Horizon", "Surplus", "Liquidity Need"];
      dims.forEach(dim => {
        const status = getSuitabilityStatus(dim, prod);
        if (status === "✅") suitable++;
        else if (status === "⚠") conditional++;
        else if (status === "❌") unsuitable++;
      });
      
      let currentY = y + 36;
      const scale = 7.5; // height per count unit
      
      if (suitable > 0) {
        doc.setFillColor(13, 148, 136); // Teal
        const h = suitable * scale;
        doc.rect(xBar, currentY - h, barWidth, h, "F");
        currentY -= h;
      }
      if (conditional > 0) {
        doc.setFillColor(234, 88, 12); // Orange
        const h = conditional * scale;
        doc.rect(xBar, currentY - h, barWidth, h, "F");
        currentY -= h;
      }
      if (unsuitable > 0) {
        doc.setFillColor(220, 38, 38); // Red
        const h = unsuitable * scale;
        doc.rect(xBar, currentY - h, barWidth, h, "F");
        currentY -= h;
      }
      
      // X-Axis Label
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(75, 85, 99);
      doc.text(prod, xBar + (barWidth / 2), y + 40, { align: "center" });
    });
    
    // Y-Axis tick labels
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(107, 114, 128);
    for (let i = 0; i <= 4; i++) {
      const yTick = y + 36 - (i * 7.5);
      doc.text(String(i), 31, yTick + 1, { align: "right" });
      doc.line(33, yTick, 35, yTick);
    }
    
    y += 46;

    // Legend
    doc.setFontSize(7);
    doc.setTextColor(107, 114, 128);
    doc.text("Legend:  [ Teal ] Suitable   /   [ Orange ] Conditional   /   [ Red ] Unsuitable", 15, y);

    y += 8;

    // Advisor Notes
    if (dashboardNotes.notes) {
      doc.setTextColor(15, 118, 110);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("ADVISOR WORKSPACE NOTES", 15, y);
      doc.setDrawColor(229, 231, 235);
      doc.line(15, y + 2, 195, y + 2);
      
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(55, 65, 81);
      const notesLines = doc.splitTextToSize(dashboardNotes.notes, 180);
      doc.text(notesLines, 15, y);
    }

    doc.save(`Needs_Discovery_Dashboard_Report.pdf`);
  };

  const generateClientDiscoveryReport = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });
    const dateStr = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
    
    const drawHeader = (pageNum: number) => {
      doc.setFillColor(15, 118, 110); 
      doc.rect(0, 0, 210, 22, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("MASTERCLASS", 15, 10);
      doc.setFontSize(8.5);
      doc.text("CLIENT NEEDS DISCOVERY TOOL", 15, 17);
      doc.setFont("helvetica", "normal");
      doc.text("CLIENT DISCOVERY REPORT", 90, 17);
      doc.text(`Date: ${dateStr}`, 145, 17);
      doc.text(`Page ${pageNum} of 2`, 185, 17);
    };

    const drawField = (label: string, value: string, xPos: number, yPos: number) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(107, 114, 128);
      doc.text(label.toUpperCase(), xPos, yPos);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(31, 41, 55);
      doc.text(safeText(value), xPos, yPos + 4.5);
    };

    const drawSectionHeader = (title: string, yPos: number) => {
      doc.setTextColor(15, 118, 110);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(title.toUpperCase(), 15, yPos);
      doc.setDrawColor(229, 231, 235);
      doc.line(15, yPos + 2, 195, yPos + 2);
    };

    // PAGE 1
    drawHeader(1);
    
    drawSectionHeader("1. Identification & Meeting Details", 34);
    let y = 43;
    drawField("Client Name", clientDiscovery.clientName, 15, y);
    drawField("RM / Advisor Name", clientDiscovery.advisorName, 75, y);
    drawField("Meeting Date", clientDiscovery.meetingDate, 135, y);
    
    y += 13;
    drawField("Client ID / Code", clientDiscovery.clientId, 15, y);
    drawField("Branch / Location", clientDiscovery.location, 75, y);
    drawField("Review Type", clientDiscovery.reviewType, 135, y);

    drawSectionHeader("2. Personal & Family Profile", y + 15);
    y += 24;
    drawField("Age Range", clientDiscovery.age, 15, y);
    drawField("Primary Occupation", clientDiscovery.occupation, 75, y);
    drawField("Highest Educational Qualification", clientDiscovery.education, 135, y);
    
    y += 13;
    drawField("Marital Status & Family", clientDiscovery.maritalStatus, 15, y);
    drawField("Residency Status", clientDiscovery.residencyStatus, 75, y);
    drawField("FATCA / CRS Reporting Obligations?", clientDiscovery.fatcaReporting, 135, y);

    drawSectionHeader("3. Income, Wealth & Taxes", y + 15);
    y += 24;
    drawField("Annual Income", clientDiscovery.annualIncome, 15, y);
    drawField("Current Net Worth", clientDiscovery.netWorth, 75, y);
    drawField("Income Tax Slab / Bracket", clientDiscovery.taxSlab, 135, y);

    drawSectionHeader("4. Goals & Investment Parameters", y + 15);
    y += 24;
    drawField("Primary Financial Goal", clientDiscovery.primaryGoal, 15, y);
    drawField("Investment Time Horizon", clientDiscovery.timeHorizon, 75, y);
    drawField("Return Expectation", clientDiscovery.returnExpectation, 135, y);
    
    y += 13;
    drawField("Lump Sum Available", clientDiscovery.lumpSum, 15, y);
    drawField("SIP / Monthly Investment", clientDiscovery.sipAmount, 75, y);
    drawField("Requires Regular Income?", clientDiscovery.requireIncome, 135, y);

    // PAGE 2
    doc.addPage();
    drawHeader(2);
    
    drawSectionHeader("5. Risk Attitude & Profiling Responses", 34);
    y = 43;
    drawField("Reaction to 20% drop", clientDiscovery.riskReaction, 15, y);
    drawField("Investment Knowledge Level", clientDiscovery.knowledgeLevel, 105, y);
    
    y += 13;
    drawField("Prior Capital Market Experience", clientDiscovery.marketExperience, 15, y);
    drawField("% Savings willing to Risk", clientDiscovery.savingsAtRisk, 105, y);
    
    y += 13;
    drawField("Attitude Towards Investment Risk", clientDiscovery.riskAttitude, 15, y);
    drawField("Outstanding Loans / Liabilities", clientDiscovery.outstandingLoans, 105, y);
    
    y += 13;
    drawField("Emergency Fund Cushion Status", clientDiscovery.emergencyFund, 15, y);

    drawSectionHeader("6. Existing Portfolios & Preferences", y + 15);
    y += 24;
    drawField("Existing Investments Portfolio Description", clientDiscovery.existingInvestments, 15, y);
    
    y += 13;
    drawField("Tax Saving & Planning Priority", clientDiscovery.taxSavingPriority, 15, y);
    drawField("Aware of Capital Gain Taxes?", clientDiscovery.taxAware, 105, y);
    
    y += 13;
    drawField("Aware of PMS?", clientDiscovery.awarePMS, 15, y);
    drawField("Aware of AIF?", clientDiscovery.awareAIF, 75, y);
    drawField("Aware of SIF?", clientDiscovery.awareSIF, 135, y);
    
    y += 13;
    drawField("Life Insurance Coverage Status", clientDiscovery.lifeInsurance10x, 15, y);
    drawField("Interested in ULIP Products?", clientDiscovery.interestedULIP, 75, y);
    drawField("Active vs Passive Preference", clientDiscovery.activePassivePref, 135, y);
    
    y += 13;
    drawField("Specific Fund House preference", clientDiscovery.specificFundHouse, 15, y);
    drawField("Interest in International Diversification", clientDiscovery.intDiversification, 75, y);
    drawField("Growth vs Dividend (IDCW)", clientDiscovery.growthIdcwPref, 135, y);

    drawSectionHeader("7. Concluding Notes & Advisor Observations", y + 15);
    y += 24;
    drawField("Assessed Risk Profile by RM", clientDiscovery.assessedRiskProfile, 15, y);
    drawField("Urgency of Investment Decision", clientDiscovery.urgencyDecision, 75, y);
    drawField("Proposed Next Step", clientDiscovery.nextStep, 135, y);
    
    y += 13;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);
    doc.text("KEY CLIENT CONCERNS:", 15, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(31, 41, 55);
    let lines = doc.splitTextToSize(safeText(clientDiscovery.keyConcerns), 180);
    doc.text(lines, 15, y + 4);
    
    y += 8 + (lines.length * 4);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);
    doc.text("PRODUCTS DISCUSSED IN MEETING:", 15, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(31, 41, 55);
    lines = doc.splitTextToSize(safeText(clientDiscovery.productsDiscussed), 180);
    doc.text(lines, 15, y + 4);

    // Signatures
    y += 22 + (lines.length * 4);
    doc.setDrawColor(156, 163, 175);
    doc.line(15, y, 75, y);
    doc.line(135, y, 195, y);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);
    doc.text("Client Signature", 15, y + 4);
    doc.text("RM / Advisor Signature", 135, y + 4);

    doc.save(`Client_Discovery_Report.pdf`);
  };

  const generateRiskAssessmentReport = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });
    const dateStr = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
    
    const drawHeader = (pageNum: number) => {
      doc.setFillColor(15, 118, 110); 
      doc.rect(0, 0, 210, 22, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("MASTERCLASS", 15, 10);
      doc.setFontSize(8.5);
      doc.text("CLIENT NEEDS DISCOVERY TOOL", 15, 17);
      doc.setFont("helvetica", "normal");
      doc.text("RISK ASSESSMENT REPORT", 90, 17);
      doc.text(`Date: ${dateStr}`, 145, 17);
      doc.text(`Page ${pageNum} of 1`, 185, 17);
    };

    drawHeader(1);
    
    let y = 32;
    doc.setTextColor(15, 118, 110);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("1. RISK PROFILING RESPONSES", 15, y);
    doc.setDrawColor(229, 231, 235);
    doc.line(15, y + 2, 195, y + 2);
    
    y += 8;
    // Table Header
    doc.setFillColor(243, 244, 246);
    doc.rect(15, y, 180, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);
    doc.text("Risk Parameter", 18, y + 5);
    doc.text("Selected Response", 90, y + 5);
    doc.text("Score", 180, y + 5, { align: "right" });

    // Table rows
    const scoreRows = [
      { param: "Age Range", resp: riskCalculator.ageRange, score: mapAgeScore(riskCalculator.ageRange) },
      { param: "Investment Horizon", resp: riskCalculator.horizon, score: mapHorizonScore(riskCalculator.horizon) },
      { param: "Annual Income", resp: riskCalculator.income, score: mapIncomeScore(riskCalculator.income) },
      { param: "Net Worth", resp: riskCalculator.netWorth, score: mapNetWorthScore(riskCalculator.netWorth) },
      { param: "Reaction to 20% fall", resp: riskCalculator.reaction, score: mapReactionScore(riskCalculator.reaction) },
      { param: "Knowledge Level", resp: riskCalculator.knowledge, score: mapKnowledgeScore(riskCalculator.knowledge) },
      { param: "Market Experience", resp: riskCalculator.experience, score: mapExperienceScore(riskCalculator.experience) },
      { param: "Savings willing to risk", resp: riskCalculator.riskSavings, score: mapRiskSavingsScore(riskCalculator.riskSavings) },
      { param: "Liquidity Requirement", resp: riskCalculator.liquidity, score: mapLiquidityScore(riskCalculator.liquidity) },
      { param: "Loans / Liabilities", resp: riskCalculator.loans, score: mapLoansScore(riskCalculator.loans) },
    ];

    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(31, 41, 55);
    
    scoreRows.forEach(row => {
      doc.line(15, y, 195, y);
      doc.setFont("helvetica", "normal");
      doc.text(row.param, 18, y + 4.5);
      doc.text(safeText(row.resp), 90, y + 4.5);
      doc.setFont("helvetica", "bold");
      doc.text(row.resp ? String(row.score.toFixed(1)) : "—", 180, y + 4.5, { align: "right" });
      y += 6.5;
    });
    doc.line(15, y, 195, y);

    // Totals Box
    y += 4;
    doc.setFillColor(240, 253, 250);
    doc.rect(15, y, 180, 14, "F");
    doc.setDrawColor(13, 148, 136);
    doc.rect(15, y, 180, 14, "D");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 118, 110);
    doc.text(`TOTAL RISK SCORE: ${totalScore} / 50`, 20, y + 9);
    doc.text(`RISK CATEGORY: ${calculatedRiskProfile || "Incomplete"}`, 110, y + 9);

    y += 20;

    // Risk Meter Visualization
    doc.setTextColor(15, 118, 110);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("2. RISK PROFILE METER GRAPH", 15, y);
    doc.setDrawColor(229, 231, 235);
    doc.line(15, y + 2, 195, y + 2);

    y += 8;
    doc.setFillColor(243, 244, 246);
    doc.rect(15, y, 180, 6, "F");
    doc.setFillColor(220, 252, 231); // green
    doc.rect(15, y, 58, 6, "F");
    doc.setFillColor(204, 251, 241); // teal
    doc.rect(73, y, 58, 6, "F");
    doc.setFillColor(254, 226, 226); // red
    doc.rect(131, y, 64, 6, "F");
    
    const pct = Math.min(Math.max(totalScore / 50, 0), 1);
    const pointerX = 15 + (pct * 180);
    doc.setFillColor(15, 118, 110);
    doc.rect(pointerX - 1.5, y - 1.5, 3, 9, "F");
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(107, 114, 128);
    doc.text("Conservative (0-16)", 15, y + 9);
    doc.text("Moderate (17-33)", 73, y + 9);
    doc.text("Aggressive (34-50)", 131, y + 9);
    doc.setFont("helvetica", "bold");
    doc.text(`Score: ${totalScore}`, pointerX, y - 3, { align: "center" });

    y += 18;

    // Recommended Asset Allocation
    doc.setTextColor(15, 118, 110);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("3. RECOMMENDED ASSET ALLOCATION", 15, y);
    doc.setDrawColor(229, 231, 235);
    doc.line(15, y + 2, 195, y + 2);

    y += 8;
    // Allocation suggestions based on risk profile
    let allocation = { equity: "—", debt: "—", gold: "—", liquid: "—" };
    if (calculatedRiskProfile === "Conservative") {
      allocation = { equity: "15%", debt: "65%", gold: "10%", liquid: "10%" };
    } else if (calculatedRiskProfile === "Mod. Conservative") {
      allocation = { equity: "30%", debt: "50%", gold: "10%", liquid: "10%" };
    } else if (calculatedRiskProfile === "Moderate") {
      allocation = { equity: "45%", debt: "35%", gold: "10%", liquid: "10%" };
    } else if (calculatedRiskProfile === "Mod. Aggressive") {
      allocation = { equity: "60%", debt: "25%", gold: "10%", liquid: "5%" };
    } else if (calculatedRiskProfile === "Aggressive") {
      allocation = { equity: "75%", debt: "15%", gold: "5%", liquid: "5%" };
    } else if (calculatedRiskProfile === "Very Aggressive") {
      allocation = { equity: "90%", debt: "5%", gold: "5%", liquid: "0%" };
    }

    doc.setFillColor(249, 250, 251);
    doc.rect(15, y, 180, 20, "F");
    doc.setDrawColor(229, 231, 235);
    doc.rect(15, y, 180, 20, "D");

    doc.setFontSize(7.5);
    doc.setTextColor(107, 114, 128);
    doc.setFont("helvetica", "normal");
    doc.text("EQUITY SPLIT", 25, y + 6);
    doc.text("DEBT / FIX INCOME", 70, y + 6);
    doc.text("GOLD & HEDGE", 115, y + 6);
    doc.text("LIQUIDS / CASH", 160, y + 6);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 118, 110);
    doc.text(allocation.equity, 25, y + 13);
    doc.text(allocation.debt, 70, y + 13);
    doc.text(allocation.gold, 115, y + 13);
    doc.text(allocation.liquid, 160, y + 13);

    y += 28;

    // Advisor Recommendation Box
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);
    doc.text("ADVISOR RISK ASSESSMENT NOTES:", 15, y);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(55, 65, 81);
    const riskNotesText = `Based on the risk score of ${totalScore} out of 50, the client falls into the '${calculatedRiskProfile || "Pending"}' category. This matches a standard behavioral profile for this score. Recommend constructing a portfolio that aligns closely with the suggested ${allocation.equity} Equity and ${allocation.debt} Debt allocation, factoring in emergency liquidity needs before deploying capital.`;
    const riskNotesLines = doc.splitTextToSize(riskNotesText, 180);
    doc.text(riskNotesLines, 15, y + 5);

    doc.save(`Risk_Profile_Assessment_Report.pdf`);
  };

  const generateSuitabilityReport = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });
    const dateStr = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
    
    const drawHeader = (pageNum: number) => {
      doc.setFillColor(15, 118, 110); 
      doc.rect(0, 0, 210, 22, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("MASTERCLASS", 15, 10);
      doc.setFontSize(8.5);
      doc.text("CLIENT NEEDS DISCOVERY TOOL", 15, 17);
      doc.setFont("helvetica", "normal");
      doc.text("INVESTMENT SUITABILITY REPORT", 90, 17);
      doc.text(`Date: ${dateStr}`, 145, 17);
      doc.text(`Page ${pageNum} of 1`, 185, 17);
    };

    drawHeader(1);
    
    let y = 32;
    doc.setTextColor(15, 118, 110);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("1. SUITABILITY PROFILING INPUTS", 15, y);
    doc.setDrawColor(229, 231, 235);
    doc.line(15, y + 2, 195, y + 2);

    y += 8;
    doc.setFillColor(249, 250, 251);
    doc.rect(15, y, 180, 18, "F");
    doc.setDrawColor(229, 231, 235);
    doc.rect(15, y, 180, 18, "D");
    
    doc.setFontSize(7.5);
    doc.setTextColor(107, 114, 128);
    doc.text("ASSESSED RISK", 18, y + 5);
    doc.text("HORIZON", 60, y + 5);
    doc.text("INVESTMENT SURPLUS", 105, y + 5);
    doc.text("LIQUIDITY NEED", 150, y + 5);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(31, 41, 55);
    doc.text(safeText(suitabilityCheck.riskProfile), 18, y + 11);
    doc.text(safeText(suitabilityCheck.horizon), 60, y + 11);
    doc.text(safeText(suitabilityCheck.surplus), 105, y + 11);
    doc.text(safeText(suitabilityCheck.liquidityNeed), 150, y + 11);

    y += 26;

    doc.setTextColor(15, 118, 110);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("2. PRODUCT SUITABILITY MATRIX", 15, y);
    doc.setDrawColor(229, 231, 235);
    doc.line(15, y + 2, 195, y + 2);

    y += 8;
    // Suitability Matrix Table
    doc.setFillColor(243, 244, 246);
    doc.rect(15, y, 180, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);
    doc.text("Suitability Dimension", 18, y + 5.5);
    
    const headers = ["MF", "Equity", "Insurance", "PMS", "AIF", "SIF"];
    headers.forEach((h, idx) => {
      doc.text(h, 95 + (idx * 17), y + 5.5, { align: "center" });
    });

    const suitabilityRows = ["Risk Profile", "Horizon", "Surplus", "Liquidity Need"];
    y += 8;

    suitabilityRows.forEach(dim => {
      doc.line(15, y, 195, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(31, 41, 55);
      doc.text(dim, 18, y + 5.5);
      
      products.forEach((prod, pIdx) => {
        const val = getSuitabilityStatus(dim, prod);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        
        let color = [107, 114, 128]; // gray
        if (val === "✅") color = [22, 101, 52]; // green
        else if (val === "⚠") color = [217, 119, 6]; // orange
        else if (val === "❌") color = [220, 38, 38]; // red
        
        doc.setTextColor(color[0], color[1], color[2]);
        doc.text(val, 95 + (pIdx * 17), y + 5.5, { align: "center" });
      });
      
      y += 8.5;
    });
    doc.line(15, y, 195, y);

    // Legend
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(107, 114, 128);
    doc.text("Legend:  ✅ Suitable   /   ⚠ Conditionally Suitable   /   ❌ Not Suitable   /   — Input Missing", 18, y);

    y += 12;

    doc.setTextColor(15, 118, 110);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("3. ADVISOR SUITABILITY REASONING", 15, y);
    doc.setDrawColor(229, 231, 235);
    doc.line(15, y + 2, 195, y + 2);

    y += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);
    doc.text("CRITICAL CONSTRAINTS & THRESHOLDS DETECTED:", 15, y);
    
    // Reasoning text construction based on surplus thresholds
    let surplusValue = 0;
    if (suitabilityCheck.surplus) {
      if (suitabilityCheck.surplus.includes("50L–1 Crore") || suitabilityCheck.surplus.includes("1–5 Crores") || suitabilityCheck.surplus.includes("> 5 Crores")) surplusValue = 5000000;
      if (suitabilityCheck.surplus.includes("1–5 Crores") || suitabilityCheck.surplus.includes("> 5 Crores")) surplusValue = 10000000;
    }
    
    let reasonText = "The suitability analysis checks 4 core dimensions (Risk Profile, Horizon, Investable Surplus, and Liquidity Needs) against standard regulatory definitions.";
    if (surplusValue < 5000000) {
      reasonText += " Note that PMS requires a minimum regulatory ticket of ₹50 Lakhs, and AIF requires a minimum of ₹1 Crore. Because the client's current surplus is below these thresholds, these high-ticket alternate products are marked as Unsuitable (❌).";
    } else if (surplusValue < 10000000) {
      reasonText += " The client's surplus meets the PMS threshold of ₹50 Lakhs but is below the AIF minimum ticket of ₹1 Crore. Therefore, PMS is potentially suitable, while AIF is unsuitable.";
    } else {
      reasonText += " The client's surplus meets both the PMS (₹50 Lakhs) and AIF (₹1 Crore) minimum regulatory thresholds, making these products suitable from a capital capacity perspective.";
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(55, 65, 81);
    const reasonLines = doc.splitTextToSize(reasonText, 180);
    doc.text(reasonLines, 15, y + 5);

    doc.save(`Investment_Suitability_Report.pdf`);
  };

  const generateMasterReport = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });
    const dateStr = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });

    const drawHeader = (pageNum: number, sectionTitle: string) => {
      // Elegant Corporate Teal Theme
      doc.setFillColor(15, 118, 110); 
      doc.rect(0, 0, 210, 22, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("MASTERCLASS", 15, 10);
      
      doc.setFontSize(8.5);
      doc.text("CLIENT NEEDS DISCOVERY TOOL", 15, 17);
      
      doc.setFont("helvetica", "normal");
      doc.text(sectionTitle.toUpperCase(), 90, 17);
      doc.text(`Date: ${dateStr}`, 145, 17);
      doc.text(`Page ${pageNum} of 5`, 185, 17);
    };

    const drawField = (label: string, value: string, xPos: number, yPos: number) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(107, 114, 128);
      doc.text(label.toUpperCase(), xPos, yPos);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(31, 41, 55);
      doc.text(safeText(value), xPos, yPos + 4.5);
    };

    const drawSectionHeader = (title: string, yPos: number) => {
      doc.setTextColor(15, 118, 110);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.text(title.toUpperCase(), 15, yPos);
      doc.setDrawColor(229, 231, 235);
      doc.line(15, yPos + 2, 195, yPos + 2);
    };

    // ----------------------------------------------------
    // PAGE 1: CLIENT IDENTIFICATION & DEMOGRAPHICS & GOALS
    // ----------------------------------------------------
    drawHeader(1, "Client Profile & Financial Goals");
    
    // SECTION 1: Client Identification
    drawSectionHeader("1. Client Identification", 34);
    let y = 43;
    drawField("Client Name", clientDiscovery.clientName, 15, y);
    drawField("RM / Advisor", clientDiscovery.advisorName, 75, y);
    drawField("Meeting Date", clientDiscovery.meetingDate, 135, y);
    
    y += 13;
    drawField("Client ID / Code", clientDiscovery.clientId, 15, y);
    drawField("Branch / Location", clientDiscovery.location, 75, y);
    drawField("Review Type", clientDiscovery.reviewType, 135, y);

    // SECTION 2: Demographic Profile
    drawSectionHeader("2. Demographic Profile", y + 15);
    y += 24;
    drawField("Age", clientDiscovery.age, 15, y);
    drawField("Primary Occupation", clientDiscovery.occupation, 75, y);
    drawField("Education Qualification", clientDiscovery.education, 135, y);
    
    y += 13;
    drawField("Marital Status & Family", clientDiscovery.maritalStatus, 15, y);
    drawField("Income Tax Slab", clientDiscovery.taxSlab, 75, y);

    // SECTION 3: Financial Demographics
    drawSectionHeader("3. Financial Demographics", y + 15);
    y += 24;
    drawField("Annual Income (Approx)", clientDiscovery.annualIncome, 15, y);
    drawField("Current Net Worth (Approx)", clientDiscovery.netWorth, 75, y);

    // SECTION 4: Goals & Investment Parameters
    drawSectionHeader("4. Goals & Investment Parameters", y + 15);
    y += 24;
    drawField("Primary Financial Goal", clientDiscovery.primaryGoal, 15, y);
    drawField("Time Horizon", clientDiscovery.timeHorizon, 75, y);
    drawField("Return Expectation", clientDiscovery.returnExpectation, 135, y);

    y += 13;
    drawField("Lump Sum Available", clientDiscovery.lumpSum, 15, y);
    drawField("SIP / Monthly Investment", clientDiscovery.sipAmount, 75, y);
    drawField("Requires Regular Income?", clientDiscovery.requireIncome, 135, y);

    y += 13;
    drawField("Existing Investments", clientDiscovery.existingInvestments, 15, y);

    // ----------------------------------------------------
    // PAGE 2: RISK PROFILING & RISK SCORE CALCULATOR
    // ----------------------------------------------------
    doc.addPage();
    drawHeader(2, "Risk Profile & Calculator");

    // SECTION 5: Risk Profiling Answers
    drawSectionHeader("5. Risk Profiling Responses", 34);
    y = 43;
    drawField("Reaction to 20% fall", clientDiscovery.riskReaction, 15, y);
    drawField("Investment Knowledge", clientDiscovery.knowledgeLevel, 115, y);
    
    y += 13;
    drawField("Capital Market Experience", clientDiscovery.marketExperience, 15, y);
    drawField("% Savings willing to Risk", clientDiscovery.savingsAtRisk, 115, y);
    
    y += 13;
    drawField("Attitude Towards Risk", clientDiscovery.riskAttitude, 15, y);
    drawField("Outstanding Loans", clientDiscovery.outstandingLoans, 115, y);

    y += 13;
    drawField("Emergency Fund Status", clientDiscovery.emergencyFund, 15, y);

    // SECTION 6: Risk Score Calculator Summary
    drawSectionHeader("6. Risk Score Calculation Summary", y + 15);
    y += 24;

    // Table Header
    doc.setFillColor(243, 244, 246);
    doc.rect(15, y, 180, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);
    doc.text("Risk Parameter", 18, y + 5);
    doc.text("Selected Response", 90, y + 5);
    doc.text("Score", 180, y + 5, { align: "right" });

    // Table rows
    const scoreRows = [
      { param: "Age Range", resp: riskCalculator.ageRange, score: mapAgeScore(riskCalculator.ageRange) },
      { param: "Investment Horizon", resp: riskCalculator.horizon, score: mapHorizonScore(riskCalculator.horizon) },
      { param: "Annual Income", resp: riskCalculator.income, score: mapIncomeScore(riskCalculator.income) },
      { param: "Net Worth", resp: riskCalculator.netWorth, score: mapNetWorthScore(riskCalculator.netWorth) },
      { param: "Reaction to 20% fall", resp: riskCalculator.reaction, score: mapReactionScore(riskCalculator.reaction) },
      { param: "Knowledge Level", resp: riskCalculator.knowledge, score: mapKnowledgeScore(riskCalculator.knowledge) },
      { param: "Market Experience", resp: riskCalculator.experience, score: mapExperienceScore(riskCalculator.experience) },
      { param: "Savings willing to risk", resp: riskCalculator.riskSavings, score: mapRiskSavingsScore(riskCalculator.riskSavings) },
      { param: "Liquidity Requirement", resp: riskCalculator.liquidity, score: mapLiquidityScore(riskCalculator.liquidity) },
      { param: "Loans / Liabilities", resp: riskCalculator.loans, score: mapLoansScore(riskCalculator.loans) },
    ];

    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(31, 41, 55);
    
    scoreRows.forEach(row => {
      doc.line(15, y, 195, y);
      doc.setFont("helvetica", "normal");
      doc.text(row.param, 18, y + 4.5);
      doc.text(safeText(row.resp), 90, y + 4.5);
      doc.setFont("helvetica", "bold");
      doc.text(row.resp ? String(row.score.toFixed(1)) : "—", 180, y + 4.5, { align: "right" });
      y += 6.5;
    });
    doc.line(15, y, 195, y);

    // Totals Box
    y += 4;
    doc.setFillColor(240, 253, 250);
    doc.rect(15, y, 180, 15, "F");
    doc.setDrawColor(13, 148, 136);
    doc.rect(15, y, 180, 15, "D");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 118, 110);
    doc.text(`TOTAL RISK SCORE: ${totalScore} / 50`, 20, y + 9.5);
    doc.text(`AUTO-CALCULATED PROFILE: ${calculatedRiskProfile || "Pending"}`, 105, y + 9.5);

    // ----------------------------------------------------
    // PAGE 3: TAX PLANNING & PRODUCT PREFERENCES
    // ----------------------------------------------------
    doc.addPage();
    drawHeader(3, "Tax & Product Preference Screening");

    // SECTION 7: Tax & Regulatory Planning
    drawSectionHeader("7. Tax & Regulatory Planning", 34);
    y = 43;
    drawField("Tax Saving Priority", clientDiscovery.taxSavingPriority, 15, y);
    drawField("LTCG / STCG Aware?", clientDiscovery.taxAware, 75, y);
    drawField("Residency Status", clientDiscovery.residencyStatus, 135, y);
    
    y += 13;
    drawField("FATCA / CRS Obligations", clientDiscovery.fatcaReporting, 15, y);

    // SECTION 8: Product Screening & Preferences
    drawSectionHeader("8. Product Preferences & Screening", y + 15);
    y += 24;
    drawField("PMS Aware (min 50L)?", clientDiscovery.awarePMS, 15, y);
    drawField("AIF Aware (min 1Cr)?", clientDiscovery.awareAIF, 75, y);
    drawField("SIF Aware (min 10L)?", clientDiscovery.awareSIF, 135, y);
    
    y += 13;
    drawField("Life Cover >= 10x Income?", clientDiscovery.lifeInsurance10x, 15, y);
    drawField("ULIP Interest?", clientDiscovery.interestedULIP, 75, y);
    drawField("Actively vs Passively managed?", clientDiscovery.activePassivePref, 135, y);
    
    y += 13;
    drawField("International diversification?", clientDiscovery.intDiversification, 15, y);
    drawField("Growth vs Dividend (IDCW)?", clientDiscovery.growthIdcwPref, 75, y);
    drawField("Mode of Communication", clientDiscovery.communicationPref, 135, y);
    
    y += 13;
    drawField("Specific Fund House Preference", clientDiscovery.specificFundHouse, 15, y);

    // ----------------------------------------------------
    // PAGE 4: PRODUCT SUITABILITY MATRIX
    // ----------------------------------------------------
    doc.addPage();
    drawHeader(4, "Product Suitability Matrix");

    // SECTION 9: Suitability Matrix
    drawSectionHeader("9. Product Suitability Matrix Table", 34);
    y = 45;

    // Inputs Summary
    doc.setFillColor(249, 250, 251);
    doc.rect(15, y, 180, 18, "F");
    doc.setFontSize(7.5);
    doc.setTextColor(107, 114, 128);
    doc.text("CALCULATION INPUTS:", 18, y + 5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(31, 41, 55);
    doc.text(`Risk: ${suitabilityCheck.riskProfile || "—"}`, 18, y + 11);
    doc.text(`Horizon: ${suitabilityCheck.horizon || "—"}`, 60, y + 11);
    doc.text(`Surplus: ${suitabilityCheck.surplus || "—"}`, 105, y + 11);
    doc.text(`Liquidity Need: ${suitabilityCheck.liquidityNeed || "—"}`, 150, y + 11);

    y += 24;

    // Suitability Matrix Table
    doc.setFillColor(243, 244, 246);
    doc.rect(15, y, 180, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);
    doc.text("Suitability Dimension", 18, y + 5.5);
    
    const headers = ["MF", "Equity", "Insurance", "PMS", "AIF", "SIF"];
    headers.forEach((h, idx) => {
      doc.text(h, 95 + (idx * 17), y + 5.5, { align: "center" });
    });

    const suitabilityRows = ["Risk Profile", "Horizon", "Surplus", "Liquidity Need"];
    y += 8;

    suitabilityRows.forEach(dim => {
      doc.line(15, y, 195, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(31, 41, 55);
      doc.text(dim, 18, y + 5.5);
      
      products.forEach((prod, pIdx) => {
        const val = getSuitabilityStatus(dim, prod);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        
        let color = [107, 114, 128]; // gray
        if (val === "✅") color = [22, 101, 52]; // green
        else if (val === "⚠") color = [217, 119, 6]; // orange
        else if (val === "❌") color = [220, 38, 38]; // red
        
        doc.setTextColor(color[0], color[1], color[2]);
        doc.text(val, 95 + (pIdx * 17), y + 5.5, { align: "center" });
      });
      
      y += 8.5;
    });
    doc.line(15, y, 195, y);

    // Legend
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(107, 114, 128);
    doc.text("Legend:  ✅ Suitable   /   ⚠ Conditionally Suitable   /   ❌ Not Suitable   /   — Input Missing", 18, y);

    // ----------------------------------------------------
    // PAGE 5: ADVISOR ASSESSMENT & SIGNATURES
    // ----------------------------------------------------
    doc.addPage();
    drawHeader(5, "Advisor Assessment & Next Steps");

    // SECTION 10: Advisor Assessment
    drawSectionHeader("10. Advisor Assessed Next Steps", 34);
    y = 43;
    drawField("Assessed Risk Profile by RM", clientDiscovery.assessedRiskProfile, 15, y);
    drawField("Urgency of Investment Decision", clientDiscovery.urgencyDecision, 85, y);
    drawField("Proposed Next Step", clientDiscovery.nextStep, 145, y);

    y += 15;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);
    doc.text("KEY CLIENT CONCERNS (NOTES):", 15, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(31, 41, 55);
    let lines = doc.splitTextToSize(safeText(clientDiscovery.keyConcerns), 180);
    doc.text(lines, 15, y + 4.5);
    
    y += 10 + (lines.length * 4.5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);
    doc.text("PRODUCTS DISCUSSED IN MEETING:", 15, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(31, 41, 55);
    lines = doc.splitTextToSize(safeText(clientDiscovery.productsDiscussed), 180);
    doc.text(lines, 15, y + 4.5);

    // Signatures
    y += 45;
    doc.setDrawColor(156, 163, 175);
    doc.line(15, y, 75, y);
    doc.line(135, y, 195, y);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);
    doc.text("Client Signature", 15, y + 4);
    doc.text("RM / Advisor Signature", 135, y + 4);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("For authorized RM / advisor use only. Handle per SEBI / IRDAI data protection norms.", 15, y + 15);

    doc.save(`Needs_Discovery_Master_Report.pdf`);
  };

  const handleExportPDF = () => {
    if (activeTab === "Dashboard") {
      generateDashboardReport();
    } else if (activeTab === "Client Discovery") {
      generateClientDiscoveryReport();
    } else if (activeTab === "Risk Score Calculator") {
      generateRiskAssessmentReport();
    } else if (activeTab === "Suitability Check") {
      generateSuitabilityReport();
    } else if (activeTab === "Summary Report") {
      generateMasterReport();
    }
  };;

  return (
    <div className="space-y-6">
      {/* Page Title & Status Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <button 
            onClick={onBack}
            className="flex items-center gap-1 text-xs font-bold text-teal-600 hover:underline mb-1"
          >
            <ChevronLeft className="h-4 w-4" /> Back to Tools Library
          </button>
          <h2 className="text-xl font-extrabold text-foreground flex items-center gap-2">
            <Search className="h-6 w-6 text-teal-600" /> Needs Discovery Tool
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Rigorous client profiling, risk scoring calculator, and suitability screening.
          </p>
        </div>

        {/* Save & Reset Panel */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          {hasUnsavedChanges && (
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider border bg-amber-50 text-amber-700 border-amber-200 animate-pulse">
              Unsaved Changes
            </span>
          )}
          <button
            onClick={handleResetData}
            title="Reset Discovery Data"
            className="p-2 text-gray-500 hover:text-red-500 hover:bg-gray-100 rounded-xl transition-all border border-border"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <Button 
            onClick={() => handleSaveData(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"
          >
            <Save className="h-3.5 w-3.5" /> Save Data
          </Button>
          <Button 
            onClick={handleExportPDF}
            variant="outline"
            className="border-teal-600/30 text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-950/20 text-xs font-semibold rounded-xl flex items-center gap-1.5"
          >
            <Download className="h-3.5 w-3.5" /> Download Report
          </Button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex flex-wrap border-b border-border bg-card p-1 rounded-xl gap-1 shadow-sm">
        {["Dashboard", "Client Discovery", "Risk Score Calculator", "Suitability Check", "Summary Report"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === tab
                ? "bg-teal-600 text-white font-bold shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/15"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      ) : (
        <div className="space-y-6">

          {/* TAB 1: DASHBOARD */}
          {activeTab === "Dashboard" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-border pb-3 bg-card p-4 rounded-xl shadow-sm">
                <div>
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Client Discovery & Risk Dashboard</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Overview of client profile status, calculated risk level, and product suitability.
                  </p>
                </div>
                <Button 
                  onClick={handleExportPDF}
                  variant="outline" 
                  className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg border-border"
                >
                  <Download className="h-3.5 w-3.5 text-teal-600" /> Download PDF Report
                </Button>
              </div>

              {/* KPI metrics row */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="p-4 border-l-4 border-l-teal-600 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Client Name</span>
                  <h3 className="text-sm font-extrabold text-foreground mt-1 truncate">{clientDiscovery.clientName || "Not Provided"}</h3>
                </Card>
                <Card className="p-4 border-l-4 border-l-cyan-600 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Risk Score</span>
                  <h3 className="text-lg font-extrabold text-foreground mt-1">
                    {answeredCount > 0 ? `${totalScore} / 50` : "No Responses"}
                  </h3>
                </Card>
                <Card className="p-4 border-l-4 border-l-emerald-600 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-semibold">Risk Profile</span>
                  <h3 className="text-sm font-extrabold text-foreground mt-1">{calculatedRiskProfile || "Incomplete"}</h3>
                </Card>
                <Card className="p-4 border-l-4 border-l-indigo-600 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Suitability Checklist</span>
                  <h3 className="text-sm font-extrabold text-foreground mt-1">
                    {suitabilityCheck.riskProfile ? "Configured" : "Incomplete"}
                  </h3>
                </Card>
              </div>

              {/* Graphical Analysis */}
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Risk score gauge card */}
                <Card className="p-5 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 border-b border-border pb-3 mb-5">
                      <TrendingUp className="h-4.5 w-4.5 text-teal-600" /> Risk Meter Gauge
                    </h4>
                    <div className="flex flex-col items-center justify-center py-6">
                      <div className="relative flex items-center justify-center">
                        {/* Circular Progress Representation */}
                        <div className="w-32 h-32 rounded-full border-8 border-gray-100 flex flex-col items-center justify-center">
                          <span className="text-2xl font-extrabold text-teal-700">{totalScore}</span>
                          <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Max 50</span>
                        </div>
                      </div>
                      <div className="text-center mt-5">
                        <p className="text-xs font-bold text-foreground">
                          {calculatedRiskProfile ? `Profile: ${calculatedRiskProfile}` : "Answer questionnaire to profile"}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Based on {answeredCount} / 10 risk questions completed
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Product suitability chart */}
                <Card className="p-5 lg:col-span-2">
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 border-b border-border pb-3 mb-4">
                    <FileCheck className="h-4.5 w-4.5 text-teal-600" /> Suitability Dimension Match count
                  </h4>
                  <div className="h-60 mt-2">
                    {!suitabilityCheck.riskProfile ? (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                        Configure suitability inputs to view dimensions chart.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 600 }} />
                          <YAxis tick={{ fontSize: 9 }} />
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: 9 }} />
                          <Bar dataKey="Suitable" stackId="a" fill="#0d9488" radius={[0, 0, 0, 0]} />
                          <Bar dataKey="Conditional" stackId="a" fill="#ea580c" radius={[0, 0, 0, 0]} />
                          <Bar dataKey="Unsuitable" stackId="a" fill="#dc2626" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </Card>
              </div>

              {/* Notes Card */}
              <Card className="p-5">
                <h4 className="text-xs font-bold text-foreground uppercase border-b border-border pb-2 mb-3">
                  Advisor Dashboard Workspace Notes
                </h4>
                <textarea
                  value={dashboardNotes.notes}
                  onChange={(e) => setDashboardNotes({ notes: e.target.value })}
                  placeholder="Record summary observations, strategic points, or meeting notes here..."
                  className="w-full h-24 p-3 bg-muted/30 border border-border rounded-xl text-xs focus:outline-none focus:border-teal-500"
                />
              </Card>
            </div>
          )}

          {/* TAB 2: CLIENT DISCOVERY */}
          {activeTab === "Client Discovery" && (
            <div className="space-y-6">
              {/* Questionnaire card */}
              <Card className="p-6 space-y-8">
                <div className="flex justify-between items-center border-b border-border pb-3">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Client Profile & Discovery Form</h3>
                  <Button 
                    onClick={handleExportPDF}
                    variant="outline" 
                    className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg border-border"
                  >
                    <Download className="h-3.5 w-3.5 text-teal-600" /> Download PDF Report
                  </Button>
                </div>

                {/* Section Header Identification */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-teal-600 uppercase border-b border-teal-500/10 pb-1 flex items-center gap-1">
                    <User className="h-4 w-4" /> Identification & Meeting Details
                  </h4>
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Client Name</label>
                      <input 
                        type="text" 
                        value={clientDiscovery.clientName}
                        onChange={(e) => updateDiscoveryField("clientName", e.target.value)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:border-teal-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">RM / Advisor Name</label>
                      <input 
                        type="text" 
                        value={clientDiscovery.advisorName}
                        onChange={(e) => updateDiscoveryField("advisorName", e.target.value)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:border-teal-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Meeting Date</label>
                      <input 
                        type="date" 
                        value={clientDiscovery.meetingDate}
                        onChange={(e) => updateDiscoveryField("meetingDate", e.target.value)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:border-teal-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Client ID / Code</label>
                      <input 
                        type="text" 
                        value={clientDiscovery.clientId}
                        onChange={(e) => updateDiscoveryField("clientId", e.target.value)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:border-teal-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Branch / Location</label>
                      <input 
                        type="text" 
                        value={clientDiscovery.location}
                        onChange={(e) => updateDiscoveryField("location", e.target.value)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:border-teal-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Review Type</label>
                      <select 
                        value={clientDiscovery.reviewType}
                        onChange={(e) => updateDiscoveryField("reviewType", e.target.value)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:border-teal-500 focus:outline-none"
                      >
                        {REVIEW_TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section A: Demographics */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-teal-600 uppercase border-b border-teal-500/10 pb-1 flex items-center gap-1">
                    <GraduationCap className="h-4 w-4" /> A. Client Profile & Demographics
                  </h4>
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Client Age (Years)</label>
                      <input 
                        type="number" 
                        placeholder="e.g. 35"
                        value={clientDiscovery.age}
                        onChange={(e) => updateDiscoveryField("age", e.target.value)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:border-teal-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Annual Income (approximate)</label>
                      <select 
                        value={clientDiscovery.annualIncome}
                        onChange={(e) => updateDiscoveryField("annualIncome", e.target.value)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:border-teal-500 focus:outline-none"
                      >
                        <option value="">Select Option</option>
                        {INCOME_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Current Net Worth (approximate)</label>
                      <select 
                        value={clientDiscovery.netWorth}
                        onChange={(e) => updateDiscoveryField("netWorth", e.target.value)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:border-teal-500 focus:outline-none"
                      >
                        <option value="">Select Option</option>
                        {NET_WORTH_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Primary Occupation</label>
                      <select 
                        value={clientDiscovery.occupation}
                        onChange={(e) => updateDiscoveryField("occupation", e.target.value)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:border-teal-500 focus:outline-none"
                      >
                        <option value="">Select Option</option>
                        {OCCUPATION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Highest Educational Qualification</label>
                      <select 
                        value={clientDiscovery.education}
                        onChange={(e) => updateDiscoveryField("education", e.target.value)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:border-teal-500 focus:outline-none"
                      >
                        <option value="">Select Option</option>
                        {EDUCATION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Marital Status & Family</label>
                      <select 
                        value={clientDiscovery.maritalStatus}
                        onChange={(e) => updateDiscoveryField("maritalStatus", e.target.value)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:border-teal-500 focus:outline-none"
                      >
                        <option value="">Select Option</option>
                        {MARITAL_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Income Tax Slab / Bracket</label>
                      <select 
                        value={clientDiscovery.taxSlab}
                        onChange={(e) => updateDiscoveryField("taxSlab", e.target.value)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:border-teal-500 focus:outline-none"
                      >
                        <option value="">Select Option</option>
                        {TAX_SLAB_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section B: Objectives & Goals */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-teal-600 uppercase border-b border-teal-500/10 pb-1 flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" /> B. Investment Objectives & Goals
                  </h4>
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Primary Financial Goal</label>
                      <select 
                        value={clientDiscovery.primaryGoal}
                        onChange={(e) => updateDiscoveryField("primaryGoal", e.target.value)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:border-teal-500 focus:outline-none"
                      >
                        <option value="">Select Option</option>
                        {GOAL_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Investment Time Horizon</label>
                      <select 
                        value={clientDiscovery.timeHorizon}
                        onChange={(e) => updateDiscoveryField("timeHorizon", e.target.value)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:border-teal-500 focus:outline-none"
                      >
                        <option value="">Select Option</option>
                        {HORIZON_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Lump Sum Amount to Invest</label>
                      <select 
                        value={clientDiscovery.lumpSum}
                        onChange={(e) => updateDiscoveryField("lumpSum", e.target.value)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:border-teal-500 focus:outline-none"
                      >
                        <option value="">Select Option</option>
                        {SURPLUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">SIP / Monthly Investment Amount</label>
                      <input 
                        type="text" 
                        placeholder="e.g. ₹25,000"
                        value={clientDiscovery.sipAmount}
                        onChange={(e) => updateDiscoveryField("sipAmount", e.target.value)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:border-teal-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Return Expectation</label>
                      <select 
                        value={clientDiscovery.returnExpectation}
                        onChange={(e) => updateDiscoveryField("returnExpectation", e.target.value)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:border-teal-500 focus:outline-none"
                      >
                        <option value="">Select Option</option>
                        {RETURN_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Require Regular Income / Payouts?</label>
                      <select 
                        value={clientDiscovery.requireIncome}
                        onChange={(e) => updateDiscoveryField("requireIncome", e.target.value)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:border-teal-500 focus:outline-none"
                      >
                        <option value="">Select Option</option>
                        {INCOME_REQ_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div className="sm:col-span-2 md:col-span-3">
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Describe Existing Investments</label>
                      <input 
                        type="text" 
                        value={clientDiscovery.existingInvestments}
                        onChange={(e) => updateDiscoveryField("existingInvestments", e.target.value)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:border-teal-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Section C: Risk Profiling */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-teal-600 uppercase border-b border-teal-500/10 pb-1 flex items-center gap-1">
                    <ShieldAlert className="h-4 w-4" /> C. Risk Profiling
                  </h4>
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Reaction to 20% portfolio drop (3 mos)</label>
                      <select 
                        value={clientDiscovery.riskReaction}
                        onChange={(e) => updateDiscoveryField("riskReaction", e.target.value)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:border-teal-500 focus:outline-none"
                      >
                        <option value="">Select Option</option>
                        {REACTION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Investment Knowledge Level</label>
                      <select 
                        value={clientDiscovery.knowledgeLevel}
                        onChange={(e) => updateDiscoveryField("knowledgeLevel", e.target.value)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:border-teal-500 focus:outline-none"
                      >
                        <option value="">Select Option</option>
                        {KNOWLEDGE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Prior Capital Market Experience</label>
                      <select 
                        value={clientDiscovery.marketExperience}
                        onChange={(e) => updateDiscoveryField("marketExperience", e.target.value)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:border-teal-500 focus:outline-none"
                      >
                        <option value="">Select Option</option>
                        {EXPERIENCE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">% Savings willing to risk</label>
                      <select 
                        value={clientDiscovery.savingsAtRisk}
                        onChange={(e) => updateDiscoveryField("savingsAtRisk", e.target.value)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:border-teal-500 focus:outline-none"
                      >
                        <option value="">Select Option</option>
                        {RISK_PCT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Risk Attitude Statement</label>
                      <select 
                        value={clientDiscovery.riskAttitude}
                        onChange={(e) => updateDiscoveryField("riskAttitude", e.target.value)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:border-teal-500 focus:outline-none"
                      >
                        <option value="">Select Option</option>
                        {RISK_ATTITUDE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Outstanding Loans / Liabilities</label>
                      <select 
                        value={clientDiscovery.outstandingLoans}
                        onChange={(e) => updateDiscoveryField("outstandingLoans", e.target.value)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:border-teal-500 focus:outline-none"
                      >
                        <option value="">Select Option</option>
                        {LOAN_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Has Emergency Fund (6+ mos)?</label>
                      <select 
                        value={clientDiscovery.emergencyFund}
                        onChange={(e) => updateDiscoveryField("emergencyFund", e.target.value)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:border-teal-500 focus:outline-none"
                      >
                        <option value="">Select Option</option>
                        {EMERGENCY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section D: Tax Planning & Regulatory */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-teal-600 uppercase border-b border-teal-500/10 pb-1 flex items-center gap-1">
                    <Landmark className="h-4 w-4" /> D. Tax Planning & Regulatory
                  </h4>
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Is Tax Saving a priority?</label>
                      <select 
                        value={clientDiscovery.taxSavingPriority}
                        onChange={(e) => updateDiscoveryField("taxSavingPriority", e.target.value)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:border-teal-500 focus:outline-none"
                      >
                        <option value="">Select Option</option>
                        {TAX_PRIORITY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Aware of Capital Gain Taxes (LTCG / STCG)?</label>
                      <select 
                        value={clientDiscovery.taxAware}
                        onChange={(e) => updateDiscoveryField("taxAware", e.target.value)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:border-teal-500 focus:outline-none"
                      >
                        <option value="">Select Option</option>
                        {TAX_AWARE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Residency Status</label>
                      <select 
                        value={clientDiscovery.residencyStatus}
                        onChange={(e) => updateDiscoveryField("residencyStatus", e.target.value)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:border-teal-500 focus:outline-none"
                      >
                        <option value="">Select Option</option>
                        {RESIDENCY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">FATCA / CRS Reporting Obligations?</label>
                      <select 
                        value={clientDiscovery.fatcaReporting}
                        onChange={(e) => updateDiscoveryField("fatcaReporting", e.target.value)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:border-teal-500 focus:outline-none"
                      >
                        <option value="">Select Option</option>
                        {FATCA_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section E: Product Preferences */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-teal-600 uppercase border-b border-teal-500/10 pb-1 flex items-center gap-1">
                    <BookOpen className="h-4 w-4" /> E. Product Preference & Screening
                  </h4>
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Aware of PMS (min ₹50L ticket)?</label>
                      <select 
                        value={clientDiscovery.awarePMS}
                        onChange={(e) => updateDiscoveryField("awarePMS", e.target.value)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:border-teal-500 focus:outline-none"
                      >
                        <option value="">Select Option</option>
                        {AWARE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Aware of AIF (min ₹1Cr ticket)?</label>
                      <select 
                        value={clientDiscovery.awareAIF}
                        onChange={(e) => updateDiscoveryField("awareAIF", e.target.value)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:border-teal-500 focus:outline-none"
                      >
                        <option value="">Select Option</option>
                        {AWARE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Aware of SIF (min ₹10L ticket)?</label>
                      <select 
                        value={clientDiscovery.awareSIF}
                        onChange={(e) => updateDiscoveryField("awareSIF", e.target.value)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:border-teal-500 focus:outline-none"
                      >
                        <option value="">Select Option</option>
                        {AWARE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Life cover at least 10x income?</label>
                      <select 
                        value={clientDiscovery.lifeInsurance10x}
                        onChange={(e) => updateDiscoveryField("lifeInsurance10x", e.target.value)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:border-teal-500 focus:outline-none"
                      >
                        <option value="">Select Option</option>
                        {INS_10X_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Interested in ULIP products?</label>
                      <select 
                        value={clientDiscovery.interestedULIP}
                        onChange={(e) => updateDiscoveryField("interestedULIP", e.target.value)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:border-teal-500 focus:outline-none"
                      >
                        <option value="">Select Option</option>
                        {INTEREST_ULIP_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Actively vs Passively managed preference</label>
                      <select 
                        value={clientDiscovery.activePassivePref}
                        onChange={(e) => updateDiscoveryField("activePassivePref", e.target.value)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:border-teal-500 focus:outline-none"
                      >
                        <option value="">Select Option</option>
                        {ACTIVE_PASSIVE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Open to International Diversification?</label>
                      <select 
                        value={clientDiscovery.intDiversification}
                        onChange={(e) => updateDiscoveryField("intDiversification", e.target.value)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:border-teal-500 focus:outline-none"
                      >
                        <option value="">Select Option</option>
                        {INT_DIV_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Growth or IDCW (Dividend) preference?</label>
                      <select 
                        value={clientDiscovery.growthIdcwPref}
                        onChange={(e) => updateDiscoveryField("growthIdcwPref", e.target.value)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:border-teal-500 focus:outline-none"
                      >
                        <option value="">Select Option</option>
                        {GROWTH_IDCW_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Preferred statement mode</label>
                      <select 
                        value={clientDiscovery.communicationPref}
                        onChange={(e) => updateDiscoveryField("communicationPref", e.target.value)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:border-teal-500 focus:outline-none"
                      >
                        <option value="">Select Option</option>
                        {COMM_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div className="sm:col-span-2 md:col-span-3">
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Preference for Fund House / Managers (text)</label>
                      <input 
                        type="text" 
                        value={clientDiscovery.specificFundHouse}
                        onChange={(e) => updateDiscoveryField("specificFundHouse", e.target.value)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:border-teal-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Section F: Advisor Assessment */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-teal-600 uppercase border-b border-teal-500/10 pb-1 flex items-center gap-1">
                    <FileCheck className="h-4 w-4" /> F. Advisor Assessment & Next Steps
                  </h4>
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Overall Assessed Risk Profile</label>
                      <select 
                        value={clientDiscovery.assessedRiskProfile}
                        onChange={(e) => updateDiscoveryField("assessedRiskProfile", e.target.value)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:border-teal-500 focus:outline-none font-bold"
                      >
                        <option value="">Select Option</option>
                        {RISK_PROFILE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Urgency of Investment Decision</label>
                      <select 
                        value={clientDiscovery.urgencyDecision}
                        onChange={(e) => updateDiscoveryField("urgencyDecision", e.target.value)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:border-teal-500 focus:outline-none"
                      >
                        <option value="">Select Option</option>
                        {URGENCY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Proposed Next Step</label>
                      <select 
                        value={clientDiscovery.nextStep}
                        onChange={(e) => updateDiscoveryField("nextStep", e.target.value)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:border-teal-500 focus:outline-none"
                      >
                        <option value="">Select Option</option>
                        {NEXT_STEP_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div className="sm:col-span-2 md:col-span-3">
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Key Concerns Raised by Client (Notes)</label>
                      <textarea 
                        value={clientDiscovery.keyConcerns}
                        onChange={(e) => updateDiscoveryField("keyConcerns", e.target.value)}
                        className="w-full h-20 px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:border-teal-500 focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2 md:col-span-3">
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Products Discussed in Meeting (Notes)</label>
                      <textarea 
                        value={clientDiscovery.productsDiscussed}
                        onChange={(e) => updateDiscoveryField("productsDiscussed", e.target.value)}
                        className="w-full h-20 px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:border-teal-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

              </Card>
            </div>
          )}

          {/* TAB 3: RISK SCORE CALCULATOR */}
          {activeTab === "Risk Score Calculator" && (
            <div className="space-y-6">
              <Card className="p-6">
                <div className="flex justify-between items-center border-b border-border pb-3 mb-5">
                  <div>
                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Client Risk Score Calculator</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Scores automatically computed from discovery profile responses. Overrides allowed.
                    </p>
                  </div>
                  <Button 
                    onClick={handleExportPDF}
                    variant="outline" 
                    className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg border-border"
                  >
                    <Download className="h-3.5 w-3.5 text-teal-600" /> Download PDF Report
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-muted/40 text-muted-foreground font-semibold border-b border-border">
                        <th className="py-2.5 px-4">Risk Parameter</th>
                        <th className="py-2.5 px-4">Selected Option</th>
                        <th className="py-2.5 px-4 text-center">Score</th>
                        <th className="py-2.5 px-4 text-center">Max Score</th>
                        <th className="py-2.5 px-4 text-center">Weight</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-foreground">
                      {/* Age Row */}
                      <tr>
                        <td className="py-2.5 px-4 font-semibold">Age (years)</td>
                        <td className="py-2 px-4">
                          <select 
                            value={riskCalculator.ageRange}
                            onChange={(e) => updateRiskCalcField("ageRange", e.target.value)}
                            className="bg-background border border-border rounded px-2 py-1 text-xs"
                          >
                            <option value="">Select Option</option>
                            {AGE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </td>
                        <td className="py-2.5 px-4 text-center font-bold">{riskCalculator.ageRange ? mapAgeScore(riskCalculator.ageRange).toFixed(1) : "—"}</td>
                        <td className="py-2.5 px-4 text-center text-muted-foreground">5.0</td>
                        <td className="py-2.5 px-4 text-center text-muted-foreground">10%</td>
                      </tr>

                      {/* Horizon Row */}
                      <tr>
                        <td className="py-2.5 px-4 font-semibold">Investment Time Horizon</td>
                        <td className="py-2 px-4">
                          <select 
                            value={riskCalculator.horizon}
                            onChange={(e) => updateRiskCalcField("horizon", e.target.value)}
                            className="bg-background border border-border rounded px-2 py-1 text-xs"
                          >
                            <option value="">Select Option</option>
                            {HORIZON_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </td>
                        <td className="py-2.5 px-4 text-center font-bold">{riskCalculator.horizon ? mapHorizonScore(riskCalculator.horizon).toFixed(1) : "—"}</td>
                        <td className="py-2.5 px-4 text-center text-muted-foreground">5.0</td>
                        <td className="py-2.5 px-4 text-center text-muted-foreground">10%</td>
                      </tr>

                      {/* Income Row */}
                      <tr>
                        <td className="py-2.5 px-4 font-semibold">Annual Income</td>
                        <td className="py-2 px-4">
                          <select 
                            value={riskCalculator.income}
                            onChange={(e) => updateRiskCalcField("income", e.target.value)}
                            className="bg-background border border-border rounded px-2 py-1 text-xs"
                          >
                            <option value="">Select Option</option>
                            {['< ₹5 Lakhs', '₹5–10 Lakhs', '₹10–25 Lakhs', '₹25–50 Lakhs', '> ₹50 Lakhs'].map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </td>
                        <td className="py-2.5 px-4 text-center font-bold">{riskCalculator.income ? mapIncomeScore(riskCalculator.income).toFixed(1) : "—"}</td>
                        <td className="py-2.5 px-4 text-center text-muted-foreground">5.0</td>
                        <td className="py-2.5 px-4 text-center text-muted-foreground">10%</td>
                      </tr>

                      {/* Net Worth Row */}
                      <tr>
                        <td className="py-2.5 px-4 font-semibold">Net Worth</td>
                        <td className="py-2 px-4">
                          <select 
                            value={riskCalculator.netWorth}
                            onChange={(e) => updateRiskCalcField("netWorth", e.target.value)}
                            className="bg-background border border-border rounded px-2 py-1 text-xs"
                          >
                            <option value="">Select Option</option>
                            {['< ₹25 Lakhs', '₹25–50 Lakhs', '₹50L–1 Crore', '₹1–5 Crores', '> ₹5 Crores'].map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </td>
                        <td className="py-2.5 px-4 text-center font-bold">{riskCalculator.netWorth ? mapNetWorthScore(riskCalculator.netWorth).toFixed(1) : "—"}</td>
                        <td className="py-2.5 px-4 text-center text-muted-foreground">5.0</td>
                        <td className="py-2.5 px-4 text-center text-muted-foreground">10%</td>
                      </tr>

                      {/* Reaction Row */}
                      <tr>
                        <td className="py-2.5 px-4 font-semibold">Reaction to 20% drop</td>
                        <td className="py-2 px-4">
                          <select 
                            value={riskCalculator.reaction}
                            onChange={(e) => updateRiskCalcField("reaction", e.target.value)}
                            className="bg-background border border-border rounded px-2 py-1 text-xs"
                          >
                            <option value="">Select Option</option>
                            {['Sell Everything', 'Sell Some', 'Hold & Wait', 'Buy More', 'Buy Very Aggressively'].map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </td>
                        <td className="py-2.5 px-4 text-center font-bold">{riskCalculator.reaction ? mapReactionScore(riskCalculator.reaction).toFixed(1) : "—"}</td>
                        <td className="py-2.5 px-4 text-center text-muted-foreground">5.0</td>
                        <td className="py-2.5 px-4 text-center text-muted-foreground">10%</td>
                      </tr>

                      {/* Knowledge Row */}
                      <tr>
                        <td className="py-2.5 px-4 font-semibold">Knowledge Level</td>
                        <td className="py-2 px-4">
                          <select 
                            value={riskCalculator.knowledge}
                            onChange={(e) => updateRiskCalcField("knowledge", e.target.value)}
                            className="bg-background border border-border rounded px-2 py-1 text-xs"
                          >
                            <option value="">Select Option</option>
                            {['Novice', 'Basic', 'Intermediate', 'Advanced', 'Expert'].map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </td>
                        <td className="py-2.5 px-4 text-center font-bold">{riskCalculator.knowledge ? mapKnowledgeScore(riskCalculator.knowledge).toFixed(1) : "—"}</td>
                        <td className="py-2.5 px-4 text-center text-muted-foreground">5.0</td>
                        <td className="py-2.5 px-4 text-center text-muted-foreground">10%</td>
                      </tr>

                      {/* Experience Row */}
                      <tr>
                        <td className="py-2.5 px-4 font-semibold">Capital Market Experience</td>
                        <td className="py-2 px-4">
                          <select 
                            value={riskCalculator.experience}
                            onChange={(e) => updateRiskCalcField("experience", e.target.value)}
                            className="bg-background border border-border rounded px-2 py-1 text-xs"
                          >
                            <option value="">Select Option</option>
                            {['Never', '< 1 Year', '1–3 Years', '3–5 Years', '> 5 Years'].map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </td>
                        <td className="py-2.5 px-4 text-center font-bold">{riskCalculator.experience ? mapExperienceScore(riskCalculator.experience).toFixed(1) : "—"}</td>
                        <td className="py-2.5 px-4 text-center text-muted-foreground">5.0</td>
                        <td className="py-2.5 px-4 text-center text-muted-foreground">10%</td>
                      </tr>

                      {/* Risk Savings Row */}
                      <tr>
                        <td className="py-2.5 px-4 font-semibold">% savings willing to risk</td>
                        <td className="py-2 px-4">
                          <select 
                            value={riskCalculator.riskSavings}
                            onChange={(e) => updateRiskCalcField("riskSavings", e.target.value)}
                            className="bg-background border border-border rounded px-2 py-1 text-xs"
                          >
                            <option value="">Select Option</option>
                            {['< 10%', '10–25%', '25–50%', '50–75%', '> 75%'].map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </td>
                        <td className="py-2.5 px-4 text-center font-bold">{riskCalculator.riskSavings ? mapRiskSavingsScore(riskCalculator.riskSavings).toFixed(1) : "—"}</td>
                        <td className="py-2.5 px-4 text-center text-muted-foreground">5.0</td>
                        <td className="py-2.5 px-4 text-center text-muted-foreground">10%</td>
                      </tr>

                      {/* Liquidity Row */}
                      <tr>
                        <td className="py-2.5 px-4 font-semibold">Liquidity Requirement</td>
                        <td className="py-2 px-4">
                          <select 
                            value={riskCalculator.liquidity}
                            onChange={(e) => updateRiskCalcField("liquidity", e.target.value)}
                            className="bg-background border border-border rounded px-2 py-1 text-xs"
                          >
                            <option value="">Select Option</option>
                            {['< 1 Week', '1–3 Months', '3–12 Months', '1–3 Years', '> 3 Years'].map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </td>
                        <td className="py-2.5 px-4 text-center font-bold">{riskCalculator.liquidity ? mapLiquidityScore(riskCalculator.liquidity).toFixed(1) : "—"}</td>
                        <td className="py-2.5 px-4 text-center text-muted-foreground">5.0</td>
                        <td className="py-2.5 px-4 text-center text-muted-foreground">10%</td>
                      </tr>

                      {/* Loans Row */}
                      <tr>
                        <td className="py-2.5 px-4 font-semibold">Loans / Liabilities</td>
                        <td className="py-2 px-4">
                          <select 
                            value={riskCalculator.loans}
                            onChange={(e) => updateRiskCalcField("loans", e.target.value)}
                            className="bg-background border border-border rounded px-2 py-1 text-xs"
                          >
                            <option value="">Select Option</option>
                            {['Major Liabilities', 'Minor Liabilities', 'No Loans'].map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </td>
                        <td className="py-2.5 px-4 text-center font-bold">{riskCalculator.loans ? mapLoansScore(riskCalculator.loans).toFixed(1) : "—"}</td>
                        <td className="py-2.5 px-4 text-center text-muted-foreground">5.0</td>
                        <td className="py-2.5 px-4 text-center text-muted-foreground">10%</td>
                      </tr>

                      {/* Totals Summary Row */}
                      <tr className="bg-teal-50 dark:bg-teal-950/20 font-bold border-t-2 border-teal-600">
                        <td className="py-3 px-4 text-teal-700 dark:text-teal-400 text-sm">TOTAL RISK SCORE</td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">Auto Sum (out of 50.0)</td>
                        <td className="py-3 px-4 text-center text-teal-700 dark:text-teal-400 text-sm">{answeredCount > 0 ? totalScore.toFixed(1) : "—"}</td>
                        <td className="py-3 px-4 text-center text-muted-foreground">50.0</td>
                        <td className="py-3 px-4 text-center text-muted-foreground">100%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Score Profile Mapping Box */}
                <div className="grid gap-4 md:grid-cols-2 mt-6 pt-5 border-t border-border">
                  <div className="p-4 bg-teal-50/50 dark:bg-teal-950/10 border border-teal-100 dark:border-teal-900 rounded-xl">
                    <h5 className="text-xs font-bold text-teal-800 dark:text-teal-400 uppercase">Calculated Risk Profile</h5>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xl font-extrabold text-teal-900 dark:text-teal-300">
                        {calculatedRiskProfile || "Incomplete Details"}
                      </span>
                      {calculatedRiskProfile && (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-teal-200 text-teal-800 dark:bg-teal-800 dark:text-teal-200">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 max-w-sm">
                      {answeredCount < 10 ? "Please complete all 10 responses in the table above to compute the risk profile." : "Calculated risk score maps to client suitability rules automatically."}
                    </p>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-zinc-900/40 border border-border rounded-xl">
                    <h5 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-2">Risk Score mapping reference</h5>
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                      <div>10–17: Conservative</div>
                      <div>34–40: Mod. Aggressive</div>
                      <div>18–25: Mod. Conservative</div>
                      <div>41–47: Aggressive</div>
                      <div>26–33: Moderate</div>
                      <div>48–50: Very Aggressive</div>
                    </div>
                  </div>
                </div>

              </Card>
            </div>
          )}

          {/* TAB 4: SUITABILITY CHECK */}
          {activeTab === "Suitability Check" && (
            <div className="space-y-6">
              <Card className="p-6">
                <div className="border-b border-border pb-3 mb-5 flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Quick Product Suitability Check</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Verify compatibility based on risk profile, horizon, and surplus.
                    </p>
                  </div>
                  <Button 
                    onClick={handleExportPDF}
                    variant="outline" 
                    className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg border-border"
                  >
                    <Download className="h-3.5 w-3.5 text-teal-600" /> Download PDF Report
                  </Button>
                </div>

                {/* Grid Inputs */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 bg-muted/20 p-4 rounded-xl mb-6">
                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Risk Profile</label>
                    <select 
                      value={suitabilityCheck.riskProfile}
                      onChange={(e) => updateSuitabilityField("riskProfile", e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-none"
                    >
                      <option value="">Select Option</option>
                      {['Conservative', 'Mod. Conservative', 'Moderate', 'Mod. Aggressive', 'Aggressive', 'Very Aggressive'].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Investment Horizon</label>
                    <select 
                      value={suitabilityCheck.horizon}
                      onChange={(e) => updateSuitabilityField("horizon", e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-none"
                    >
                      <option value="">Select Option</option>
                      {HORIZON_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Investable Surplus</label>
                    <select 
                      value={suitabilityCheck.surplus}
                      onChange={(e) => updateSuitabilityField("surplus", e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-none"
                    >
                      <option value="">Select Option</option>
                      {SURPLUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Liquidity Need</label>
                    <select 
                      value={suitabilityCheck.liquidityNeed}
                      onChange={(e) => updateSuitabilityField("liquidityNeed", e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-none"
                    >
                      <option value="">Select Option</option>
                      {['High (< 1 Month)', 'Moderate (1–3 Months)', 'Low (3Y+ OK)', 'Very Low (5Y+ OK)'].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Tax Saving Priority</label>
                    <select 
                      value={suitabilityCheck.taxPriority}
                      onChange={(e) => updateSuitabilityField("taxPriority", e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-none"
                    >
                      <option value="">Select Option</option>
                      {TAX_PRIORITY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Investor Category</label>
                    <select 
                      value={suitabilityCheck.investorCategory}
                      onChange={(e) => updateSuitabilityField("investorCategory", e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-none"
                    >
                      <option value="">Select Option</option>
                      {['Retail (< ₹5Cr NW)', 'HNI (₹5Cr+ NW)', 'Accredited Investor', 'Institutional'].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>

                {/* Suitability Matrix Grid Table */}
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wide mb-3">Suitability Results Grid</h4>
                <div className="overflow-x-auto border border-border rounded-xl">
                  <table className="w-full border-collapse text-left text-xs font-semibold">
                    <thead>
                      <tr className="bg-muted/30 text-muted-foreground border-b border-border">
                        <th className="py-2.5 px-4">Suitability Dimension</th>
                        {products.map(p => <th key={p} className="py-2.5 px-4 text-center">{p}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-foreground">
                      {dimensions.map(dim => (
                        <tr key={dim} className="hover:bg-muted/10">
                          <td className="py-3 px-4 font-bold text-muted-foreground">{dim}</td>
                          {products.map(p => {
                            const val = getSuitabilityStatus(dim, p);
                            let color = "text-gray-400";
                            if (val === "✅") color = "text-emerald-600 dark:text-emerald-400";
                            else if (val === "⚠") color = "text-amber-600 dark:text-amber-400";
                            else if (val === "❌") color = "text-red-600 dark:text-red-400";

                            return (
                              <td key={p} className={`py-3 px-4 text-center text-sm font-extrabold ${color}`}>
                                {val}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap items-center gap-6 mt-4 text-[10px] text-muted-foreground bg-muted/10 p-3 rounded-lg border border-border">
                  <span className="font-bold uppercase text-gray-500">Legend:</span>
                  <span className="flex items-center gap-1"><span className="text-emerald-600 text-sm font-bold">✅</span> Suitable for this client</span>
                  <span className="flex items-center gap-1"><span className="text-amber-600 text-sm font-bold">⚠</span> Conditionally Suitable</span>
                  <span className="flex items-center gap-1"><span className="text-red-600 text-sm font-bold">❌</span> Not Suitable</span>
                  <span className="flex items-center gap-1"><span className="text-gray-400 text-sm font-bold">—</span> Input not yet selected</span>
                </div>

              </Card>
            </div>
          )}

          {/* TAB 5: SUMMARY REPORT */}
          {activeTab === "Summary Report" && (
            <div className="space-y-6">
              <Card className="p-6 space-y-6">
                <div className="flex justify-between items-center border-b border-border pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Client Summary & Actionable Roadmap</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Verify details and download the professional advisory client PDF package.
                    </p>
                  </div>
                  <Button 
                    onClick={handleExportPDF}
                    className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5" /> Export PDF Report
                  </Button>
                </div>

                {/* Identification Summary */}
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 bg-muted/10 p-4 rounded-xl border border-border">
                  <div>
                    <span className="block text-[9px] text-muted-foreground uppercase font-bold">Client Name</span>
                    <span className="text-xs font-bold text-foreground">{clientDiscovery.clientName || "—"}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] text-muted-foreground uppercase font-bold">RM / Advisor</span>
                    <span className="text-xs font-bold text-foreground">{clientDiscovery.advisorName || "—"}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] text-muted-foreground uppercase font-bold">Meeting Date</span>
                    <span className="text-xs font-bold text-foreground">{clientDiscovery.meetingDate || "—"}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] text-muted-foreground uppercase font-bold">Calculated Risk Profile</span>
                    <span className="text-xs font-extrabold text-teal-600">{calculatedRiskProfile || "Incomplete"}</span>
                  </div>
                </div>

                {/* Split grid summary details */}
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-teal-600 uppercase border-b border-border pb-1">Client Profile Overview</h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground">Age</span>
                        <span className="font-semibold">{clientDiscovery.age || "—"}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground">Occupation</span>
                        <span className="font-semibold">{clientDiscovery.occupation || "—"}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground">Annual Income</span>
                        <span className="font-semibold">{clientDiscovery.annualIncome || "—"}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground">Net Worth</span>
                        <span className="font-semibold">{clientDiscovery.netWorth || "—"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-teal-600 uppercase border-b border-border pb-1">Primary Goal Parameters</h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground">Primary Financial Goal</span>
                        <span className="font-semibold text-teal-700">{clientDiscovery.primaryGoal || "—"}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground">Time Horizon</span>
                        <span className="font-semibold">{clientDiscovery.timeHorizon || "—"}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground">Lump Sum Available</span>
                        <span className="font-semibold">{clientDiscovery.lumpSum || "—"}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground">SIP Capacity</span>
                        <span className="font-semibold">{clientDiscovery.sipAmount || "—"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Key Advisor Notes */}
                <div className="space-y-4 pt-4 border-t border-border">
                  <h4 className="text-xs font-bold text-teal-600 uppercase">Advisor Observations & Action Roadmap</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-3 bg-muted/20 rounded-xl border border-border">
                      <span className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Key Concerns raised by client</span>
                      <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{clientDiscovery.keyConcerns || "No notes logged."}</p>
                    </div>
                    <div className="p-3 bg-muted/20 rounded-xl border border-border">
                      <span className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Products discussed in meeting</span>
                      <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{clientDiscovery.productsDiscussed || "No notes logged."}</p>
                    </div>
                  </div>
                </div>

              </Card>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
