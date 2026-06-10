import { useState, useEffect } from "react";
import { Loader2, MessageSquare, Star, Send, History, CheckCircle2 } from "lucide-react";
import { PageHeader, Card, Button } from "@/components/common";
import { apiFetch } from "@/services/api";
import { toast } from "sonner";

interface FeedbackItem {
  id: number;
  feedback_type: string;
  session_id: string | null;
  session_title: string | null;
  rating: number;
  category: string;
  comment: string;
  would_recommend: boolean;
  status: string;
  created_at: string;
}

interface OptionItem {
  id: string | number;
  title: string;
}

export function FeedbackPage() {
  const [feedbackType, setFeedbackType] = useState("Platform Feedback");
  const [sessionId, setSessionId] = useState("");
  const [sessionTitle, setSessionTitle] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [category, setCategory] = useState("General Suggestion");
  const [comment, setComment] = useState("");
  const [wouldRecommend, setWouldRecommend] = useState(true);

  // Dynamic session options state
  const [sessionOptions, setSessionOptions] = useState<OptionItem[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // User feedback history state
  const [history, setHistory] = useState<FeedbackItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Fetch feedback history
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await apiFetch<FeedbackItem[]>("/api/feedback/my");
      setHistory(data || []);
    } catch (err: any) {
      console.error("Failed to fetch feedback history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Fetch session options dynamically based on feedbackType
  useEffect(() => {
    if (feedbackType === "Platform Feedback") {
      setSessionOptions([]);
      setSessionId("");
      setSessionTitle("");
      return;
    }

    const loadSessionOptions = async () => {
      setLoadingOptions(true);
      try {
        if (feedbackType === "Masterclass") {
          const res = await apiFetch<any[]>("/api/masterclasses");
          const formatted = (res || []).map((m) => ({
            id: String(m.id),
            title: m.title || `Masterclass #${m.id}`
          }));
          setSessionOptions(formatted);
        } else if (feedbackType === "Meeting") {
          const res = await apiFetch<any[]>("/api/meetings");
          const formatted = (res || []).map((m) => ({
            id: String(m.id),
            title: m.title || `Meeting on ${new Date(m.scheduled_at).toLocaleDateString()}`
          }));
          setSessionOptions(formatted);
        } else if (feedbackType === "Recorded Session") {
          const res = await apiFetch<any[]>("/api/content");
          // Filter to show only videos/recordings if possible, otherwise show all
          const formatted = (res || [])
            .filter((c) => c.file_type?.toLowerCase().includes("mp4") || c.file_type?.toLowerCase().includes("video") || true)
            .map((c) => ({
              id: String(c.id),
              title: c.original_filename || c.title || `Recording #${c.id}`
            }));
          setSessionOptions(formatted);
        }
      } catch (err: any) {
        console.error("Failed to load options for type:", feedbackType, err);
        setSessionOptions([]);
      } finally {
        setLoadingOptions(false);
      }
    };

    loadSessionOptions();
  }, [feedbackType]);

  // Set correct title when sessionId changes
  const handleSessionChange = (id: string) => {
    setSessionId(id);
    const selected = sessionOptions.find((opt) => String(opt.id) === id);
    setSessionTitle(selected ? selected.title : "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast.warning("Please provide a rating (1-5 stars).");
      return;
    }
    if (!comment.trim()) {
      toast.warning("Please enter your comments.");
      return;
    }
    if (feedbackType !== "Platform Feedback" && !sessionId) {
      toast.warning(`Please select a specific ${feedbackType}.`);
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch("/api/feedback", {
        method: "POST",
        body: JSON.stringify({
          feedback_type: feedbackType,
          session_id: sessionId || null,
          session_title: sessionTitle || null,
          rating,
          category,
          comment: comment.trim(),
          would_recommend: wouldRecommend,
        })
      });

      toast.success("Feedback submitted successfully! Thank you.");
      // Reset form
      setRating(0);
      setComment("");
      setSessionId("");
      setSessionTitle("");
      setFeedbackType("Platform Feedback");
      setWouldRecommend(true);
      setCategory("General Suggestion");

      // Refresh history
      fetchHistory();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit feedback.");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Resolved":
        return <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-bold text-green-700 ring-1 ring-inset ring-green-600/20">Resolved</span>;
      case "Reviewed":
        return <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700 ring-1 ring-inset ring-indigo-600/20">Reviewed</span>;
      default:
        return <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-bold text-gray-600 ring-1 ring-inset ring-gray-500/15">Submitted</span>;
    }
  };

  return (
    <>
      <PageHeader title="Share Feedback" subtitle="Your feedback helps us continuously improve the platform experience." />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Feedback Form Card */}
        <div className="lg:col-span-1">
          <Card>
            <div className="flex items-center gap-2 border-b border-border/60 pb-3 mb-4.5">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h3 className="text-base font-bold text-foreground">Feedback Form</h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Feedback Type *</label>
                <select
                  value={feedbackType}
                  onChange={(e) => setFeedbackType(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary transition"
                >
                  <option value="Platform Feedback">General Platform Feedback</option>
                  <option value="Masterclass">Masterclass</option>
                  <option value="Meeting">Meeting/Session</option>
                  <option value="Recorded Session">Recorded Session</option>
                </select>
              </div>

              {feedbackType !== "Platform Feedback" && (
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Select {feedbackType} *</label>
                  {loadingOptions ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading list...
                    </div>
                  ) : (
                    <select
                      value={sessionId}
                      required
                      onChange={(e) => handleSessionChange(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary transition"
                    >
                      <option value="">-- Select One --</option>
                      {sessionOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.title}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary transition"
                >
                  <option value="General Suggestion">General Suggestion</option>
                  <option value="Content Quality">Content Quality</option>
                  <option value="Audio/Video Clarity">Audio/Video Clarity</option>
                  <option value="Tech Issue">Technical Issue</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Overall Rating *</label>
                <div className="flex items-center gap-1.5 py-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="text-yellow-400 focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star
                        className="h-7 w-7"
                        fill={(hoverRating || rating) >= star ? "currentColor" : "none"}
                        strokeWidth={2}
                      />
                    </button>
                  ))}
                  <span className="text-xs text-muted-foreground font-semibold ml-2">
                    {rating > 0 ? `${rating} / 5 Stars` : "Select stars"}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Comments / Suggestions *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Share details of your experience or suggestion..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary transition placeholder:text-muted-foreground/50 resize-none"
                />
              </div>

              <div className="flex items-center justify-between border-t border-border/40 pt-4">
                <span className="text-xs font-semibold text-muted-foreground">Would you recommend us?</span>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground cursor-pointer">
                    <input
                      type="radio"
                      checked={wouldRecommend === true}
                      onChange={() => setWouldRecommend(true)}
                      className="text-primary focus:ring-primary h-3.5 w-3.5"
                    />
                    Yes
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground cursor-pointer">
                    <input
                      type="radio"
                      checked={wouldRecommend === false}
                      onChange={() => setWouldRecommend(false)}
                      className="text-primary focus:ring-primary h-3.5 w-3.5"
                    />
                    No
                  </label>
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-primary hover:bg-primary/95 text-primary-foreground flex items-center justify-center gap-2 mt-4"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" /> Submit Feedback
                  </>
                )}
              </Button>
            </form>
          </Card>
        </div>

        {/* Feedback History Card */}
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center gap-2 border-b border-border/60 pb-3 mb-4.5">
              <History className="h-5 w-5 text-primary" />
              <h3 className="text-base font-bold text-foreground">My Feedback History</h3>
            </div>

            {loadingHistory ? (
              <div className="flex h-60 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-60 text-center px-4">
                <MessageSquare className="h-10 w-10 text-muted-foreground/35 mb-2.5" />
                <p className="text-sm font-semibold text-muted-foreground">No feedback submitted yet.</p>
                <p className="text-xs text-muted-foreground/80 mt-1 max-w-xs">Use the feedback form to submit suggestions or review your sessions.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border/60 text-xs">
                  <thead className="bg-secondary/25">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left font-bold text-muted-foreground uppercase tracking-wider">Date</th>
                      <th scope="col" className="px-4 py-3 text-left font-bold text-muted-foreground uppercase tracking-wider">Type</th>
                      <th scope="col" className="px-4 py-3 text-left font-bold text-muted-foreground uppercase tracking-wider">Session Info</th>
                      <th scope="col" className="px-4 py-3 text-left font-bold text-muted-foreground uppercase tracking-wider">Rating</th>
                      <th scope="col" className="px-4 py-3 text-left font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 bg-card">
                    {history.map((item) => (
                      <tr key={item.id} className="hover:bg-secondary/15 transition-colors">
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground font-medium">
                          {new Date(item.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric"
                          })}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-semibold text-foreground">
                          {item.feedback_type}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-medium max-w-xs truncate">
                          {item.session_title || "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex items-center gap-0.5 text-yellow-400">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className="h-3.5 w-3.5"
                                fill={item.rating >= star ? "currentColor" : "none"}
                              />
                            ))}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {getStatusBadge(item.status)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
