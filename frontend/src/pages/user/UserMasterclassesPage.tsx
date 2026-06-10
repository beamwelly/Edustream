import { useState, useEffect, useRef } from "react";
import { 
  Calendar, 
  Play, 
  Video, 
  X, 
  Loader2, 
  Clock, 
  Search, 
  Tag, 
  CheckCircle, 
  User as UserIcon, 
  Award,
  BookOpen
} from "lucide-react";
import { PageHeader, Card, Button, Badge } from "@/components/common";
import { API_URL } from "@/constants/env";
import { toast } from "sonner";

interface Masterclass {
  masterclass_id: number;
  title: string;
  description?: string;
  speaker?: string;
  scheduled_at: string;
  duration_minutes: number;
  zoom_webinar_id?: string;
  zoom_join_url?: string;
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

interface WatchProgress {
  last_position_seconds: number;
  max_position_seconds: number;
  completion_percentage: number;
}

export function UserMasterclassesPage() {
  const [masterclasses, setMasterclasses] = useState<Masterclass[]>([]);
  const [registrations, setRegistrations] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [nowTime, setNowTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Video Player Modal State
  const [activeMasterclass, setActiveMasterclass] = useState<Masterclass | null>(null);
  const [initialSeekTime, setInitialSeekTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSavedTimeRef = useRef<number>(0);
  const maxPositionRef = useRef<number>(0);

  const fetchMasterclasses = async () => {
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${API_URL}/api/masterclasses`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data: Masterclass[] = await res.json();
        setMasterclasses(data);
        
        // Fetch registration status for each upcoming masterclass
        const updatedRegs: Record<number, boolean> = {};
        for (const mc of data) {
          if (mc.status === "upcoming" || mc.status === "live") {
            try {
              const regRes = await fetch(`${API_URL}/api/masterclasses/${mc.masterclass_id}/registrations`, {
                headers: { "Authorization": `Bearer ${token}` }
              });
              if (regRes.ok) {
                const regData: { user_id: number; email: string }[] = await regRes.json();
                // Check if current user email is in the list
                const currentUserJson = localStorage.getItem("user");
                if (currentUserJson) {
                  const currentUser = JSON.parse(currentUserJson);
                  const isUserRegistered = regData.some(r => r.user_id === currentUser.id || r.email === currentUser.email);
                  updatedRegs[mc.masterclass_id] = isUserRegistered;
                }
              }
            } catch (err) {
              console.error(`Error fetching registrations for webinar ${mc.masterclass_id}`, err);
            }
          }
        }
        setRegistrations(updatedRegs);
      } else {
        console.error("Failed to load masterclasses");
      }
    } catch (err) {
      console.error("Error fetching masterclasses:", err);
      toast.error("Failed to fetch sessions. Connection error.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMasterclasses();
  }, []);

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

  const handleRegister = async (masterclassId: number) => {
    try {
      const res = await fetch(`${API_URL}/api/masterclasses/${masterclassId}/register`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token") || ""}`,
          "Content-Type": "application/json"
        }
      });
      if (res.ok) {
        toast.success("Successfully registered for this Masterclass!");
        setRegistrations(prev => ({ ...prev, [masterclassId]: true }));
      } else {
        const data = await res.json();
        toast.error(data.detail || "Registration failed.");
      }
    } catch (err) {
      toast.error("An error occurred during registration.");
    }
  };

  const handleJoinWebinar = async (masterclassId: number) => {
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${API_URL}/api/masterclasses/${masterclassId}/join`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.join_url) {
          window.open(data.join_url, "_blank");
        } else {
          toast.error("Join URL not found.");
        }
      } else {
        const err = await res.json();
        toast.error(err.detail || "Failed to join webinar.");
      }
    } catch (e) {
      toast.error("An error occurred while trying to join the webinar.");
    }
  };

  // Watch Progress API triggers
  const saveProgress = async (currentTime: number, maxTime: number, percentage: number) => {
    if (!activeMasterclass) return;
    try {
      await fetch(`${API_URL}/api/masterclasses/${activeMasterclass.masterclass_id}/progress`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token") || ""}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          last_position_seconds: currentTime,
          max_position_seconds: maxTime,
          completion_percentage: percentage
        })
      });
      lastSavedTimeRef.current = currentTime;
    } catch (err) {
      console.error("Failed to sync watch progress:", err);
    }
  };

  const handleOpenVideo = async (mc: Masterclass) => {
    setInitialSeekTime(0);
    maxPositionRef.current = 0;
    lastSavedTimeRef.current = 0;
    setActiveMasterclass(mc);
    
    // Fetch last watched progress
    try {
      const res = await fetch(`${API_URL}/api/masterclasses/${mc.masterclass_id}/progress`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
        }
      });
      if (res.ok) {
        const progress: WatchProgress = await res.json();
        if (progress.last_position_seconds > 0) {
          setInitialSeekTime(progress.last_position_seconds);
          maxPositionRef.current = progress.max_position_seconds;
          toast.info(`Resuming playback from ${Math.floor(progress.last_position_seconds / 60)}m ${Math.floor(progress.last_position_seconds % 60)}s`);
        }
      }
    } catch (err) {
      console.error("Error fetching watch progress:", err);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current && initialSeekTime > 0) {
      videoRef.current.currentTime = initialSeekTime;
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    const current = video.currentTime;
    const duration = video.duration || 1;
    maxPositionRef.current = Math.max(maxPositionRef.current, current);
    const percentage = (maxPositionRef.current / duration) * 100;

    // Periodic auto-save progress every 5 seconds
    if (Math.abs(current - lastSavedTimeRef.current) >= 5) {
      saveProgress(current, maxPositionRef.current, percentage);
    }
  };

  const handleVideoClose = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const duration = videoRef.current.duration || 1;
      maxPositionRef.current = Math.max(maxPositionRef.current, current);
      const percentage = (maxPositionRef.current / duration) * 100;
      saveProgress(current, maxPositionRef.current, percentage);
    }
    setActiveMasterclass(null);
    setIsPlaying(false);
  };

  // Filter and Search
  const categories = ["All", ...Array.from(new Set(masterclasses.map(m => m.category || "General").filter(Boolean)))];

  const filteredMasterclasses = masterclasses.filter(mc => {
    const matchesSearch = 
      mc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (mc.description && mc.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (mc.speaker && mc.speaker.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (mc.tags && mc.tags.toLowerCase().includes(searchQuery.toLowerCase()));
      
    const matchesCategory = 
      selectedCategory === "All" || 
      (mc.category || "General") === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const upcomingSessions = filteredMasterclasses.filter(
    (m) => m.status === "upcoming" || m.status === "live"
  );
  const recordedSessions = filteredMasterclasses.filter(
    (m) => (m.status === "recorded" || m.status === "completed") && m.recording_url
  );

  return (
    <>
      <PageHeader 
        title="Masterclasses" 
        subtitle="Join live interactive sessions and watch on-demand recordings of professional classes." 
      />

      {/* Categories and Search bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between mt-6 mb-8">
        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-1 scrollbar-thin scrollbar-thumb-border">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategory === cat 
                  ? "bg-primary text-white shadow-sm"
                  : "bg-secondary hover:bg-secondary-hover text-muted-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
          <input
            type="text"
            placeholder="Search topic, speaker, tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-border bg-background text-xs outline-none focus:border-primary transition"
          />
        </div>
      </div>

      <div className="space-y-12">
        {/* Upcoming Section */}
        <section>
          <h3 className="mb-6 text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2.5">
            <Calendar className="h-4 w-4 text-primary" /> Upcoming Sessions
          </h3>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : upcomingSessions.length === 0 ? (
            <Card className="text-center py-12 border border-dashed border-border/80 bg-secondary/10">
              <p className="text-xs text-muted-foreground">No upcoming live sessions matching your selection.</p>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {upcomingSessions.map((s) => (
                <Card key={s.masterclass_id} className="flex flex-col justify-between hover:border-primary/20 transition-all duration-200 group relative overflow-hidden">
                  {s.thumbnail_url && (
                    <div className="relative w-full h-44 -mx-6 -mt-6 mb-4 overflow-hidden">
                      <img 
                        src={s.thumbnail_url} 
                        alt={s.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    </div>
                  )}
                  
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <Badge tone={s.status === "live" ? "warning" : "primary"}>
                        {s.status === "live" ? "LIVE NOW" : "UPCOMING"}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {s.duration_minutes} Mins
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">{s.title}</h4>
                    
                    {s.speaker && (
                      <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-primary">
                        <UserIcon className="h-3.5 w-3.5" />
                        <span>{s.speaker}</span>
                      </div>
                    )}

                    {s.description && (
                      <p className="mt-2.5 text-xs text-muted-foreground leading-relaxed line-clamp-3">
                        {s.description}
                      </p>
                    )}

                    {s.learning_outcomes && (
                      <div className="mt-4 p-3 bg-secondary/40 rounded-xl">
                        <div className="text-[11px] font-bold text-foreground flex items-center gap-1 mb-1">
                          <BookOpen className="h-3.5 w-3.5 text-primary" /> Learning Outcomes
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-normal">{s.learning_outcomes}</p>
                      </div>
                    )}

                    {s.tags && (
                      <div className="flex flex-wrap gap-1.5 mt-4">
                        {s.tags.split(",").map(t => (
                          <span key={t} className="px-2 py-0.5 rounded bg-secondary text-[9px] font-semibold text-muted-foreground flex items-center gap-1">
                            <Tag className="h-2.5 w-2.5" /> {t.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-border/60 pt-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-foreground">
                        {formatDate(s.scheduled_at)}
                      </span>
                      {(() => {
                        if (!registrations[s.masterclass_id]) return null;
                        const scheduledDate = new Date(s.scheduled_at);
                        const diffMs = scheduledDate.getTime() - nowTime.getTime();
                        
                        if (diffMs > 0) {
                          const diffSecs = Math.floor(diffMs / 1000);
                          const hours = Math.floor(diffSecs / 3600);
                          const minutes = Math.floor((diffSecs % 3600) / 60);
                          const seconds = diffSecs % 60;
                          const countdownText = hours > 0 
                            ? `${hours}h ${minutes}m` 
                            : `${minutes}m ${seconds}s`;
                            
                          return (
                            <span className="text-[10px] text-muted-foreground mt-0.5 animate-pulse">
                              Webinar has not started yet. Starts in: <strong className="text-primary font-bold">{countdownText}</strong>
                            </span>
                          );
                        } else if (s.status === "upcoming") {
                          return (
                            <span className="text-[10px] text-amber-600 font-semibold mt-0.5 animate-pulse">
                              Waiting for host to start...
                            </span>
                          );
                        } else if (s.status === "live") {
                          return (
                            <span className="text-[10px] text-red-600 font-bold mt-0.5 animate-pulse flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-ping" /> Live Now!
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    <div className="flex gap-2 items-center self-end sm:self-center">
                      {!registrations[s.masterclass_id] ? (
                        <Button 
                          size="sm" 
                          onClick={() => handleRegister(s.masterclass_id)} 
                          className="font-bold text-xs bg-primary text-white hover:bg-primary/95"
                        >
                          Register Now
                        </Button>
                      ) : (() => {
                        const scheduledDate = new Date(s.scheduled_at);
                        const diffMs = scheduledDate.getTime() - nowTime.getTime();
                        
                        if (diffMs > 0) {
                          return (
                            <Button 
                              size="sm" 
                              disabled 
                              className="font-bold text-xs bg-muted text-muted-foreground cursor-not-allowed"
                            >
                              Starts Soon
                            </Button>
                          );
                        } else if (s.status === "upcoming") {
                          return (
                            <Button 
                              size="sm" 
                              disabled 
                              className="font-bold text-xs bg-muted text-muted-foreground cursor-not-allowed"
                            >
                              Join Webinar
                            </Button>
                          );
                        } else {
                          return (
                            <Button 
                              size="sm" 
                              onClick={() => handleJoinWebinar(s.masterclass_id)}
                              className="font-bold text-xs bg-red-600 hover:bg-red-700 text-white shadow-md animate-bounce"
                            >
                              Join Webinar
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

        {/* Recorded Section */}
        <section>
          <h3 className="mb-6 text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2.5">
            <Video className="h-4 w-4 text-primary" /> Recorded Classes
          </h3>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : recordedSessions.length === 0 ? (
            <Card className="text-center py-12 border border-dashed border-border/80 bg-secondary/10">
              <p className="text-xs text-muted-foreground">No recorded sessions available matching selection.</p>
            </Card>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {recordedSessions.map((r) => (
                <Card key={r.masterclass_id} className="!p-0 overflow-hidden flex flex-col justify-between hover:border-primary/20 transition-all duration-200 group relative">
                  <div className="relative flex aspect-video items-center justify-center bg-zinc-950 overflow-hidden">
                    {r.thumbnail_url ? (
                      <img 
                        src={r.thumbnail_url} 
                        alt={r.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <Video className="h-10 w-10 text-zinc-700" />
                    )}
                    
                    <button 
                      onClick={() => handleOpenVideo(r)}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/50 transition-colors"
                    >
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg transform scale-90 hover:scale-100 transition-all duration-200">
                        <Play className="h-5 w-5 fill-current ml-0.5" />
                      </span>
                    </button>
                  </div>
                  
                  <div className="p-4 flex flex-col justify-between flex-grow">
                    <div>
                      <span className="text-[9px] font-bold text-primary uppercase tracking-wide">{r.category || "General"}</span>
                      <h4 className="line-clamp-2 text-sm font-bold text-foreground mt-0.5 leading-snug group-hover:text-primary transition-colors">{r.title}</h4>
                      
                      {r.speaker && (
                        <p className="text-xs text-muted-foreground font-semibold mt-1">with {r.speaker}</p>
                      )}
                    </div>
                    
                    <div className="mt-4 pt-3 border-t border-border/60">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold">
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {r.duration_minutes} Mins</span>
                        <span>{new Date(r.scheduled_at).toLocaleDateString()}</span>
                      </div>
                      
                      <Button 
                        variant="outline" 
                        onClick={() => handleOpenVideo(r)}
                        className="mt-3 w-full font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
                      >
                        <Play className="h-3.5 w-3.5 text-primary" /> Watch Recording
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Cloud Video Streaming Modal */}
      {activeMasterclass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl bg-zinc-950 rounded-3xl overflow-hidden shadow-2xl border border-zinc-800 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={handleVideoClose}
                className="p-2 rounded-full bg-black/60 text-white hover:bg-black/80 hover:scale-105 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Custom styled HTML5 Player */}
            <div className="aspect-video w-full bg-black relative">
              <video
                ref={videoRef}
                src={`${API_URL}/api/masterclasses/${activeMasterclass.masterclass_id}/stream`}
                controls
                autoPlay
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                className="w-full h-full object-contain"
              >
                Your browser does not support Zoom Cloud MP4 streaming.
              </video>
            </div>

            {/* Video Details Pane */}
            <div className="p-6 bg-zinc-900 border-t border-zinc-850">
              <div className="flex flex-wrap gap-2 mb-2">
                <Badge tone="primary">{activeMasterclass.category || "General"}</Badge>
                <span className="text-xs text-zinc-400 font-semibold flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> {activeMasterclass.duration_minutes} Mins
                </span>
              </div>
              <h3 className="text-lg font-bold text-white leading-snug">{activeMasterclass.title}</h3>
              {activeMasterclass.speaker && (
                <p className="text-xs text-primary font-bold mt-1">Hosted by {activeMasterclass.speaker}</p>
              )}
              {activeMasterclass.description && (
                <p className="mt-3 text-xs text-zinc-400 leading-relaxed max-h-24 overflow-y-auto pr-1">
                  {activeMasterclass.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
