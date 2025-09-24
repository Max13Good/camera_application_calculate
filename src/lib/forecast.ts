export const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

export function uniformWeights(months: number): number[] {
  if (months <= 0) return [];
  const w = 1 / months;
  return Array.from({ length: months }, () => w);
}

export function logisticWeights(
  months: number,
  k: number = 0.5,
  x0: number | null = null
): number[] {
  if (months <= 0) return [];
  const mid = x0 == null ? (months + 1) / 2 : clamp(x0, 1, months);
  const xs = Array.from({ length: months + 1 }, (_, i) => i); // 0..months
  const cdf = xs.map((t) => 1 / (1 + Math.exp(-k * (t - mid))));
  const diffs: number[] = [];
  for (let i = 1; i < cdf.length; i++)
    diffs.push(Math.max(0, cdf[i] - cdf[i - 1]));
  const sum = diffs.reduce((s, v) => s + v, 0) || 1;
  return diffs.map((v) => v / sum);
}

export function makeCompetitorSchedule({
  mode = "uniform",
  total,
  months,
  params = {},
}: {
  mode?: "uniform" | "logistic";
  total: number;
  months: number;
  params?: { k?: number; x0?: number | null };
}): number[] {
  const m = Math.max(1, Math.floor(months || 1));
  const W =
    mode === "logistic"
      ? logisticWeights(m, params.k ?? 0.5, params.x0 ?? null)
      : uniformWeights(m);
  return W.map((w) => w * (total || 0));
}

