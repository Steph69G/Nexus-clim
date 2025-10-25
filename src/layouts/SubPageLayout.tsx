import { PropsWithChildren } from "react";
import { BackButton } from "@/components/navigation/BackButton";

type SubPageLayoutProps = PropsWithChildren<{
  title?: string;
  fallbackPath?: string;
  forceShowBack?: boolean;
  className?: string;
}>;

export default function SubPageLayout({
  children,
  title,
  fallbackPath = "/admin",
  forceShowBack = false,
  className = "",
}: SubPageLayoutProps) {
  return (
    <div className={`max-w-7xl mx-auto px-4 py-6 space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <BackButton fallbackPath={fallbackPath} forceShow={forceShowBack} />
        {title && <h1 className="text-2xl font-bold text-gray-900">{title}</h1>}
        <div />
      </div>
      <div>{children}</div>
    </div>
  );
}
