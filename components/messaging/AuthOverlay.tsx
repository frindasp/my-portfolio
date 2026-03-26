"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  checkEmailStatus,
  forgotPassword,
  loginWithPassword,
  resetPassword,
  sendVerificationOTP,
  verifyOTPAndLogin,
} from "@/app/actions/messaging";
import { toast } from "sonner";
import { Loader2, ArrowRight, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { useMessagingStore } from "@/store/use-messaging-store";

type AuthMode = "otp" | "password" | "forgot";
type AuthStep = "email" | "otp" | "register" | "forgot-reset";

export default function AuthOverlay({ onCancel }: { onCancel?: () => void }) {
  const [mode, setMode] = useState<AuthMode>("otp");
  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmailState] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const setUser = useMessagingStore((state) => state.setUser);
  const setStoreEmail = useMessagingStore((state) => state.setEmail);

  const ensureValidEmail = () => {
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email");
      return false;
    }
    return true;
  };

  const handleSendOtp = async () => {
    if (!ensureValidEmail()) return;

    setLoading(true);
    try {
      const status = await checkEmailStatus(email);
      setIsRegistered(status.isRegistered);
      if (status.hasContacted && !status.isRegistered) {
        setName(status.lastContactName || "");
      }

      setStoreEmail(email);
      const res = await sendVerificationOTP(email);
      if (res.success) {
        setStep("otp");
        toast.success("Verification code sent to your email!");
      } else {
        toast.error(res.error || "Failed to send verification email");
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 6) {
      toast.error("Please enter the 6-digit code");
      return;
    }

    if (!isRegistered) {
      setStep("register");
      return;
    }

    setLoading(true);
    try {
      const result = await verifyOTPAndLogin(email, otp);
      if (result.success && result.user) {
        setUser({ id: result.user.id, email: result.user.email, name: result.user.name });
        toast.success("Welcome back!");
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
      const result = await verifyOTPAndLogin(email, otp, password, name);
      if (result.success && result.user) {
        setUser({ id: result.user.id, email: result.user.email, name: result.user.name });
        toast.success("Registration successful! You can now chat.");
      } else {
        toast.error(result.error || "Registration failed");
      }
    } catch (error) {
      toast.error("Registration error");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async () => {
    if (!ensureValidEmail() || !password) {
      toast.error("Email dan password wajib diisi");
      return;
    }

    setLoading(true);
    try {
      const result = await loginWithPassword(email, password);
      if (result.success && result.user) {
        setStoreEmail(email);
        setUser({ id: result.user.id, email: result.user.email, name: result.user.name });
        toast.success("Welcome back!");
      } else {
        toast.error(result.error || "Login failed");
      }
    } catch (error) {
      toast.error("Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSendForgotOtp = async () => {
    if (!ensureValidEmail()) return;

    setLoading(true);
    try {
      const res = await forgotPassword(email);
      if (res.success) {
        setStep("forgot-reset");
        toast.success("OTP reset password berhasil dikirim");
      } else {
        toast.error(res.error || "Gagal kirim OTP reset password");
      }
    } catch (error) {
      toast.error("Gagal memproses lupa password");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (otp.length < 6) {
      toast.error("OTP harus 6 digit");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password baru minimal 6 karakter");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Konfirmasi password baru tidak sama");
      return;
    }

    setLoading(true);
    try {
      const result = await resetPassword(email, otp, newPassword);
      if (result.success) {
        toast.success("Password berhasil direset. Silakan login.");
        setMode("password");
        setStep("email");
        setOtp("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error(result.error || "Reset password gagal");
      }
    } catch (error) {
      toast.error("Reset password gagal");
    } finally {
      setLoading(false);
    }
  };

  const renderPasswordInput = (
    value: string,
    onChange: (value: string) => void,
    placeholder: string,
    show: boolean,
    onToggle: () => void,
    className = "mb-4"
  ) => (
    <div className={`relative ${className}`}>
      <Input
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pr-10"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-full items-center justify-center p-6 text-center bg-background/95 backdrop-blur-sm">
      <div className="mb-4 rounded-full bg-primary/10 p-4">
        <ShieldCheck className="h-10 w-10 text-primary" />
      </div>

      {step === "email" && (
        <>
          <h2 className="text-xl font-bold mb-2">Live Chat Login</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Login pakai OTP atau password untuk lanjutkan chat kamu.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4 w-full">
            <Button variant={mode === "otp" ? "default" : "outline"} size="sm" onClick={() => setMode("otp")}>OTP</Button>
            <Button variant={mode === "password" ? "default" : "outline"} size="sm" onClick={() => setMode("password")}>Password</Button>
            <Button variant={mode === "forgot" ? "default" : "outline"} size="sm" onClick={() => setMode("forgot")}>Lupa</Button>
          </div>

          <Input
            type="email"
            placeholder="yourname@example.com"
            value={email}
            onChange={(e) => setEmailState(e.target.value)}
            className="mb-3"
          />

          {mode === "password" &&
            renderPasswordInput(password, setPassword, "Masukkan password", showPassword, () => setShowPassword((prev) => !prev), "mb-3")}

          <Button
            onClick={mode === "otp" ? handleSendOtp : mode === "password" ? handlePasswordLogin : handleSendForgotOtp}
            className="w-full"
            disabled={loading}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
            {mode === "otp" ? "Kirim OTP" : mode === "password" ? "Login" : "Kirim OTP Lupa Password"}
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
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
          />
          <Button onClick={handleVerifyOtp} className="w-full" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Verify Code"}
          </Button>
          <Button variant="link" className="mt-4 text-xs" onClick={() => setStep("email")}>Change Email</Button>
        </>
      )}

      {step === "register" && (
        <>
          <h2 className="text-xl font-bold mb-2">Complete Profile</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Buat password untuk simpan histori chat ke akun kamu.
          </p>
          <Input
            placeholder="Your Full Name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mb-3"
          />
          {renderPasswordInput(password, setPassword, "Choose Password", showPassword, () => setShowPassword((prev) => !prev))}
          <Button onClick={handleRegister} className="w-full" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Finish & Chat"}
          </Button>
        </>
      )}

      {step === "forgot-reset" && (
        <>
          <h2 className="text-xl font-bold mb-2">Reset Password</h2>
          <p className="text-muted-foreground text-sm mb-4">Masukkan OTP lalu password baru.</p>
          <Input
            className="mb-3 text-center text-xl tracking-[0.5em] font-mono"
            maxLength={6}
            placeholder="000000"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
          />
          {renderPasswordInput(newPassword, setNewPassword, "Password baru", showNewPassword, () => setShowNewPassword((prev) => !prev), "mb-3")}
          {renderPasswordInput(confirmPassword, setConfirmPassword, "Konfirmasi password baru", showConfirmPassword, () => setShowConfirmPassword((prev) => !prev), "mb-4")}
          <Button onClick={handleResetPassword} className="w-full" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Reset Password"}
          </Button>
          <Button variant="link" className="mt-3 text-xs" onClick={() => { setMode("password"); setStep("email"); }}>
            Kembali ke login
          </Button>
        </>
      )}

      {onCancel && (
        <Button variant="link" className="mt-4 text-xs" onClick={onCancel}>
          Cancel
        </Button>
      )}
    </div>
  );
}
