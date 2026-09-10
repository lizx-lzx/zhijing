// A lightweight rhythm example; content examples live in the real case preview.
export function PacePreview({ pace }: { pace: string }) {
  const labels: Record<string, string[]> = {
    compact: ["重点", "结论"],
    balanced: ["重点", "例子", "结论"],
    gentle: ["背景", "第一步", "第二步", "结论"],
  };
  return (
    <span className={`z-pace-preview z-pace-${pace}`} aria-hidden="true">
      {(labels[pace] || labels.balanced).map((label) => (
        <span key={label}>{label}</span>
      ))}
    </span>
  );
}

export function ChoicePreview({
  question,
  value,
}: {
  question: string;
  value: string;
}) {
  if (question === "pace") return <PacePreview pace={value} />;
  return null;
}
