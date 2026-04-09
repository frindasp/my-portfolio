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
import { 
  generateAuthenticationOptionsAction, 
  verifyAuthenticationAction
} from "@/app/actions/webauthn";
import { verifyTOTPCode } from "@/app/actions/totp";
import { startAuthentication } from "@simplewebauthn/browser";
import { Loader2, ArrowLeft, Mail, ShieldCheck, Key, Lock, Eye, EyeOff, Fingerprint, Smartphone, ChevronRight, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProfileStore } from "@/store/use-profile-store";

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [mode, setMode] = useState<"password" | "otp" | "forgot" | "passkey-2fa" | "register">("password");
  const [step, setStep] = useState(1); // 1: Input, 2: Verification
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const [isNewUserFromContact, setIsNewUserFromContact] = useState(false);
  const [totp2faUserId, setTotp2faUserId] = useState("");
  
  // MFA Sub-steps: "choice", "totp", "admin-otp"
  const [mfaSubStep, setMfaSubStep] = useState<"choice" | "totp" | "admin-otp">("choice");
  const [isAdminOtpRequested, setIsAdminOtpRequested] = useState(false);

  // MFA Enrollment Prompt
  const { setActiveTab } = useProfileStore();
  const [showMfaPrompt, setShowMfaPrompt] = useState(false);

  const callbackUrl = searchParams?.get("callbackUrl") || "/dashboard";

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
        if (res.requires2FA) {
          toast.info("Security verification required.");
          setMode("passkey-2fa");
          setStep(2);
          setMfaSubStep("choice");
          if (res.userId) setTotp2faUserId(res.userId);
        } else {
          // No MFA required, check if we should show enrollment prompt
           const shouldPrompt = (res.user as any).showMfaEnrollment;
           if (shouldPrompt) {
             setShowMfaPrompt(true);
           } else {
             toast.success("Welcome back!");
             router.push(callbackUrl);
             router.refresh();
           }
        }
      } else {
        toast.error(res.error || "Login failed");
      }
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // Handle Passkey Authentication
  const handlePasskeyAuth = async (targetEmail?: string) => {
    const mailToUse = targetEmail || email;
    if (!mailToUse) {
      toast.error("Please enter your email first.");
      return;
    }

    setLoading(true);
    try {
      const optionsResult = await generateAuthenticationOptionsAction(mailToUse);
      if (!optionsResult.success) {
        toast.error(optionsResult.error);
        return;
      }

      const assertionRes = await startAuthentication({ optionsJSON: optionsResult.options as any });
      
      const verificationResult = await verifyAuthenticationAction(assertionRes);
      if (verificationResult.success) {
        toast.success("Authenticated successfully!");
        router.push(callbackUrl);
        router.refresh();
      } else {
        toast.error(verificationResult.error);
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Passkey authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP Request (Standard flow)
  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const res = await sendVerificationOTP(email);
      if (res.success) {
        toast.success(res.message || "OTP requested! Please ask admin for your code.");
        // If registering, we know they are a new user. 
        if (mode === "register") {
          setIsNewUserFromContact(true); // Reusing this state to ensure they enter a new password
        }
        setStep(2);
        setCountdown(60);
      } else {
        toast.error(res.error || "Failed to generate OTP");
      }
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!otp || otp.length < 6) return;
    if (isNewUserFromContact || mode === "register") {
      if (!password || password.length < 6) {
        toast.error("Password minimal 6 karakter");
        return;
      }
      if (password !== confirmNewPassword) {
        toast.error("Konfirmasi password tidak cocok");
        return;
      }
    }
    
    setLoading(true);
    try {
      const res = await verifyOTPAndLogin(email, otp, isNewUserFromContact ? password : undefined);
      if (res.success) {
        toast.success("Verified successfully!");
        router.push(callbackUrl);
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

  // Handle TOTP Verification (2FA)
  const handleVerifyTOTP = async () => {
    if (!otp || otp.length < 6) return;
    setLoading(true);
    try {
      const res = await verifyTOTPCode(totp2faUserId, otp);
      if (res.success) {
        toast.success("Verified successfully!");
        router.push(callbackUrl);
        router.refresh();
      } else {
        toast.error(res.error || "Invalid authenticator code");
      }
    } catch (err) {
      toast.error("Failed to verify code");
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
        toast.success(res.message || "Reset request sent! Please ask admin for your code.");
        setStep(2);
        setCountdown(60);
      } else {
        toast.error(res.error || "Failed to process reset request");
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
    if (!otp || !password || !confirmNewPassword) return;
    if (password !== confirmNewPassword) {
      toast.error("Konfirmasi password baru tidak cocok");
      return;
    }
    setLoading(true);
    try {
      const res = await resetPassword(email, otp, password);
      if (res.success) {
        toast.success("Password reset successful! You can now login.");
        setMode("password");
        setStep(1);
        setPassword("");
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
        toast.success(res.message || "Kode baru berhasil dikirim, silahkan minta ke admin");
        setCountdown(60);
      } else {
        toast.error(res.error || "Gagal menggenerate ulang kode");
      }
    } catch (err) {
      toast.error("Gagal mengirim ulang kode");
    } finally {
      setLoading(false);
    }
  };

  const requestAdminOtp = async () => {
    setLoading(true);
    try {
      const res = await sendVerificationOTP(email);
      if (res.success) {
        toast.success("OTP requested from admin!");
        setIsAdminOtpRequested(true);
        setMfaSubStep("admin-otp");
        setCountdown(60);
        setOtp("");
      } else {
        toast.error(res.error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSkipMfa = async () => {
    setLoading(true);
    try {
      const dismissedAt = new Date().toISOString();
      const response = await fetch("/api/mfa/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dismissedAt }),
      });

      const dismissResult = await response.json();
      if (!response.ok || !dismissResult.success) {
        toast.error(dismissResult.error || "Failed to save reminder preference");
        return;
      }

      setShowMfaPrompt(false);
      toast.success("Welcome back!");
      router.push(callbackUrl);
      router.refresh();
    } catch (error) {
      toast.error("Failed to skip MFA reminder");
    } finally {
      setLoading(false);
    }
  };

  const handleActivateMfaNow = () => {
    setActiveTab("security");
    router.push("/dashboard/profile");
    router.refresh();
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 relative">
      {/* MFA Enrollment Prompt Overlay */}
      {showMfaPrompt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="w-full max-w-sm bg-card border-2 border-primary/20 rounded-[32px] shadow-2xl p-8 space-y-6 animate-in zoom-in-95 duration-300">
              <div className="text-center space-y-4">
                 <div className="mx-auto w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-600">
                    <ShieldAlert className="h-10 w-10" />
                 </div>
                 <div>
                    <h3 className="text-xl font-black italic uppercase tracking-tight">Boost Security</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed px-2">
                       Two-Factor Authentication (2FA) adds an extra layer of security. We highly recommend activating it.
                    </p>
                 </div>
              </div>

              <div className="space-y-3">
                 <Button onClick={handleActivateMfaNow} className="w-full h-12 rounded-2xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">
                    Enable 2FA Now
                 </Button>
                 <Button variant="ghost" onClick={handleSkipMfa} disabled={loading} className="w-full h-12 rounded-2xl font-bold text-muted-foreground hover:bg-muted">
                    Skip for Now
                 </Button>
              </div>
           </div>
        </div>
      )}
      <div className="w-full max-w-md bg-card border rounded-3xl shadow-2xl p-8 space-y-8 animate-in fade-in zoom-in duration-500">
        
        {/* Header Section */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 transition-transform hover:scale-110">
            {mode === "otp" && (step === 1 ? <Mail className="h-8 w-8 text-primary" /> : <ShieldCheck className="h-8 w-8 text-primary" />)}
            {mode === "password" && <Lock className="h-8 w-8 text-primary" />}
            {mode === "forgot" && <Key className="h-8 w-8 text-primary" />}
            {mode === "passkey-2fa" && <ShieldCheck className="h-8 w-8 text-primary animate-pulse" />}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            {mode === "forgot" ? "Reset Password" : mode === "passkey-2fa" ? "Verification" : mode === "register" ? "Create Account" : "Welcome Back"}
          </h1>
          <p className="text-muted-foreground text-sm">
             {mode === "otp" && (step === 1 ? "Sign in with a one-time code." : "Confirm code sent to you.")}
             {mode === "register" && (step === 1 ? "Enter your email to request an admin OTP." : "Enter the OTP from admin and set your password.")}
             {mode === "password" && "Enter your credentials to continue."}
             {mode === "forgot" && (step === 1 ? "Enter your email for the reset code." : "Enter code and new password.")}
             {mode === "passkey-2fa" && (
                mfaSubStep === "choice" ? "Choose how you want to verify your identity." : 
                mfaSubStep === "totp" ? "Enter the code from your authenticator app." :
                "Contact admin to get your verification code."
             )}
          </p>
        </div>

        {/* STEP 1: Login Inputs */}
        {step === 1 ? (
          <div className="space-y-6">
            <form onSubmit={mode === "password" ? handlePasswordLogin : mode === "otp" || mode === "register" ? handleRequestOTP : handleForgotPassword} className="space-y-4">
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
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3 pt-2">
                <Button type="submit" className="w-full h-12 rounded-xl text-base font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]" disabled={loading || !email}>
                  {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : (mode === "password" ? "Sign In" : mode === "register" ? "Request OTP" : "Send Code")}
                </Button>
                
                {mode === "forgot" && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => handlePasskeyAuth()}
                    className="w-full h-12 rounded-xl text-xs font-bold border-primary/20 text-primary hover:bg-primary/5"
                    disabled={loading}
                  >
                    <Fingerprint className="mr-2 h-4 w-4" /> Verify with Passkey instead
                  </Button>
                )}
                
                {mode === "password" && (
                  <div className="text-center mt-2">
                    <p className="text-xs text-muted-foreground">Belum punya akun? <button type="button" onClick={() => { setMode("register"); setStep(1); }} className="text-primary hover:underline font-bold">Daftar</button></p>
                  </div>
                )}
                
                {mode === "register" && (
                  <div className="text-center mt-2">
                    <p className="text-xs text-muted-foreground">Sudah punya akun? <button type="button" onClick={() => { setMode("password"); setStep(1); }} className="text-primary hover:underline font-bold">Masuk</button></p>
                  </div>
                )}
              </div>
            </form>
          </div>
        ) : (
          /* STEP 2: MFA/OTP/Reset Flows */
          <div className="space-y-6">
            {mode === "passkey-2fa" ? (
              <div className="space-y-6">
                {/* CHOICE VIEW */}
                {mfaSubStep === "choice" && (
                  <div className="space-y-3 animate-in slide-in-from-bottom-4 duration-300">
                    <button 
                      onClick={() => setMfaSubStep("totp")}
                      className="w-full flex items-center justify-between p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 hover:border-emerald-500/40 hover:bg-emerald-500/10 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                          <Smartphone className="h-6 w-6" />
                        </div>
                        <div className="text-left">
                          <p className="font-bold">Authenticator App</p>
                          <p className="text-[10px] text-muted-foreground">Google, Microsoft, etc.</p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </button>

                    <button 
                      onClick={requestAdminOtp}
                      className="w-full flex items-center justify-between p-5 rounded-2xl bg-amber-500/5 border border-amber-500/10 hover:border-amber-500/40 hover:bg-amber-500/10 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                          <Mail className="h-6 w-6" />
                        </div>
                        <div className="text-left">
                          <p className="font-bold">OTP to Admin</p>
                          <p className="text-[10px] text-muted-foreground">Ask support for a code</p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </button>

                    <button 
                      onClick={() => handlePasskeyAuth()}
                      className="w-full flex items-center justify-between p-5 rounded-2xl bg-primary/5 border border-primary/10 hover:border-primary/40 hover:bg-primary/10 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                          <Fingerprint className="h-6 w-6" />
                        </div>
                        <div className="text-left">
                          <p className="font-bold">Passkey</p>
                          <p className="text-[10px] text-muted-foreground">Biometric / Security Key</p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </button>

                    <Button 
                      variant="ghost" 
                      onClick={() => { setMode("password"); setStep(1); }} 
                      className="w-full text-[10px] font-bold text-muted-foreground mt-4"
                    >
                      <ArrowLeft className="h-3 w-3 mr-1" /> Logout and try again
                    </Button>
                  </div>
                )}

                {/* TOTP VIEW */}
                {mfaSubStep === "totp" && (
                   <div className="space-y-6 animate-in zoom-in-95 duration-200">
                      <div className="space-y-4">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">6-Digit Code</label>
                        <Input 
                          type="text" 
                          maxLength={6} 
                          value={otp} 
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} 
                          placeholder="000000"
                          className="rounded-xl h-14 text-center text-3xl tracking-[0.5em] font-mono bg-muted/30 focus:bg-background border-muted" 
                          disabled={loading} 
                          autoFocus 
                        />
                        <Button 
                          onClick={handleVerifyTOTP}
                          disabled={loading || otp.length < 6}
                          className="w-full h-12 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20"
                        >
                          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />} Verify Code
                        </Button>
                      </div>
                      <button 
                        onClick={() => { setMfaSubStep("choice"); setOtp(""); }}
                        className="w-full text-xs font-bold text-primary hover:underline flex items-center justify-center"
                      >
                         <ArrowLeft className="h-3 w-3 mr-1" /> Choose different method
                      </button>
                   </div>
                )}

                {/* ADMIN OTP VIEW */}
                {mfaSubStep === "admin-otp" && (
                   <div className="space-y-6 animate-in zoom-in-95 duration-200">
                      <div className="space-y-4 text-center">
                        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Waiting for Admin Code</p>
                        <Input 
                          type="text" 
                          maxLength={6} 
                          value={otp} 
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} 
                          placeholder="000000"
                          className="rounded-xl h-14 text-center text-3xl tracking-[0.5em] font-mono bg-muted/30 focus:bg-background border-muted" 
                          disabled={loading} 
                          autoFocus 
                        />
                        <Button 
                          onClick={() => handleVerifyOTP()}
                          disabled={loading || otp.length < 6}
                          className="w-full h-12 rounded-xl font-bold bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-500/20"
                        >
                          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />} Login with Admin OTP
                        </Button>
                        
                        <div className="pt-2">
                           <button 
                             onClick={requestAdminOtp} 
                             disabled={countdown > 0} 
                             className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                           >
                             {countdown > 0 ? `Resend request in ${countdown}s` : "Didn't get code? Resend request"}
                           </button>
                        </div>
                      </div>
                      <button 
                        onClick={() => { setMfaSubStep("choice"); setOtp(""); }}
                        className="w-full text-xs font-bold text-primary hover:underline flex items-center justify-center"
                      >
                         <ArrowLeft className="h-3 w-3 mr-1" /> Choose different method
                      </button>
                   </div>
                )}
              </div>
            ) : (
              /* Standard OTP / Forgot Password Form */
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
    
                {(mode === "forgot" || mode === "register" || (mode === "otp" && isNewUserFromContact)) && (
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">{mode === "forgot" ? "New Password" : "Set Password"}</label>
                      <div className="relative">
                        <Input
                          type={showNewPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="rounded-xl h-12 bg-muted/30 focus:bg-background border-muted pr-12"
                          disabled={loading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword((prev) => !prev)}
                          className="absolute inset-y-0 right-0 flex items-center pr-4 text-muted-foreground hover:text-foreground"
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                   </div>
                )}
    
                {(mode === "forgot" || mode === "register" || (mode === "otp" && isNewUserFromContact)) && (
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Confirm {mode === "forgot" ? "New Password" : "Password"}</label>
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
                        >
                          {showConfirmNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {confirmNewPassword && password !== confirmNewPassword && (
                        <p className="text-[10px] text-red-500 ml-1">Konfirmasi password belum sama</p>
                      )}
                   </div>
                )}
    
                <Button type="submit" className="w-full h-12 rounded-xl text-base font-bold shadow-lg shadow-primary/20" disabled={loading || otp.length < 6}>
                  {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : (mode === "forgot" ? "Reset & Update" : mode === "register" || isNewUserFromContact ? "Register & Login" : "Verify & Login")}
                </Button>
                
                <div className="text-center">
                  <button type="button" onClick={handleResendCode} disabled={countdown > 0 || loading} className="text-xs text-muted-foreground hover:text-primary transition-colors disabled:opacity-50 font-medium">
                    {countdown > 0 ? `Resend code in ${countdown}s` : "Didn't get a code? Resend"}
                  </button>
                </div>
              </form>
            )}
          </div>
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
