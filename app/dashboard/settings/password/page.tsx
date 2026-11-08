"use client";

import { useState } from "react";
import { Lock, KeyRound, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { changePassword } from "@/app/actions/auth";
import { toast } from "sonner";

export default function PasswordSettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Semua kolom harus diisi");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Konfirmasi password baru tidak cocok");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password baru minimal 6 karakter");
      return;
    }

    try {
      setLoading(true);
      const res = await changePassword({ currentPassword, newPassword });
      if (res.success) {
        toast.success("Password berhasil diperbarui!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error(res.error || "Gagal memperbarui password");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black italic uppercase tracking-tight flex items-center gap-3">
          <KeyRound className="h-8 w-8 text-primary" />
          Password Settings
        </h1>
        <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mt-1">
          Ubah kata sandi akun Anda untuk menjaga keamanan akses
        </p>
      </div>

      <div className="bg-card border rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Password Saat Ini
            </label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="rounded-xl h-11 text-sm bg-background/50"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Password Baru
            </label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              className="rounded-xl h-11 text-sm bg-background/50"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Konfirmasi Password Baru
            </label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ulangi password baru"
              className="rounded-xl h-11 text-sm bg-background/50"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto rounded-xl font-bold h-11 px-8 text-xs uppercase tracking-wider"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
            Perbarui Password
          </Button>
        </form>
      </div>
    </div>
  );
}

