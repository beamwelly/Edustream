import { useState, useEffect, useRef } from "react";
import { 
  Loader2, 
  Save, 
  Download, 
  Plus, 
  Trash2, 
  TrendingUp, 
  Target, 
  ShieldAlert, 
  DollarSign, 
  CheckCircle2, 
  Briefcase, 
  Coins, 
  FileText, 
  ChevronRight, 
  BarChart3, 
  PieChart as PieIcon, 
  ChevronLeft,
  RotateCcw
} from "lucide-react";
import { Card, Button } from "@/components/common";
import { apiFetch } from "@/services/api";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  Legend
} from "recharts";

interface AssetRow {
  id: string;
  description: string;
  category: string;
  currentValue: number;
  costValue: number;
  liquid: string;
  notes: string;
}

interface LiabilityRow {
  id: string;
  description: string;
  type: string;
  outstanding: number;
  emi: number;
  rate: number;
  tenure: number;
  notes: string;
}

interface LifeInsuranceRow {
  id: string;
  policy: string;
  type: string;
  sumAssured: number;
  premium: number;
  term: number;
  maturity: number;
  nominee: string;
  status: string;
}

interface HealthInsuranceRow {
  id: string;
  insurer: string;
  type: string;
  sumInsured: number;
  premium: number;
  members: string;
  floater: string;
  expiry: string;
  remarks: string;
}

interface GoalRow {
  id: string;
  goalName: string;
  goalType: string;
  targetYear: number;
  targetCorpus: number;
  alreadySaved: number;
  priority: string;
}

interface RecommendationRow {
  id: string;
  goalPurpose: string;
  existingProduct: string;
  currentValue: number;
  recommendedProduct: string;
  proposedAmount: number;
  action: string;
  timeline: string;
}

interface DiscoveryData {
  // Client Identification
  fullName: string;
  dob: string;
  pan: string;
  mobile: string;
  email: string;
  aadhaar: string;
  city: string;
  advisor: string;
  residency: string;
  meetingDate: string;
  clientId: string;
  reviewType: string;
  occupation: string;
  employer: string;
  taxSlab: string;
  dependents: string;
  nomineeName: string;
  nomineeRelation: string;
  nomineeDob: string;
  nomineePan: string;

  // Income Sources (Annual amounts)
  primaryIncome: number;
  rentalIncome: number;
  dividendIncome: number;
  pensionIncome: number;
  otherIncome: number;

  // Household Expenses (Monthly amounts)
  rentEmi: number;
  groceries: number;
  education: number;
  insurance: number;
  vehicle: number;
  utilities: number;
  medical: number;
  entertainment: number;
  clothing: number;
  otherExpenses: number;

  // Investable Surplus Analysis
  annualLoanEmi: number;
  annualInsurancePremium: number;
  annualTax: number;

  // Dynamic lists
  assets: AssetRow[];
  liabilities: LiabilityRow[];
  lifeInsurance: LifeInsuranceRow[];
  healthInsurance: HealthInsuranceRow[];
  goals: GoalRow[];
  recommendations: RecommendationRow[];

  // Advisor Assessment & Next Steps
  assessedRiskProfile: string;
  advisoryServiceRequired: string;
  keyClientConcerns: string;
  productsDiscussed: string;
  recommendedNextAction: string;
  followUpDate: string;
  rmConvictionRating: string;
}

const defaultState = (): DiscoveryData => ({
  fullName: "",
  dob: "",
  pan: "",
  mobile: "",
  email: "",
  aadhaar: "",
  city: "",
  advisor: "",
  residency: "Resident Indian",
  meetingDate: "",
  clientId: "",
  reviewType: "New Client",
  occupation: "",
  employer: "",
  taxSlab: "Nil / New Regime 0%",
  dependents: "",
  nomineeName: "",
  nomineeRelation: "Spouse",
  nomineeDob: "",
  nomineePan: "",

  primaryIncome: 0,
  rentalIncome: 0,
  dividendIncome: 0,
  pensionIncome: 0,
  otherIncome: 0,

  rentEmi: 0,
  groceries: 0,
  education: 0,
  insurance: 0,
  vehicle: 0,
  utilities: 0,
  medical: 0,
  entertainment: 0,
  clothing: 0,
  otherExpenses: 0,

  annualLoanEmi: 0,
  annualInsurancePremium: 0,
  annualTax: 0,

  assets: [
    { id: "1", description: "Primary Residence", category: "Real Estate", currentValue: 0, costValue: 0, liquid: "No", notes: "" },
    { id: "2", description: "Mutual Fund Portfolio", category: "MF – Equity", currentValue: 0, costValue: 0, liquid: "Yes", notes: "" },
    { id: "3", description: "Savings Account Balance", category: "Savings / Current A/C", currentValue: 0, costValue: 0, liquid: "Yes", notes: "" }
  ],
  liabilities: [
    { id: "1", description: "Home Loan Outstanding", type: "Home Loan", outstanding: 0, emi: 0, rate: 0, tenure: 0, notes: "" }
  ],
  lifeInsurance: [
    { id: "1", policy: "HDFC Click 2 Protect", type: "Term Life", sumAssured: 0, premium: 0, term: 0, maturity: 0, nominee: "", status: "Review Only" }
  ],
  healthInsurance: [
    { id: "1", insurer: "Star Health Optima", type: "Health – Family Floater", sumInsured: 0, premium: 0, members: "Self, Spouse", floater: "Yes", expiry: "", remarks: "" }
  ],
  goals: [
    { id: "1", goalName: "Child's Higher Education", goalType: "Child Education", targetYear: new Date().getFullYear() + 10, targetCorpus: 0, alreadySaved: 0, priority: "High" },
    { id: "2", goalName: "Retirement Fund", goalType: "Retirement", targetYear: new Date().getFullYear() + 25, targetCorpus: 0, alreadySaved: 0, priority: "Very High" }
  ],
  recommendations: [
    { id: "1", goalPurpose: "Emergency Fund (3–6 months)", existingProduct: "", currentValue: 0, recommendedProduct: "", proposedAmount: 0, action: "Open New", timeline: "" },
    { id: "2", goalPurpose: "Tax Saving – 80C (₹1.5L limit)", existingProduct: "", currentValue: 0, recommendedProduct: "", proposedAmount: 0, action: "Review Only", timeline: "" },
    { id: "3", goalPurpose: "Life Insurance Gap", existingProduct: "", currentValue: 0, recommendedProduct: "", proposedAmount: 0, action: "Open New", timeline: "" },
    { id: "4", goalPurpose: "Health Insurance Enhancement", existingProduct: "", currentValue: 0, recommendedProduct: "", proposedAmount: 0, action: "Open New", timeline: "" },
    { id: "5", goalPurpose: "Short-Term Goal (< 3 Yrs)", existingProduct: "", currentValue: 0, recommendedProduct: "", proposedAmount: 0, action: "Open New", timeline: "" },
    { id: "6", goalPurpose: "Medium-Term Goal (3–7 Yrs)", existingProduct: "", currentValue: 0, recommendedProduct: "", proposedAmount: 0, action: "Open New", timeline: "" },
    { id: "7", goalPurpose: "Long-Term / Retirement", existingProduct: "", currentValue: 0, recommendedProduct: "", proposedAmount: 0, action: "Open New", timeline: "" },
    { id: "8", goalPurpose: "Other Investment", existingProduct: "", currentValue: 0, recommendedProduct: "", proposedAmount: 0, action: "Review Only", timeline: "" }
  ],

  assessedRiskProfile: "Moderate",
  advisoryServiceRequired: "Full Financial Plan",
  keyClientConcerns: "",
  productsDiscussed: "",
  recommendedNextAction: "Send Proposal",
  followUpDate: "",
  rmConvictionRating: "4 – High"
});

// Dropdown constants
const residencyOptions = ["Resident Indian", "NRI – USA", "NRI – UK", "NRI – UAE", "NRI – Other", "PIO / OCI", "Foreign National"];
const reviewTypeOptions = ["New Client", "Annual Review", "Portfolio Rebalance", "Goal Review", "Insurance Review", "Other"];
const taxSlabOptions = ["Nil / New Regime 0%", "5%", "10%", "15%", "20%", "30%+Surcharge"];
const relationOptions = ["Self", "Spouse", "Father", "Mother", "Son", "Daughter", "Other"];
const assetCategoryOptions = ["Savings / Current A/C", "Fixed Deposit", "Recurring Deposit", "PPF / EPF / NPS", "MF – Equity", "MF – Debt", "MF – Hybrid", "Direct Equity / Shares", "PMS", "AIF / Hedge Fund", "SIF", "Real Estate", "Gold / SGB", "ULIP", "Endowment / Money Back", "Bonds / Debentures", "Other"];
const liabilityTypeOptions = ["Home Loan", "Car Loan", "Personal Loan", "Business Loan", "Education Loan", "Credit Card Outstanding", "Other"];
const insuranceTypeOptions = ["Term Life", "Whole Life", "ULIP", "Endowment", "Money Back"];
const healthTypeOptions = ["Health – Individual", "Health – Family Floater", "Critical Illness", "Accidental", "None"];
const goalTypeOptions = ["Home Purchase", "Child Education", "Child Marriage", "Retirement", "Wealth Creation", "Emergency Fund", "Tax Saving", "Business Expansion", "Foreign Travel", "Other"];
const priorityOptions = ["Very High", "High", "Moderate", "Low", "Not a Priority"];
const actionOptions = ["Open New", "Top Up Existing", "Switch / Redeem", "Review Only", "Close"];
const riskProfileOptions = ["Conservative", "Moderately Conservative", "Moderate", "Moderately Aggressive", "Aggressive", "Very Aggressive"];
const adviceTypeOptions = ["Full Financial Plan", "Investment Advisory", "Tax Planning", "Insurance Review", "Retirement Planning", "One-Time Transaction", "Other"];
const nextStepOptions = ["Send Proposal", "Schedule Follow-Up", "Complete KYC", "Open Account", "Awaiting Documents", "Deal Closed", "No Action"];
const rmRatingOptions = ["1 – Very Low", "2 – Low", "3 – Medium", "4 – High", "5 – Very High"];

