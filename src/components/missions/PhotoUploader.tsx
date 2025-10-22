import { useState, useRef } from "react";
import { Camera, Upload, X, Image as ImageIcon, Loader } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface PhotoUploaderProps {
  missionId: string;
  onUploadComplete?: () => void;
}

const PHOTO_TYPES = [
  { value: "before", label: "Avant travaux", color: "bg-blue-100 text-blue-700" },
  { value: "during", label: "En cours", color: "bg-yellow-100 text-yellow-700" },
  { value: "after", label: "Après travaux", color: "bg-green-100 text-green-700" },
  { value: "equipment", label: "Équipement", color: "bg-purple-100 text-purple-700" },
  { value: "issue", label: "Problème", color: "bg-red-100 text-red-700" },
  { value: "other", label: "Autre", color: "bg-slate-100 text-slate-700" },
];

export default function PhotoUploader({ missionId, onUploadComplete }: PhotoUploaderProps) {
  const [selectedType, setSelectedType] = useState("during");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  async function compressImage(file: File, maxWidth = 1920, maxHeight = 1920, quality = 0.85): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Could not get canvas context"));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error("Could not compress image"));
              }
            },
            "image/jpeg",
            quality
          );
        };
        img.onerror = () => reject(new Error("Could not load image"));
      };
      reader.onerror = () => reject(new Error("Could not read file"));
    });
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Veuillez sélectionner une image");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("La taille maximale est de 10 MB");
      return;
    }

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function handleUpload() {
    if (!selectedFile) return;

    setUploading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const compressedBlob = await compressImage(selectedFile);

      const timestamp = Date.now();
      const fileName = `${timestamp}-${selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const storagePath = `${missionId}/${selectedType}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("mission-photos")
        .upload(storagePath, compressedBlob, {
          contentType: "image/jpeg",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("mission_photos").insert({
        mission_id: missionId,
        photo_type: selectedType,
        storage_path: storagePath,
        file_name: fileName,
        file_size: compressedBlob.size,
        mime_type: "image/jpeg",
        uploaded_by: user.id,
        description: description || null,
        metadata: {
          original_name: selectedFile.name,
          original_size: selectedFile.size,
          compressed_size: compressedBlob.size,
          compression_ratio: ((1 - compressedBlob.size / selectedFile.size) * 100).toFixed(1) + "%",
        },
      });

      if (dbError) throw dbError;

      setPreview(null);
      setSelectedFile(null);
      setDescription("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";

      if (onUploadComplete) onUploadComplete();

      alert("Photo uploadée avec succès !");
    } catch (err: any) {
      console.error("Upload error:", err);
      alert("Erreur lors de l'upload : " + err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
        <Camera className="w-5 h-5" />
        Ajouter des Photos
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Type de photo</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {PHOTO_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setSelectedType(type.value)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedType === type.value
                    ? type.color + " ring-2 ring-offset-2 ring-blue-500"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Description (optionnel)</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Vue d'ensemble, détail du problème..."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {!preview ? (
          <div className="grid md:grid-cols-2 gap-3">
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Camera className="w-5 h-5" />
              Prendre une photo
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium"
            >
              <Upload className="w-5 h-5" />
              Choisir un fichier
            </button>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative rounded-lg overflow-hidden border-2 border-slate-200">
              <img src={preview} alt="Preview" className="w-full h-auto" />
              <button
                onClick={() => {
                  setPreview(null);
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                  if (cameraInputRef.current) cameraInputRef.current.value = "";
                }}
                className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedFile && (
              <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                <div className="font-medium">Fichier sélectionné :</div>
                <div>{selectedFile.name}</div>
                <div className="text-xs">
                  Taille originale : {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  ✓ L'image sera compressée automatiquement
                </div>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Upload en cours...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Uploader la photo
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 text-xs text-slate-500 bg-blue-50 p-3 rounded-lg">
        <div className="font-medium text-blue-900 mb-1">ℹ️ Informations</div>
        <ul className="space-y-1 list-disc list-inside">
          <li>Formats acceptés : JPEG, PNG, WebP, HEIC</li>
          <li>Taille maximale : 10 MB</li>
          <li>Compression automatique pour optimiser le stockage</li>
          <li>Les métadonnées (localisation, date) sont préservées</li>
        </ul>
      </div>
    </div>
  );
}
