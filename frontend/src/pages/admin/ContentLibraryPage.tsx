import React, { useState, useEffect, useRef } from "react";
import {
  UploadCloud,
  Plus,
  FileText,
  Film,
  FileSpreadsheet,
  Presentation,
  FolderPlus,
  Search,
  MoreVertical,
  Trash2,
  Edit,
  Eye,
  Download,
  CheckCircle,
  XCircle,
  Archive,
  File as FileIcon,
  Image as ImageIcon,
  Folder,
  X,
  Loader2,
  Calendar,
  Layers,
  Check,
  EyeOff,
  LayoutGrid,
  List
} from "lucide-react";
import { PageHeader, Card, Button, Badge } from "@/components/common";
import { ResponsivePageWrapper } from "@/components/layout/ResponsivePageWrapper";
import { ResponsiveModal } from "@/components/layout/ResponsiveModal";
import { apiFetch } from "@/services/api";

import { API_URL } from "@/constants/env";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import JSZip from "jszip";
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
  created_at: string;
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
  content_date?: string;
  is_active: boolean;
  original_filename?: string;
  warning?: string;
  organization_name?: string;
  folder?: string;
  visibility?: string;
}

const getDownloadUrl = (item: ContentItem) => {
  if (!item || !item.public_url) return "";
  const filename = item.original_filename || item.title || "download";
  const separator = item.public_url.includes("?") ? "&" : "?";
  return `${item.public_url}${separator}download=${encodeURIComponent(filename)}`;
};

