import { PropsWithChildren } from "react";

type Props = PropsWithChildren<{
  title: string;
  subtitle?: string;
}>;

export default function OperationalSection({ title, subtitle, children }: Props) {
  console.log('[OperationalSection] Rendering:', title);

  return (
    <section className="space-y-4 border-2 border-green-500 p-4 bg-gray-50 rounded-lg my-6">
      <div className="border-b-2 border-gray-300 pb-3">
        <h2 className="text-2xl font-bold text-black">{title}</h2>
        {subtitle ? (
          <p className="text-base text-gray-600 mt-1">{subtitle}</p>
        ) : null}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {children}
      </div>
    </section>
  );
}
