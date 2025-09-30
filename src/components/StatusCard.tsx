interface StatusCardProps {
  label: string;
  count: number;
  variant?: "default" | "warning" | "danger" | "success";
}

const StatusCard = ({ label, count, variant = "default" }: StatusCardProps) => {
  const colors = {
    default: "bg-primary text-primary-foreground",
    warning: "bg-amber-500 text-white",
    danger: "bg-danger text-danger-foreground",
    success: "bg-emerald-500 text-white",
  };

  return (
    <div className={`${colors[variant]} rounded-lg px-6 py-3 text-center shadow-md`}>
      <span className="font-semibold text-lg">
        {label}: {count}
      </span>
    </div>
  );
};

export default StatusCard;
