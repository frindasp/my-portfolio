"use client";

import { useState, useEffect } from "react";
import { Shield, Key, Plus, Trash2, Loader2, Fingerprint, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { startRegistration } from "@simplewebauthn/browser";
import { 
  generateRegistrationOptionsAction, 
  verifyRegistrationAction, 
  fetchPasskeysAction, 
  deletePasskeyAction,
  toggleTwoFactorAction
} from "@/app/actions/webauthn";

export function SecuritySettings({ user: initialUser }: { user: any }) {
  const [passkeys, setPasskeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(initialUser?.twoFactorEnabled || false);
  const [updating2FA, setUpdating2FA] = useState(false);

  useEffect(() => {
    loadPasskeys();
  }, []);

  const loadPasskeys = async () => {
    setLoading(true);
    const result = await fetchPasskeysAction();
    if (result.success) {
      setPasskeys(result.passkeys || []);
    }
    setLoading(false);
  };

  const handleRegisterPasskey = async () => {
    setRegistering(true);
    try {
      const optionsResult = await generateRegistrationOptionsAction();
      if (!optionsResult.success) {
        toast.error(optionsResult.error);
        return;
      }

      const attRes = await startRegistration({ optionsJSON: optionsResult.options as any });
      
      const verificationResult = await verifyRegistrationAction(attRes);
      if (verificationResult.success) {
        toast.success("Passkey registered successfully!");
        loadPasskeys();
      } else {
        toast.error(verificationResult.error);
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to register passkey. Make sure your browser supports WebAuthn.");
    } finally {
      setRegistering(false);
    }
  };

  const handleDeletePasskey = async (id: string) => {
    if (!confirm("Are you sure you want to delete this passkey?")) return;
    
    const result = await deletePasskeyAction(id);
    if (result.success) {
      toast.success("Passkey deleted.");
      loadPasskeys();
    } else {
      toast.error(result.error);
    }
  };

  const handleToggle2FA = async () => {
    setUpdating2FA(true);
    const newVal = !twoFactorEnabled;
    const result = await toggleTwoFactorAction(newVal);
    if (result.success) {
      setTwoFactorEnabled(newVal);
      toast.success(`2FA ${newVal ? "enabled" : "disabled"}.`);
    } else {
      toast.error(result.error);
    }
    setUpdating2FA(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-card border rounded-[32px] p-8 space-y-8">
        <div className="flex items-center justify-between pb-6 border-b">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            <h3 className="text-2xl font-black italic tracking-tight">Security & Passkeys</h3>
          </div>
          <Button 
            onClick={handleRegisterPasskey} 
            disabled={registering}
            className="rounded-2xl font-bold bg-primary hover:bg-primary/90"
          >
            {registering ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Add Passkey
          </Button>
        </div>

        <div className="space-y-6">
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
            <button 
              onClick={handleToggle2FA} 
              disabled={updating2FA}
              className="text-primary hover:scale-110 transition-transform disabled:opacity-50"
            >
              {updating2FA ? <Loader2 className="h-6 w-6 animate-spin" /> : twoFactorEnabled ? <ToggleRight className="h-10 w-10" /> : <ToggleLeft className="h-10 w-10 text-muted-foreground" />}
            </button>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Registered Passkeys</h4>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
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
                        <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[200px]">{pk.credentialID}</p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDeletePasskey(pk.id)}
                      className="text-muted-foreground hover:text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
              Passkeys are a safer way to sign in. They are resistant to phishing and credential stuffing. 
              We recommend adding at least two passkeys (e.g. your Phone and your Computer) as backups.
          </p>
      </div>
    </div>
  );
}
