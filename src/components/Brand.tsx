export function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand font-display text-lg font-bold text-primary-foreground shadow-card">
        ফা
      </div>
      <div className="leading-tight">
        <div className={`font-display text-base font-bold ${light ? "text-sidebar-accent-foreground" : "text-primary"}`}>
          Fatima Digital
        </div>
        <div className={`text-[11px] ${light ? "text-sidebar-foreground/70" : "text-muted-foreground"}`}>
          ফাতিমা ডিজিটাল · Smart Studio
        </div>
      </div>
    </div>
  );
}
