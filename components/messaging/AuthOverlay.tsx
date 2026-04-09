"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { checkEmailStatus, sendVerificationOTP, verifyOTPAndLogin } from "@/app/actions/messaging";
import { toast } from "sonner";
import { ShieldCheck, Loader2, ArrowRight } from "lucide-react";
import { useMessagingStore } from "@/store/use-messaging-store";
import { useRouter } from "next/navigation";

export default function AuthOverlay({ onCancel }: { onCancel?: () => void }) {
  const [step, setStep] = useState<"email" | "otp" | "password">("email");
  const [email, setEmailState] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [hasContacted, setHasContacted] = useState(false);
  
  const setUser = useMessagingStore((state) => state.setUser);
  const setStoreEmail = useMessagingStore((state) => state.setEmail);
  const { userId, isAnonymous } = useMessagingStore();
  const router = useRouter();

  const handleEmailCheck = async () => {
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email");
      return;
    }

    setLoading(true);
    try {
      const status = await checkEmailStatus(email);
      setHasContacted(status.hasContacted);
      setIsRegistered(status.isRegistered);
      
      if (status.hasContacted && !status.isRegistered) {
        toast.info("Welcome back! We found your previous contact. Please verify to continue.");
        setName(status.lastContactName || "");
      }
      
      setStoreEmail(email); // Save email even if not logged in yet
      const res = await sendVerificationOTP(email);
      if (res.success) {
        setStep("otp");
        toast.success(res.message || "Verification code generated! Please ask admin for your code.");
      } else {
        toast.error(res.error || "Failed to generate verification code");
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length < 6) {
      toast.error("Please enter the 6-digit code");
      return;
    }

    setLoading(true);
    try {
      const result = await verifyOTPAndLogin(email, otp, undefined, undefined, isAnonymous ? (userId || undefined) : undefined);
      if (result.success && result.user) {
        if (!isRegistered) {
          // If not registered, we need a password
          setStep("password");
        } else {
          // If already registered, we're done (logged in)
          setUser({ id: result.user.id, email: result.user.email, name: result.user.name });
          toast.success("Welcome back!");
          router.push("/dashboard/chat");
        }
      } else {
        toast.error(result.error || "Invalid code");
      }
    } catch (error) {
      toast.error("Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      // Re-verify code is still valid (or just use the session state)
      // Actually verifyOTPAndLogin already handles it
      const result = await verifyOTPAndLogin(email, otp, password, name, isAnonymous ? (userId || undefined) : undefined);
      if (result.success && result.user) {
        setUser({ id: result.user.id, email: result.user.email, name: result.user.name });
        toast.success("Registration successful! You can now chat.");
        router.push("/dashboard/chat");
      } else {
        toast.error(result.error || "Registration failed");
      }
    } catch (error) {
      toast.error("Registration error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full items-center justify-center p-6 text-center bg-background/95 backdrop-blur-sm">
      <div className="mb-4 rounded-full bg-primary/10 p-4">
        <ShieldCheck className="h-10 w-10 text-primary" />
      </div>
      
      {step === "email" && (
        <>
          <h2 className="text-xl font-bold mb-2">Identify Yourself</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Enter your email to start chatting or see your previous messages.
          </p>
          <Input 
            type="email" 
            placeholder="yourname@example.com"
            value={email}
            onChange={(e) => setEmailState(e.target.value)}
            className="mb-4"
          />
          <Button onClick={handleEmailCheck} className="w-full" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
            Continue
          </Button>
        </>
      )}

      {step === "otp" && (
        <>
          <h2 className="text-xl font-bold mb-2">Verify Email</h2>
          <p className="text-muted-foreground text-sm mb-6">
            We've sent a 6-digit code to <span className="font-semibold text-foreground">{email}</span>.
          </p>
          <Input 
            className="mb-4 text-center text-xl tracking-[0.5em] font-mono"
            maxLength={6}
            placeholder="000000"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
          <Button onClick={handleVerifyOTP} className="w-full" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Verify Code"}
          </Button>
          <Button variant="link" className="mt-4 text-xs" onClick={() => setStep("email")}>
            Change Email
          </Button>
        </>
      )}

      {step === "password" && (
        <>
          <h2 className="text-xl font-bold mb-2">Complete Profile</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Set a password to save your chat history and log in later.
          </p>
          <Input 
            placeholder="Your Full Name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mb-3"
          />
          <Input 
            type="password"
            placeholder="Choose Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-4"
          />
          <Button onClick={handleRegister} className="w-full" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Finish & Chat"}
          </Button>
        </>
      )}
    </div>
  );
}
