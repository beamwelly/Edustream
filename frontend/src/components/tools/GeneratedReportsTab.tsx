import { useState, useEffect } from "react";
import { 
  Search, 
  Download, 
  Eye, 
  Trash2, 
  Calendar, 
  X, 
  Loader2,
  FileText,
  AlertCircle,
  ChevronDown,
  RefreshCw
} from "lucide-react";
import { Card, Button } from "@/components/common";
import { API_URL } from "@/constants/env";

interface GeneratedReportsTabProps {
  toolId: number;
}

interface Report {
  id: number;
  user_id: number;
  tool_id: number;
  calculator_name: string;
  report_name: string;
  pdf_url: string;
  storage_path: string;
  created_at: string;
}

const calculatorsByTool: { [key: number]: string[] } = {
  1: [
    "Retirement Age Predictor",
    "Cost Of Delay Calculator",
    "SIP + Home Loan Impact",
    "Financial Freedom Date",
    "Goal Visualization Dashboard",
    "Family Financial Vault"
  ],
  2: [
    "Financial Discovery"
  ],
  3: [
    "Needs Discovery"
  ]
};

export function GeneratedReportsTab({ toolId }: GeneratedReportsTabProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedCalc, setSelectedCalc] = useState<string>("All");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<string>("newest_first");

  // Modal State
  const [previewReport, setPreviewReport] = useState<Report | null>(null);
  const [deleteConfirmReport, setDeleteConfirmReport] = useState<Report | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (toolId !== undefined && toolId !== null && !isNaN(Number(toolId))) {
        queryParams.append("tool_id", String(toolId));
      }
      
      if (searchTerm.trim()) {
        queryParams.append("search", searchTerm.trim());
      }
      if (selectedCalc !== "All") {
        queryParams.append("calculator_name", selectedCalc);
      }
      if (startDate) {
        queryParams.append("date_start", startDate);
      }
      if (endDate) {
        queryParams.append("date_end", endDate);
      }
      queryParams.append("sort_order", sortOrder);

      const res = await fetch(`${API_URL}/wow/reports?${queryParams.toString()}`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
        }
      });

      if (!res.ok) {
        throw new Error("Failed to retrieve generated reports list.");
      }

      const data = await res.json();
      setReports(data);
    } catch (err: any) {
      console.error("Fetch reports error:", err);
      setError(err.message || "Something went wrong while fetching reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [toolId, selectedCalc, startDate, endDate, sortOrder]);

  // Debounced/Triggered search handler
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReports();
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedCalc("All");
    setStartDate("");
    setEndDate("");
    setSortOrder("newest_first");
  };

  const handleDelete = async (reportId: number) => {
    setDeletingId(reportId);
    try {
      const res = await fetch(`${API_URL}/wow/reports/${reportId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
        }
      });

      if (!res.ok) {
        throw new Error("Failed to delete report.");
      }

      setReports(prev => prev.filter(r => r.id !== reportId));
      setDeleteConfirmReport(null);
    } catch (err: any) {
      alert(err.message || "Failed to delete the report.");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (isoString: string) => {
    if (!isoString) return "N/A";
    const date = new Date(isoString);
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  };

  const modules = calculatorsByTool[toolId] || [];

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <Card className="p-4 bg-muted/10 border-border">
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search PDF name..."
                className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-xs shadow-sm"
              />
            </div>

            {/* Calculator Select */}
            <div className="relative">
              <select
                value={selectedCalc}
                onChange={(e) => setSelectedCalc(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-xs shadow-sm appearance-none pr-8"
              >
                <option value="All">All Modules</option>
                {modules.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            </div>

            {/* Start Date */}
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="Start Date"
                className="w-full px-3 py-1.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-xs shadow-sm text-muted-foreground"
              />
            </div>

            {/* End Date */}
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="End Date"
                className="w-full px-3 py-1.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-xs shadow-sm text-muted-foreground"
              />
            </div>

            {/* Sort Order */}
            <div className="relative">
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-xs shadow-sm appearance-none pr-8"
              >
                <option value="newest_first">Newest First</option>
                <option value="oldest_first">Oldest First</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="text-xs border-border/80"
            >
              Reset Filters
            </Button>
            <Button
              type="submit"
              size="sm"
              className="text-xs bg-primary text-white hover:bg-primary/95"
            >
              Search
            </Button>
          </div>
        </form>
      </Card>

      {/* Reports Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground font-semibold">Loading report repository...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto gap-3">
          <AlertCircle className="h-10 w-10 text-red-500" />
          <h4 className="font-bold text-foreground">Failed to Load Reports</h4>
          <p className="text-xs text-muted-foreground">{error}</p>
          <Button onClick={fetchReports} size="sm" className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" /> Try Again
          </Button>
        </div>
      ) : reports.length === 0 ? (
        <Card className="text-center py-16 max-w-md mx-auto border border-dashed border-border/80">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mx-auto mb-4">
            <FileText className="h-6 w-6" />
          </div>
          <h4 className="text-base font-bold text-foreground">No reports generated yet</h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
            Generate and export PDFs from your calculator worksheets to compile your advisory reports history.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => (
            <Card key={report.id} className="flex flex-col justify-between hover:border-primary/20 transition-all p-4 group">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-primary/5 text-primary border border-primary/10">
                    {report.calculator_name}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    {formatDate(report.created_at)}
                  </span>
                </div>
                
                <h4 className="text-sm font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors pr-2" title={report.report_name}>
                  {report.report_name}
                </h4>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-1.5 pt-3 border-t border-border/55">
                <Button 
                  onClick={() => setPreviewReport(report)}
                  variant="outline" 
                  className="font-bold rounded-xl border-border/70 hover:bg-muted/40 text-[10px] py-1.5 flex items-center justify-center gap-1"
                >
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" /> Preview
                </Button>
                
                <a 
                  href={report.pdf_url}
                  download={report.report_name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1 font-bold rounded-xl bg-primary hover:bg-primary/95 text-white text-[10px] py-1.5 text-center transition-colors"
                >
                  <Download className="h-3.5 w-3.5" /> Download
                </a>

                <Button 
                  onClick={() => setDeleteConfirmReport(report)}
                  variant="outline" 
                  className="font-bold rounded-xl border-red-500/20 hover:bg-red-500/5 text-red-600 text-[10px] py-1.5 flex items-center justify-center gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* PDF Preview Modal */}
      {previewReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <Card className="w-[92vw] sm:w-full sm:max-w-4xl my-auto shadow-2xl border border-border relative animate-in fade-in zoom-in-95 duration-150 p-0 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-border bg-zinc-50 dark:bg-zinc-900 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    {previewReport.report_name}
                  </h3>
                  <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[400px] block">
                    Source: {previewReport.calculator_name} | Generated {formatDate(previewReport.created_at)}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setPreviewReport(null)}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Preview Frame */}
            <div className="flex-1 bg-zinc-800 p-4 min-h-[60vh]">
              <iframe
                src={`${previewReport.pdf_url}#toolbar=0`}
                className="w-full h-full min-h-[60vh] border-0 rounded-xl bg-white shadow-lg"
                title={previewReport.report_name}
              />
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border bg-zinc-50 dark:bg-zinc-900 flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse"></span>
                <span>PDF Preview Panel</span>
              </div>
              <a 
                href={previewReport.pdf_url}
                download={previewReport.report_name}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 font-bold text-primary hover:underline"
              >
                Download PDF <Download className="h-3.5 w-3.5 ml-1" />
              </a>
            </div>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-foreground">Delete PDF Report?</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Are you sure you want to delete <span className="font-semibold text-foreground">"{deleteConfirmReport.report_name}"</span>? 
                  This will permanently remove the record and the PDF file from the storage bucket. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirmReport(null)}
                className="text-xs border-border/80"
                disabled={deletingId !== null}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(deleteConfirmReport.id)}
                className="text-xs bg-red-600 hover:bg-red-700 text-white border-none font-bold"
                disabled={deletingId !== null}
              >
                {deletingId !== null ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Deleting...
                  </span>
                ) : (
                  "Delete Report"
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
