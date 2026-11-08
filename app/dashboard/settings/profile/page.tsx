"use client";

import { useState, useEffect } from "react";
import { User, Mail, Shield, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCurrentUser, updateCurrentUserFullName } from "@/app/actions/auth";
import { Combobox } from "@/components/ui/combobox";
import { toast } from "sonner";

export default function ProfileSettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState("unspecified");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCurrentUser().then((u) => {
      setUser(u);
      setFullName(u?.name || "");
      setLoading(false);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Nama lengkap tidak boleh kosong");
      return;
    }

    try {
      setSaving(true);
      const res = await updateCurrentUserFullName(fullName);
      if (res.success) {
        toast.success("Profil berhasil diperbarui!");
        setUser((prev: any) => ({ ...prev, name: fullName.trim() }));
      } else {
        toast.error(res.error || "Gagal memperbarui profil");
      }
    } finally {
      setSaving(false);
    }
  };

  const roleOptions = [
    { value: user?.role?.name || "User", label: user?.role?.name || "User" },
  ];

  const genderOptions = [
    { value: "unspecified", label: "Tidak disebutkan" },
    { value: "male", label: "Laki-laki" },
    { value: "female", label: "Perempuan" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black italic uppercase tracking-tight flex items-center gap-3">
          <User className="h-8 w-8 text-primary" />
          Profile Settings
        </h1>
        <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mt-1">
          Perbarui informasi data diri dan preferensi akun Anda
        </p>
      </div>

      <div className="bg-card border rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
        <form onSubmit={handleSave} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Nama Lengkap
            </label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Masukkan nama lengkap"
              className="rounded-xl h-11 text-sm bg-background/50"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Email Akun (Read-only)
            </label>
            <Input
              value={user?.email || ""}
              disabled
              className="rounded-xl h-11 text-sm bg-muted/50 cursor-not-allowed"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Peran Akun
            </label>
            <Combobox
              options={roleOptions}
              value={user?.role?.name || "User"}
              onChange={() => {}}
              disabled
              placeholder="Role"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Jenis Kelamin / Preferensi
            </label>
            <Combobox
              options={genderOptions}
              value={gender}
              onChange={setGender}
              placeholder="Pilih jenis kelamin"
              searchPlaceholder="Cari preferensi..."
            />
          </div>

          <Button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto rounded-xl font-bold h-11 px-8 text-xs uppercase tracking-wider"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
            Simpan Perubahan
          </Button>
        </form>
      </div>
    </div>
  );
}

