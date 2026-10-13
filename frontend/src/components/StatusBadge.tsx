type Variant = "passed" | "progress" | "todo" | "mastered";

const styles: Record<Variant, string> = {
  passed: "bg-success/10 text-success",
  progress: "bg-primary/10 text-primary",
  todo: "bg-slate-100 text-slate-500",
  mastered: "bg-mastered/10 text-mastered",
};

const labels: Record<Variant, string> = {
  passed: "已通过",
  progress: "进行中",
  todo: "未开始",
  mastered: "已掌握",
};

export default function StatusBadge({
  variant,
  children,
}: {
  variant: Variant;
  children?: React.ReactNode;
}) {
  return (
    <span className={`badge ${styles[variant]}`}>
      {children ?? labels[variant]}
    </span>
  );
}
