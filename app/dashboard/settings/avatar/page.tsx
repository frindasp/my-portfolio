"use client";

import { useState, useEffect, useRef } from "react";
import { getCurrentUser, updateAvatar } from "@/app/actions/auth";
import { Camera, Loader2, User, Check, RefreshCw, Upload, Link as LinkIcon, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AvatarSettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarUrlInput, setAvatarUrlInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchUser = async () => {
    try {
      const u = await getCurrentUser();
      setUser(u);
      if (u?.UserImage?.imageUrl) {
        setAvatarUrlInput(u.UserImage.imageUrl);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size cannot exceed 5MB");
      return;
    }

    try {
      setAvatarUploading(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const res = await updateAvatar({
          fileBase64: base64,
          fileName: `avatar-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`,
        });

        if (res.success) {
          toast.success("Avatar berhasil diperbarui melalui ImageKit!");
          await fetchUser();
        } else {
          toast.error(res.error || "Gagal mengunggah avatar");
        }
        setAvatarUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("Terjadi kesalahan saat mengunggah");
      setAvatarUploading(false);
    }
  };

  const handleSaveUrl = async () => {
    if (!avatarUrlInput.trim()) {
      toast.error("Masukkan URL gambar yang valid");
      return;
    }

    try {
      setAvatarUploading(true);
      const res = await updateAvatar({ imageUrl: avatarUrlInput.trim() });
      if (res.success) {
        toast.success("Avatar URL berhasil disimpan!");
        await fetchUser();
      } else {
        toast.error(res.error || "Gagal menyimpan URL avatar");
      }
    } finally {
      setAvatarUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black italic uppercase tracking-tight flex items-center gap-3">
          <ImageIcon className="h-8 w-8 text-primary" />
          Avatar Settings
        </h1>
        <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mt-1">
          Kelola foto profil akun Anda via ImageKit atau direct URL
        </p>
      </div>

      <div className="bg-card border rounded-3xl p-6 sm:p-8 space-y-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center gap-6 pb-8 border-b">
          <div className="relative group">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />
            <div className="h-28 w-28 rounded-3xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center overflow-hidden relative shadow-lg">
              {user?.UserImage?.imageUrl ? (
                <img
                  src={user.UserImage.imageUrl}
                  alt={user.name || "Avatar"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-4xl font-black text-primary">
                  {user?.name?.charAt(0).toUpperCase() || "U"}
                </span>
              )}
              {avatarUploading && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-card border shadow-md hover:bg-muted text-foreground transition-all"
              title="Upload Foto Baru"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-1.5 text-center sm:text-left">
            <h3 className="text-lg font-bold">{user?.name || "User"}</h3>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                className="rounded-xl text-xs font-bold"
              >
                <Upload className="h-3.5 w-3.5 mr-2" />
                Upload ke ImageKit
              </Button>
            </div>
          </div>
        </div>

        {/* URL Option */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-primary" />
            Gunakan URL Avatar Eksternal
          </h4>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              value={avatarUrlInput}
              onChange={(e) => setAvatarUrlInput(e.target.value)}
              placeholder="https://example.com/avatar.png"
              className="rounded-xl text-xs h-10 flex-1"
            />
            <Button
              onClick={handleSaveUrl}
              disabled={avatarUploading || !avatarUrlInput.trim()}
              className="rounded-xl font-bold text-xs h-10 px-6 shrink-0"
            >
              {avatarUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
              Simpan URL
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Jika Anda login menggunakan Google dan belum memiliki avatar khusus, URL avatar Google akan dihubungkan secara otomatis.
          </p>
        </div>
      </div>
    </div>
  );
}

