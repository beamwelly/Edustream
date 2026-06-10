import React, { useState, useEffect } from "react";
import {
  FileText,
  Film,
  FileSpreadsheet,
  Presentation,
  Search,
  MoreVertical,
  Eye,
  Download,
  File as FileIcon,
  Image as ImageIcon,
  Archive,
  Folder,
  X,
  Loader2,
  Calendar,
  LayoutGrid,
  List
} from "lucide-react";
import { PageHeader, Card, Button, Badge } from "@/components/common";
import { apiFetch } from "@/services/api";
import { toast } from "sonner";
import { 
  PDFThumbnail, 
  DocxThumbnail, 
  DocxPreview, 
  XlsxThumbnail, 
  XlsxPreview, 
  PptxThumbnail, 
  PptxPreview, 
  getIconAndBadgeConfig 
} from "@/components/content/FilePreviewers";

interface Category {
  id: number;
  name: string;
}

interface ContentItem {
  id: number;
  title: string;
  description: string | null;
  category: string;
  file_type: string;
  file_size: string;
  storage_path: string;
  public_url: string;
  uploaded_by: string;
  uploaded_at: string;
  is_active: boolean;
  original_filename?: string;
  warning?: string;
  organization_name?: string;
}

const getDownloadUrl = (item: ContentItem) => {
  if (!item || !item.public_url) return "";
  const filename = item.original_filename || item.title || "download";
  const separator = item.public_url.includes("?") ? "&" : "?";
  return `${item.public_url}${separator}download=${encodeURIComponent(filename)}`;
};

