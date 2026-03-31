"use client";

import { useState, useEffect, useRef } from "react";
import { Shield, Key, Plus, Trash2, Loader2, Fingerprint, ToggleLeft, ToggleRight, Smartphone, ChevronDown, X, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { startRegistration } from "@simplewebauthn/browser";
import { 
  generateRegistrationOptionsAction, 
  verifyRegistrationAction, 
  fetchPasskeysAction, 
  deletePasskeyAction,
  toggleTwoFactorAction,
  togglePasskeyAction
} from "@/app/actions/webauthn";
import {
  generateTOTPSetup,
  verifyAndEnableTOTP,
  deleteTOTP,
  fetchTOTPList,
  toggleTOTPAction,
} from "@/app/actions/totp";

export function SecuritySettings({ user: initialUser }: { user: any }) {
  const [passkeys, setPasskeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(initialUser?.twoFactorEnabled || false);
  const [updating2FA, setUpdating2FA] = useState(false);

  // Dropdown
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // TOTP
  const [totpList, setTotpList] = useState<any[]>([]);
  const [totpLoading, setTotpLoading] = useState(true);
  const [totpSetupMode, setTotpSetupMode] = useState(false);
  const [totpSetupId, setTotpSetupId] = useState("");
  const [totpQR, setTotpQR] = useState("");
  const [totpSecret, setTotpSecret] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [totpName, setTotpName] = useState("");
  const [totpVerifying, setTotpVerifying] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);

  useEffect(() => {
    loadPasskeys();
    loadTOTPList();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadPasskeys = async () => {
    setLoading(true);
    const result = await fetchPasskeysAction();
    if (result.success) setPasskeys(result.passkeys || []);
    setLoading(false);
  };

  const loadTOTPList = async () => {
    setTotpLoading(true);
    const result = await fetchTOTPList();
    if (result.success) setTotpList(result.items || []);
    setTotpLoading(false);
  };

  const handleRegisterPasskey = async () => {
    setRegistering(true);
    setDropdownOpen(false);
    try {
      const optionsResult = await generateRegistrationOptionsAction();
      if (!optionsResult.success) { toast.error(optionsResult.error); return; }
      const attRes = await startRegistration({ optionsJSON: optionsResult.options as any });
      const verificationResult = await verifyRegistrationAction(attRes);
      if (verificationResult.success) { toast.success("Passkey registered!"); loadPasskeys(); }
      else toast.error(verificationResult.error);
    } catch (error: any) {
      toast.error(error.message || "Failed to register passkey.");
    } finally { setRegistering(false); }
  };

  const handleSetupTOTP = async () => {
    setDropdownOpen(false);
    const name = totpName.trim() || "Authenticator";
    setTotpSetupMode(true);
    setTotpCode("");
    setSecretCopied(false);

    const result = await generateTOTPSetup(name);
    if (result.success) {
      setTotpSetupId(result.totpId!);
      setTotpQR(result.qrCodeDataUrl!);
      setTotpSecret(result.secret!);
    } else {
      toast.error(result.error || "Failed to generate TOTP setup");
      setTotpSetupMode(false);
    }
  };

  const handleVerifyTOTP = async () => {
    if (!totpCode || totpCode.length < 6) return;
    setTotpVerifying(true);
    const result = await verifyAndEnableTOTP(totpSetupId, totpCode);
    if (result.success) {
      toast.success("Authenticator app added!");
      setTotpSetupMode(false);
      setTotpQR(""); setTotpSecret(""); setTotpCode(""); setTotpName(""); setTotpSetupId("");
      loadTOTPList();
    } else {
      toast.error(result.error || "Invalid code");
    }
    setTotpVerifying(false);
  };

  const handleDeleteTOTP = async (id: string) => {
    if (!confirm("Remove this authenticator app?")) return;
    const result = await deleteTOTP(id);
    if (result.success) { toast.success("Authenticator removed."); loadTOTPList(); }
    else toast.error("Failed to remove authenticator.");
  };

  const cancelTotpSetup = async () => {
    // Clean up the unverified record
    if (totpSetupId) await deleteTOTP(totpSetupId);
    setTotpSetupMode(false);
    setTotpQR(""); setTotpSecret(""); setTotpCode(""); setTotpName(""); setTotpSetupId("");
  };

  const handleDeletePasskey = async (id: string) => {
    if (!confirm("Delete this passkey?")) return;
    const result = await deletePasskeyAction(id);
    if (result.success) { toast.success("Passkey deleted."); loadPasskeys(); }
    else toast.error(result.error);
  };

  const handleTogglePasskey = async (id: string, enabled: boolean) => {
    // Optimistic update
    setPasskeys(prev => prev.map(p => p.id === id ? { ...p, enabled } : p));
    const result = await togglePasskeyAction(id, enabled);
    if (!result.success) {
      toast.error(result.error || "Failed to toggle passkey");
      loadPasskeys();
    }
  };

  const handleToggleTOTP = async (id: string, enabled: boolean) => {
    // Optimistic update
    setTotpList(prev => prev.map(t => t.id === id ? { ...t, enabled } : t));
    const result = await toggleTOTPAction(id, enabled);
    if (!result.success) {
      toast.error(result.error || "Failed to toggle authenticator");
      loadTOTPList();
    }
  };

  const handleToggle2FA = async () => {
    setUpdating2FA(true);
    const newVal = !twoFactorEnabled;
    const result = await toggleTwoFactorAction(newVal);
    if (result.success) { setTwoFactorEnabled(newVal); toast.success(`2FA ${newVal ? "enabled" : "disabled"}.`); }
    else toast.error(result.error);
    setUpdating2FA(false);
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(totpSecret);
    setSecretCopied(true);
    toast.success("Secret copied!");
    setTimeout(() => setSecretCopied(false), 2000);
  };

  const mfaDismissedDate = initialUser?.mfaDismissedAt ? new Date(initialUser.mfaDismissedAt) : null;
  const isDismissedToday = mfaDismissedDate && mfaDismissedDate.toDateString() === new Date().toDateString();

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="bg-card border rounded-[32px] p-6 sm:p-8 space-y-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary shrink-0" />
            <h3 className="text-xl sm:text-2xl font-black italic tracking-tight">Security & Passkeys</h3>
          </div>

          {/* Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <Button onClick={() => setDropdownOpen(!dropdownOpen)} disabled={registering}
              className="rounded-2xl font-bold bg-primary hover:bg-primary/90">
              {registering ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Add Method
              <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
            </Button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-popover border shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <button onClick={handleRegisterPasskey}
                  className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/50 transition-colors">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Fingerprint className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Passkey</p>
                    <p className="text-[10px] text-muted-foreground">Fingerprint, Face ID, Security Key</p>
                  </div>
                </button>
                <div className="h-px bg-border" />
                <div className="px-5 py-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <Smartphone className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">Authenticator App</p>
                      <p className="text-[10px] text-muted-foreground">Google Auth, Microsoft Auth, Authy</p>
                    </div>
                  </div>
                  <Input
                    type="text"
                    placeholder="Label (e.g. Google Auth)"
                    value={totpName}
                    onChange={(e) => setTotpName(e.target.value)}
                    className="rounded-xl h-9 text-xs bg-muted/30 border-muted"
                  />
                  <Button onClick={handleSetupTOTP} size="sm"
                    className="w-full rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-xs h-9">
                    <Plus className="h-3 w-3 mr-1" /> Setup Authenticator
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* 2FA Toggle */}
          <div className="flex items-center justify-between p-6 rounded-2xl bg-primary/5 border border-primary/10">
            <div className="space-y-1">
              <h4 className="font-bold flex items-center gap-2">
                Two-Factor Authentication (2FA)
                <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full ${twoFactorEnabled ? 'bg-green-500/20 text-green-600' : 'bg-amber-500/20 text-amber-600'}`}>
                  {twoFactorEnabled ? 'Active' : 'Inactive'}
                </span>
              </h4>
              <p className="text-sm text-muted-foreground">Require a Passkey check when logging in or resetting password.</p>
            </div>
            <button onClick={handleToggle2FA} disabled={updating2FA}
              className="text-primary hover:scale-110 transition-transform disabled:opacity-50">
              {updating2FA ? <Loader2 className="h-6 w-6 animate-spin" /> : twoFactorEnabled ? <ToggleRight className="h-10 w-10 shrink-0" /> : <ToggleLeft className="h-10 w-10 text-muted-foreground shrink-0" />}
            </button>
          </div>

          {/* MFA Reminder Preference status */}
          <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
             <div className="space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-widest text-amber-700">MFA Reminder Status</h4>
                <p className="text-[10px] text-amber-800/60 font-medium">
                   {isDismissedToday 
                     ? "You've opted to skip MFA prompts for today." 
                     : initialUser?.mfaDismissedAt 
                        ? `Last skipped on ${mfaDismissedDate?.toLocaleDateString()}`
                        : "You'll be prompted to fix security if 2FA is inactive."}
                </p>
             </div>
             {isDismissedToday && (
                <div className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-700 text-[9px] font-black uppercase tracking-tighter self-start sm:self-auto">
                   Skipped Today
                </div>
             )}
          </div>

          {/* TOTP Setup Inline */}
          {totpSetupMode && (
            <div className="p-6 rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/5 space-y-6 animate-in fade-in zoom-in-95 duration-300">
              <div className="flex items-center justify-between">
                <h4 className="font-black italic text-lg">Setup Authenticator App</h4>
                <button onClick={cancelTotpSetup} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">
                Scan the QR code below with your authenticator app, then enter the 6-digit code to verify.
              </p>

              {totpQR ? (
                <div className="flex flex-col items-center gap-6">
                  <div className="p-4 bg-white rounded-2xl shadow-lg">
                    <img src={totpQR} alt="TOTP QR Code" className="h-48 w-48" />
                  </div>

                  <div className="w-full space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                      Or enter this key manually
                    </label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-4 py-3 bg-muted/50 rounded-xl text-xs font-mono tracking-wider break-all select-all border">
                        {totpSecret}
                      </code>
                      <Button variant="outline" size="icon" onClick={handleCopySecret} className="rounded-xl h-11 w-11 shrink-0">
                        {secretCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="w-full space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                      Enter verification code
                    </label>
                    <Input type="text" maxLength={6} value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="000000"
                      className="rounded-xl h-12 text-center text-2xl tracking-[0.5em] font-mono bg-muted/30 focus:bg-background border-muted"
                      disabled={totpVerifying} autoFocus />
                    <Button onClick={handleVerifyTOTP} disabled={totpVerifying || totpCode.length < 6}
                      className="w-full h-12 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20">
                      {totpVerifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                      Verify & Enable
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                </div>
              )}
            </div>
          )}

          {/* TOTP List */}
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Authenticator Apps</h4>
            {totpLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-emerald-600" /></div>
            ) : totpList.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed rounded-2xl border-muted">
                <Smartphone className="h-10 w-10 mx-auto text-muted mb-2 opacity-20" />
                <p className="text-sm text-muted-foreground">No authenticator apps configured.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {totpList.map((totp) => (
                  <div key={totp.id} className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 group hover:border-emerald-500/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                        <Smartphone className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">{totp.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          Added {new Date(totp.createdAt).toLocaleDateString()}
                          <span className={`ml-2 font-bold ${totp.enabled ? "text-green-600" : "text-muted-foreground"}`}>
                            ● {totp.enabled ? "Active" : "Disabled"}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleToggleTOTP(totp.id, !totp.enabled)} className="text-muted-foreground hover:scale-110 transition-transform">
                        {totp.enabled ? <ToggleRight className="h-8 w-8 text-emerald-600" /> : <ToggleLeft className="h-8 w-8" />}
                      </button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteTOTP(totp.id)}
                        className="text-muted-foreground hover:text-red-500 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Passkeys List */}
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Registered Passkeys</h4>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : passkeys.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed rounded-2xl border-muted">
                <Fingerprint className="h-12 w-12 mx-auto text-muted mb-3 opacity-20" />
                <p className="text-sm text-muted-foreground">No passkeys registered yet.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {passkeys.map((pk) => (
                  <div key={pk.id} className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-muted-foreground/10 group hover:border-primary/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-background flex items-center justify-center border shadow-sm">
                        <Key className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">Passkey ({pk.credentialDeviceType})</p>
                        <p className="text-[10px] w-[180px] sm:w-[250px] text-muted-foreground font-mono truncate">{pk.credentialID}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleTogglePasskey(pk.id, !pk.enabled)} className="text-muted-foreground hover:scale-110 transition-transform">
                        {pk.enabled ? <ToggleRight className="h-8 w-8 text-primary" /> : <ToggleLeft className="h-8 w-8" />}
                      </button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeletePasskey(pk.id)}
                        className="text-muted-foreground hover:text-red-500 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-amber-500/5 border border-amber-500/20 rounded-[32px] p-8 space-y-4">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-amber-600" />
          <h4 className="font-black italic uppercase tracking-tight text-amber-700">Security Recommendation</h4>
        </div>
        <p className="text-sm text-amber-800/70 leading-relaxed">
          For maximum security, combine both a Passkey and an Authenticator App. 
          Passkeys protect against phishing, while authenticator apps provide time-based verification as a backup.
        </p>
      </div>
    </div>
  );
}
