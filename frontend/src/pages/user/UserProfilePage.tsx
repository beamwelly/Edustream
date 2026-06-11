import { useEffect, useState } from "react";
import { Loader2, Camera, User, Phone, Mail, Shield, Building2 } from "lucide-react";
import { PageHeader, Card, Button } from "@/components/common";
import { apiFetch } from "@/services/api";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

interface UserProfile {
  id: number;
  full_name: string;
  email: string;
  role: string;
  phone: string | null;
  profile_photo: string | null;
  organization_name: string | null;
  number_of_employees: number | null;
  department: string | null;
  years_of_experience: number | null;
  number_of_clients: number | null;
  aum: string | null;
  products_dealt_with: string | null;
  designation: string | null;
  is_active: boolean;
}

export function UserProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [department, setDepartment] = useState("");
  const [experience, setExperience] = useState(0);
  const [clients, setClients] = useState(0);
  const [aum, setAum] = useState("");
  const [products, setProducts] = useState("");
  const [designation, setDesignation] = useState("");
  
  // Notification Preferences States
  const [prefMasterclass, setPrefMasterclass] = useState(true);
  const [prefEmail, setPrefEmail] = useState(true);
  const [prefRecording, setPrefRecording] = useState(true);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch<UserProfile & {
        pref_masterclass_notifications: boolean;
        pref_email_notifications: boolean;
        pref_recording_notifications: boolean;
      }>("/users/me", { method: "GET" });
      if (data) {
        setProfile(data);
        setFullName(data.full_name || "");
        setPhone(data.phone || "");
        setProfilePhoto(data.profile_photo || "");
        setDepartment(data.department || "");
        setExperience(data.years_of_experience || 0);
        setClients(data.number_of_clients || 0);
        setAum(data.aum || "");
        setProducts(data.products_dealt_with || "");
        setDesignation(data.designation || "");
        setPrefMasterclass(data.pref_masterclass_notifications ?? true);
        setPrefEmail(data.pref_email_notifications ?? true);
        setPrefRecording(data.pref_recording_notifications ?? true);
      }
    } catch (err: any) {
      toast.error("Failed to load profile: " + (err.message || "Server error"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800 * 1024) {
        toast.warning("Profile photo must be smaller than 800KB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePhoto(reader.result as string);
        toast.success("New profile photo loaded. Remember to click Save Profile to persist it.");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
      setProfilePhoto(profile.profile_photo || "");
      setDepartment(profile.department || "");
      setExperience(profile.years_of_experience || 0);
      setClients(profile.number_of_clients || 0);
      setAum(profile.aum || "");
      setProducts(profile.products_dealt_with || "");
      setDesignation(profile.designation || "");
      
      const p = profile as any;
      setPrefMasterclass(p.pref_masterclass_notifications ?? true);
      setPrefEmail(p.pref_email_notifications ?? true);
      setPrefRecording(p.pref_recording_notifications ?? true);
      toast.info("Changes discarded.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName.trim()) {
      toast.warning("Name cannot be empty.");
      return;
    }

    if (profile?.role === "user") {
      if (!department.trim()) {
        toast.warning("Department field cannot be empty.");
        return;
      }
      if (experience < 0) {
        toast.warning("Years of experience cannot be negative.");
        return;
      }
      if (clients < 0) {
        toast.warning("Number of clients cannot be negative.");
        return;
      }
      if (!aum.trim()) {
        toast.warning("AUM details must be provided.");
        return;
      }
      if (!products.trim()) {
        toast.warning("Products description cannot be empty.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const updated = await apiFetch<UserProfile>("/users/me", {
        method: "PUT",
        body: JSON.stringify({
          full_name: fullName,
          phone: phone,
          profile_photo: profilePhoto,
          department: profile?.role === "user" ? department : undefined,
          years_of_experience: profile?.role === "user" ? experience : undefined,
          number_of_clients: profile?.role === "user" ? clients : undefined,
          aum: profile?.role === "user" ? aum : undefined,
          products_dealt_with: profile?.role === "user" ? products : undefined,
          designation: profile?.role === "user" ? designation : undefined,
          pref_masterclass_notifications: prefMasterclass,
          pref_email_notifications: prefEmail,
          pref_recording_notifications: prefRecording
        })
      });
      if (updated) {
        setProfile(updated);
        toast.success("Profile saved successfully!");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save profile changes.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const initials = fullName
    ? fullName.split(" ").map((n) => n[0]).join("").toUpperCase()
    : "U";

  return (
    <>
      <PageHeader title="Profile" subtitle="Keep your professional and contact details current." />

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Profile Overview Card */}
          <div className="lg:col-span-1">
            <Card className="text-center p-6 flex flex-col items-center">
              {/* Profile Photo Upload area */}
              <div className="relative group w-28 h-28 rounded-full overflow-hidden border border-border shadow bg-secondary flex items-center justify-center flex-shrink-0 mb-4">
                {profilePhoto ? (
                  <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-primary uppercase">{initials}</span>
                )}
                <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-xs text-white font-bold cursor-pointer transition-opacity">
                  <Camera className="h-5 w-5 mb-1" />
                  <span>Change Photo</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                </label>
              </div>

              <h3 className="text-lg font-bold text-foreground">{fullName || "User Account"}</h3>
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mt-1 px-2.5 py-0.5 rounded-full bg-primary-soft">
                {profile?.role === "admin" ? "Administrator" : designation || "Workspace Member"}
              </p>
              
              <div className="w-full border-t border-border/60 my-5 pt-5 space-y-3.5 text-left text-xs">
                <div className="flex items-center gap-2.5 text-muted-foreground">
                  <Mail className="h-4 w-4 text-primary/70 flex-shrink-0" />
                  <span className="truncate">{profile?.email}</span>
                </div>
                <div className="flex items-center gap-2.5 text-muted-foreground">
                  <Phone className="h-4 w-4 text-primary/70 flex-shrink-0" />
                  <span>{phone || "No phone provided"}</span>
                </div>
                <div className="flex items-center gap-2.5 text-muted-foreground">
                  <Building2 className="h-4 w-4 text-primary/70 flex-shrink-0" />
                  <span className="truncate">{profile?.organization_name || "Masterclass Platform"}</span>
                </div>
                <div className="flex items-center gap-2.5 text-muted-foreground">
                  <Shield className="h-4 w-4 text-primary/70 flex-shrink-0" />
                  <span className="capitalize">{profile?.role} Role</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Form Card */}
          <div className="lg:col-span-2">
            <Card>
              <h3 className="text-base font-bold text-foreground mb-4.5 border-b border-border/60 pb-3">Edit Details</h3>
              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid gap-5 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold text-muted-foreground">Full Name *</span>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary transition"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold text-muted-foreground">Phone Number</span>
                    <input
                      type="tel"
                      value={phone}
                      placeholder="e.g. +91 9876543210"
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary transition"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold text-muted-foreground text-muted-foreground/60">Email (Read Only)</span>
                    <input
                      type="text"
                      disabled
                      value={profile?.email || ""}
                      className="w-full rounded-lg border border-border bg-secondary/35 px-3 py-2.5 text-sm outline-none cursor-not-allowed text-muted-foreground/60 font-medium"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold text-muted-foreground text-muted-foreground/60">Organization (Read Only)</span>
                    <input
                      type="text"
                      disabled
                      value={profile?.organization_name || ""}
                      className="w-full rounded-lg border border-border bg-secondary/35 px-3 py-2.5 text-sm outline-none cursor-not-allowed text-muted-foreground/60 font-medium"
                    />
                  </label>
                  
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold text-muted-foreground text-muted-foreground/60">Role (Read Only)</span>
                    <input
                      type="text"
                      disabled
                      value={profile?.role ? profile.role.toUpperCase() : ""}
                      className="w-full rounded-lg border border-border bg-secondary/35 px-3 py-2.5 text-sm outline-none cursor-not-allowed text-muted-foreground/60 font-medium uppercase font-mono"
                    />
                  </label>
                </div>

                {/* Conditional Professional Fields for Standard Users */}
                {profile?.role === "user" && (
                  <div className="mt-6 border-t border-border/60 pt-6 space-y-5">
                    <h4 className="text-sm font-bold text-foreground">Professional Profile</h4>
                    <div className="grid gap-5 md:grid-cols-2">
                      <label className="block">
                        <span className="mb-1.5 block text-sm font-semibold text-muted-foreground">Department *</span>
                        <input
                          type="text"
                          required
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary transition"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-sm font-semibold text-muted-foreground">Years of experience *</span>
                        <input
                          type="number"
                          required
                          min="0"
                          value={experience}
                          onChange={(e) => setExperience(parseInt(e.target.value) || 0)}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary transition"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-sm font-semibold text-muted-foreground">Number of clients *</span>
                        <input
                          type="number"
                          required
                          min="0"
                          value={clients}
                          onChange={(e) => setClients(parseInt(e.target.value) || 0)}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary transition"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-sm font-semibold text-muted-foreground">AUM managed *</span>
                        <input
                          type="text"
                          required
                          value={aum}
                          onChange={(e) => setAum(e.target.value)}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary transition"
                        />
                      </label>

                      <label className="block md:col-span-2">
                        <span className="mb-1.5 block text-sm font-semibold text-muted-foreground">Products dealt with *</span>
                        <input
                          type="text"
                          required
                          value={products}
                          onChange={(e) => setProducts(e.target.value)}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary transition"
                        />
                      </label>

                      <label className="block md:col-span-2">
                        <span className="mb-1.5 block text-sm font-semibold text-muted-foreground">Designation / Role (Optional)</span>
                        <input
                          type="text"
                          value={designation}
                          onChange={(e) => setDesignation(e.target.value)}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary transition"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {/* Notification Settings section */}
                <div className="mt-6 border-t border-border/60 pt-6 space-y-4">
                  <h4 className="text-sm font-bold text-foreground">Notification Preferences</h4>
                  <div className="space-y-4">
                    <label className="flex items-start gap-3.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={prefMasterclass}
                        onChange={(e) => setPrefMasterclass(e.target.checked)}
                        className="mt-0.5 rounded border-border text-primary focus:ring-primary h-4.5 w-4.5 cursor-pointer"
                      />
                      <div>
                        <span className="text-sm font-semibold text-foreground">Masterclass Announcements</span>
                        <p className="text-xs text-muted-foreground">Receive updates for new scheduled webinars and live events.</p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={prefEmail}
                        onChange={(e) => setPrefEmail(e.target.checked)}
                        className="mt-0.5 rounded border-border text-primary focus:ring-primary h-4.5 w-4.5 cursor-pointer"
                      />
                      <div>
                        <span className="text-sm font-semibold text-foreground">Email Notifications</span>
                        <p className="text-xs text-muted-foreground">Receive reminders and details via your registered email address.</p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={prefRecording}
                        onChange={(e) => setPrefRecording(e.target.checked)}
                        className="mt-0.5 rounded border-border text-primary focus:ring-primary h-4.5 w-4.5 cursor-pointer"
                      />
                      <div>
                        <span className="text-sm font-semibold text-foreground">Recording Notifications</span>
                        <p className="text-xs text-muted-foreground">Get notified when a webinar cloud recording becomes available for playback.</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="mt-8 flex justify-end gap-2.5 border-t border-border/60 pt-5">
                  <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground hover:bg-primary/95">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-1.5 inline" /> Saving...
                      </>
                    ) : (
                      "Save Profile"
                    )}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
