export default function HelpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex flex-col gap-12 py-4 lg:py-6 xl:py-8 max-w-6xl w-full px-4">
        <div className="flex flex-col">{children}</div>
      </div>
    </div>
  );
}
