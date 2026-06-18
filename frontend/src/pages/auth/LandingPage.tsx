import { Link } from "@tanstack/react-router";
import { 
  BookOpen, 
  Calendar, 
  Award, 
  BarChart3, 
  Shield, 
  FolderLock, 
  CheckCircle2, 
  ArrowRight,
  TrendingUp,
  Clock,
  Check
} from "lucide-react";
import { Button } from "@/components/common";
import { APP_NAME, APP_TAGLINE, APP_LOGO } from "@/constants/branding";

export function LandingPage() {
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="relative min-h-screen bg-[#FFF7F7] text-[#1F2937] flex flex-col justify-between overflow-x-hidden selection:bg-[#E53935]/20 font-sans">
      
      {/* Premium Light Header */}
      <header className="sticky top-0 z-50 w-full border-b border-[#E5E7EB] bg-white/90 backdrop-blur-md shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-4 md:py-0 md:h-20 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0">
          <div 
            className="flex flex-col md:flex-row items-center gap-3 cursor-pointer text-center md:text-left" 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <img 
              src={APP_LOGO} 
              alt="Masterclass Logo" 
              className="w-24 sm:w-28 md:w-32 lg:w-40 h-auto object-contain mx-auto md:mx-0" 
            />
            <div className="text-center md:text-left">
              <h1 className="text-lg md:text-xl font-bold tracking-tight text-[#1F2937]">{APP_NAME}</h1>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground tracking-wider uppercase font-semibold">{APP_TAGLINE}</p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-semibold text-[#4B5563]">
            <button onClick={() => scrollToSection("features")} className="hover:text-[#E53935] transition-colors">Features</button>
            <button onClick={() => scrollToSection("benefits")} className="hover:text-[#E53935] transition-colors">Benefits</button>
            <button onClick={() => scrollToSection("testimonials")} className="hover:text-[#E53935] transition-colors">Testimonials</button>
            <button onClick={() => scrollToSection("footer")} className="hover:text-[#E53935] transition-colors">Contact</button>
          </nav>

          {/* Actions */}
          <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
            <Link 
              to="/login"
              className="w-full md:w-auto text-center text-sm font-bold text-[#4B5563] hover:text-[#E53935] transition-colors px-4 py-2.5 border border-gray-200 md:border-none rounded-xl md:rounded-none"
            >
              Login
            </Link>
            <Link
              to="/login"
              className="w-full md:w-auto text-center inline-flex items-center justify-center rounded-xl bg-[#E53935] hover:bg-[#FF5A5F] px-5 py-2.5 text-sm font-bold text-white shadow-md transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Enterprise Hero Section */}
      <section className="relative z-10 w-full bg-gradient-to-b from-white to-[#FFF7F7] py-16 md:py-20 lg:py-28 border-b border-[#E5E7EB]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Left Hero Content */}
            <div className="lg:col-span-7 flex flex-col space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E53935]/10 border border-[#E53935]/20 text-[#E53935] text-xs font-bold w-fit shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#E53935]" />
                Next Generation Enterprise LMS
              </div>
              
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] text-[#1F2937]">
                Learning That Drives <br />
                <span className="text-[#E53935]">Business Performance</span>
              </h2>
              
              <p className="text-base sm:text-lg lg:text-xl text-[#4B5563] leading-relaxed max-w-2xl font-normal">
                Empower employees with curated learning, masterclasses, knowledge sharing, and collaborative growth. Simple to configure, built for fast delivery.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4 w-full sm:w-auto">
                <Link
                  to="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-[#E53935] hover:bg-[#FF5A5F] px-8 py-4 text-base font-bold text-white shadow-lg shadow-[#E53935]/20 transition-all hover:-translate-y-0.5"
                >
                  Login to Workspace
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
                <button
                  onClick={() => scrollToSection("features")}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-[#E5E7EB] bg-white hover:bg-[#F5F5F5] rounded-xl px-8 py-4 text-base font-bold text-[#4B5563] transition-all"
                >
                  Explore Features
                </button>
              </div>
            </div>

            {/* Right Hero Illustration (Custom Dashboard Mockup) */}
            <div className="lg:col-span-5">
              <div className="relative rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-xl overflow-hidden hover:scale-[1.01] transition-transform duration-500">
                {/* Fake browser bar */}
                <div className="flex items-center gap-2 border-b border-[#F5F5F5] pb-4 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                  <div className="ml-4 h-5 w-40 rounded-md bg-[#F5F5F5]" />
                </div>
                
                {/* Visual stats and UI items */}
                <div className="space-y-4">
                  <div className="bg-[#FFF7F7] border border-[#E53935]/10 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#E53935] text-white flex items-center justify-center font-bold">
                        M
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#1F2937]">Masterclass Live</h4>
                        <p className="text-xs text-[#4B5563]">Masterclasses & Meetings</p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold px-2 py-1 rounded bg-white text-[#E53935] border border-[#E53935]/20">Active</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="border border-[#E5E7EB] rounded-xl p-4 bg-white">
                      <div className="flex items-center gap-2 text-[#E53935] mb-2">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Completion Rate</span>
                      </div>
                      <p className="text-2xl font-extrabold text-[#1F2937]">94.2%</p>
                    </div>

                    <div className="border border-[#E5E7EB] rounded-xl p-4 bg-white">
                      <div className="flex items-center gap-2 text-emerald-600 mb-2">
                        <Clock className="h-4 w-4" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Hours Logged</span>
                      </div>
                      <p className="text-2xl font-extrabold text-[#1F2937]">1,420 hrs</p>
                    </div>
                  </div>

                  {/* Curated list preview */}
                  <div className="border border-[#E5E7EB] rounded-xl p-4 space-y-3 bg-white">
                    <h5 className="text-xs font-bold text-[#1F2937] uppercase tracking-wider text-muted-foreground">Recent Curated Assets</h5>
                    <div className="flex items-center justify-between text-xs py-1 border-b border-[#F5F5F5]">
                      <span className="font-semibold text-[#1F2937]">Quarterly_Review.pptx</span>
                      <span className="text-[#E53935] font-semibold bg-[#FFF7F7] px-1.5 py-0.5 rounded">PPTX Preview</span>
                    </div>
                    <div className="flex items-center justify-between text-xs py-1">
                      <span className="font-semibold text-[#1F2937]">Onboarding_Manual.docx</span>
                      <span className="text-[#E53935] font-semibold bg-[#FFF7F7] px-1.5 py-0.5 rounded">DOCX Preview</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Metrics Section */}
      <section className="w-full bg-[#F5F5F5] border-y border-[#E5E7EB] py-12">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div className="space-y-1">
            <p className="text-4xl font-extrabold text-[#E53935]">150+</p>
            <p className="text-sm text-[#4B5563] font-semibold">Companies Onboarded</p>
          </div>
          <div className="space-y-1">
            <p className="text-4xl font-extrabold text-[#E53935]">25,000+</p>
            <p className="text-sm text-[#4B5563] font-semibold">Employees Trained</p>
          </div>
          <div className="space-y-1">
            <p className="text-4xl font-extrabold text-[#E53935]">10,000+</p>
            <p className="text-sm text-[#4B5563] font-semibold">Learning Resources</p>
          </div>
          <div className="space-y-1">
            <p className="text-4xl font-extrabold text-[#E53935]">50,000+</p>
            <p className="text-sm text-[#4B5563] font-semibold">Sessions Conducted</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="w-full bg-white py-20 lg:py-28">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12 text-center">
          <div className="max-w-3xl mx-auto space-y-4 mb-16">
            <h3 className="text-3xl sm:text-4xl font-extrabold text-[#1F2937]">
              Engineered for Enterprise Training
            </h3>
            <p className="text-[#4B5563] text-base leading-relaxed">
              Masterclass provides administrative coordinators and learners with an intuitive system to host materials, schedule classes, track milestones, and secure documentation.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 text-left">
            {/* Content Library */}
            <div className="border border-[#E5E7EB] bg-[#FFF7F7]/30 rounded-2xl p-8 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-[#E53935]/10 border border-[#E53935]/20 text-[#E53935] flex items-center justify-center mb-6">
                <BookOpen className="h-6 w-6" />
              </div>
              <h4 className="text-xl font-bold text-[#1F2937] mb-3">Content Library</h4>
              <p className="text-[#4B5563] text-sm leading-relaxed">
                Render rich document previews including PDF, DOCX, XLSX, and PPTX with our highly optimized client-side viewer components.
              </p>
            </div>

            {/* Masterclasses */}
            <div className="border border-[#E5E7EB] bg-[#FFF7F7]/30 rounded-2xl p-8 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-[#E53935]/10 border border-[#E53935]/20 text-[#E53935] flex items-center justify-center mb-6">
                <Award className="h-6 w-6" />
              </div>
              <h4 className="text-xl font-bold text-[#1F2937] mb-3">Masterclasses</h4>
              <p className="text-[#4B5563] text-sm leading-relaxed">
                Stream structured expert-led lectures and comprehensive video programs categorized specifically for organization objectives.
              </p>
            </div>

            {/* Meeting Scheduler */}
            <div className="border border-[#E5E7EB] bg-[#FFF7F7]/30 rounded-2xl p-8 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-[#E53935]/10 border border-[#E53935]/20 text-[#E53935] flex items-center justify-center mb-6">
                <Calendar className="h-6 w-6" />
              </div>
              <h4 className="text-xl font-bold text-[#1F2937] mb-3">Meeting Scheduler</h4>
              <p className="text-[#4B5563] text-sm leading-relaxed">
                Coordinate and invite teams to sync events. Integrated seamlessly with calendar links for automatic notifications.
              </p>
            </div>

            {/* Knowledge Hub */}
            <div className="border border-[#E5E7EB] bg-[#FFF7F7]/30 rounded-2xl p-8 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-[#E53935]/10 border border-[#E53935]/20 text-[#E53935] flex items-center justify-center mb-6">
                <Shield className="h-6 w-6" />
              </div>
              <h4 className="text-xl font-bold text-[#1F2937] mb-3">Knowledge Hub</h4>
              <p className="text-[#4B5563] text-sm leading-relaxed">
                Search, filter, categorize, and download important organizational references dynamically from one secure location.
              </p>
            </div>

            {/* Progress Tracking */}
            <div className="border border-[#E5E7EB] bg-[#FFF7F7]/30 rounded-2xl p-8 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-[#E53935]/10 border border-[#E53935]/20 text-[#E53935] flex items-center justify-center mb-6">
                <BarChart3 className="h-6 w-6" />
              </div>
              <h4 className="text-xl font-bold text-[#1F2937] mb-3">Progress Tracking</h4>
              <p className="text-[#4B5563] text-sm leading-relaxed">
                Auditors and managers monitor active KPIs, complete training audits, and analyze company learning rates.
              </p>
            </div>

            {/* Private Asset Storage */}
            <div className="border border-[#E5E7EB] bg-[#FFF7F7]/30 rounded-2xl p-8 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-[#E53935]/10 border border-[#E53935]/20 text-[#E53935] flex items-center justify-center mb-6">
                <FolderLock className="h-6 w-6" />
              </div>
              <h4 className="text-xl font-bold text-[#1F2937] mb-3">Private Asset Storage</h4>
              <p className="text-[#4B5563] text-sm leading-relaxed">
                Files and media are stored securely under strict permissions, ensuring proprietary business materials remain confidential.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="w-full bg-[#FFF7F7] py-20 lg:py-28 border-t border-[#E5E7EB]">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <h3 className="text-3xl sm:text-4xl font-extrabold text-[#1F2937]">
              Empowering Every Member of Your Organization
            </h3>
            <p className="text-[#4B5563] text-base">
              Masterclass streamlines delivery systems for operational coordinators while presenting an interactive learning portal for employees.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {/* For Organizations */}
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 space-y-4 shadow-sm">
              <h4 className="text-lg font-bold text-[#E53935]">For Organizations</h4>
              <ul className="space-y-3">
                {["Centralized learning hub", "Protected company data", "Minimized onboarding costs", "Scalable infrastructure"].map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm text-[#4B5563]">
                    <CheckCircle2 className="h-4.5 w-4.5 text-[#E53935] shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* For HR Teams */}
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 space-y-4 shadow-sm">
              <h4 className="text-lg font-bold text-[#E53935]">For HR Teams</h4>
              <ul className="space-y-3">
                {["Simplified user rostering", "Automated email invites", "Real-time auditing graphs", "Instant training verification"].map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm text-[#4B5563]">
                    <CheckCircle2 className="h-4.5 w-4.5 text-[#E53935] shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* For Employees */}
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 space-y-4 shadow-sm">
              <h4 className="text-lg font-bold text-[#E53935]">For Employees</h4>
              <ul className="space-y-3">
                {["Intuitive study interface", "First-slide file previews", "Self-paced expert courses", "Simple calendar scheduler"].map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm text-[#4B5563]">
                    <CheckCircle2 className="h-4.5 w-4.5 text-[#E53935] shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* For Professional Development */}
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 space-y-4 shadow-sm">
              <h4 className="text-lg font-bold text-[#E53935]">For Professional Dev</h4>
              <ul className="space-y-3">
                {["Curated study materials", "Direct sync with instructors", "HD stream masterclasses", "Verified skill metrics"].map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm text-[#4B5563]">
                    <CheckCircle2 className="h-4.5 w-4.5 text-[#E53935] shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="w-full bg-white py-20 lg:py-28 border-t border-[#E5E7EB]">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <h3 className="text-3xl sm:text-4xl font-extrabold text-[#1F2937]">Validated by Learning Leaders</h3>
            <p className="text-[#4B5563] text-base">Here is how operational specialists utilize our platform to coordinate materials.</p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 max-w-5xl mx-auto">
            <div className="border border-[#E5E7EB] bg-[#FFF7F7]/20 rounded-2xl p-8 space-y-4 flex flex-col justify-between shadow-sm">
              <p className="text-[#4B5563] text-sm italic leading-relaxed">
                "Masterclass simplified how our regional branches exchange documentation and sync training schedules. Being able to review complex spreadsheets and PPTX slides directly on the web has cut down resource bottlenecks by 75%."
              </p>
              <div>
                <h5 className="text-sm font-bold text-[#1F2937]">Rebecca Thompson</h5>
                <p className="text-xs text-muted-foreground">Vice President of People Operations, Apex Financial</p>
              </div>
            </div>

            <div className="border border-[#E5E7EB] bg-[#FFF7F7]/20 rounded-2xl p-8 space-y-4 flex flex-col justify-between shadow-sm">
              <p className="text-[#4B5563] text-sm italic leading-relaxed">
                "Our team needed a central repository for training guidelines. With Masterclass's single credentials flow and automated email onboarding, new user registration is handled seamlessly without security overhead."
              </p>
              <div>
                <h5 className="text-sm font-bold text-[#1F2937]">David Kim</h5>
                <p className="text-xs text-muted-foreground">Director of Training Operations, NexaCorp Solutions</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full bg-[#FFF7F7] py-20 border-t border-[#E5E7EB] text-center">
        <div className="max-w-4xl mx-auto px-6 space-y-6">
          <h3 className="text-3xl sm:text-4xl font-extrabold text-[#1F2937]">
            Ready to Build a Learning-Driven Workforce?
          </h3>
          <p className="text-[#4B5563] text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Register your company workspace today. Upload materials, schedule collaborations, and streamline corporate skill training instantly.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4 w-full sm:w-auto max-w-xs sm:max-w-none mx-auto">
            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-[#E53935] hover:bg-[#FF5A5F] px-8 py-3.5 text-base font-bold text-white shadow-md transition-colors"
            >
              Get Started
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-[#E5E7EB] bg-white hover:bg-[#F5F5F5] px-8 py-3.5 text-base font-bold text-[#4B5563] transition-colors"
            >
              Request Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="footer" className="w-full bg-[#F5F5F5] border-t border-[#E5E7EB] py-16 text-xs text-[#4B5563]">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12 grid grid-cols-2 md:grid-cols-4 gap-8 mb-12 text-left">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <img src={APP_LOGO} alt="Masterclass Logo" className="h-8 w-auto object-contain" />
              <span className="font-extrabold text-[#1F2937] text-base">{APP_NAME}</span>
            </div>
            <p className="text-[#4B5563] leading-relaxed">
              Standardized corporate learning management space. Secure, fast, and robust.
            </p>
          </div>
          <div>
            <h5 className="font-bold text-[#1F2937] mb-4 uppercase tracking-wider text-[10px]">Company</h5>
            <ul className="space-y-2">
              <li><button onClick={() => scrollToSection("features")} className="hover:text-[#E53935] transition-colors">About Us</button></li>
              <li><a href="#" className="hover:text-[#E53935] transition-colors">Contact</a></li>
              <li><a href="#" className="hover:text-[#E53935] transition-colors">LinkedIn</a></li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold text-[#1F2937] mb-4 uppercase tracking-wider text-[10px]">Legal</h5>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-[#E53935] transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-[#E53935] transition-colors">Terms of Service</a></li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold text-[#1F2937] mb-4 uppercase tracking-wider text-[10px]">Support</h5>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-[#E53935] transition-colors">Support Desk</a></li>
              <li><span className="text-[#4B5563]">Email: contact@masterclass.com</span></li>
            </ul>
          </div>
        </div>

        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12 pt-8 border-t border-[#E5E7EB] flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <p>© {new Date().getFullYear()} {APP_NAME} Inc. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-[#E53935] transition-colors">LinkedIn</a>
            <a href="#" className="hover:text-[#E53935] transition-colors">Twitter</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
