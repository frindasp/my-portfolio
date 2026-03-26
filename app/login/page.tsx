"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  loginWithPassword, 
  sendVerificationOTP, 
  verifyOTPAndLogin,
  forgotPassword,
  resetPassword 
} from "@/app/actions/messaging";
import { Loader2, ArrowLeft, Mail, ShieldCheck, Key, Lock, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [mode, setMode] = useState<"password" | "otp" | "forgot">("otp");
  const [step, setStep] = useState(1); // 1: Input, 2: Verification
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  useEffect(() => {
    const emailParam = searchParams?.get("email");
    if (emailParam) setEmail(emailParam);
  }, [searchParams]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Handle Login with Password
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      const res = await loginWithPassword(email, password);
      if (res.success) {
        toast.success("Welcome back!");
        router.push("/dashboard");
        router.refresh();
      } else {
        toast.error(res.error || "Login failed");
      }
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP Request
  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const res = await sendVerificationOTP(email);
      if (res.success) {
        toast.success("OTP sent to your email!");
        setStep(2);
        setCountdown(60);
      } else {
        toast.error(res.error || "Failed to send OTP");
      }
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP Verification
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 6) return;
    setLoading(true);
    try {
      const res = await verifyOTPAndLogin(email, otp);
      if (res.success) {
        toast.success("Verified successfully!");
        router.push("/dashboard");
        router.refresh();
      } else {
        toast.error(res.error || "Invalid OTP");
      }
    } catch (err) {
      toast.error("Verification failed");
    } finally {
      setLoading(false);
    }
  };

  // Handle Forgot Password
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const res = await forgotPassword(email);
      if (res.success) {
        toast.success("Reset code sent to email!");
        setStep(2);
        setCountdown(60);
      } else {
        toast.error(res.error || "Failed to process request");
      }
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // Handle Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || !newPassword || !confirmNewPassword) return;
    if (newPassword !== confirmNewPassword) {
      toast.error("Konfirmasi password baru tidak cocok");
      return;
    }
    setLoading(true);
    try {
      const res = await resetPassword(email, otp, newPassword);
      if (res.success) {
        toast.success("Password reset successful! You can now login.");
        setMode("password");
        setStep(1);
        setNewPassword("");
        setConfirmNewPassword("");
        setOtp("");
      } else {
        toast.error(res.error || "Reset failed");
      }
    } catch (err) {
      toast.error("Reset failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!email || countdown > 0) return;
    setLoading(true);
    try {
      const res = mode === "forgot" ? await forgotPassword(email) : await sendVerificationOTP(email);
      if (res.success) {
        toast.success("Kode baru berhasil dikirim");
        setCountdown(60);
      } else {
        toast.error(res.error || "Gagal mengirim ulang kode");
      }
    } catch (err) {
      toast.error("Gagal mengirim ulang kode");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border rounded-3xl shadow-2xl p-8 space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 transition-transform hover:scale-110">
            {mode === "otp" && (step === 1 ? <Mail className="h-8 w-8 text-primary" /> : <ShieldCheck className="h-8 w-8 text-primary" />)}
            {mode === "password" && <Lock className="h-8 w-8 text-primary" />}
            {mode === "forgot" && <Key className="h-8 w-8 text-primary" />}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            {mode === "forgot" ? "Reset Password" : "Welcome Back"}
          </h1>
          <p className="text-muted-foreground text-sm">
             {mode === "otp" && (step === 1 ? "Sign in with a one-time code." : `Confirm code sent to ${email}`)}
             {mode === "password" && "Enter your credentials to continue."}
             {mode === "forgot" && (step === 1 ? "Enter your email for the reset code." : "Enter code and new password.")}
          </p>
        </div>

        {/* STEP 1: Inputs */}
        {step === 1 ? (
          <div className="space-y-6">
            <form onSubmit={mode === "password" ? handlePasswordLogin : mode === "otp" ? handleRequestOTP : handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Email Address</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="rounded-xl h-12 bg-muted/30 focus:bg-background border-muted" disabled={loading} />
              </div>

              {mode === "password" && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Password</label>
                    <button type="button" onClick={() => { setMode("forgot"); setStep(1); }} className="text-[10px] text-primary hover:underline font-bold">Lupa Password?</button>
                  </div>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="rounded-xl h-12 bg-muted/30 focus:bg-background border-muted pr-12"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 flex items-center pr-4 text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? "Sembunyikan password" : "Lihat password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full h-12 rounded-xl text-base font-bold shadow-lg shadow-primary/20" disabled={loading || !email}>
                {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : (mode === "password" ? "Sign In" : "Send Code")}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-muted" /></div>
              <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-card px-2 text-muted-foreground font-bold tracking-widest">Atau</span></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <Button variant="outline" className={cn("rounded-xl h-12 text-xs font-bold", mode === "otp" && "border-primary text-primary bg-primary/5")} onClick={() => setMode("otp")}>OTP Email</Button>
               <Button variant="outline" className={cn("rounded-xl h-12 text-xs font-bold", mode === "password" && "border-primary text-primary bg-primary/5")} onClick={() => setMode("password")}>Password</Button>
            </div>
          </div>
        ) : (
          /* STEP 2: Verification/Reset */
          <form onSubmit={mode === "forgot" ? handleResetPassword : handleVerifyOTP} className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Verification Code</label>
                <button type="button" onClick={() => setStep(1)} className="text-[10px] text-primary hover:underline flex items-center font-bold">
                  <ArrowLeft className="mr-1 h-3 w-3" /> Change Email
                </button>
              </div>
              <Input type="text" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} required className="rounded-xl h-12 text-center text-2xl tracking-[0.5em] font-mono bg-muted/30 focus:bg-background border-muted" disabled={loading} autoFocus />
            </div>

            {mode === "forgot" && (
               <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">New Password</label>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="rounded-xl h-12 bg-muted/30 focus:bg-background border-muted pr-12"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 flex items-center pr-4 text-muted-foreground hover:text-foreground"
                      aria-label={showNewPassword ? "Sembunyikan password baru" : "Lihat password baru"}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
               </div>
            )}

            {mode === "forgot" && (
               <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Confirm New Password</label>
                  <div className="relative">
                    <Input
                      type={showConfirmNewPassword ? "text" : "password"}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      required
                      className="rounded-xl h-12 bg-muted/30 focus:bg-background border-muted pr-12"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmNewPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 flex items-center pr-4 text-muted-foreground hover:text-foreground"
                      aria-label={showConfirmNewPassword ? "Sembunyikan konfirmasi password baru" : "Lihat konfirmasi password baru"}
                    >
                      {showConfirmNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmNewPassword && newPassword !== confirmNewPassword && (
                    <p className="text-[10px] text-red-500 ml-1">Konfirmasi password belum sama</p>
                  )}
               </div>
            )}

            <Button type="submit" className="w-full h-12 rounded-xl text-base font-bold shadow-lg shadow-primary/20" disabled={loading || otp.length < 6}>
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : (mode === "forgot" ? "Reset & Update" : "Verify & Login")}
            </Button>
            
            <div className="text-center">
              <button type="button" onClick={handleResendCode} disabled={countdown > 0 || loading} className="text-xs text-muted-foreground hover:text-primary transition-colors disabled:opacity-50 font-medium">
                {countdown > 0 ? `Resend code in ${countdown}s` : "Didn't get a code? Resend"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[80vh] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
