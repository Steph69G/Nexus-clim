import { useState, useEffect } from 'react';
import { FolderOpen, Plus, Eye, Download, Trash2, Search, FileText, Image, File, Upload } from 'lucide-react';
import { supabase } from '@/supabase';
import { useAuth } from '@/auth/AuthProvider';
import BackButton from '@/components/BackButton';
import DataTable from '@/components/DataTable';

interface Document {
  id: string;
  client_id: string;
  document_type: string;
  document_name: string;
  document_description: string | null;
  document_url: string;
  file_size_bytes: number | null;
  file_type: string | null;
  visible_to_client: boolean;
  viewed_by_client: boolean;
  view_count: number;
  download_count: number;
  created_at: string;
  client?: {
    first_name: string;
    last_name: string;
  };
}

const documentTypeLabels: Record<string, string> = {
  quote: 'Devis',
  invoice: 'Facture',
  contract: 'Contrat',
  attestation: 'Attestation',
  warranty: 'Garantie',
  certificate: 'Certificat',
  report: 'Rapport',
  photo: 'Photo',
  manual: 'Manuel',
  other: 'Autre'
};

const documentTypeColors: Record<string, string> = {
  quote: 'bg-blue-100 text-blue-800',
  invoice: 'bg-green-100 text-green-800',
  contract: 'bg-purple-100 text-purple-800',
  attestation: 'bg-orange-100 text-orange-800',
  warranty: 'bg-teal-100 text-teal-800',
  certificate: 'bg-yellow-100 text-yellow-800',
  report: 'bg-cyan-100 text-cyan-800',
  photo: 'bg-pink-100 text-pink-800',
  manual: 'bg-gray-100 text-gray-800',
  other: 'bg-slate-100 text-slate-800'
};