const triggerDownload = (item: ContentItem) => {
  if (!item) return;
  const token = localStorage.getItem("token") || "";
  const backendBase = window.location.origin.replace("5173", "8000").replace("8081", "8000");
  const downloadUrl = `${backendBase}/content/download/${item.id}?token=${encodeURIComponent(token)}`;

  // Determine original filename with extension reconstructed if missing
  let filename = item.original_filename || item.title || "download";
  let ext = "";
  if (item.storage_path && item.storage_path.includes(".")) {
    const parts = item.storage_path.split(".");
    ext = "." + parts[parts.length - 1].toLowerCase();
  }
  
  if (ext && !filename.toLowerCase().endsWith(ext)) {
    filename = filename + ext;
  }

  // Programmatically create temporary anchor to download natively with original filename
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = filename;
  link.target = "_self";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export function UserContentPage() {
  // DB States
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list" | "month">("month");

  // Filter States
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [dateSort, setDateSort] = useState<"newest" | "oldest" | "month-wise" | "file-type">("newest");

  // Additional filters
  const [monthFilter, setMonthFilter] = useState("All");
  const [yearFilter, setYearFilter] = useState("All");
  const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>({});

  // Previewer State
  const [selectedItemForPreview, setSelectedItemForPreview] = useState<ContentItem | null>(null);

  const monthsList = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const yearsList = React.useMemo(() => {
    const years = new Set<string>();
    items.forEach(item => {
      const yr = new Date(item.uploaded_at).getFullYear();
      if (!isNaN(yr)) years.add(String(yr));
    });
    return Array.from(years).sort().reverse();
  }, [items]);

  const toggleMonth = (monthLabel: string) => {
    setCollapsedMonths(prev => ({
      ...prev,
      [monthLabel]: !prev[monthLabel]
    }));
  };

  const getMonthYearLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Unknown Date";
    return d.toLocaleString("default", { month: "long", year: "numeric" });
  };

  const filteredItems = items.filter((item) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const titleMatch = item.title?.toLowerCase().includes(q);
      const descMatch = item.description?.toLowerCase().includes(q) || false;
      const uploaderMatch = item.uploaded_by?.toLowerCase().includes(q);
      const orgMatch = item.organization_name?.toLowerCase().includes(q) || false;
      const catMatch = item.category?.toLowerCase().includes(q);
      const typeMatch = item.file_type?.toLowerCase().includes(q);
      if (!(titleMatch || descMatch || uploaderMatch || orgMatch || catMatch || typeMatch)) {
        return false;
      }
    }

    if (monthFilter !== "All") {
      const d = new Date(item.uploaded_at);
      const mName = d.toLocaleString("default", { month: "long" });
      if (mName !== monthFilter) return false;
    }

    if (yearFilter !== "All") {
      const d = new Date(item.uploaded_at);
      if (String(d.getFullYear()) !== yearFilter) return false;
    }

    return true;
  });

  const sortedItems = React.useMemo(() => {
    const itemsCopy = [...filteredItems];
    if (dateSort === "newest") {
      return itemsCopy.sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
    } else if (dateSort === "oldest") {
      return itemsCopy.sort((a, b) => new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime());
    } else if (dateSort === "month-wise") {
      return itemsCopy.sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
    } else if (dateSort === "file-type") {
      return itemsCopy.sort((a, b) => a.file_type.localeCompare(b.file_type));
    }
    return itemsCopy;
  }, [filteredItems, dateSort]);

  const groupedByMonth = React.useMemo(() => {
    const groups: Record<string, typeof sortedItems> = {};
    sortedItems.forEach(item => {
      const label = getMonthYearLabel(item.uploaded_at);
      if (!groups[label]) {
        groups[label] = [];
      }
      groups[label].push(item);
    });
    return groups;
  }, [sortedItems]);

  const sortedMonthKeys = React.useMemo(() => {
    return Object.keys(groupedByMonth).sort((a, b) => {
      if (a === "Unknown Date") return 1;
      if (b === "Unknown Date") return -1;
      const dateA = new Date(a);
      const dateB = new Date(b);
      if (dateSort === "oldest") {
        return dateA.getTime() - dateB.getTime();
      } else {
        return dateB.getTime() - dateA.getTime();
      }
    });
  }, [groupedByMonth, dateSort]);

  useEffect(() => {
    fetchCategories();
    fetchContentItems();
  }, [searchQuery, activeCategory, typeFilter, dateSort]);

  const fetchCategories = async () => {
    try {
      const data = await apiFetch<Category[]>("/content/categories");
      setCategories(data || []);
    } catch (err: any) {
      toast.error("Failed to load categories: " + (err.message || ""));
    }
  };

  const fetchContentItems = async () => {
    setIsLoading(true);
    try {
      const backendSort = (dateSort === "oldest") ? "oldest" : "newest";
      const params: any = {
        sort: backendSort
      };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (activeCategory !== "All") params.category = activeCategory;
      if (typeFilter !== "All") params.file_type = typeFilter;

      const data = await apiFetch<ContentItem[]>("/content/items", {
        params
      });
      setItems(data || []);
    } catch (err: any) {
      toast.error("Failed to load content: " + (err.message || ""));
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to get Lucide Icons
  const getIconForType = (type: string) => {
    switch (type.toUpperCase()) {
      case "PDF":
        return FileText;
      case "VIDEO":
      case "MP4":
        return Film;
      case "DOC":
      case "DOCX":
        return FileText;
      case "XLS":
      case "XLSX":
        return FileSpreadsheet;
      case "PPT":
      case "PPTX":
        return Presentation;
      case "IMAGE":
      case "PNG":
      case "JPG":
      case "JPEG":
        return ImageIcon;
      case "ARCHIVE":
      case "ZIP":
        return Archive;
      default:
        return FileIcon;
    }
  };

  const renderItemCard = (item: ContentItem) => {
    const { icon: Icon, badgeClass, accentBg, colorClass } = getIconAndBadgeConfig(item.file_type);
    const mockDownloads = (item.id * 13) % 47;
    const mockViews = (item.id * 29) % 183;
    return (
      <Card 
        key={item.id} 
        className="!p-0 overflow-hidden border border-border/80 bg-card rounded-xl transition-all hover:shadow-lg relative flex flex-col h-full group"
      >
        {/* Visual Thumbnail preview zone */}
        <div 
          onClick={() => setSelectedItemForPreview(item)}
          className={`flex aspect-[4/3] items-center justify-center relative cursor-pointer overflow-hidden border-b border-border/55 ${accentBg}`}
        >
          {item.file_type.toUpperCase() === "PDF" ? (
            <PDFThumbnail 
              url={item.public_url} 
              className="w-full h-full" 
              fallbackIcon={<Icon className={`h-12 w-12 ${colorClass}`} />} 
            />
          ) : ["DOCX", "DOC"].includes(item.file_type.toUpperCase()) ? (
            <DocxThumbnail 
              url={item.public_url} 
              className="w-full h-full" 
              fallbackIcon={<Icon className={`h-12 w-12 ${colorClass}`} />} 
            />
          ) : ["XLSX", "XLS"].includes(item.file_type.toUpperCase()) ? (
            <XlsxThumbnail 
              url={item.public_url} 
              className="w-full h-full" 
              fallbackIcon={<Icon className={`h-12 w-12 ${colorClass}`} />} 
            />
          ) : ["PPTX", "PPT"].includes(item.file_type.toUpperCase()) ? (
            <PptxThumbnail 
              url={item.public_url} 
              className="w-full h-full" 
              fallbackIcon={<Icon className={`h-12 w-12 ${colorClass}`} />} 
            />
          ) : ["PNG", "JPG", "JPEG", "GIF", "SVG", "IMAGE"].includes(item.file_type.toUpperCase()) ? (
            <img 
              src={item.public_url} 
              alt={item.title} 
              className="w-full h-full object-cover hover:scale-105 transition-all duration-300"
              loading="lazy" 
            />
          ) : ["MP4", "AVI", "MOV", "WEBM", "VIDEO"].includes(item.file_type.toUpperCase()) ? (
            <video 
              src={item.public_url} 
              className="w-full h-full object-cover"
              muted
              playsInline
            />
          ) : (
            <Icon className={`h-12 w-12 ${colorClass}`} />
          )}

          {/* Hover visual buttons shortcut */}
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2.5 transition-all backdrop-blur-[2px]">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setSelectedItemForPreview(item);
              }}
              className="p-2.5 bg-card rounded-full text-foreground hover:bg-primary hover:text-white shadow-soft transition-all"
              title="Preview"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                triggerDownload(item);
              }}
              className="p-2.5 bg-card rounded-full text-foreground hover:bg-primary hover:text-white shadow-soft transition-all"
              title="Download"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Card Info details */}
        <div className="p-4 flex flex-col flex-grow">
          <div className="mb-2.5 flex items-center justify-between">
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badgeClass}`}>
              {item.file_type}
            </span>
            <span className="text-xs font-medium text-muted-foreground">{item.file_size}</span>
          </div>
          
          <h4 
            onClick={() => setSelectedItemForPreview(item)}
            className="line-clamp-1 text-sm font-semibold text-foreground cursor-pointer hover:text-primary transition-colors text-left" 
            title={item.title}
          >
            {item.title}
          </h4>
          
          {item.description && (
            <p className="line-clamp-1 text-xs text-muted-foreground mt-1 text-left" title={item.description}>
              {item.description}
            </p>
          )}

          <div className="mt-auto pt-3">
            {/* Organization / Company Uploader Info Display */}
            <div className="flex flex-col text-left mb-2.5 border-t border-border/40 pt-2.5">
              <span className="text-xs font-bold text-foreground truncate">Uploaded by: {item.uploaded_by}</span>
              <span className="text-[10px] text-muted-foreground truncate">{item.organization_name || "EduStream"}</span>
            </div>

            {/* Premium details */}
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mb-3 text-[10px] text-muted-foreground font-semibold">
              <span>{getMonthYearLabel(item.uploaded_at)}</span>
              <span>•</span>
              <span>Downloads: {mockDownloads}</span>
              <span>•</span>
              <span>Views: {mockViews}</span>
            </div>

            <div className="flex items-center justify-between border-t border-border/20 pt-2">
              <span className="text-xs text-muted-foreground/80 font-medium">
                Category: {item.category}
              </span>
              
              <div className="flex gap-1.5">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedItemForPreview(item);
                  }}
                  className="p-1 rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
                  title="Preview"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerDownload(item);
                  }}
                  className="p-1 rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  const uniqueFileTypes = ["PDF", "DOCX", "XLSX", "PPTX", "Video", "Image", "Archive"];

  return (
    <>
      <PageHeader
        title="Content Library"
        subtitle="Browse and retrieve curated documents, decks, and recordings shared by the Super Admin."
      />

      {/* Filter and Curate Panel */}
      <div className="mb-6 flex flex-col gap-4">
        {/* Dynamic Category Chips */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory("All")}
              className={
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors " +
                (activeCategory === "All"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:bg-border")
              }
            >
              All Categories
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.name)}
                className={
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-colors " +
                  (activeCategory === c.name
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:bg-border")
                }
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* View Switcher and Sort */}
          <div className="flex items-center gap-2.5">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1 shadow-sm">
              <button
                onClick={() => setViewMode("month")}
                className={`flex items-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-semibold transition-all ${viewMode === "month" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}
                title="Month View (Collapsible)"
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>Month View</span>
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-md transition-all ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}
                title="Grid View"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}
                title="List View"
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            {/* Sort Select Dropdown */}
            <div className="flex items-center gap-1">
              <select
                value={dateSort}
                onChange={(e) => setDateSort(e.target.value as any)}
                className="rounded-lg border border-border bg-card py-2 px-3 text-sm font-semibold hover:bg-secondary text-muted-foreground shadow-sm outline-none transition-all cursor-pointer"
              >
                <option value="newest">Sort: Newest First</option>
                <option value="oldest">Sort: Oldest First</option>
                <option value="month-wise">Sort: Month Wise</option>
                <option value="file-type">Sort: File Type</option>
              </select>
            </div>
          </div>
        </div>

        {/* Quick Filter Type Chips & Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4">
          <div className="flex flex-wrap gap-2">
            {["All", "PDF", "DOCX", "XLSX", "PPTX", "Video", "Image", "Archive"].map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`rounded-full px-3.5 py-1 text-xs font-semibold border transition-all ${
                  typeFilter === type
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card text-muted-foreground border-border hover:bg-secondary"
                }`}
              >
                {type === "DOCX" ? "Word" : type === "XLSX" ? "Excel" : type === "PPTX" ? "PowerPoint" : type === "Archive" ? "Archives" : type}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search by name, category, or uploader..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-border bg-card py-2 pl-10 pr-4 text-sm outline-none focus:border-primary shadow-sm"
            />
          </div>
        </div>

        {/* Additional Dropdown Filters Row */}
        <div className="flex flex-wrap items-center gap-4 border-t border-border pt-4 mt-3">
          {/* Month Dropdown Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Month Filter</label>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="rounded-lg border border-border bg-card py-1.5 px-3 text-xs font-semibold hover:bg-secondary text-muted-foreground shadow-sm outline-none cursor-pointer"
            >
              <option value="All">All Months</option>
              {monthsList.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Year Dropdown Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Year Filter</label>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="rounded-lg border border-border bg-card py-1.5 px-3 text-xs font-semibold hover:bg-secondary text-muted-foreground shadow-sm outline-none cursor-pointer"
            >
              <option value="All">All Years</option>
              {yearsList.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Grid or List View */}
      {isLoading ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading curations...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-border bg-card p-6 text-center">
          <Folder className="h-10 w-10 text-muted-foreground/60 mb-2" />
          <h4 className="text-base font-semibold">No assets found</h4>
          <p className="text-sm text-muted-foreground max-w-sm mt-1">
            There are no shared resources matching your search or filters.
          </p>
        </div>
      ) : viewMode === "month" ? (
        /* Collapsible Month-wise Groups */
        <div className="space-y-6">
          {sortedMonthKeys.map((monthKey) => {
            const monthItems = groupedByMonth[monthKey] || [];
            const isCollapsed = collapsedMonths[monthKey];
            return (
              <div key={monthKey} className="border border-border bg-card/45 rounded-xl overflow-hidden shadow-sm">
                <button
                  onClick={() => toggleMonth(monthKey)}
                  className="w-full flex items-center justify-between px-5 py-4 bg-secondary/10 hover:bg-secondary/25 border-b border-border/80 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-primary font-bold text-base transition-transform duration-200">
                      {isCollapsed ? "▶" : "▼"}
                    </span>
                    <h3 className="text-sm font-bold text-foreground">{monthKey}</h3>
                    <span className="text-[10px] text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full font-bold">
                      {monthItems.length} {monthItems.length === 1 ? "File" : "Files"}
                    </span>
                  </div>
                </button>

                {!isCollapsed && (
                  <div className="p-5">
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {monthItems.map((item) => renderItemCard(item))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : viewMode === "grid" ? (
        /* Curated Resources Grid (Google Drive / OneDrive style) */
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sortedItems.map((item) => renderItemCard(item))}
        </div>
      ) : (
        /* Curated Resources List Layout (Table) */
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20 text-xs font-semibold text-muted-foreground uppercase">
                <th className="p-4">File</th>
                <th className="p-4">Type</th>
                <th className="p-4">Category</th>
                <th className="p-4">Upload Date</th>
                <th className="p-4">Month</th>
                <th className="p-4">Uploaded By</th>
                <th className="p-4">Downloads</th>
                <th className="p-4">Views</th>
                <th className="p-4 text-right">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedItems.map((item) => {
                const { icon: Icon, badgeClass, colorClass } = getIconAndBadgeConfig(item.file_type);
                const mockDownloads = (item.id * 13) % 47;
                const mockViews = (item.id * 29) % 183;
                return (
                  <tr 
                    key={item.id} 
                    onClick={() => setSelectedItemForPreview(item)}
                    className="hover:bg-secondary/40 cursor-pointer transition-colors group"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Icon className={`h-5 w-5 ${colorClass} flex-shrink-0`} />
                        <span className="font-semibold text-foreground group-hover:text-primary transition-colors truncate max-w-xs">{item.title}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeClass}`}>
                        {item.file_type}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground text-xs">{item.category}</td>
                    <td className="p-4 text-muted-foreground text-xs">
                      {new Date(item.uploaded_at).toLocaleDateString(undefined, {month: "short", day: "numeric", year: "numeric"})}
                    </td>
                    <td className="p-4 text-muted-foreground text-xs font-medium">
                      {getMonthYearLabel(item.uploaded_at)}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-foreground">{item.uploaded_by}</span>
                        <span className="text-[10px] text-muted-foreground">{item.organization_name || "EduStream"}</span>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground text-xs font-bold">{mockDownloads}</td>
                    <td className="p-4 text-muted-foreground text-xs font-bold">{mockViews}</td>
                    <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => triggerDownload(item)}
                        className="p-1.5 rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
                        title="Download File"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* --- RESOURCE PREVIEWER MODAL --- */}
      {selectedItemForPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl h-[85vh] rounded-xl border border-border bg-card p-6 shadow-xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-foreground truncate max-w-xl">{selectedItemForPreview.title}</h3>
                <p className="text-xs text-muted-foreground">{selectedItemForPreview.file_type} • {selectedItemForPreview.file_size} • Curated by Super Admin</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => triggerDownload(selectedItemForPreview)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary transition-all"
                >
                  <Download className="h-3.5 w-3.5" /> Download
                </button>
                <button 
                  onClick={() => setSelectedItemForPreview(null)} 
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Preview Frame Area */}
            <div className="flex-1 bg-secondary/20 rounded-lg overflow-hidden border border-border/60 flex items-center justify-center p-2 w-full">
              {selectedItemForPreview.file_type.toUpperCase() === "PDF" ? (
                <iframe
                  src={selectedItemForPreview.public_url}
                  className="w-full h-full border-none rounded-md"
                  title="PDF Preview"
                />
              ) : ["DOCX", "DOC"].includes(selectedItemForPreview.file_type.toUpperCase()) ? (
                <DocxPreview url={selectedItemForPreview.public_url} />
              ) : ["XLSX", "XLS"].includes(selectedItemForPreview.file_type.toUpperCase()) ? (
                <XlsxPreview url={selectedItemForPreview.public_url} />
              ) : ["PPTX", "PPT"].includes(selectedItemForPreview.file_type.toUpperCase()) ? (
                <PptxPreview url={selectedItemForPreview.public_url} />
              ) : ["MP4", "AVI", "MOV", "WEBM", "VIDEO"].includes(selectedItemForPreview.file_type.toUpperCase()) ? (
                <video
                  src={selectedItemForPreview.public_url}
                  controls
                  className="max-w-full max-h-full rounded-md shadow-md"
                />
              ) : ["PNG", "JPG", "JPEG", "GIF", "SVG", "IMAGE"].includes(selectedItemForPreview.file_type.toUpperCase()) ? (
                <img
                  src={selectedItemForPreview.public_url}
                  alt={selectedItemForPreview.title}
                  className="max-w-full max-h-full object-contain rounded-md shadow-md"
                />
              ) : (
                /* Native Details fallback for non-renderable file types */
                <div className="text-center p-6">
                  <FileIcon className="h-16 w-16 text-primary mx-auto mb-3" />
                  <h4 className="text-sm font-semibold">{selectedItemForPreview.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-md">
                    Direct rendering is not supported for {selectedItemForPreview.file_type} files. 
                    Please click download to retrieve the original file.
                  </p>
                  <button
                    onClick={() => triggerDownload(selectedItemForPreview)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98] px-4 py-2 text-sm font-medium mt-4 transition-all"
                  >
                    <Download className="h-4 w-4" /> Get File
                  </button>
                </div>
              )}
            </div>

            {selectedItemForPreview.description && (
              <div className="mt-4 border-t border-border/40 pt-3">
                <h5 className="text-xs font-bold text-foreground mb-1">Description</h5>
                <p className="text-xs text-muted-foreground line-clamp-2">{selectedItemForPreview.description}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