const triggerDownload = (item: ContentItem) => {
  const token = localStorage.getItem("token") || "";
  const downloadUrl = `${API_URL}/content/download/${item.id}?token=${encodeURIComponent(token)}`;

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

export function ContentLibraryPage() {
  const { searchQuery, setSearchQuery } = useAuth();

  // DB States
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list" | "month" | "folders" | "categories">("month");

  // Filter & Search States
  const [activeCategory, setActiveCategory] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [dateSort, setDateSort] = useState<"newest" | "oldest" | "month-wise" | "file-type">("newest");

  // Additional filters
  const [monthFilter, setMonthFilter] = useState("All");
  const [yearFilter, setYearFilter] = useState("All");
  const [uploaderFilter, setUploaderFilter] = useState("All");
  const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>({});
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // Modal Open States
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isCategoryManageOpen, setIsCategoryManageOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"upload" | "categories" | "bulk">("upload");

  // Item Action States
  const [selectedItemForPreview, setSelectedItemForPreview] = useState<ContentItem | null>(null);
  const [selectedItemForEdit, setSelectedItemForEdit] = useState<ContentItem | null>(null);
  const [selectedItemForDelete, setSelectedItemForDelete] = useState<ContentItem | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null);

  // Single Upload Form States
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploadCategory, setUploadCategory] = useState("");
  const [uploadFolder, setUploadFolder] = useState("General");
  const [uploadCustomFolder, setUploadCustomFolder] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSingleSubmitting, setIsSingleSubmitting] = useState(false);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [uploadVisibility, setUploadVisibility] = useState("owner_employee");
  const [uploadContentDate, setUploadContentDate] = useState("");
  const [bulkVisibility, setBulkVisibility] = useState("owner_employee");

  // Bulk Upload Form States
  const [bulkCategory, setBulkCategory] = useState("");
  const [selectedBulkFiles, setSelectedBulkFiles] = useState<FileList | null>(null);
  const [selectedZipFile, setSelectedZipFile] = useState<File | null>(null);
  const [bulkUploadType, setBulkUploadType] = useState<"files" | "zip">("files");
  const [bulkFileMetadata, setBulkFileMetadata] = useState<Record<string, { category: string; newCategoryName?: string; contentDate?: string }>>({});
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);

  // Category Manager Form States
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCategorySubmitting, setIsCategorySubmitting] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");

  // Edit Item Form States
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editVisibility, setEditVisibility] = useState("owner_employee");
  const [editContentDate, setEditContentDate] = useState("");
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // Delete Action State
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);

  // Refs for closing dropdowns
  const dropdownRef = useRef<HTMLDivElement>(null);

  const monthsList = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const yearsList = React.useMemo(() => {
    const years = new Set<string>();
    items.forEach(item => {
      const yr = new Date(item.content_date || item.uploaded_at).getFullYear();
      if (!isNaN(yr)) years.add(String(yr));
    });
    return Array.from(years).sort().reverse();
  }, [items]);

  const uploadersList = React.useMemo(() => {
    const uploaders = new Set<string>();
    items.forEach(item => {
      if (item.uploaded_by) uploaders.add(item.uploaded_by);
    });
    return Array.from(uploaders).sort();
  }, [items]);

  const toggleMonth = (monthLabel: string) => {
    setCollapsedMonths(prev => ({
      ...prev,
      [monthLabel]: !prev[monthLabel]
    }));
  };

  const toggleFolder = (folderLabel: string) => {
    setCollapsedFolders(prev => ({
      ...prev,
      [folderLabel]: !prev[folderLabel]
    }));
  };

  const toggleCategoryView = (categoryLabel: string) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [categoryLabel]: !prev[categoryLabel]
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
      const d = new Date(item.content_date || item.uploaded_at);
      const mName = d.toLocaleString("default", { month: "long" });
      if (mName !== monthFilter) return false;
    }

    if (yearFilter !== "All") {
      const d = new Date(item.content_date || item.uploaded_at);
      if (String(d.getFullYear()) !== yearFilter) return false;
    }

    if (uploaderFilter !== "All") {
      if (item.uploaded_by !== uploaderFilter) return false;
    }

    return true;
  });

  const sortedItems = React.useMemo(() => {
    const itemsCopy = [...filteredItems];
    if (dateSort === "newest") {
      return itemsCopy.sort((a, b) => new Date(b.content_date || b.uploaded_at).getTime() - new Date(a.content_date || a.uploaded_at).getTime());
    } else if (dateSort === "oldest") {
      return itemsCopy.sort((a, b) => new Date(a.content_date || a.uploaded_at).getTime() - new Date(b.content_date || b.uploaded_at).getTime());
    } else if (dateSort === "month-wise") {
      return itemsCopy.sort((a, b) => new Date(b.content_date || b.uploaded_at).getTime() - new Date(a.content_date || a.uploaded_at).getTime());
    } else if (dateSort === "file-type") {
      return itemsCopy.sort((a, b) => a.file_type.localeCompare(b.file_type));
    }
    return itemsCopy;
  }, [filteredItems, dateSort]);

  const groupedByMonth = React.useMemo(() => {
    const groups: Record<string, typeof sortedItems> = {};
    sortedItems.forEach(item => {
      const label = getMonthYearLabel(item.content_date || item.uploaded_at);
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

  const groupedByFolder = React.useMemo(() => {
    const groups: Record<string, typeof sortedItems> = {};
    sortedItems.forEach(item => {
      const label = item.folder || "General";
      if (!groups[label]) {
        groups[label] = [];
      }
      groups[label].push(item);
    });
    return groups;
  }, [sortedItems]);

  const sortedFolderKeys = React.useMemo(() => {
    return Object.keys(groupedByFolder).sort((a, b) => a.localeCompare(b));
  }, [groupedByFolder]);

  const groupedByCategory = React.useMemo(() => {
    const groups: Record<string, typeof sortedItems> = {};
    sortedItems.forEach(item => {
      const label = item.category || "Uncategorized";
      if (!groups[label]) {
        groups[label] = [];
      }
      groups[label].push(item);
    });
    return groups;
  }, [sortedItems]);

  const sortedCategoryKeys = React.useMemo(() => {
    return Object.keys(groupedByCategory).sort((a, b) => a.localeCompare(b));
  }, [groupedByCategory]);

  useEffect(() => {
    fetchCategories();
    fetchContentItems();
  }, [searchQuery, activeCategory, typeFilter, dateSort]);

  // Handle outside click to close card dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdownId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchOrganizations = async () => {
    try {
      const data = await apiFetch<any[]>("/users/organizations");
      setOrganizations(data || []);
    } catch (err) {
      console.error("Failed to load organizations:", err);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  // --- API Fetch Helpers ---

  const fetchCategories = async () => {
    try {
      const data = await apiFetch<Category[]>("/content/categories");
      setCategories(data || []);
      if (data && data.length > 0) {
        setUploadCategory(data[0].name);
        setBulkCategory(data[0].name);
      }
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
      toast.error("Failed to load content resources: " + (err.message || ""));
    } finally {
      setIsLoading(false);
    }
  };

  // --- Category Actions ---

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      toast.warning("Category name cannot be blank.");
      return;
    }
    setIsCategorySubmitting(true);
    try {
      await apiFetch("/content/categories", {
        method: "POST",
        body: JSON.stringify({ name: newCategoryName.trim() })
      });
      toast.success(`Category '${newCategoryName}' created successfully!`);
      setNewCategoryName("");
      fetchCategories();
    } catch (err: any) {
      toast.error(err.message || "Failed to create category");
    } finally {
      setIsCategorySubmitting(false);
    }
  };

  const handleRenameCategory = async (id: number) => {
    if (!editingCategoryName.trim()) {
      toast.warning("Category name cannot be blank.");
      return;
    }
    setIsCategorySubmitting(true);
    try {
      await apiFetch(`/content/categories/${id}`, {
        method: "PUT",
        body: JSON.stringify({ name: editingCategoryName.trim() })
      });
      toast.success("Category renamed successfully!");
      setEditingCategoryId(null);
      setEditingCategoryName("");
      fetchCategories();
      fetchContentItems();
    } catch (err: any) {
      toast.error(err.message || "Failed to rename category");
    } finally {
      setIsCategorySubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: number, name: string) => {
    if (!window.confirm(`Warning: Deleting category '${name}' will also delete all files stored in Supabase and their metadata in Neon within this category. Do you want to proceed?`)) {
      return;
    }
    setIsCategorySubmitting(true);
    try {
      await apiFetch(`/content/categories/${id}`, {
        method: "DELETE"
      });
      toast.success(`Category '${name}' and its assets successfully purged.`);
      fetchCategories();
      fetchContentItems();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete category");
    } finally {
      setIsCategorySubmitting(false);
    }
  };

  // --- Single Upload Action ---

  const handleSingleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.warning("Please select a file to upload.");
      return;
    }
    if (!uploadTitle.trim()) {
      toast.warning("Please provide a title.");
      return;
    }
    if (!uploadCategory) {
      toast.warning("Please assign a category.");
      return;
    }

    setIsSingleSubmitting(true);
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("title", uploadTitle.trim());
    formData.append("description", uploadDesc.trim());
    formData.append("category", uploadCategory);
    
    const folderVal = uploadFolder === "Custom" ? uploadCustomFolder.trim() : uploadFolder;
    formData.append("folder", folderVal || "General");
    formData.append("visibility", uploadVisibility);
    if (uploadContentDate) {
      formData.append("content_date", new Date(uploadContentDate).toISOString());
    }

    try {
      // Send dynamic multipart data to upload
      await fetch(`${API_URL}/content/upload`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: formData
      }).then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || "Upload failed");
        }
        return res.json();
      });

      toast.success("Content uploaded and metadata saved successfully!");
      setSelectedFile(null);
      setUploadTitle("");
      setUploadDesc("");
      setUploadFolder("General");
      setUploadCustomFolder("");
      setUploadContentDate("");
      setIsUploadOpen(false);
      fetchContentItems();
    } catch (err: any) {
      toast.error("Upload failed: " + (err.message || "Server error"));
    } finally {
      setIsSingleSubmitting(false);
    }
  };

  // --- Bulk Upload Action ---

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const zipEntryToBase64 = async (zipFile: JSZip.JSZipObject): Promise<string> => {
    const blob = await zipFile.async("blob");
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkUploadType === "files" && (!selectedBulkFiles || selectedBulkFiles.length === 0)) {
      toast.warning("Please select one or more files.");
      return;
    }
    if (bulkUploadType === "zip" && !selectedZipFile) {
      toast.warning("Please select a ZIP archive file.");
      return;
    }

    setIsBulkSubmitting(true);

    try {
      const payloadFiles: Array<{ file: string; filename: string; category: string; content_date?: string }> = [];
      const defaultCategory = categories[0]?.name || "General";

      if (bulkUploadType === "files" && selectedBulkFiles) {
        for (let i = 0; i < selectedBulkFiles.length; i++) {
          const file = selectedBulkFiles[i];
          const base64 = await fileToBase64(file);
          const meta = bulkFileMetadata[file.name] || {};
          let selectedCat = meta.category || bulkCategory || defaultCategory;
          if (selectedCat === "__new_category__") {
            const newCat = (meta.newCategoryName || "").trim();
            if (!newCat) {
              toast.error(`Please enter a new category name for file "${file.name}"`);
              setIsBulkSubmitting(false);
              return;
            }
            selectedCat = newCat;
          }
          const contentDateVal = meta.contentDate ? new Date(meta.contentDate).toISOString() : undefined;
          payloadFiles.push({
            file: base64,
            filename: file.name,
            category: selectedCat,
            content_date: contentDateVal
          });
        }
      } else if (bulkUploadType === "zip" && selectedZipFile) {
        const zip = await JSZip.loadAsync(selectedZipFile);
        const entries = Object.keys(zip.files).filter(
          name => !zip.files[name].dir && !name.startsWith("__MACOSX") && !name.startsWith(".")
        );
        for (const name of entries) {
          const fileObj = zip.files[name];
          const base64 = await zipEntryToBase64(fileObj);
          const baseName = name.split("/").pop() || name;
          const meta = bulkFileMetadata[baseName] || {};
          let selectedCat = meta.category || bulkCategory || defaultCategory;
          if (selectedCat === "__new_category__") {
            const newCat = (meta.newCategoryName || "").trim();
            if (!newCat) {
              toast.error(`Please enter a new category name for file "${baseName}"`);
              setIsBulkSubmitting(false);
              return;
            }
            selectedCat = newCat;
          }
          const contentDateVal = meta.contentDate ? new Date(meta.contentDate).toISOString() : undefined;
          payloadFiles.push({
            file: base64,
            filename: baseName,
            category: selectedCat,
            content_date: contentDateVal
          });
        }
      }

      const response = await fetch(`${API_URL}/content/bulk-upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          files: payloadFiles,
          visibility: bulkVisibility
        })
      }).then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || "Bulk upload failed");
        }
        return res.json();
      });

      toast.success(`Successfully uploaded ${response.uploaded} assets!`);
      if (response.failed > 0) {
        toast.error(`Failed to upload ${response.failed} files in the batch.`);
      }

      setSelectedBulkFiles(null);
      setSelectedZipFile(null);
      setBulkFileMetadata({});
      setBulkVisibility("owner_employee");
      setIsBulkOpen(false);
      fetchContentItems();
    } catch (err: any) {
      toast.error("Bulk upload failed: " + (err.message || "Server error"));
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  const handleBulkFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedBulkFiles(e.target.files);
      const initialMeta: typeof bulkFileMetadata = {};
      const defaultCat = categories[0]?.name || "General";
      Array.from(e.target.files).forEach(f => {
        initialMeta[f.name] = {
          category: defaultCat
        };
      });
      setBulkFileMetadata(initialMeta);
    }
  };

  const handleBulkZipChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedZipFile(file);
      try {
        const zip = await JSZip.loadAsync(file);
        const fileNames = Object.keys(zip.files).filter(
          name => !zip.files[name].dir && !name.startsWith("__MACOSX") && !name.startsWith(".")
        );
        const initialMeta: typeof bulkFileMetadata = {};
        const defaultCat = categories[0]?.name || "General";
        fileNames.forEach(name => {
          const baseName = name.split("/").pop() || name;
          initialMeta[baseName] = {
            category: defaultCat
          };
        });
        setBulkFileMetadata(initialMeta);
      } catch (err) {
        console.error("ZIP read error:", err);
        toast.error("Failed to parse filenames from ZIP file");
      }
    }
  };

  // --- Edit Metadata Action ---

  const openEditModal = (item: ContentItem) => {
    setSelectedItemForEdit(item);
    setEditTitle(item.title);
    setEditDesc(item.description || "");
    setEditCategory(item.category);
    setEditIsActive(item.is_active);
    setEditVisibility(item.visibility || "owner_employee");
    setEditContentDate(item.content_date ? item.content_date.split("T")[0] : "");
    setActiveDropdownId(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForEdit) return;
    if (!editTitle.trim()) {
      toast.warning("Title cannot be blank.");
      return;
    }

    setIsEditSubmitting(true);
    try {
      await apiFetch(`/content/items/${selectedItemForEdit.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDesc.trim(),
          category: editCategory,
          is_active: editIsActive,
          visibility: editVisibility,
          content_date: editContentDate ? new Date(editContentDate).toISOString() : null
        })
      });

      toast.success("Resource metadata updated successfully!");
      setSelectedItemForEdit(null);
      setEditContentDate("");
      fetchContentItems();
    } catch (err: any) {
      toast.error(err.message || "Failed to update resource");
    } finally {
      setIsEditSubmitting(false);
    }
  };

  // --- Toggle Active Status Directly ---

  const handleToggleActive = async (item: ContentItem) => {
    try {
      await apiFetch(`/content/items/${item.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: item.title,
          description: item.description,
          category: item.category,
          is_active: !item.is_active
        })
      });
      toast.success(`Asset successfully ${!item.is_active ? 'Activated' : 'Deactivated'}!`);
      fetchContentItems();
    } catch (err: any) {
      toast.error("Failed to update status: " + (err.message || ""));
    }
  };

  // --- Delete Asset Action ---

  const handleDeleteSubmit = async () => {
    if (!selectedItemForDelete) return;
    setIsDeleteSubmitting(true);
    try {
      await apiFetch(`/content/items/${selectedItemForDelete.id}`, {
        method: "DELETE"
      });
      toast.success("Asset physically purged from Supabase and Neon DB!");
      setSelectedItemForDelete(null);
      fetchContentItems();
    } catch (err: any) {
      toast.error(err.message || "Deletion failed");
    } finally {
      setIsDeleteSubmitting(false);
    }
  };

  // --- Helper to map Lucide Icons ---

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
        className={`!p-0 overflow-hidden border border-border/80 bg-card rounded-xl transition-all hover:shadow-lg relative flex flex-col h-full group ${!item.is_active ? 'opacity-65' : ''}`}
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
            {item.warning ? (
              <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded animate-pulse" title={item.warning}>⚠️ Missing in Bucket</span>
            ) : (
              <span className="text-xs font-medium text-muted-foreground">{item.file_size}</span>
            )}
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
            {/* Visibility / Uploader Info Display */}
            <div className="flex flex-col text-left mb-2.5 border-t border-border/40 pt-2.5">
              <span className="text-xs font-bold text-foreground truncate">Uploaded by: {item.uploaded_by}</span>
              <span className="text-[10px] text-muted-foreground truncate">
                Visibility: {item.visibility === "owner_only" ? "Owners Only" : "Owners + Employees"}
              </span>
            </div>

            {/* Premium details */}
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mb-3 text-[10px] text-muted-foreground font-semibold">
              <span>{getMonthYearLabel(item.content_date || item.uploaded_at)}</span>
            </div>

            <div className="flex items-center justify-between border-t border-border/20 pt-2">
              <span className="text-xs text-muted-foreground/80 font-medium">
                Category: {item.category}
              </span>

              {/* Dropdown Action Menu */}
              <div className="relative">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveDropdownId(activeDropdownId === item.id ? null : item.id);
                  }}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>

                {activeDropdownId === item.id && (
                  <div 
                    ref={dropdownRef} 
                    className="absolute right-0 bottom-full mb-1 w-44 rounded-lg border border-border bg-card p-1.5 shadow-lg z-20 text-left"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => { setSelectedItemForPreview(item); setActiveDropdownId(null); }}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-foreground hover:bg-secondary transition-all"
                    >
                      <Eye className="h-3.5 w-3.5" /> Preview Resource
                    </button>
                    <button
                      onClick={() => { openEditModal(item); setActiveDropdownId(null); }}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-foreground hover:bg-secondary transition-all"
                    >
                      <Edit className="h-3.5 w-3.5" /> Edit Details
                    </button>
                    <button
                      onClick={() => { handleToggleActive(item); setActiveDropdownId(null); }}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-foreground hover:bg-secondary transition-all"
                    >
                      {item.is_active ? (
                        <>
                          <EyeOff className="h-3.5 w-3.5 text-amber-600" /> Deactivate
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-600" /> Activate
                        </>
                      )}
                    </button>
                    <hr className="my-1 border-border/60" />
                    <button
                      onClick={() => { setSelectedItemForDelete(item); setActiveDropdownId(null); }}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 transition-all font-semibold"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete Asset
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  const uniqueFileTypes = ["PDF", "DOCX", "XLSX", "PPTX", "Video", "Image", "Archive"];

  return (
    <ResponsivePageWrapper>
      <PageHeader
        title="Content Library"
        subtitle="Upload, curate, and distribute dynamic educational resources across the workspace."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsCategoryManageOpen(true)}>
              <FolderPlus className="h-4 w-4" /> Categories
            </Button>
            <Button variant="outline" onClick={() => setIsBulkOpen(true)}>
              <Layers className="h-4 w-4" /> Bulk upload
            </Button>
            <Button onClick={() => setIsUploadOpen(true)}>
              <Plus className="h-4 w-4" /> Add single asset
            </Button>
          </div>
        }
      />

      {/* Upload Drag & Drop trigger zone */}
      <div 
        onClick={() => setIsUploadOpen(true)}
        className="app-surface-muted mb-8 cursor-pointer rounded-xl border-2 border-dashed border-border bg-card p-10 text-center transition-all hover:border-primary/40 hover:bg-primary-soft/30"
      >
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
          <UploadCloud className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold">Click to upload assets</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Secure backend proxy upload to Supabase. Supports PDF, MP4, DOCX, XLSX, PPTX, Images and ZIP up to 500MB.
        </p>
      </div>

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
          <div className="flex flex-wrap items-center gap-2.5">
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
                onClick={() => setViewMode("folders")}
                className={`flex items-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-semibold transition-all ${viewMode === "folders" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}
                title="Folders View (Collapsible)"
              >
                <Folder className="h-3.5 w-3.5" />
                <span>Folders</span>
              </button>
              <button
                onClick={() => setViewMode("categories")}
                className={`flex items-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-semibold transition-all ${viewMode === "categories" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}
                title="Categories View (Collapsible)"
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Categories</span>
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

          {/* Uploader Dropdown Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Uploaded By</label>
            <select
              value={uploaderFilter}
              onChange={(e) => setUploaderFilter(e.target.value)}
              className="rounded-lg border border-border bg-card py-1.5 px-3 text-xs font-semibold hover:bg-secondary text-muted-foreground shadow-sm outline-none cursor-pointer max-w-[200px]"
            >
              <option value="All">All Uploaders</option>
              {uploadersList.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Loading Surface Overlay */}
      {isLoading ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading curations from Neon...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-border bg-card p-6 text-center">
          <Folder className="h-10 w-10 text-muted-foreground/60 mb-2" />
          <h4 className="text-base font-semibold">No assets found</h4>
          <p className="text-sm text-muted-foreground max-w-sm mt-1">
            There are no content files matching your search or filters.
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
      ) : viewMode === "folders" ? (
        /* Collapsible Folder-wise Groups */
        <div className="space-y-6">
          {sortedFolderKeys.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center border border-border rounded-xl bg-card">
              <Folder className="h-10 w-10 text-muted-foreground/60 mb-2" />
              <p className="text-sm font-semibold text-muted-foreground">No folders found</p>
            </div>
          ) : (
            sortedFolderKeys.map((folderKey) => {
              const folderItems = groupedByFolder[folderKey] || [];
              const isCollapsed = collapsedFolders[folderKey];
              return (
                <div key={folderKey} className="border border-border bg-card/45 rounded-xl overflow-hidden shadow-sm">
                  <button
                    onClick={() => toggleFolder(folderKey)}
                    className="w-full flex items-center justify-between px-5 py-4 bg-secondary/10 hover:bg-secondary/25 border-b border-border/80 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-primary font-bold text-base transition-transform duration-200">
                        {isCollapsed ? "▶" : "▼"}
                      </span>
                      <Folder className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-bold text-foreground">{folderKey}</h3>
                      <span className="text-[10px] text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full font-bold">
                        {folderItems.length} {folderItems.length === 1 ? "File" : "Files"}
                      </span>
                    </div>
                  </button>

                  {!isCollapsed && (
                    <div className="p-5">
                      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {folderItems.map((item) => renderItemCard(item))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : viewMode === "categories" ? (
        /* Collapsible Category-wise Groups */
        <div className="space-y-6">
          {sortedCategoryKeys.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center border border-border rounded-xl bg-card">
              <Layers className="h-10 w-10 text-muted-foreground/60 mb-2" />
              <p className="text-sm font-semibold text-muted-foreground">No categories found</p>
            </div>
          ) : (
            sortedCategoryKeys.map((categoryKey) => {
              const categoryItems = groupedByCategory[categoryKey] || [];
              const isCollapsed = collapsedCategories[categoryKey];
              return (
                <div key={categoryKey} className="border border-border bg-card/45 rounded-xl overflow-hidden shadow-sm">
                  <button
                    onClick={() => toggleCategoryView(categoryKey)}
                    className="w-full flex items-center justify-between px-5 py-4 bg-secondary/10 hover:bg-secondary/25 border-b border-border/80 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-primary font-bold text-base transition-transform duration-200">
                        {isCollapsed ? "▶" : "▼"}
                      </span>
                      <Layers className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-bold text-foreground">{categoryKey}</h3>
                      <span className="text-[10px] text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full font-bold">
                        {categoryItems.length} {categoryItems.length === 1 ? "File" : "Files"}
                      </span>
                    </div>
                  </button>

                  {!isCollapsed && (
                    <div className="p-5">
                      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {categoryItems.map((item) => renderItemCard(item))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
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
                <th className="p-4">Content Date</th>
                <th className="p-4">Month</th>
                <th className="p-4">Uploaded By</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedItems.map((item) => {
                const { icon: Icon, badgeClass, colorClass } = getIconAndBadgeConfig(item.file_type);
                return (
                  <tr 
                    key={item.id} 
                    onClick={() => setSelectedItemForPreview(item)}
                    className={`hover:bg-secondary/40 cursor-pointer transition-colors group ${!item.is_active ? 'opacity-65' : ''}`}
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
                      {new Date(item.content_date || item.uploaded_at).toLocaleDateString(undefined, {month: "short", day: "numeric", year: "numeric"})}
                    </td>
                    <td className="p-4 text-muted-foreground text-xs font-medium">
                      {getMonthYearLabel(item.content_date || item.uploaded_at)}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-foreground">{item.uploaded_by}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {item.visibility === "owner_only" ? "Owners Only" : "Owners + Employees"}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="relative inline-block text-left">
                        <button 
                          onClick={() => setActiveDropdownId(activeDropdownId === item.id ? null : item.id)}
                          className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>

                        {activeDropdownId === item.id && (
                          <div 
                            ref={dropdownRef} 
                            className="absolute right-0 top-full mt-1 w-44 rounded-lg border border-border bg-card p-1.5 shadow-lg z-20"
                          >
                            <button
                              onClick={() => { setSelectedItemForPreview(item); setActiveDropdownId(null); }}
                              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-foreground hover:bg-secondary transition-all"
                            >
                              <Eye className="h-3.5 w-3.5" /> Preview Resource
                            </button>
                            <button
                              onClick={() => { openEditModal(item); setActiveDropdownId(null); }}
                              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-foreground hover:bg-secondary transition-all"
                            >
                              <Edit className="h-3.5 w-3.5" /> Edit Details
                            </button>
                            <button
                              onClick={() => { handleToggleActive(item); setActiveDropdownId(null); }}
                              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-foreground hover:bg-secondary transition-all"
                            >
                              {item.is_active ? (
                                <>
                                  <EyeOff className="h-3.5 w-3.5 text-amber-600" /> Deactivate
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-3.5 w-3.5 text-emerald-600" /> Activate
                                </>
                              )}
                            </button>
                            <hr className="my-1 border-border/60" />
                            <button
                              onClick={() => { setSelectedItemForDelete(item); setActiveDropdownId(null); }}
                              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 transition-all font-semibold"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete Asset
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* --- MODAL 1: ADD SINGLE ASSET MODAL --- */}
      <ResponsiveModal
        isOpen={isUploadOpen}
        onClose={() => { setIsUploadOpen(false); setSelectedFile(null); }}
        title="Add Resource to Library"
        size="sm"
      >
        <form onSubmit={handleSingleUpload} className="space-y-4">
          {/* File Input Select area */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Select File</label>
            <div className="relative flex flex-col items-center justify-center border border-border bg-card rounded-lg p-6 hover:bg-secondary/40 cursor-pointer transition-all">
              <input
                type="file"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    const file = e.target.files[0];
                    setSelectedFile(file);
                    // Autocomplete title
                    const nameWithoutExt = file.name.includes(".") ? file.name.substring(0, file.name.lastIndexOf('.')) : file.name;
                    setUploadTitle(nameWithoutExt.replace(/[_-]/g, " ").trim());
                  }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <UploadCloud className="h-8 w-8 text-primary mb-1.5" />
              <span className="text-xs text-foreground font-semibold">
                {selectedFile ? selectedFile.name : "Click to select a file"}
              </span>
              <span className="text-[10px] text-muted-foreground mt-0.5">
                {selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB` : "Supports assets up to 500MB"}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase">Title</label>
            <input
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              placeholder="e.g. Q4 Growth Roadmap"
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase">Description (Optional)</label>
            <textarea
              value={uploadDesc}
              onChange={(e) => setUploadDesc(e.target.value)}
              placeholder="Summarize or add instructions for this asset..."
              rows={3}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase">Content Date (Optional)</label>
            <input
              type="date"
              value={uploadContentDate}
              onChange={(e) => setUploadContentDate(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary text-muted-foreground"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase">Category</label>
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary cursor-pointer text-muted-foreground"
                required
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase">Folder</label>
              <select
                value={uploadFolder}
                onChange={(e) => setUploadFolder(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary cursor-pointer text-muted-foreground"
                required
              >
                {["Finance", "Marketing", "Training", "HR", "Operations", "General", "Custom"].map((f) => (
                  <option key={f} value={f}>{f === "Custom" ? "Custom Folder..." : f}</option>
                ))}
              </select>
            </div>
          </div>

          {uploadFolder === "Custom" && (
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase">Custom Folder Name</label>
              <input
                value={uploadCustomFolder}
                onChange={(e) => setUploadCustomFolder(e.target.value)}
                placeholder="Enter custom folder name"
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase">Visibility</label>
            <div className="flex gap-4 mt-2">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer select-none">
                <input
                  type="radio"
                  name="uploadVisibility"
                  value="owner_only"
                  checked={uploadVisibility === "owner_only"}
                  onChange={(e) => setUploadVisibility(e.target.value)}
                  className="text-primary focus:ring-primary h-4 w-4"
                />
                Owners Only
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer select-none">
                <input
                  type="radio"
                  name="uploadVisibility"
                  value="owner_employee"
                  checked={uploadVisibility === "owner_employee"}
                  onChange={(e) => setUploadVisibility(e.target.value)}
                  className="text-primary focus:ring-primary h-4 w-4"
                />
                Owners + Employees
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-4 mt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => { setIsUploadOpen(false); setSelectedFile(null); }}
              disabled={isSingleSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSingleSubmitting}
            >
              {isSingleSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Uploading to Supabase...
                </>
              ) : "Upload resource"}
            </Button>
          </div>
        </form>
      </ResponsiveModal>

      {/* --- MODAL 2: BULK UPLOAD ASSETS MODAL --- */}
      <ResponsiveModal
        isOpen={isBulkOpen}
        onClose={() => { setIsBulkOpen(false); setSelectedBulkFiles(null); setSelectedZipFile(null); setBulkFileMetadata({}); }}
        title="Bulk Upload Curations"
        size={Object.keys(bulkFileMetadata).length > 0 ? "xl" : "sm"}
      >
        <div className="flex border-b border-border mb-4">
          <button
            type="button"
            onClick={() => { setBulkUploadType("files"); setSelectedBulkFiles(null); setSelectedZipFile(null); setBulkFileMetadata({}); }}
            className={`flex-1 pb-2 text-sm font-semibold border-b-2 transition-all ${bulkUploadType === "files" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
          >
            Multiple Files
          </button>
          <button
            type="button"
            onClick={() => { setBulkUploadType("zip"); setSelectedBulkFiles(null); setSelectedZipFile(null); setBulkFileMetadata({}); }}
            className={`flex-1 pb-2 text-sm font-semibold border-b-2 transition-all ${bulkUploadType === "zip" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
          >
            ZIP Archive Extract
          </button>
        </div>

        <form onSubmit={handleBulkUpload} className="space-y-4">
          {bulkUploadType === "files" ? (
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Select Files</label>
              <div className="relative flex flex-col items-center justify-center border border-border bg-card rounded-lg p-6 hover:bg-secondary/40 cursor-pointer transition-all">
                <input
                  type="file"
                  multiple
                  onChange={handleBulkFilesChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <UploadCloud className="h-8 w-8 text-primary mb-1.5" />
                <span className="text-xs text-foreground font-semibold">
                  {selectedBulkFiles && selectedBulkFiles.length > 0 
                    ? `${selectedBulkFiles.length} files selected` 
                    : "Click to select multiple files"}
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  Batch upload will store and index all files in one transaction
                </span>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Select ZIP Archive</label>
              <div className="relative flex flex-col items-center justify-center border border-border bg-card rounded-lg p-6 hover:bg-secondary/40 cursor-pointer transition-all">
                <input
                  type="file"
                  accept=".zip"
                  onChange={handleBulkZipChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Archive className="h-8 w-8 text-primary mb-1.5" />
                <span className="text-xs text-foreground font-semibold">
                  {selectedZipFile ? selectedZipFile.name : "Select ZIP file"}
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  Unzips fully in-memory and indexes all contained files automatically
                </span>
              </div>
            </div>
          )}

          {Object.keys(bulkFileMetadata).length > 0 && (
            <div className="flex flex-col gap-2 mt-4 border-t border-border pt-4">
              <label className="block text-xs font-bold text-foreground uppercase mb-1">
                File Mapping Configuration (Table shows: File Name, Category)
              </label>
              <div className="flex items-center justify-between bg-secondary/30 p-2.5 rounded-lg border border-border mb-2">
                <span className="text-xs font-semibold text-foreground">Apply category to all files:</span>
                <select
                  id="bulk-apply-category-select"
                  className="rounded border border-border bg-card py-1 px-2 text-xs text-foreground outline-none cursor-pointer"
                  defaultValue=""
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) {
                      setBulkFileMetadata((prev) => {
                        const updated = { ...prev };
                        Object.keys(updated).forEach((k) => {
                          updated[k] = { 
                            ...updated[k], 
                            category: val,
                            newCategoryName: val === "__new_category__" ? "" : updated[k]?.newCategoryName
                          };
                        });
                        return updated;
                      });
                    }
                  }}
                >
                  <option value="">Select Category...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="overflow-x-auto max-h-[300px] rounded-lg border border-border bg-muted/10 relative">
                <table className="w-full text-left text-xs border-collapse table-fixed">
                  <thead className="sticky top-0 bg-card border-b border-border z-10">
                    <tr className="bg-muted/30 font-semibold text-muted-foreground uppercase">
                      <th className="p-3 w-[45%]">File Name</th>
                      <th className="p-3 w-[30%] min-w-[200px]" style={{ minWidth: "200px" }}>Category</th>
                      <th className="p-3 w-[25%]">Content Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {Object.keys(bulkFileMetadata).map((filename) => {
                      const itemMeta = bulkFileMetadata[filename];
                      return (
                        <tr key={filename} className="hover:bg-secondary/20">
                          <td className="p-3 font-semibold text-foreground">
                            <div className="truncate w-full block" title={filename}>
                              {filename}
                            </div>
                          </td>
                          <td className="p-3" style={{ minWidth: "200px" }}>
                            <div className="flex flex-col gap-1.5">
                              <select
                                value={itemMeta.category}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setBulkFileMetadata((prev) => ({
                                    ...prev,
                                    [filename]: {
                                      ...prev[filename],
                                      category: val,
                                      newCategoryName: val === "__new_category__" ? "" : prev[filename]?.newCategoryName
                                    }
                                  }));
                                }}
                                className="w-full rounded border border-border bg-card py-1 px-2 text-xs text-foreground focus:border-primary outline-none cursor-pointer"
                              >
                                {categories.map((c) => (
                                  <option key={c.id} value={c.name}>
                                    {c.name}
                                  </option>
                                ))}
                                <option value="__new_category__">+ Create New Category</option>
                              </select>
                              {itemMeta.category === "__new_category__" && (
                                <div className="mt-1 flex flex-col gap-1">
                                  <input
                                    type="text"
                                    placeholder="Enter new category name"
                                    value={itemMeta.newCategoryName || ""}
                                    onChange={(e) => {
                                      setBulkFileMetadata((prev) => ({
                                        ...prev,
                                        [filename]: {
                                          ...prev[filename],
                                          newCategoryName: e.target.value
                                        }
                                      }));
                                    }}
                                    className="w-full rounded border border-border bg-card py-1 px-2 text-xs text-foreground focus:border-primary outline-none"
                                    required
                                  />
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <input
                              type="date"
                              value={itemMeta.contentDate || ""}
                              onChange={(e) => {
                                setBulkFileMetadata((prev) => ({
                                  ...prev,
                                  [filename]: {
                                    ...prev[filename],
                                    contentDate: e.target.value
                                  }
                                }));
                              }}
                              className="w-full rounded border border-border bg-card py-1 px-2 text-xs text-foreground focus:border-primary outline-none cursor-pointer"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* General Category Fallback */}
          {Object.keys(bulkFileMetadata).length === 0 && (
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase">Fallback Category</label>
              <select
                value={bulkCategory}
                onChange={(e) => setBulkCategory(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary cursor-pointer text-muted-foreground"
                required
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase">Visibility</label>
            <div className="flex gap-4 mt-2">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer select-none">
                <input
                  type="radio"
                  name="bulkVisibility"
                  value="owner_only"
                  checked={bulkVisibility === "owner_only"}
                  onChange={(e) => setBulkVisibility(e.target.value)}
                  className="text-primary focus:ring-primary h-4 w-4"
                />
                Owners Only
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer select-none">
                <input
                  type="radio"
                  name="bulkVisibility"
                  value="owner_employee"
                  checked={bulkVisibility === "owner_employee"}
                  onChange={(e) => setBulkVisibility(e.target.value)}
                  className="text-primary focus:ring-primary h-4 w-4"
                />
                Owners + Employees
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-4 mt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => { setIsBulkOpen(false); setSelectedBulkFiles(null); setSelectedZipFile(null); setBulkFileMetadata({}); }}
              disabled={isBulkSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isBulkSubmitting}
            >
              {isBulkSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Uploading batch...
                </>
              ) : "Start bulk upload"}
            </Button>
          </div>
        </form>
      </ResponsiveModal>

      {/* --- MODAL 3: CATEGORY MANAGEMENT MODAL --- */}
      <ResponsiveModal
        isOpen={isCategoryManageOpen}
        onClose={() => { setIsCategoryManageOpen(false); setNewCategoryName(""); setEditingCategoryId(null); }}
        title="Manage Resource Categories"
        size="sm"
        footer={
          <Button onClick={() => { setIsCategoryManageOpen(false); setNewCategoryName(""); setEditingCategoryId(null); }}>
            Done
          </Button>
        }
      >
        <div className="space-y-4">
          {/* Create Category form */}
          <form onSubmit={handleCreateCategory} className="flex gap-2 mb-4">
            <input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="New category name (e.g. Operations)"
              className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
              required
            />
            <Button type="submit" disabled={isCategorySubmitting}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </form>

          <div className="border border-border rounded-lg divide-y divide-border bg-secondary/10 overflow-hidden">
            {categories.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No categories defined. Add one above.</p>
            ) : (
              categories.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-card hover:bg-secondary/20 transition-all">
                  {editingCategoryId === c.id ? (
                    <div className="flex items-center gap-2 flex-1 mr-2">
                      <input
                        value={editingCategoryName}
                        onChange={(e) => setEditingCategoryName(e.target.value)}
                        className="flex-1 rounded-md border border-border bg-card px-2 py-1 text-xs outline-none focus:border-primary"
                      />
                      <button 
                        onClick={() => handleRenameCategory(c.id)} 
                        className="p-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button 
                        onClick={() => { setEditingCategoryId(null); setEditingCategoryName(""); }} 
                        className="p-1 rounded bg-red-50 text-red-700 hover:bg-red-100"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm font-semibold text-foreground">{c.name}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setEditingCategoryId(c.id); setEditingCategoryName(c.name); }}
                          className="p-1.5 rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(c.id, c.name)}
                          className="p-1.5 rounded-full text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </ResponsiveModal>

      <ResponsiveModal
        isOpen={!!selectedItemForEdit}
        onClose={() => setSelectedItemForEdit(null)}
        title="Edit Resource Metadata"
        size="sm"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase">Title</label>
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase">Description</label>
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase">Content Date (Optional)</label>
            <input
              type="date"
              value={editContentDate}
              onChange={(e) => setEditContentDate(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary text-muted-foreground"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase">Category</label>
            <select
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary cursor-pointer text-muted-foreground"
              required
            >
              {categories.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase">Visibility</label>
            <div className="flex gap-4 mt-2">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer select-none">
                <input
                  type="radio"
                  name="editVisibility"
                  value="owner_only"
                  checked={editVisibility === "owner_only"}
                  onChange={(e) => setEditVisibility(e.target.value)}
                  className="text-primary focus:ring-primary h-4 w-4"
                />
                Owners Only
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer select-none">
                <input
                  type="radio"
                  name="editVisibility"
                  value="owner_employee"
                  checked={editVisibility === "owner_employee"}
                  onChange={(e) => setEditVisibility(e.target.value)}
                  className="text-primary focus:ring-primary h-4 w-4"
                />
                Owners + Employees
              </label>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1.5">
            <input
              type="checkbox"
              id="editIsActive"
              checked={editIsActive}
              onChange={(e) => setEditIsActive(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
            />
            <label htmlFor="editIsActive" className="text-sm font-semibold text-foreground cursor-pointer select-none">
              Make resource active (visible to standard users)
            </label>
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-4 mt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setSelectedItemForEdit(null)}
              disabled={isEditSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isEditSubmitting}
            >
              {isEditSubmitting ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      </ResponsiveModal>

      {/* --- MODAL 5: DELETE CONFIRMATION MODAL --- */}
      <ResponsiveModal
        isOpen={!!selectedItemForDelete}
        onClose={() => setSelectedItemForDelete(null)}
        title="Purge Resource"
        size="sm"
        footer={
          <>
            <Button 
              variant="outline" 
              onClick={() => setSelectedItemForDelete(null)}
              disabled={isDeleteSubmitting}
            >
              Cancel
            </Button>
            <button 
              onClick={handleDeleteSubmit}
              disabled={isDeleteSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 text-white hover:opacity-90 active:scale-[0.98] px-4 py-2 text-sm font-medium transition-all"
            >
              {isDeleteSubmitting ? "Purging..." : "Confirm Purge"}
            </button>
          </>
        }
      >
        {selectedItemForDelete && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <Trash2 className="h-6 w-6 flex-shrink-0" />
              <h4 className="text-base font-bold">Purge Resource Warning</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              Are you completely sure you want to delete <strong>'{selectedItemForDelete.title}'</strong>?
              This action is permanent and will physically remove the file from your Supabase Storage bucket and Neon PostgreSQL.
            </p>
          </div>
        )}
      </ResponsiveModal>

      {/* --- MODAL 6: RESOURCE PREVIEWER MODAL --- */}
      <ResponsiveModal
        isOpen={!!selectedItemForPreview}
        onClose={() => setSelectedItemForPreview(null)}
        title={selectedItemForPreview?.title || "Resource Preview"}
        subtitle={selectedItemForPreview ? `${selectedItemForPreview.file_type} • ${selectedItemForPreview.file_size} • Shared by ${selectedItemForPreview.uploaded_by}` : ""}
        size="lg"
        footer={
          selectedItemForPreview && (
            <button 
              onClick={() => triggerDownload(selectedItemForPreview)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary transition-all"
            >
              <Download className="h-3.5 w-3.5" /> Download original file
            </button>
          )
        }
      >
        {selectedItemForPreview && (
          <div className="flex flex-col gap-4 h-full min-h-0">
            {/* Preview Frame Area */}
            <div className="bg-secondary/20 rounded-lg overflow-hidden border border-border/60 flex items-center justify-center p-2 w-full min-h-[400px] max-h-[60vh]">
              {selectedItemForPreview.file_type.toUpperCase() === "PDF" ? (
                <iframe
                  src={selectedItemForPreview.public_url}
                  className="w-full h-full min-h-[400px] border-none rounded-md"
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
              <div className="border-t border-border/40 pt-3">
                <h5 className="text-xs font-bold text-foreground mb-1">Description</h5>
                <p className="text-xs text-muted-foreground">{selectedItemForPreview.description}</p>
              </div>
            )}
          </div>
        )}
      </ResponsiveModal>
    </ResponsivePageWrapper>
  );
}
