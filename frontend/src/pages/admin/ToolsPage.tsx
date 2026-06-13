import { useState, useEffect } from "react";
import { 
  Plus, 
  Download, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Loader2, 
  HelpCircle, 
  FileText, 
  Eye, 
  Globe, 
  Shield, 
  AlertCircle,
  ExternalLink,
  Grid,
  ChevronRight
} from "lucide-react";
import * as Icons from "lucide-react";
import { PageHeader, Card, Button } from "@/components/common";
import { API_URL } from "@/constants/env";
import { WowToolkitPage } from "../user/WowToolkitPage";
import { FinancialDiscoveryPage } from "../user/FinancialDiscoveryPage";
import { NeedsDiscoveryPage } from "../user/NeedsDiscoveryPage";

import { useAuth } from "@/context/AuthContext";

export function ToolsPage() {
  const { searchQuery } = useAuth();
  const [tools, setTools] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active interactive tool
  const [activeTool, setActiveTool] = useState<string | null>(null);

  const filteredTools = tools.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<any | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("downloadable"); // "interactive", "downloadable"
  const [iconName, setIconName] = useState("FileText");
  const [filePath, setFilePath] = useState("");
  const [originalFilename, setOriginalFilename] = useState("");
  const [storageFilename, setStorageFilename] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [visibility, setVisibility] = useState("owner_only");
  const [formError, setFormError] = useState<string | null>(null);

  // File Upload State
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Preview State
  const [previewTool, setPreviewTool] = useState<any | null>(null);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [activeSheetTab, setActiveSheetTab] = useState("");

  const fetchTools = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/wow/tools`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setTools(data);
      } else {
        setError("Failed to fetch tools registry.");
      }
    } catch (err) {
      console.error(err);
      setError("Network error fetching tools.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTools();
  }, []);

  const getIcon = (name: string) => {
    const IconComponent = (Icons as any)[name];
    return IconComponent ? <IconComponent className="h-5 w-5" /> : <HelpCircle className="h-5 w-5" />;
  };

  const openCreateModal = () => {
    setEditingTool(null);
    setName("");
    setDescription("");
    setType("downloadable");
    setIconName("FileText");
    setFilePath("");
    setOriginalFilename("");
    setStorageFilename("");
    setIsActive(true);
    setVisibility("owner_only");
    setUploadError(null);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (tool: any) => {
    setEditingTool(tool);
    setName(tool.name);
    setDescription(tool.description);
    setType(tool.type);
    setIconName(tool.icon_name);
    setFilePath(tool.file_path || "");
    setOriginalFilename(tool.original_filename || "");
    setStorageFilename(tool.storage_filename || "");
    setIsActive(tool.is_active);
    setVisibility(tool.visibility || "owner_only");
    setUploadError(null);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    setUploadError(null);

    try {
      const res = await fetch(`${API_URL}/wow/tools/upload`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
        },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setFilePath(data.file_url);
        setOriginalFilename(data.original_filename);
        setStorageFilename(data.storage_filename);
      } else {
        const errData = await res.json().catch(() => ({}));
        setUploadError(errData.message || errData.detail || "Upload failed.");
      }
    } catch (err) {
      setUploadError("Network error during file upload.");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveTool = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!name || !description) {
      setFormError("Name and Description are required.");
      return;
    }

    const payload = {
      name,
      description,
      type,
      icon_name: iconName,
      file_path: type === "downloadable" ? filePath : null,
      original_filename: type === "downloadable" ? originalFilename : null,
      storage_filename: type === "downloadable" ? storageFilename : null,
      is_active: isActive,
      visibility
    };

    try {
      const url = editingTool 
        ? `${API_URL}/wow/tools/${editingTool.id}` 
        : `${API_URL}/wow/tools`;
      
      const method = editingTool ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchTools();
      } else {
        const data = await res.json().catch(() => ({}));
        setFormError(data.message || data.detail || "Failed to save tool configuration.");
      }
    } catch (err) {
      console.error(err);
      setFormError("Error occurred while saving tool.");
    }
  };

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

  const handleDeleteTool = async (id: number) => {
    if (!confirm("Are you sure you want to delete this tool?")) return;

    try {
      const res = await fetch(`${API_URL}/wow/tools/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
        }
      });

      if (res.ok) {
        fetchTools();
      } else {
        alert("Failed to delete tool.");
      }
    } catch (err) {
      console.error(err);
      alert("Error occurred while deleting tool.");
    }
  };

  const toggleActiveStatus = async (tool: any) => {
    try {
      const res = await fetch(`${API_URL}/wow/tools/${tool.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
        },
        body: JSON.stringify({ is_active: !tool.is_active })
      });

      if (res.ok) {
        fetchTools();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const renderSpreadsheetPreview = () => {
    if (previewLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground font-semibold">Parsing Spreadsheet workbook...</span>
        </div>
      );
    }

    if (previewError) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center p-6 gap-2">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <h5 className="font-bold text-sm text-foreground">Preview Failed</h5>
          <p className="text-xs text-muted-foreground max-w-sm">{previewError}</p>
        </div>
      );
    }

    if (!previewData || !previewData.sheets || previewData.sheets.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center p-6 gap-2">
          <HelpCircle className="h-8 w-8 text-muted-foreground" />
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
          <HelpCircle className="h-8 w-8 text-muted-foreground" />
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

  if (activeTool === "needs-discovery") {
    return <NeedsDiscoveryPage onBack={() => setActiveTool(null)} />;
  }

  if (activeTool === "discovery") {
    return <FinancialDiscoveryPage onBack={() => setActiveTool(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader 
          title="Tools Manager" 
          subtitle="Admin panel for creating, updating, activating, and deploying educational/financial tools." 
        />
        <Button onClick={openCreateModal} className="gap-2 self-start sm:self-auto bg-primary hover:bg-primary/90 text-white rounded-lg px-4 py-2 font-medium flex items-center">
          <Plus className="h-4.5 w-4.5" /> Add New Tool
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 p-4 rounded-xl flex items-start gap-3">
          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div>
            <h5 className="font-semibold text-sm">Error Loading Tools</h5>
            <p className="text-xs mt-1">{error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredTools.map((t) => (
            <Card key={t.id} className="flex flex-col justify-between h-full hover:border-primary/30 transition-all duration-200">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    {getIcon(t.icon_name)}
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider ${
                    t.type === "interactive" 
                      ? "bg-primary/10 text-primary border border-primary/20" 
                      : "bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-zinc-700"
                  }`}>
                    {t.type}
                  </span>
                </div>
                
                <h4 className="text-base font-bold text-foreground line-clamp-1">{t.name}</h4>
                <p className="mt-2 text-xs text-muted-foreground line-clamp-3 min-h-[48px]">{t.description}</p>
                
                {t.type === "downloadable" && t.file_path && (
                  <div className="mt-3.5 bg-zinc-50 dark:bg-zinc-900 border border-border rounded-lg p-2 flex items-center justify-between gap-2 overflow-hidden">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <FileText className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                      <span className="text-[10px] font-mono text-muted-foreground truncate" title={t.original_filename || t.name}>
                        {t.original_filename || "Spreadsheet Template"}
                      </span>
                    </div>
                    <button 
                      onClick={() => handleProxyDownload(t.id)} 
                      title="Download spreadsheet template"
                      className="p-1 text-primary hover:scale-110 transition-transform"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {t.type === "interactive" ? (
                  <Button 
                    className="w-full mt-3 font-semibold rounded-xl bg-primary hover:bg-primary/95 text-white text-xs flex items-center justify-center gap-1.5"
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
                    Open Tool <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <Button 
                      variant="outline" 
                      onClick={() => handleOpenPreview(t)}
                      className="font-semibold rounded-xl border-border/80 hover:bg-muted/40 text-xs flex items-center justify-center gap-1"
                    >
                      <Eye className="h-3.5 w-3.5 text-muted-foreground" /> Preview
                    </Button>
                    <Button 
                      onClick={() => handleProxyDownload(t.id)}
                      className="font-semibold rounded-xl bg-primary hover:bg-primary/95 text-white text-xs flex items-center justify-center gap-1"
                    >
                      <Download className="h-3.5 w-3.5" /> Download
                    </Button>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-border flex items-center justify-between gap-4">
                {/* Active Toggle */}
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => toggleActiveStatus(t)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      t.is_active ? "bg-primary" : "bg-zinc-300 dark:bg-zinc-700"
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      t.is_active ? "translate-x-5" : "translate-x-0"
                    }`} />
                  </button>
                  <span className="text-xs font-medium text-muted-foreground">
                    {t.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                {/* Edit & Delete Actions */}
                <div className="flex items-center gap-1.5">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => openEditModal(t)}
                    className="p-2 border-border/80 text-muted-foreground hover:text-foreground"
                    title="Edit Tool"
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  {/* Disable delete on the main interactive wow tool to preserve system core */}
                  {!t.name.toLowerCase().includes("wow") && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDeleteTool(t.id)}
                      className="p-2 border-border/80 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                      title="Delete Tool"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-lg shadow-2xl border border-border relative animate-in fade-in zoom-in-95 duration-150">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            <h3 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
              {editingTool ? <Edit3 className="h-5 w-5 text-primary" /> : <Plus className="h-5 w-5 text-primary" />}
              {editingTool ? "Edit Tool Configuration" : "Register New Financial Tool"}
            </h3>

            {formError && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 p-3 rounded-lg flex items-center gap-2 text-xs font-semibold mb-4 animate-in fade-in">
                <AlertCircle className="h-4.5 w-4.5 text-red-500 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveTool} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Tool Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Home Loan Payoff Booster"
                  className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-border rounded-lg focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Description</label>
                <textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain what the calculator does, what inputs are required, and the target audience."
                  rows={3}
                  className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-border rounded-lg focus:outline-none focus:border-primary resize-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Tool Type</label>
                  <select 
                    value={type} 
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-border rounded-lg focus:outline-none focus:border-primary"
                  >
                    <option value="downloadable">Downloadable File (.xlsx, .csv)</option>
                    <option value="interactive">Interactive Web Tool</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Lucide Icon Name</label>
                  <select 
                    value={iconName} 
                    onChange={(e) => setIconName(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-border rounded-lg focus:outline-none focus:border-primary"
                  >
                    <option value="FileText">FileText (Standard File)</option>
                    <option value="TrendingUp">TrendingUp (SIP/Invest)</option>
                    <option value="PiggyBank">PiggyBank (Savings/Retire)</option>
                    <option value="Landmark">Landmark (Loans/EMI)</option>
                    <option value="Target">Target (Goals/Planning)</option>
                    <option value="Lock">Lock (Security/Vault)</option>
                    <option value="Coins">Coins (Financial Toolkit)</option>
                  </select>
                </div>
              </div>

              {type === "downloadable" && (
                <div className="bg-zinc-50 dark:bg-zinc-900 border border-border rounded-xl p-4 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                      Upload Excel/CSV Template
                    </label>
                    <div className="flex items-center gap-3">
                      <input 
                        type="file" 
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileUpload}
                        className="hidden" 
                        id="excel-file-upload"
                        disabled={uploading}
                      />
                      <label 
                        htmlFor="excel-file-upload"
                        className={`flex items-center justify-center gap-2 border border-dashed border-primary/30 hover:border-primary/80 hover:bg-primary/5 rounded-xl px-4 py-3 text-xs font-semibold text-primary cursor-pointer w-full transition-all ${
                          uploading ? "opacity-50 pointer-events-none" : ""
                        }`}
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            Uploading Spreadsheet...
                          </>
                        ) : (
                          <>
                            <Icons.Upload className="h-4 w-4" />
                            {originalFilename ? `Selected: ${originalFilename}` : "Choose Spreadsheet (.xlsx, .xls, .csv)"}
                          </>
                        )}
                      </label>
                    </div>
                    {uploadError && (
                      <span className="text-[10px] text-red-500 font-semibold mt-1 block">
                        {uploadError}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">
                      File Path / Public URL
                    </label>
                    <input 
                      type="text" 
                      value={filePath} 
                      onChange={(e) => setFilePath(e.target.value)}
                      placeholder="Automatic after upload, or manually enter URL"
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-zinc-950 border border-border rounded-lg focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5 py-1">
                <label className="block text-xs font-semibold text-muted-foreground uppercase">Visibility</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
                    <input
                      type="radio"
                      name="tool-visibility"
                      value="owner_only"
                      checked={visibility === "owner_only"}
                      onChange={() => setVisibility("owner_only")}
                      className="rounded-full border-border text-primary focus:ring-primary h-4 w-4"
                    />
                    <span>Owners Only</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
                    <input
                      type="radio"
                      name="tool-visibility"
                      value="owner_employee"
                      checked={visibility === "owner_employee"}
                      onChange={() => setVisibility("owner_employee")}
                      className="rounded-full border-border text-primary focus:ring-primary h-4 w-4"
                    />
                    <span>Owners + Employees</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-2 py-2">
                <input 
                  type="checkbox" 
                  id="form-is-active"
                  checked={isActive} 
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
                />
                <label htmlFor="form-is-active" className="text-xs font-semibold text-muted-foreground cursor-pointer">
                  Activate Tool immediately (users will see it in their directory)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button 
                  variant="outline" 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="border-border/80 text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-primary hover:bg-primary/90 text-white font-medium"
                >
                  Save Tool Config
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Spreadsheet Sandbox Preview Modal */}
      {previewTool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-3xl shadow-2xl border border-border relative animate-in fade-in zoom-in-95 duration-150 p-0 overflow-hidden flex flex-col max-h-[90vh]">
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
    </div>
  );
}
