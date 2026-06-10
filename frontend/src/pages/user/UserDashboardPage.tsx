import { useState, useEffect } from "react";
import { FileText, CalendarClock, Wrench, Play, Loader2, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { PageHeader, Card, Button, Badge } from "@/components/common";
import { apiFetch } from "@/services/api";

interface UserProfile {
  id: number;
  full_name: string;
  email: string;
  role: string;
}

interface ContentItem {
  id: number;
  title: string;
  file_type: string;
  file_size: string;
  uploaded_at: string;
}

interface MeetingItem {
  id: number;
  title: string;
  meeting_date: string;
  start_time: string;
  status: string;
}

export function UserDashboardPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [recentDocs, setRecentDocs] = useState<ContentItem[]>([]);
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch current user profile
      const userProfile = await apiFetch<UserProfile>("/users/me");
      setProfile(userProfile);

      // 2. Fetch latest active content items from library
      const allItems = await apiFetch<ContentItem[]>("/content/items?sort=newest");
      if (allItems && allItems.length > 0) {
        setRecentDocs(allItems.slice(0, 3)); // Display top 3
      }

      // 3. Fetch user meetings
      const allMeetings = await apiFetch<MeetingItem[]>("/meetings/list");
      if (allMeetings && allMeetings.length > 0) {
        // Show up to 3 upcoming or scheduled meetings
        setMeetings(allMeetings.filter(m => m.status === "scheduled" || m.status === "pending").slice(0, 3));
      }
    } catch (err: any) {
      console.error("Dashboard error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        title={isLoading ? "Welcome back" : `Welcome back, ${profile?.full_name || "Sara"}`}
        subtitle="Pick up where you left off — your library and sessions are waiting."
      />

      <section className="mb-8 rounded-xl bg-gradient-to-r from-primary-soft to-card p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold">Continue your learning</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Explore professional content uploads curated by your workspace administrator.
            </p>
          </div>
          <Link to="/user/content">
            <Button>
              <Play className="h-4 w-4" /> Open Library
            </Button>
          </Link>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        {/* Recent Documents Card */}
        <Card className="!p-0 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h3 className="text-base font-semibold">Recent shared documents</h3>
            <Link to="/user/content" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
              Open library <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          
          {isLoading ? (
            <div className="flex h-44 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : recentDocs.length === 0 ? (
            <div className="flex h-44 flex-col items-center justify-center text-center p-4">
              <FileText className="h-8 w-8 text-muted-foreground/50 mb-1" />
              <p className="text-sm text-muted-foreground">No recent documents shared with you.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {recentDocs.map((doc) => (
                <li key={doc.id} className="flex items-center gap-3 px-6 py-4 hover:bg-secondary/50 transition-colors">
                  <div className="p-2 bg-primary-soft rounded-lg text-primary">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{doc.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Type: {doc.file_type} • Size: {doc.file_size} • Shared {new Date(doc.uploaded_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                    </p>
                  </div>
                  <Link to="/user/content" className="text-xs font-semibold text-primary hover:underline">
                    View
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Upcoming Meetings Card */}
        <Card className="!p-0">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h3 className="text-base font-semibold">Upcoming meetings</h3>
            <Link to="/user/meetings" className="text-xs font-semibold text-primary hover:underline">
              Request slot
            </Link>
          </div>
          {isLoading ? (
            <div className="flex h-44 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : meetings.length === 0 ? (
            <div className="flex h-44 flex-col items-center justify-center text-center p-4 text-sm text-muted-foreground">
              <CalendarClock className="h-8 w-8 text-muted-foreground/50 mb-2" />
              No upcoming scheduled meetings.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {meetings.map((m) => (
                <li key={m.id} className="px-6 py-4">
                  <p className="text-sm font-semibold text-foreground truncate">{m.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{m.meeting_date} @ {m.start_time}</p>
                  <div className="mt-3 flex gap-2">
                    <Badge tone={m.status === "scheduled" ? "success" : "warning"}>
                      {m.status}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section className="mt-8">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Available tools
        </h3>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {["SIP Calculator", "EMI Calculator", "Retirement Planner", "Tax Estimator"].map((t) => (
            <Card key={t}>
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <Wrench className="h-4 w-4" />
              </div>
              <h4 className="text-sm font-semibold">{t}</h4>
              <Link to="/user/tools" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
                Open →
              </Link>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}
