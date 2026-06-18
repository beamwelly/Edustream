import { useState, useEffect } from "react";
import { 
  Calendar, 
  Play, 
  Video, 
  Plus, 
  X, 
  Loader2, 
  Clock, 
  Edit2, 
  Trash2, 
  ExternalLink,
  Upload,
  User,
  Tags,
  Users,
  Eye,
  Settings,
  AlertTriangle,
  BookOpen
} from "lucide-react";
import { PageHeader, Card, Button, Badge } from "@/components/common";
import { API_URL } from "@/constants/env";
import { toast } from "sonner";
import { APP_PLACEHOLDER } from "@/constants/branding";

interface Masterclass {
  masterclass_id: number;
  title: string;
  description?: string;
  speaker?: string;
  scheduled_at: string;
  duration_minutes: number;
  zoom_webinar_id?: string;
  zoom_join_url?: string;
  zoom_start_url?: string;
  status: string;
  recording_filename?: string;
  recording_url?: string;
  thumbnail_url?: string;
  category?: string;
  tags?: string;
  learning_outcomes?: string;
  max_attendees?: number;
  visibility: string;
  created_at: string;
}

import { useAuth } from "@/context/AuthContext";
import { ResponsivePageWrapper } from "@/components/layout/ResponsivePageWrapper";
import { ResponsiveModal } from "@/components/layout/ResponsiveModal";


interface Registration {
  user_id: number;
  full_name: string;
  email: string;
}

