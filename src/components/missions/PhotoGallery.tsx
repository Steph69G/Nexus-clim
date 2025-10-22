import { useState, useEffect } from "react";
import { X, Download, Trash2, Image as ImageIcon, ZoomIn, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Photo {
  id: string;
  mission_id: string;
  photo_type: string;
  storage_path: string;
  file_name: string;
  file_size: number;
  description: string | null;
  metadata: any;
  created_at: string;
  url?: string;
}

interface PhotoGalleryProps {
  missionId: string;
  canDelete?: boolean;
}

const PHOTO_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  before: { label: "Avant", color: "bg-blue-100 text-blue-700" },
  during: { label: "En cours", color: "bg-yellow-100 text-yellow-700" },
  after: { label: "Après", color: "bg-green-100 text-green-700" },
  equipment: { label: "Équipement", color: "bg-purple-100 text-purple-700" },
  issue: { label: "Problème", color: "bg-red-100 text-red-700" },
  other: { label: "Autre", color: "bg-slate-100 text-slate-700" },
};

export default function PhotoGallery({ missionId, canDelete = false }: PhotoGalleryProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    loadPhotos();
  }, [missionId]);

  async function loadPhotos() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("mission_photos")
        .select("*")
        .eq("mission_id", missionId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const photosWithUrls = await Promise.all(
        (data || []).map(async (photo) => {
          const { data: urlData } = await supabase.storage
            .from("mission-photos")
            .createSignedUrl(photo.storage_path, 3600);

          return {
            ...photo,
            url: urlData?.signedUrl || "",
          };
        })
      );

      setPhotos(photosWithUrls);
    } catch (err) {
      console.error("Error loading photos:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(photo: Photo) {
    if (!confirm("Supprimer cette photo ?")) return;

    try {
      const { error: storageError } = await supabase.storage
        .from("mission-photos")
        .remove([photo.storage_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase.from("mission_photos").delete().eq("id", photo.id);

      if (dbError) throw dbError;

      setPhotos(photos.filter((p) => p.id !== photo.id));
      setSelectedPhoto(null);
    } catch (err: any) {
      console.error("Delete error:", err);
      alert("Erreur lors de la suppression");
    }
  }

  async function handleDownload(photo: Photo) {
    try {
      const { data, error } = await supabase.storage.from("mission-photos").download(photo.storage_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = photo.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Download error:", err);
      alert("Erreur lors du téléchargement");
    }
  }

  function openLightbox(photo: Photo, index: number) {
    setSelectedPhoto(photo);
    setSelectedIndex(index);
  }

  function closeLightbox() {
    setSelectedPhoto(null);
  }

  function nextPhoto() {
    const filtered = getFilteredPhotos();
    if (selectedIndex < filtered.length - 1) {
      const newIndex = selectedIndex + 1;
      setSelectedIndex(newIndex);
      setSelectedPhoto(filtered[newIndex]);
    }
  }

  function prevPhoto() {
    if (selectedIndex > 0) {
      const filtered = getFilteredPhotos();
      const newIndex = selectedIndex - 1;
      setSelectedIndex(newIndex);
      setSelectedPhoto(filtered[newIndex]);
    }
  }

  function getFilteredPhotos() {
    return filter === "all" ? photos : photos.filter((p) => p.photo_type === filter);
  }

  const filteredPhotos = getFilteredPhotos();
  const photosByType = photos.reduce((acc, photo) => {
    acc[photo.photo_type] = (acc[photo.photo_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="text-center py-8">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement des photos...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Galerie Photos ({photos.length})
          </h3>
        </div>

        {photos.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filter === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Toutes ({photos.length})
            </button>
            {Object.entries(photosByType).map(([type, count]) => {
              const typeInfo = PHOTO_TYPE_LABELS[type];
              return (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    filter === type
                      ? typeInfo.color + " ring-2 ring-offset-1 ring-blue-500"
                      : typeInfo.color + " opacity-60 hover:opacity-100"
                  }`}
                >
                  {typeInfo.label} ({count})
                </button>
              );
            })}
          </div>
        )}

        {filteredPhotos.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>
              {filter === "all"
                ? "Aucune photo pour cette mission"
                : `Aucune photo de type "${PHOTO_TYPE_LABELS[filter]?.label}"`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredPhotos.map((photo, index) => {
              const typeInfo = PHOTO_TYPE_LABELS[photo.photo_type];
              return (
                <div
                  key={photo.id}
                  className="group relative aspect-square rounded-lg overflow-hidden border-2 border-slate-200 hover:border-blue-500 transition-all cursor-pointer"
                  onClick={() => openLightbox(photo, index)}
                >
                  <img
                    src={photo.url}
                    alt={photo.description || typeInfo.label}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                      <div className={`inline-block px-2 py-1 rounded text-xs font-semibold mb-1 ${typeInfo.color}`}>
                        {typeInfo.label}
                      </div>
                      {photo.description && (
                        <div className="text-sm line-clamp-2">{photo.description}</div>
                      )}
                    </div>
                  </div>

                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 bg-white/90 backdrop-blur rounded-full hover:bg-white transition-colors">
                      <ZoomIn className="w-4 h-4 text-slate-700" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 bg-white/10 backdrop-blur text-white rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          {selectedIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                prevPhoto();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 backdrop-blur text-white rounded-full hover:bg-white/20 transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {selectedIndex < filteredPhotos.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                nextPhoto();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 backdrop-blur text-white rounded-full hover:bg-white/20 transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          <div className="max-w-6xl w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedPhoto.url}
              alt={selectedPhoto.description || "Photo"}
              className="w-full h-auto max-h-[85vh] object-contain rounded-lg"
            />

            <div className="mt-4 bg-white/10 backdrop-blur rounded-lg p-4 text-white">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        PHOTO_TYPE_LABELS[selectedPhoto.photo_type].color
                      }`}
                    >
                      {PHOTO_TYPE_LABELS[selectedPhoto.photo_type].label}
                    </span>
                    <span className="text-sm text-white/70">
                      {new Date(selectedPhoto.created_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {selectedPhoto.description && (
                    <p className="text-white/90">{selectedPhoto.description}</p>
                  )}
                  <div className="mt-2 text-xs text-white/60">
                    {selectedPhoto.file_name} • {(selectedPhoto.file_size / 1024).toFixed(0)} KB
                    {selectedPhoto.metadata?.compression_ratio && (
                      <span className="ml-2">• Compression: {selectedPhoto.metadata.compression_ratio}</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownload(selectedPhoto)}
                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    title="Télécharger"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(selectedPhoto)}
                      className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-2 text-center text-sm text-white/60">
              Photo {selectedIndex + 1} sur {filteredPhotos.length}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
