import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type Toast = { id: string; type: "success"|"error"|"info"; message: string; };
type Ctx = { push: (t: Omit<Toast,"id">) => void; };

const ToastCtx = createContext<Ctx | null>(null);

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("ToastProvider manquant");
  return ctx;
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((t: Omit<Toast,"id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(cur => [...cur, { id, ...t }]);
    setTimeout(() => setToasts(cur => cur.filter(x => x.id !== id)), 3500);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      {/* Container */}
      <div className="fixed top-3 right-3 z-[9999] space-y-2">
        {toasts.map(t => (
          <div
            key={t.id}
            className={
              "rounded-lg shadow px-4 py-3 text-sm text-white " +
              (t.type === "success" ? "bg-green-600" : t.type === "error" ? "bg-red-600" : "bg-slate-800")
            }
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
