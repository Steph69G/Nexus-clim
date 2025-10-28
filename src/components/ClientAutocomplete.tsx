import { useState, useEffect, useRef } from "react";
import { searchClients, type ClientSearchResult } from "@/api/clients";
import { User, Building2, Clock, MapPin, Phone, Mail, UserPlus } from "lucide-react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onClientSelect: (client: ClientSearchResult) => void;
  onCreateNew?: () => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
}

export default function ClientAutocomplete({
  value,
  onChange,
  onClientSelect,
  onCreateNew,
  placeholder = "Rechercher par nom, téléphone ou email...",
  label = "Nom du client",
  disabled = false,
}: Props) {
  const [results, setResults] = useState<ClientSearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm && searchTerm.length >= 2) {
        performSearch(searchTerm);
      } else {
        setResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  async function performSearch(query: string) {
    try {
      setLoading(true);
      const data = await searchClients(query);
      setResults(data);
      setShowResults(data.length > 0);
    } catch (error) {
      console.error("Erreur de recherche:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function handleInputChange(newValue: string) {
    setSearchTerm(newValue);
    onChange(newValue);
  }

  function handleSelectClient(client: ClientSearchResult) {
    setSearchTerm(client.name);
    onChange(client.name);
    onClientSelect(client);
    setShowResults(false);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-sm font-semibold text-slate-700 mb-3">
        {label}
      </label>
      <div className="relative">
        <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setShowResults(true);
          }}
          disabled={disabled}
          className="w-full bg-white border border-slate-300 rounded-2xl pl-12 pr-4 py-4 text-slate-900 placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder={placeholder}
        />
        {loading && (
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {showResults && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-96 overflow-y-auto">
          <div className="p-2">
            {results.map((client, index) => (
              <button
                key={`${client.id}-${index}`}
                type="button"
                onClick={() => handleSelectClient(client)}
                className="w-full text-left p-4 rounded-xl hover:bg-blue-50 transition-colors group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {client.source === "user_account" ? (
                        <User className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      ) : (
                        <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      )}
                      <span className="font-semibold text-slate-900 group-hover:text-blue-700 truncate">
                        {client.name}
                      </span>
                      {client.company_name && (
                        <span className="text-xs text-slate-500 truncate flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {client.company_name}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      {client.phone && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{client.phone}</span>
                        </div>
                      )}
                      {client.email && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate">{client.email}</span>
                        </div>
                      )}
                      {client.address && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate">
                            {client.address} {client.zip && `• ${client.zip}`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    {client.source === "user_account" ? (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-lg bg-blue-100 text-blue-700">
                        Compte
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-lg bg-amber-100 text-amber-700">
                        Historique
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {showResults && results.length === 0 && searchTerm.length >= 2 && !loading && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-lg p-6">
          <div className="text-center mb-4">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <User className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-700 mb-1">
              Aucun client trouvé
            </p>
            <p className="text-xs text-slate-500">
              pour "{searchTerm}"
            </p>
          </div>

          {onCreateNew && (
            <button
              type="button"
              onClick={() => {
                setShowResults(false);
                onCreateNew();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Créer un nouveau prospect/client
            </button>
          )}
        </div>
      )}
    </div>
  );
}
