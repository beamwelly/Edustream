import { useState, useEffect } from "react";
import { Calendar, Video, FileText, Clock, Loader2 } from "lucide-react";
import { PageHeader, Card, Button, Badge, AccessDenied } from "@/components/common";
import { apiFetch } from "@/services/api";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

interface UserInfo {
  id: number;
  full_name: string;
  email: string;
  role: string;
  organization_name?: string;
}

interface MeetingResponse {
  id: number;
  title: string;
  agenda?: string;
  requested_by?: {
    id: number;
    full_name: string;
    email: string;
  };
  requested_to?: {
    id: number;
    full_name: string;
    email: string;
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

const slots = ["10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM"];

export function UserMeetingsPage() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<MeetingResponse[]>([]);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState(slots[0]);
  const [submitting, setSubmitting] = useState(false);

  // Modal State
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<MeetingResponse | null>(null);

  const fetchMeetingsData = async () => {
    setLoading(true);
    try {
      const [meetingsData, usersData] = await Promise.all([
        apiFetch<MeetingResponse[]>("/meetings/list"),
        apiFetch<UserInfo[]>("/meetings/users")
      ]);
      setMeetings(meetingsData || []);
      setUsers(usersData || []);
      
      // Default to first user if available
      if (usersData && usersData.length > 0) {
        setRecipientId(String(usersData[0].id));
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load meetings data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === "employee" && !user.permissions?.access_meetings) {
      setLoading(false);
      return;
    }
    fetchMeetingsData();
  }, [user]);

  const handleRequestMeeting = async () => {
    if (!topic.trim()) {
      toast.warning("Please enter a meeting topic.");
      return;
    }
    if (!preferredDate) {
      toast.warning("Please select a preferred date.");
      return;
    }
    if (!recipientId) {
      toast.warning("Please choose a preferred recipient.");
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch("/meetings/request", {
        method: "POST",
        body: JSON.stringify({
          title: topic,
          agenda: notes,
          requested_to_user_id: Number(recipientId),
          meeting_date: preferredDate,
          start_time: selectedSlot,
          notes: notes
        })
      });
      toast.success("Meeting request submitted as pending!");
      setTopic("");
      setNotes("");
      fetchMeetingsData();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit meeting request.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyMeetLink = (link?: string) => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    toast.success("Google Meet link copied to clipboard!");
  };

  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  console.log("UserMeetingsPage user:", currentUser);
  const currentUserId = currentUser?.id || 0;

  // Requests Sent (by the current user)
  const requestsSent = meetings.filter(m => m.requested_by?.id === currentUserId && m.status === "pending");
  
  // Requests Received (sent to current user)
  const requestsReceived = meetings.filter(m => m.requested_to?.id === currentUserId && (m.status === "pending" || m.status === "accepted"));
  
  // Upcoming Meetings (scheduled syncs)
  const upcomingMeetings = meetings.filter(m => m.status === "scheduled");
  
  // Past Meetings (completed/cancelled)
  const pastMeetings = meetings.filter(m => m.status === "completed" || m.status === "cancelled");

  // Find the first upcoming scheduled meeting with active Meet link
  const upcomingMeet = meetings.find(m => m.status === "scheduled" && m.google_meet_link);

  const handleAcceptRequest = async (id: number) => {
    try {
      await apiFetch(`/meetings/${id}/accept`, { method: "POST" });
      toast.success("Meeting request accepted!");
      fetchMeetingsData();
    } catch (err: any) {
      toast.error(err.message || "Failed to accept request.");
    }
  };

  const handleRejectRequest = async (id: number) => {
    if (!confirm("Are you sure you want to reject this meeting request?")) return;
    try {
      await apiFetch(`/meetings/${id}/reject`, { method: "POST" });
      toast.success("Meeting request rejected.");
      fetchMeetingsData();
    } catch (err: any) {
      toast.error(err.message || "Failed to reject request.");
    }
  };

  if (user && user.role === "employee" && !user.permissions?.access_meetings) {
    return <AccessDenied message="You do not have permission to access Meetings." />;
  }

  return (
    <>
      <PageHeader title="Meetings" subtitle="Schedule a meeting and review past conversations." />

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="mb-10 grid gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <h3 className="mb-4 text-base font-semibold">Schedule a meeting</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-muted-foreground">Topic</span>
                  <input
                    type="text"
                    placeholder="What would you like to discuss?"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </label>
                
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-muted-foreground">Requested Person</span>
                  <select
                    value={recipientId}
                    onChange={(e) => setRecipientId(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.full_name} ({u.role === "admin" ? "Admin" : u.organization_name || "Masterclass"})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-muted-foreground">Preferred Date</span>
                  <input
                    type="date"
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-muted-foreground">Purpose / Notes</span>
                  <input
                    type="text"
                    placeholder="Brief description or purpose..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </label>
              </div>

              <div className="mt-5">
                <p className="mb-2 text-sm font-medium text-muted-foreground">Available slots</p>
                <div className="flex flex-wrap gap-2">
                  {slots.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedSlot(s)}
                      className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm transition-all ${
                        selectedSlot === s
                          ? "border-primary bg-primary text-primary-foreground font-semibold"
                          : "border-border bg-card text-foreground hover:border-primary hover:text-primary"
                      }`}
                    >
                      <Clock className="h-3.5 w-3.5" />
                      {s}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground italic">Each scheduled meeting is 30 minutes in duration.</p>
              </div>

              <div className="mt-6 flex justify-end">
                <Button onClick={handleRequestMeeting} disabled={submitting}>
                  {submitting ? "Requesting..." : "Request meeting"}
                </Button>
              </div>
            </Card>

            <Card className="flex flex-col justify-between">
              <div>
                <h3 className="mb-3 text-base font-semibold">Google Meet</h3>
                {upcomingMeet ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Your upcoming scheduled session with <strong>{upcomingMeet.requested_to?.full_name || "Admin"}</strong> is ready.
                    </p>
                    <div className="mt-4 flex items-center gap-3 rounded-lg border border-border bg-background p-3">
                      <Video className="h-5 w-5 text-primary" />
                      <span className="flex-1 truncate text-xs font-mono text-muted-foreground">
                        {upcomingMeet.google_meet_link}
                      </span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button variant="outline" className="w-full" onClick={() => copyMeetLink(upcomingMeet.google_meet_link)}>
                        Copy link
                      </Button>
                      <a href={upcomingMeet.google_meet_link} target="_blank" rel="noreferrer" className="w-full">
                        <Button className="w-full flex items-center justify-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
                          <Video className="h-4 w-4" /> Join
                        </Button>
                      </a>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Your next session link will appear here once approved by Admin.
                    </p>
                    <div className="mt-4 flex items-center gap-3 rounded-lg border border-border bg-background p-3">
                      <Video className="h-5 w-5 text-muted-foreground/50" />
                      <span className="flex-1 truncate text-sm font-mono text-muted-foreground">meet.google.com/—</span>
                    </div>
                    <Button variant="outline" disabled className="mt-3 w-full">Copy link</Button>
                  </>
                )}
              </div>
            </Card>
          </div>

          {/* Requests Received */}
          <section className="mb-10">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Requests Received ({requestsReceived.length})</h3>
            {requestsReceived.length === 0 ? (
              <Card className="p-6 text-center text-sm text-muted-foreground bg-secondary/10 border-dashed border-border border">
                No meeting requests received.
              </Card>
            ) : (
              <div className="space-y-4">
                {requestsReceived.map((m) => (
                  <Card key={m.id} className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h4 className="text-base font-semibold">{m.title}</h4>
                      <p className="mt-1 text-sm text-muted-foreground">
                        From: <strong>{m.requested_by?.full_name}</strong> • Proposed: <strong>{m.meeting_date} at {m.start_time}</strong>
                      </p>
                      {m.agenda && <p className="mt-2 text-xs text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-lg border border-border/40 inline-block">{m.agenda}</p>}
                    </div>
                    <div className="flex gap-2">
                      {m.status === "pending" ? (
                        <>
                          <Button variant="outline" className="!text-destructive border-destructive/20 hover:bg-destructive/10" onClick={() => handleRejectRequest(m.id)}>
                            Reject
                          </Button>
                          <Button onClick={() => handleAcceptRequest(m.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                            Accept Invitation
                          </Button>
                        </>
                      ) : (
                        <Badge tone="success">Accepted</Badge>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Requests Sent */}
          <section className="mb-10">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Requests Sent ({requestsSent.length})</h3>
            {requestsSent.length === 0 ? (
              <Card className="p-6 text-center text-sm text-muted-foreground bg-secondary/10 border-dashed border-border border">
                No active pending sent requests.
              </Card>
            ) : (
              <div className="space-y-4">
                {requestsSent.map((m) => (
                  <Card key={m.id} className="flex flex-wrap items-center justify-between gap-4 opacity-90">
                    <div>
                      <h4 className="text-base font-semibold">{m.title}</h4>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Sent to: <strong>{m.requested_to?.full_name || "Admin"}</strong> • Proposed: <strong>{m.meeting_date} at {m.start_time}</strong>
                      </p>
                      {m.agenda && <p className="mt-2 text-xs text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-lg border border-border/40 inline-block">{m.agenda}</p>}
                    </div>
                    <Badge tone="warning">Pending Approval</Badge>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Upcoming Syncs */}
          <section className="mb-10">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Upcoming Syncs ({upcomingMeetings.length})</h3>
            {upcomingMeetings.length === 0 ? (
              <Card className="p-6 text-center text-sm text-muted-foreground bg-secondary/10 border-dashed border-border border">
                No upcoming scheduled meetings.
              </Card>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {upcomingMeetings.map((m) => (
                  <Card key={m.id} className="border border-border hover:border-primary/50 transition-all">
                    <div className="mb-2 flex items-center justify-between">
                      <Badge tone="primary">Scheduled</Badge>
                      <span className="text-xs text-muted-foreground">{m.start_time}</span>
                    </div>
                    <h4 className="text-sm font-semibold text-foreground truncate">{m.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">Date: {m.meeting_date}</p>
                    <p className="text-xs text-muted-foreground truncate">With: {m.requested_by?.id === currentUserId ? m.requested_to?.full_name : m.requested_by?.full_name}</p>
                    {m.google_meet_link && (
                      <a href={m.google_meet_link} target="_blank" rel="noreferrer" className="mt-3 block">
                        <Button size="sm" className="w-full flex items-center justify-center gap-1 font-semibold text-xs bg-primary text-white">
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
          <section className="mb-10">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Meeting History & MOM ({pastMeetings.length})</h3>
            {pastMeetings.length === 0 ? (
              <Card className="p-6 text-center text-sm text-muted-foreground bg-secondary/10 border border-border">
                No past meetings recorded.
              </Card>
            ) : (
              <Card className="!p-0">
                <ul className="divide-y divide-border">
                  {pastMeetings.map((m) => (
                    <li key={m.id} className="flex flex-wrap items-center gap-4 px-6 py-4">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{m.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Date: {m.meeting_date} • Time: {m.start_time} • Status: <strong className="capitalize">{m.status}</strong>
                        </p>
                      </div>
                      <Badge tone={m.status === "completed" ? "success" : "neutral"}>
                        {m.status}
                      </Badge>
                      <button 
                        onClick={() => {
                          setSelectedNotes(m);
                          setShowNotesModal(true);
                        }}
                        className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                      >
                        <FileText className="h-4 w-4" /> View notes
                      </button>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </section>
        </>
      )}

      {/* Centered post-meeting MOM notes read-only modal */}
      {showNotesModal && selectedNotes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 backdrop-blur-sm overflow-y-auto">
          <Card className="w-[92vw] sm:w-full sm:max-w-lg my-auto shadow-2xl border border-border bg-card animate-zoom-in relative flex flex-col max-h-[92vh] sm:max-h-[85vh] p-5 sm:p-6">
            <button 
              onClick={() => setShowNotesModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground text-lg font-bold z-10"
            >
              ✕
            </button>
            <div className="border-b border-border pb-3 mb-4 flex-shrink-0">
              <h3 className="text-lg font-bold text-foreground">Post-Meeting Summary</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Meeting: <strong className="text-foreground">{selectedNotes.title}</strong></p>
            </div>
            <div className="space-y-4 text-sm flex-1 overflow-y-auto pr-1">
              <div>
                <h4 className="font-semibold text-foreground mb-1">Minutes of Meeting (MOM) / Notes</h4>
                <div className="bg-secondary/40 p-3 rounded-lg border border-border text-muted-foreground whitespace-pre-wrap">
                  {selectedNotes.notes || "No general notes recorded."}
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">Action Items</h4>
                <div className="bg-secondary/40 p-3 rounded-lg border border-border text-muted-foreground whitespace-pre-wrap">
                  {selectedNotes.action_items || "No action items recorded."}
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">Next Steps</h4>
                <div className="bg-secondary/40 p-3 rounded-lg border border-border text-muted-foreground whitespace-pre-wrap">
                  {selectedNotes.next_steps || "No next steps recorded."}
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end border-t border-border pt-4 flex-shrink-0">
              <Button onClick={() => setShowNotesModal(false)}>Close Summary</Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
