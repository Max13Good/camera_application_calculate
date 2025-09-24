import { PieChart, Pie, Cell, Legend, Tooltip as RTooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis } from "recharts";

type Tariff = { id: string; family: "camera" | "smarthome" | "bundle"; name: string };

export function RevenueFamilyPie({
  tariffs,
  revByTariff,
}: {
  tariffs: Tariff[];
  revByTariff: Record<string, number>;
}) {
  const data = [
    {
      name: "Камеры",
      value: tariffs
        .filter((t) => t.family === "camera")
        .reduce((s, t) => s + (revByTariff[t.id] || 0), 0),
    },
    {
      name: "Умный дом",
      value: tariffs
        .filter((t) => t.family === "smarthome")
        .reduce((s, t) => s + (revByTariff[t.id] || 0), 0),
    },
    {
      name: "Комбо",
      value: tariffs
        .filter((t) => t.family === "bundle")
        .reduce((s, t) => s + (revByTariff[t.id] || 0), 0),
    },
  ];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie dataKey="value" data={data} label>
          {["#6366f1", "#10b981", "#f59e0b"].map((c, i) => (
            <Cell key={i} fill={c} />
          ))}
        </Pie>
        <Legend />
        <RTooltip
          formatter={(v: number | string) =>
            new Intl.NumberFormat("ru-RU").format(Number(v))
          }
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function TopTariffsRevenueBar({
  rows,
}: {
  rows: Array<{ name: string; revenue: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} hide={false} interval={0} angle={-20} textAnchor="end" height={50} />
        <YAxis tick={{ fontSize: 11 }} />
        <RTooltip formatter={(v: number | string) => new Intl.NumberFormat("ru-RU").format(Number(v))} />
        <Bar dataKey="revenue" name="Выручка" fill="#6366f1" />
      </BarChart>
    </ResponsiveContainer>
  );
}