export function FinancialDiscoveryPage({ onBack }: { onBack: () => void }) {
  const [data, setData] = useState<DiscoveryData>(defaultState());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"Saved" | "Saving..." | "Unsaved Changes">("Saved");

  const isLoaded = useRef(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Helper function to format in Indian currency
  const formatIndianCurrency = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return "₹0";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(num);
  };

  // Helper function for empty string checks on PDF
  const safeText = (val: any) => {
    if (val === undefined || val === null || String(val).trim() === "" || String(val).trim().toUpperCase() === "N/A" || String(val).trim().toLowerCase() === "undefined") {
      return "Not Provided";
    }
    return String(val);
  };

  const getSavePayload = (currentState: DiscoveryData) => {
    return {
      client_master_json: {
        fullName: currentState.fullName,
        dob: currentState.dob,
        pan: currentState.pan,
        mobile: currentState.mobile,
        email: currentState.email,
        aadhaar: currentState.aadhaar,
        city: currentState.city,
        advisor: currentState.advisor,
        residency: currentState.residency,
        meetingDate: currentState.meetingDate,
        clientId: currentState.clientId,
        reviewType: currentState.reviewType,
        occupation: currentState.occupation,
        employer: currentState.employer,
        taxSlab: currentState.taxSlab,
        dependents: currentState.dependents,
        nomineeName: currentState.nomineeName,
        nomineeRelation: currentState.nomineeRelation,
        nomineeDob: currentState.nomineeDob,
        nomineePan: currentState.nomineePan,

        primaryIncome: currentState.primaryIncome,
        rentalIncome: currentState.rentalIncome,
        dividendIncome: currentState.dividendIncome,
        pensionIncome: currentState.pensionIncome,
        otherIncome: currentState.otherIncome,

        rentEmi: currentState.rentEmi,
        groceries: currentState.groceries,
        education: currentState.education,
        insurance: currentState.insurance,
        vehicle: currentState.vehicle,
        utilities: currentState.utilities,
        medical: currentState.medical,
        entertainment: currentState.entertainment,
        clothing: currentState.clothing,
        otherExpenses: currentState.otherExpenses,

        annualLoanEmi: currentState.annualLoanEmi,
        annualInsurancePremium: currentState.annualInsurancePremium,
        annualTax: currentState.annualTax
      },
      assets_json: {
        assets: currentState.assets
      },
      liabilities_json: {
        liabilities: currentState.liabilities
      },
      insurance_json: {
        lifeInsurance: currentState.lifeInsurance,
        healthInsurance: currentState.healthInsurance
      },
      goals_json: {
        goals: currentState.goals
      },
      advisor_json: {
        recommendations: currentState.recommendations,
        assessedRiskProfile: currentState.assessedRiskProfile,
        advisoryServiceRequired: currentState.advisoryServiceRequired,
        keyClientConcerns: currentState.keyClientConcerns,
        productsDiscussed: currentState.productsDiscussed,
        recommendedNextAction: currentState.recommendedNextAction,
        followUpDate: currentState.followUpDate,
        rmConvictionRating: currentState.rmConvictionRating
      }
    };
  };

  // 1. Fetch user data on mount
  useEffect(() => {
    const fetchDiscoveryData = async () => {
      try {
        const res = await apiFetch<any>("/api/financial-discovery");
        if (res) {
          const clientMaster = res.client_master_json || {};
          const assetsData = res.assets_json || {};
          const liabilitiesData = res.liabilities_json || {};
          const insuranceData = res.insurance_json || {};
          const goalsData = res.goals_json || {};
          const advisorData = res.advisor_json || {};

          setData({
            fullName: clientMaster.fullName || "",
            dob: clientMaster.dob || "",
            pan: clientMaster.pan || "",
            mobile: clientMaster.mobile || "",
            email: clientMaster.email || "",
            aadhaar: clientMaster.aadhaar || "",
            city: clientMaster.city || "",
            advisor: clientMaster.advisor || "",
            residency: clientMaster.residency || "Resident Indian",
            meetingDate: clientMaster.meetingDate || "",
            clientId: clientMaster.clientId || "",
            reviewType: clientMaster.reviewType || "New Client",
            occupation: clientMaster.occupation || "",
            employer: clientMaster.employer || "",
            taxSlab: clientMaster.taxSlab || "Nil / New Regime 0%",
            dependents: clientMaster.dependents || "",
            nomineeName: clientMaster.nomineeName || "",
            nomineeRelation: clientMaster.nomineeRelation || "Spouse",
            nomineeDob: clientMaster.nomineeDob || "",
            nomineePan: clientMaster.nomineePan || "",

            primaryIncome: clientMaster.primaryIncome || 0,
            rentalIncome: clientMaster.rentalIncome || 0,
            dividendIncome: clientMaster.dividendIncome || 0,
            pensionIncome: clientMaster.pensionIncome || 0,
            otherIncome: clientMaster.otherIncome || 0,

            rentEmi: clientMaster.rentEmi || 0,
            groceries: clientMaster.groceries || 0,
            education: clientMaster.education || 0,
            insurance: clientMaster.insurance || 0,
            vehicle: clientMaster.vehicle || 0,
            utilities: clientMaster.utilities || 0,
            medical: clientMaster.medical || 0,
            entertainment: clientMaster.entertainment || 0,
            clothing: clientMaster.clothing || 0,
            otherExpenses: clientMaster.otherExpenses || 0,

            annualLoanEmi: clientMaster.annualLoanEmi || 0,
            annualInsurancePremium: clientMaster.annualInsurancePremium || 0,
            annualTax: clientMaster.annualTax || 0,

            assets: assetsData.assets || defaultState().assets,
            liabilities: liabilitiesData.liabilities || defaultState().liabilities,
            lifeInsurance: insuranceData.lifeInsurance || defaultState().lifeInsurance,
            healthInsurance: insuranceData.healthInsurance || defaultState().healthInsurance,
            goals: goalsData.goals || defaultState().goals,
            recommendations: advisorData.recommendations || defaultState().recommendations,

            assessedRiskProfile: advisorData.assessedRiskProfile || "Moderate",
            advisoryServiceRequired: advisorData.advisoryServiceRequired || "Full Financial Plan",
            keyClientConcerns: advisorData.keyClientConcerns || "",
            productsDiscussed: advisorData.productsDiscussed || "",
            recommendedNextAction: advisorData.recommendedNextAction || "Send Proposal",
            followUpDate: advisorData.followUpDate || "",
            rmConvictionRating: advisorData.rmConvictionRating || "4 – High"
          });
        }
      } catch (err) {
        console.error("Failed to load discovery data", err);
      } finally {
        setLoading(false);
        isLoaded.current = true;
      }
    };
    fetchDiscoveryData();
  }, []);

  // 2. Debounced save trigger on state changes
  useEffect(() => {
    if (!isLoaded.current) return;
    setHasUnsavedChanges(true);
    setSaveStatus("Unsaved Changes");

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(async () => {
      setSaveStatus("Saving...");
      try {
        await apiFetch("/api/financial-discovery", {
          method: "PUT",
          body: JSON.stringify(getSavePayload(data))
        });
        setSaveStatus("Saved");
        setHasUnsavedChanges(false);
      } catch (err) {
        console.error("Auto-save failed", err);
        setSaveStatus("Unsaved Changes");
      }
    }, 1000);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [data]);

  // Handle manual saving
  const handleSaveData = async () => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    setSaveStatus("Saving...");
    try {
      await apiFetch("/api/financial-discovery", {
        method: "PUT",
        body: JSON.stringify(getSavePayload(data))
      });
      setSaveStatus("Saved");
      setHasUnsavedChanges(false);
      toast.success("Saved Successfully");
    } catch (err) {
      toast.error("Failed to save discovery data.");
      setSaveStatus("Unsaved Changes");
    }
  };

  // Reset data handler
  const handleResetData = async () => {
    if (!confirm("Are you sure you want to reset all your Financial Discovery data? This cannot be undone.")) return;
    try {
      await apiFetch("/api/financial-discovery/reset", {
        method: "POST"
      });
      setData(defaultState());
      setHasUnsavedChanges(false);
      setSaveStatus("Saved");
      toast.success("Form reset successfully.");
    } catch (err) {
      toast.error("Failed to reset form data.");
    }
  };

  // 3. Calculation Helper Variables
  const totalGrossAnnualIncome = 
    Number(data.primaryIncome) + 
    Number(data.rentalIncome) + 
    Number(data.dividendIncome) + 
    Number(data.pensionIncome) + 
    Number(data.otherIncome);

  const totalMonthlyExpenses = 
    Number(data.rentEmi) +
    Number(data.groceries) +
    Number(data.education) +
    Number(data.insurance) +
    Number(data.vehicle) +
    Number(data.utilities) +
    Number(data.medical) +
    Number(data.entertainment) +
    Number(data.clothing) +
    Number(data.otherExpenses);

  const totalAnnualExpenses = totalMonthlyExpenses * 12;

  const netAnnualSurplus = 
    totalGrossAnnualIncome - 
    totalAnnualExpenses - 
    Number(data.annualLoanEmi) - 
    Number(data.annualInsurancePremium) - 
    Number(data.annualTax);

  const estimatedMonthlySipCapacity = Math.max(Math.round(netAnnualSurplus / 12), 0);

  const totalAssets = data.assets.reduce((sum, item) => sum + Number(item.currentValue || 0), 0);
  const totalLiabilities = data.liabilities.reduce((sum, item) => sum + Number(item.outstanding || 0), 0);
  const totalMonthlyEmi = data.liabilities.reduce((sum, item) => sum + Number(item.emi || 0), 0);
  const netWorth = totalAssets - totalLiabilities;
  const debtToAssetRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) : 0;

  const totalLifeCover = data.lifeInsurance.reduce((sum, item) => sum + Number(item.sumAssured || 0), 0);
  const totalLifePremium = data.lifeInsurance.reduce((sum, item) => sum + Number(item.premium || 0), 0);
  const totalHealthPremium = data.healthInsurance.reduce((sum, item) => sum + Number(item.premium || 0), 0);

  const recommendedLifeCover = totalGrossAnnualIncome * 10;
  const lifeCoverageGap = recommendedLifeCover - totalLifeCover;

  const currentYear = new Date().getFullYear();
  const calculatedGoals = data.goals.map(g => {
    const yearsRemaining = Number(g.targetYear || currentYear) - currentYear;
    const monthsRemaining = Math.max(yearsRemaining * 12, 1);
    const sipRequired = Math.max(Math.round((Number(g.targetCorpus || 0) - Number(g.alreadySaved || 0)) / monthsRemaining), 0);
    return {
      ...g,
      sipRequired
    };
  });

  const totalCorpusTarget = data.goals.reduce((sum, g) => sum + Number(g.targetCorpus || 0), 0);
  const totalSipRequired = calculatedGoals.reduce((sum, g) => sum + g.sipRequired, 0);

  // State update helpers
  const updateField = (key: keyof DiscoveryData, val: any) => {
    setData(prev => ({
      ...prev,
      [key]: val
    }));
  };

  const handleListChange = <T extends {}>(listName: keyof DiscoveryData, id: string, key: keyof T, val: any) => {
    setData(prev => {
      const list = prev[listName] as unknown as T[];
      const updated = list.map((item: any) => {
        if (item.id === id) {
          return { ...item, [key]: val };
        }
        return item;
      });
      return {
        ...prev,
        [listName]: updated
      };
    });
  };

  const addListRow = (listName: keyof DiscoveryData, template: any) => {
    setData(prev => {
      const list = prev[listName] as any[];
      const newRow = { ...template, id: (list.length + 1).toString() };
      return {
        ...prev,
        [listName]: [...list, newRow]
      };
    });
  };

  const removeListRow = (listName: keyof DiscoveryData, id: string) => {
    setData(prev => {
      const list = prev[listName] as any[];
      const filtered = list.filter((item: any) => item.id !== id);
      const reindexed = filtered.map((item: any, idx: number) => ({
        ...item,
        id: (idx + 1).toString()
      }));
      return {
        ...prev,
        [listName]: reindexed
      };
    });
  };

  // Professional PDF Report generator
  const handleExportPDF = () => {
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

    const drawHeader = (pageNum: number, title: string) => {
      doc.setFillColor(220, 38, 38); // Red branding
      doc.rect(0, 0, 210, 22, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("MASTERCLASS | FINANCIAL DISCOVERY", 15, 10);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(title.toUpperCase(), 15, 17);

      doc.text(`Page ${pageNum} of 5`, 180, 17);
    };

    // ----------------------------------------------------
    // PAGE 1: TITLE & CLIENT SUMMARY & CASH FLOW
    // ----------------------------------------------------
    drawHeader(1, "Client Master & Cash Flow");

    doc.setTextColor(31, 41, 55);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("CLIENT SUMMARY", 15, 34);
    doc.setDrawColor(229, 231, 235);
    doc.line(15, 36, 195, 36);

    let y = 43;
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

    drawField("Client Name", data.fullName, 15, y);
    drawField("RM / Advisor", data.advisor, 75, y);
    drawField("Meeting Date", data.meetingDate, 135, y);

    y += 14;
    drawField("Occupation", data.occupation, 15, y);
    drawField("Dependents", data.dependents, 75, y);
    drawField("Risk Profile", data.assessedRiskProfile, 135, y);

    // Income fields
    y += 18;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(31, 41, 55);
    doc.text("INCOME SUMMARY", 15, y);
    doc.line(15, y + 2, 195, y + 2);

    y += 10;
    const drawRow = (label: string, val: number, yPos: number) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(75, 85, 99);
      doc.text(label, 15, yPos);
      doc.setFont("helvetica", "bold");
      doc.text(formatIndianCurrency(val), 195, yPos, { align: "right" });
    };

    drawRow("Primary Income (Salary / Business)", data.primaryIncome, y);
    y += 6;
    drawRow("Rental Income", data.rentalIncome, y);
    y += 6;
    drawRow("Dividend / Interest Income", data.dividendIncome, y);
    y += 6;
    drawRow("Pension / Annuity", data.pensionIncome, y);
    y += 6;
    drawRow("Other Income", data.otherIncome, y);
    y += 6;
    doc.line(15, y, 195, y);
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(220, 38, 38);
    doc.text("TOTAL GROSS ANNUAL INCOME", 15, y);
    doc.text(formatIndianCurrency(totalGrossAnnualIncome), 195, y, { align: "right" });

    // Expense fields
    y += 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(31, 41, 55);
    doc.text("EXPENSE SUMMARY", 15, y);
    doc.line(15, y + 2, 195, y + 2);

    y += 10;
    drawRow("House Rent / Home Loan EMI (Monthly)", data.rentEmi, y);
    y += 6;
    drawRow("Groceries & Household (Monthly)", data.groceries, y);
    y += 6;
    drawRow("Children's Education Fees (Monthly)", data.education, y);
    y += 6;
    drawRow("All Insurance Premiums (Monthly)", data.insurance, y);
    y += 6;
    drawRow("Vehicle EMI / Transport (Monthly)", data.vehicle, y);
    y += 6;
    drawRow("Utilities & Other Expenses (Monthly)", data.utilities + data.medical + data.entertainment + data.clothing + data.otherExpenses, y);
    y += 6;
    doc.line(15, y, 195, y);
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(31, 41, 55);
    doc.text("TOTAL ANNUAL EXPENSES (Monthly * 12)", 15, y);
    doc.text(formatIndianCurrency(totalAnnualExpenses), 195, y, { align: "right" });

    y += 6;
    doc.text("NET ANNUAL SURPLUS", 15, y);
    doc.setTextColor(22, 101, 52); // Green
    doc.text(formatIndianCurrency(netAnnualSurplus), 195, y, { align: "right" });

    // ----------------------------------------------------
    // PAGE 2: NET WORTH ANALYSIS
    // ----------------------------------------------------
    doc.addPage();
    drawHeader(2, "Net Worth Analysis");

    doc.setTextColor(31, 41, 55);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("ASSETS MANAGER", 15, 34);
    doc.line(15, 36, 195, 36);

    let tableY = 42;
    doc.setFillColor(243, 244, 246);
    doc.rect(15, tableY, 180, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);
    doc.text("Description", 18, tableY + 5);
    doc.text("Category", 65, tableY + 5);
    doc.text("Current Value", 115, tableY + 5, { align: "right" });
    doc.text("Cost Value", 150, tableY + 5, { align: "right" });
    doc.text("Gain / Loss", 190, tableY + 5, { align: "right" });

    tableY += 7;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(31, 41, 55);
    data.assets.forEach(asset => {
      doc.line(15, tableY, 195, tableY);
      doc.text(safeText(asset.description), 18, tableY + 5);
      doc.text(safeText(asset.category), 65, tableY + 5);
      doc.text(formatIndianCurrency(asset.currentValue), 115, tableY + 5, { align: "right" });
      doc.text(formatIndianCurrency(asset.costValue), 150, tableY + 5, { align: "right" });
      
      const gainLoss = asset.currentValue - asset.costValue;
      doc.setTextColor(gainLoss >= 0 ? 22 : 220, gainLoss >= 0 ? 101 : 38, gainLoss >= 0 ? 52 : 38);
      doc.text(formatIndianCurrency(gainLoss), 190, tableY + 5, { align: "right" });
      doc.setTextColor(31, 41, 55);
      tableY += 8;
    });
    doc.line(15, tableY, 195, tableY);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL ASSETS", 18, tableY + 5);
    doc.text(formatIndianCurrency(totalAssets), 115, tableY + 5, { align: "right" });
    
    tableY += 15;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("LIABILITIES LOG", 15, tableY);
    doc.line(15, tableY + 2, 195, tableY + 2);
    tableY += 8;

    doc.setFillColor(243, 244, 246);
    doc.rect(15, tableY, 180, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);
    doc.text("Description", 18, tableY + 5);
    doc.text("Outstanding", 75, tableY + 5, { align: "right" });
    doc.text("Monthly EMI", 115, tableY + 5, { align: "right" });
    doc.text("Rate %", 150, tableY + 5, { align: "right" });
    doc.text("Tenure (mos)", 190, tableY + 5, { align: "right" });

    tableY += 7;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(31, 41, 55);
    data.liabilities.forEach(liab => {
      doc.line(15, tableY, 195, tableY);
      doc.text(safeText(liab.description), 18, tableY + 5);
      doc.text(formatIndianCurrency(liab.outstanding), 75, tableY + 5, { align: "right" });
      doc.text(formatIndianCurrency(liab.emi), 115, tableY + 5, { align: "right" });
      doc.text(liab.rate ? `${liab.rate}%` : "Not Provided", 150, tableY + 5, { align: "right" });
      doc.text(liab.tenure ? String(liab.tenure) : "Not Provided", 190, tableY + 5, { align: "right" });
      tableY += 8;
    });
    doc.line(15, tableY, 195, tableY);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL LIABILITIES", 18, tableY + 5);
    doc.text(formatIndianCurrency(totalLiabilities), 75, tableY + 5, { align: "right" });

    // Net worth summary block
    tableY += 16;
    doc.setFillColor(254, 242, 242);
    doc.rect(15, tableY, 180, 28, "F");
    doc.setDrawColor(220, 38, 38);
    doc.rect(15, tableY, 180, 28, "D");

    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);
    doc.text("TOTAL ASSETS", 20, tableY + 8);
    doc.text("TOTAL LIABILITIES", 70, tableY + 8);
    doc.text("NET WORTH", 120, tableY + 8);
    doc.text("DEBT-TO-ASSET RATIO", 160, tableY + 8);

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(22, 101, 52); // Green
    doc.text(formatIndianCurrency(totalAssets), 20, tableY + 18);
    doc.setTextColor(220, 38, 38); // Red
    doc.text(formatIndianCurrency(totalLiabilities), 70, tableY + 18);
    doc.setTextColor(31, 41, 55);
    doc.text(formatIndianCurrency(netWorth), 120, tableY + 18);
    doc.text(`${(debtToAssetRatio * 100).toFixed(1)}%`, 160, tableY + 18);

    // ----------------------------------------------------
    // PAGE 3: INSURANCE REVIEW
    // ----------------------------------------------------
    doc.addPage();
    drawHeader(3, "Insurance Review");

    doc.setTextColor(31, 41, 55);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("LIFE INSURANCE POLICIES", 15, 34);
    doc.line(15, 36, 195, 36);

    let insY = 42;
    doc.setFillColor(243, 244, 246);
    doc.rect(15, insY, 180, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);
    doc.text("Policy / Insurer", 18, insY + 5);
    doc.text("Type", 65, insY + 5);
    doc.text("Sum Assured", 115, insY + 5, { align: "right" });
    doc.text("Annual Premium", 150, insY + 5, { align: "right" });
    doc.text("Maturity Year", 190, insY + 5, { align: "right" });

    insY += 7;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(31, 41, 55);
    data.lifeInsurance.forEach(policy => {
      doc.line(15, insY, 195, insY);
      doc.text(safeText(policy.policy), 18, insY + 5);
      doc.text(safeText(policy.type), 65, insY + 5);
      doc.text(formatIndianCurrency(policy.sumAssured), 115, insY + 5, { align: "right" });
      doc.text(formatIndianCurrency(policy.premium), 150, insY + 5, { align: "right" });
      doc.text(policy.maturity ? String(policy.maturity) : "Not Provided", 190, insY + 5, { align: "right" });
      insY += 8;
    });
    doc.line(15, insY, 195, insY);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL LIFE SUM ASSURED", 18, insY + 5);
    doc.text(formatIndianCurrency(totalLifeCover), 115, insY + 5, { align: "right" });

    insY += 15;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("HEALTH INSURANCE PLANS", 15, insY);
    doc.line(15, insY + 2, 195, insY + 2);
    insY += 8;

    doc.setFillColor(243, 244, 246);
    doc.rect(15, insY, 180, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);
    doc.text("Insurer / Plan", 18, insY + 5);
    doc.text("Type", 65, insY + 5);
    doc.text("Sum Insured", 115, insY + 5, { align: "right" });
    doc.text("Premium", 150, insY + 5, { align: "right" });
    doc.text("Members Covered", 190, insY + 5, { align: "right" });

    insY += 7;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(31, 41, 55);
    data.healthInsurance.forEach(plan => {
      doc.line(15, insY, 195, insY);
      doc.text(safeText(plan.insurer), 18, insY + 5);
      doc.text(safeText(plan.type), 65, insY + 5);
      doc.text(formatIndianCurrency(plan.sumInsured), 115, insY + 5, { align: "right" });
      doc.text(formatIndianCurrency(plan.premium), 150, insY + 5, { align: "right" });
      doc.text(safeText(plan.members), 190, insY + 5, { align: "right" });
      insY += 8;
    });
    doc.line(15, insY, 195, insY);

    // Summary box
    insY += 16;
    doc.setFillColor(239, 246, 255);
    doc.rect(15, insY, 180, 28, "F");
    doc.setDrawColor(59, 130, 246);
    doc.rect(15, insY, 180, 28, "D");

    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);
    doc.text("EXISTING COVER", 20, insY + 8);
    doc.text("RECOMMENDED COVER", 70, insY + 8);
    doc.text("COVERAGE GAP", 120, insY + 8);
    doc.text("TOTAL ANNUAL PREMIUM", 160, insY + 8);

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(31, 41, 55);
    doc.text(formatIndianCurrency(totalLifeCover), 20, insY + 18);
    doc.text(formatIndianCurrency(recommendedLifeCover), 70, insY + 18);
    
    const gap = lifeCoverageGap > 0 ? lifeCoverageGap : 0;
    doc.setTextColor(gap > 0 ? 220 : 22, gap > 0 ? 38 : 101, gap > 0 ? 38 : 52);
    doc.text(formatIndianCurrency(gap), 120, insY + 18);
    doc.setTextColor(31, 41, 55);
    doc.text(formatIndianCurrency(totalLifePremium + totalHealthPremium), 160, insY + 18);

    // ----------------------------------------------------
    // PAGE 4: GOALS & INVESTMENT PLAN
    // ----------------------------------------------------
    doc.addPage();
    drawHeader(4, "Goals & Investment Plan");

    doc.setTextColor(31, 41, 55);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("FINANCIAL GOALS TARGET", 15, 34);
    doc.line(15, 36, 195, 36);

    let goalY = 42;
    doc.setFillColor(243, 244, 246);
    doc.rect(15, goalY, 180, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);
    doc.text("Goal Name", 18, goalY + 5);
    doc.text("Target Corpus", 80, goalY + 5, { align: "right" });
    doc.text("Current Savings", 120, goalY + 5, { align: "right" });
    doc.text("Required SIP /mo", 160, goalY + 5, { align: "right" });
    doc.text("Target Year", 190, goalY + 5, { align: "right" });

    goalY += 7;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(31, 41, 55);
    calculatedGoals.forEach(g => {
      doc.line(15, goalY, 195, goalY);
      doc.text(safeText(g.goalName), 18, goalY + 5);
      doc.text(formatIndianCurrency(g.targetCorpus), 80, goalY + 5, { align: "right" });
      doc.text(formatIndianCurrency(g.alreadySaved), 120, goalY + 5, { align: "right" });
      doc.text(formatIndianCurrency(g.sipRequired), 160, goalY + 5, { align: "right" });
      doc.text(g.targetYear ? String(g.targetYear) : "Not Provided", 190, goalY + 5, { align: "right" });
      goalY += 8;
    });
    doc.line(15, goalY, 195, goalY);
    doc.setFont("helvetica", "bold");
    doc.text("TOTALS", 18, goalY + 5);
    doc.text(formatIndianCurrency(totalCorpusTarget), 80, goalY + 5, { align: "right" });
    doc.text(formatIndianCurrency(totalSipRequired), 160, goalY + 5, { align: "right" });

    goalY += 20;
    doc.setFillColor(240, 253, 250);
    doc.rect(15, goalY, 180, 25, "F");
    doc.setDrawColor(13, 148, 136);
    doc.rect(15, goalY, 180, 25, "D");

    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);
    doc.text("TOTAL FINANCIAL CORPUS TARGET", 20, goalY + 8);
    doc.text("TOTAL MONTHLY SIP NEEDED", 110, goalY + 8);

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(31, 41, 55);
    doc.text(formatIndianCurrency(totalCorpusTarget), 20, goalY + 17);
    doc.setTextColor(13, 148, 136);
    doc.text(formatIndianCurrency(totalSipRequired), 110, goalY + 17);

    // ----------------------------------------------------
    // PAGE 5: ADVISOR ASSESSMENT & RECOMMENDATIONS
    // ----------------------------------------------------
    doc.addPage();
    drawHeader(5, "Advisor Assessment");

    doc.setTextColor(31, 41, 55);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("ADVISOR SUMMARY", 15, 34);
    doc.line(15, 36, 195, 36);

    let advY = 42;
    const drawSectionText = (title: string, content: string, yPos: number) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(75, 85, 99);
      doc.text(title, 15, yPos);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(31, 41, 55);
      const lines = doc.splitTextToSize(safeText(content), 180);
      doc.text(lines, 15, yPos + 4.5);
      return yPos + 6 + (lines.length * 4);
    };

    advY = drawSectionText("Assessed Risk Profile", data.assessedRiskProfile, advY);
    advY = drawSectionText("Key Client Concerns", data.keyClientConcerns, advY);
    advY = drawSectionText("Products Discussed", data.productsDiscussed, advY);

    advY += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(31, 41, 55);
    doc.text("RECOMMENDED PRODUCTS", 15, advY);
    doc.line(15, advY + 2, 195, advY + 2);
    advY += 8;

    doc.setFillColor(243, 244, 246);
    doc.rect(15, advY, 180, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(75, 85, 99);
    doc.text("Goal Purpose", 18, advY + 5);
    doc.text("Recommended Product", 75, advY + 5);
    doc.text("Proposed Amt", 140, advY + 5, { align: "right" });
    doc.text("Action", 165, advY + 5);
    doc.text("Timeline", 188, advY + 5);

    advY += 7;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(7.5);
    data.recommendations.forEach(rec => {
      doc.line(15, advY, 195, advY);
      doc.text(safeText(rec.goalPurpose), 18, advY + 5);
      doc.text(safeText(rec.recommendedProduct), 75, advY + 5);
      doc.text(formatIndianCurrency(rec.proposedAmount), 140, advY + 5, { align: "right" });
      doc.text(safeText(rec.action), 165, advY + 5);
      doc.text(safeText(rec.timeline), 188, advY + 5);
      advY += 7;
    });
    doc.line(15, advY, 195, advY);

    advY += 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("NEXT STEPS / ROADMAP", 15, advY);
    doc.line(15, advY + 2, 195, advY + 2);
    advY += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Advisory Service Required: ${safeText(data.advisoryServiceRequired)}`, 15, advY);
    doc.text(`Next Follow-up Date: ${safeText(data.followUpDate)}`, 85, advY);
    doc.text(`Advisor Conviction Rating: ${safeText(data.rmConvictionRating)}`, 145, advY);

    doc.save("Financial_Discovery_Advisory_Report.pdf");
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <button 
            onClick={onBack}
            className="flex items-center gap-1 text-xs font-bold text-primary hover:underline mb-1"
          >
            <ChevronLeft className="h-4 w-4" /> Back to Tools Directory
          </button>
          <h2 className="text-xl font-extrabold text-foreground flex items-center gap-2">
            <Coins className="h-6 w-6 text-primary" /> Financial Discovery Form
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Complete your master financial profile, liability logs, coverage review, and wealth goals.
          </p>
        </div>

        {/* Save & Status Actions */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          {hasUnsavedChanges && (
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider border bg-red-50 text-red-700 border-red-200 animate-pulse">
              Unsaved Changes
            </span>
          )}
          <button
            onClick={handleResetData}
            title="Reset Form Data"
            className="p-2 text-gray-500 hover:text-red-500 hover:bg-gray-100 rounded-xl transition-all border border-border"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <Button 
            onClick={handleSaveData}
            className="bg-primary hover:bg-primary/95 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"
          >
            <Save className="h-3.5 w-3.5" /> Save Form Data
          </Button>
        </div>
      </div>

      {/* Sheet Tabs */}
      <div className="flex flex-wrap border-b border-border bg-card p-1 rounded-xl gap-1 shadow-sm">
        {["Dashboard", "Client Master", "Assets & Liabilities", "Insurance Review", "Goals & Investment Plan", "Summary Report"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === tab
                ? "bg-primary text-white font-bold shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/15"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* TAB 1: DASHBOARD */}
          {activeTab === "Dashboard" && (
            <div className="space-y-6">
              {/* KPI metrics row */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="p-4 border-l-4 border-l-primary flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Annual Income</span>
                  <h3 className="text-lg font-extrabold text-foreground mt-1">{formatIndianCurrency(totalGrossAnnualIncome)}</h3>
                </Card>
                <Card className="p-4 border-l-4 border-l-gray-600 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Annual Expenses</span>
                  <h3 className="text-lg font-extrabold text-foreground mt-1">{formatIndianCurrency(totalAnnualExpenses)}</h3>
                </Card>
                <Card className="p-4 border-l-4 border-l-green-600 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Annual Surplus</span>
                  <h3 className="text-lg font-extrabold text-foreground mt-1">{formatIndianCurrency(netAnnualSurplus)}</h3>
                </Card>
                <Card className="p-4 border-l-4 border-l-indigo-600 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-semibold">Net Worth</span>
                  <h3 className="text-lg font-extrabold text-foreground mt-1">{formatIndianCurrency(netWorth)}</h3>
                </Card>
                <Card className="p-4 border-l-4 border-l-yellow-600 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Life Cover</span>
                  <h3 className="text-lg font-extrabold text-foreground mt-1">{formatIndianCurrency(totalLifeCover)}</h3>
                </Card>
                <Card className="p-4 border-l-4 border-l-orange-600 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Life Coverage Gap</span>
                  <h3 className="text-lg font-extrabold text-foreground mt-1">{formatIndianCurrency(lifeCoverageGap)}</h3>
                </Card>
                <Card className="p-4 border-l-4 border-l-teal-600 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-semibold">Total Target Goals</span>
                  <h3 className="text-lg font-extrabold text-foreground mt-1">{formatIndianCurrency(totalCorpusTarget)}</h3>
                </Card>
                <Card className="p-4 border-l-4 border-l-purple-600 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-semibold">Total SIP Required</span>
                  <h3 className="text-lg font-extrabold text-foreground mt-1">{formatIndianCurrency(totalSipRequired)}</h3>
                </Card>
              </div>

              {/* Recharts Graphical Dashboards */}
              <div className="grid gap-6 lg:grid-cols-3">
                <Card className="p-5">
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 border-b border-border pb-3 mb-5">
                    <BarChart3 className="h-4.5 w-4.5 text-primary" /> Assets vs Liabilities
                  </h4>
                  <div className="h-56">
                    {totalAssets === 0 && totalLiabilities === 0 ? (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                        No assets or liabilities configured.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                          { name: "Assets", amount: totalAssets, color: "#166534" },
                          { name: "Liabilities", amount: totalLiabilities, color: "#DC2626" }
                        ]}>
                          <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 600 }} />
                          <YAxis tick={{ fontSize: 9 }} />
                          <Tooltip formatter={(value) => formatIndianCurrency(Number(value))} />
                          <Bar dataKey="amount" radius={[4, 4, 0, 0]} barSize={45}>
                            <Cell fill="#166534" />
                            <Cell fill="#DC2626" />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </Card>

                <Card className="p-5">
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 border-b border-border pb-3 mb-5">
                    <PieIcon className="h-4.5 w-4.5 text-primary" /> Goal Target Distribution
                  </h4>
                  <div className="h-56">
                    {data.goals.length === 0 || totalCorpusTarget === 0 ? (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                        No financial goals configured.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.goals.map((g, idx) => ({
                              name: g.goalName || `Goal ${idx+1}`,
                              value: g.targetCorpus
                            })).filter(g => g.value > 0)}
                            cx="50%"
                            cy="45%"
                            innerRadius={50}
                            outerRadius={75}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {data.goals.map((_, idx) => (
                              <Cell key={`cell-${idx}`} fill={["#DC2626", "#166534", "#4B5563", "#EA580C", "#9333EA"][idx % 5]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatIndianCurrency(Number(value))} />
                          <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 9 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </Card>

                <Card className="p-5">
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 border-b border-border pb-3 mb-5">
                    <ShieldAlert className="h-4.5 w-4.5 text-primary" /> Life Insurance Adequacy Gap
                  </h4>
                  <div className="h-56">
                    {recommendedLifeCover === 0 && totalLifeCover === 0 ? (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                        No life insurance coverage data configured.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                          { name: "Recommended", amount: recommendedLifeCover },
                          { name: "Existing Cover", amount: totalLifeCover },
                          { name: "Coverage Gap", amount: lifeCoverageGap > 0 ? lifeCoverageGap : 0 }
                        ]}>
                          <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 600 }} />
                          <YAxis tick={{ fontSize: 9 }} />
                          <Tooltip formatter={(value) => formatIndianCurrency(Number(value))} />
                          <Bar dataKey="amount" radius={[4, 4, 0, 0]} barSize={35}>
                            <Cell fill="#4B5563" />
                            <Cell fill="#166534" />
                            <Cell fill="#DC2626" />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 2: CLIENT MASTER */}
          {activeTab === "Client Master" && (
            <Card className="p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Client Profile & Cash Flow</h3>
                <Button 
                  onClick={handleExportPDF}
                  variant="outline" 
                  className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg border-border"
                >
                  <Download className="h-3.5 w-3.5" /> Download Report
                </Button>
              </div>

              {/* Section A: Identification */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-primary uppercase border-b border-primary/10 pb-1">A. Client Identification</h4>
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Full Name</label>
                    <input 
                      type="text" 
                      value={data.fullName}
                      onChange={(e) => updateField("fullName", e.target.value)}
                      className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Date of Birth</label>
                    <input 
                      type="date" 
                      value={data.dob}
                      onChange={(e) => updateField("dob", e.target.value)}
                      className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">PAN Number</label>
                    <input 
                      type="text" 
                      value={data.pan}
                      onChange={(e) => updateField("pan", e.target.value)}
                      className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Mobile</label>
                    <input 
                      type="text" 
                      value={data.mobile}
                      onChange={(e) => updateField("mobile", e.target.value)}
                      className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Email Address</label>
                    <input 
                      type="email" 
                      value={data.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Aadhaar (Last 4)</label>
                    <input 
                      type="text" 
                      value={data.aadhaar}
                      onChange={(e) => updateField("aadhaar", e.target.value)}
                      className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs"
                      maxLength={4}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">City</label>
                    <input 
                      type="text" 
                      value={data.city}
                      onChange={(e) => updateField("city", e.target.value)}
                      className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">RM / Advisor</label>
                    <input 
                      type="text" 
                      value={data.advisor}
                      onChange={(e) => updateField("advisor", e.target.value)}
                      className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Residency Status</label>
                    <select 
                      value={data.residency}
                      onChange={(e) => updateField("residency", e.target.value)}
                      className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs"
                    >
                      {residencyOptions.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Meeting Date</label>
                    <input 
                      type="date" 
                      value={data.meetingDate}
                      onChange={(e) => updateField("meetingDate", e.target.value)}
                      className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Client ID</label>
                    <input 
                      type="text" 
                      value={data.clientId}
                      onChange={(e) => updateField("clientId", e.target.value)}
                      className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Review Type</label>
                    <select 
                      value={data.reviewType}
                      onChange={(e) => updateField("reviewType", e.target.value)}
                      className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs"
                    >
                      {reviewTypeOptions.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Occupation</label>
                    <input 
                      type="text" 
                      value={data.occupation}
                      onChange={(e) => updateField("occupation", e.target.value)}
                      className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Employer / Business</label>
                    <input 
                      type="text" 
                      value={data.employer}
                      onChange={(e) => updateField("employer", e.target.value)}
                      className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Tax Slab</label>
                    <select 
                      value={data.taxSlab}
                      onChange={(e) => updateField("taxSlab", e.target.value)}
                      className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs"
                    >
                      {taxSlabOptions.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Dependents</label>
                    <input 
                      type="number" 
                      value={data.dependents}
                      onChange={(e) => updateField("dependents", e.target.value)}
                      className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 bg-muted/20 p-3 rounded-lg border border-border mt-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Nominee Name</label>
                    <input 
                      type="text" 
                      value={data.nomineeName}
                      onChange={(e) => updateField("nomineeName", e.target.value)}
                      className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Relation</label>
                    <select 
                      value={data.nomineeRelation}
                      onChange={(e) => updateField("nomineeRelation", e.target.value)}
                      className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs"
                    >
                      {relationOptions.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Nominee DOB</label>
                    <input 
                      type="date" 
                      value={data.nomineeDob}
                      onChange={(e) => updateField("nomineeDob", e.target.value)}
                      className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Nominee PAN</label>
                    <input 
                      type="text" 
                      value={data.nomineePan}
                      onChange={(e) => updateField("nomineePan", e.target.value)}
                      className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Section B: Income & Cash Flow */}
              <div className="space-y-4 pt-4 border-t border-border">
                <h4 className="text-xs font-bold text-primary uppercase border-b border-primary/10 pb-1">B. Income & Cash Flow</h4>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border text-xs">
                    <thead>
                      <tr className="bg-muted/30">
                        <th className="px-3 py-2 text-left font-bold">Income Source</th>
                        <th className="px-3 py-2 text-right font-bold w-40">Annual Amount (₹)</th>
                        <th className="px-3 py-2 text-left font-bold w-36">Frequency</th>
                        <th className="px-3 py-2 text-left font-bold w-32">Taxable?</th>
                        <th className="px-3 py-2 text-left font-bold">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr>
                        <td className="px-3 py-2 font-medium">Primary Income (Salary / Business)</td>
                        <td className="px-3 py-2"><input type="number" value={data.primaryIncome} onChange={(e) => updateField("primaryIncome", Number(e.target.value))} className="w-full text-right px-2 py-1 bg-background border border-border rounded" /></td>
                        <td className="px-3 py-2"><span className="text-muted-foreground font-semibold">Annually</span></td>
                        <td className="px-3 py-2"><select className="w-full px-1.5 py-1 bg-background border border-border rounded"><option>Yes</option><option>No</option><option>Partially</option></select></td>
                        <td className="px-3 py-2"><input type="text" className="w-full px-2 py-1 bg-background border border-border rounded" placeholder="Notes..." /></td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-medium">Rental Income</td>
                        <td className="px-3 py-2"><input type="number" value={data.rentalIncome} onChange={(e) => updateField("rentalIncome", Number(e.target.value))} className="w-full text-right px-2 py-1 bg-background border border-border rounded" /></td>
                        <td className="px-3 py-2"><span className="text-muted-foreground font-semibold">Annually</span></td>
                        <td className="px-3 py-2"><select className="w-full px-1.5 py-1 bg-background border border-border rounded"><option>Yes</option><option>No</option><option>Partially</option></select></td>
                        <td className="px-3 py-2"><input type="text" className="w-full px-2 py-1 bg-background border border-border rounded" placeholder="Notes..." /></td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-medium">Dividend / Interest Income</td>
                        <td className="px-3 py-2"><input type="number" value={data.dividendIncome} onChange={(e) => updateField("dividendIncome", Number(e.target.value))} className="w-full text-right px-2 py-1 bg-background border border-border rounded" /></td>
                        <td className="px-3 py-2"><span className="text-muted-foreground font-semibold">Annually</span></td>
                        <td className="px-3 py-2"><select className="w-full px-1.5 py-1 bg-background border border-border rounded"><option>Yes</option><option>No</option><option>Partially</option></select></td>
                        <td className="px-3 py-2"><input type="text" className="w-full px-2 py-1 bg-background border border-border rounded" placeholder="Notes..." /></td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-medium">Pension / Annuity</td>
                        <td className="px-3 py-2"><input type="number" value={data.pensionIncome} onChange={(e) => updateField("pensionIncome", Number(e.target.value))} className="w-full text-right px-2 py-1 bg-background border border-border rounded" /></td>
                        <td className="px-3 py-2"><span className="text-muted-foreground font-semibold">Annually</span></td>
                        <td className="px-3 py-2"><select className="w-full px-1.5 py-1 bg-background border border-border rounded"><option>Yes</option><option>No</option><option>Partially</option></select></td>
                        <td className="px-3 py-2"><input type="text" className="w-full px-2 py-1 bg-background border border-border rounded" placeholder="Notes..." /></td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-medium">Other Income</td>
                        <td className="px-3 py-2"><input type="number" value={data.otherIncome} onChange={(e) => updateField("otherIncome", Number(e.target.value))} className="w-full text-right px-2 py-1 bg-background border border-border rounded" /></td>
                        <td className="px-3 py-2"><span className="text-muted-foreground font-semibold">Annually</span></td>
                        <td className="px-3 py-2"><select className="w-full px-1.5 py-1 bg-background border border-border rounded"><option>Yes</option><option>No</option><option>Partially</option></select></td>
                        <td className="px-3 py-2"><input type="text" className="w-full px-2 py-1 bg-background border border-border rounded" placeholder="Notes..." /></td>
                      </tr>
                      <tr className="bg-green-500/10 font-bold border-t-2 border-border">
                        <td className="px-3 py-2 text-primary">TOTAL GROSS ANNUAL INCOME</td>
                        <td className="px-3 py-2 text-right text-primary">{formatIndianCurrency(totalGrossAnnualIncome)}</td>
                        <td colSpan={3} className="px-3 py-2"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section C: Household Expenses */}
              <div className="space-y-4 pt-4 border-t border-border">
                <h4 className="text-xs font-bold text-primary uppercase border-b border-primary/10 pb-1">C. Monthly Household Expenses</h4>
                
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2 text-xs">
                    {[
                      { label: "House Rent / Home Loan EMI", key: "rentEmi" },
                      { label: "Groceries & Household", key: "groceries" },
                      { label: "Children's Education Fees", key: "education" },
                      { label: "All Insurance Premiums", key: "insurance" },
                      { label: "Vehicle EMI / Transport", key: "vehicle" }
                    ].map(item => (
                      <div key={item.key} className="flex justify-between items-center gap-3">
                        <span className="font-semibold text-muted-foreground">{item.label}</span>
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            value={(data as any)[item.key]} 
                            onChange={(e) => updateField(item.key as any, Number(e.target.value))}
                            className="w-28 text-right px-2.5 py-1 bg-background border border-border rounded text-xs" 
                          />
                          <span className="text-[10px] text-muted-foreground font-mono w-24 text-right">
                            {formatIndianCurrency(Number((data as any)[item.key]) * 12)} /yr
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 text-xs">
                    {[
                      { label: "Utilities (Power, Internet, etc.)", key: "utilities" },
                      { label: "Medical / Healthcare", key: "medical" },
                      { label: "Entertainment & Dining", key: "entertainment" },
                      { label: "Clothing & Personal Care", key: "clothing" },
                      { label: "Other Regular Expenses", key: "otherExpenses" }
                    ].map(item => (
                      <div key={item.key} className="flex justify-between items-center gap-3">
                        <span className="font-semibold text-muted-foreground">{item.label}</span>
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            value={(data as any)[item.key]} 
                            onChange={(e) => updateField(item.key as any, Number(e.target.value))}
                            className="w-28 text-right px-2.5 py-1 bg-background border border-border rounded text-xs" 
                          />
                          <span className="text-[10px] text-muted-foreground font-mono w-24 text-right">
                            {formatIndianCurrency(Number((data as any)[item.key]) * 12)} /yr
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 bg-green-500/10 p-3 rounded-lg border border-green-600/25 mt-4 text-xs font-bold text-primary">
                  <div className="flex justify-between">
                    <span>TOTAL MONTHLY EXPENSES:</span>
                    <span>{formatIndianCurrency(totalMonthlyExpenses)}</span>
                  </div>
                  <div className="flex justify-between border-l border-border pl-4">
                    <span>TOTAL ANNUAL EXPENSES:</span>
                    <span>{formatIndianCurrency(totalAnnualExpenses)}</span>
                  </div>
                </div>
              </div>

              {/* Section D: Investable Surplus Analysis */}
              <div className="space-y-4 pt-4 border-t border-border">
                <h4 className="text-xs font-bold text-primary uppercase border-b border-primary/10 pb-1">D. Investable Surplus Analysis</h4>
                
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Annual Loan EMIs</label>
                    <input 
                      type="number" 
                      value={data.annualLoanEmi}
                      onChange={(e) => updateField("annualLoanEmi", Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Annual Insurance Premiums</label>
                    <input 
                      type="number" 
                      value={data.annualInsurancePremium}
                      onChange={(e) => updateField("annualInsurancePremium", Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Estimated Annual Tax Liability</label>
                    <input 
                      type="number" 
                      value={data.annualTax}
                      onChange={(e) => updateField("annualTax", Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs text-right"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 bg-primary/10 p-3 rounded-lg border border-primary/20 mt-4 text-xs font-bold text-primary">
                  <div className="flex justify-between">
                    <span>NET ANNUAL INVESTABLE SURPLUS:</span>
                    <span>{formatIndianCurrency(netAnnualSurplus)}</span>
                  </div>
                  <div className="flex justify-between border-l border-border pl-4">
                    <span>EST. MONTHLY SIP CAPACITY:</span>
                    <span>{formatIndianCurrency(estimatedMonthlySipCapacity)}</span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* TAB 3: ASSETS & LIABILITIES */}
          {activeTab === "Assets & Liabilities" && (
            <Card className="p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Assets & Liabilities Manager</h3>
                <Button 
                  onClick={handleExportPDF}
                  variant="outline" 
                  className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg border-border"
                >
                  <Download className="h-3.5 w-3.5" /> Download Report
                </Button>
              </div>

              {/* Dynamic Assets table */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-primary uppercase">Assets</h4>
                  <button 
                    onClick={() => addListRow("assets", { description: "", category: "MF – Equity", currentValue: 0, costValue: 0, liquid: "Yes", notes: "" })}
                    className="flex items-center gap-1 text-[10px] font-bold text-green-700 hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Asset
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border text-xs">
                    <thead>
                      <tr className="bg-muted/30">
                        <th className="px-3 py-2 text-left font-bold">Asset Description</th>
                        <th className="px-3 py-2 text-left font-bold w-44">Category</th>
                        <th className="px-3 py-2 text-right font-bold w-32">Current Value (₹)</th>
                        <th className="px-3 py-2 text-right font-bold w-32">Invested Cost (₹)</th>
                        <th className="px-3 py-2 text-right font-bold w-32">Gain / Loss (₹)</th>
                        <th className="px-3 py-2 text-center font-bold w-24">Liquid?</th>
                        <th className="px-3 py-2 text-left w-24">Notes</th>
                        <th className="px-3 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.assets.map(asset => (
                        <tr key={asset.id}>
                          <td className="px-3 py-1.5"><input type="text" value={asset.description} onChange={(e) => handleListChange("assets", asset.id, "description", e.target.value)} className="w-full px-2 py-1 bg-background border border-border rounded" placeholder="e.g. Mutual Funds" /></td>
                          <td className="px-3 py-1.5">
                            <select value={asset.category} onChange={(e) => handleListChange("assets", asset.id, "category", e.target.value)} className="w-full px-1.5 py-1 bg-background border border-border rounded">
                              {assetCategoryOptions.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-1.5"><input type="number" value={asset.currentValue} onChange={(e) => handleListChange("assets", asset.id, "currentValue", Number(e.target.value))} className="w-full text-right px-2 py-1 bg-background border border-border rounded" /></td>
                          <td className="px-3 py-1.5"><input type="number" value={asset.costValue} onChange={(e) => handleListChange("assets", asset.id, "costValue", Number(e.target.value))} className="w-full text-right px-2 py-1 bg-background border border-border rounded" /></td>
                          <td className="px-3 py-1.5 text-right font-semibold text-muted-foreground font-mono">{formatIndianCurrency(asset.currentValue - asset.costValue)}</td>
                          <td className="px-3 py-1.5">
                            <select value={asset.liquid} onChange={(e) => handleListChange("assets", asset.id, "liquid", e.target.value)} className="w-full px-1 py-1 bg-background border border-border rounded text-center">
                              <option>Yes</option>
                              <option>No</option>
                            </select>
                          </td>
                          <td className="px-3 py-1.5"><input type="text" value={asset.notes} onChange={(e) => handleListChange("assets", asset.id, "notes", e.target.value)} className="w-full px-2 py-1 bg-background border border-border rounded" placeholder="Optional" /></td>
                          <td className="px-3 py-1.5 text-center">
                            <button onClick={() => removeListRow("assets", asset.id)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-green-500/10 font-bold border-t-2 border-border">
                        <td className="px-3 py-2 text-primary">TOTAL ASSETS</td>
                        <td colSpan={1}></td>
                        <td className="px-3 py-2 text-right text-primary">{formatIndianCurrency(totalAssets)}</td>
                        <td colSpan={5}></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Dynamic Liabilities table */}
              <div className="space-y-3 pt-4 border-t border-border">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-primary uppercase">Liabilities</h4>
                  <button 
                    onClick={() => addListRow("liabilities", { description: "", type: "Home Loan", outstanding: 0, emi: 0, rate: 0, tenure: 0, notes: "" })}
                    className="flex items-center gap-1 text-[10px] font-bold text-green-700 hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Liability
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border text-xs">
                    <thead>
                      <tr className="bg-muted/30">
                        <th className="px-3 py-2 text-left font-bold">Description</th>
                        <th className="px-3 py-2 text-left font-bold w-40">Type</th>
                        <th className="px-3 py-2 text-right font-bold w-28">Outstanding (₹)</th>
                        <th className="px-3 py-2 text-right font-bold w-28">Monthly EMI (₹)</th>
                        <th className="px-3 py-2 text-right font-bold w-20">Rate %</th>
                        <th className="px-3 py-2 text-right font-bold w-20">Tenure (mo)</th>
                        <th className="px-3 py-2">Notes</th>
                        <th className="px-3 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.liabilities.map(liab => (
                        <tr key={liab.id}>
                          <td className="px-3 py-1.5"><input type="text" value={liab.description} onChange={(e) => handleListChange("liabilities", liab.id, "description", e.target.value)} className="w-full px-2 py-1 bg-background border border-border rounded" placeholder="e.g. SBI Home Loan" /></td>
                          <td className="px-3 py-1.5">
                            <select value={liab.type} onChange={(e) => handleListChange("liabilities", liab.id, "type", e.target.value)} className="w-full px-1.5 py-1 bg-background border border-border rounded">
                              {liabilityTypeOptions.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-1.5"><input type="number" value={liab.outstanding} onChange={(e) => handleListChange("liabilities", liab.id, "outstanding", Number(e.target.value))} className="w-full text-right px-2 py-1 bg-background border border-border rounded" /></td>
                          <td className="px-3 py-1.5"><input type="number" value={liab.emi} onChange={(e) => handleListChange("liabilities", liab.id, "emi", Number(e.target.value))} className="w-full text-right px-2 py-1 bg-background border border-border rounded" /></td>
                          <td className="px-3 py-1.5"><input type="number" value={liab.rate} onChange={(e) => handleListChange("liabilities", liab.id, "rate", Number(e.target.value))} className="w-full text-right px-2 py-1 bg-background border border-border rounded" step="0.1" /></td>
                          <td className="px-3 py-1.5"><input type="number" value={liab.tenure} onChange={(e) => handleListChange("liabilities", liab.id, "tenure", Number(e.target.value))} className="w-full text-right px-2 py-1 bg-background border border-border rounded" /></td>
                          <td className="px-3 py-1.5"><input type="text" value={liab.notes} onChange={(e) => handleListChange("liabilities", liab.id, "notes", e.target.value)} className="w-full px-2 py-1 bg-background border border-border rounded" placeholder="Optional" /></td>
                          <td className="px-3 py-1.5 text-center">
                            <button onClick={() => removeListRow("liabilities", liab.id)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-red-500/10 font-bold border-t-2 border-border">
                        <td className="px-3 py-2 text-primary">TOTAL LIABILITIES</td>
                        <td colSpan={1}></td>
                        <td className="px-3 py-2 text-right text-primary">{formatIndianCurrency(totalLiabilities)}</td>
                        <td className="px-3 py-2 text-right text-primary">{formatIndianCurrency(totalMonthlyEmi)}</td>
                        <td colSpan={4}></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Net worth summary cards */}
              <div className="grid gap-4 sm:grid-cols-2 bg-muted/20 p-4 rounded-xl border border-border mt-4 text-xs font-bold text-foreground">
                <div className="flex justify-between">
                  <span>NET WORTH (Assets − Liabilities):</span>
                  <span className="text-green-700 font-extrabold text-sm">{formatIndianCurrency(netWorth)}</span>
                </div>
                <div className="flex justify-between border-l border-border pl-4">
                  <span>DEBT-TO-ASSET RATIO (Target &lt; 40%):</span>
                  <span className={debtToAssetRatio > 0.4 ? "text-red-600 font-extrabold" : "text-green-700 font-extrabold"}>
                    {(debtToAssetRatio * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </Card>
          )}

          {/* TAB 4: INSURANCE REVIEW */}
          {activeTab === "Insurance Review" && (
            <Card className="p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Insurance Adequacy Review</h3>
                <Button 
                  onClick={handleExportPDF}
                  variant="outline" 
                  className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg border-border"
                >
                  <Download className="h-3.5 w-3.5" /> Download Report
                </Button>
              </div>

              {/* Life Insurance Policies Table */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-primary uppercase">Life Insurance Policies</h4>
                  <button 
                    onClick={() => addListRow("lifeInsurance", { policy: "", type: "Term Life", sumAssured: 0, premium: 0, term: 0, maturity: 0, nominee: "", status: "Review Only" })}
                    className="flex items-center gap-1 text-[10px] font-bold text-green-700 hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Policy
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border text-xs">
                    <thead>
                      <tr className="bg-muted/30">
                        <th className="px-3 py-2 text-left font-bold">Policy / Insurer</th>
                        <th className="px-3 py-2 text-left font-bold w-40">Type</th>
                        <th className="px-3 py-2 text-right font-bold w-28">Sum Assured (₹)</th>
                        <th className="px-3 py-2 text-right font-bold w-28">Annual Premium (₹)</th>
                        <th className="px-3 py-2 text-right font-bold w-20">Term (Yrs)</th>
                        <th className="px-3 py-2 text-right font-bold w-20">Maturity Yr</th>
                        <th className="px-3 py-2">Nominee</th>
                        <th className="px-3 py-2 w-28">Status</th>
                        <th className="px-3 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.lifeInsurance.map(policy => (
                        <tr key={policy.id}>
                          <td className="px-3 py-1.5"><input type="text" value={policy.policy} onChange={(e) => handleListChange("lifeInsurance", policy.id, "policy", e.target.value)} className="w-full px-2 py-1 bg-background border border-border rounded" placeholder="e.g. LIC Jeevan Anand" /></td>
                          <td className="px-3 py-1.5">
                            <select value={policy.type} onChange={(e) => handleListChange("lifeInsurance", policy.id, "type", e.target.value)} className="w-full px-1.5 py-1 bg-background border border-border rounded">
                              {insuranceTypeOptions.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-1.5"><input type="number" value={policy.sumAssured} onChange={(e) => handleListChange("lifeInsurance", policy.id, "sumAssured", Number(e.target.value))} className="w-full text-right px-2 py-1 bg-background border border-border rounded" /></td>
                          <td className="px-3 py-1.5"><input type="number" value={policy.premium} onChange={(e) => handleListChange("lifeInsurance", policy.id, "premium", Number(e.target.value))} className="w-full text-right px-2 py-1 bg-background border border-border rounded" /></td>
                          <td className="px-3 py-1.5"><input type="number" value={policy.term} onChange={(e) => handleListChange("lifeInsurance", policy.id, "term", Number(e.target.value))} className="w-full text-right px-2 py-1 bg-background border border-border rounded" /></td>
                          <td className="px-3 py-1.5"><input type="number" value={policy.maturity} onChange={(e) => handleListChange("lifeInsurance", policy.id, "maturity", Number(e.target.value))} className="w-full text-right px-2 py-1 bg-background border border-border rounded" /></td>
                          <td className="px-3 py-1.5"><input type="text" value={policy.nominee} onChange={(e) => handleListChange("lifeInsurance", policy.id, "nominee", e.target.value)} className="w-full px-2 py-1 bg-background border border-border rounded" placeholder="Nominee" /></td>
                          <td className="px-3 py-1.5">
                            <select value={policy.status} onChange={(e) => handleListChange("lifeInsurance", policy.id, "status", e.target.value)} className="w-full px-1 py-1 bg-background border border-border rounded">
                              {actionOptions.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            <button onClick={() => removeListRow("lifeInsurance", policy.id)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-green-500/10 font-bold border-t-2 border-border">
                        <td className="px-3 py-2 text-primary">TOTAL LIFE COVER / PREMIUMS</td>
                        <td colSpan={1}></td>
                        <td className="px-3 py-2 text-right text-primary">{formatIndianCurrency(totalLifeCover)}</td>
                        <td className="px-3 py-2 text-right text-primary">{formatIndianCurrency(totalLifePremium)}</td>
                        <td colSpan={5}></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Coverage Adequacy Check */}
              <div className="space-y-4 pt-4 border-t border-border">
                <h4 className="text-xs font-bold text-primary uppercase border-b border-primary/10 pb-1">Coverage Adequacy Check</h4>
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 text-xs font-semibold text-muted-foreground bg-muted/20 p-4 rounded-xl border border-border">
                  <div>
                    <span>Gross Annual Income (auto):</span>
                    <span className="block text-foreground font-bold mt-1 text-sm">{formatIndianCurrency(totalGrossAnnualIncome)}</span>
                  </div>
                  <div>
                    <span>Recommended Cover (10x income):</span>
                    <span className="block text-foreground font-bold mt-1 text-sm">{formatIndianCurrency(recommendedLifeCover)}</span>
                  </div>
                  <div>
                    <span>Existing Total Cover:</span>
                    <span className="block text-foreground font-bold mt-1 text-sm">{formatIndianCurrency(totalLifeCover)}</span>
                  </div>
                  <div>
                    <span>Coverage Adequacy Gap:</span>
                    <span className={`block font-extrabold mt-1 text-sm ${lifeCoverageGap > 0 ? "text-red-600" : "text-green-700"}`}>
                      {formatIndianCurrency(lifeCoverageGap)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Health Insurance policies */}
              <div className="space-y-3 pt-4 border-t border-border">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-primary uppercase">Health & General Insurance</h4>
                  <button 
                    onClick={() => addListRow("healthInsurance", { insurer: "", type: "Health – Family Floater", sumInsured: 0, premium: 0, members: "Self", floater: "Yes", expiry: "", remarks: "" })}
                    className="flex items-center gap-1 text-[10px] font-bold text-green-700 hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Health Plan
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border text-xs">
                    <thead>
                      <tr className="bg-muted/30">
                        <th className="px-3 py-2 text-left font-bold">Insurer / Plan</th>
                        <th className="px-3 py-2 text-left font-bold w-40">Type</th>
                        <th className="px-3 py-2 text-right font-bold w-28">Sum Insured (₹)</th>
                        <th className="px-3 py-2 text-right font-bold w-28">Premium (₹)</th>
                        <th className="px-3 py-2 text-left w-32">Members Covered</th>
                        <th className="px-3 py-2 text-center w-20">Floater?</th>
                        <th className="px-3 py-2 w-28">Expiry</th>
                        <th className="px-3 py-2">Remarks</th>
                        <th className="px-3 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.healthInsurance.map(plan => (
                        <tr key={plan.id}>
                          <td className="px-3 py-1.5"><input type="text" value={plan.insurer} onChange={(e) => handleListChange("healthInsurance", plan.id, "insurer", e.target.value)} className="w-full px-2 py-1 bg-background border border-border rounded" placeholder="e.g. Care Supreme" /></td>
                          <td className="px-3 py-1.5">
                            <select value={plan.type} onChange={(e) => handleListChange("healthInsurance", plan.id, "type", e.target.value)} className="w-full px-1.5 py-1 bg-background border border-border rounded">
                              {healthTypeOptions.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-1.5"><input type="number" value={plan.sumInsured} onChange={(e) => handleListChange("healthInsurance", plan.id, "sumInsured", Number(e.target.value))} className="w-full text-right px-2 py-1 bg-background border border-border rounded" /></td>
                          <td className="px-3 py-1.5"><input type="number" value={plan.premium} onChange={(e) => handleListChange("healthInsurance", plan.id, "premium", Number(e.target.value))} className="w-full text-right px-2 py-1 bg-background border border-border rounded" /></td>
                          <td className="px-3 py-1.5"><input type="text" value={plan.members} onChange={(e) => handleListChange("healthInsurance", plan.id, "members", e.target.value)} className="w-full px-2 py-1 bg-background border border-border rounded" placeholder="Self, spouse" /></td>
                          <td className="px-3 py-1.5">
                            <select value={plan.floater} onChange={(e) => handleListChange("healthInsurance", plan.id, "floater", e.target.value)} className="w-full px-1 py-1 bg-background border border-border rounded text-center">
                              <option>Yes</option>
                              <option>No</option>
                            </select>
                          </td>
                          <td className="px-3 py-1.5"><input type="date" value={plan.expiry} onChange={(e) => handleListChange("healthInsurance", plan.id, "expiry", e.target.value)} className="w-full px-2 py-1 bg-background border border-border rounded" /></td>
                          <td className="px-3 py-1.5"><input type="text" value={plan.remarks} onChange={(e) => handleListChange("healthInsurance", plan.id, "remarks", e.target.value)} className="w-full px-2 py-1 bg-background border border-border rounded" placeholder="Remarks" /></td>
                          <td className="px-3 py-1.5 text-center">
                            <button onClick={() => removeListRow("healthInsurance", plan.id)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-green-500/10 font-bold border-t-2 border-border">
                        <td className="px-3 py-2 text-primary">TOTAL HEALTH PREMIUMS</td>
                        <td colSpan={2}></td>
                        <td className="px-3 py-2 text-right text-primary">{formatIndianCurrency(totalHealthPremium)}</td>
                        <td colSpan={5}></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          )}

          {/* TAB 5: GOALS & INVESTMENT PLAN */}
          {activeTab === "Goals & Investment Plan" && (
            <Card className="p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Goals & Product Mapping</h3>
                <Button 
                  onClick={handleExportPDF}
                  variant="outline" 
                  className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg border-border"
                >
                  <Download className="h-3.5 w-3.5" /> Download Report
                </Button>
              </div>

              {/* SECTION A: FINANCIAL GOALS PLANNER */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-primary uppercase">Financial Goals Planner</h4>
                  <button 
                    onClick={() => addListRow("goals", { goalName: "", goalType: "Retirement", targetYear: new Date().getFullYear() + 15, targetCorpus: 0, alreadySaved: 0, priority: "Moderate" })}
                    className="flex items-center gap-1 text-[10px] font-bold text-green-700 hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Goal
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border text-xs">
                    <thead>
                      <tr className="bg-muted/30">
                        <th className="px-3 py-2 text-left font-bold">Goal Description</th>
                        <th className="px-3 py-2 text-left font-bold w-40">Goal Type</th>
                        <th className="px-3 py-2 text-right font-bold w-24">Target Year</th>
                        <th className="px-3 py-2 text-right font-bold w-32">Target Corpus (₹)</th>
                        <th className="px-3 py-2 text-right font-bold w-32">Already Saved (₹)</th>
                        <th className="px-3 py-2 text-right font-bold w-32">SIP Est. (₹/mo)</th>
                        <th className="px-3 py-2 w-28">Priority</th>
                        <th className="px-3 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {calculatedGoals.map(g => (
                        <tr key={g.id}>
                          <td className="px-3 py-1.5"><input type="text" value={g.goalName} onChange={(e) => handleListChange("goals", g.id, "goalName", e.target.value)} className="w-full px-2 py-1 bg-background border border-border rounded" placeholder="e.g. Higher Studies" /></td>
                          <td className="px-3 py-1.5">
                            <select value={g.goalType} onChange={(e) => handleListChange("goals", g.id, "goalType", e.target.value)} className="w-full px-1.5 py-1 bg-background border border-border rounded">
                              {goalTypeOptions.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-1.5"><input type="number" value={g.targetYear} onChange={(e) => handleListChange("goals", g.id, "targetYear", Number(e.target.value))} className="w-full text-right px-2 py-1 bg-background border border-border rounded" /></td>
                          <td className="px-3 py-1.5"><input type="number" value={g.targetCorpus} onChange={(e) => handleListChange("goals", g.id, "targetCorpus", Number(e.target.value))} className="w-full text-right px-2 py-1 bg-background border border-border rounded" /></td>
                          <td className="px-3 py-1.5"><input type="number" value={g.alreadySaved} onChange={(e) => handleListChange("goals", g.id, "alreadySaved", Number(e.target.value))} className="w-full text-right px-2 py-1 bg-background border border-border rounded" /></td>
                          <td className="px-3 py-1.5 text-right font-bold text-primary font-mono">{formatIndianCurrency(g.sipRequired)}</td>
                          <td className="px-3 py-1.5">
                            <select value={g.priority} onChange={(e) => handleListChange("goals", g.id, "priority", e.target.value)} className="w-full px-1 py-1 bg-background border border-border rounded">
                              {priorityOptions.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            <button onClick={() => removeListRow("goals", g.id)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-green-500/10 font-bold border-t-2 border-border">
                        <td className="px-3 py-2 text-primary">TOTALS</td>
                        <td colSpan={2}></td>
                        <td className="px-3 py-2 text-right text-primary">{formatIndianCurrency(totalCorpusTarget)}</td>
                        <td colSpan={1}></td>
                        <td className="px-3 py-2 text-right text-primary">{formatIndianCurrency(totalSipRequired)}</td>
                        <td colSpan={2}></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION B: PRODUCT RECOMMENDATION MAP */}
              <div className="space-y-3 pt-4 border-t border-border">
                <h4 className="text-xs font-bold text-primary uppercase">Product Recommendation Map</h4>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border text-xs">
                    <thead>
                      <tr className="bg-muted/30">
                        <th className="px-3 py-2 text-left font-bold w-56">Goal / Purpose</th>
                        <th className="px-3 py-2 text-left font-bold">Existing Product</th>
                        <th className="px-3 py-2 text-right font-bold w-28">Current Value (₹)</th>
                        <th className="px-3 py-2 text-left font-bold">Recommended Product</th>
                        <th className="px-3 py-2 text-right font-bold w-28">Proposed Amt (₹)</th>
                        <th className="px-3 py-2 w-28">Action</th>
                        <th className="px-3 py-2 w-24">Timeline</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.recommendations.map(rec => (
                        <tr key={rec.id}>
                          <td className="px-3 py-1.5 font-semibold text-muted-foreground">{rec.goalPurpose}</td>
                          <td className="px-3 py-1.5"><input type="text" value={rec.existingProduct} onChange={(e) => handleListChange("recommendations", rec.id, "existingProduct", e.target.value)} className="w-full px-2 py-1 bg-background border border-border rounded" placeholder="Product name" /></td>
                          <td className="px-3 py-1.5"><input type="number" value={rec.currentValue} onChange={(e) => handleListChange("recommendations", rec.id, "currentValue", Number(e.target.value))} className="w-full text-right px-2 py-1 bg-background border border-border rounded" /></td>
                          <td className="px-3 py-1.5"><input type="text" value={rec.recommendedProduct} onChange={(e) => handleListChange("recommendations", rec.id, "recommendedProduct", e.target.value)} className="w-full px-2 py-1 bg-background border border-border rounded" placeholder="Recommendation" /></td>
                          <td className="px-3 py-1.5"><input type="number" value={rec.proposedAmount} onChange={(e) => handleListChange("recommendations", rec.id, "proposedAmount", Number(e.target.value))} className="w-full text-right px-2 py-1 bg-background border border-border rounded" /></td>
                          <td className="px-3 py-1.5">
                            <select value={rec.action} onChange={(e) => handleListChange("recommendations", rec.id, "action", e.target.value)} className="w-full px-1 py-1 bg-background border border-border rounded">
                              {actionOptions.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-1.5"><input type="text" value={rec.timeline} onChange={(e) => handleListChange("recommendations", rec.id, "timeline", e.target.value)} className="w-full px-2 py-1 bg-background border border-border rounded" placeholder="e.g. Immediate" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION C: ADVISOR ASSESSMENT & NEXT STEPS */}
              <div className="space-y-4 pt-4 border-t border-border text-xs">
                <h4 className="text-xs font-bold text-primary uppercase border-b border-primary/10 pb-1">Advisor Assessment & Next Steps</h4>
                
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Assessed Risk Profile</label>
                    <select 
                      value={data.assessedRiskProfile}
                      onChange={(e) => updateField("assessedRiskProfile", e.target.value)}
                      className="w-full px-3 py-1.5 bg-background border border-border rounded-lg"
                    >
                      {riskProfileOptions.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Advisory Service Required</label>
                    <select 
                      value={data.advisoryServiceRequired}
                      onChange={(e) => updateField("advisoryServiceRequired", e.target.value)}
                      className="w-full px-3 py-1.5 bg-background border border-border rounded-lg"
                    >
                      {adviceTypeOptions.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Recommended Next Action</label>
                    <select 
                      value={data.recommendedNextAction}
                      onChange={(e) => updateField("recommendedNextAction", e.target.value)}
                      className="w-full px-3 py-1.5 bg-background border border-border rounded-lg"
                    >
                      {nextStepOptions.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">RM Rating conviction (1–5)</label>
                    <select 
                      value={data.rmConvictionRating}
                      onChange={(e) => updateField("rmConvictionRating", e.target.value)}
                      className="w-full px-3 py-1.5 bg-background border border-border rounded-lg"
                    >
                      {rmRatingOptions.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Key Client Concerns</label>
                    <textarea 
                      value={data.keyClientConcerns}
                      onChange={(e) => updateField("keyClientConcerns", e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg resize-none"
                      placeholder="Write any priority concerns..."
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Products Discussed Today</label>
                    <textarea 
                      value={data.productsDiscussed}
                      onChange={(e) => updateField("productsDiscussed", e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg resize-none"
                      placeholder="Products discussed with client..."
                    />
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* TAB 6: SUMMARY REPORT */}
          {activeTab === "Summary Report" && (
            <Card className="p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Executive Financial Profile</h3>
                <Button 
                  onClick={handleExportPDF}
                  className="bg-primary hover:bg-primary/95 text-white text-xs flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold"
                >
                  <Download className="h-4 w-4" /> Download Summary PDF
                </Button>
              </div>

              <div className="space-y-6 text-xs text-muted-foreground">
                <div className="grid gap-4 sm:grid-cols-3 bg-muted/10 p-4 rounded-xl border border-border text-foreground">
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Client Name</span>
                    <span className="font-extrabold text-sm block mt-1">{data.fullName || "Not Provided"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Assigned Advisor</span>
                    <span className="font-extrabold text-sm block mt-1">{data.advisor || "Not Provided"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Date Generated</span>
                    <span className="font-extrabold text-sm block mt-1">
                      {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <h4 className="font-bold text-foreground border-b border-border pb-1 text-xs uppercase">1. Cash Flow Summary</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Total Gross Annual Income:</span>
                        <span className="font-bold text-foreground">{formatIndianCurrency(totalGrossAnnualIncome)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Annual Household Expenses:</span>
                        <span className="font-bold text-foreground">{formatIndianCurrency(totalAnnualExpenses)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Net Annual Surplus:</span>
                        <span className="font-bold text-green-700">{formatIndianCurrency(netAnnualSurplus)}</span>
                      </div>
                      <div className="flex justify-between border-t border-border/60 pt-2 font-bold text-foreground">
                        <span>Est. Monthly SIP Capacity:</span>
                        <span>{formatIndianCurrency(estimatedMonthlySipCapacity)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-bold text-foreground border-b border-border pb-1 text-xs uppercase">2. Net Worth Summary</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Total Assets Owned:</span>
                        <span className="font-bold text-foreground">{formatIndianCurrency(totalAssets)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Liabilities Owed:</span>
                        <span className="font-bold text-foreground">{formatIndianCurrency(totalLiabilities)}</span>
                      </div>
                      <div className="flex justify-between border-t border-border/60 pt-2 font-bold text-green-700">
                        <span>Calculated Net Worth:</span>
                        <span>{formatIndianCurrency(netWorth)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Debt-To-Asset Ratio:</span>
                        <span className={debtToAssetRatio > 0.4 ? "text-red-600 font-bold" : "text-green-700 font-bold"}>
                          {(debtToAssetRatio * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2 pt-4 border-t border-border/60">
                  <div className="space-y-3">
                    <h4 className="font-bold text-foreground border-b border-border pb-1 text-xs uppercase">3. Insurance & Protection Review</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Existing Life Cover Sum:</span>
                        <span className="font-bold text-foreground">{formatIndianCurrency(totalLifeCover)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Recommended Cover (10x income):</span>
                        <span className="font-bold text-foreground">{formatIndianCurrency(recommendedLifeCover)}</span>
                      </div>
                      <div className="flex justify-between border-t border-border/60 pt-2 font-bold">
                        <span>Life Coverage Adequacy Gap:</span>
                        <span className={lifeCoverageGap > 0 ? "text-red-600 font-extrabold" : "text-green-700 font-bold"}>
                          {formatIndianCurrency(lifeCoverageGap)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-bold text-foreground border-b border-border pb-1 text-xs uppercase">4. Financial Goals Planning</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Total Financial Goals Target:</span>
                        <span className="font-bold text-foreground">{formatIndianCurrency(totalCorpusTarget)}</span>
                      </div>
                      <div className="flex justify-between border-t border-border/60 pt-2 font-bold text-primary">
                        <span>Total Monthly SIP Required:</span>
                        <span>{formatIndianCurrency(totalSipRequired)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Advisor Assessment details */}
                <div className="space-y-3 pt-4 border-t border-border/60 bg-muted/10 p-4 rounded-xl border border-border/80">
                  <h4 className="font-bold text-foreground text-xs uppercase">5. Advisor Assessment Details</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <span className="font-semibold text-muted-foreground">Assessed Risk Profile:</span>
                      <span className="block text-foreground font-bold mt-0.5">{data.assessedRiskProfile}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-muted-foreground">Required Advisory Service:</span>
                      <span className="block text-foreground font-bold mt-0.5">{data.advisoryServiceRequired}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-muted-foreground">Key Concerns Documented:</span>
                      <span className="block text-foreground mt-0.5 whitespace-pre-line leading-relaxed">
                        {data.keyClientConcerns || "No priority concerns documented."}
                      </span>
                    </div>
                    <div>
                      <span className="font-semibold text-muted-foreground">Recommended Next Steps:</span>
                      <span className="block text-foreground font-bold mt-0.5">{data.recommendedNextAction}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

        </div>
      )}
    </div>
  );
}
