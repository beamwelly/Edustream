import React, { useState, useEffect, useRef } from "react";
import { 
  ArrowLeft, 
  TrendingUp, 
  PiggyBank, 
  Landmark, 
  Activity, 
  Calendar, 
  Target, 
  Lock, 
  Coins,
  ChevronRight,
  Info,
  Loader2,
  TrendingDown,
  Plus,
  Trash2,
  Edit,
  Search,
  Download,
  FileText,
  Users,
  Shield,
  CreditCard,
  Phone,
  Eye,
  CheckCircle,
  AlertTriangle,
  Clock,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { PageHeader, Card, Button } from "@/components/common";
import { API_URL } from "@/constants/env";
import { useAuth } from "@/context/AuthContext";
import { jsPDF } from "jspdf";
import { ResponsivePageWrapper } from "@/components/layout/ResponsivePageWrapper";
import { GeneratedReportsTab } from "@/components/tools/GeneratedReportsTab";
import { 
  AreaChart, 
  Area, 
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceDot
} from "recharts";

interface WowInputs {
  current_age: number;
  expected_retirement_age: number;
  life_expectancy: number;
  current_monthly_expenses: number;
  expected_inflation_rate: number;
  current_monthly_income: number;
  savings_rate: number;
  expected_investment_return: number;
  post_retirement_return: number;
}

interface SensitivityPoint {
  age: number;
  corpus_needed: number;
}

interface CalculationResult {
  years_to_retirement: number;
  years_in_retirement: number;
  monthly_savings: number;
  monthly_expenses_at_retirement: number;
  required_retirement_corpus: number;
  savings_corpus_at_retirement: number;
  corpus_surplus_deficit: number;
  track_status: string;
  sensitivity_table: SensitivityPoint[];
}

export function WowToolkitPage({ onBack, toolId }: { onBack: () => void; toolId: number }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Reset/Remount tracking
  const [resetKey, setResetKey] = useState<number>(0);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  // Parent inputs state (Retirement Age Predictor)
  const [inputs, setInputs] = useState<WowInputs>({
    current_age: 35,
    expected_retirement_age: 58,
    life_expectancy: 85,
    current_monthly_expenses: 15000,
    expected_inflation_rate: 0.06,
    current_monthly_income: 80000,
    savings_rate: 0.3,
    expected_investment_return: 0.12,
    post_retirement_return: 0.07,
  });

  const [results, setResults] = useState<CalculationResult | null>(null);

  const handleResetAll = async () => {
    setShowResetConfirm(false);
    setSaveStatus("Resetting...");
    
    const defaultPayload = {
      retirement_inputs: {
        current_age: 35,
        expected_retirement_age: 58,
        life_expectancy: 85,
        current_monthly_expenses: 15000,
        expected_inflation_rate: 0.06,
        current_monthly_income: 80000,
        savings_rate: 0.3,
        expected_investment_return: 0.12,
        post_retirement_return: 0.07,
      },
      cost_of_delay_inputs: {
        monthly_sip_amount: 5000,
        expected_annual_return: 0.12,
        target_age: 60,
        current_age: 35
      },
      sip_home_loan_inputs: {
        monthly_sip: 10000,
        sip_return: 0.12,
        sip_duration: 20,
        stepup_rate: 0.05,
        loan_amount: 5000000,
        loan_rate: 0.085,
        loan_tenure: 20,
        down_payment: 1000000,
        appreciation_rate: 0.06,
        tax_benefit: 50000
      },
      freedom_date_inputs: {
        current_age: 35,
        birth_year: 1991,
        current_monthly_expenses: 50000,
        expected_inflation: 0.06,
        annual_investment_return: 0.12,
        withdrawal_rate: 0.04,
        current_net_worth: 1000000,
        monthly_savings: 20000,
        stepup_rate: 0.05
      }
    };

    try {
      const res = await fetch(`${API_URL}/wow/inputs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
        },
        body: JSON.stringify(defaultPayload)
      });
      
      if (res.ok) {
        setInitialInputs(defaultPayload);
        setInputs(defaultPayload.retirement_inputs);
        setResetKey(prev => prev + 1);
        setSaveStatus("Reset Successful");
        setTimeout(() => setSaveStatus(""), 2000);
      } else {
        setSaveStatus("Reset failed");
      }
    } catch (err) {
      console.error("Error resetting inputs:", err);
      setSaveStatus("Reset failed");
    }
  };

  // Centralized loaded inputs state from database
  const [initialInputs, setInitialInputs] = useState<any>(null);
  const [inputsLoaded, setInputsLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>("");

  // Load user inputs on mount
  useEffect(() => {
    const loadInputs = async () => {
      try {
        const res = await fetch(`${API_URL}/wow/inputs`, {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setInitialInputs(data);
          if (data.retirement_inputs && Object.keys(data.retirement_inputs).length > 0) {
            setInputs(data.retirement_inputs);
          }
        }
      } catch (err) {
        console.error("Error loading user inputs:", err);
      } finally {
        setInputsLoaded(true);
      }
    };
    loadInputs();
  }, []);

  // Save inputs handler (triggered debounced on changes)
  const saveInputs = async (tabKey: string, tabInputs: any) => {
    setSaveStatus("Saving...");
    try {
      const payload = {
        retirement_inputs: tabKey === "retirement_inputs" ? tabInputs : initialInputs?.retirement_inputs,
        cost_of_delay_inputs: tabKey === "cost_of_delay_inputs" ? tabInputs : initialInputs?.cost_of_delay_inputs,
        sip_home_loan_inputs: tabKey === "sip_home_loan_inputs" ? tabInputs : initialInputs?.sip_home_loan_inputs,
        freedom_date_inputs: tabKey === "freedom_date_inputs" ? tabInputs : initialInputs?.freedom_date_inputs,
      };

      const res = await fetch(`${API_URL}/wow/inputs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setSaveStatus("Saved");
        setInitialInputs(payload);
        setTimeout(() => setSaveStatus(""), 2000);
      } else {
        setSaveStatus("Save failed");
      }
    } catch (err) {
      console.error("Error saving user inputs:", err);
      setSaveStatus("Save failed");
    }
  };

  // Autosave for retirement predictor inputs
  useEffect(() => {
    if (!inputsLoaded) return;
    const timer = setTimeout(() => {
      saveInputs("retirement_inputs", inputs);
    }, 1000);
    return () => clearTimeout(timer);
  }, [inputs]);

  // Trigger recalculation whenever inputs change
  useEffect(() => {
    const calculate = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/wow/retirement/calculate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("token")}`
          },
          body: JSON.stringify(inputs)
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || "Calculation failed");
        }

        const data: CalculationResult = await res.json();
        setResults(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to connect to calculation engine.");
        setResults(null);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      calculate();
    }, 500);

    return () => clearTimeout(timer);
  }, [inputs]);

  const handleInputChange = (key: keyof WowInputs, value: number) => {
    setInputs(prev => {
      const next = { ...prev, [key]: value };
      if (key === "current_age") {
        if (next.current_age >= next.expected_retirement_age) {
          next.expected_retirement_age = next.current_age + 1;
        }
      }
      if (key === "expected_retirement_age") {
        if (next.expected_retirement_age <= next.current_age) {
          next.expected_retirement_age = next.current_age + 1;
        }
        if (next.expected_retirement_age >= next.life_expectancy) {
          next.life_expectancy = next.expected_retirement_age + 1;
        }
      }
      if (key === "life_expectancy") {
        if (next.life_expectancy <= next.expected_retirement_age) {
          next.life_expectancy = next.expected_retirement_age + 1;
        }
      }
      return next;
    });
  };

  const formatCurrency = (val: any) => {
    if (val === null || val === undefined || val === "") return "Not Provided";
    const num = typeof val === "number" ? val : parseFloat(String(val).replace(/[^0-9.-]/g, ""));
    if (isNaN(num)) return "Not Provided";
    return "₹" + Math.round(num).toLocaleString("en-IN");
  };

  const formatPercent = (val: any) => {
    if (val === null || val === undefined || val === "") return "Not Provided";
    let num = typeof val === "number" ? val : parseFloat(String(val).replace(/[^0-9.-]/g, ""));
    if (isNaN(num)) return "Not Provided";
    if (num <= 1 && num > 0) {
      return `${(num * 100).toFixed(1)}%`;
    }
    return `${num.toFixed(1)}%`;
  };

  const safeVal = (val: any, suffix = "") => {
    if (val === null || val === undefined || val === "" || (typeof val === "number" && isNaN(val))) {
      return "Not Provided";
    }
    return String(val) + suffix;
  };

  // Reusable PDF Generator
  const drawFlowText = (doc: jsPDF, text: string, x: number, y: number, maxWidth: number, fontSize: number, fontStyle = "normal") => {
    const cleanedText = text
      .replace(/✅/g, "")
      .replace(/⚠️/g, "")
      .replace(/₹/g, "Rs. ")
      .trim();

    const lines = doc.splitTextToSize(cleanedText, maxWidth);
    const spacingMultiplier = 1.15;
    const lineHeight = fontSize * 0.352778 * spacingMultiplier;
    
    doc.setFont("helvetica", fontStyle);
    doc.setFontSize(fontSize);
    
    let currentY = y;
    for (let i = 0; i < lines.length; i++) {
      if (currentY + lineHeight > 275) {
        doc.addPage();
        currentY = 20;
      }
      doc.text(lines[i], x, currentY + lineHeight);
      currentY += lineHeight;
    }
    
    return currentY + 2;
  };

  const drawTable = (doc: jsPDF, headers: string[], rows: any[][], x: number, startY: number, width: number, rowHeight = 6) => {
    const colWidth = width / headers.length;
    let currentY = startY;

    const cleanCell = (val: any) => {
      if (val === null || val === undefined) return "";
      return String(val)
        .replace(/✅/g, "")
        .replace(/⚠️/g, "")
        .replace(/₹/g, "Rs. ")
        .trim();
    };

    const drawHeaders = (yPos: number) => {
      doc.setFillColor(220, 38, 38);
      doc.rect(x, yPos, width, rowHeight + 1, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      headers.forEach((h, idx) => {
        const cleanedH = cleanCell(h);
        const headerLines = doc.splitTextToSize(cleanedH, colWidth - 4);
        doc.text(headerLines, x + idx * colWidth + 2, yPos + rowHeight - 1);
      });
      return yPos + rowHeight + 1;
    };

    currentY = drawHeaders(currentY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(31, 41, 55);

    rows.forEach((row, rowIdx) => {
      const splitCells = row.map(cell => doc.splitTextToSize(cleanCell(cell), colWidth - 4));
      const maxLines = Math.max(1, ...splitCells.map(lines => lines.length));
      const dynamicRowHeight = Math.max(rowHeight, maxLines * 4.5);

      if (currentY + dynamicRowHeight > 275) {
        doc.addPage();
        currentY = drawHeaders(20);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(31, 41, 55);
      }

      if (rowIdx % 2 === 1) {
        doc.setFillColor(244, 244, 245);
        doc.rect(x, currentY, width, dynamicRowHeight, "F");
      }

      row.forEach((cell, cellIdx) => {
        const lines = splitCells[cellIdx];
        doc.text(lines, x + cellIdx * colWidth + 2, currentY + 4);
      });

      doc.setDrawColor(229, 231, 235);
      doc.line(x, currentY + dynamicRowHeight, x + width, currentY + dynamicRowHeight);

      currentY += dynamicRowHeight;
    });

    return currentY;
  };

  const handleExportPDF = (moduleName: string, tabInputs: any, tabResults: any, extraData?: any) => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });
    
    const inputs = tabInputs || {};
    const results = tabResults || {};
    
    // Shadow helpers locally inside PDF exporter to replace ₹ with Rs. and clean emojis to avoid rendering glitches in jsPDF
    const formatCurrency = (val: any) => {
      if (val === null || val === undefined || val === "") return "Not Provided";
      const num = typeof val === "number" ? val : parseFloat(String(val).replace(/[^0-9.-]/g, ""));
      if (isNaN(num)) return "Not Provided";
      return "Rs. " + Math.round(num).toLocaleString("en-IN");
    };

    const safeVal = (val: any, suffix = "") => {
      if (val === null || val === undefined || val === "" || (typeof val === "number" && isNaN(val))) {
        return "Not Provided";
      }
      return String(val)
        .replace(/✅/g, "")
        .replace(/⚠️/g, "")
        .replace(/₹/g, "Rs. ")
        .trim() + suffix;
    };

    const dateStr = new Date().toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });

    const primaryColor = [220, 38, 38]; 
    const textColor = [31, 41, 55]; 
    const secondaryColor = [75, 85, 99]; 
    const cardBg = [244, 244, 245]; 

    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 25, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("MASTERCLASS | FINANCIAL FREEDOM TOOLKIT", 15, 12);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`${moduleName.toUpperCase()} REPORT`, 15, 19);

    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Date:", 15, 38);
    doc.setFont("helvetica", "normal");
    doc.text(dateStr, 25, 38);

    doc.setDrawColor(229, 231, 235);
    doc.line(15, 41, 195, 41);

    let y = 48;
    
    if (moduleName === "Retirement Age Predictor") {
      doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
      doc.rect(15, y, 55, 25, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text("RETIREMENT AGE", 20, y + 8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(safeVal(inputs.expected_retirement_age, " Years"), 20, y + 18);

      doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
      doc.rect(77, y, 55, 25, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text("REQUIRED CORPUS", 82, y + 8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text(formatCurrency(results.required_retirement_corpus), 82, y + 18);

      doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
      doc.rect(140, y, 55, 25, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text("SURPLUS / DEFICIT", 145, y + 8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      const defVal = results.corpus_surplus_deficit || 0;
      const deficit = defVal < 0;
      doc.setTextColor(deficit ? 220 : 22, deficit ? 38 : 101, deficit ? 38 : 52); 
      doc.text(formatCurrency(defVal), 145, y + 18);

      y += 32;

      const isDeficit = defVal < 0;
      doc.setFillColor(isDeficit ? 254 : 240, isDeficit ? 242 : 253, isDeficit ? 242 : 250);
      doc.rect(15, y, 180, 15, "F");
      doc.setDrawColor(isDeficit ? 252 : 187, isDeficit ? 165 : 247, isDeficit ? 165 : 208);
      doc.rect(15, y, 180, 15, "S");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(isDeficit ? 153 : 21, isDeficit ? 27 : 80, isDeficit ? 27 : 56);
      doc.text(`Status: ${safeVal(results.track_status)}`, 20, y + 9.5); 

      y += 22;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text("Corpus Needed vs Projected Accumulation", 15, y);
      y += 5;
      const reqVal = results.required_retirement_corpus || 0;
      const projVal = results.projected_corpus_at_retirement || 0;
      const maxVal = Math.max(reqVal, projVal, 100000);
      const reqWidth = Math.max(10, (reqVal / maxVal) * 120);
      const projWidth = Math.max(10, (projVal / maxVal) * 120);

      doc.setFillColor(220, 38, 38);
      doc.rect(50, y, reqWidth, 6, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(31, 41, 55);
      doc.text("Required", 15, y + 4.5);
      doc.text(formatCurrency(reqVal), 52 + reqWidth, y + 4.5);
      y += 8;

      doc.setFillColor(22, 101, 52);
      doc.rect(50, y, projWidth, 6, "F");
      doc.setTextColor(31, 41, 55);
      doc.text("Projected", 15, y + 4.5);
      doc.text(formatCurrency(projVal), 52 + projWidth, y + 4.5);
      
      y += 15;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text("User Inputs", 15, y);
      y += 5;
      
      const inputRows = [
        ["Current Age", safeVal(inputs.current_age, " years"), "Savings Rate", formatPercent(inputs.savings_rate)],
        ["Retirement Age", safeVal(inputs.expected_retirement_age, " years"), "Investment Return", formatPercent(inputs.expected_investment_return)],
        ["Life Expectancy", safeVal(inputs.life_expectancy, " years"), "Post-Retire Return", formatPercent(inputs.post_retirement_return)],
        ["Monthly Expenses", formatCurrency(inputs.current_monthly_expenses), "Monthly Income", formatCurrency(inputs.current_monthly_income)],
        ["Expected Inflation", formatPercent(inputs.expected_inflation_rate), "", ""]
      ];
      y = drawTable(doc, ["Parameter", "Value", "Parameter", "Value"], inputRows, 15, y, 180);
      
      y += 8;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text("Summary & Professional Recommendations", 15, y);
      y += 5;
      y = drawFlowText(doc, `Based on your current monthly income of ${formatCurrency(inputs.current_monthly_income)} and savings rate of ${formatPercent(inputs.savings_rate)}, you plan to retire at age ${safeVal(inputs.expected_retirement_age)}.`, 15, y, 180, 8.5);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text("Recommendations:", 15, y);
      y += 4;
      y = drawFlowText(doc, "• If you are facing a corpus deficit, consider increasing your savings rate or extending your retirement age.", 18, y, 177, 8.5);
      y = drawFlowText(doc, "• Ensure your post-retirement portfolio is diversified to guard against long-term inflation.", 18, y, 177, 8.5);
      y += 5;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text("Corpus Sensitivity Table", 15, y);
      y += 5;
      const sensRows = (results.sensitivity_table || []).map((p: any) => [
        `${safeVal(p.age)} years`,
        formatCurrency(p.corpus_needed)
      ]);
      y = drawTable(doc, ["Retirement Age", "Corpus Required"], sensRows, 15, y, 100);

    } else if (moduleName === "Cost Of Delay Calculator") {
      doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
      doc.rect(15, y, 55, 25, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text("MONTHLY SIP", 20, y + 8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text(formatCurrency(inputs.monthly_sip_amount), 20, y + 18);

      doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
      doc.rect(77, y, 55, 25, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text("FUTURE CORPUS (At Current)", 82, y + 8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      const delayTable = results.delay_table || [];
      const currRow = delayTable.find((r: any) => r.start_age === inputs.current_age) || {};
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(formatCurrency(currRow.corpus_at_target || 0), 82, y + 18);

      doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
      doc.rect(140, y, 55, 25, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text("DELAY PENALTY (VS 25)", 145, y + 8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(220, 38, 38);
      doc.text(formatPercent(Math.abs(currRow.delay_cost_percent || 0)), 145, y + 18);

      y += 32;

      if (results.warning_text) {
        doc.setFillColor(254, 242, 242);
        doc.rect(15, y, 180, 15, "F");
        doc.setDrawColor(252, 165, 165);
        doc.rect(15, y, 180, 15, "S");
        y = drawFlowText(doc, safeVal(results.warning_text), 18, y + 1, 174, 8.5, "bold");
        y += 5;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text("Wealth Accumulation by Starting Age", 15, y);
      y += 5;
      const c25 = (delayTable.find((r: any) => r.start_age === 25) || {}).corpus_at_target || 0;
      const c35 = (delayTable.find((r: any) => r.start_age === 35) || {}).corpus_at_target || 0;
      const c45 = (delayTable.find((r: any) => r.start_age === 45) || {}).corpus_at_target || 0;
      const maxDelayVal = Math.max(c25, c35, c45, 100000);
      const w25 = Math.max(10, (c25 / maxDelayVal) * 120);
      const w35 = Math.max(10, (c35 / maxDelayVal) * 120);
      const w45 = Math.max(10, (c45 / maxDelayVal) * 120);

      doc.setFillColor(22, 101, 52);
      doc.rect(50, y, w25, 6, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(31, 41, 55);
      doc.text("Start at 25", 15, y + 4.5);
      doc.text(formatCurrency(c25), 52 + w25, y + 4.5);
      y += 8;

      doc.setFillColor(234, 179, 8);
      doc.rect(50, y, w35, 6, "F");
      doc.setTextColor(31, 41, 55);
      doc.text("Start at 35", 15, y + 4.5);
      doc.text(formatCurrency(c35), 52 + w35, y + 4.5);
      y += 8;

      doc.setFillColor(220, 38, 38);
      doc.rect(50, y, w45, 6, "F");
      doc.setTextColor(31, 41, 55);
      doc.text("Start at 45", 15, y + 4.5);
      doc.text(formatCurrency(c45), 52 + w45, y + 4.5);
      
      y += 15;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text("Summary & Professional Recommendations", 15, y);
      y += 5;
      y = drawFlowText(doc, `Starting your SIP of ${formatCurrency(inputs.monthly_sip_amount)} early provides maximum compounding.`, 15, y, 180, 8.5);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text("Recommendations:", 15, y);
      y += 4;
      y = drawFlowText(doc, "• Start investing immediately; even a 2-year delay significantly reduces your final accumulation.", 18, y, 177, 8.5);
      y = drawFlowText(doc, "• Set up automatic SIP transfers on your salary day to maintain discipline and avoid delay penalties.", 18, y, 177, 8.5);
      y += 5;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text("Cost of Delay Comparison Table", 15, y);
      y += 5;

      const delayRows = delayTable.map((row: any) => [
        `${safeVal(row.start_age)} years`,
        `${safeVal(row.years_to_invest)} years`,
        formatCurrency(row.total_invested),
        formatCurrency(row.corpus_at_target),
        row.vs_starting_at_25 !== 0 ? formatCurrency(row.vs_starting_at_25) : "—",
        `${(Math.abs(row.delay_cost_percent || 0) * 100).toFixed(1)}%`
      ]);
      y = drawTable(doc, ["Start Age", "Years Invested", "Total Invested", "Future Corpus", "Corpus Loss", "Penalty %"], delayRows, 15, y, 180);

    } else if (moduleName === "SIP + Home Loan Impact") {
      doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
      doc.rect(15, y, 85, 25, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text("LOAN INTEREST PAID", 20, y + 8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(220, 38, 38);
      doc.text(formatCurrency(results.total_interest_paid), 20, y + 18);

      doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
      doc.rect(110, y, 85, 25, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text("NET FINANCIAL BENEFIT", 115, y + 8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      const benefitVal = results.net_financial_benefit || 0;
      const isBenefit = benefitVal >= 0;
      doc.setTextColor(isBenefit ? 22 : 220, isBenefit ? 101 : 38, isBenefit ? 52 : 38);
      doc.text(formatCurrency(benefitVal), 115, y + 18);

      y += 32;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text("SIP Wealth vs Loan Interest paid", 15, y);
      y += 5;
      const interestPaid = results.total_interest_paid || 0;
      const sipValue = results.future_sip_value || 0;
      const maxVal = Math.max(interestPaid, sipValue, 100000);
      const wInterest = Math.max(10, (interestPaid / maxVal) * 120);
      const wSip = Math.max(10, (sipValue / maxVal) * 120);

      doc.setFillColor(220, 38, 38);
      doc.rect(50, y, wInterest, 6, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(31, 41, 55);
      doc.text("Interest Paid", 15, y + 4.5);
      doc.text(formatCurrency(interestPaid), 52 + wInterest, y + 4.5);
      y += 8;

      doc.setFillColor(22, 101, 52);
      doc.rect(50, y, wSip, 6, "F");
      doc.setTextColor(31, 41, 55);
      doc.text("SIP Wealth", 15, y + 4.5);
      doc.text(formatCurrency(sipValue), 52 + wSip, y + 4.5);
      
      y += 15;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text("Summary & Professional Recommendations", 15, y);
      y += 5;
      y = drawFlowText(doc, `Matching your home loan of ${formatCurrency(inputs.loan_amount)} with a parallel SIP of ${formatCurrency(inputs.monthly_sip)} creates a financial hedge.`, 15, y, 180, 8.5);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text("Recommendations:", 15, y);
      y += 4;
      y = drawFlowText(doc, "• Maintaining a parallel SIP helps fully recover or exceed the total interest paid on the home loan.", 18, y, 177, 8.5);
      y = drawFlowText(doc, "• Plan annual step-ups on the SIP to compound your net financial benefit over the loan tenure.", 18, y, 177, 8.5);
      y += 5;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text("SIP & Loan Specifications", 15, y);
      y += 5;

      const sipLoanRows = [
        ["Monthly SIP", formatCurrency(inputs.monthly_sip), "Loan Amount", formatCurrency(inputs.loan_amount)],
        ["SIP Duration", safeVal(inputs.sip_duration, " years"), "Loan Tenure", safeVal(inputs.loan_tenure, " years")],
        ["SIP Return", formatPercent(inputs.sip_return), "Loan Interest Rate", formatPercent(inputs.loan_rate)],
        ["Step-up Rate", formatPercent(inputs.stepup_rate), "Property Appreciation", formatPercent(inputs.appreciation_rate)],
        ["Down Payment", formatCurrency(inputs.down_payment), "Annual Tax Benefit", formatCurrency(inputs.tax_benefit)]
      ];
      y = drawTable(doc, ["SIP Param", "Value", "Loan Param", "Value"], sipLoanRows, 15, y, 180);

      y += 8;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text("Financial Breakdown Comparison", 15, y);
      y += 5;

      const breakdown = [
        ["Future SIP Value", formatCurrency(results.future_sip_value)],
        ["Opportunity Cost of Down Payment", formatCurrency(results.opportunity_cost_downpayment)],
        ["Total Payments for Property", formatCurrency(results.total_payments_property)],
        ["Future Property Value", formatCurrency(results.future_property_value)],
        ["Net Financial Benefit (SIP - Loan)", formatCurrency(results.net_financial_benefit)]
      ];
      y = drawTable(doc, ["Item", "Amount"], breakdown, 15, y, 150);

    } else if (moduleName === "Financial Freedom Date") {
      doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
      doc.rect(15, y, 55, 25, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text("TARGET FI CORPUS", 20, y + 8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text(formatCurrency(results.fi_number), 20, y + 18);

      doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
      doc.rect(77, y, 55, 25, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text("YEARS TO FREEDOM (Simple)", 82, y + 8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      const yrsFi = results.years_to_fi || 0;
      doc.text(`${safeVal(yrsFi.toFixed(1))} Years`, 82, y + 18);

      doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
      doc.rect(140, y, 55, 25, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text("YEARS TO FREEDOM (Step-up)", 145, y + 8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(22, 101, 52);
      const yrsFiSU = results.years_to_fi_stepup || 0;
      doc.text(`${safeVal(yrsFiSU.toFixed(1))} Years`, 145, y + 18);

      y += 32;

      if (results.freedom_date_message) {
        doc.setFillColor(240, 253, 250);
        doc.rect(15, y, 180, 15, "F");
        doc.setDrawColor(187, 247, 208);
        doc.rect(15, y, 180, 15, "S");
        y = drawFlowText(doc, safeVal(results.freedom_date_message), 18, y + 1, 174, 8.5, "bold");
        y += 5;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text("Net Worth vs Target Freedom Corpus", 15, y);
      y += 5;
      const nw = inputs.current_net_worth || 0;
      const target = results.fi_number || 1;
      const pct = Math.min(1, nw / target);

      doc.setFillColor(244, 244, 245);
      doc.rect(15, y, 150, 8, "F");
      doc.setFillColor(22, 101, 52);
      if (pct > 0) {
        doc.rect(15, y, pct * 150, 8, "F");
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(31, 41, 55);
      doc.text(`Current Net Worth: ${formatCurrency(nw)} (${(pct * 100).toFixed(1)}% of ${formatCurrency(target)})`, 15, y + 12);
      
      y += 18;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Summary & Professional Recommendations", 15, y);
      y += 5;
      y = drawFlowText(doc, `Your Financial Freedom target corpus is ${formatCurrency(results.fi_number)}. Based on monthly savings of ${formatCurrency(inputs.monthly_savings)}, your timeline is estimated.`, 15, y, 180, 8.5);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text("Recommendations:", 15, y);
      y += 4;
      y = drawFlowText(doc, "• Maintaining a safe withdrawal rate of 3-4% ensures your capital is preserved indefinitely.", 18, y, 177, 8.5);
      y = drawFlowText(doc, "• Utilize a savings step-up rate of at least 5% to significantly pull forward your financial freedom date.", 18, y, 177, 8.5);
      y += 5;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text("Financial Freedom Date Inputs", 15, y);
      y += 5;

      const fdRows = [
        ["Current Age", safeVal(inputs.current_age, " years"), "Current Net Worth", formatCurrency(inputs.current_net_worth)],
        ["Birth Year", safeVal(inputs.birth_year), "Monthly Savings", formatCurrency(inputs.monthly_savings)],
        ["Monthly Expenses", formatCurrency(inputs.current_monthly_expenses), "Annual Return", formatPercent(inputs.annual_investment_return)],
        ["Expected Inflation", formatPercent(inputs.expected_inflation), "Savings Step-up Rate", formatPercent(inputs.stepup_rate)],
        ["Safe Withdrawal Rate", formatPercent(inputs.withdrawal_rate), "Safe FI Buffer", formatCurrency(results.safe_fi_buffer)]
      ];
      y = drawTable(doc, ["Parameter", "Value", "Parameter", "Value"], fdRows, 15, y, 180);

    } else if (moduleName === "Goal Visualization Dashboard") {
      doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
      doc.rect(15, y, 55, 25, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text("TOTAL TARGET", 20, y + 8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text(formatCurrency(results.total_target), 20, y + 18);

      doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
      doc.rect(77, y, 55, 25, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text("TOTAL SAVED", 82, y + 8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(formatCurrency(results.total_saved), 82, y + 18);

      doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
      doc.rect(140, y, 55, 25, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text("PROGRESS", 145, y + 8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(22, 101, 52);
      doc.text(formatPercent(results.overall_percent_achieved), 145, y + 18);

      y += 32;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text("Goal Progress Visualization", 15, y);
      y += 5;
      const activeGoals = results.goals || [];
      if (activeGoals.length === 0) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text("No active goals defined.", 15, y + 4);
        y += 8;
      } else {
        activeGoals.slice(0, 3).forEach((g: any) => {
          const pctVal = g.percent_achieved || 0;
          const pct = Math.min(100, Math.max(0, pctVal)) / 100;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(31, 41, 55);
          doc.text(safeVal(g.name), 15, y + 4.5);
          
          doc.setFillColor(244, 244, 245);
          doc.rect(50, y + 1, 100, 5, "F");
          doc.setFillColor(22, 101, 52);
          if (pct > 0) {
            doc.rect(50, y + 1, pct * 100, 5, "F");
          }
          doc.text(formatPercent(pct), 155, y + 4.5);
          y += 8;
        });
        y += 2;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Summary & Professional Recommendations", 15, y);
      y += 5;
      y = drawFlowText(doc, `You have defined ${activeGoals.length} financial goals with an overall progress of ${formatPercent(results.overall_percent_achieved)}.`, 15, y, 180, 8.5);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text("Recommendations:", 15, y);
      y += 4;
      y = drawFlowText(doc, "• Tag specific mutual fund portfolios/SIPs directly to each goal to ensure focused compounding.", 18, y, 177, 8.5);
      y = drawFlowText(doc, "• Adjust goal target amounts periodically to match real-world inflation on big purchases.", 18, y, 177, 8.5);
      y += 5;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text("Active Financial Goals Table", 15, y);
      y += 5;

      const goalRows = activeGoals.map((g: any) => [
        safeVal(g.name),
        formatCurrency(g.target_amount),
        formatCurrency(g.current_saved),
        formatCurrency(g.monthly_sip),
        `${safeVal(g.timeline_years)} years`,
        formatPercent(g.percent_achieved),
        safeVal(g.status)
      ]);
      y = drawTable(doc, ["Goal Name", "Target (₹)", "Saved (₹)", "Monthly SIP", "Timeline", "% Achieved", "Status"], goalRows, 15, y, 180);

    } else if (moduleName === "Family Financial Vault") {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("CONFIDENTIAL FAMILY FINANCIAL RECORDS", 15, y);
      y += 8;

      const vaultData = extraData || {};
      
      y = drawFlowText(doc, "1. Family Member Details", 15, y, 180, 9, "bold");
      const famRows = (vaultData.family_members || []).map((m: any) => [
        safeVal(m.name), 
        safeVal(m.relationship), 
        safeVal(m.dob), 
        safeVal(m.pan_number), 
        safeVal(m.aadhaar_last_four), 
        safeVal(m.blood_group)
      ]);
      y = drawTable(doc, ["Name", "Relation", "DOB", "PAN Number", "Aadhaar Last 4", "Blood Group"], famRows, 15, y, 180, 5);
      y += 8;

      y = drawFlowText(doc, "2. Insurance Policies", 15, y, 180, 9, "bold");
      const insRows = (vaultData.insurance_policies || []).map((i: any) => [
        safeVal(i.policy_type), 
        safeVal(i.company), 
        safeVal(i.policy_number), 
        formatCurrency(i.sum_assured), 
        formatCurrency(i.premium_amount), 
        safeVal(i.expiry_date)
      ]);
      y = drawTable(doc, ["Policy Type", "Company", "Policy No.", "Sum Assured", "Premium/Yr", "Expiry"], insRows, 15, y, 180, 5);
      y += 8;

      y = drawFlowText(doc, "3. Investment Portfolio", 15, y, 180, 9, "bold");
      const invRows = (vaultData.investments || []).map((i: any) => [
        safeVal(i.investment_type), 
        safeVal(i.scheme_name), 
        safeVal(i.account_folio_number), 
        formatCurrency(i.current_value), 
        safeVal(i.nominee), 
        safeVal(i.institution)
      ]);
      y = drawTable(doc, ["Investment Type", "Scheme Name", "Folio/Account No", "Current Value", "Nominee", "Institution"], invRows, 15, y, 180, 5);
      y += 8;

      y = drawFlowText(doc, "4. Important Documents Checklist", 15, y, 180, 9, "bold");
      const docRows = (vaultData.important_documents || []).map((d: any) => [
        safeVal(d.document_name), 
        safeVal(d.storage_location), 
        safeVal(d.last_updated), 
        safeVal(d.digital_copy_stored_at), 
        safeVal(d.status)
      ]);
      y = drawTable(doc, ["Document Name", "Storage Location", "Last Updated", "Digital Copy At", "Status"], docRows, 15, y, 180, 5);
      y += 8;

      y = drawFlowText(doc, "5. Emergency Contacts & Nominees", 15, y, 180, 9, "bold");
      const conRows = (vaultData.emergency_contacts || []).map((c: any) => [
        safeVal(c.name), 
        safeVal(c.relationship), 
        safeVal(c.mobile), 
        safeVal(c.email), 
        safeVal(c.role_purpose)
      ]);
      y = drawTable(doc, ["Name", "Relation", "Mobile", "Email", "Role / Purpose"], conRows, 15, y, 180, 5);
      y += 8;

      y = drawFlowText(doc, "6. Bank Accounts & Credit Cards", 15, y, 180, 9, "bold");
      const bankRows = (vaultData.bank_accounts || []).map((b: any) => [
        safeVal(b.bank_card_name), 
        safeVal(b.account_type), 
        safeVal(b.last_four_digits ? `XXXX ${b.last_four_digits}` : ""), 
        safeVal(b.branch_limit), 
        safeVal(b.nominee), 
        safeVal(b.status)
      ]);
      y = drawTable(doc, ["Bank / Card Name", "Account Type", "Last 4 Digits", "Branch / Limit", "Nominee", "Status"], bankRows, 15, y, 180, 5);
    }

    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.setFont("helvetica", "normal");
      doc.text("CONFIDENTIAL - Generated via WOW Financial Freedom Toolkit", 15, 287);
      doc.text(`Page ${i} of ${totalPages}`, 180, 287);
    }

    // Auto-upload generated PDF to backend
    try {
      const pdfBlob = doc.output("blob");
      const calcClean = moduleName.replace(/\s+/g, "");
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const timeStr = new Date().toTimeString().split(" ")[0].replace(/:/g, "");
      const filename = `${calcClean}_${dateStr}_${timeStr}.pdf`;

      const pdfFile = new File([pdfBlob], filename, { type: "application/pdf" });
      const formData = new FormData();
      formData.append("file", pdfFile);
      formData.append("tool_id", String(toolId));
      formData.append("calculator_name", moduleName);
      formData.append("client_name", "");

      fetch(`${API_URL}/wow/reports/upload`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
        },
        body: formData
      })
      .then(r => r.json())
      .then(data => {
        console.log("PDF auto-saved to backend:", data);
      })
      .catch(err => {
        console.error("Failed to auto-save PDF to backend:", err);
      });
    } catch (uploadErr) {
      console.error("Failed to process auto-upload:", uploadErr);
    }

    doc.save(`WOW_${moduleName.replace(/\s+/g, "_")}_Report.pdf`);
  };


  return (
    <ResponsivePageWrapper>
      {/* Page Header with Back Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onBack} className="gap-2 border-border/80">
            <ArrowLeft className="h-4 w-4" /> Back to Tools
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              💎 WOW Financial Freedom Toolkit
            </h2>
            <p className="text-xs text-muted-foreground">
              Plan your retirement, calculate cost of delay, evaluate home loans, and secure your vault.
            </p>
          </div>
        </div>
        {saveStatus && (
          <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-bold self-start sm:self-center">
            <CheckCircle className="h-3.5 w-3.5" />
            {saveStatus}
          </span>
        )}
      </div>

      {/* Tabs Navigation & Reset Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-4 pb-2">
        <div className="flex flex-wrap gap-1 border-b border-border bg-muted/30 p-1 rounded-xl max-w-fit">
          <TabButton 
            active={activeTab === "dashboard"} 
            onClick={() => setActiveTab("dashboard")} 
            icon={<Coins className="h-4 w-4" />}
            label="Dashboard" 
          />
          <TabButton 
            active={activeTab === "retirement"} 
            onClick={() => setActiveTab("retirement")} 
            icon={<TrendingUp className="h-4 w-4" />}
            label="Retirement Predictor" 
          />
          <TabButton 
            active={activeTab === "delay"} 
            onClick={() => setActiveTab("delay")} 
            icon={<Clock className="h-4 w-4" />}
            label="Cost of Delay" 
          />
          <TabButton 
            active={activeTab === "sip-loan"} 
            onClick={() => setActiveTab("sip-loan")} 
            icon={<PiggyBank className="h-4 w-4" />}
            label="SIP + Home Loan" 
          />
          <TabButton 
            active={activeTab === "freedom-date"} 
            onClick={() => setActiveTab("freedom-date")} 
            icon={<Calendar className="h-4 w-4" />}
            label="Freedom Date" 
          />
          <TabButton 
            active={activeTab === "goal"} 
            onClick={() => setActiveTab("goal")} 
            icon={<Target className="h-4 w-4" />}
            label="Goal Visualizer" 
          />
          <TabButton 
            active={activeTab === "vault"} 
            onClick={() => setActiveTab("vault")} 
            icon={<Lock className="h-4 w-4" />}
            label="Financial Vault" 
          />
          <TabButton 
            active={activeTab === "reports"} 
            onClick={() => setActiveTab("reports")} 
            icon={<FileText className="h-4 w-4" />}
            label="Generated PDFs" 
          />
        </div>

        {/* Clear Information Button */}
        {activeTab !== "dashboard" && activeTab !== "reports" && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowResetConfirm(true)}
            className="text-xs border-red-500/20 hover:bg-red-500/5 text-red-600 gap-1.5 font-bold self-start md:self-auto"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Clear Information
          </Button>
        )}
      </div>

      {/* Tab Panels */}
      <div className="mt-6">
        {activeTab === "dashboard" && (
          <DashboardTab 
            inputs={inputs}
            results={results}
            loading={loading}
            formatCurrency={formatCurrency}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === "retirement" && (
          <RetirementPredictorTab 
            key={`retirement-${resetKey}`}
            inputs={inputs} 
            onChange={handleInputChange} 
            results={results} 
            loading={loading}
            error={error}
            formatCurrency={formatCurrency}
            formatPercent={formatPercent}
            onExportPDF={() => handleExportPDF("Retirement Age Predictor", inputs, results)}
          />
        )}

        {activeTab === "delay" && (
          <CostOfDelayTab 
            key={`delay-${resetKey}`}
            formatCurrency={formatCurrency}
            formatPercent={formatPercent}
            initialInputs={initialInputs}
            onSave={(tabInputs) => saveInputs("cost_of_delay_inputs", tabInputs)}
            onExportPDF={(res) => handleExportPDF("Cost Of Delay Calculator", initialInputs?.cost_of_delay_inputs || { monthly_sip_amount: 5000, expected_annual_return: 0.12, target_age: 60, current_age: 35 }, res)}
          />
        )}

        {activeTab === "sip-loan" && (
          <SipHomeLoanTab 
            key={`sip-${resetKey}`}
            formatCurrency={formatCurrency}
            formatPercent={formatPercent}
            initialInputs={initialInputs}
            onSave={(tabInputs) => saveInputs("sip_home_loan_inputs", tabInputs)}
            onExportPDF={(res) => handleExportPDF("SIP + Home Loan Impact", initialInputs?.sip_home_loan_inputs || { monthly_sip: 10000, sip_return: 0.12, sip_duration: 20, stepup_rate: 0.05, loan_amount: 5000000, loan_rate: 0.085, loan_tenure: 20, down_payment: 1000000, appreciation_rate: 0.06, tax_benefit: 50000 }, res)}
          />
        )}

        {activeTab === "freedom-date" && (
          <FinancialFreedomDateTab 
            key={`freedom-${resetKey}`}
            formatCurrency={formatCurrency}
            formatPercent={formatPercent}
            initialInputs={initialInputs}
            onSave={(tabInputs) => saveInputs("freedom_date_inputs", tabInputs)}
            onExportPDF={(res) => handleExportPDF("Financial Freedom Date", initialInputs?.freedom_date_inputs || { current_age: 35, birth_year: 1991, current_monthly_expenses: 50000, expected_inflation: 0.06, annual_investment_return: 0.12, withdrawal_rate: 0.04, current_net_worth: 1000000, monthly_savings: 20000, stepup_rate: 0.05 }, res)}
          />
        )}

        {activeTab === "goal" && (
          <GoalVisualizationDashboardTab 
            formatCurrency={formatCurrency}
            formatPercent={formatPercent}
            onExportPDF={(res) => handleExportPDF("Goal Visualization Dashboard", {}, res)}
          />
        )}

        {activeTab === "vault" && (
          <FamilyFinancialVaultTab 
            formatCurrency={formatCurrency}
            formatPercent={formatPercent}
            onExportPDF={(vaultData) => handleExportPDF("Family Financial Vault", {}, {}, vaultData)}
          />
        )}

        {activeTab === "reports" && (
          <GeneratedReportsTab toolId={toolId} />
        )}
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-foreground">Clear All Information?</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Are you sure you want to clear all inputs? This action cannot be undone. All calculator fields will be reset to their default initial values.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowResetConfirm(false)}
                className="text-xs border-border/80"
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetAll}
                className="text-xs bg-red-600 hover:bg-red-700 text-white border-none font-bold"
              >
                Confirm Reset
              </Button>
            </div>
          </Card>
        </div>
      )}
    </ResponsivePageWrapper>
  );
}

// Tab Button Component
function TabButton({ 
  active, 
  onClick, 
  icon, 
  label 
}: { 
  active: boolean; 
  onClick: () => void; 
  icon: React.ReactNode; 
  label: string; 
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
        active 
          ? "bg-background text-foreground shadow-sm" 
          : "text-muted-foreground hover:bg-background/40 hover:text-foreground"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// ----------------------------------------------------
// TAB 1: DASHBOARD PANEL
// ----------------------------------------------------
interface DashboardTabProps {
  inputs: WowInputs;
  results: CalculationResult | null;
  loading: boolean;
  formatCurrency: (val: number) => string;
  onNavigate: (tab: string) => void;
}

function DashboardTab({ 
  inputs, 
  results, 
  loading, 
  formatCurrency,
  onNavigate
}: DashboardTabProps) {
  const isDeficit = results ? results.corpus_surplus_deficit < 0 : false;

  const formatPercent = (val: number) => {
    return `${(val * 100).toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          📊 Quick Summary (Pulls from Retirement Age Predictor)
        </h3>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Current vs. Retire Age</p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {inputs.current_age} / {inputs.expected_retirement_age} years
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Life expectancy: {inputs.life_expectancy} years
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Years to Retire</p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {results ? results.years_to_retirement : inputs.expected_retirement_age - inputs.current_age} years
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Retirement tenure: {results ? results.years_in_retirement : inputs.life_expectancy - inputs.expected_retirement_age} years
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Monthly Savings</p>
          <p className="text-2xl font-bold text-primary mt-1">
            {results ? formatCurrency(results.monthly_savings) : "—"}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Income: {formatCurrency(inputs.current_monthly_income)} ({formatPercent(inputs.savings_rate)} saved)
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Retirement Corpus Goal</p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {results ? formatCurrency(results.required_retirement_corpus) : "—"}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Inflated monthly expenses: {results ? formatCurrency(results.monthly_expenses_at_retirement) : "—"}
          </p>
        </Card>
      </div>

      {results && (
        <div className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
          isDeficit 
            ? "bg-warning-soft/20 border-warning/30 text-warning-foreground" 
            : "bg-success-soft/20 border-success/30 text-success-foreground"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold ${
              isDeficit ? "bg-warning/20" : "bg-success/20"
            }`}>
              {isDeficit ? "⚠️" : "✅"}
            </div>
            <div>
              <p className="text-sm font-semibold">{results.track_status}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isDeficit 
                  ? `Savings Shortfall: ${formatCurrency(Math.abs(results.corpus_surplus_deficit))}`
                  : `Savings Surplus: ${formatCurrency(results.corpus_surplus_deficit)}`
                }
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onNavigate("retirement")}
            className="border-current hover:bg-background/20"
          >
            Adjust inputs
          </Button>
        </div>
      )}

      <div>
        <h4 className="text-sm font-bold text-foreground uppercase tracking-wider mb-3">WOW Calculators Directory</h4>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <NavigationCard 
            title="Retirement Age Predictor" 
            desc="Calculate your ideal retirement age and visual sensitivity table." 
            icon={<PiggyBank className="h-5 w-5" />} 
            onClick={() => onNavigate("retirement")}
            ctaLabel="Open Calculator"
          />
          <NavigationCard 
            title="Cost Of Delay Calculator" 
            desc="Discover the compounding cost of postponing investments." 
            icon={<Activity className="h-5 w-5" />} 
            onClick={() => onNavigate("delay")}
            ctaLabel="Open Calculator"
          />
          <NavigationCard 
            title="SIP + Home Loan Impact" 
            desc="Compare standard mortgages against asset accumulation returns." 
            icon={<Landmark className="h-5 w-5" />} 
            onClick={() => onNavigate("loan")}
            ctaLabel="Open Calculator"
          />
          <NavigationCard 
            title="Financial Freedom Date" 
            desc="Find the exact day you hit complete independence." 
            icon={<Calendar className="h-5 w-5" />} 
            onClick={() => onNavigate("freedom")}
            ctaLabel="Open Calculator"
          />
          <NavigationCard 
            title="Goal Visualization Dashboard" 
            desc="Consolidate and track progress of custom goals." 
            icon={<Target className="h-5 w-5" />} 
            onClick={() => onNavigate("goal")}
            ctaLabel="Open Dashboard"
          />
          <NavigationCard 
            title="Family Financial Vault" 
            desc="Secure repository for nominees, documents, and policies." 
            icon={<Lock className="h-5 w-5" />} 
            onClick={() => onNavigate("vault")}
            ctaLabel="Open Vault"
          />
        </div>
      </div>
    </div>
  );
}

function NavigationCard({ 
  title, 
  desc, 
  icon, 
  onClick, 
  ctaLabel
}: { 
  title: string; 
  desc: string; 
  icon: React.ReactNode; 
  onClick: () => void; 
  ctaLabel: string;
}) {
  return (
    <Card 
      onClick={onClick}
      className="p-4 flex flex-col justify-between hover:border-primary hover:shadow-md cursor-pointer transition-all"
    >
      <div>
        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
          {icon}
        </div>
        <h4 className="text-sm font-bold text-foreground">
          {title}
        </h4>
        <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
      </div>
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }} 
        className="mt-4 text-xs font-bold text-primary flex items-center gap-1 hover:underline self-start font-bold"
      >
        {ctaLabel} <ChevronRight className="h-3 w-3" />
      </button>
    </Card>
  );
}

// ----------------------------------------------------
// TAB 2: RETIREMENT PREDICTOR PANEL
// ----------------------------------------------------
interface RetirementPredictorTabProps {
  inputs: WowInputs;
  results: CalculationResult | null;
  loading: boolean;
  error: string | null;
  onChange: (key: keyof WowInputs, value: number) => void;
  formatCurrency: (val: number) => string;
  formatPercent: (val: number) => string;
  onExportPDF: () => void;
}

function RetirementPredictorTab({
  inputs,
  results,
  loading,
  error,
  onChange,
  formatCurrency,
  formatPercent,
  onExportPDF
}: RetirementPredictorTabProps) {
  const isDeficit = results ? results.corpus_surplus_deficit < 0 : false;

  const formatChartValue = (value: number) => {
    if (value >= 10000000) {
      return `₹${(value / 10000000).toFixed(1)} Cr`;
    }
    return `₹${(value / 100000).toFixed(0)} L`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          👵 Retirement Age Predictor Calculator
        </h3>
        {results && (
          <Button
            onClick={onExportPDF}
            className="bg-primary text-primary-foreground hover:bg-primary/95 flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg"
          >
            <Download className="h-4 w-4" /> Export PDF Report
          </Button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-destructive bg-destructive/10 text-destructive text-sm font-semibold">
          ⚠️ {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12 items-start">
        <div className="lg:col-span-5 space-y-4">
          <Card className="p-5 space-y-4">
            <h4 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border pb-2 mb-3">
              📋 Personal & Financial Inputs
            </h4>

            <SliderField 
              label="Current Age" 
              value={inputs.current_age} 
              min={18} 
              max={100} 
              step={1} 
              unit="years"
              onChange={(v) => onChange("current_age", v)} 
            />

            <SliderField 
              label="Expected Retirement Age" 
              value={inputs.expected_retirement_age} 
              min={inputs.current_age + 1} 
              max={inputs.life_expectancy - 1} 
              step={1} 
              unit="years"
              onChange={(v) => onChange("expected_retirement_age", v)} 
            />

            <SliderField 
              label="Life Expectancy" 
              value={inputs.life_expectancy} 
              min={inputs.expected_retirement_age + 1} 
              max={120} 
              step={1} 
              unit="years"
              onChange={(v) => onChange("life_expectancy", v)} 
            />

            <InputField 
              label="Current Monthly Income" 
              value={inputs.current_monthly_income} 
              min={0}
              max={10000000}
              step={5000}
              unit="₹"
              onChange={(v) => onChange("current_monthly_income", v)} 
            />

            <SliderField 
              label="Savings Rate" 
              value={inputs.savings_rate} 
              min={0} 
              max={1} 
              step={0.05} 
              percentage={true}
              onChange={(v) => onChange("savings_rate", v)} 
            />

            <InputField 
              label="Current Monthly Expenses" 
              value={inputs.current_monthly_expenses} 
              min={0}
              max={10000000}
              step={1000}
              unit="₹"
              onChange={(v) => onChange("current_monthly_expenses", v)} 
            />

            <SliderField 
              label="Expected Inflation Rate" 
              value={inputs.expected_inflation_rate} 
              min={0} 
              max={0.2} 
              step={0.005} 
              percentage={true}
              onChange={(v) => onChange("expected_inflation_rate", v)} 
            />

            <SliderField 
              label="Pre-Retirement Investment Return" 
              value={inputs.expected_investment_return} 
              min={0} 
              max={0.3} 
              step={0.005} 
              percentage={true}
              onChange={(v) => onChange("expected_investment_return", v)} 
            />

            <SliderField 
              label="Post-Retirement Return Rate" 
              value={inputs.post_retirement_return} 
              min={0} 
              max={0.2} 
              step={0.005} 
              percentage={true}
              onChange={(v) => onChange("post_retirement_return", v)} 
            />
          </Card>
        </div>

        <div className="lg:col-span-7 space-y-6">
          <Card className="p-5">
            <div className="flex items-center justify-between border-b border-border pb-2 mb-4">
              <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">
                📊 Calculated Results
              </h4>
              {loading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <StatResult label="Years to Retirement" value={results ? `${results.years_to_retirement} years` : "—"} />
              <StatResult label="Years in Retirement" value={results ? `${results.years_in_retirement} years` : "—"} />
              <StatResult label="Monthly Savings Target" value={results ? formatCurrency(results.monthly_savings) : "—"} highlight />
              <StatResult label="Monthly Expenses at Retire" value={results ? formatCurrency(results.monthly_expenses_at_retirement) : "—"} />
              <StatResult label="Required Retirement Corpus" value={results ? formatCurrency(results.required_retirement_corpus) : "—"} />
              <StatResult label="Savings Corpus at Retire" value={results ? formatCurrency(results.savings_corpus_at_retirement) : "—"} />
            </div>

            {results && (
              <div className={`mt-5 p-4 rounded-xl border flex flex-col gap-2 ${
                isDeficit 
                  ? "bg-warning-soft/20 border-warning/30 text-warning-foreground" 
                  : "bg-success-soft/20 border-success/30 text-success-foreground"
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase">Corpus Surplus / (Deficit)</span>
                  <span className={`text-base font-bold ${isDeficit ? "text-destructive" : "text-success"}`}>
                    {formatCurrency(results.corpus_surplus_deficit)}
                  </span>
                </div>
                <p className="text-xs font-medium border-t border-border/30 pt-1.5 mt-0.5">
                  {results.track_status}
                </p>
              </div>
            )}
          </Card>

          {results && results.sensitivity_table && results.sensitivity_table.length > 0 ? (
            <Card className="p-5">
              <h4 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">
                📈 Corpus Required vs. Retirement Age
              </h4>
              
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={results.sensitivity_table}
                    margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="corpusColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis 
                      dataKey="age" 
                      tick={{ fill: "currentColor", fontSize: 10 }}
                      className="text-muted-foreground"
                      label={{ value: 'Retirement Age (Years)', position: 'insideBottom', offset: -5, fontSize: 11 }}
                    />
                    <YAxis 
                      tickFormatter={formatChartValue}
                      tick={{ fill: "currentColor", fontSize: 10 }}
                      className="text-muted-foreground"
                    />
                    <Tooltip 
                      formatter={(v: any) => [formatCurrency(Number(v)), "Required Corpus"]}
                      labelFormatter={(label) => `Retires at age: ${label}`}
                      contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="corpus_needed" 
                      stroke="hsl(var(--primary))" 
                      fillOpacity={1} 
                      fill="url(#corpusColor)" 
                      strokeWidth={2}
                    />
                    {(() => {
                      const userAgePoint = results.sensitivity_table.find(
                        p => p.age === inputs.expected_retirement_age
                      );
                      if (userAgePoint) {
                        return (
                          <ReferenceDot
                            x={userAgePoint.age}
                            y={userAgePoint.corpus_needed}
                            r={6}
                            fill="hsl(var(--primary))"
                            stroke="var(--card)"
                            strokeWidth={2}
                          />
                        );
                      }
                      return null;
                    })()}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
                💡 <b>How to read this chart:</b> Retiring earlier dramatically expands the required corpus size because your investments have fewer years to grow, and you have more years in retirement to support with inflated expenses.
              </p>
            </Card>
          ) : (
            <Card className="p-5 flex flex-col items-center justify-center h-64 text-xs text-muted-foreground">
              {loading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span>Calculating and generating chart...</span>
                </div>
              ) : (
                <span>No data available. Configure inputs to generate retirement predictor chart.</span>
              )}
            </Card>
          )}

          <Card className="p-4 bg-muted/10">
            <h5 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Info className="h-4 w-4 text-primary" /> Rules of Thumb (India Context)
            </h5>
            <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
              <li><b>25x Rule:</b> Total corpus should be at least 25 times your annual post-retirement expenses.</li>
              <li><b>4% Rule:</b> Safe withdrawal rate is around 3-4% p.a. adjusted dynamically for inflation.</li>
              <li><b>100-Age Rule:</b> Equity asset allocation % should ideally be equal to 100 minus your current age.</li>
              <li><b>Savings Target:</b> Save and invest at least 20-30% of monthly income toward wealth goals.</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// TAB 3: COST OF DELAY CALCULATOR
// ----------------------------------------------------
interface CostOfDelayTabProps {
  formatCurrency: (val: number) => string;
  formatPercent: (val: number) => string;
  initialInputs: any;
  onSave: (inputs: any) => void;
  onExportPDF: (results: any) => void;
}

function CostOfDelayTab({ 
  formatCurrency, 
  formatPercent, 
  initialInputs, 
  onSave,
  onExportPDF
}: CostOfDelayTabProps) {
  const [inputs, setInputs] = useState({
    monthly_sip_amount: 5000,
    expected_annual_return: 0.12,
    target_age: 60,
    current_age: 35
  });
  const isInitialized = useRef(false);
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial inputs
  useEffect(() => {
    if (initialInputs?.cost_of_delay_inputs && Object.keys(initialInputs.cost_of_delay_inputs).length > 0 && !isInitialized.current) {
      setInputs(initialInputs.cost_of_delay_inputs);
      isInitialized.current = true;
    }
  }, [initialInputs]);

  // Autosave cost of delay inputs
  useEffect(() => {
    const timer = setTimeout(() => {
      onSave(inputs);
    }, 1000);
    return () => clearTimeout(timer);
  }, [inputs]);

  useEffect(() => {
    if (inputs.monthly_sip_amount <= 0) {
      setError("Monthly SIP Amount must be greater than zero.");
      setResults(null);
      return;
    }
    if (inputs.expected_annual_return < 0 || inputs.expected_annual_return > 1) {
      setError("Expected Annual Return must be between 0% and 100% (0.0 and 1.0).");
      setResults(null);
      return;
    }
    if (inputs.current_age < 0 || inputs.target_age < 0) {
      setError("Age values cannot be negative.");
      setResults(null);
      return;
    }
    if (inputs.current_age >= inputs.target_age) {
      setError("Current Age must be less than Target Age.");
      setResults(null);
      return;
    }
    setError(null);

    const calculate = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/wow/cost-delay/calculate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("token")}`
          },
          body: JSON.stringify(inputs)
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || "Calculation failed");
        }
        const data = await res.json();
        setResults(data);
      } catch (err: any) {
        setError(err.message || "Failed to calculate.");
        setResults(null);
      } finally {
        setLoading(false);
      }
    };
    
    const debounceTimer = setTimeout(() => {
      calculate();
    }, 200);
    return () => clearTimeout(debounceTimer);
  }, [inputs]);

  const handleValChange = (key: string, val: number) => {
    setInputs(prev => {
      const next = { ...prev, [key]: val };
      if (key === "target_age" && next.current_age >= val) {
        next.current_age = val - 1;
      }
      if (key === "current_age" && val >= next.target_age) {
        next.target_age = val + 1;
      }
      return next;
    });
  };

  const formatChartValue = (value: number) => {
    if (Math.abs(value) >= 10000000) return `₹${(value / 10000000).toFixed(1)} Cr`;
    if (Math.abs(value) >= 100000) return `₹${(value / 100000).toFixed(0)} L`;
    return `₹${value.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          📉 Cost Of Delay Calculator
        </h3>
        {results && (
          <Button
            onClick={() => onExportPDF(results)}
            className="bg-primary text-primary-foreground hover:bg-primary/95 flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg"
          >
            <Download className="h-4 w-4" /> Export PDF Report
          </Button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-destructive bg-destructive/10 text-destructive text-sm font-semibold">
          ⚠️ {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12 items-start">
        <div className="lg:col-span-4 space-y-4">
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2 mb-3">
              <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">
                📋 Cost of Delay Inputs
              </h4>
              {loading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            </div>

            <InputField 
              label="Monthly SIP Amount (₹)" 
              value={inputs.monthly_sip_amount} 
              min={100} 
              max={10000000} 
              step={500} 
              unit="₹"
              onChange={(v) => handleValChange("monthly_sip_amount", v)} 
            />

            <SliderField 
              label="Expected Annual Return" 
              value={inputs.expected_annual_return} 
              min={0.01} 
              max={0.30} 
              step={0.005} 
              percentage={true}
              onChange={(v) => handleValChange("expected_annual_return", v)} 
            />

            <SliderField 
              label="Target Age for Corpus" 
              value={inputs.target_age} 
              min={30} 
              max={100} 
              step={1} 
              unit="years"
              onChange={(v) => handleValChange("target_age", v)} 
            />

            <SliderField 
              label="Current Age" 
              value={inputs.current_age} 
              min={18} 
              max={inputs.target_age - 1} 
              step={1} 
              unit="years"
              onChange={(v) => handleValChange("current_age", v)} 
            />
          </Card>
        </div>

        <div className="lg:col-span-8 space-y-6">
          {results && (
            <Card className="p-5 bg-destructive/5 border-destructive/20 text-destructive-foreground rounded-xl flex items-start gap-3">
              <TrendingDown className="h-6 w-6 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wider text-destructive">Delay Penalty Warning</h4>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {results.warning_text}
                </p>
              </div>
            </Card>
          )}

          <Card className="p-5">
            <h4 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">
              📊 Delay Cost Comparison Table
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="p-3 font-semibold text-muted-foreground">Starting Age</th>
                    <th className="p-3 font-semibold text-muted-foreground text-right">Years Invested</th>
                    <th className="p-3 font-semibold text-muted-foreground text-right">Total Invested</th>
                    <th className="p-3 font-semibold text-muted-foreground text-right">Future Corpus</th>
                    <th className="p-3 font-semibold text-muted-foreground text-right">Corpus Loss</th>
                    <th className="p-3 font-semibold text-muted-foreground text-right">Penalty %</th>
                  </tr>
                </thead>
                <tbody>
                  {results && results.delay_table && results.delay_table.length > 0 ? (
                    results.delay_table.map((row: any) => {
                      const isSelected = row.start_age === inputs.current_age;
                      return (
                        <tr 
                          key={row.start_age} 
                          className={`border-b border-border/50 transition-colors ${
                            isSelected ? "bg-primary-soft/30 font-semibold" : "hover:bg-muted/10"
                          }`}
                        >
                          <td className="p-3 flex items-center gap-1.5">
                            {row.start_age}
                            {isSelected && <span className="text-[9px] bg-primary text-primary-foreground px-1.5 py-0.2 rounded-full">Current</span>}
                          </td>
                          <td className="p-3 text-right">{row.years_to_invest}</td>
                          <td className="p-3 text-right">{formatCurrency(row.total_invested)}</td>
                          <td className="p-3 text-right">{formatCurrency(row.corpus_at_target)}</td>
                          <td className="p-3 text-right text-destructive">
                            {row.vs_starting_at_25 !== 0 ? formatCurrency(row.vs_starting_at_25) : "—"}
                          </td>
                          <td className="p-3 text-right text-destructive font-medium">
                            {row.delay_cost_percent !== 0 ? `${(Math.abs(row.delay_cost_percent) * 100).toFixed(1)}%` : "0.0%"}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-muted-foreground">
                        {loading ? "Calculating delay table..." : "No data available."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {results && results.delay_table && results.delay_table.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="p-5">
                <h4 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">
                  📉 Future Corpus by Starting Age
                </h4>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={results.delay_table} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="start_age" tick={{ fill: "currentColor", fontSize: 10 }} label={{ value: 'Start Age', position: 'insideBottom', offset: -5, fontSize: 10 }} />
                      <YAxis tickFormatter={formatChartValue} tick={{ fill: "currentColor", fontSize: 10 }} />
                      <Tooltip formatter={(v: any) => [formatCurrency(Number(v)), "Future Corpus"]} labelFormatter={(label) => `Starts at age: ${label}`} contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px', fontSize: '11px' }} />
                      <Bar dataKey="corpus_at_target" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-5">
                <h4 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">
                  💥 Percentage Penalty by Delay
                </h4>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={results.delay_table.map((r: any) => ({ ...r, penalty_pct: Math.abs(r.delay_cost_percent) * 100 }))} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="penaltyColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="start_age" tick={{ fill: "currentColor", fontSize: 10 }} label={{ value: 'Start Age', position: 'insideBottom', offset: -5, fontSize: 10 }} />
                      <YAxis tickFormatter={(v) => `${v}%`} tick={{ fill: "currentColor", fontSize: 10 }} />
                      <Tooltip formatter={(v: any) => [`${Number(v).toFixed(1)}%`, "Total Penalty"]} labelFormatter={(label) => `Starts at age: ${label}`} contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px', fontSize: '11px' }} />
                      <Area type="monotone" dataKey="penalty_pct" stroke="#f43f5e" fillOpacity={1} fill="url(#penaltyColor)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="p-5 flex flex-col items-center justify-center h-64 text-xs text-muted-foreground">
                {loading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span>Calculating and generating chart...</span>
                  </div>
                ) : (
                  <span>No future corpus data. Configure inputs to calculate.</span>
                )}
              </Card>
              <Card className="p-5 flex flex-col items-center justify-center h-64 text-xs text-muted-foreground">
                {loading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span>Calculating and generating chart...</span>
                  </div>
                ) : (
                  <span>No percentage penalty data. Configure inputs to calculate.</span>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// TAB 4: SIP + HOME LOAN IMPACT
// ----------------------------------------------------
interface SipHomeLoanTabProps {
  formatCurrency: (val: number) => string;
  formatPercent: (val: number) => string;
  initialInputs: any;
  onSave: (inputs: any) => void;
  onExportPDF: (results: any) => void;
}

function SipHomeLoanTab({ 
  formatCurrency, 
  formatPercent, 
  initialInputs, 
  onSave,
  onExportPDF
}: SipHomeLoanTabProps) {
  const [inputs, setInputs] = useState({
    monthly_sip: 10000,
    sip_return: 0.12,
    sip_duration: 20,
    stepup_rate: 0.05,
    loan_amount: 5000000,
    loan_rate: 0.085,
    loan_tenure: 20,
    down_payment: 1000000,
    appreciation_rate: 0.06,
    tax_benefit: 50000
  });
  const isInitialized = useRef(false);
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial inputs
  useEffect(() => {
    if (initialInputs?.sip_home_loan_inputs && Object.keys(initialInputs.sip_home_loan_inputs).length > 0 && !isInitialized.current) {
      setInputs(initialInputs.sip_home_loan_inputs);
      isInitialized.current = true;
    }
  }, [initialInputs]);

  // Autosave inputs
  useEffect(() => {
    const timer = setTimeout(() => {
      onSave(inputs);
    }, 1000);
    return () => clearTimeout(timer);
  }, [inputs]);

  useEffect(() => {
    if (inputs.monthly_sip < 0 || inputs.loan_amount < 0 || inputs.down_payment < 0) {
      setError("Financial amounts cannot be negative.");
      setResults(null);
      return;
    }
    if (inputs.sip_duration <= 0 || inputs.loan_tenure <= 0) {
      setError("Tenures/durations must be greater than zero.");
      setResults(null);
      return;
    }
    setError(null);

    const calculate = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/wow/sip-home-loan/calculate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("token")}`
          },
          body: JSON.stringify(inputs)
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || "Calculation failed");
        }
        const data = await res.json();
        setResults(data);
      } catch (err: any) {
        setError(err.message || "Failed to calculate.");
        setResults(null);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      calculate();
    }, 500);
    return () => clearTimeout(debounceTimer);
  }, [inputs]);

  const handleValChange = (key: string, val: number) => {
    setInputs(prev => ({ ...prev, [key]: val }));
  };

  const formatChartValue = (value: number) => {
    if (Math.abs(value) >= 10000000) return `₹${(value / 10000000).toFixed(1)} Cr`;
    if (Math.abs(value) >= 100000) return `₹${(value / 100000).toFixed(0)} L`;
    return `₹${value.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          🏠 SIP + Home Loan Impact Calculator
        </h3>
        {results && (
          <Button
            onClick={() => onExportPDF(results)}
            className="bg-primary text-primary-foreground hover:bg-primary/95 flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg"
          >
            <Download className="h-4 w-4" /> Export PDF Report
          </Button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-destructive bg-destructive/10 text-destructive text-sm font-semibold">
          ⚠️ {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12 items-start">
        <div className="lg:col-span-4 space-y-4">
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2 mb-3">
              <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">
                📈 SIP Strategy Inputs
              </h4>
              {loading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            </div>

            <InputField 
              label="Monthly SIP Amount (₹)" 
              value={inputs.monthly_sip} 
              min={0} max={10000000} step={500} unit="₹"
              onChange={(v) => handleValChange("monthly_sip", v)} 
            />
            <SliderField 
              label="SIP Expected Return" 
              value={inputs.sip_return} 
              min={0.01} max={0.30} step={0.005} percentage={true}
              onChange={(v) => handleValChange("sip_return", v)} 
            />
            <SliderField 
              label="SIP Duration" 
              value={inputs.sip_duration} 
              min={1} max={40} step={1} unit="years"
              onChange={(v) => handleValChange("sip_duration", v)} 
            />
            <SliderField 
              label="Step-Up Rate" 
              value={inputs.stepup_rate} 
              min={0.0} max={0.20} step={0.005} percentage={true}
              onChange={(v) => handleValChange("stepup_rate", v)} 
            />
          </Card>

          <Card className="p-5 space-y-4">
            <h4 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border pb-2 mb-3">
              🏠 Home Loan Inputs
            </h4>
            <InputField 
              label="Loan Amount (₹)" 
              value={inputs.loan_amount} 
              min={0} max={100000000} step={50000} unit="₹"
              onChange={(v) => handleValChange("loan_amount", v)} 
            />
            <SliderField 
              label="Loan Interest Rate" 
              value={inputs.loan_rate} 
              min={0.01} max={0.20} step={0.005} percentage={true}
              onChange={(v) => handleValChange("loan_rate", v)} 
            />
            <SliderField 
              label="Loan Tenure" 
              value={inputs.loan_tenure} 
              min={1} max={40} step={1} unit="years"
              onChange={(v) => handleValChange("loan_tenure", v)} 
            />
            <InputField 
              label="Down Payment (₹)" 
              value={inputs.down_payment} 
              min={0} max={50000000} step={10000} unit="₹"
              onChange={(v) => handleValChange("down_payment", v)} 
            />
            <SliderField 
              label="Property Appreciation Rate" 
              value={inputs.appreciation_rate} 
              min={0.0} max={0.20} step={0.005} percentage={true}
              onChange={(v) => handleValChange("appreciation_rate", v)} 
            />
            <InputField 
              label="Annual Tax Benefit (₹)" 
              value={inputs.tax_benefit} 
              min={0} max={500000} step={5000} unit="₹"
              onChange={(v) => handleValChange("tax_benefit", v)} 
            />
          </Card>
        </div>

        <div className="lg:col-span-8 space-y-6">
          {results && (
            <Card className="p-5 bg-success-soft/20 border-success/30 text-success-foreground rounded-xl flex items-start gap-3">
              <Info className="h-6 w-6 text-success flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wider text-success">Combined Wealth Recommendation</h4>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {results.recommendation_msg}
                </p>
              </div>
            </Card>
          )}

          {results && (
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="p-4 space-y-3">
                <h5 className="text-xs font-bold text-primary uppercase tracking-wider border-b border-border/50 pb-1.5">
                  📈 SIP Accumulation
                </h5>
                <StatResult label="Simple Future Value" value={formatCurrency(results.simple_sip_corpus)} highlight />
                <StatResult label="Step-Up Future Value" value={formatCurrency(results.stepup_sip_corpus)} />
                <StatResult label="Total Capital Invested" value={formatCurrency(results.total_amount_invested)} />
                <StatResult label="Wealth Gained (Simple)" value={formatCurrency(results.wealth_gain)} />
              </Card>

              <Card className="p-4 space-y-3">
                <h5 className="text-xs font-bold text-destructive uppercase tracking-wider border-b border-border/50 pb-1.5">
                  🏠 Home Loan Mortgage
                </h5>
                <StatResult label="Monthly Loan EMI" value={formatCurrency(results.monthly_emi)} highlight />
                <StatResult label="Effective EMI (After Tax)" value={formatCurrency(results.effective_emi)} />
                <StatResult label="Total Amount Repaid" value={formatCurrency(results.total_amount_paid)} />
                <StatResult label="Total Interest Cost" value={formatCurrency(results.total_interest_paid)} />
              </Card>

              <Card className="p-4 space-y-3">
                <h5 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border/50 pb-1.5">
                  🔄 Combined Analysis
                </h5>
                <StatResult label="Total Combined Wealth" value={formatCurrency(results.combined_wealth)} highlight />
                <StatResult label="Net Property Benefit" value={formatCurrency(results.combined_property_net)} />
                <StatResult label="Net Property Gain (ROI)" value={formatCurrency(results.net_property_gain)} />
                <StatResult label="Total Monthly Outflow" value={formatCurrency(results.total_monthly_outflow)} />
              </Card>
            </div>
          )}

          {results && results.sip_series && results.sip_series.length > 0 ? (
            <div className="space-y-6">
              <Card className="p-5">
                <h4 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">
                  📈 SIP Wealth Accumulation (Simple vs. Step-Up)
                </h4>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={results.sip_series} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="colorSimple" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorStepup" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="year" tick={{ fill: "currentColor", fontSize: 10 }} label={{ value: 'Timeline (Years)', position: 'insideBottom', offset: -5, fontSize: 10 }} />
                      <YAxis tickFormatter={formatChartValue} tick={{ fill: "currentColor", fontSize: 10 }} />
                      <Tooltip formatter={(v: any) => [formatCurrency(Number(v)), "Balance"]} labelFormatter={(label) => `Year: ${label}`} contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px', fontSize: '11px' }} />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
                      <Area type="monotone" name="Simple SIP Balance" dataKey="simple_balance" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorSimple)" strokeWidth={2} />
                      <Area type="monotone" name="Step-Up SIP Balance" dataKey="stepup_balance" stroke="#10b981" fillOpacity={1} fill="url(#colorStepup)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <div className="grid gap-6 md:grid-cols-2">
                <Card className="p-5">
                  <h4 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">
                    🏠 Mortgage Amortization Schedule
                  </h4>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={results.loan_series} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                        <defs>
                          <linearGradient id="colorPrincipal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorInterest" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="year" tick={{ fill: "currentColor", fontSize: 10 }} />
                        <YAxis tickFormatter={formatChartValue} tick={{ fill: "currentColor", fontSize: 10 }} />
                        <Tooltip formatter={(v: any) => [formatCurrency(Number(v)), "Paid"]} labelFormatter={(label) => `Year: ${label}`} contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px', fontSize: '11px' }} />
                        <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
                        <Area type="monotone" name="Principal Repaid" dataKey="principal_paid" stroke="#10b981" fillOpacity={1} fill="url(#colorPrincipal)" strokeWidth={2} />
                        <Area type="monotone" name="Interest Cost" dataKey="interest_paid" stroke="#f43f5e" fillOpacity={1} fill="url(#colorInterest)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="p-5">
                  <h4 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">
                    🏢 Property Value Appreciation
                  </h4>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={results.loan_series} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                        <defs>
                          <linearGradient id="colorProp" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="year" tick={{ fill: "currentColor", fontSize: 10 }} />
                        <YAxis tickFormatter={formatChartValue} tick={{ fill: "currentColor", fontSize: 10 }} />
                        <Tooltip formatter={(v: any) => [formatCurrency(Number(v)), "Property Value"]} labelFormatter={(label) => `Year: ${label}`} contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px', fontSize: '11px' }} />
                        <Area type="monotone" name="Property Value" dataKey="property_value" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorProp)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <Card className="p-5 flex flex-col items-center justify-center h-72 text-xs text-muted-foreground">
                {loading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span>Calculating and generating chart...</span>
                  </div>
                ) : (
                  <span>No SIP wealth accumulation data. Configure inputs to calculate.</span>
                )}
              </Card>
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="p-5 flex flex-col items-center justify-center h-64 text-xs text-muted-foreground">
                  {loading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span>Generating amortization schedule...</span>
                    </div>
                  ) : (
                    <span>No mortgage amortization data. Configure inputs to calculate.</span>
                  )}
                </Card>
                <Card className="p-5 flex flex-col items-center justify-center h-64 text-xs text-muted-foreground">
                  {loading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span>Generating appreciation chart...</span>
                    </div>
                  ) : (
                    <span>No property value appreciation data. Configure inputs to calculate.</span>
                  )}
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// TAB 5: FINANCIAL FREEDOM DATE
// ----------------------------------------------------
interface FinancialFreedomDateTabProps {
  formatCurrency: (val: number) => string;
  formatPercent: (val: number) => string;
  initialInputs: any;
  onSave: (inputs: any) => void;
  onExportPDF: (results: any) => void;
}

function FinancialFreedomDateTab({ 
  formatCurrency, 
  formatPercent, 
  initialInputs, 
  onSave,
  onExportPDF
}: FinancialFreedomDateTabProps) {
  const [inputs, setInputs] = useState({
    current_age: 35,
    birth_year: 1991,
    current_monthly_expenses: 50000,
    expected_inflation: 0.06,
    annual_investment_return: 0.12,
    withdrawal_rate: 0.04,
    current_net_worth: 1000000,
    monthly_savings: 20000,
    stepup_rate: 0.05
  });
  const isInitialized = useRef(false);
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial inputs
  useEffect(() => {
    if (initialInputs?.freedom_date_inputs && Object.keys(initialInputs.freedom_date_inputs).length > 0 && !isInitialized.current) {
      setInputs(initialInputs.freedom_date_inputs);
      isInitialized.current = true;
    }
  }, [initialInputs]);

  // Autosave freedom date inputs
  useEffect(() => {
    const timer = setTimeout(() => {
      onSave(inputs);
    }, 1000);
    return () => clearTimeout(timer);
  }, [inputs]);

  useEffect(() => {
    if (inputs.current_age < 0 || inputs.birth_year < 0 || inputs.current_monthly_expenses < 0 || inputs.current_net_worth < 0 || inputs.monthly_savings < 0) {
      setError("Input values cannot be negative.");
      setResults(null);
      return;
    }
    if (inputs.withdrawal_rate <= 0) {
      setError("Withdrawal Rate must be greater than zero.");
      setResults(null);
      return;
    }
    setError(null);

    const calculate = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/wow/freedom-date/calculate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("token")}`
          },
          body: JSON.stringify(inputs)
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || "Calculation failed");
        }
        const data = await res.json();
        setResults(data);
      } catch (err: any) {
        setError(err.message || "Failed to calculate.");
        setResults(null);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      calculate();
    }, 500);
    return () => clearTimeout(debounceTimer);
  }, [inputs]);

  const handleValChange = (key: string, val: number) => {
    setInputs(prev => {
      const next = { ...prev, [key]: val };
      if (key === "current_age") {
        next.birth_year = new Date().getFullYear() - val;
      }
      if (key === "birth_year") {
        next.current_age = new Date().getFullYear() - val;
      }
      return next;
    });
  };

  const formatChartValue = (value: number) => {
    if (Math.abs(value) >= 10000000) return `₹${(value / 10000000).toFixed(1)} Cr`;
    if (Math.abs(value) >= 100000) return `₹${(value / 100000).toFixed(0)} L`;
    return `₹${value.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          📅 Financial Freedom Date Calculator
        </h3>
        {results && (
          <Button
            onClick={() => onExportPDF(results)}
            className="bg-primary text-primary-foreground hover:bg-primary/95 flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg"
          >
            <Download className="h-4 w-4" /> Export PDF Report
          </Button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-destructive bg-destructive/10 text-destructive text-sm font-semibold">
          ⚠️ {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12 items-start">
        <div className="lg:col-span-4 space-y-4">
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2 mb-3">
              <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">
                📋 Freedom Date Inputs
              </h4>
              {loading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            </div>

            <SliderField 
              label="Current Age" 
              value={inputs.current_age} 
              min={18} max={80} step={1} unit="years"
              onChange={(v) => handleValChange("current_age", v)} 
            />

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Birth Year</label>
              <input 
                type="number"
                min={1940} max={2026}
                className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none"
                value={inputs.birth_year}
                onChange={(e) => handleValChange("birth_year", Number(e.target.value))}
              />
            </div>

            <InputField 
              label="Current Monthly Expenses (₹)" 
              value={inputs.current_monthly_expenses} 
              min={0} max={10000000} step={1000} unit="₹"
              onChange={(v) => handleValChange("current_monthly_expenses", v)} 
            />

            <SliderField 
              label="Expected Inflation" 
              value={inputs.expected_inflation} 
              min={0.01} max={0.20} step={0.005} percentage={true}
              onChange={(v) => handleValChange("expected_inflation", v)} 
            />

            <SliderField 
              label="Annual Investment Return" 
              value={inputs.annual_investment_return} 
              min={0.01} max={0.30} step={0.005} percentage={true}
              onChange={(v) => handleValChange("annual_investment_return", v)} 
            />

            <SliderField 
              label="Safe Withdrawal Rate (SWR)" 
              value={inputs.withdrawal_rate} 
              min={0.01} max={0.10} step={0.002} percentage={true}
              onChange={(v) => handleValChange("withdrawal_rate", v)} 
            />

            <InputField 
              label="Current Net Worth (₹)" 
              value={inputs.current_net_worth} 
              min={0} max={1000000000} step={50000} unit="₹"
              onChange={(v) => handleValChange("current_net_worth", v)} 
            />

            <InputField 
              label="Monthly Savings (₹)" 
              value={inputs.monthly_savings} 
              min={0} max={10000000} step={1000} unit="₹"
              onChange={(v) => handleValChange("monthly_savings", v)} 
            />

            <SliderField 
              label="Annual Savings Step-up" 
              value={inputs.stepup_rate} 
              min={0.0} max={0.25} step={0.005} percentage={true}
              onChange={(v) => handleValChange("stepup_rate", v)} 
            />
          </Card>
        </div>

        <div className="lg:col-span-8 space-y-6">
          {results && (
            <Card className="p-5 bg-primary-soft/10 border-primary/20 text-foreground rounded-xl flex items-start gap-3">
              <CheckCircle className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wider text-primary">Financial Freedom Date Milestone</h4>
                <p className="mt-1 text-sm font-semibold">
                  {results.freedom_date_message}
                </p>
              </div>
            </Card>
          )}

          {results && (
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Target FI Number (Corpus)</p>
                <p className="text-xl font-bold text-foreground mt-1">{formatCurrency(results.fi_number)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Based on {formatPercent(inputs.withdrawal_rate)} withdrawal rate</p>
              </Card>

              <Card className="p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Years to FI (Simple)</p>
                <p className="text-xl font-bold text-primary mt-1">{results.years_to_fi.toFixed(1)} Years</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">At constant savings rate</p>
              </Card>

              <Card className="p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Years to FI (Step-Up)</p>
                <p className="text-xl font-bold text-success mt-1">{results.years_to_fi_stepup.toFixed(1)} Years</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Stepping up savings by {formatPercent(inputs.stepup_rate)} annually</p>
              </Card>
            </div>
          )}

          {results && results.timeline_series && results.timeline_series.length > 0 ? (
            <Card className="p-5">
              <h4 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">
                📈 Wealth Accumulation Projection to Freedom
              </h4>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={results.timeline_series} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorProjSimple" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorProjStepup" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="age" tick={{ fill: "currentColor", fontSize: 10 }} label={{ value: 'Age (Years)', position: 'insideBottom', offset: -5, fontSize: 10 }} />
                    <YAxis tickFormatter={formatChartValue} tick={{ fill: "currentColor", fontSize: 10 }} />
                    <Tooltip formatter={(v: any) => [formatCurrency(Number(v)), "Balance"]} labelFormatter={(label) => `Age: ${label}`} contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px', fontSize: '11px' }} />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
                    <Area type="monotone" name="Simple Savings Growth" dataKey="simple_net_worth" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorProjSimple)" strokeWidth={2} />
                    <Area type="monotone" name="Step-Up Savings Growth" dataKey="stepup_net_worth" stroke="#10b981" fillOpacity={1} fill="url(#colorProjStepup)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          ) : (
            <Card className="p-5 flex flex-col items-center justify-center h-72 text-xs text-muted-foreground">
              {loading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span>Calculating and generating chart...</span>
                </div>
              ) : (
                <span>No projection data. Configure inputs to calculate wealth projection.</span>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// TAB 6: GOAL VISUALIZATION DASHBOARD
// ----------------------------------------------------
interface GoalVisualizationDashboardTabProps {
  formatCurrency: (val: number) => string;
  formatPercent: (val: number) => string;
  onExportPDF: (results: any) => void;
}

function GoalVisualizationDashboardTab({ 
  formatCurrency, 
  formatPercent,
  onExportPDF
}: GoalVisualizationDashboardTabProps) {
  const [goalsData, setGoalsData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formInputs, setFormInputs] = useState({
    name: "",
    target_amount: 500000,
    current_saved: 50000,
    monthly_sip: 5000,
    timeline_years: 5
  });

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/wow/goals`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      });
      if (!res.ok) throw new Error("Failed to load goals");
      const data = await res.json();
      setGoalsData(data);
    } catch (err: any) {
      setError(err.message || "Failed to load goals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formInputs.name.trim()) return;
    setLoading(true);
    try {
      const url = isEditing 
        ? `${API_URL}/wow/goals/${editingId}`
        : `${API_URL}/wow/goals`;
      const method = isEditing ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(formInputs)
      });
      
      if (!res.ok) throw new Error("Failed to save goal");
      
      setFormInputs({
        name: "",
        target_amount: 500000,
        current_saved: 50000,
        monthly_sip: 5000,
        timeline_years: 5
      });
      setIsEditing(false);
      setEditingId(null);
      
      await fetchGoals();
    } catch (err: any) {
      setError(err.message || "Failed to save goal");
      setLoading(false);
    }
  };

  const handleEditClick = (g: any) => {
    setIsEditing(true);
    setEditingId(g.id);
    setFormInputs({
      name: g.name,
      target_amount: g.target_amount,
      current_saved: g.current_saved,
      monthly_sip: g.monthly_sip,
      timeline_years: g.timeline_years
    });
  };

  const handleDeleteClick = async (id: number) => {
    if (!confirm("Are you sure you want to delete this goal?")) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/wow/goals/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      });
      if (!res.ok) throw new Error("Failed to delete goal");
      await fetchGoals();
    } catch (err: any) {
      setError(err.message || "Failed to delete goal");
      setLoading(false);
    }
  };

  const colors = ["hsl(var(--primary))", "#10b981", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4"];

  const allocationData = goalsData?.goals.map((g: any, index: number) => ({
    name: g.name,
    value: g.target_amount,
    color: colors[index % colors.length]
  })) || [];

  const formatChartValue = (value: number) => {
    if (Math.abs(value) >= 10000000) return `₹${(value / 10000000).toFixed(1)} Cr`;
    if (Math.abs(value) >= 100000) return `₹${(value / 100000).toFixed(0)} L`;
    return `₹${value.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          🎯 Goal Visualization Dashboard
        </h3>
        {goalsData && goalsData.goals.length > 0 && (
          <Button
            onClick={() => onExportPDF(goalsData)}
            className="bg-primary text-primary-foreground hover:bg-primary/95 flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg"
          >
            <Download className="h-4 w-4" /> Export PDF Report
          </Button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-destructive bg-destructive/10 text-destructive text-sm font-semibold">
          ⚠️ {error}
        </div>
      )}

      {goalsData && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Overall Goal Target</p>
            <p className="text-xl font-bold text-foreground mt-1">{formatCurrency(goalsData.total_target)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Sum of all goal targets</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Current Total Savings</p>
            <p className="text-xl font-bold text-primary mt-1">{formatCurrency(goalsData.total_saved)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {formatPercent(goalsData.overall_percent_achieved)} of total target saved
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Total Monthly SIP</p>
            <p className="text-xl font-bold text-foreground mt-1">{formatCurrency(goalsData.total_sip)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Active portfolio contribution</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Total Active Goals</p>
            <p className="text-xl font-bold text-foreground mt-1">{goalsData.goals.length} goals</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Defined visualization targets</p>
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12 items-start">
        <div className="lg:col-span-4 space-y-4">
          <Card className="p-5 space-y-4">
            <h4 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border pb-2 mb-3">
              {isEditing ? "✏️ Edit Financial Goal" : "➕ Add New Financial Goal"}
            </h4>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Goal Name</label>
                <input 
                  type="text" 
                  className="w-full bg-background border border-border rounded-lg p-2.5 mt-1 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  placeholder="e.g. Dream House, Child Education"
                  value={formInputs.name}
                  onChange={(e) => setFormInputs(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <InputField 
                label="Target Amount (₹)" 
                value={formInputs.target_amount} 
                min={1000} max={1000000000} step={10000} unit="₹"
                onChange={(v) => setFormInputs(prev => ({ ...prev, target_amount: v }))} 
              />

              <InputField 
                label="Current Saved (₹)" 
                value={formInputs.current_saved} 
                min={0} max={1000000000} step={5000} unit="₹"
                onChange={(v) => setFormInputs(prev => ({ ...prev, current_saved: v }))} 
              />

              <InputField 
                label="Monthly SIP Amount (₹)" 
                value={formInputs.monthly_sip} 
                min={0} max={10000000} step={500} unit="₹"
                onChange={(v) => setFormInputs(prev => ({ ...prev, monthly_sip: v }))} 
              />

              <SliderField 
                label="Timeline (Years)" 
                value={formInputs.timeline_years} 
                min={1} max={40} step={1} unit="years"
                onChange={(v) => setFormInputs(prev => ({ ...prev, timeline_years: v }))} 
              />

              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1 bg-primary text-primary-foreground text-xs font-bold py-2 rounded-lg" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : isEditing ? "Save Changes" : "Create Goal"}
                </Button>
                {isEditing && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="text-xs font-bold" 
                    onClick={() => {
                      setIsEditing(false);
                      setEditingId(null);
                      setFormInputs({ name: "", target_amount: 500000, current_saved: 50000, monthly_sip: 5000, timeline_years: 5 });
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </Card>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <Card className="p-5">
            <h4 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 flex items-center justify-between">
              🎯 Active Financial Goals
              {loading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="p-3 font-semibold text-muted-foreground">Goal Name</th>
                    <th className="p-3 font-semibold text-muted-foreground text-right">Target Amount</th>
                    <th className="p-3 font-semibold text-muted-foreground text-right">Current Saved</th>
                    <th className="p-3 font-semibold text-muted-foreground text-right">Monthly SIP</th>
                    <th className="p-3 font-semibold text-muted-foreground text-center">Timeline</th>
                    <th className="p-3 font-semibold text-muted-foreground text-center">Progress</th>
                    <th className="p-3 font-semibold text-muted-foreground text-center">Status</th>
                    <th className="p-3 font-semibold text-muted-foreground text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {goalsData?.goals.map((g: any, index: number) => {
                    const color = colors[index % colors.length];
                    return (
                      <tr key={g.id} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                        <td className="p-3 font-semibold flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }}></span>
                          {g.name}
                        </td>
                        <td className="p-3 text-right">{formatCurrency(g.target_amount)}</td>
                        <td className="p-3 text-right text-primary font-semibold">{formatCurrency(g.current_saved)}</td>
                        <td className="p-3 text-right">{formatCurrency(g.monthly_sip)}</td>
                        <td className="p-3 text-center">{g.timeline_years} yrs</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2 justify-center">
                            <div className="w-16 bg-muted rounded-full h-1.5 overflow-hidden">
                              <div className="bg-primary h-1.5" style={{ width: `${Math.min(100, g.percent_achieved * 100)}%` }}></div>
                            </div>
                            <span>{(g.percent_achieved * 100).toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span className="text-[10px] bg-primary-soft/30 text-primary px-1.5 py-0.5 rounded font-bold whitespace-nowrap">
                            {g.status}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button type="button" onClick={() => handleEditClick(g)} className="text-muted-foreground hover:text-primary transition-colors">
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button type="button" onClick={() => handleDeleteClick(g.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!goalsData || goalsData.goals.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-muted-foreground">
                        No financial goals defined yet. Create your first goal to visualize progress!
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>

          {goalsData && goalsData.goals.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="p-5">
                <h4 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">
                  🍩 Target Allocation
                </h4>
                <div className="h-64 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={allocationData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {allocationData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-5">
                <h4 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">
                  📊 Monthly SIP Contributions
                </h4>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={goalsData.goals} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" tick={{ fill: "currentColor", fontSize: 10 }} />
                      <YAxis tickFormatter={formatChartValue} tick={{ fill: "currentColor", fontSize: 10 }} />
                      <Tooltip formatter={(v: any) => [formatCurrency(Number(v)), "Monthly SIP"]} />
                      <Bar dataKey="monthly_sip" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="p-5 flex flex-col items-center justify-center h-64 text-xs text-muted-foreground">
                {loading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span>Loading goals...</span>
                  </div>
                ) : (
                  <span>No goal allocation data. Create a financial goal to visualize target allocation.</span>
                )}
              </Card>
              <Card className="p-5 flex flex-col items-center justify-center h-64 text-xs text-muted-foreground">
                {loading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span>Loading goals...</span>
                  </div>
                ) : (
                  <span>No SIP data. Create a financial goal to visualize monthly SIP contributions.</span>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// TAB 7: FAMILY FINANCIAL VAULT (Redesigned)
// ----------------------------------------------------
interface FamilyFinancialVaultTabProps {
  formatCurrency: (val: number) => string;
  formatPercent: (val: number) => string;
  onExportPDF: (vaultData: any) => void;
}

function FamilyFinancialVaultTab({ 
  formatCurrency, 
  formatPercent,
  onExportPDF
}: FamilyFinancialVaultTabProps) {
  const [vaultData, setVaultData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Accordion Toggles
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    family: true,
    insurance: true,
    investment: true,
    document: true,
    contact: true,
    bank: true
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Form display toggles per section
  const [activeForm, setActiveForm] = useState<{ section: string | null; isEdit: boolean; id: number | null }>({
    section: null,
    isEdit: false,
    id: null
  });

  // Section inputs state
  const [familyInputs, setFamilyInputs] = useState({ name: "", relationship: "", dob: "", pan_number: "", aadhaar_last_four: "", blood_group: "" });
  const [insuranceInputs, setInsuranceInputs] = useState({ policy_type: "Term Life", company: "", policy_number: "", sum_assured: 5000000, premium_amount: 15000, expiry_date: "" });
  const [investmentInputs, setInvestmentInputs] = useState({ investment_type: "Mutual Fund", scheme_name: "", account_folio_number: "", current_value: 100000, nominee: "", institution: "" });
  const [documentInputs, setDocumentInputs] = useState({ document_name: "Will", storage_location: "", last_updated: "", digital_copy_stored_at: "", status: "Done" });
  const [contactInputs, setContactInputs] = useState({ name: "", relationship: "", mobile: "", email: "", role_purpose: "" });
  const [bankInputs, setBankInputs] = useState({ bank_card_name: "", account_type: "Savings Account", last_four_digits: "", branch_limit: "", nominee: "", status: "Active" });

  const fetchVault = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/wow/vault`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      });
      if (!res.ok) throw new Error("Failed to load vault items");
      const data = await res.json();
      setVaultData(data);
    } catch (err: any) {
      setError(err.message || "Failed to load vault");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVault();
  }, []);

  const resetForms = () => {
    setFamilyInputs({ name: "", relationship: "", dob: "", pan_number: "", aadhaar_last_four: "", blood_group: "" });
    setInsuranceInputs({ policy_type: "Term Life", company: "", policy_number: "", sum_assured: 5000000, premium_amount: 15000, expiry_date: "" });
    setInvestmentInputs({ investment_type: "Mutual Fund", scheme_name: "", account_folio_number: "", current_value: 100000, nominee: "", institution: "" });
    setDocumentInputs({ document_name: "Will", storage_location: "", last_updated: "", digital_copy_stored_at: "", status: "Done" });
    setContactInputs({ name: "", relationship: "", mobile: "", email: "", role_purpose: "" });
    setBankInputs({ bank_card_name: "", account_type: "Savings Account", last_four_digits: "", branch_limit: "", nominee: "", status: "Active" });
    setActiveForm({ section: null, isEdit: false, id: null });
  };

  const handleFormSubmit = async (e: React.FormEvent, section: string) => {
    e.preventDefault();
    setLoading(true);
    try {
      const isEdit = activeForm.section === section && activeForm.isEdit;
      const url = isEdit
        ? `${API_URL}/wow/vault/${activeForm.id}?type=${section}`
        : `${API_URL}/wow/vault?type=${section}`;
      const method = isEdit ? "PUT" : "POST";

      const payload: any = {};
      if (section === "family") payload.family_member = familyInputs;
      if (section === "insurance") payload.insurance_policy = insuranceInputs;
      if (section === "investment") payload.investment = investmentInputs;
      if (section === "document") payload.important_document = documentInputs;
      if (section === "contact") payload.emergency_contact = contactInputs;
      if (section === "bank_account") payload.bank_account = bankInputs;

      const res = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to save record");
      
      resetForms();
      await fetchVault();
    } catch (err: any) {
      setError(err.message || "Failed to save record");
      setLoading(false);
    }
  };

  const handleEditClick = (section: string, item: any) => {
    setActiveForm({ section, isEdit: true, id: item.id });
    setExpandedSections(prev => ({ ...prev, [section]: true }));

    if (section === "family") setFamilyInputs({ name: item.name, relationship: item.relationship, dob: item.dob, pan_number: item.pan_number || "", aadhaar_last_four: item.aadhaar_last_four || "", blood_group: item.blood_group || "" });
    if (section === "insurance") setInsuranceInputs({ policy_type: item.policy_type, company: item.company, policy_number: item.policy_number, sum_assured: item.sum_assured, premium_amount: item.premium_amount, expiry_date: item.expiry_date || "" });
    if (section === "investment") setInvestmentInputs({ investment_type: item.investment_type, scheme_name: item.scheme_name, account_folio_number: item.account_folio_number, current_value: item.current_value, nominee: item.nominee, institution: item.institution });
    if (section === "document") setDocumentInputs({ document_name: item.document_name, storage_location: item.storage_location, last_updated: item.last_updated, digital_copy_stored_at: item.digital_copy_stored_at, status: item.status });
    if (section === "contact") setContactInputs({ name: item.name, relationship: item.relationship, mobile: item.mobile, email: item.email, role_purpose: item.role_purpose });
    if (section === "bank_account") setBankInputs({ bank_card_name: item.bank_card_name, account_type: item.account_type, last_four_digits: item.last_four_digits, branch_limit: item.branch_limit, nominee: item.nominee, status: item.status });
  };

  const handleDeleteClick = async (section: string, id: number) => {
    if (!confirm("Are you sure you want to delete this vault item?")) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/wow/vault/${id}?type=${section}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      });
      if (!res.ok) throw new Error("Failed to delete item");
      await fetchVault();
    } catch (err: any) {
      setError(err.message || "Failed to delete item");
      setLoading(false);
    }
  };

  // Summary totals calculation
  const totalLifeCover = vaultData?.insurance_policies?.reduce((acc: number, p: any) => acc + p.sum_assured, 0) || 0;
  const totalPortfolioValue = vaultData?.investments?.reduce((acc: number, i: any) => acc + i.current_value, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            🔐 Family Financial Vault
          </h3>
          <p className="text-[11px] text-muted-foreground">Secure details of family, documents, insurance & investments — CONFIDENTIAL</p>
        </div>
        {vaultData && (
          <Button
            onClick={() => onExportPDF(vaultData)}
            className="bg-primary text-primary-foreground hover:bg-primary/95 flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg"
          >
            <Download className="h-4 w-4" /> Export Vault Report
          </Button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-destructive bg-destructive/10 text-destructive text-sm font-semibold">
          ⚠️ {error}
        </div>
      )}

      {/* SUMMARY TOTAL CARDS */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-4 bg-primary-soft/10 border-primary/20">
          <p className="text-xs font-bold text-muted-foreground uppercase">🛡️ Total Life Cover</p>
          <p className="text-2xl font-black text-primary mt-1">{formatCurrency(totalLifeCover)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Sum of all life insurance policies sum assured</p>
        </Card>
        <Card className="p-4 bg-success-soft/10 border-success/20">
          <p className="text-xs font-bold text-muted-foreground uppercase">💰 Total Portfolio Value</p>
          <p className="text-2xl font-black text-success mt-1">{formatCurrency(totalPortfolioValue)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Sum of all investment values</p>
        </Card>
      </div>

      <div className="space-y-4">
        {/* SECTION 1: FAMILY MEMBER DETAILS */}
        <VaultSectionAccordion 
          title="👪 1. Family Member Details" 
          expanded={expandedSections.family}
          onToggle={() => toggleSection("family")}
          count={vaultData?.family_members?.length || 0}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="p-3 font-semibold text-muted-foreground">Name</th>
                  <th className="p-3 font-semibold text-muted-foreground">Relationship</th>
                  <th className="p-3 font-semibold text-muted-foreground">Date of Birth</th>
                  <th className="p-3 font-semibold text-muted-foreground">PAN Number</th>
                  <th className="p-3 font-semibold text-muted-foreground text-center">Aadhaar (Last 4)</th>
                  <th className="p-3 font-semibold text-muted-foreground text-center">Blood Group</th>
                  <th className="p-3 font-semibold text-muted-foreground text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vaultData?.family_members?.map((m: any) => (
                  <tr key={m.id} className="border-b border-border/40 hover:bg-muted/10">
                    <td className="p-3 font-bold">{m.name}</td>
                    <td className="p-3">{m.relationship}</td>
                    <td className="p-3">{m.dob}</td>
                    <td className="p-3">{m.pan_number || "—"}</td>
                    <td className="p-3 text-center">{m.aadhaar_last_four || "—"}</td>
                    <td className="p-3 text-center font-semibold text-primary">{m.blood_group || "—"}</td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center gap-1.5">
                        <button type="button" onClick={() => handleEditClick("family", m)} className="text-muted-foreground hover:text-primary"><Edit className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => handleDeleteClick("family", m.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!vaultData?.family_members?.length && (
                  <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">No records added.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="pt-3 border-t border-border/40">
            {activeForm.section === "family" ? (
              <form onSubmit={(e) => handleFormSubmit(e, "family")} className="bg-muted/20 p-4 rounded-xl border border-border/80 space-y-3">
                <h5 className="text-xs font-bold text-foreground uppercase">{activeForm.isEdit ? "✏️ Edit Member" : "➕ Add Family Member"}</h5>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Name</label>
                    <input type="text" required className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none" value={familyInputs.name} onChange={(e) => setFamilyInputs(prev => ({ ...prev, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Relationship</label>
                    <input type="text" required placeholder="e.g. Spouse, Son" className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none" value={familyInputs.relationship} onChange={(e) => setFamilyInputs(prev => ({ ...prev, relationship: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Date of Birth</label>
                    <input type="text" required placeholder="e.g. 15-Jan-1990" className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none" value={familyInputs.dob} onChange={(e) => setFamilyInputs(prev => ({ ...prev, dob: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">PAN Number</label>
                    <input type="text" className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none" value={familyInputs.pan_number} onChange={(e) => setFamilyInputs(prev => ({ ...prev, pan_number: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Aadhaar (Last 4)</label>
                    <input type="text" maxLength={4} className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none" value={familyInputs.aadhaar_last_four} onChange={(e) => setFamilyInputs(prev => ({ ...prev, aadhaar_last_four: e.target.value.replace(/\D/g, "") }))} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Blood Group</label>
                    <input type="text" placeholder="e.g. O+, A-" className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none" value={familyInputs.blood_group} onChange={(e) => setFamilyInputs(prev => ({ ...prev, blood_group: e.target.value }))} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm">Save</Button>
                  <Button type="button" variant="outline" size="sm" onClick={resetForms}>Cancel</Button>
                </div>
              </form>
            ) : (
              <Button onClick={() => setActiveForm({ section: "family", isEdit: false, id: null })} size="sm" className="flex items-center gap-1.5"><Plus className="h-4 w-4" /> Add Record</Button>
            )}
          </div>
        </VaultSectionAccordion>

        {/* SECTION 2: INSURANCE POLICIES */}
        <VaultSectionAccordion 
          title="🛡️ 2. Insurance Policies" 
          expanded={expandedSections.insurance}
          onToggle={() => toggleSection("insurance")}
          count={vaultData?.insurance_policies?.length || 0}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="p-3 font-semibold text-muted-foreground">Policy Type</th>
                  <th className="p-3 font-semibold text-muted-foreground">Company</th>
                  <th className="p-3 font-semibold text-muted-foreground">Policy Number</th>
                  <th className="p-3 font-semibold text-muted-foreground text-right">Sum Assured</th>
                  <th className="p-3 font-semibold text-muted-foreground text-right">Premium / Year</th>
                  <th className="p-3 font-semibold text-muted-foreground text-center">Expiry / Maturity</th>
                  <th className="p-3 font-semibold text-muted-foreground text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vaultData?.insurance_policies?.map((i: any) => (
                  <tr key={i.id} className="border-b border-border/40 hover:bg-muted/10">
                    <td className="p-3 font-bold">{i.policy_type}</td>
                    <td className="p-3">{i.company}</td>
                    <td className="p-3 font-mono">{i.policy_number}</td>
                    <td className="p-3 text-right font-semibold">{formatCurrency(i.sum_assured)}</td>
                    <td className="p-3 text-right">{formatCurrency(i.premium_amount)}</td>
                    <td className="p-3 text-center">{i.expiry_date || "—"}</td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center gap-1.5">
                        <button type="button" onClick={() => handleEditClick("insurance", i)} className="text-muted-foreground hover:text-primary"><Edit className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => handleDeleteClick("insurance", i.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {vaultData?.insurance_policies?.length > 0 && (
                  <tr className="bg-muted/20 font-bold border-t border-border">
                    <td colSpan={3} className="p-3 text-right uppercase text-xs">Total Cover:</td>
                    <td className="p-3 text-right text-primary text-xs">{formatCurrency(totalLifeCover)}</td>
                    <td colSpan={3} className="p-3"></td>
                  </tr>
                )}
                {!vaultData?.insurance_policies?.length && (
                  <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">No records added.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="pt-3 border-t border-border/40">
            {activeForm.section === "insurance" ? (
              <form onSubmit={(e) => handleFormSubmit(e, "insurance")} className="bg-muted/20 p-4 rounded-xl border border-border/80 space-y-3">
                <h5 className="text-xs font-bold text-foreground uppercase">{activeForm.isEdit ? "✏️ Edit Policy" : "➕ Add Insurance Policy"}</h5>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Policy Type</label>
                    <select className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none" value={insuranceInputs.policy_type} onChange={(e) => setInsuranceInputs(prev => ({ ...prev, policy_type: e.target.value }))}>
                      <option value="Term Life Insurance">Term Life Insurance</option>
                      <option value="Health Insurance">Health Insurance</option>
                      <option value="Motor Insurance">Motor Insurance</option>
                      <option value="Critical Illness">Critical Illness</option>
                      <option value="Home Insurance">Home Insurance</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Company</label>
                    <input type="text" required className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none" value={insuranceInputs.company} onChange={(e) => setInsuranceInputs(prev => ({ ...prev, company: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Policy Number</label>
                    <input type="text" required className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none" value={insuranceInputs.policy_number} onChange={(e) => setInsuranceInputs(prev => ({ ...prev, policy_number: e.target.value }))} />
                  </div>
                  <InputField 
                    label="Sum Assured (₹)" 
                    value={insuranceInputs.sum_assured} 
                    min={0} max={1000000000} step={50000} unit="₹"
                    onChange={(v) => setInsuranceInputs(prev => ({ ...prev, sum_assured: v }))} 
                  />
                  <InputField 
                    label="Premium Amount (₹)" 
                    value={insuranceInputs.premium_amount} 
                    min={0} max={5000000} step={500} unit="₹"
                    onChange={(v) => setInsuranceInputs(prev => ({ ...prev, premium_amount: v }))} 
                  />
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Maturity / Expiry</label>
                    <input type="text" placeholder="e.g. 12-Dec-2035" className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none" value={insuranceInputs.expiry_date} onChange={(e) => setInsuranceInputs(prev => ({ ...prev, expiry_date: e.target.value }))} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm">Save</Button>
                  <Button type="button" variant="outline" size="sm" onClick={resetForms}>Cancel</Button>
                </div>
              </form>
            ) : (
              <Button onClick={() => setActiveForm({ section: "insurance", isEdit: false, id: null })} size="sm" className="flex items-center gap-1.5"><Plus className="h-4 w-4" /> Add Record</Button>
            )}
          </div>
        </VaultSectionAccordion>

        {/* SECTION 3: INVESTMENT PORTFOLIO */}
        <VaultSectionAccordion 
          title="📈 3. Investment Portfolio" 
          expanded={expandedSections.investment}
          onToggle={() => toggleSection("investment")}
          count={vaultData?.investments?.length || 0}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="p-3 font-semibold text-muted-foreground">Investment Type</th>
                  <th className="p-3 font-semibold text-muted-foreground">Scheme Name</th>
                  <th className="p-3 font-semibold text-muted-foreground">Folio / Account No.</th>
                  <th className="p-3 font-semibold text-muted-foreground text-right">Current Value</th>
                  <th className="p-3 font-semibold text-muted-foreground">Nominee</th>
                  <th className="p-3 font-semibold text-muted-foreground">Institution</th>
                  <th className="p-3 font-semibold text-muted-foreground text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vaultData?.investments?.map((i: any) => (
                  <tr key={i.id} className="border-b border-border/40 hover:bg-muted/10">
                    <td className="p-3 font-bold">{i.investment_type}</td>
                    <td className="p-3">{i.scheme_name}</td>
                    <td className="p-3 font-mono">{i.account_folio_number}</td>
                    <td className="p-3 text-right font-semibold text-success">{formatCurrency(i.current_value)}</td>
                    <td className="p-3">{i.nominee}</td>
                    <td className="p-3">{i.institution}</td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center gap-1.5">
                        <button type="button" onClick={() => handleEditClick("investment", i)} className="text-muted-foreground hover:text-primary"><Edit className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => handleDeleteClick("investment", i.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {vaultData?.investments?.length > 0 && (
                  <tr className="bg-muted/20 font-bold border-t border-border">
                    <td colSpan={3} className="p-3 text-right uppercase text-xs">Total Portfolio Value:</td>
                    <td className="p-3 text-right text-success text-xs">{formatCurrency(totalPortfolioValue)}</td>
                    <td colSpan={3} className="p-3"></td>
                  </tr>
                )}
                {!vaultData?.investments?.length && (
                  <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">No records added.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="pt-3 border-t border-border/40">
            {activeForm.section === "investment" ? (
              <form onSubmit={(e) => handleFormSubmit(e, "investment")} className="bg-muted/20 p-4 rounded-xl border border-border/80 space-y-3">
                <h5 className="text-xs font-bold text-foreground uppercase">{activeForm.isEdit ? "✏️ Edit Investment" : "➕ Add Investment"}</h5>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Investment Type</label>
                    <select className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none" value={investmentInputs.investment_type} onChange={(e) => setInvestmentInputs(prev => ({ ...prev, investment_type: e.target.value }))}>
                      <option value="Mutual Fund">Mutual Fund</option>
                      <option value="EPF / PPF">EPF / PPF</option>
                      <option value="Equity Shares">Equity Shares</option>
                      <option value="Gold / SGB">Gold / SGB</option>
                      <option value="Real Estate">Real Estate</option>
                      <option value="NPS">NPS</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Scheme Name</label>
                    <input type="text" required className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none" value={investmentInputs.scheme_name} onChange={(e) => setInvestmentInputs(prev => ({ ...prev, scheme_name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Account/Folio Number</label>
                    <input type="text" required className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none" value={investmentInputs.account_folio_number} onChange={(e) => setInvestmentInputs(prev => ({ ...prev, account_folio_number: e.target.value }))} />
                  </div>
                  <InputField 
                    label="Current Value (₹)" 
                    value={investmentInputs.current_value} 
                    min={0} max={1000000000} step={5000} unit="₹"
                    onChange={(v) => setInvestmentInputs(prev => ({ ...prev, current_value: v }))} 
                  />
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Nominee</label>
                    <input type="text" required className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none" value={investmentInputs.nominee} onChange={(e) => setInvestmentInputs(prev => ({ ...prev, nominee: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Institution</label>
                    <input type="text" required placeholder="e.g. SBI Mutual Fund, Zerodha" className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none" value={investmentInputs.institution} onChange={(e) => setInvestmentInputs(prev => ({ ...prev, institution: e.target.value }))} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm">Save</Button>
                  <Button type="button" variant="outline" size="sm" onClick={resetForms}>Cancel</Button>
                </div>
              </form>
            ) : (
              <Button onClick={() => setActiveForm({ section: "investment", isEdit: false, id: null })} size="sm" className="flex items-center gap-1.5"><Plus className="h-4 w-4" /> Add Record</Button>
            )}
          </div>
        </VaultSectionAccordion>

        {/* SECTION 4: IMPORTANT DOCUMENTS CHECKLIST */}
        <VaultSectionAccordion 
          title="📁 4. Important Documents Checklist" 
          expanded={expandedSections.document}
          onToggle={() => toggleSection("document")}
          count={vaultData?.important_documents?.length || 0}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="p-3 font-semibold text-muted-foreground">Document Name</th>
                  <th className="p-3 font-semibold text-muted-foreground">Storage Location</th>
                  <th className="p-3 font-semibold text-muted-foreground">Last Updated</th>
                  <th className="p-3 font-semibold text-muted-foreground">Digital Copy Stored At</th>
                  <th className="p-3 font-semibold text-muted-foreground text-center">Status</th>
                  <th className="p-3 font-semibold text-muted-foreground text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vaultData?.important_documents?.map((d: any) => (
                  <tr key={d.id} className="border-b border-border/40 hover:bg-muted/10">
                    <td className="p-3 font-bold flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      {d.document_name}
                    </td>
                    <td className="p-3">{d.storage_location}</td>
                    <td className="p-3">{d.last_updated}</td>
                    <td className="p-3">{d.digital_copy_stored_at || "—"}</td>
                    <td className="p-3 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        d.status === "Done" ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
                      }`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center gap-1.5">
                        <button type="button" onClick={() => handleEditClick("document", d)} className="text-muted-foreground hover:text-primary"><Edit className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => handleDeleteClick("document", d.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!vaultData?.important_documents?.length && (
                  <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No documents tracked.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="pt-3 border-t border-border/40">
            {activeForm.section === "document" ? (
              <form onSubmit={(e) => handleFormSubmit(e, "document")} className="bg-muted/20 p-4 rounded-xl border border-border/80 space-y-3">
                <h5 className="text-xs font-bold text-foreground uppercase">{activeForm.isEdit ? "✏️ Edit Checklist Item" : "➕ Track Document"}</h5>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Document Name</label>
                    <select className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none" value={documentInputs.document_name} onChange={(e) => setDocumentInputs(prev => ({ ...prev, document_name: e.target.value }))}>
                      <option value="Will / Testament">Will / Testament</option>
                      <option value="Property Deeds / Documents">Property Deeds / Documents</option>
                      <option value="Aadhaar Card">Aadhaar Card</option>
                      <option value="PAN Card">PAN Card</option>
                      <option value="Passport">Passport</option>
                      <option value="Marriage Certificate">Marriage Certificate</option>
                      <option value="Birth Certificate">Birth Certificate</option>
                      <option value="Educational Certificates">Educational Certificates</option>
                      <option value="Vehicle RC & Insurance">Vehicle RC & Insurance</option>
                      <option value="IT Returns File">IT Returns File</option>
                      <option value="Other Policy Documents">Other Policy Documents</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Storage Location</label>
                    <input type="text" required placeholder="e.g. Home Safe, Bank Locker" className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none" value={documentInputs.storage_location} onChange={(e) => setDocumentInputs(prev => ({ ...prev, storage_location: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Last Updated / Verified</label>
                    <input type="text" placeholder="e.g. Jan 2024" className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none" value={documentInputs.last_updated} onChange={(e) => setDocumentInputs(prev => ({ ...prev, last_updated: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Digital Copy Folder Link</label>
                    <input type="text" placeholder="e.g. Google Drive, DigiLocker" className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none" value={documentInputs.digital_copy_stored_at} onChange={(e) => setDocumentInputs(prev => ({ ...prev, digital_copy_stored_at: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Status</label>
                    <select className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none" value={documentInputs.status} onChange={(e) => setDocumentInputs(prev => ({ ...prev, status: e.target.value }))}>
                      <option value="Done">Done</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm">Save</Button>
                  <Button type="button" variant="outline" size="sm" onClick={resetForms}>Cancel</Button>
                </div>
              </form>
            ) : (
              <Button onClick={() => setActiveForm({ section: "document", isEdit: false, id: null })} size="sm" className="flex items-center gap-1.5"><Plus className="h-4 w-4" /> Add Record</Button>
            )}
          </div>
        </VaultSectionAccordion>

        {/* SECTION 5: EMERGENCY CONTACTS & NOMINEES */}
        <VaultSectionAccordion 
          title="📞 5. Emergency Contacts & Nominees" 
          expanded={expandedSections.contact}
          onToggle={() => toggleSection("contact")}
          count={vaultData?.emergency_contacts?.length || 0}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="p-3 font-semibold text-muted-foreground">Name</th>
                  <th className="p-3 font-semibold text-muted-foreground">Relationship</th>
                  <th className="p-3 font-semibold text-muted-foreground">Mobile</th>
                  <th className="p-3 font-semibold text-muted-foreground">Email</th>
                  <th className="p-3 font-semibold text-muted-foreground">Role / Purpose</th>
                  <th className="p-3 font-semibold text-muted-foreground text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vaultData?.emergency_contacts?.map((c: any) => (
                  <tr key={c.id} className="border-b border-border/40 hover:bg-muted/10">
                    <td className="p-3 font-bold">{c.name}</td>
                    <td className="p-3">{c.relationship}</td>
                    <td className="p-3 font-mono">{c.mobile}</td>
                    <td className="p-3">{c.email}</td>
                    <td className="p-3 text-muted-foreground">{c.role_purpose}</td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center gap-1.5">
                        <button type="button" onClick={() => handleEditClick("contact", c)} className="text-muted-foreground hover:text-primary"><Edit className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => handleDeleteClick("contact", c.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!vaultData?.emergency_contacts?.length && (
                  <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No records added.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="pt-3 border-t border-border/40">
            {activeForm.section === "contact" ? (
              <form onSubmit={(e) => handleFormSubmit(e, "contact")} className="bg-muted/20 p-4 rounded-xl border border-border/80 space-y-3">
                <h5 className="text-xs font-bold text-foreground uppercase">{activeForm.isEdit ? "✏️ Edit Contact" : "➕ Add Contact"}</h5>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Name</label>
                    <input type="text" required className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none" value={contactInputs.name} onChange={(e) => setContactInputs(prev => ({ ...prev, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Relationship</label>
                    <input type="text" required placeholder="e.g. Attorney, Brother, Nominee" className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none" value={contactInputs.relationship} onChange={(e) => setContactInputs(prev => ({ ...prev, relationship: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Mobile</label>
                    <input type="text" required className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none" value={contactInputs.mobile} onChange={(e) => setContactInputs(prev => ({ ...prev, mobile: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Email</label>
                    <input type="email" required className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none" value={contactInputs.email} onChange={(e) => setContactInputs(prev => ({ ...prev, email: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Role / Purpose</label>
                    <input type="text" required placeholder="e.g. Primary Nominee, Financial Advisor" className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none" value={contactInputs.role_purpose} onChange={(e) => setContactInputs(prev => ({ ...prev, role_purpose: e.target.value }))} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm">Save</Button>
                  <Button type="button" variant="outline" size="sm" onClick={resetForms}>Cancel</Button>
                </div>
              </form>
            ) : (
              <Button onClick={() => setActiveForm({ section: "contact", isEdit: false, id: null })} size="sm" className="flex items-center gap-1.5"><Plus className="h-4 w-4" /> Add Record</Button>
            )}
          </div>
        </VaultSectionAccordion>

        {/* SECTION 6: BANK ACCOUNTS & CREDIT CARDS */}
        <VaultSectionAccordion 
          title="💳 6. Bank Accounts & Credit Cards" 
          expanded={expandedSections.bank}
          onToggle={() => toggleSection("bank")}
          count={vaultData?.bank_accounts?.length || 0}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="p-3 font-semibold text-muted-foreground">Bank / Card Name</th>
                  <th className="p-3 font-semibold text-muted-foreground">Account Type</th>
                  <th className="p-3 font-semibold text-muted-foreground text-center">Account / Card No. (Last 4)</th>
                  <th className="p-3 font-semibold text-muted-foreground">Branch / Credit Limit</th>
                  <th className="p-3 font-semibold text-muted-foreground">Nominee</th>
                  <th className="p-3 font-semibold text-muted-foreground text-center">Status</th>
                  <th className="p-3 font-semibold text-muted-foreground text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vaultData?.bank_accounts?.map((b: any) => (
                  <tr key={b.id} className="border-b border-border/40 hover:bg-muted/10">
                    <td className="p-3 font-bold">{b.bank_card_name}</td>
                    <td className="p-3">{b.account_type}</td>
                    <td className="p-3 text-center font-mono">XXXX {b.last_four_digits}</td>
                    <td className="p-3">{b.branch_limit}</td>
                    <td className="p-3">{b.nominee}</td>
                    <td className="p-3 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        b.status === "Active" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center gap-1.5">
                        <button type="button" onClick={() => handleEditClick("bank_account", b)} className="text-muted-foreground hover:text-primary"><Edit className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => handleDeleteClick("bank_account", b.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!vaultData?.bank_accounts?.length && (
                  <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">No records added.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="pt-3 border-t border-border/40">
            {activeForm.section === "bank_account" ? (
              <form onSubmit={(e) => handleFormSubmit(e, "bank_account")} className="bg-muted/20 p-4 rounded-xl border border-border/80 space-y-3">
                <h5 className="text-xs font-bold text-foreground uppercase">{activeForm.isEdit ? "✏️ Edit Banking Record" : "➕ Add Banking Record"}</h5>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Bank / Card Name</label>
                    <input type="text" required placeholder="e.g. HDFC Credit Card, ICICI Bank" className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none" value={bankInputs.bank_card_name} onChange={(e) => setBankInputs(prev => ({ ...prev, bank_card_name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Account Type</label>
                    <select className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none" value={bankInputs.account_type} onChange={(e) => setBankInputs(prev => ({ ...prev, account_type: e.target.value }))}>
                      <option value="Savings Account">Savings Account</option>
                      <option value="Salary Account">Salary Account</option>
                      <option value="Current Account">Current Account</option>
                      <option value="Credit Card">Credit Card</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Last 4 Digits</label>
                    <input type="text" required maxLength={4} className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none" value={bankInputs.last_four_digits} onChange={(e) => setBankInputs(prev => ({ ...prev, last_four_digits: e.target.value.replace(/\D/g, "") }))} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Branch / Credit Limit</label>
                    <input type="text" required placeholder="e.g. Mumbai Branch, ₹3 Lakh Limit" className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none" value={bankInputs.branch_limit} onChange={(e) => setBankInputs(prev => ({ ...prev, branch_limit: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Nominee</label>
                    <input type="text" required className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none" value={bankInputs.nominee} onChange={(e) => setBankInputs(prev => ({ ...prev, nominee: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Status</label>
                    <select className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none" value={bankInputs.status} onChange={(e) => setBankInputs(prev => ({ ...prev, status: e.target.value }))}>
                      <option value="Active">Active</option>
                      <option value="Blocked">Blocked</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm">Save</Button>
                  <Button type="button" variant="outline" size="sm" onClick={resetForms}>Cancel</Button>
                </div>
              </form>
            ) : (
              <Button onClick={() => setActiveForm({ section: "bank_account", isEdit: false, id: null })} size="sm" className="flex items-center gap-1.5"><Plus className="h-4 w-4" /> Add Record</Button>
            )}
          </div>
        </VaultSectionAccordion>
      </div>
    </div>
  );
}

// Vault Section Accordion helper component
function VaultSectionAccordion({
  title,
  expanded,
  onToggle,
  count,
  children
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <button 
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 bg-muted/20 hover:bg-muted/35 transition-colors border-b border-border/50 text-left"
      >
        <span className="text-xs font-black uppercase text-foreground tracking-wide flex items-center gap-2">
          {title}
          <span className="text-[10px] bg-primary-soft text-primary px-2 py-0.5 rounded-full font-bold">
            {count} {count === 1 ? "record" : "records"}
          </span>
        </span>
        <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${expanded ? "rotate-90" : ""}`} />
      </button>
      {expanded && (
        <div className="p-4 space-y-4">
          {children}
        </div>
      )}
    </Card>
  );
}

// Slider Input Field helper component
interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  percentage?: boolean;
  unit?: string;
  onChange: (val: number) => void;
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  percentage,
  unit,
  onChange
}: SliderFieldProps) {
  const displayVal = percentage ? `${(value * 100).toFixed(1)}%` : `${value} ${unit || ""}`;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs font-semibold">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground">{displayVal}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer"
      />
    </div>
  );
}

// Text Input Field helper component (with validation clamp)
interface InputFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (val: number) => void;
}

function InputField({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange
}: InputFieldProps) {
  const [tempText, setTempText] = useState<string>(value.toString());

  useEffect(() => {
    setTempText(value.toString());
  }, [value]);

  const handleBlur = () => {
    let parsed = parseFloat(tempText.replace(/,/g, ""));
    if (isNaN(parsed)) {
      parsed = min;
    }
    const clamped = Math.max(min, Math.min(max, parsed));
    onChange(clamped);
    setTempText(clamped.toString());
  };

  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-muted-foreground">{label}</label>
      <div className="relative rounded-lg shadow-sm">
        {unit && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <span className="text-xs text-muted-foreground">{unit}</span>
          </div>
        )}
        <input
          type="text"
          value={Number(tempText).toLocaleString("en-IN")}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^0-9]/g, "");
            setTempText(raw);
          }}
          onBlur={handleBlur}
          className={`block w-full rounded-lg border border-border bg-card py-1.5 text-xs text-foreground focus:border-primary outline-none ${
            unit ? "pl-7" : "px-3"
          }`}
        />
      </div>
    </div>
  );
}

// Calculation stat result line helper component
function StatResult({ 
  label, 
  value, 
  highlight 
}: { 
  label: string; 
  value: string; 
  highlight?: boolean; 
}) {
  return (
    <div className="flex flex-col p-3 rounded-lg border border-border bg-muted/5">
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <span className={`text-sm font-bold mt-1 ${highlight ? "text-primary" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}
