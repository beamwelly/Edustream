import React, { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Shield, Key, Loader2, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { AppBackground } from "@/components/background";
import { APP_NAME, APP_TAGLINE } from "@/constants/branding";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/common";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/login")({
  component: LoginPageComponent,
});

function LoginPageComponent() {
  const navigate = useNavigate();
  const { login, user, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    if (!authLoading && user) {
      if (user.role === "admin") {
        navigate({ to: "/admin" });
      } else {
        navigate({ to: "/user" });
      }
    }
  }, [user, authLoading, navigate]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      // Perform login without pre-selected role parameter.
      // After authentication, backend detects actual role, which updates AuthContext
      await login(email, password);
      
      // Fetch authenticated user info to redirect dynamically
      const storedUser = localStorage.getItem("user");
      const storedToken = localStorage.getItem("token");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        let jwtRole = null;
        if (storedToken) {
          try {
            const base64Url = storedToken.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            const claims = JSON.parse(jsonPayload);
            jwtRole = claims.role;
          } catch (e) {
            console.error("Error decoding JWT in frontend:", e);
          }
        }
        
        const targetRoute = parsed.role === "admin" ? "/admin" : "/user";
        console.log(`[LOGIN FLOW] email=${parsed.email}, role=${parsed.role}, jwt role=${jwtRole}, target route=${targetRoute}`);
        
        if (parsed.role === "admin") {
          navigate({ to: "/admin" });
        } else {
          navigate({ to: "/user" });
        }
      } else {
        setError("Unable to retrieve user session.");
      }
    } catch (err: any) {
      let errorMsg = "Invalid email or password.";
      if (err instanceof Error) {
        errorMsg = err.message;
      }
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6 py-16 bg-[#FFF7F7]">
      <AppBackground />
      
      <div className="relative z-10 flex w-full max-w-md flex-col">
        {/* Brand Logo Header */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <img src="/logo.png" alt="Masterclass Logo" className="h-10 w-auto object-contain" />
          <div className="text-left">
            <h1 className="text-xl font-bold tracking-tight leading-none text-[#1F2937]">{APP_NAME}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{APP_TAGLINE}</p>
          </div>
        </div>

        {/* Standalone Login Card */}
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-8 shadow-md">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#FFF7F7] text-[#E53935]">
              <Key className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold text-[#1F2937]">Sign In</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your credentials to access your workspace
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3.5 text-sm text-red-600 font-medium leading-normal animate-shake">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="w-full bg-[#F5F5F5] border-[#E5E7EB] text-[#1F2937] focus:border-[#E53935] focus:ring-[#E53935]"
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Password
                </label>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full bg-[#F5F5F5] border-[#E5E7EB] text-[#1F2937] focus:border-[#E53935] focus:ring-[#E53935] pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition p-0.5"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full justify-center bg-[#E53935] hover:bg-[#FF5A5F] text-white py-2.5 rounded-xl font-semibold shadow-md transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </div>

        <div className="mt-8 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-[#E53935] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to landing page
          </Link>
        </div>
      </div>
    </div>
  );
}
