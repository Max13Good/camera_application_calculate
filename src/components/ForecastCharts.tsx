import {
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart as RLineChart,
  Line,
} from "recharts";

type Row = {
  month: number;
  revenue: number;
  cost: number;
  profit: number;
  activeByFamily: { camera: number; smarthome: number; bundle: number };
};

export function ForecastAreaChart({ rows }: { rows: Row[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={rows} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="g3" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ff7300" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#ff7300" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <RTooltip
          formatter={(v: number | string) =>
            new Intl.NumberFormat("ru-RU").format(Number(v))
          }
        />
        <Legend />
        <Area type="monotone" dataKey="revenue" name="Выручка" stroke="#8884d8" fill="url(#g1)" />
        <Area type="monotone" dataKey="cost" name="Себестоимость" stroke="#82ca9d" fill="url(#g2)" />
        <Area type="monotone" dataKey="profit" name="Прибыль" stroke="#ff7300" fill="url(#g3)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ActiveBaseLineChart({ rows }: { rows: Row[] }) {
  const data = rows.map((r) => ({
    ...r,
    activeTotal: r.activeByFamily.camera + r.activeByFamily.smarthome + r.activeByFamily.bundle,
  }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RLineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <RTooltip
          formatter={(v: number | string) =>
            new Intl.NumberFormat("ru-RU").format(Number(v))
          }
        />
        <Legend />
        <Line type="monotone" dataKey="activeTotal" name="Активные всего" stroke="#2563eb" />
      </RLineChart>
    </ResponsiveContainer>
  );
}

