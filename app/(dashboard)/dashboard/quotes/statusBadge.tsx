const STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-amber-100 text-amber-700",
  signed: "bg-brand-light text-brand-dark",
  accepted: "bg-brand-light text-brand-dark",
  declined: "bg-red-100 text-red-700",
  expired: "bg-gray-100 text-gray-500",
  paid: "bg-brand-light text-brand-dark",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export function StatusBadge({ status }: { status: string }) {
  const style = STYLES[status] ?? "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium capitalize ${style}`}>
      {status}
    </span>
  );
}