export function MasterclassesPage() {
  const { searchQuery } = useAuth();
  const [masterclasses, setMasterclasses] = useState<Masterclass[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  
  // Editing state
  const [editingMasterclass, setEditingMasterclass] = useState<Masterclass | null>(null);

  // Form States
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState("60");
  const [category, setCategory] = useState("Professional Development");
  const [tags, setTags] = useState("");
  const [learningOutcomes, setLearningOutcomes] = useState("");
  const [maxAttendees, setMaxAttendees] = useState("100");
  const [visibility, setVisibility] = useState("public");
  const [sendNotification, setSendNotification] = useState(true);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  // Modal states
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [registrationsModalMc, setRegistrationsModalMc] = useState<Masterclass | null>(null);
  const [registrationsList, setRegistrationsList] = useState<Registration[]>([]);
  const [regsLoading, setRegsLoading] = useState(false);

  // Cancellation states
  const [cancellingMc, setCancellingMc] = useState<Masterclass | null>(null);
  const [cancellationMessage, setCancellationMessage] = useState("");
  const [nowTime, setNowTime] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<"upcoming" | "live" | "completed" | "recordings">("upcoming");

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchMasterclasses = async () => {
    try {
      const res = await fetch(`${API_URL}/api/masterclasses`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setMasterclasses(data);
      } else {
        toast.error("Failed to load webinars.");
      }
    } catch (err) {
      console.error("Error loading masterclasses:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  };

  useEffect(() => {
    fetchMasterclasses();
  }, []);

  const formatForInput = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const tzOffset = date.getTimezoneOffset() * 60000;
      return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
    } catch {
      return "";
    }
  };

  const handleStartEdit = (mc: Masterclass) => {
    setEditingMasterclass(mc);
    setTitle(mc.title);
    setDescription(mc.description || "");
    setSpeaker(mc.speaker || "");
    setScheduledAt(formatForInput(mc.scheduled_at));
    setDuration(String(mc.duration_minutes));
    setCategory(mc.category || "Professional Development");
    setTags(mc.tags || "");
    setLearningOutcomes(mc.learning_outcomes || "");
    setMaxAttendees(String(mc.max_attendees || 100));
    setVisibility(mc.visibility);
    setSendNotification(false); // Default to false when editing
    setThumbnailFile(null);
    setThumbnailPreview(mc.thumbnail_url || null);
  };

  const handleCancelEdit = () => {
    setEditingMasterclass(null);
    setTitle("");
    setDescription("");
    setSpeaker("");
    setScheduledAt("");
    setDuration("60");
    setCategory("Professional Development");
    setTags("");
    setLearningOutcomes("");
    setMaxAttendees("100");
    setVisibility("public");
    setSendNotification(true);
    setThumbnailFile(null);
    setThumbnailPreview(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !scheduledAt || !duration) {
      toast.warning("Please fill in all required fields.");
      return;
    }

    setFormLoading(true);

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("speaker", speaker);
      formData.append("scheduled_at", new Date(scheduledAt).toISOString());
      formData.append("duration_minutes", duration);
      formData.append("category", category);
      formData.append("tags", tags);
      formData.append("learning_outcomes", learningOutcomes);
      formData.append("max_attendees", maxAttendees);
      formData.append("visibility", visibility);
      formData.append("send_notification", String(sendNotification));
      
      if (thumbnailFile) {
        formData.append("thumbnail", thumbnailFile);
      }

      let url = `${API_URL}/api/masterclasses`;
      let method = "POST";

      if (editingMasterclass) {
        url = `${API_URL}/api/masterclasses/${editingMasterclass.masterclass_id}`;
        method = "PUT";
      }

      const res = await fetch(url, {
        method: method,
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
          // Let the browser set multipart boundary
        },
        body: formData
      });

      if (res.ok) {
        toast.success(
          editingMasterclass 
            ? "Masterclass updated successfully!" 
            : "Masterclass scheduled successfully!"
        );
        handleCancelEdit();
        fetchMasterclasses();
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.detail || "Request failed. Verify Zoom connection settings.");
      }
    } catch (err) {
      toast.error("Network error processing request.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleOpenRegistrations = async (mc: Masterclass) => {
    setRegistrationsModalMc(mc);
    setRegistrationsList([]);
    setRegsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/masterclasses/${mc.masterclass_id}/registrations`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setRegistrationsList(data);
      }
    } catch (err) {
      console.error("Failed to load registrations", err);
    } finally {
      setRegsLoading(false);
    }
  };

  const confirmCancelMasterclass = async () => {
    if (!cancellingMc) return;
    try {
      const query = cancellationMessage 
        ? `?cancellation_message=${encodeURIComponent(cancellationMessage)}` 
        : "";
      const res = await fetch(`${API_URL}/api/masterclasses/${cancellingMc.masterclass_id}${query}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
        }
      });

      if (res.ok) {
        toast.success("Webinar cancelled. Cancellation notifications sent in the background.");
        setCancellingMc(null);
        setCancellationMessage("");
        fetchMasterclasses();
      } else {
        toast.error("Failed to cancel masterclass.");
      }
    } catch (err) {
      toast.error("Network error cancelling masterclass.");
    }
  };

  const handleStartWebinar = async (masterclassId: number) => {
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${API_URL}/api/masterclasses/${masterclassId}/start`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        window.open(data.start_url, "_blank");
        toast.success("Webinar session opened!");
        fetchMasterclasses();
      } else {
        const err = await res.json();
        toast.error(err.detail || "Failed to start webinar.");
      }
    } catch (e) {
      toast.error("Error starting webinar.");
    }
  };

  const handleEndWebinar = async (masterclassId: number) => {
    if (!confirm("Are you sure you want to end this webinar session?")) return;
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${API_URL}/api/masterclasses/${masterclassId}/end`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success("Webinar ended successfully.");
        fetchMasterclasses();
      } else {
        const err = await res.json();
        toast.error(err.detail || "Failed to end webinar.");
      }
    } catch (e) {
      toast.error("Error ending webinar.");
    }
  };

  const handleRepublishRecording = async (masterclassId: number) => {
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${API_URL}/api/masterclasses/${masterclassId}/republish`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success("Recording synced and republished successfully.");
        fetchMasterclasses();
      } else {
        const err = await res.json();
        toast.error(err.detail || "Failed to sync recording from Zoom.");
      }
    } catch (e) {
      toast.error("Error republishing recording.");
    }
  };

  const handleDuplicate = (mc: Masterclass) => {
    setTitle(mc.title || "");
    setDescription(mc.description || "");
    setSpeaker(mc.speaker || "");
    setCategory(mc.category || "Professional Development");
    setTags(mc.tags || "");
    setLearningOutcomes(mc.learning_outcomes || "");
    setMaxAttendees(mc.max_attendees ? String(mc.max_attendees) : "100");
    setVisibility(mc.visibility || "public");
    setThumbnailPreview(mc.thumbnail_url || null);
    setThumbnailFile(null);
    setScheduledAt(""); // Allow user to choose a new time
    setEditingMasterclass(null); // Create mode
    toast.success("Webinar details duplicated! Select a scheduled time to save.");
  };

  const handleToggleHideRecording = async (mc: Masterclass) => {
    const action = mc.visibility === "hidden" ? "unhide" : "hide";
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${API_URL}/api/masterclasses/${mc.masterclass_id}/${action}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success(`Recording visibility updated successfully.`);
        fetchMasterclasses();
      } else {
        const err = await res.json();
        toast.error(err.detail || "Failed to update visibility.");
      }
    } catch (e) {
      toast.error("Error updating visibility.");
    }
  };

  const handleUnpublishRecording = async (masterclassId: number) => {
    if (!confirm("Are you sure you want to unpublish this recording? It will return to the completed state and be removed from the user portal.")) return;
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${API_URL}/api/masterclasses/${masterclassId}/unpublish`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success("Recording unpublished successfully.");
        fetchMasterclasses();
      } else {
        const err = await res.json();
        toast.error(err.detail || "Failed to unpublish recording.");
      }
    } catch (e) {
      toast.error("Error unpublishing recording.");
    }
  };

  const handlePublishRecording = async (masterclassId: number) => {
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${API_URL}/api/masterclasses/${masterclassId}/publish`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success("Recording published successfully.");
        fetchMasterclasses();
      } else {
        const err = await res.json();
        toast.error(err.detail || "Failed to publish recording.");
      }
    } catch (e) {
      toast.error("Error publishing recording.");
    }
  };

  const handleDeletePlatformOnly = async (masterclassId: number, promptText: string) => {
    if (!confirm(promptText)) return;
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${API_URL}/api/masterclasses/${masterclassId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success("Platform record removed successfully.");
        fetchMasterclasses();
      } else {
        const err = await res.json();
        toast.error(err.detail || "Failed to delete platform record.");
      }
    } catch (e) {
      toast.error("Error deleting platform record.");
    }
  };

  const filteredMasterclasses = masterclasses.filter(m => 
    m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.description && m.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (m.speaker && m.speaker.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (m.category && m.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (m.tags && m.tags.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const upcomingSessions = filteredMasterclasses.filter((m) => m.status === "upcoming");
  const liveSessions = filteredMasterclasses.filter((m) => m.status === "live");
  const completedSessions = filteredMasterclasses.filter((m) => m.status === "completed");
  const recordedSessions = filteredMasterclasses.filter((m) => m.status === "recorded");

  return (
    <ResponsivePageWrapper>
      <PageHeader
        title="Webinar Management"
        subtitle="Schedule live Zoom Business sessions, edit schedules, and view attendee sign-ups."
      />

      <div className="grid gap-8 lg:grid-cols-3 mt-6">
        {/* Schedule/Edit Form */}
        <div className="lg:col-span-1">
          <Card className="p-6 sticky top-6 border-border/60">
            <h3 className="text-base font-bold text-foreground mb-5 flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" /> 
              {editingMasterclass ? "Edit Masterclass Details" : "Schedule Live Webinar"}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                  Webinar Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Wealth Management Essentials"
                  className="w-full px-3.5 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:border-primary text-xs shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                  Speaker/Host Name
                </label>
                <input
                  type="text"
                  value={speaker}
                  onChange={(e) => setSpeaker(e.target.value)}
                  placeholder="e.g. John Doe (Senior Advisor)"
                  className="w-full px-3.5 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:border-primary text-xs shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide topics covered, webinar format..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:border-primary text-xs shadow-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                    Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full px-3 py-2 bg-card border border-border rounded-xl focus:outline-none focus:border-primary text-xs shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                    Duration (Min) *
                  </label>
                  <input
                    type="number"
                    required
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    min="1"
                    className="w-full px-3 py-2 bg-card border border-border rounded-xl focus:outline-none focus:border-primary text-xs shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-card border border-border rounded-xl focus:outline-none focus:border-primary text-xs shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                    Max Attendees
                  </label>
                  <input
                    type="number"
                    value={maxAttendees}
                    onChange={(e) => setMaxAttendees(e.target.value)}
                    min="1"
                    className="w-full px-3 py-2 bg-card border border-border rounded-xl focus:outline-none focus:border-primary text-xs shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                  Tags (Comma separated)
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="stocks, crypto, mutual funds"
                  className="w-full px-3.5 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:border-primary text-xs shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                  Learning Outcomes
                </label>
                <textarea
                  value={learningOutcomes}
                  onChange={(e) => setLearningOutcomes(e.target.value)}
                  placeholder="What will users gain by attending..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:border-primary text-xs shadow-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                    Visibility
                  </label>
                  <div className="flex flex-col gap-2 mt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
                      <input
                        type="radio"
                        name="mc-visibility"
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
                        name="mc-visibility"
                        value="public"
                        checked={visibility === "public" || visibility === "owner_employee"}
                        onChange={() => setVisibility("public")}
                        className="rounded-full border-border text-primary focus:ring-primary h-4 w-4"
                      />
                      <span>Owners + Employees</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendNotification}
                      onChange={(e) => setSendNotification(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary h-4.5 w-4.5 cursor-pointer"
                    />
                    <span className="text-[11px] font-bold text-muted-foreground uppercase">Send Alert Email</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                  Webinar Cover Photo (Thumbnail)
                </label>
                <div className="flex items-center gap-4">
                  {thumbnailPreview && (
                    <div className="w-16 h-12 rounded-lg overflow-hidden border border-border bg-secondary flex-shrink-0">
                      <img src={thumbnailPreview} alt="Cover" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <label className="flex items-center gap-2 cursor-pointer px-4 py-2.5 rounded-xl border border-dashed border-border bg-secondary/50 hover:bg-secondary/70 text-xs font-bold transition w-full justify-center">
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    <span>Upload Image</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-border/40">
                {editingMasterclass && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEdit}
                    className="flex-1 justify-center rounded-xl font-bold py-3 text-xs"
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 justify-center rounded-xl bg-primary text-white hover:bg-primary/95 font-bold py-3 text-xs shadow-sm"
                >
                  {formLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Processing...
                    </>
                  ) : (
                    editingMasterclass ? "Save Changes" : "Schedule Webinar"
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Classes List */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tab Navigation */}
          <div className="flex border-b border-border/80 mb-4">
            <button
              onClick={() => setActiveTab("upcoming")}
              className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all ${
                activeTab === "upcoming"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Upcoming ({upcomingSessions.length})
            </button>
            <button
              onClick={() => setActiveTab("live")}
              className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "live"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Live ({liveSessions.length})
              {liveSessions.length > 0 && (
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("completed")}
              className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all ${
                activeTab === "completed"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Completed ({completedSessions.length})
            </button>
            <button
              onClick={() => setActiveTab("recordings")}
              className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all ${
                activeTab === "recordings"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Recordings ({recordedSessions.length})
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* UPCOMING TAB */}
              {activeTab === "upcoming" && (
                <section>
                  {upcomingSessions.length === 0 ? (
                    <Card className="text-center py-12 border border-dashed border-border/80">
                      <p className="text-xs text-muted-foreground">No upcoming sessions scheduled yet.</p>
                    </Card>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {upcomingSessions.map((s) => (
                        <Card key={s.masterclass_id} className="flex flex-col justify-between hover:border-primary/20 transition-all group relative overflow-hidden">
                          <div className="w-full h-32 -mx-6 -mt-6 mb-3 overflow-hidden relative bg-zinc-950">
                            <img src={s.thumbnail_url || APP_PLACEHOLDER} alt={s.title} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                          </div>
                          
                          <div>
                            <div className="mb-2 flex items-center justify-between">
                              <div className="flex gap-1.5">
                                <Badge tone="primary">Upcoming</Badge>
                                <Badge tone="neutral">{s.visibility === "owner_only" ? "Owners Only" : "Owners + Employees"}</Badge>
                              </div>
                              <span className="text-[10px] text-muted-foreground font-bold flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" /> {s.duration_minutes} Mins
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-foreground line-clamp-1 pr-16">{s.title}</h4>
                            
                            {s.speaker && (
                              <p className="text-xs text-primary font-semibold mt-1">Host: {s.speaker}</p>
                            )}

                            {s.description && (
                              <p className="mt-2 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                {s.description}
                              </p>
                            )}
                          </div>
                          
                          {/* Floating Action Buttons */}
                          <div className="absolute top-4 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <button 
                              onClick={() => handleStartEdit(s)}
                              className="p-2 rounded-lg bg-card border border-border text-muted-foreground hover:text-primary transition-colors shadow-sm"
                              title="Edit Details"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button 
                              onClick={() => setCancellingMc(s)}
                              className="p-2 rounded-lg bg-card border border-border text-muted-foreground hover:text-red-500 transition-colors shadow-sm"
                              title="Cancel Webinar"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          
                          <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4">
                            <span className="text-[11px] font-bold text-muted-foreground">
                              {formatDate(s.scheduled_at)}
                            </span>
                            
                            <div className="flex gap-1.5">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleOpenRegistrations(s)}
                                className="font-bold text-[10px] px-2.5 flex items-center gap-1"
                              >
                                <Users className="h-3 w-3" /> Signups
                              </Button>

                              {(() => {
                                const scheduledDate = new Date(s.scheduled_at);
                                const isPastTime = nowTime >= scheduledDate;
                                const timeString = scheduledDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
                                
                                if (isPastTime) {
                                  return (
                                    <Button 
                                      size="sm" 
                                      onClick={() => handleStartWebinar(s.masterclass_id)}
                                      className="font-bold text-[10px] px-2.5 bg-primary text-white"
                                    >
                                      Start Webinar
                                    </Button>
                                  );
                                } else {
                                  return (
                                    <Button 
                                      size="sm" 
                                      disabled
                                      className="font-bold text-[10px] px-2.5 bg-muted text-muted-foreground cursor-not-allowed"
                                    >
                                      Starts at {timeString}
                                    </Button>
                                  );
                                }
                              })()}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* LIVE TAB */}
              {activeTab === "live" && (
                <section>
                  {liveSessions.length === 0 ? (
                    <Card className="text-center py-12 border border-dashed border-border/80">
                      <p className="text-xs text-muted-foreground">No sessions are currently live.</p>
                    </Card>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {liveSessions.map((s) => (
                        <Card key={s.masterclass_id} className="flex flex-col justify-between hover:border-primary/20 transition-all group relative overflow-hidden">
                          <div className="w-full h-32 -mx-6 -mt-6 mb-3 overflow-hidden relative bg-zinc-950">
                            <img src={s.thumbnail_url || APP_PLACEHOLDER} alt={s.title} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                          </div>
                          
                          <div>
                            <div className="mb-2 flex items-center justify-between">
                              <div className="flex gap-1.5">
                                <Badge tone="warning">Live</Badge>
                                <Badge tone="neutral">{s.visibility === "owner_only" ? "Owners Only" : "Owners + Employees"}</Badge>
                              </div>
                              <span className="text-[10px] text-muted-foreground font-bold flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" /> {s.duration_minutes} Mins
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-foreground line-clamp-1">{s.title}</h4>
                            
                            {s.speaker && (
                              <p className="text-xs text-primary font-semibold mt-1">Host: {s.speaker}</p>
                            )}

                            {s.description && (
                              <p className="mt-2 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                {s.description}
                              </p>
                            )}
                          </div>
                          
                          <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4">
                            <span className="text-[11px] font-bold text-muted-foreground">
                              {formatDate(s.scheduled_at)}
                            </span>
                            
                            <div className="flex gap-1.5">
                              <Button 
                                size="sm" 
                                onClick={() => handleStartWebinar(s.masterclass_id)}
                                className="font-bold text-[10px] px-2.5 bg-green-600 hover:bg-green-700 text-white"
                              >
                                Enter Webinar
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleEndWebinar(s.masterclass_id)}
                                className="font-bold text-[10px] px-2.5 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                              >
                                End Webinar
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* COMPLETED TAB */}
              {activeTab === "completed" && (
                <section>
                  {completedSessions.length === 0 ? (
                    <Card className="text-center py-12 border border-dashed border-border/80">
                      <p className="text-xs text-muted-foreground">No completed sessions available.</p>
                    </Card>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {completedSessions.map((s) => (
                        <Card key={s.masterclass_id} className="flex flex-col justify-between hover:border-primary/20 transition-all group relative overflow-hidden">
                          <div className="w-full h-32 -mx-6 -mt-6 mb-3 overflow-hidden relative bg-zinc-950">
                            <img src={s.thumbnail_url || APP_PLACEHOLDER} alt={s.title} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                          </div>
                          
                          <div>
                            <div className="mb-2 flex items-center justify-between">
                              <div className="flex gap-1.5">
                                <Badge tone="success">Completed</Badge>
                                <Badge tone="neutral">{s.visibility === "owner_only" ? "Owners Only" : "Owners + Employees"}</Badge>
                              </div>
                              <span className="text-[10px] text-muted-foreground font-bold flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" /> {s.duration_minutes} Mins
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-foreground line-clamp-1">{s.title}</h4>
                            
                            {s.speaker && (
                              <p className="text-xs text-primary font-semibold mt-1">Host: {s.speaker}</p>
                            )}

                            {s.description && (
                              <p className="mt-2 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                {s.description}
                              </p>
                            )}
                          </div>
                          
                          {/* Actions Panel */}
                          <div className="mt-4 pt-4 border-t border-border/60 space-y-2">
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleStartEdit(s)}
                                className="flex-1 font-bold rounded-xl text-[10px]"
                              >
                                Edit details
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleDuplicate(s)}
                                className="flex-1 font-bold rounded-xl text-[10px]"
                              >
                                Duplicate
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleDeletePlatformOnly(s.masterclass_id, "Delete Webinar? This action cannot be undone.\n\nThis will remove the webinar platform record only and will not touch any Zoom cloud assets.")}
                                className="flex-1 font-bold rounded-xl text-[10px] text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                              >
                                Delete
                              </Button>
                            </div>

                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleOpenRegistrations(s)}
                                className="w-1/2 font-bold rounded-xl text-[10px] flex items-center justify-center gap-1"
                              >
                                <Users className="h-3 w-3" /> Signups
                              </Button>

                              {s.recording_url ? (
                                <div className="w-1/2 flex gap-1">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => setActiveVideoUrl(`${API_URL}/api/masterclasses/${s.masterclass_id}/stream`)}
                                    className="flex-1 font-bold rounded-xl text-[10px]"
                                  >
                                    Watch
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    onClick={() => handlePublishRecording(s.masterclass_id)}
                                    className="flex-1 font-bold rounded-xl text-[10px] bg-primary text-white"
                                  >
                                    Publish
                                  </Button>
                                </div>
                              ) : (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleRepublishRecording(s.masterclass_id)}
                                  className="w-1/2 font-bold rounded-xl text-[10px] text-primary hover:bg-primary/5"
                                >
                                  Sync & Publish
                                </Button>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* RECORDINGS TAB */}
              {activeTab === "recordings" && (
                <section>
                  {recordedSessions.length === 0 ? (
                    <Card className="text-center py-12 border border-dashed border-border/80">
                      <p className="text-xs text-muted-foreground">No published recordings available.</p>
                    </Card>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {recordedSessions.map((r) => (
                        <Card key={r.masterclass_id} className="!p-0 overflow-hidden flex flex-col justify-between hover:border-primary/20 transition-all group relative">
                          <div className="relative flex aspect-video items-center justify-center bg-zinc-950">
                            <img src={r.thumbnail_url || APP_PLACEHOLDER} alt={r.title} className="w-full h-full object-cover" />
                            
                            {r.visibility === "hidden" && (
                              <div className="absolute top-3 left-3 bg-red-600/90 text-white font-bold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full z-10 animate-pulse">
                                HIDDEN
                              </div>
                            )}
                            
                            <button 
                              onClick={() => setActiveVideoUrl(`${API_URL}/api/masterclasses/${r.masterclass_id}/stream`)}
                              className="absolute inset-0 flex items-center justify-center bg-black/45"
                            >
                              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white shadow-lg transform scale-95 hover:scale-105 transition duration-200">
                                <Play className="h-4.5 w-4.5 fill-current ml-0.5" />
                              </span>
                            </button>
                          </div>
                          
                          <div className="p-4 flex-grow flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <div className="flex gap-1">
                                  <Badge tone="neutral">{r.category || "General"}</Badge>
                                  {r.visibility === "hidden" && <Badge tone="warning">Hidden</Badge>}
                                </div>
                                <span className="text-[10px] text-muted-foreground font-bold">{r.duration_minutes} Mins</span>
                              </div>
                              <h4 className="line-clamp-1 text-sm font-bold text-foreground">{r.title}</h4>
                              {r.speaker && (
                                <p className="text-xs text-muted-foreground font-semibold">Hosted by {r.speaker}</p>
                              )}
                            </div>
                            
                            <div className="flex flex-col gap-2 mt-4">
                              <div className="flex gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleStartEdit(r)}
                                  className="flex-1 font-bold rounded-xl text-[10px]"
                                >
                                  Edit Metadata
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleToggleHideRecording(r)}
                                  className="flex-1 font-bold rounded-xl text-[10px]"
                                >
                                  {r.visibility === "hidden" ? "Unhide" : "Hide"}
                                </Button>
                              </div>
                              
                              <div className="flex gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleUnpublishRecording(r.masterclass_id)}
                                  className="w-1/2 font-bold rounded-xl text-[10px]"
                                >
                                  Unpublish
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleDeletePlatformOnly(r.masterclass_id, "Delete Recording Entry?\n\nThis will delete the platform recording record only and will NOT delete the Zoom cloud recording.\n\nRequire confirmation.")}
                                  className="w-1/2 font-bold rounded-xl text-[10px] text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                >
                                  Delete Record
                                </Button>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </div>
      </div>

      {/* Reusable Video Streaming Modal */}
      <ResponsiveModal
        isOpen={!!activeVideoUrl}
        onClose={() => setActiveVideoUrl(null)}
        title="Webinar Recording"
        size="lg"
      >
        <div className="aspect-video w-full bg-black rounded-lg overflow-hidden">
          <video
            src={activeVideoUrl || ""}
            controls
            autoPlay
            className="w-full h-full object-contain"
          >
            Your browser does not support the video tag.
          </video>
        </div>
      </ResponsiveModal>

      {/* Reusable Registrations List Modal */}
      <ResponsiveModal
        isOpen={!!registrationsModalMc}
        onClose={() => setRegistrationsModalMc(null)}
        title="Webinar Registrations"
        subtitle={registrationsModalMc?.title || ""}
        footer={
          <Button onClick={() => setRegistrationsModalMc(null)} className="bg-primary text-white font-bold text-xs rounded-xl px-5">
            Close Dialog
          </Button>
        }
      >
        {regsLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : registrationsList.length === 0 ? (
          <div className="flex flex-col justify-center items-center py-12">
            <Users className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No sign-ups found for this session yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {registrationsList.map((user) => (
              <div key={user.user_id} className="flex items-center justify-between p-3 rounded-2xl bg-secondary/50 border border-border/40">
                <div>
                  <h4 className="text-xs font-bold text-foreground">{user.full_name}</h4>
                  <p className="text-[10px] text-muted-foreground">{user.email}</p>
                </div>
                <Badge tone="primary">Participant</Badge>
              </div>
            ))}
          </div>
        )}
      </ResponsiveModal>

      {/* Reusable Cancellation Reason Modal */}
      <ResponsiveModal
        isOpen={!!cancellingMc}
        onClose={() => {
          setCancellingMc(null);
          setCancellationMessage("");
        }}
        title="Cancel Masterclass"
        subtitle="Are you sure you want to cancel this scheduled session?"
        footer={
          <>
            <Button 
              variant="outline" 
              onClick={() => {
                setCancellingMc(null);
                setCancellationMessage("");
              }}
              className="font-bold text-xs rounded-xl"
            >
              Go Back
            </Button>
            <Button 
              onClick={confirmCancelMasterclass} 
              className="bg-red-600 text-white hover:bg-red-700 font-bold text-xs rounded-xl px-5"
            >
              Confirm Cancellation
            </Button>
          </>
        }
      >
        {cancellingMc && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground leading-normal bg-secondary/50 p-3 rounded-2xl border border-border/50">
              Webinar: <span className="font-bold text-foreground">{cancellingMc.title}</span>
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-muted-foreground uppercase">
                Cancellation Reason / Note (Sent to users)
              </label>
              <textarea
                value={cancellationMessage}
                onChange={(e) => setCancellationMessage(e.target.value)}
                placeholder="Include details about rescheduling or cancellation details..."
                rows={4}
                className="w-full px-3.5 py-2.5 bg-card border border-border rounded-2xl focus:outline-none focus:border-primary text-xs shadow-sm"
              />
            </div>
          </div>
        )}
      </ResponsiveModal>
    </ResponsivePageWrapper>
  );
}