export default function AdminDocuments() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, []);

  async function loadDocuments() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('client_portal_documents')
        .select(`
          *,
          client:user_clients!client_id(
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce document ?')) return;

    try {
      const { error } = await supabase
        .from('client_portal_documents')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Erreur lors de la suppression');
    }
  }

  async function toggleVisibility(doc: Document) {
    try {
      const { error } = await supabase
        .from('client_portal_documents')
        .update({ visible_to_client: !doc.visible_to_client })
        .eq('id', doc.id);

      if (error) throw error;
      await loadDocuments();
    } catch (error) {
      console.error('Error toggling visibility:', error);
      alert('Erreur lors de la modification');
    }
  }

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.document_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.document_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.client?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.client?.last_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'all' || doc.document_type === filterType;

    return matchesSearch && matchesType;
  });

  const getDocumentIcon = (type: string) => {
    if (type === 'photo') return Image;
    if (type === 'report' || type === 'invoice' || type === 'quote') return FileText;
    return File;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    const mb = bytes / 1024 / 1024;
    if (mb < 1) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${mb.toFixed(1)} MB`;
  };

  const columns = [
    {
      key: 'document_type',
      label: 'Type',
      render: (doc: Document) => {
        const Icon = getDocumentIcon(doc.document_type);
        return (
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-gray-400" />
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${documentTypeColors[doc.document_type]}`}>
              {documentTypeLabels[doc.document_type] || doc.document_type}
            </span>
          </div>
        );
      }
    },
    {
      key: 'document_name',
      label: 'Nom du document',
      render: (doc: Document) => (
        <div>
          <div className="font-medium text-gray-900">{doc.document_name}</div>
          {doc.document_description && (
            <div className="text-sm text-gray-500">{doc.document_description}</div>
          )}
        </div>
      )
    },
    {
      key: 'client',
      label: 'Client',
      render: (doc: Document) => (
        <div className="text-sm text-gray-700">
          {doc.client ? `${doc.client.first_name} ${doc.client.last_name}` : '-'}
        </div>
      )
    },
    {
      key: 'file_info',
      label: 'Fichier',
      render: (doc: Document) => (
        <div className="text-sm text-gray-600">
          <div>{doc.file_type || '-'}</div>
          <div className="text-xs text-gray-500">{formatFileSize(doc.file_size_bytes)}</div>
        </div>
      )
    },
    {
      key: 'stats',
      label: 'Stats',
      render: (doc: Document) => (
        <div className="text-sm">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-gray-400" />
            <span className="text-gray-700">{doc.view_count} vues</span>
          </div>
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-gray-400" />
            <span className="text-gray-700">{doc.download_count} DL</span>
          </div>
        </div>
      )
    },
    {
      key: 'visibility',
      label: 'Visible',
      render: (doc: Document) => (
        <button
          onClick={() => toggleVisibility(doc)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            doc.visible_to_client
              ? 'bg-green-100 text-green-800 hover:bg-green-200'
              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
          }`}
        >
          {doc.visible_to_client ? 'Oui' : 'Non'}
        </button>
      )
    },
    {
      key: 'created_at',
      label: 'Date',
      render: (doc: Document) => (
        <div className="text-sm text-gray-600">
          {new Date(doc.created_at).toLocaleDateString('fr-FR')}
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (doc: Document) => (
        <div className="flex gap-2">
          <a
            href={doc.document_url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Voir"
          >
            <Eye className="w-4 h-4" />
          </a>
          <a
            href={doc.document_url}
            download
            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            title="Télécharger"
          >
            <Download className="w-4 h-4" />
          </a>
          <button
            onClick={() => handleDelete(doc.id)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Supprimer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <BackButton />
          <div className="flex items-center gap-3 mt-4">
            <div className="p-3 bg-orange-100 rounded-xl">
              <FolderOpen className="w-8 h-8 text-orange-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
              <p className="text-gray-600">Gestion des fichiers et documents clients</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex-1 max-w-md relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher un document..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                <Upload className="w-5 h-5" />
                Ajouter un document
              </button>
            </div>

            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Filtrer par type :</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="all">Tous les types</option>
                {Object.entries(documentTypeLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>

              <div className="ml-auto text-sm text-gray-600">
                <span className="font-medium">{filteredDocuments.length}</span> documents
              </div>
            </div>
          </div>

          <DataTable
            data={filteredDocuments}
            columns={columns}
            keyField="id"
          />
        </div>
      </div>

      {showUploadModal && (
        <UploadDocumentModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false);
            loadDocuments();
          }}
        />
      )}
    </div>
  );
}

function UploadDocumentModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    client_id: '',
    document_type: 'other',
    document_name: '',
    document_description: '',
    visible_to_client: true,
    tags: ''
  });

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    const { data } = await supabase
      .from('user_clients')
      .select('id, first_name, last_name')
      .order('last_name');

    if (data) setClients(data);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!file) {
      alert('Veuillez sélectionner un fichier');
      return;
    }

    try {
      setLoading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase
        .from('client_portal_documents')
        .insert([{
          ...formData,
          document_url: publicUrl,
          file_size_bytes: file.size,
          file_type: file.type,
          tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
          uploaded_by: user?.id
        }]);

      if (insertError) throw insertError;
      onSuccess();
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Erreur lors de l\'upload');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Ajouter un document</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Client *
            </label>
            <select
              required
              value={formData.client_id}
              onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="">Sélectionner un client</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type de document *
              </label>
              <select
                required
                value={formData.document_type}
                onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                {Object.entries(documentTypeLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom du document *
              </label>
              <input
                type="text"
                required
                value={formData.document_name}
                onChange={(e) => setFormData({ ...formData, document_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.document_description}
              onChange={(e) => setFormData({ ...formData, document_description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fichier *
            </label>
            <input
              type="file"
              required
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            {file && (
              <div className="mt-2 text-sm text-gray-600">
                {file.name} - {(file.size / 1024 / 1024).toFixed(2)} MB
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags (séparés par des virgules)
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="installation, garantie, maintenance"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="visible_to_client"
              checked={formData.visible_to_client}
              onChange={(e) => setFormData({ ...formData, visible_to_client: e.target.checked })}
              className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
            />
            <label htmlFor="visible_to_client" className="text-sm text-gray-700">
              Visible par le client dans son portail
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Upload en cours...' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
