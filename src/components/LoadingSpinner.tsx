export default function LoadingSpinner({
  text = "Chargement...",
  fullscreen = false,
}: {
  text?: string;
  fullscreen?: boolean;
}) {
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    fullscreen ? (
      <div className="fixed inset-0 flex items-center justify-center bg-white/60">
        {children}
      </div>
    ) : (
      <div className="flex items-center justify-center p-6">{children}</div>
    );

  return (
    <Wrapper>
      <div className="flex items-center gap-3">
        <div className="h-5 w-5 rounded-full border-2 border-gray-300 border-t-transparent animate-spin" />
        <span className="text-sm text-gray-600">{text}</span>
      </div>
    </Wrapper>
  );
}
