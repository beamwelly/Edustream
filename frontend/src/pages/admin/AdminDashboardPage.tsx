import { useState, useEffect } from "react";
import {
  Users,
  FileText,
  CalendarClock,
  UploadCloud,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { PageHeader, Card, StatCard, Badge } from "@/components/common";
import { apiFetch } from "@/services/api";
import { ResponsivePageWrapper } from "@/components/layout/ResponsivePageWrapper";


interface SuperKPIs {
  total_organizations: number;
  total_documents: number;
  upcoming_meetings: number;
  recent_uploads: number;
  activities: Array<{
    title: string;
    time: string;
    tone: "primary" | "success" | "neutral" | "warning";
    tag: string;
  }>;
  recent_uploads_list: Array<{
    name: string;
    size: string;
    type: string;
  }>;
}

export function AdminDashboardPage() {
  const [data, setData] = useState<SuperKPIs | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const kpis = await apiFetch<SuperKPIs>("/users/super-dashboard-kpis");
        setData(kpis);
      } catch (err) {
        console.error("Failed to load Admin dashboard KPIs:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  return (
    <ResponsivePageWrapper>
      <PageHeader
        title="System Overview"
        subtitle="A calm, real-time view of activity across all users."
      />

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Users} label="Total Users" value={String(data?.total_organizations || 0)} hint="Active on platform" />
            <StatCard icon={FileText} label="Uploaded Documents" value={String(data?.total_documents || 0)} hint="Across all libraries" />
            <StatCard icon={CalendarClock} label="Upcoming Meetings" value={String(data?.upcoming_meetings || 0)} hint="Scheduled sessions" />
            <StatCard icon={UploadCloud} label="Recent Uploads" value={String(data?.recent_uploads || 0)} hint="Total items" />
          </section>

          <section className="mt-8 grid gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2 p-0">
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <h3 className="text-base font-semibold">Recent Activity</h3>
                <Link to="/admin/users" className="text-sm font-medium text-primary hover:underline">
                  Manage Users
                </Link>
              </div>
              <ul className="divide-y divide-border">
                {data?.activities.map((a, i) => (
                  <li
                    key={i}
                    className="group flex items-center gap-4 px-6 py-4 transition-colors hover:bg-secondary/50"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-primary">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{a.title}</p>
                      <p className="text-xs text-muted-foreground">{a.time}</p>
                    </div>
                    <Badge tone={a.tone}>{a.tag}</Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-0">
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <h3 className="text-base font-semibold">Recent Uploads</h3>
                <Link to="/admin/content" className="text-sm font-medium text-primary hover:underline">
                  Library
                </Link>
              </div>
              <ul className="divide-y divide-border">
                {data?.recent_uploads_list.map((f, i) => (
                  <li key={i} className="flex items-center gap-3 px-6 py-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-xs font-semibold text-muted-foreground uppercase">
                      {f.type}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{f.name}</p>
                      <p className="text-xs text-muted-foreground">{f.size}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        </>
      )}
    </ResponsivePageWrapper>
  );
}
