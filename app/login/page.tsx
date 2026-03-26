"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { requestOTP, verifyOTP } from "@/app/actions/auth";
import { Loader2, ArrowLeft, Mail, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1); // 1: Email, 2: OTP
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const emailParam = searchParams?.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      const res = await requestOTP(email);
      if (res.success) {
        toast.success("OTP sent to your email!");
        setStep(2);
        setCountdown(60); // 1 minute cooldown
      } else {
        toast.error(res.error || "Failed to send OTP");
      }
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 6) return;

    setLoading(true);
    try {
      const res = await verifyOTP(email, otp);
      if (res.success) {
        toast.success("Login successful!");
        router.push("/portfolio"); // Or redirect to where they came from
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

  const handleResend = async () => {
    if (countdown > 0 || resending) return;
    setResending(true);
    try {
      await requestOTP(email);
      toast.success("New OTP sent!");
      setCountdown(60);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border rounded-3xl shadow-2xl p-8 space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
            {step === 1 ? (
              <Mail className="h-8 w-8 text-primary" />
            ) : (
              <ShieldCheck className="h-8 w-8 text-primary" />
            )}
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            {step === 1 ? "Welcome Back" : "Verify Email"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {step === 1 
              ? "Enter your email to sign in or get started." 
              : `We've sent a 6-digit code to ${email}`}
          </p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleRequestOTP} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-xl h-12 bg-muted/30 focus:bg-background border-muted"
                disabled={loading}
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-12 rounded-xl text-base font-semibold group" 
              disabled={loading || !email}
            >
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Continue"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Verification Code
                </label>
                <button 
                  type="button" 
                  onClick={() => setStep(1)} 
                  className="text-xs text-primary hover:underline flex items-center"
                >
                  <ArrowLeft className="mr-1 h-3 w-3" /> Change Email
                </button>
              </div>
              <Input
                type="text"
                placeholder="000000"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                required
                className="rounded-xl h-12 text-center text-2xl tracking-[0.5em] font-mono bg-muted/30 focus:bg-background border-muted"
                disabled={loading}
                autoFocus
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-12 rounded-xl text-base font-semibold" 
              disabled={loading || otp.length < 6}
            >
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Verify & Login"}
            </Button>
            
            <div className="text-center">
              <button
                type="button"
                onClick={handleResend}
                disabled={countdown > 0 || resending}
                className="text-sm text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
              >
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
    <Suspense fallback={
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
