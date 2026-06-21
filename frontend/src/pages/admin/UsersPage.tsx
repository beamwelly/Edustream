import React, { useState, useEffect } from "react";
import { Plus, Upload, Search, X, Loader2, Download, AlertTriangle, CheckCircle2, Trash2, Power, Save, Shield, LayoutDashboard, Library, GraduationCap, CalendarClock, MessageSquare, Wrench, Coins, Compass, FileSpreadsheet, Activity } from "lucide-react";
import { PageHeader, Card, Button, Badge } from "@/components/common";
import { apiFetch } from "@/services/api";
import { API_URL } from "@/constants/env";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

interface UserMgmt {
  id: number;
  full_name: string;
  email: string;
  company_name: string | null;
  department: string | null;
  designation: string | null;
  is_active: boolean;
  role: string;
  organization_id?: number | null;
}

interface UploadError {
  row: string | number;
  error: string;
}

interface BulkUploadResult {
  success_count: number;
  failed_count: number;
  errors: UploadError[];
}

export function UsersPage() {
  const { user, searchQuery, setSearchQuery } = useAuth();
  console.log("UsersPage admin user:", user);
  
  // Tab control
  const [activeTab, setActiveTab] = useState<"roster" | "policy">("roster");

  // Access Policy States
  const [policySettings, setPolicySettings] = useState<Record<string, boolean>>({
    dashboard: true,
    content_library: true,
    masterclasses: true,
    meetings: false,
    feedback: true,
    wow_toolkit: false,
    financial_discovery: false,
    needs_discovery: false,
    resource_downloads: false,
    future_tools: false,
  });
  const [policyLoading, setPolicyLoading] = useState(false);
  const [policySaving, setPolicySaving] = useState(false);

  // Database States
  const [users, setUsers] = useState<UserMgmt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Modals Toggle States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);

  // Single Creation Form State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [role, setRole] = useState("owner");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Management Modal Form State
  const [selectedUserToManage, setSelectedUserToManage] = useState<UserMgmt | null>(null);
  const [newFullName, setNewFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newDepartment, setNewDepartment] = useState("");
  const [newDesignation, setNewDesignation] = useState("");
  const [newRole, setNewRole] = useState("owner");
  const [isManageSubmitting, setIsManageSubmitting] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Organizations List & Selection States
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
  const [newSelectedOrganizationId, setNewSelectedOrganizationId] = useState("");



  // Bulk Upload File State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<BulkUploadResult | null>(null);

  // Debounce Search Query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

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

  // Fetch Access Policy settings
  const fetchPolicy = async () => {
    setPolicyLoading(true);
    try {
      const data = await apiFetch<any>("/users/employee-access-policy");
      if (data && data.settings) {
        setPolicySettings(data.settings);
      }
    } catch (err: any) {
      toast.error("Failed to load global employee access policy: " + err.message);
    } finally {
      setPolicyLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "policy") {
      fetchPolicy();
    }
  }, [activeTab]);

  const handleSavePolicy = async () => {
    setPolicySaving(true);
    try {
      await apiFetch("/users/employee-access-policy", {
        method: "PUT",
        body: JSON.stringify({ settings: policySettings }),
      });
      toast.success("Employee access policy updated successfully!");
    } catch (err: any) {
      toast.error("Failed to save employee access policy: " + err.message);
    } finally {
      setPolicySaving(false);
    }
  };

  const handleTogglePolicy = (key: string) => {
    setPolicySettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Fetch Users
  const fetchUsersList = async (search: string = "") => {
    setIsLoading(true);
    try {
      const data = await apiFetch<UserMgmt[]>("/users", {
        method: "GET",
        params: search ? { search } : undefined,
      });
      setUsers(data || []);
    } catch (err: any) {
      toast.error("Failed to load users: " + (err.message || "Server error"));
    } finally {
      setIsLoading(false);
    }
  };



  useEffect(() => {
    fetchUsersList(debouncedSearch);
  }, [debouncedSearch]);

  // Single User Submission
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEmployee = role === "employee";
    const compName = isEmployee
      ? (organizations.find(o => String(o.id) === selectedOrganizationId)?.organization_name || "")
      : companyName.trim();

    if (!fullName.trim() || !email.trim() || !compName || !department.trim() || !designation.trim()) {
      toast.warning("Please fill in all fields.");
      return;
    }

    if (isEmployee && !selectedOrganizationId) {
      toast.warning("Please select a company for the employee.");
      return;
    }

    if (isEmployee && selectedOrganizationId) {
      const hasOwner = users.some(
        u => String(u.organization_id) === selectedOrganizationId && (u.role === "owner" || u.role === "user") && u.is_active
      );
      if (!hasOwner) {
        toast.error("Please create an Owner account first.");
        return;
      }
    }

    const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.warning("Please enter a valid email address (e.g. name@domain.com).");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiFetch("/users/create", {
        method: "POST",
        body: JSON.stringify({
          full_name: fullName,
          email: email,
          company_name: compName,
          department: department,
          designation: designation,
          is_active: true,
          role: role,
          organization_id: isEmployee ? Number(selectedOrganizationId) : undefined
        }),
      });
      
      toast.success("User created successfully! Credentials emailed directly.");
      // Reset form states
      setFullName("");
      setEmail("");
      setCompanyName("");
      setSelectedOrganizationId("");
      setDepartment("");
      setDesignation("");
      setRole("owner");
      setIsCreateOpen(false);
      // Refresh list
      fetchUsersList(debouncedSearch);
      fetchOrganizations();
    } catch (err: any) {
      toast.error(err.message || "Failed to create user");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update User Details
  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserToManage) return;
    
    const isEmployee = newRole === "employee";
    const companyTrim = isEmployee
      ? (organizations.find(o => String(o.id) === newSelectedOrganizationId)?.organization_name || "")
      : newCompanyName.trim();
    const nameTrim = newFullName.trim();
    const emailTrim = newEmail.trim();
    const deptTrim = newDepartment.trim();
    const desigTrim = newDesignation.trim();

    if (!nameTrim || !emailTrim || !companyTrim || !deptTrim || !desigTrim) {
      toast.warning("All fields are required.");
      return;
    }

    if (isEmployee && !newSelectedOrganizationId) {
      toast.warning("Please select a company for the employee.");
      return;
    }

    if (isEmployee && newSelectedOrganizationId) {
      const hasOwner = users.some(
        u => String(u.organization_id) === newSelectedOrganizationId && (u.role === "owner" || u.role === "user") && u.is_active
      );
      if (!hasOwner) {
        toast.error("Please create an Owner account first.");
        return;
      }
    }

    const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
    if (!emailRegex.test(emailTrim)) {
      toast.warning("Please enter a valid email address.");
      return;
    }

    setIsManageSubmitting(true);
    try {
      await apiFetch(`/users/${selectedUserToManage.id}/update`, {
        method: "PUT",
        body: JSON.stringify({
          full_name: nameTrim,
          email: emailTrim,
          company_name: companyTrim,
          department: deptTrim,
          designation: desigTrim,
          role: newRole,
          organization_id: isEmployee ? Number(newSelectedOrganizationId) : undefined
        })
      });



      toast.success("User details and permissions updated successfully!");
      setSelectedUserToManage(null);
      fetchUsersList(debouncedSearch);
      fetchOrganizations();
    } catch (err: any) {
      toast.error(err.message || "Failed to update user details");
    } finally {
      setIsManageSubmitting(false);
    }
  };

  // Toggle User Active Status
  const handleToggleStatus = async (targetUser: UserMgmt) => {
    setIsManageSubmitting(true);
    const targetStatus = !targetUser.is_active;
    try {
      await apiFetch(`/users/${targetUser.id}/status`, {
        method: "PUT",
        body: JSON.stringify({ is_active: targetStatus }),
      });
      toast.success(`User ${targetStatus ? "activated" : "deactivated"} successfully!`);
      setSelectedUserToManage(prev => prev ? { ...prev, is_active: targetStatus } : null);
      fetchUsersList(debouncedSearch);
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    } finally {
      setIsManageSubmitting(false);
    }
  };

  // Delete User
  const handleDeleteUser = async (userId: number) => {
    setIsManageSubmitting(true);
    try {
      await apiFetch(`/users/${userId}`, {
        method: "DELETE",
      });
      toast.success("User successfully deleted.");
      setIsDeleteConfirmOpen(false);
      setSelectedUserToManage(null);
      fetchUsersList(debouncedSearch);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete user");
    } finally {
      setIsManageSubmitting(false);
    }
  };

  // Template Download Trigger
  const handleTemplateDownload = () => {
    const token = localStorage.getItem("token");
    const downloadUrl = `${API_URL}/users/template-download`;
    
    fetch(downloadUrl, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })
    .then(response => {
      if (!response.ok) throw new Error("Failed to download template");
      return response.blob();
    })
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "users_template.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("Spreadsheet template downloaded successfully.");
    })
    .catch(err => {
      toast.error("Failed to download spreadsheet template: " + err.message);
    });
  };

  // Bulk Upload File Submission
  const handleBulkUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.warning("Please choose a CSV or Excel file to upload first.");
      return;
    }

    setIsUploading(true);
    setUploadResult(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const result = await apiFetch<BulkUploadResult>("/users/bulk-upload", {
        method: "POST",
        body: formData,
      });

      setUploadResult(result);
      if (result.success_count > 0) {
        toast.success(`Successfully processed ${result.success_count} users.`);
      }
      if (result.failed_count > 0) {
        toast.error(`Failed to upload ${result.failed_count} users. Check validation report.`);
      }
      // Refresh list
      fetchUsersList(debouncedSearch);
    } catch (err: any) {
      toast.error("Upload failed: " + (err.message || "Server error"));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <PageHeader
        title="User Management"
        subtitle="Manage professional users, onboard new members, or handle bulk rosters."
        action={
          activeTab === "roster" ? (
            <div className="flex gap-2.5">
              <Button variant="outline" onClick={() => { setUploadResult(null); setSelectedFile(null); setIsBulkOpen(true); }}>
                <Upload className="h-4 w-4 mr-1.5" /> Bulk upload
              </Button>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" /> Create user
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Tab Navigation */}
      <div className="flex border-b border-border/80 mb-6 mt-4">
        <button
          onClick={() => setActiveTab("roster")}
          className={`pb-3 px-6 text-sm font-bold uppercase tracking-wider text-center border-b-2 transition-all ${
            activeTab === "roster"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Users Roster
        </button>
        <button
          onClick={() => setActiveTab("policy")}
          className={`pb-3 px-6 text-sm font-bold uppercase tracking-wider text-center border-b-2 transition-all ${
            activeTab === "policy"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Employee Access Policy
        </button>
      </div>

      {activeTab === "roster" && (
        <Card className="p-0 border border-border shadow-card overflow-hidden">
          {/* Search Header Container */}
          <div className="border-b border-border p-4 bg-card/40">
            <div className="relative max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name, email, company, role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition"
              />
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            {isLoading && users.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                <span>Fetching users from system database...</span>
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                <Search className="h-8 w-8 text-muted-foreground/60 mb-2" />
                <span className="font-medium text-foreground">No users found</span>
                <p className="text-xs max-w-xs mt-1">Try refining your search keyword or create a new user profile above.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground bg-secondary/20 border-b border-border">
                    <th className="px-6 py-3.5 font-semibold">User details</th>
                    <th className="px-6 py-3.5 font-semibold">Company / Tenant</th>
                    <th className="px-6 py-3.5 font-semibold">Department</th>
                    <th className="px-6 py-3.5 font-semibold">Designation</th>
                    <th className="px-6 py-3.5 font-semibold">Status</th>
                    <th className="px-6 py-3.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {users.map((u) => (
                    <tr key={u.id} className="transition-colors hover:bg-secondary/40">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-sm font-semibold text-primary select-none uppercase">
                            {u.full_name[0]}
                          </div>
                          <div>
                            <span className="font-semibold text-foreground block">{u.full_name}</span>
                            <span className="text-[11px] text-muted-foreground font-mono font-medium block">
                              {u.email} • <span className="capitalize">{u.role === "user" ? "User (Tenant Client)" : u.role === "owner" ? "Owner (Tenant Admin)" : u.role === "employee" ? "Employee (Tenant Worker)" : u.role}</span>
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-foreground">
                        {u.company_name || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{u.department || "N/A"}</td>
                      <td className="px-6 py-4 text-muted-foreground">{u.designation || "N/A"}</td>
                      <td className="px-6 py-4">
                        <Badge tone={u.is_active ? "success" : "neutral"}>
                          {u.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedUserToManage(u);
                            setNewFullName(u.full_name);
                            setNewEmail(u.email);
                            setNewCompanyName(u.company_name || "");
                            setNewDepartment(u.department || "");
                            setNewDesignation(u.designation || "");
                            setNewRole(u.role);
                            setNewSelectedOrganizationId(u.organization_id ? String(u.organization_id) : "");
                          }}
                          className="text-sm font-semibold text-primary hover:underline transition"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      )}

      {activeTab === "policy" && (
        <Card className="p-6 border border-border shadow-card bg-card">
          <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Global Employee Access Policies
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Configure module-level access and tool visibility restrictions for all employee accounts.
              </p>
            </div>
            <Button onClick={handleSavePolicy} disabled={policySaving || policyLoading} className="flex items-center gap-2">
              {policySaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {policySaving ? "Saving..." : "Save Policies"}
            </Button>
          </div>

          {policyLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
              <span>Fetching policy configuration...</span>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in duration-200">
              {/* Section 1: Core Portal Modules */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-primary/10 pb-1">
                  Core Portal Modules
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    { key: "dashboard", label: "Overview Dashboard", icon: LayoutDashboard, desc: "Primary performance KPIs and system overview summary" },
                    { key: "content_library", label: "Content Library", icon: Library, desc: "Shared catalog of resource documents and media uploads" },
                    { key: "masterclasses", label: "Masterclasses", icon: GraduationCap, desc: "Access to webinars, registrations, and watch histories" },
                    { key: "meetings", label: "Meetings Booking", icon: CalendarClock, desc: "Schedule syncs and book video-conferencing slots" },
                    { key: "feedback", label: "Feedback Form", icon: MessageSquare, desc: "Submit critiques and feature requests to the system admins" }
                  ].map((mod) => (
                    <div key={mod.key} className="flex items-start justify-between p-4 bg-secondary/20 rounded-xl border border-border/60 hover:border-primary/20 transition-all duration-200">
                      <div className="flex gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary shrink-0">
                          <mod.icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-foreground block">{mod.label}</span>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-normal">{mod.desc}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleTogglePolicy(mod.key)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          policySettings[mod.key] ? "bg-primary" : "bg-muted"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-card shadow ring-0 transition duration-200 ease-in-out ${
                            policySettings[mod.key] ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 2: Global Tool & Calculator Permissions */}
              <div className="space-y-4 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-primary/10 pb-1">
                  Global Tool & Calculator Permissions
                </h4>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    { key: "wow_toolkit", label: "WOW Financial Freedom Toolkit", icon: Coins, desc: "Gated access to the WOW Financial Freedom Toolkit and all calculators/sub-modules" },
                    { key: "financial_discovery", label: "Financial Discovery", icon: FileSpreadsheet, desc: "Gated access to the Financial Discovery / Comprehensive Financial Planning page" },
                    { key: "needs_discovery", label: "Needs Discovery", icon: Compass, desc: "Gated access to the Needs Discovery / Client Risk Profiling page" },
                    { key: "resource_downloads", label: "Resource Downloads", icon: Download, desc: "Gated access to Excel spreadsheet calculators & downloadable tools" },
                    { key: "future_tools", label: "Future Tools", icon: Activity, desc: "Gated access to future development modules and tools" }
                  ].map((tool) => (
                    <div key={tool.key} className="flex items-start justify-between p-4 bg-secondary/15 rounded-xl border border-border/50 hover:border-primary/20 transition-all duration-200">
                      <div className="flex gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary shrink-0">
                          <tool.icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 pr-2">
                          <span className="text-xs font-bold text-foreground block">{tool.label}</span>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-normal">{tool.desc}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleTogglePolicy(tool.key)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          policySettings[tool.key] ? "bg-primary" : "bg-muted"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-card shadow ring-0 transition duration-200 ease-in-out ${
                            policySettings[tool.key] ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* CREATE USER MODAL OVERLAY */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200 overflow-y-auto">
          <div className="app-surface-panel relative z-10 w-[92vw] sm:w-full sm:max-w-lg my-auto flex flex-col max-h-[92vh] sm:max-h-[85vh] rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-large animate-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-4 mb-5 flex-shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Create User</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Register a brand new professional user and assign their credentials.</p>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition z-10">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="space-y-5 flex-1 overflow-y-auto pr-1">
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-primary/10 pb-1">Personal Details</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="modal-full-name" className="text-xs font-medium text-muted-foreground">Full Name</label>
                    <input
                      id="modal-full-name"
                      type="text"
                      required
                      placeholder="e.g. Akhila Reddy"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background py-2 px-3 text-sm outline-none focus:border-primary transition"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="modal-email" className="text-xs font-medium text-muted-foreground">Email Address</label>
                    <input
                      id="modal-email"
                      type="email"
                      required
                      placeholder="e.g. akhila@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background py-2 px-3 text-sm outline-none focus:border-primary transition"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-primary/10 pb-1">Work Profile</h4>
                
                <div className="space-y-3">
                  {role === "employee" ? (
                    <div className="space-y-1.5">
                      <label htmlFor="modal-company-select" className="text-xs font-medium text-muted-foreground font-semibold">Select Company</label>
                      <select
                        id="modal-company-select"
                        required
                        value={selectedOrganizationId}
                        onChange={(e) => setSelectedOrganizationId(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background py-2 px-3 text-sm outline-none focus:border-primary transition cursor-pointer text-foreground font-medium"
                      >
                        <option value="">-- Choose Company --</option>
                        {organizations.map((org) => (
                          <option key={org.id} value={String(org.id)}>{org.organization_name}</option>
                        ))}
                      </select>
                      {selectedOrganizationId && !users.some(u => String(u.organization_id) === selectedOrganizationId && (u.role === "owner" || u.role === "user") && u.is_active) && (
                        <p className="text-xs text-destructive font-semibold mt-1">
                          ⚠️ Please create an Owner account first.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <label htmlFor="modal-company-name" className="text-xs font-medium text-muted-foreground">Company Name</label>
                      <input
                        id="modal-company-name"
                        type="text"
                        required
                        placeholder="e.g. Ayusha Nilayam"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background py-2 px-3 text-sm outline-none focus:border-primary transition"
                      />
                    </div>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label htmlFor="modal-dept" className="text-xs font-medium text-muted-foreground">Department</label>
                      <input
                        id="modal-dept"
                        type="text"
                        required
                        placeholder="e.g. Technology"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background py-2 px-3 text-sm outline-none focus:border-primary transition"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="modal-desig" className="text-xs font-medium text-muted-foreground">Designation</label>
                      <input
                        id="modal-desig"
                        type="text"
                        required
                        placeholder="e.g. Principal Consultant"
                        value={designation}
                        onChange={(e) => setDesignation(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background py-2 px-3 text-sm outline-none focus:border-primary transition"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="modal-role" className="text-xs font-medium text-muted-foreground">Role</label>
                    <select
                      id="modal-role"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background py-2.5 px-3 text-sm outline-none focus:border-primary transition"
                    >
                      <option value="owner">Owner (Tenant Admin)</option>
                      <option value="employee">Employee (Tenant Worker)</option>
                    </select>
                  </div>
                </div>
              </div>

              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-border mt-6 flex-shrink-0">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Save User"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK UPLOAD MODAL OVERLAY */}
      {isBulkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200 overflow-y-auto">
          <div className="app-surface-panel relative z-10 w-[92vw] sm:w-full sm:max-w-2xl my-auto flex flex-col max-h-[92vh] sm:max-h-[85vh] rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-large animate-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-4 mb-5 flex-shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Bulk Upload Users</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Upload a CSV or XLSX workbook to register multiple users instantly.</p>
              </div>
              <button onClick={() => setIsBulkOpen(false)} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition z-10">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-6 flex-1 overflow-y-auto pr-1">
              {/* Template Download Section */}
              <div className="rounded-xl border border-primary-soft bg-primary-soft/10 p-4 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <span className="text-sm font-semibold text-primary">Need a template?</span>
                  <p className="text-xs text-muted-foreground leading-normal">
                    Download our verified Excel template featuring columns `Name`, `Email`, `Company Name`, `Department`, and `Designation`.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleTemplateDownload} className="shrink-0 bg-background text-primary border-primary/20 hover:bg-primary-soft/20">
                  <Download className="h-4 w-4 mr-1.5" /> Download Template
                </Button>
              </div>

              {/* Upload Form */}
              <form onSubmit={handleBulkUploadSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Select CSV or Excel file</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept=".csv, .xlsx, .xls"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-soft file:text-primary hover:file:bg-primary-soft/80 file:cursor-pointer"
                    />
                  </div>
                  {selectedFile && (
                    <p className="text-xs text-green-600 font-semibold mt-1">
                      Ready to upload: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-2.5 pt-4 border-t border-border">
                  <Button type="button" variant="outline" onClick={() => setIsBulkOpen(false)} disabled={isUploading}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isUploading || !selectedFile}>
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        Uploading & Processing...
                      </>
                    ) : (
                      "Start Upload"
                    )}
                  </Button>
                </div>
              </form>

              {/* Bulk Results Summary */}
              {uploadResult && (
                <div className="rounded-xl border border-border bg-secondary/20 p-5 space-y-4 max-h-[300px] overflow-y-auto animate-in slide-in-from-bottom-3 duration-250">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    Processing Summary
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-background rounded-lg border border-border p-3 flex items-center gap-2.5">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <div>
                        <span className="text-xs text-muted-foreground">Successful Accounts</span>
                        <p className="text-lg font-bold text-foreground leading-tight">{uploadResult.success_count}</p>
                      </div>
                    </div>
                    
                    <div className="bg-background rounded-lg border border-border p-3 flex items-center gap-2.5">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      <div>
                        <span className="text-xs text-muted-foreground">Failed Rows</span>
                        <p className="text-lg font-bold text-foreground leading-tight">{uploadResult.failed_count}</p>
                      </div>
                    </div>
                  </div>

                  {uploadResult.errors.length > 0 && (
                    <div className="space-y-2.5 pt-1">
                      <span className="text-xs font-semibold text-destructive uppercase tracking-wider">Validation Errors report</span>
                      <ul className="divide-y divide-border border border-border rounded-lg bg-background overflow-hidden text-xs max-h-[150px] overflow-y-auto">
                        {uploadResult.errors.map((err, i) => (
                          <li key={i} className="px-3.5 py-2.5 text-muted-foreground flex items-start gap-2.5">
                            <Badge tone="warning" className="shrink-0 font-mono text-[10px] px-1 py-0.5">Row {err.row}</Badge>
                            <span className="text-destructive font-medium leading-normal">{err.error}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MANAGE USER MODAL OVERLAY */}
      {selectedUserToManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200 overflow-y-auto">
          <div className="app-surface-panel relative z-10 w-[92vw] sm:w-full sm:max-w-lg my-auto flex flex-col max-h-[92vh] sm:max-h-[85vh] rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-large animate-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-4 mb-5 flex-shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Manage User Profile</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Configure platform access and update professional metadata fields.</p>
              </div>
              <button 
                onClick={() => setSelectedUserToManage(null)} 
                className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition z-10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 flex-1 overflow-y-auto pr-1">
              {/* Status Section */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-primary/10 pb-1">Access Status</h4>
                <div className="flex items-center justify-between bg-secondary/30 rounded-xl border border-border p-3.5">
                  <div className="max-w-[65%]">
                    <span className="text-sm font-semibold text-foreground block">
                      {selectedUserToManage.is_active ? "Active" : "Locked/Deactivated"}
                    </span>
                    <span className="text-xs text-muted-foreground leading-snug block mt-0.5">
                      {selectedUserToManage.is_active 
                        ? "User has full platform privileges." 
                        : "Account is deactivated. Login sessions will be denied."
                      }
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(selectedUserToManage)}
                    disabled={isManageSubmitting}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold shadow-sm transition duration-200 select-none border ${
                      selectedUserToManage.is_active
                        ? "bg-destructive/15 text-destructive border-destructive/25 hover:bg-destructive/25"
                        : "bg-primary-soft text-primary border-primary/20 hover:bg-primary/20"
                    }`}
                  >
                    <Power className="h-4 w-4" />
                    {selectedUserToManage.is_active ? "Lock Account" : "Activate Account"}
                  </button>
                </div>
              </div>

              {/* Edit Details Form */}
              <form onSubmit={handleUpdateDetails} className="space-y-3.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-primary/10 pb-1">Edit profile</h4>
                
                <div className="space-y-3 bg-secondary/10 p-3.5 rounded-xl border border-border/40">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label htmlFor="edit-name" className="text-xs font-medium text-muted-foreground">Full Name</label>
                      <input
                        id="edit-name"
                        type="text"
                        className="w-full rounded-lg border border-border bg-background py-2 px-3 text-sm text-foreground outline-none focus:border-primary transition"
                        value={newFullName}
                        onChange={(e) => setNewFullName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="edit-email" className="text-xs font-medium text-muted-foreground">Email</label>
                      <input
                        id="edit-email"
                        type="email"
                        className="w-full rounded-lg border border-border bg-background py-2 px-3 text-sm text-foreground outline-none focus:border-primary transition font-mono"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {newRole === "employee" ? (
                    <div className="space-y-1.5 mt-3">
                      <label htmlFor="edit-company-select" className="text-xs font-medium text-muted-foreground font-semibold">Select Company</label>
                      <select
                        id="edit-company-select"
                        required
                        value={newSelectedOrganizationId}
                        onChange={(e) => setNewSelectedOrganizationId(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background py-2 px-3 text-sm outline-none focus:border-primary transition cursor-pointer text-foreground font-medium"
                      >
                        <option value="">-- Choose Company --</option>
                        {organizations.map((org) => (
                          <option key={org.id} value={String(org.id)}>{org.organization_name}</option>
                        ))}
                      </select>
                      {newSelectedOrganizationId && !users.some(u => String(u.organization_id) === newSelectedOrganizationId && (u.role === "owner" || u.role === "user") && u.is_active) && (
                        <p className="text-xs text-destructive font-semibold mt-1">
                          ⚠️ Please create an Owner account first.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1.5 mt-3">
                      <label htmlFor="edit-company" className="text-xs font-medium text-muted-foreground font-semibold">Company Name</label>
                      <input
                        id="edit-company"
                        type="text"
                        className="w-full rounded-lg border border-border bg-background py-2 px-3 text-sm text-foreground outline-none focus:border-primary transition"
                        value={newCompanyName}
                        onChange={(e) => setNewCompanyName(e.target.value)}
                        required
                      />
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label htmlFor="edit-dept" className="text-xs font-medium text-muted-foreground">Department</label>
                      <input
                        id="edit-dept"
                        type="text"
                        className="w-full rounded-lg border border-border bg-background py-2 px-3 text-sm text-foreground outline-none focus:border-primary transition"
                        value={newDepartment}
                        onChange={(e) => setNewDepartment(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="edit-desig" className="text-xs font-medium text-muted-foreground">Designation</label>
                      <input
                        id="edit-desig"
                        type="text"
                        className="w-full rounded-lg border border-border bg-background py-2 px-3 text-sm text-foreground outline-none focus:border-primary transition"
                        value={newDesignation}
                        onChange={(e) => setNewDesignation(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 mt-3">
                    <label htmlFor="edit-role" className="text-xs font-medium text-muted-foreground">Role</label>
                    <select
                      id="edit-role"
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background py-2.5 px-3 text-sm outline-none focus:border-primary transition"
                    >
                      {newRole === "user" && <option value="user">User (Tenant Client)</option>}
                      <option value="owner">Owner (Tenant Admin)</option>
                      <option value="employee">Employee (Tenant Worker)</option>
                    </select>
                  </div>

                  <div className="flex justify-end pt-3">
                    <Button 
                      type="submit" 
                      className="text-xs font-semibold px-5 h-9"
                      disabled={isManageSubmitting}
                    >
                      {isManageSubmitting && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                      Save Changes
                    </Button>
                  </div>
                </div>
              </form>

              {/* Danger Zone */}
              <div className="space-y-2 pt-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-destructive border-b border-destructive/10 pb-1">Danger Zone</h4>
                <div className="flex items-center justify-between border border-destructive/20 bg-destructive/5 rounded-xl p-3.5">
                  <div className="max-w-[70%]">
                    <span className="text-sm font-semibold text-destructive block">Delete User</span>
                    <span className="text-xs text-muted-foreground mt-0.5 block leading-normal">
                      Permanently delete this user's profile and credentials.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDeleteConfirmOpen(true)}
                    disabled={isManageSubmitting}
                    className="flex items-center gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/95 transition px-3.5 py-2 rounded-lg text-xs font-semibold shadow-sm border border-destructive/20"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete User
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL OVERLAY */}
      {isDeleteConfirmOpen && selectedUserToManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200 overflow-y-auto">
          <div className="app-surface-panel relative z-10 w-[92vw] sm:w-full sm:max-w-md my-auto flex flex-col max-h-[92vh] sm:max-h-[85vh] rounded-2xl border border-destructive/30 bg-card p-5 sm:p-6 shadow-large animate-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex items-center gap-3 border-b border-border pb-4 mb-4 flex-shrink-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Delete User</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Are you sure you want to delete this user profile?</p>
              </div>
            </div>

            {/* Warning Message */}
            <div className="space-y-4 text-sm flex-1 overflow-y-auto pr-1">
              <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 text-muted-foreground leading-relaxed">
                <p className="font-semibold text-destructive mb-2 text-xs uppercase tracking-wider">This will permanently remove:</p>
                <ul className="list-disc pl-4 space-y-1.5 text-xs text-foreground font-medium">
                  <li>User profile <span className="font-semibold text-foreground font-mono">({selectedUserToManage.full_name})</span></li>
                  <li>Email credential <span className="font-semibold text-foreground font-mono">({selectedUserToManage.email})</span></li>
                  <li>All associated data and login history</li>
                </ul>
                <p className="mt-3 text-[11px] text-destructive/90 font-medium">⚠️ This action cannot be undone.</p>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground rounded-lg border border-border transition"
                  disabled={isManageSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteUser(selectedUserToManage.id)}
                  className="flex items-center gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/95 transition px-4 py-2 rounded-lg text-xs font-semibold shadow-sm border border-destructive/20"
                  disabled={isManageSubmitting}
                >
                  {isManageSubmitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  Delete User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
