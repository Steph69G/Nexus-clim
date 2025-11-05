import { PropsWithChildren } from "react";

type Props = PropsWithChildren<{
  title: string;
  subtitle?: string;
}>;

export default function OperationalSection({ title, subtitle, children }: Props) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        {subtitle ? (
          <p className="text-sm text-gray-600 mt-0.5">{subtitle}</p>
        ) : null}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {children}
      </div>
    </section>
  );
}
