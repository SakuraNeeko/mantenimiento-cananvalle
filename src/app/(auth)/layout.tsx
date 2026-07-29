export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-muted/40 p-4">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
