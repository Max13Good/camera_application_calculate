import { useMemo } from "react";

export default function Num({
  value,
  digits = 0,
}: {
  value: number;
  digits?: number;
}) {
  const fmt = useMemo(
    () =>
      new Intl.NumberFormat("ru-RU", {
        maximumFractionDigits: digits,
        minimumFractionDigits: digits,
      }),
    [digits]
  );
  return (
    <span className="tabular-nums whitespace-nowrap">
      {fmt.format(isFinite(value) ? value : 0)}
    </span>
  );
}
