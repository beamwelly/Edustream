import { useState, useEffect } from "react";
import { 
  Search, 
  Download, 
  Eye, 
  HelpCircle, 
  FileText, 
  X, 
  Grid, 
  Calculator, 
  Coins, 
  BookOpen, 
  ChevronRight, 
  ExternalLink 
} from "lucide-react";
import * as Icons from "lucide-react";
import { PageHeader, Card, Button } from "@/components/common";
import { WowToolkitPage } from "./WowToolkitPage";
import { FinancialDiscoveryPage } from "./FinancialDiscoveryPage";
import { NeedsDiscoveryPage } from "./NeedsDiscoveryPage";
import { API_URL } from "@/constants/env";
import { useAuth } from "@/context/AuthContext";

export function UserToolsPage() {
  const { user, searchQuery, setSearchQuery } = useAuth();
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [tools, setTools] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Search & Filter State
  const [selectedType, setSelectedType] = useState("all"); // "all", "interactive", "downloadable"

  // Workbook Preview Modal State
  const [previewTool, setPreviewTool] = useState<any | null>(null);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [activeSheetTab, setActiveSheetTab] = useState("");

  useEffect(() => {
    const fetchTools = async () => {
      try {
        const res = await fetch(`${API_URL}/wow/tools`, {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setTools(data);
        }
      } catch (err) {
        console.error("Failed to load tools registry", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTools();
  }, []);

  const getIcon = (name: string) => {
    const IconComponent = (Icons as any)[name];
    return IconComponent ? <IconComponent className="h-5 w-5" /> : <HelpCircle className="h-5 w-5" />;
  };

  const filteredTools = tools.filter(t => {
    if (user && user.role === "employee") {
      const allowed = user.permissions?.allowed_tools || [];
      const toolName = t.name.toLowerCase();
      if (t.type === "downloadable" && !allowed.includes("resource_downloads")) {
        return false;
      }
      if (t.type === "interactive") {
        if ((toolName.includes("wow") || toolName.includes("retirement")) && !allowed.includes("wow_toolkit")) {
          return false;
        }
        if (toolName.includes("needs discovery") && !allowed.includes("needs_discovery")) {
          return false;
        }
        if (toolName.includes("discovery") && !toolName.includes("needs discovery") && !allowed.includes("financial_discovery")) {
          return false;
        }
        if (!toolName.includes("wow") && !toolName.includes("retirement") && !toolName.includes("needs discovery") && !toolName.includes("discovery")) {
          if (!allowed.includes("future_tools")) {
            return false;
          }
        }
      }
    }
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "all" || t.type === selectedType;
    return matchesSearch && matchesType;
  });

  const handleProxyDownload = (toolId: number) => {
    const token = localStorage.getItem("token") || "";
    window.open(`${API_URL}/wow/tools/download/${toolId}?token=${token}`, "_blank");
  };

  const handleOpenPreview = async (tool: any) => {
    setPreviewTool(tool);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewData(null);
    try {
      const res = await fetch(`${API_URL}/wow/tools/preview/${tool.id}`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setPreviewData(data);
        if (data.sheets && data.sheets.length > 0) {
          setActiveSheetTab(data.sheets[0].name);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setPreviewError(errData.detail || "Failed to load spreadsheet preview.");
      }
    } catch (err) {
      setPreviewError("Network error loading preview.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const renderSpreadsheetPreview = () => {
    if (previewLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Icons.Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground font-semibold">Parsing Spreadsheet workbook...</span>
        </div>
      );
    }

    if (previewError) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center p-6 gap-2">
          <Icons.AlertCircle className="h-8 w-8 text-red-500" />
          <h5 className="font-bold text-sm text-foreground">Preview Failed</h5>
          <p className="text-xs text-muted-foreground max-w-sm">{previewError}</p>
        </div>
      );
    }

    if (!previewData || !previewData.sheets || previewData.sheets.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center p-6 gap-2">
          <Icons.HelpCircle className="h-8 w-8 text-muted-foreground" />
          <h5 className="font-bold text-sm text-foreground">No Preview Data</h5>
          <p className="text-xs text-muted-foreground">No preview data is available for this file.</p>
        </div>
      );
    }

    const currentSheet = previewData.sheets.find((s: any) => s.name === activeSheetTab) || previewData.sheets[0];
    const grid = currentSheet.data || [];

    if (grid.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center p-6 gap-2">
          <Icons.HelpCircle className="h-8 w-8 text-muted-foreground" />
          <h5 className="font-bold text-sm text-foreground">Empty Sheet</h5>
          <p className="text-xs text-muted-foreground">The selected sheet contains no displayable cells.</p>
        </div>
      );
    }

    const getColLetter = (index: number) => {
      return String.fromCharCode(65 + index);
    };

    const maxCols = grid[0].length;

    return (
      <table className="w-full border-collapse text-xs font-mono">
        <thead>
          <tr className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
            <th className="border border-border p-1.5 w-10 text-center bg-zinc-50 dark:bg-zinc-900"></th>
            {Array.from({ length: maxCols }).map((_, colIdx) => (
              <th key={colIdx} className="border border-border p-1.5 text-center bg-zinc-50 dark:bg-zinc-900 font-bold w-24">
                {getColLetter(colIdx)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.map((row: string[], rowIdx: number) => (
            <tr key={rowIdx} className="hover:bg-muted/30">
              <td className="border border-border bg-zinc-50 dark:bg-zinc-900 text-center text-zinc-500 font-bold p-1.5">
                {rowIdx + 1}
              </td>
              {row.map((cellVal: string, colIdx: number) => (
                <td 
                  key={colIdx} 
                  className={`border border-border p-1.5 overflow-hidden text-ellipsis whitespace-nowrap max-w-[200px] ${
                    rowIdx === 0 ? "font-bold text-primary bg-primary/5" : ""
                  }`}
                  title={cellVal}
                >
                  {cellVal}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  if (activeTool === "wow") {
    return <WowToolkitPage onBack={() => setActiveTool(null)} />;
  }

  if (activeTool === "discovery") {
    return <FinancialDiscoveryPage onBack={() => setActiveTool(null)} />;
  }

  if (activeTool === "needs-discovery") {
    return <NeedsDiscoveryPage onBack={() => setActiveTool(null)} />;
  }

  return (
    <>
      <PageHeader 
        title="Tools Library" 
        subtitle="Access custom interactive calculators and download verified professional Excel & CSV financial templates." 
      />

      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6 mb-8">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search calculators and spreadsheets..."
            className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-xl focus:outline-none focus:border-primary text-sm shadow-sm"
          />
        </div>

        <div className="flex gap-1.5 border border-border bg-muted/40 p-1 rounded-xl self-start md:self-auto">
          <button 
            onClick={() => setSelectedType("all")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedType === "all" 
                ? "bg-card text-foreground shadow-sm border border-border" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Tools
          </button>
          <button 
            onClick={() => setSelectedType("interactive")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedType === "interactive" 
                ? "bg-card text-foreground shadow-sm border border-border" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Interactive Tools
          </button>
          <button 
            onClick={() => setSelectedType("downloadable")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedType === "downloadable" 
                ? "bg-card text-foreground shadow-sm border border-border" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Spreadsheet Models
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Icons.Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : filteredTools.length === 0 ? (
        <Card className="text-center py-16 max-w-md mx-auto border border-dashed border-border/80">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mx-auto mb-4">
            <Calculator className="h-6 w-6" />
          </div>
          <h4 className="text-base font-bold text-foreground">No tools matched your criteria</h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
            Try adjusting your search filters or check back later for newly published assets.
          </p>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredTools.map((t) => (
            <Card key={t.id} className="flex flex-col justify-between h-full hover:border-primary/20 transition-all duration-200 group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:scale-105 transition-transform duration-250">
                    {getIcon(t.icon_name)}
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-lg uppercase border ${
                    t.type === "interactive" 
                      ? "bg-primary/5 text-primary border-primary/10" 
                      : "bg-muted text-muted-foreground border-border"
                  }`}>
                    {t.type}
                  </span>
                </div>
                
                <h4 className="text-base font-bold text-foreground flex items-center justify-between group-hover:text-primary transition-colors">
                  {t.name}
                </h4>
                <p className="mt-2 text-xs text-muted-foreground line-clamp-3 min-h-[50px] leading-relaxed">
                  {t.description}
                </p>
                {t.type === "downloadable" && (
                  <div className="mt-3 bg-zinc-50 dark:bg-zinc-900 border border-border rounded-lg p-2 flex items-center gap-1.5 overflow-hidden">
                    <FileText className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                    <span className="text-[10px] font-mono text-muted-foreground truncate" title={t.original_filename || t.name}>
                      {t.original_filename || "Spreadsheet Template"}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex flex-col gap-2">
                {t.type === "interactive" ? (
                  <Button 
                    className="w-full font-semibold rounded-xl bg-primary hover:bg-primary/95 text-white flex items-center justify-center gap-1.5"
                    onClick={() => {
                      if (t.name.toLowerCase().includes("wow")) {
                        setActiveTool("wow");
                      } else if (t.name.toLowerCase().includes("needs discovery")) {
                        setActiveTool("needs-discovery");
                      } else if (t.name.toLowerCase().includes("discovery")) {
                        setActiveTool("discovery");
                      }
                    }}
                  >
                    Open Calculator <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => handleOpenPreview(t)}
                      className="font-semibold rounded-xl border-border/80 hover:bg-muted/40 text-xs flex items-center justify-center gap-1"
                    >
                      <Eye className="h-3.5 w-3.5 text-muted-foreground" /> Preview
                    </Button>
                    <Button 
                      onClick={() => handleProxyDownload(t.id)}
                      className="w-full font-semibold rounded-xl bg-primary hover:bg-primary/95 text-white text-xs flex items-center justify-center gap-1"
                    >
                      <Download className="h-3.5 w-3.5" /> Download
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Spreadsheet Sandbox Preview Modal */}
      {previewTool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <Card className="w-[92vw] sm:w-full sm:max-w-3xl my-auto shadow-2xl border border-border relative animate-in fade-in zoom-in-95 duration-150 p-0 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-border bg-zinc-50 dark:bg-zinc-900 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-green-500/10 text-green-600 flex items-center justify-center">
                  <Grid className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    {previewTool.name}
                  </h3>
                  <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[400px] block">
                    Source File: {previewTool.original_filename || "Spreadsheet Template"}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setPreviewTool(null)}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Excel Sheet Tabs */}
            <div className="flex border-b border-border bg-zinc-100/50 dark:bg-zinc-900/50 px-4 pt-2 gap-1.5">
              {(previewData?.sheets || []).map((sheet: any) => (
                <button
                  key={sheet.name}
                  onClick={() => setActiveSheetTab(sheet.name)}
                  className={`px-4 py-2 text-xs font-semibold rounded-t-xl transition-all border-t border-x ${
                    activeSheetTab === sheet.name
                      ? "bg-card border-border text-primary font-bold shadow-[0_-2px_10px_rgba(0,0,0,0.02)]"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50"
                  }`}
                >
                  📊 {sheet.name}
                </button>
              ))}
            </div>

            {/* Spreadsheet Preview Grid */}
            <div className="flex-1 overflow-auto p-4 bg-card">
              <div className="border border-border rounded-lg overflow-hidden">
                {renderSpreadsheetPreview()}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border bg-zinc-50 dark:bg-zinc-900 flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-ping"></span>
                <span>Spreadsheet Sandbox Preview (Read-Only)</span>
              </div>
              <button 
                onClick={() => handleProxyDownload(previewTool.id)} 
                className="flex items-center gap-1 font-bold text-primary hover:underline bg-transparent border-0 cursor-pointer"
              >
                Download Full Template <Download className="h-3.5 w-3.5 ml-1" />
              </button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
