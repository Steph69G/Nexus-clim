import { useRef, useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/ui/toast/ToastProvider";
import { CameraCapture } from "./CameraCapture";
import { Camera, Upload } from "lucide-react";

/**
 * Affiche l'avatar du profil courant et permet de le changer.
 * - Utilise useProfile() (changeAvatar) côté Supabase Storage (bucket "avatars")
 * - Affiche des initiales si pas d'image
 */
export default function ProfileAvatar() {
  const { profile, changeAvatar } = useProfile();
  const { push } = useToast();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  if (!profile) {
    return (
      <div className="flex items-center gap-3">
        <div className="h-20 w-20 rounded-full bg-gray-200 animate-pulse" />
        <div className="text-sm text-gray-500">Chargement du profil…</div>
      </div>
    );
  }

  const initials = (profile.full_name || profile.email || "U")
    .split(/[ .@_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/^image\//.test(f.type)) {
      push({ type: "error", message: "Veuillez choisir une image." });
      return;
    }
    if (f.size > 3 * 1024 * 1024) {
      push({ type: "error", message: "Image trop lourde (max 3 Mo)." });
      return;
    }
    setBusy(true);
    try {
      await changeAvatar(f);
      push({ type: "success", message: "Avatar mis à jour ✅" });
    } catch (err: any) {
      push({ type: "error", message: err?.message ?? "Erreur upload avatar" });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onCapturePhoto(blob: Blob) {
    if (blob.size > 3 * 1024 * 1024) {
      push({ type: "error", message: "Photo trop lourde (max 3 Mo)." });
      return;
    }
    setBusy(true);
    try {
      const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
      await changeAvatar(file);
      push({ type: "success", message: "Avatar mis à jour ✅" });
    } catch (err: any) {
      push({ type: "error", message: err?.message ?? "Erreur upload avatar" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      {/* Avatar */}
      {profile.avatar_url ? (
        <img
          src={profile.avatar_url}
          alt="Avatar"
          className="h-20 w-20 rounded-full object-cover border"
        />
      ) : (
        <div className="h-20 w-20 rounded-full bg-gray-200 border flex items-center justify-center text-lg font-semibold text-gray-600">
          {initials}
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2">
        <div className="text-sm">
          <div className="font-medium">{profile.full_name || "Utilisateur"}</div>
          <div className="text-gray-500">{profile.email}</div>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={onPickFile}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="px-3 py-1.5 border rounded text-sm disabled:opacity-60 hover:bg-gray-50 flex items-center gap-2"
          >
            <Upload size={16} />
            {busy ? "Téléversement…" : "Choisir un fichier"}
          </button>
          <button
            onClick={() => setShowCamera(true)}
            disabled={busy}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm disabled:opacity-60 flex items-center gap-2"
          >
            <Camera size={16} />
            Prendre une photo
          </button>
        </div>

        <p className="text-xs text-gray-500">
          JPG/PNG/WebP, max 3&nbsp;Mo. L'image est stockée dans le bucket <code>avatars</code>.
        </p>
      </div>

      {showCamera && (
        <CameraCapture
          onCapture={onCapturePhoto}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
}
