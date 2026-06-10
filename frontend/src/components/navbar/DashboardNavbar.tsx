import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Bell, Search, LogOut, User, ShieldAlert, Key, X, Loader2, Eye, EyeOff } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/services/api";
import { toast } from "sonner";
import { Card, Button } from "@/components/common";

interface DashboardNavbarProps {
  roleLabel: string;
  userName: string;
}

export function DashboardNavbar({ roleLabel, userName }: DashboardNavbarProps) {
  const { user, logout } = useAuth();
  console.log("DashboardNavbar user:", user);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Notifications state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);
  const notifDropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const data = await apiFetch<any[]>("/api/notifications");
      setNotifications(data);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // 30s polling
    return () => clearInterval(interval);
  }, []);

  // Password form states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState("");

  // Show/Hide password toggle states
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target as Node)) {
        setIsNotifDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Reset password states when modal opens/closes
  useEffect(() => {
    if (!isPasswordModalOpen) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setValidationError("");
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
    }
  }, [isPasswordModalOpen]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleMarkAsRead = async (id: number) => {
    try {
      await apiFetch("/api/notifications/read", {
        method: "POST",
        body: JSON.stringify({ notification_ids: [id] })
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiFetch("/api/notifications/read-all", {
        method: "POST"
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  // Determine role-based profile path
  let profilePath = "/user/profile";
  if (user?.role === "admin") {
    profilePath = "/admin/profile";
  }

  // Handle password submission
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setValidationError("");

    const currentClean = currentPassword.trim();
    const newClean = newPassword.trim();
    const confirmClean = confirmPassword.trim();

    // Validations
    if (!currentClean || !newClean || !confirmClean) {
      setValidationError("All password fields must be filled.");
      return;
    }
    if (newClean.length < 6) {
      setValidationError("New password must be at least 6 characters long.");
      return;
    }
    if (newClean !== confirmClean) {
      setValidationError("New password and confirm password do not match.");
      return;
    }
    if (currentClean === newClean) {
      setValidationError("New password cannot be the same as your current password.");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiFetch("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          current_password: currentClean,
          new_password: newClean,
          confirm_password: confirmClean,
        }),
      });

      toast.success("Password changed successfully! Please use your new password for all future logins.");
      setIsPasswordModalOpen(false);
    } catch (err: any) {
      setValidationError(err.message || "Failed to change password. Please check your current password.");
      toast.error(err.message || "Failed to update password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const initials = userName
    ? userName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  // Build password modal content to portal into document.body
  const passwordModalContent = isPasswordModalOpen && (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
      onClick={() => setIsPasswordModalOpen(false)}
    >
      <div 
        className="w-full max-w-md my-auto relative z-[10000]"
        onClick={(e) => e.stopPropagation()} // Prevent closing modal when clicking inside form
      >
        <Card className="w-full shadow-2xl border border-border bg-card p-6 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-border pb-3.5 mb-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-primary" />
              <h3 className="text-base font-bold text-foreground">Secure Change Password</h3>
            </div>
            <button
              type="button"
              onClick={() => setIsPasswordModalOpen(false)}
              className="text-muted-foreground hover:text-foreground transition p-1 hover:bg-secondary rounded-lg"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            {validationError && (
              <div className="p-3 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg animate-shake">
                ⚠️ {validationError}
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Current Password *</label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  required
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full pl-3 pr-10 py-2 text-sm rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition p-0.5"
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">New Password *</label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  required
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-3 pr-10 py-2 text-sm rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition p-0.5"
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Confirm New Password *</label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  required
                  placeholder="Verify new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-3 pr-10 py-2 text-sm rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition p-0.5"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border pt-4 mt-6">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => setIsPasswordModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary text-primary-foreground flex items-center gap-1.5 hover:bg-primary/95 transition"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Updating...
                  </>
                ) : (
                  "Change Password"
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );

  return (
    <header className="app-surface-nav sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/80 px-6 py-3 backdrop-blur">
      <div className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search..."
          className="w-full rounded-full border border-border bg-card py-2 pl-10 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
      </div>

      <div className="ml-4 flex items-center gap-2">
        {/* Notifications Dropdown */}
        <div className="relative" ref={notifDropdownRef}>
          <button
            onClick={() => setIsNotifDropdownOpen(!isNotifDropdownOpen)}
            type="button"
            className="relative rounded-full p-2 text-muted-foreground hover:bg-secondary transition-colors"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {isNotifDropdownOpen && (
            <div className="absolute right-0 mt-3 w-80 rounded-xl border border-border bg-card shadow-xl ring-1 ring-black/5 animate-in fade-in slide-in-from-top-1.5 duration-100 py-1.5 z-30">
              <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-secondary/20">
                <span className="text-xs font-bold text-foreground">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-[10px] font-bold text-primary hover:underline"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-border/60">
                {notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                    No new notifications.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`px-4 py-2.5 hover:bg-secondary/40 transition-colors flex gap-2.5 items-start ${!n.is_read ? 'bg-primary/5' : ''}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className={`text-xs truncate ${!n.is_read ? 'font-bold text-foreground' : 'font-medium text-muted-foreground'}`}>
                            {n.title}
                          </p>
                          {!n.is_read && (
                            <span className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-normal mt-0.5 whitespace-pre-wrap break-words">
                          {n.message}
                        </p>
                        <p className="text-[9px] text-muted-foreground/85 mt-1 font-medium">
                          {new Date(n.created_at).toLocaleDateString("en-IN", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </p>
                      </div>
                      {!n.is_read && (
                        <button
                          onClick={() => handleMarkAsRead(n.id)}
                          className="text-[9px] font-bold text-primary hover:underline self-center flex-shrink-0"
                        >
                          Read
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown Section */}
        <div className="relative ml-2 border-l border-border pl-4" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 text-left hover:opacity-90 focus:outline-none transition group select-none"
          >
            <div className="hidden lg:block text-right">
              <p className="text-sm font-bold text-foreground group-hover:text-primary transition leading-tight mb-0.5">{userName}</p>
              <p className="text-[10px] text-muted-foreground font-semibold leading-none">
                Organization: <span className="text-primary font-bold">{user?.organization_name || "EduStream"}</span>
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary transition shadow-sm border border-primary/15 uppercase font-bold">
              {initials}
            </div>
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-3 w-64 rounded-xl border border-border bg-card shadow-xl ring-1 ring-black/5 animate-in fade-in slide-in-from-top-1.5 duration-100 py-1.5 z-30">
              {/* Dropdown Header Info */}
              <div className="px-4.5 py-3 border-b border-border">
                <p className="text-sm font-bold text-foreground truncate">{userName}</p>
                <p className="text-[11px] font-medium text-muted-foreground font-mono truncate mt-0.5">{user?.email}</p>
                {user?.organization_name && (
                  <p className="text-[11px] font-semibold text-primary mt-1 truncate">
                    🏢 {user.organization_name}
                  </p>
                )}
                <div className="mt-2.5">
                  <span className="inline-flex items-center rounded-md bg-primary-soft px-2 py-0.5 text-2xs font-semibold text-primary uppercase">
                    {user?.role ? user.role.toUpperCase() : roleLabel.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Options */}
              <div className="p-1 space-y-0.5">
                <Link
                  to={profilePath}
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center gap-2.5 w-full text-left px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-secondary rounded-lg transition"
                >
                  <User className="h-3.8 w-3.8 text-muted-foreground" />
                  View Profile
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    setIsPasswordModalOpen(true);
                  }}
                  className="flex items-center gap-2.5 w-full text-left px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-secondary rounded-lg transition"
                >
                  <Key className="h-3.8 w-3.8 text-muted-foreground" />
                  Change Password
                </button>

                <hr className="border-border my-1 mx-2" />

                <button
                  type="button"
                  onClick={logout}
                  className="flex items-center gap-2.5 w-full text-left px-3.5 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <LogOut className="h-3.8 w-3.8" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Render the Change Password Dialog in viewport body to break free of nested parents */}
      {typeof window !== "undefined" && createPortal(passwordModalContent, document.body)}
    </header>
  );
}
