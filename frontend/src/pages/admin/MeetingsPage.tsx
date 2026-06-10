import { useState, useEffect } from "react";
import { Check, X, Video, FileText, Loader2, Calendar, Clock } from "lucide-react";
import { PageHeader, Card, Button, Badge } from "@/components/common";
import { apiFetch } from "@/services/api";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

interface MeetingResponse {
  id: number;
  title: string;
  agenda?: string;
  requested_by?: {
    id: number;
    full_name: string;
    email: string;
    role?: string;
    organization_name?: string;
  };
  requested_to?: {
    id: number;
    full_name: string;
    email: string;
    role?: string;
    organization_name?: string;
  };
  meeting_date: string;
  start_time: string;
  end_time: string;
  google_event_id?: string;
  google_meet_link?: string;
  status: string;
  notes?: string;
  action_items?: string;
  next_steps?: string;
  created_at: string;
}

export function MeetingsPage() {
  const { user } = useAuth();
  console.log("MeetingsPage user:", user);
  const [meetings, setMeetings] = useState<MeetingResponse[]>([]);
  const [loading, setLoading] = useState(true);

  // Scheduling Modal State
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingResponse | null>(null);
  
  // Schedule Form Fields
  const [scheduleTitle, setScheduleTitle] = useState("");
  const [scheduleAgenda, setScheduleAgenda] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleStartTime, setScheduleStartTime] = useState("");
  const [scheduleEndTime, setScheduleEndTime] = useState("");
  const [scheduleAttendees, setScheduleAttendees] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const [attendeeSearchQuery, setAttendeeSearchQuery] = useState("");

  // Notes/MOM State
  const [activeNotesMeeting, setActiveNotesMeeting] = useState<MeetingResponse | null>(null);
  const [notesMOM, setNotesMOM] = useState("");
  const [notesActionItems, setNotesActionItems] = useState("");
  const [notesNextSteps, setNotesNextSteps] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  // Available Users list for search-and-select dropdown
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);

  const fetchAvailableUsers = async () => {
    try {
      const data = await apiFetch<any[]>("/meetings/users");
      setAvailableUsers(data || []);
    } catch (err) {
      console.error("Failed to load available users:", err);
    }
  };

  // Google Integration State
  const [googleStatus, setGoogleStatus] = useState<{ connected: boolean; email: string | null; token_valid: boolean }>({
    connected: false,
    email: null,
    token_valid: false
  });
  const [googleLoading, setGoogleLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchGoogleStatus = async () => {
    try {
      const data = await apiFetch<{ connected: boolean; email: string | null; token_valid: boolean }>("/auth/google/status");
      if (data) {
        setGoogleStatus(data);
      }
    } catch (err) {
      console.error("Failed to load Google status:", err);
    }
  };

  const handleConnectGoogle = async () => {
    setGoogleLoading(true);
    try {
      const data = await apiFetch<{ auth_url?: string; url?: string }>("/auth/google/auth-url");
      const targetUrl = data?.auth_url || data?.url;
      if (targetUrl) {
        window.location.href = targetUrl;
      } else {
        toast.error("Failed to generate Google connection link.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to initiate Google OAuth.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    if (!confirm("Are you sure you want to disconnect Google Calendar integration?")) return;
    setGoogleLoading(true);
    try {
      await apiFetch("/auth/google/disconnect", { method: "POST" });
      toast.success("Google Calendar integration disconnected.");
      setGoogleStatus({ connected: false, email: null, token_valid: false });
    } catch (err: any) {
      toast.error(err.message || "Failed to disconnect Google integration.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<MeetingResponse[]>("/meetings/list");
      setMeetings(data || []);
      
      // Auto-select first scheduled/completed meeting for notes if none is active
      const notesTarget = data?.find(m => m.status === "scheduled" || m.status === "completed");
      if (notesTarget && !activeNotesMeeting) {
        handleSelectNotesMeeting(notesTarget);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load meetings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
    fetchGoogleStatus();
    fetchAvailableUsers();
    
    // Check if redirected with google_connected query param
    const params = new URLSearchParams(window.location.search);
    if (params.get("google_connected") === "true") {
      toast.success("Google Calendar Connected Successfully");
      params.delete("google_connected");
      const newQuery = params.toString() ? "?" + params.toString() : "";
      window.history.replaceState({}, document.title, window.location.pathname + newQuery);
    } else if (params.get("google_error") === "true") {
      toast.error("Google Calendar Connection Failed");
      params.delete("google_error");
      const newQuery = params.toString() ? "?" + params.toString() : "";
      window.history.replaceState({}, document.title, window.location.pathname + newQuery);
    }
  }, []);

  const handleSelectNotesMeeting = (m: MeetingResponse) => {
    setActiveNotesMeeting(m);
    setNotesMOM(m.notes || "");
    setNotesActionItems(m.action_items || "");
    setNotesNextSteps(m.next_steps || "");
  };

  const handleOpenScheduleModal = (m: MeetingResponse) => {
    setSelectedMeeting(m);
    setScheduleTitle(m.title);
    setScheduleAgenda(m.agenda || "");
    setScheduleDate(m.meeting_date);
    setScheduleStartTime(m.start_time);
    
    // Set a default end time (1 hour later, or append PM/AM)
    setScheduleEndTime(m.start_time);
    
    // Pre-populate attendees emails
    const emails = [];
    if (m.requested_by?.email) emails.push(m.requested_by.email);
    if (m.requested_to?.email) emails.push(m.requested_to.email);
    setScheduleAttendees(emails.join(", "));
    
    setAttendeeSearchQuery("");
    setShowScheduleModal(true);
  };

  const handleCreateMeeting = async () => {
    if (!selectedMeeting) return;
    if (!scheduleTitle.trim()) {
      toast.warning("Title is required.");
      return;
    }
    if (!scheduleDate) {
      toast.warning("Date is required.");
      return;
    }
    if (!scheduleStartTime || !scheduleEndTime) {
      toast.warning("Start and End Times are required.");
      return;
    }

    setScheduling(true);
    try {
      // Split attendees comma-separated list
      const attendeesList = scheduleAttendees
        .split(",")
        .map(e => e.trim())
        .filter(e => e.length > 0);

      await apiFetch(`/meetings/${selectedMeeting.id}/schedule`, {
        method: "POST",
        body: JSON.stringify({
          title: scheduleTitle,
          agenda: scheduleAgenda,
          meeting_date: scheduleDate,
          start_time: scheduleStartTime,
          end_time: scheduleEndTime,
          attendees: attendeesList
        })
      });

      toast.success("Meeting approved and Google Meet link generated successfully!");
      setShowScheduleModal(false);
      fetchMeetings();
    } catch (err: any) {
      toast.error(err.message || "Failed to schedule Google Calendar event.");
    } finally {
      setScheduling(false);
    }
  };

  const handleRejectMeeting = async (id: number) => {
    if (!confirm("Are you sure you want to reject this meeting request?")) return;
    try {
      await apiFetch(`/meetings/${id}/reject`, { method: "POST" });
      toast.success("Meeting request rejected.");
      fetchMeetings();
    } catch (err: any) {
      toast.error(err.message || "Failed to reject request.");
    }
  };

  const handleCompleteMeeting = async (id: number) => {
    try {
      await apiFetch(`/meetings/${id}/complete`, { method: "POST" });
      toast.success("Meeting marked as completed.");
      fetchMeetings();
    } catch (err: any) {
      toast.error(err.message || "Failed to mark meeting complete.");
    }
  };

  const handleSaveNotes = async () => {
    if (!activeNotesMeeting) {
      toast.warning("Please select a meeting from the list to save notes.");
      return;
    }

    setSavingNotes(true);
    try {
      await apiFetch(`/meetings/${activeNotesMeeting.id}/notes`, {
        method: "POST",
        body: JSON.stringify({
          notes: notesMOM,
          action_items: notesActionItems,
          next_steps: notesNextSteps
        })
      });
      toast.success("MOM notes and action items saved successfully!");
      
      // Update local state cleanly
      setMeetings(prev => prev.map(m => 
        m.id === activeNotesMeeting.id 
          ? { ...m, notes: notesMOM, action_items: notesActionItems, next_steps: notesNextSteps }
          : m
      ));
    } catch (err: any) {
      toast.error(err.message || "Failed to save meeting notes.");
    } finally {
      setSavingNotes(false);
    }
  };

  const copyMeetLink = (link?: string) => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    toast.success("Google Meet link copied to clipboard!");
  };

  const pendingReceived = meetings.filter(m => m.status === "pending" && m.requested_to?.email === user?.email);
  const acceptedRequests = meetings.filter(m => m.status === "accepted");
  const sentPending = meetings.filter(m => m.status === "pending" && m.requested_by?.email === user?.email);
  const upcomingMeetings = meetings.filter(m => m.status === "scheduled");
  const completedMeetings = meetings.filter(m => m.status === "completed" || m.status === "cancelled");

  return (
    <>
      <PageHeader title="Meetings" subtitle="Approve requests, schedule Meet links, and capture notes dynamically." />

      {/* Google Integration Block */}
      <section className="mb-6">
        <Card className="border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${!mounted ? 'bg-muted text-muted-foreground' : (googleStatus.connected ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600')}`}>
                <Video className="h-5 w-5" />
              </div>
              <div className="text-left">
                <h4 className="text-sm font-semibold text-foreground">Google Integration</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {!mounted ? (
                    "Loading..."
                  ) : googleStatus.connected ? (
                    <>
                      Connected as: <strong className="text-foreground">{googleStatus.email}</strong> • Google Calendar: Connected • Google Meet Creation: Enabled
                    </>
                  ) : (
                    "Not Connected"
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!mounted ? (
                <Button size="sm" variant="outline" disabled>
                  Loading...
                </Button>
              ) : googleStatus.connected ? (
                <>
                  <Button variant="outline" size="sm" onClick={handleConnectGoogle} disabled={googleLoading}>
                    Reconnect
                  </Button>
                  <Button variant="outline" size="sm" className="!text-destructive border-destructive/20 hover:bg-destructive/10" onClick={handleDisconnectGoogle} disabled={googleLoading}>
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button size="sm" className="bg-primary hover:bg-primary/95 text-white" onClick={handleConnectGoogle} disabled={googleLoading}>
                  Connect Google Calendar
                </Button>
              )}
            </div>
          </div>
        </Card>
      </section>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Pending Requests Received */}
          <section className="mb-10">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Pending Requests Received ({pendingReceived.length})
            </h3>
            {pendingReceived.length === 0 ? (
              <Card className="p-6 text-center text-sm text-muted-foreground bg-secondary/10 border-dashed border-border border">
                No pending received meeting requests at this time.
              </Card>
            ) : (
              <div className="space-y-4 animate-fade-in">
                {pendingReceived.map((r) => (
                  <Card key={r.id} className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h4 className="text-base font-semibold">{r.title}</h4>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Requested by: <strong className="text-foreground">{r.requested_by?.full_name} ({r.requested_by?.role || "user"}) [{r.requested_by?.organization_name || "EduStream"}]</strong> ({r.requested_by?.email}) • Preferred: <strong>{r.meeting_date} at {r.start_time}</strong>
                      </p>
                      {r.agenda && <p className="mt-2 text-xs text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-lg border border-border/40 inline-block">{r.agenda}</p>}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="!text-destructive border-destructive/20 hover:bg-destructive/10" onClick={() => handleRejectMeeting(r.id)}>
                        <X className="h-4 w-4" /> Reject
                      </Button>
                      <Button onClick={() => handleOpenScheduleModal(r)}>
                        <Check className="h-4 w-4" /> Approve & Schedule
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Accepted Requests (Ready to Schedule) */}
          <section className="mb-10">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Accepted Requests - Ready to Schedule ({acceptedRequests.length})
            </h3>
            {acceptedRequests.length === 0 ? (
              <Card className="p-6 text-center text-sm text-muted-foreground bg-secondary/10 border-dashed border-border border">
                No accepted requests waiting to be scheduled.
              </Card>
            ) : (
              <div className="space-y-4 animate-fade-in">
                {acceptedRequests.map((r) => (
                  <Card key={r.id} className="flex flex-wrap items-center justify-between gap-4 border-l-4 border-emerald-500">
                    <div>
                      <h4 className="text-base font-semibold">{r.title}</h4>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Accepted by: <strong className="text-foreground">{r.requested_to?.full_name} ({r.requested_to?.role || "admin"}) [{r.requested_to?.organization_name || "EduStream"}]</strong> ({r.requested_to?.email}) • Date: <strong>{r.meeting_date} at {r.start_time}</strong>
                      </p>
                      {r.agenda && <p className="mt-2 text-xs text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-lg border border-border/40 inline-block">{r.agenda}</p>}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="!text-destructive border-destructive/20 hover:bg-destructive/10" onClick={() => handleRejectMeeting(r.id)}>
                        <X className="h-4 w-4" /> Cancel
                      </Button>
                      <Button onClick={() => handleOpenScheduleModal(r)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                        <Calendar className="h-4 w-4" /> Schedule Meet
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Sent Requests Pending Recipient Acceptance */}
          <section className="mb-10">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Sent Requests (Waiting for Recipient) ({sentPending.length})
            </h3>
            {sentPending.length === 0 ? (
              <Card className="p-6 text-center text-sm text-muted-foreground bg-secondary/10 border-dashed border-border border">
                No active sent requests awaiting recipient acceptance.
              </Card>
            ) : (
              <div className="space-y-4 animate-fade-in">
                {sentPending.map((r) => (
                  <Card key={r.id} className="flex flex-wrap items-center justify-between gap-4 opacity-80">
                    <div>
                      <h4 className="text-base font-semibold">{r.title}</h4>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Sent to: <strong className="text-foreground">{r.requested_to?.full_name || "Unknown"} ({r.requested_to?.role || "user"}) [{r.requested_to?.organization_name || "EduStream"}]</strong> ({r.requested_to?.email}) • Proposed: <strong>{r.meeting_date} at {r.start_time}</strong>
                      </p>
                      {r.agenda && <p className="mt-2 text-xs text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-lg border border-border/40 inline-block">{r.agenda}</p>}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="!text-destructive border-destructive/20 hover:bg-destructive/10" onClick={() => handleRejectMeeting(r.id)}>
                        <X className="h-4 w-4" /> Cancel Request
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Quick Meet Actions & Post Meeting Notes */}
          <section className="mb-10 grid gap-5 lg:grid-cols-2">
            {/* Google Meet details of active selection */}
            <Card className="flex flex-col justify-between">
              <div>
                <h3 className="mb-3 text-base font-semibold">Active Session</h3>
                {activeNotesMeeting ? (
                  <>
                    <div className="mb-3 flex items-center justify-between">
                      <Badge tone={activeNotesMeeting.status === "completed" ? "success" : "primary"}>
                        {activeNotesMeeting.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{activeNotesMeeting.meeting_date} · {activeNotesMeeting.start_time}</span>
                    </div>
                    <h4 className="text-sm font-semibold text-foreground">{activeNotesMeeting.title}</h4>
                    
                    <div className="text-xs text-muted-foreground mt-2.5 space-y-1.5 bg-secondary/30 p-3 rounded-lg border border-border/40">
                      <div className="font-semibold text-foreground mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Participants & Organizations</div>
                      <div className="flex items-center justify-between border-b border-border/30 pb-1.5">
                        <span className="flex items-center gap-1.5">
                          <span className="text-[10px]">👤</span>
                          <strong className="text-foreground">{activeNotesMeeting.requested_by?.full_name}</strong>
                          <span className="text-[10px] text-muted-foreground bg-secondary/80 px-1 py-0.5 rounded capitalize">{activeNotesMeeting.requested_by?.role}</span>
                        </span>
                        <Badge tone="neutral" className="text-[10px] px-1.5 py-0">{activeNotesMeeting.requested_by?.organization_name || "EduStream"}</Badge>
                      </div>
                      <div className="flex items-center justify-between pt-0.5">
                        <span className="flex items-center gap-1.5">
                          <span className="text-[10px]">👤</span>
                          <strong className="text-foreground">{activeNotesMeeting.requested_to?.full_name}</strong>
                          <span className="text-[10px] text-muted-foreground bg-secondary/80 px-1 py-0.5 rounded capitalize">{activeNotesMeeting.requested_to?.role}</span>
                        </span>
                        <Badge tone="neutral" className="text-[10px] px-1.5 py-0">{activeNotesMeeting.requested_to?.organization_name || "EduStream"}</Badge>
                      </div>
                    </div>
                    
                    {activeNotesMeeting.google_meet_link && (
                      <div className="mt-4 flex items-center gap-3 rounded-lg border border-border bg-background p-3">
                        <Video className="h-5 w-5 text-primary" />
                        <span className="flex-1 truncate text-xs font-mono text-muted-foreground">
                          {activeNotesMeeting.google_meet_link}
                        </span>
                        <Button variant="outline" size="sm" onClick={() => copyMeetLink(activeNotesMeeting.google_meet_link)}>Copy</Button>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Select a meeting from the upcoming list to view active session links.
                  </p>
                )}
              </div>
              
              {activeNotesMeeting && activeNotesMeeting.status === "scheduled" && (
                <div className="mt-6 flex justify-end">
                  <Button variant="outline" className="border-emerald-300 hover:bg-emerald-50 text-emerald-700" onClick={() => handleCompleteMeeting(activeNotesMeeting.id)}>
                    Mark as Completed
                  </Button>
                </div>
              )}
            </Card>

            {/* MOM Capture form */}
            <Card>
              <h3 className="mb-2 text-base font-semibold">MOM, Action Items & Notes</h3>
              {activeNotesMeeting ? (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground mb-1">Capturing notes for: <strong>{activeNotesMeeting.title}</strong></p>
                  
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">MOM / Discussion Notes</label>
                    <textarea
                      rows={3}
                      value={notesMOM}
                      onChange={(e) => setNotesMOM(e.target.value)}
                      placeholder="Capture meeting minutes..."
                      className="w-full resize-none rounded-lg border border-border bg-background p-2.5 text-xs outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Action Items</label>
                    <textarea
                      rows={2}
                      value={notesActionItems}
                      onChange={(e) => setNotesActionItems(e.target.value)}
                      placeholder="Assign tasks..."
                      className="w-full resize-none rounded-lg border border-border bg-background p-2.5 text-xs outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Next Steps</label>
                    <textarea
                      rows={2}
                      value={notesNextSteps}
                      onChange={(e) => setNotesNextSteps(e.target.value)}
                      placeholder="Outline future steps..."
                      className="w-full resize-none rounded-lg border border-border bg-background p-2.5 text-xs outline-none focus:border-primary"
                    />
                  </div>

                  <div className="mt-2 flex justify-end">
                    <Button onClick={handleSaveNotes} disabled={savingNotes}>
                      {savingNotes ? "Saving..." : "Save notes"}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select a meeting from the upcoming list to save post-meeting MOM notes.
                </p>
              )}
            </Card>
          </section>

          {/* Upcoming Meetings Calendar Grid */}
          <section className="mb-10">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Upcoming scheduled meetings ({upcomingMeetings.length})
            </h3>
            {upcomingMeetings.length === 0 ? (
              <Card className="p-6 text-center text-sm text-muted-foreground bg-secondary/10 border-dashed border-border border">
                No upcoming meetings scheduled.
              </Card>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {upcomingMeetings.map((u) => (
                  <Card 
                    key={u.id} 
                    className={`cursor-pointer border transition-all ${
                      activeNotesMeeting?.id === u.id 
                        ? "border-primary ring-2 ring-primary/10 shadow-md bg-secondary/10" 
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => handleSelectNotesMeeting(u)}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <Badge tone="primary">Scheduled</Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {u.start_time}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-foreground truncate">{u.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">Date: {u.meeting_date}</p>
                    <p className="text-xs text-muted-foreground truncate" title={`${u.requested_by?.full_name} (${u.requested_by?.role || "user"}) [${u.requested_by?.organization_name || "EduStream"}] & ${u.requested_to?.full_name} (${u.requested_to?.role || "admin"}) [${u.requested_to?.organization_name || "EduStream"}]`}>
                      Between: {u.requested_by?.full_name} ({u.requested_by?.organization_name || "EduStream"}) & {u.requested_to?.full_name} ({u.requested_to?.organization_name || "EduStream"})
                    </p>
                    {u.google_meet_link && (
                      <a href={u.google_meet_link} target="_blank" rel="noreferrer" className="mt-3 block" onClick={e => e.stopPropagation()}>
                        <Button size="sm" className="w-full flex items-center justify-center gap-1 font-semibold text-xs">
                          <Video className="h-3.5 w-3.5" /> Join Meet
                        </Button>
                      </a>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* History */}
          <section>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Meeting History ({completedMeetings.length})
            </h3>
            {completedMeetings.length === 0 ? (
              <Card className="p-6 text-center text-sm text-muted-foreground bg-secondary/10 border border-border">
                No past meetings recorded.
              </Card>
            ) : (
              <Card className="!p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border bg-secondary/10">
                      <th className="px-6 py-3 font-medium">Topic</th>
                      <th className="px-6 py-3 font-medium">Participants</th>
                      <th className="px-6 py-3 font-medium">Date / Time</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                      <th className="px-6 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {completedMeetings.map((h) => (
                      <tr 
                        key={h.id} 
                        className={`cursor-pointer hover:bg-secondary/40 transition-colors ${
                          activeNotesMeeting?.id === h.id ? "bg-secondary/20 font-semibold" : ""
                        }`}
                        onClick={() => handleSelectNotesMeeting(h)}
                      >
                        <td className="px-6 py-4 font-medium text-foreground">{h.title}</td>
                        <td className="px-6 py-4 text-muted-foreground text-xs">
                          <div>
                            <strong className="text-foreground">{h.requested_by?.full_name}</strong> ({h.requested_by?.role || "user"}) [{h.requested_by?.organization_name || "EduStream"}]
                          </div>
                          <div className="text-[10px] my-0.5 text-muted-foreground">and</div>
                          <div>
                            <strong className="text-foreground">{h.requested_to?.full_name}</strong> ({h.requested_to?.role || "admin"}) [{h.requested_to?.organization_name || "EduStream"}]
                          </div>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground text-xs">{h.meeting_date} @ {h.start_time}</td>
                        <td className="px-6 py-4">
                          <Badge tone={h.status === "completed" ? "success" : "neutral"}>
                            {h.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <button className="flex items-center gap-1.5 text-xs text-primary font-bold hover:underline" onClick={(e) => {
                            e.stopPropagation();
                            handleSelectNotesMeeting(h);
                          }}>
                            <FileText className="h-3.5 w-3.5" /> MOM Notes
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </section>
        </>
      )}

      {/* Centered Schedule Meeting Approval Modal */}
      {showScheduleModal && selectedMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-lg shadow-2xl border border-border bg-card animate-zoom-in relative">
            <button 
              onClick={() => setShowScheduleModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground text-lg font-bold"
            >
              ✕
            </button>
            <div className="border-b border-border pb-3 mb-4">
              <h3 className="text-lg font-bold text-foreground">Approve & Schedule Meeting</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Integrates with Google Calendar API to dispatch Meet link & SMTP invitation.</p>
            </div>
            
            <div className="space-y-4 text-sm">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Meeting Title</span>
                <input
                  type="text"
                  value={scheduleTitle}
                  onChange={(e) => setScheduleTitle(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Agenda / Purpose</span>
                <textarea
                  rows={2}
                  value={scheduleAgenda}
                  onChange={(e) => setScheduleAgenda(e.target.value)}
                  className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </label>

              <div className="grid gap-3 grid-cols-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Date</span>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none focus:border-primary"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Start Time</span>
                  <input
                    type="text"
                    placeholder="e.g. 10:00 AM"
                    value={scheduleStartTime}
                    onChange={(e) => setScheduleStartTime(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none focus:border-primary"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">End Time</span>
                  <input
                    type="text"
                    placeholder="e.g. 11:30 AM"
                    value={scheduleEndTime}
                    onChange={(e) => setScheduleEndTime(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none focus:border-primary"
                  />
                </label>
              </div>

              {/* Task 10: Attendee Dropdown & Search Enhancements */}
              <div className="relative">
                <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Attendee Search & Select</span>
                <input
                  type="text"
                  placeholder="Type name, role or company to filter..."
                  value={attendeeSearchQuery}
                  onChange={(e) => setAttendeeSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary mb-2"
                />
                
                <div className="max-h-40 overflow-y-auto border border-border rounded-lg p-1.5 bg-secondary/10 space-y-1">
                  {availableUsers
                    .filter(u => {
                      const q = attendeeSearchQuery.toLowerCase();
                      return u.full_name.toLowerCase().includes(q) || 
                             u.email.toLowerCase().includes(q) || 
                             (u.role && u.role.toLowerCase().includes(q)) ||
                             (u.organization_name && u.organization_name.toLowerCase().includes(q));
                    })
                    .map(u => {
                      const emails = scheduleAttendees.split(",").map(e => e.trim());
                      const isSelected = emails.includes(u.email);
                      
                      const toggleSelect = () => {
                        let newEmails = [...emails];
                        if (isSelected) {
                          newEmails = newEmails.filter(e => e !== u.email);
                        } else {
                          newEmails.push(u.email);
                        }
                        setScheduleAttendees(newEmails.filter(Boolean).join(", "));
                      };

                      return (
                        <div 
                          key={u.id}
                          onClick={toggleSelect}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer text-xs transition-colors ${
                            isSelected 
                              ? "bg-primary/20 hover:bg-primary/30 border border-primary/20" 
                              : "hover:bg-secondary/40 border border-transparent"
                          }`}
                        >
                          <div className="text-left">
                            <div className="font-semibold text-foreground capitalize">{u.full_name} ({u.role || "user"})</div>
                            <div className="text-[10px] text-muted-foreground">{u.organization_name || "EduStream"} · {u.email}</div>
                          </div>
                          <div className="font-bold text-primary text-xs">
                            {isSelected ? "✓ Selected" : "+ Add"}
                          </div>
                        </div>
                      );
                    })}
                  {availableUsers.length === 0 && (
                    <div className="text-center text-xs text-muted-foreground py-2">No users available for invitation.</div>
                  )}
                </div>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Attendee Emails (comma-separated)</span>
                <input
                  type="text"
                  value={scheduleAttendees}
                  onChange={(e) => setScheduleAttendees(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary"
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowScheduleModal(false)}>Cancel</Button>
              <Button onClick={handleCreateMeeting} disabled={scheduling}>
                {scheduling ? "Creating Meet..." : "Create Meeting"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
