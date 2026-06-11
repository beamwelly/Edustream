import { useState, useEffect } from "react";
import { Loader2, MessageSquare, Star, BarChart3, PieChart as PieIcon, CheckCircle2, AlertTriangle, Eye, Sparkles } from "lucide-react";
import { PageHeader, Card, Button } from "@/components/common";
import { apiFetch } from "@/services/api";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  Legend
} from "recharts";

interface FeedbackItem {
  id: number;
  user_id: number;
  user_name: string;
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

export function AdminFeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<FeedbackItem[]>("/api/feedback");
      setFeedbacks(data || []);
    } catch (err: any) {
      toast.error("Failed to load feedback details: " + (err.message || "Server error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    try {
      await apiFetch(`/api/feedback/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus })
      });
      toast.success(`Feedback status updated to ${newStatus}`);
      // Refresh list
      fetchFeedbacks();
    } catch (err: any) {
      toast.error(err.message || "Failed to update status.");
    }
  };

  // KPI Calculations
  const totalReceived = feedbacks.length;
  const avgRating = totalReceived > 0 
    ? Number((feedbacks.reduce((sum, f) => sum + f.rating, 0) / totalReceived).toFixed(1))
    : 0;
  
  const positiveRate = totalReceived > 0
    ? Math.round((feedbacks.filter(f => f.rating >= 4).length / totalReceived) * 100)
    : 0;

  const negativeRate = totalReceived > 0
    ? Math.round((feedbacks.filter(f => f.rating <= 2).length / totalReceived) * 100)
    : 0;

  // Chart 1: Average Rating by Category
  const categories = ["General Suggestion", "Content Quality", "Audio/Video Clarity", "Tech Issue"];
  const barChartData = categories.map(cat => {
    const matching = feedbacks.filter(f => f.category === cat);
    const avg = matching.length > 0
      ? Number((matching.reduce((sum, f) => sum + f.rating, 0) / matching.length).toFixed(1))
      : 0;
    return { name: cat, avgRating: avg };
  });

  // Chart 2: Feedback Volume by Type
  const types = ["Platform Feedback", "Masterclass", "Meeting", "Recorded Session"];
  const pieColors = ["#DC2626", "#166534", "#4B5563", "#EA580C"];
  const pieChartData = types.map((t, idx) => {
    const count = feedbacks.filter(f => f.feedback_type === t).length;
    return { name: t, value: count, color: pieColors[idx] };
  }).filter(item => item.value > 0);

  // Filtering Logic
  const filteredFeedbacks = feedbacks.filter(f => {
    const matchesSearch = 
      f.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.comment.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.session_title && f.session_title.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = typeFilter === "all" || f.feedback_type === typeFilter;
    const matchesStatus = statusFilter === "all" || f.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

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
      <PageHeader title="Feedback Analytics & Management" subtitle="Review platform feedback metrics, ratings, and resolve technical issues." />

      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI Analytics Cards */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="flex items-center gap-4 p-5">
              <div className="rounded-full bg-primary-soft p-3 text-primary">
                <MessageSquare className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider">Total Feedbacks</p>
                <h3 className="text-xl font-extrabold text-foreground mt-0.5">{totalReceived}</h3>
              </div>
            </Card>

            <Card className="flex items-center gap-4 p-5">
              <div className="rounded-full bg-yellow-50 p-3 text-yellow-500">
                <Star className="h-6 w-6" fill="currentColor" />
              </div>
              <div>
                <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider">Average Rating</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xl font-extrabold text-foreground">{avgRating}</span>
                  <div className="flex text-yellow-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="h-3.5 w-3.5" fill={avgRating >= s ? "currentColor" : "none"} />
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="flex items-center gap-4 p-5">
              <div className="rounded-full bg-green-50 p-3 text-green-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider">Positive Feedback</p>
                <h3 className="text-xl font-extrabold text-foreground mt-0.5">{positiveRate}%</h3>
              </div>
            </Card>

            <Card className="flex items-center gap-4 p-5">
              <div className="rounded-full bg-red-50 p-3 text-red-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider">Negative Feedback</p>
                <h3 className="text-xl font-extrabold text-foreground mt-0.5">{negativeRate}%</h3>
              </div>
            </Card>
          </div>

          {/* Recharts Graphical Dashboards */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-5">
              <div className="flex items-center gap-2 border-b border-border/60 pb-3 mb-5">
                <BarChart3 className="h-4.5 w-4.5 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Average Rating by Category</h3>
              </div>
              <div className="h-64">
                {feedbacks.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    No data available.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 600 }} stroke="#9CA3AF" />
                      <YAxis domain={[0, 5]} tick={{ fontSize: 9 }} stroke="#9CA3AF" />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                      <Bar dataKey="avgRating" radius={[4, 4, 0, 0]} barSize={35}>
                        {barChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.avgRating >= 4 ? "#166534" : entry.avgRating >= 2.5 ? "#EAB308" : "#DC2626"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-2 border-b border-border/60 pb-3 mb-5">
                <PieIcon className="h-4.5 w-4.5 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Feedback Volume by Type</h3>
              </div>
              <div className="h-64">
                {pieChartData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    No data available.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="45%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                      <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 10, fontWeight: 600 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
          </div>

          {/* Feedback Management Table Card */}
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-3 mb-4.5 gap-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" /> Feedback Submissions
              </h3>
              
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  placeholder="Search user, comment..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-primary min-w-[150px]"
                />
                
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-primary"
                >
                  <option value="all">All Types</option>
                  {types.map(t => <option key={t} value={t}>{t}</option>)}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-primary"
                >
                  <option value="all">All Statuses</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Reviewed">Reviewed</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>
            </div>

            {filteredFeedbacks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground text-xs">
                No matching feedback found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border/60 text-xs">
                  <thead className="bg-secondary/25">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left font-bold text-muted-foreground uppercase">User</th>
                      <th scope="col" className="px-4 py-3 text-left font-bold text-muted-foreground uppercase">Type</th>
                      <th scope="col" className="px-4 py-3 text-left font-bold text-muted-foreground uppercase">Category</th>
                      <th scope="col" className="px-4 py-3 text-center font-bold text-muted-foreground uppercase">Rating</th>
                      <th scope="col" className="px-4 py-3 text-left font-bold text-muted-foreground uppercase">Comment</th>
                      <th scope="col" className="px-4 py-3 text-left font-bold text-muted-foreground uppercase">Status</th>
                      <th scope="col" className="px-4 py-3 text-center font-bold text-muted-foreground uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 bg-card">
                    {filteredFeedbacks.map((fb) => (
                      <tr key={fb.id} className="hover:bg-secondary/10 transition-colors">
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {fb.user_name}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold">{fb.feedback_type}</span>
                          {fb.session_title && (
                            <span className="block text-[10px] text-muted-foreground truncate max-w-[150px]">
                              {fb.session_title}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-medium">
                          {fb.category}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex items-center gap-0.5 text-yellow-400">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className="h-3 w-3"
                                fill={fb.rating >= star ? "currentColor" : "none"}
                              />
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-medium max-w-xs whitespace-normal break-words">
                          {fb.comment}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {getStatusBadge(fb.status)}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <div className="inline-flex gap-1">
                            {fb.status !== "Reviewed" && fb.status !== "Resolved" && (
                              <button
                                onClick={() => handleUpdateStatus(fb.id, "Reviewed")}
                                className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold border border-indigo-200"
                              >
                                Review
                              </button>
                            )}
                            {fb.status !== "Resolved" && (
                              <button
                                onClick={() => handleUpdateStatus(fb.id, "Resolved")}
                                className="px-2 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100 font-bold border border-green-200"
                              >
                                Resolve
                              </button>
                            )}
                            {fb.status === "Resolved" && (
                              <span className="text-[10px] text-muted-foreground font-bold italic">Resolved</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
