import { ReactNode } from 'react';

interface OperationalSectionProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function OperationalSection({ title, description, children }: OperationalSectionProps) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-600">{description}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">{children}</div>
    </section>
  );
}
