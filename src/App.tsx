import React, { useMemo, useState } from "react";
import {
  LineChart as RLineChart,
  Line,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Mini App v2 — Cloud Pricing & Profit Calculator (RU)
// Добавлено: вкладка «Прогноз», месяцы/годы, таблица с подробной экономикой,
// подсказки к столбцам, графики роста выручки/затрат/прибыли и активной базы.

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white shadow-sm rounded-2xl p-5 border border-gray-100">
      <h2 className="text-lg font-semibold mb-3">{title}</h2>
      {children}
    </div>
  );
}

function Num({ value, digits = 0 }: { value: number; digits?: number }) {
  const fmt = useMemo(
    () =>
      new Intl.NumberFormat("ru-RU", {
        maximumFractionDigits: digits,
        minimumFractionDigits: digits,
      }),
    [digits]
  );
  return <span>{fmt.format(isFinite(value) ? value : 0)}</span>;
}

const toNum = (v: any, fallback = 0) => {
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return isFinite(n) ? n : fallback;
};

function Help({ text }: { text: string }) {
  return (
    <span
      className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-[10px] font-semibold"
      title={text}
    >
      ?
    </span>
  );
}

export default function App() {
  // ---------- Global inputs ----------
  const [fx, setFx] = useState(90); // RUB for 1 USD
  const [accounts, setAccounts] = useState(4800);
  const [avgCams, setAvgCams] = useState(2);
  const [cloudShare, setCloudShare] = useState(0.2); // 0..1
  const [cdnRatio, setCdnRatio] = useState(0.3);
  const [liveHours, setLiveHours] = useState(1);
  const [relayShare, setRelayShare] = useState(0.2);
  const [apiPerDay, setApiPerDay] = useState(100);
  const [monthDays, setMonthDays] = useState(30);
  const [backendFixed, setBackendFixed] = useState(15000);
  const [opsFixed, setOpsFixed] = useState(1000);

  // Recording mode
  const [fullMode, setFullMode] = useState(false);
  const [bitrateMbps, setBitrateMbps] = useState(1.5);
  const [fullHours, setFullHours] = useState(24);
  const [gbPerDayMotion, setGbPerDayMotion] = useState(1);

  // Unit prices
  const [tuyaSDKyrUSD, setTuyaSDKyrUSD] = useState(5000);
  const [tuyaApiUSDpm, setTuyaApiUSDpm] = useState(3.15);
  const [tuyaMsgUSDpm, setTuyaMsgUSDpm] = useState(1.24);
  const [tuyaRelayUSDpGB, setTuyaRelayUSDpGB] = useState(0.08);
  const [ycStorageRUBpGBm, setYcStorageRUBpGBm] = useState(1.2);
  const [ycCDNRUBpGB, setYcCDNRUBpGB] = useState(0.6);

  // Packages
  type Pkg = {
    name: string;
    days: number;
    capPerCamGB: number;
    includedCams: number;
    price: number;
    addlCamPrice: number;
    overagePerGB: number;
    mix: number;
  };
  const [pkgs, setPkgs] = useState<Pkg[]>([
    {
      name: "Basic",
      days: 7,
      capPerCamGB: 5,
      includedCams: 1,
      price: 150,
      addlCamPrice: 99,
      overagePerGB: 7,
      mix: 0.5,
    },
    {
      name: "Standard",
      days: 30,
      capPerCamGB: 25,
      includedCams: 1,
      price: 299,
      addlCamPrice: 149,
      overagePerGB: 7,
      mix: 0.35,
    },
    {
      name: "Premium",
      days: 90,
      capPerCamGB: 75,
      includedCams: 2,
      price: 699,
      addlCamPrice: 199,
      overagePerGB: 7,
      mix: 0.15,
    },
  ]);

  // Derived counts
  const camsTotal = useMemo(
    () => Math.round(accounts * avgCams),
    [accounts, avgCams]
  );
  const cloudAccounts = useMemo(
    () => Math.round(accounts * cloudShare),
    [accounts, cloudShare]
  );
  const camsCloud = useMemo(
    () => Math.round(cloudAccounts * avgCams),
    [cloudAccounts, avgCams]
  );

  // GB/day per camera (mode-dependent)
  const gbPerDay = useMemo(
    () =>
      fullMode ? ((bitrateMbps / 8) * 3600 * fullHours) / 1024 : gbPerDayMotion,
    [fullMode, bitrateMbps, fullHours, gbPerDayMotion]
  );

  // Helper functions
  const tuyaSDKmoRUB = useMemo(
    () => (tuyaSDKyrUSD / 12) * fx,
    [tuyaSDKyrUSD, fx]
  );
  const camHoursPerDayForRelay = useMemo(
    () => liveHours * relayShare,
    [liveHours, relayShare]
  );

  // Unit economics per package (per cloud account)
  type UnitRow = {
    name: string;
    revenueAcc: number;
    overageAcc: number;
    yandexCostAcc: number;
    tuyaCostAcc: number;
    costAcc: number;
    profitAcc: number;
    marginAcc: number;
  };

  const unitRows: UnitRow[] = useMemo(() => {
    const rows: UnitRow[] = [];
    const sdkPerAcc = tuyaSDKmoRUB / Math.max(accounts, 1);

    const apiTotal = camsTotal * apiPerDay * monthDays;
    const apiRubTotal =
      Math.max(0, (apiTotal - 1_000_000) / 1_000_000) * tuyaApiUSDpm * fx;
    const apiPerAcc = apiRubTotal / Math.max(accounts, 1);

    const msgsTotal = camsTotal * 10 * monthDays;
    const msgsRubTotal = (msgsTotal / 1_000_000) * tuyaMsgUSDpm * fx;
    const msgsPerAcc = msgsRubTotal / Math.max(accounts, 1);

    const relayGbTotal = camsTotal * camHoursPerDayForRelay * 0.72 * monthDays; // ~0.72 GB/h
    const relayRubTotal = relayGbTotal * tuyaRelayUSDpGB * fx;
    const relayPerAcc = relayRubTotal / Math.max(accounts, 1);

    const backendOpsPerAcc =
      (backendFixed + opsFixed) / Math.max(cloudAccounts, 1);

    for (const pkg of pkgs) {
      const factPerCamGB = gbPerDay * pkg.days;
      const billablePerCamGB = Math.min(factPerCamGB, pkg.capPerCamGB);
      const storageGBacc = billablePerCamGB * avgCams;
      const cdnGBacc = storageGBacc * cdnRatio;
      const yandexCostAcc =
        storageGBacc * ycStorageRUBpGBm +
        cdnGBacc * ycCDNRUBpGB +
        backendOpsPerAcc;

      const extraCams = Math.max(0, avgCams - pkg.includedCams);
      const revenueAcc = pkg.price + extraCams * pkg.addlCamPrice;
      const overagePerCam = Math.max(0, factPerCamGB - pkg.capPerCamGB);
      const overageAcc = overagePerCam * avgCams * pkg.overagePerGB;

      const tuyaCostAcc = sdkPerAcc + apiPerAcc + msgsPerAcc + relayPerAcc;
      const costAcc = yandexCostAcc + tuyaCostAcc;
      const profitAcc = revenueAcc + overageAcc - costAcc;
      const marginAcc =
        revenueAcc + overageAcc > 0
          ? (profitAcc / (revenueAcc + overageAcc)) * 100
          : 0;

      rows.push({
        name: pkg.name,
        revenueAcc,
        overageAcc,
        yandexCostAcc,
        tuyaCostAcc,
        costAcc,
        profitAcc,
        marginAcc,
      });
    }
    return rows;
  }, [
    pkgs,
    avgCams,
    gbPerDay,
    cdnRatio,
    ycStorageRUBpGBm,
    ycCDNRUBpGB,
    backendFixed,
    opsFixed,
    tuyaSDKmoRUB,
    accounts,
    camsTotal,
    apiPerDay,
    monthDays,
    tuyaApiUSDpm,
    fx,
    tuyaMsgUSDpm,
    liveHours,
    relayShare,
    tuyaRelayUSDpGB,
    cloudAccounts,
    camHoursPerDayForRelay,
  ]);

  // Portfolio summary (mix × cloud accounts)
  const portfolio = useMemo(() => {
    const rows = unitRows.map((r) => {
      const mix = pkgs.find((p) => p.name === r.name)?.mix ?? 0;
      const accs = cloudAccounts * mix;
      return {
        name: r.name,
        accs,
        revenue: (r.revenueAcc + r.overageAcc) * accs,
        yCost: r.yandexCostAcc * accs,
        tCost: r.tuyaCostAcc * accs,
        cost: r.costAcc * accs,
        profit: r.profitAcc * accs,
      };
    });
    const totals = rows.reduce(
      (s, r) => ({
        revenue: s.revenue + r.revenue,
        yCost: s.yCost + r.yCost,
        tCost: s.tCost + r.tCost,
        cost: s.cost + r.cost,
        profit: s.profit + r.profit,
      }),
      { revenue: 0, yCost: 0, tCost: 0, cost: 0, profit: 0 }
    );
    return { rows, totals };
  }, [unitRows, pkgs, cloudAccounts]);

  // ---------------- PROGNOZ (months/years) ----------------
  const [months, setMonths] = useState(24);
  const [churn, setChurn] = useState(0.03);
  const [salesStart, setSalesStart] = useState(2000); // камер в 1-й месяц
  const [salesGrowthPct, setSalesGrowthPct] = useState(0.03); // рост продаж в мес
  const [cloudNewShare, setCloudNewShare] = useState(0.2); // доля облака среди новых

  const forecast = useMemo(() => {
    // Средние per-account по всему портфелю (взвешенные по миксу)
    const mixMap = Object.fromEntries(pkgs.map((p) => [p.name, p.mix]));
    const w = (key: keyof UnitRow) =>
      unitRows.reduce((s, r) => s + r[key] * (mixMap[r.name] || 0), 0);
    const revPerAcc = w("revenueAcc") + w("overageAcc");
    const yCostPerAcc = w("yandexCostAcc");
    const tCostPerAcc = w("tuyaCostAcc");

    const rows: any[] = [];
    let activeCloudAcc = Math.round(cloudAccounts); // стартуем с текущей базы облака
    let totalCams = camsTotal;

    for (let m = 1; m <= months; m++) {
      const sales = Math.round(
        salesStart * Math.pow(1 + salesGrowthPct, m - 1)
      );
      const newAcc = sales / Math.max(avgCams, 1e-9);
      const newCloudAcc = newAcc * cloudNewShare;

      activeCloudAcc = Math.round(activeCloudAcc * (1 - churn) + newCloudAcc);
      totalCams += sales;

      const revenue = activeCloudAcc * revPerAcc;
      const yCost = activeCloudAcc * yCostPerAcc;
      const tCost = activeCloudAcc * tCostPerAcc; // project Tuya cost, приближение
      const totalCost = yCost + tCost;
      const profit = revenue - totalCost;

      rows.push({
        month: m,
        sales,
        newAcc: Math.round(newAcc),
        newCloudAcc: Math.round(newCloudAcc),
        activeCloudAcc,
        totalCams,
        revenue,
        yCost,
        tCost,
        totalCost,
        profit,
        cumProfit: (rows[m - 2]?.cumProfit || 0) + profit,
      });
    }

    // Годы (агрегация по 12 мес)
    const years: any[] = [];
    for (let i = 0; i < rows.length; i += 12) {
      const chunk = rows.slice(i, i + 12);
      years.push({
        year: i / 12 + 1,
        revenue: chunk.reduce((s, r) => s + r.revenue, 0),
        cost: chunk.reduce((s, r) => s + r.totalCost, 0),
        profit: chunk.reduce((s, r) => s + r.profit, 0),
        endActiveCloudAcc: chunk[chunk.length - 1].activeCloudAcc,
        endTotalCams: chunk[chunk.length - 1].totalCams,
      });
    }

    return { rows, years };
  }, [
    months,
    churn,
    salesStart,
    salesGrowthPct,
    cloudNewShare,
    unitRows,
    pkgs,
    cloudAccounts,
    camsTotal,
    avgCams,
  ]);

  const breakevenMonth = useMemo(
    () => forecast.rows.find((r) => r.cumProfit > 0)?.month ?? null,
    [forecast]
  );

  // ---------------- UI ----------------
  const [tab, setTab] = useState<"calc" | "forecast">("calc");

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">
            Мини‑калькулятор: Облачное хранилище камер (RU)
          </h1>
          <div className="ml-auto flex gap-2 bg-white rounded-xl p-1 border border-gray-200">
            <button
              onClick={() => setTab("calc")}
              className={`px-3 py-1.5 rounded-lg text-sm ${
                tab === "calc"
                  ? "bg-indigo-600 text-white"
                  : "hover:bg-gray-100"
              }`}
            >
              Калькулятор
            </button>
            <button
              onClick={() => setTab("forecast")}
              className={`px-3 py-1.5 rounded-lg text-sm ${
                tab === "forecast"
                  ? "bg-indigo-600 text-white"
                  : "hover:bg-gray-100"
              }`}
            >
              Прогноз
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          Играй параметрами — смотри юнит‑экономику по пакетам, сводку по
          портфелю и динамику прибыли/затрат во времени.
        </p>

        {tab === "calc" && (
          <>
            {/* Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Section title="База / Пользователи">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <label>
                    Курс ₽ за ${" "}
                    <Help text="Курс используется для конвертации цен Tuya в рубли." />
                  </label>
                  <input
                    className="input"
                    type="number"
                    value={fx}
                    onChange={(e) => setFx(toNum(e.target.value, 90))}
                  />
                  <label>Аккаунтов (всего)</label>
                  <input
                    className="input"
                    type="number"
                    value={accounts}
                    onChange={(e) => setAccounts(toNum(e.target.value, 4800))}
                  />
                  <label>
                    Камер на аккаунт (ср.){" "}
                    <Help text="Среднее количество камер, привязанных к одному аккаунту." />
                  </label>
                  <input
                    className="input"
                    type="number"
                    step="0.1"
                    value={avgCams}
                    onChange={(e) => setAvgCams(toNum(e.target.value, 2))}
                  />
                  <label>
                    Доля облака (0..1){" "}
                    <Help text="Доля существующих аккаунтов, которые купили облачное хранение." />
                  </label>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    value={cloudShare}
                    onChange={(e) => setCloudShare(toNum(e.target.value, 0.2))}
                  />
                  <label>Дней в месяце</label>
                  <input
                    className="input"
                    type="number"
                    value={monthDays}
                    onChange={(e) => setMonthDays(toNum(e.target.value, 30))}
                  />
                  <label>Backend фикс (₽/мес)</label>
                  <input
                    className="input"
                    type="number"
                    value={backendFixed}
                    onChange={(e) =>
                      setBackendFixed(toNum(e.target.value, 15000))
                    }
                  />
                  <label>Ops фикс (₽/мес)</label>
                  <input
                    className="input"
                    type="number"
                    value={opsFixed}
                    onChange={(e) => setOpsFixed(toNum(e.target.value, 1000))}
                  />
                </div>
              </Section>

              <Section title="Трафик / Видео">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <label className="col-span-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={fullMode}
                      onChange={(e) => setFullMode(e.target.checked)}
                    />
                    Непрерывная запись (Full)
                  </label>
                  <label>
                    Битрейт (Мбит/с){" "}
                    <Help text="Используется в режиме Full для расчёта объёма в ГБ/день." />
                  </label>
                  <input
                    className="input"
                    type="number"
                    step="0.1"
                    value={bitrateMbps}
                    onChange={(e) => setBitrateMbps(toNum(e.target.value, 1.5))}
                  />
                  <label>Часов/день (Full)</label>
                  <input
                    className="input"
                    type="number"
                    value={fullHours}
                    onChange={(e) => setFullHours(toNum(e.target.value, 24))}
                  />
                  <label>
                    ГБ/день/камера (Motion){" "}
                    <Help text="Средний фактический объём при записи по событиям." />
                  </label>
                  <input
                    className="input"
                    type="number"
                    step="0.1"
                    value={gbPerDayMotion}
                    onChange={(e) =>
                      setGbPerDayMotion(toNum(e.target.value, 1))
                    }
                  />
                  <label>Доля CDN скачиваний</label>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    value={cdnRatio}
                    onChange={(e) => setCdnRatio(toNum(e.target.value, 0.3))}
                  />
                  <label>Live часов/день</label>
                  <input
                    className="input"
                    type="number"
                    step="0.1"
                    value={liveHours}
                    onChange={(e) => setLiveHours(toNum(e.target.value, 1))}
                  />
                  <label>Доля relay в live</label>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    value={relayShare}
                    onChange={(e) => setRelayShare(toNum(e.target.value, 0.2))}
                  />
                  <label>API вызовов/камера/день</label>
                  <input
                    className="input"
                    type="number"
                    value={apiPerDay}
                    onChange={(e) => setApiPerDay(toNum(e.target.value, 100))}
                  />
                </div>
              </Section>

              <Section title="Тарифы за единицу (RUB/USD)">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <label>Tuya SDK ($/год)</label>
                  <input
                    className="input"
                    type="number"
                    value={tuyaSDKyrUSD}
                    onChange={(e) =>
                      setTuyaSDKyrUSD(toNum(e.target.value, 5000))
                    }
                  />
                  <label>Tuya API ($/1 млн)</label>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    value={tuyaApiUSDpm}
                    onChange={(e) =>
                      setTuyaApiUSDpm(toNum(e.target.value, 3.15))
                    }
                  />
                  <label>Tuya Msgs ($/1 млн)</label>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    value={tuyaMsgUSDpm}
                    onChange={(e) =>
                      setTuyaMsgUSDpm(toNum(e.target.value, 1.24))
                    }
                  />
                  <label>Tuya Relay ($/ГБ)</label>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    value={tuyaRelayUSDpGB}
                    onChange={(e) =>
                      setTuyaRelayUSDpGB(toNum(e.target.value, 0.08))
                    }
                  />
                  <label>Yandex Storage (₽/ГБ-месяц)</label>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    value={ycStorageRUBpGBm}
                    onChange={(e) =>
                      setYcStorageRUBpGBm(toNum(e.target.value, 1.2))
                    }
                  />
                  <label>Yandex CDN (₽/ГБ)</label>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    value={ycCDNRUBpGB}
                    onChange={(e) => setYcCDNRUBpGB(toNum(e.target.value, 0.6))}
                  />
                </div>
              </Section>
            </div>

            {/* Packages table (editable) */}
            <Section title="Пакеты (редактируемые)">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-600">
                      <th className="py-2">Пакет</th>
                      <th>Дней</th>
                      <th>Лимит ГБ/кам</th>
                      <th>Вкл. камер</th>
                      <th>Цена/мес</th>
                      <th>Доп. камера</th>
                      <th>Перерасход ₽/ГБ</th>
                      <th>Микс</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pkgs.map((p, idx) => (
                      <tr key={p.name} className="border-t">
                        <td className="py-1 font-medium">{p.name}</td>
                        <td>
                          <input
                            className="input w-20"
                            type="number"
                            value={p.days}
                            onChange={(e) => {
                              const v = toNum(e.target.value, p.days);
                              const next = [...pkgs];
                              next[idx] = { ...p, days: v };
                              setPkgs(next);
                            }}
                          />
                        </td>
                        <td>
                          <input
                            className="input w-24"
                            type="number"
                            value={p.capPerCamGB}
                            onChange={(e) => {
                              const v = toNum(e.target.value, p.capPerCamGB);
                              const next = [...pkgs];
                              next[idx] = { ...p, capPerCamGB: v };
                              setPkgs(next);
                            }}
                          />
                        </td>
                        <td>
                          <input
                            className="input w-20"
                            type="number"
                            value={p.includedCams}
                            onChange={(e) => {
                              const v = toNum(e.target.value, p.includedCams);
                              const next = [...pkgs];
                              next[idx] = { ...p, includedCams: v };
                              setPkgs(next);
                            }}
                          />
                        </td>
                        <td>
                          <input
                            className="input w-24"
                            type="number"
                            value={p.price}
                            onChange={(e) => {
                              const v = toNum(e.target.value, p.price);
                              const next = [...pkgs];
                              next[idx] = { ...p, price: v };
                              setPkgs(next);
                            }}
                          />
                        </td>
                        <td>
                          <input
                            className="input w-24"
                            type="number"
                            value={p.addlCamPrice}
                            onChange={(e) => {
                              const v = toNum(e.target.value, p.addlCamPrice);
                              const next = [...pkgs];
                              next[idx] = { ...p, addlCamPrice: v };
                              setPkgs(next);
                            }}
                          />
                        </td>
                        <td>
                          <input
                            className="input w-24"
                            type="number"
                            value={p.overagePerGB}
                            onChange={(e) => {
                              const v = toNum(e.target.value, p.overagePerGB);
                              const next = [...pkgs];
                              next[idx] = { ...p, overagePerGB: v };
                              setPkgs(next);
                            }}
                          />
                        </td>
                        <td>
                          <input
                            className="input w-20"
                            type="number"
                            step="0.01"
                            value={p.mix}
                            onChange={(e) => {
                              const v = toNum(e.target.value, p.mix);
                              const next = [...pkgs];
                              next[idx] = { ...p, mix: v };
                              setPkgs(next);
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            {/* Unit economics */}
            <Section title="Юнит‑экономика по пакетам (на 1 облачный аккаунт)">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-600">
                      <th className="py-2">Пакет</th>
                      <th>
                        Выручка/акк <Help text="Цена пакета + доп. камеры" />
                      </th>
                      <th>
                        Overage/акк{" "}
                        <Help text="Плата за перерасход лимита ГБ" />
                      </th>
                      <th>
                        Yandex cost/акк{" "}
                        <Help text="Storage + CDN + доля фикс" />
                      </th>
                      <th>
                        Tuya cost/акк <Help text="SDK + API + Msgs + Relay" />
                      </th>
                      <th>Себестоимость/акк</th>
                      <th>Прибыль/акк</th>
                      <th>Маржа %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unitRows.map((r) => (
                      <tr key={r.name} className="border-t">
                        <td className="py-1 font-medium">{r.name}</td>
                        <td>
                          <Num value={r.revenueAcc} />
                        </td>
                        <td>
                          <Num value={r.overageAcc} />
                        </td>
                        <td>
                          <Num value={r.yandexCostAcc} />
                        </td>
                        <td>
                          <Num value={r.tuyaCostAcc} />
                        </td>
                        <td>
                          <Num value={r.costAcc} />
                        </td>
                        <td
                          className={
                            r.profitAcc >= 0 ? "text-green-600" : "text-red-600"
                          }
                        >
                          <Num value={r.profitAcc} />
                        </td>
                        <td>
                          <Num value={r.marginAcc} digits={1} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            {/* Portfolio summary */}
            <Section title="Суммарно по портфелю (микс × облачные аккаунты)">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-gray-500">Аккаунтов всего</div>
                  <div className="text-xl font-semibold">
                    <Num value={accounts} />
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-gray-500">Облачных аккаунтов</div>
                  <div className="text-xl font-semibold">
                    <Num value={cloudAccounts} />
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-gray-500">Камер всего</div>
                  <div className="text-xl font-semibold">
                    <Num value={camsTotal} />
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-gray-500">Камер в облаке</div>
                  <div className="text-xl font-semibold">
                    <Num value={camsCloud} />
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto mt-4">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-600">
                      <th className="py-2">Пакет</th>
                      <th>Облачные аккаунты</th>
                      <th>Выручка</th>
                      <th>Yandex cost</th>
                      <th>Tuya cost</th>
                      <th>Себестоимость</th>
                      <th>Прибыль</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.rows.map((r) => (
                      <tr key={r.name} className="border-t">
                        <td className="py-1 font-medium">{r.name}</td>
                        <td>
                          <Num value={r.accs} />
                        </td>
                        <td>
                          <Num value={r.revenue} />
                        </td>
                        <td>
                          <Num value={r.yCost} />
                        </td>
                        <td>
                          <Num value={r.tCost} />
                        </td>
                        <td>
                          <Num value={r.cost} />
                        </td>
                        <td
                          className={
                            r.profit >= 0 ? "text-green-600" : "text-red-600"
                          }
                        >
                          <Num value={r.profit} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t font-semibold">
                      <td className="py-2">ИТОГО</td>
                      <td></td>
                      <td>
                        <Num value={portfolio.totals.revenue} />
                      </td>
                      <td>
                        <Num value={portfolio.totals.yCost} />
                      </td>
                      <td>
                        <Num value={portfolio.totals.tCost} />
                      </td>
                      <td>
                        <Num value={portfolio.totals.cost} />
                      </td>
                      <td
                        className={
                          portfolio.totals.profit >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        <Num value={portfolio.totals.profit} />
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Section>
          </>
        )}

        {tab === "forecast" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Section title="Параметры прогноза (месяцы)">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <label>Горизонт (мес)</label>
                  <input
                    className="input"
                    type="number"
                    value={months}
                    onChange={(e) => setMonths(toNum(e.target.value, 24))}
                  />
                  <label>Churn (отток/мес)</label>
                  <input
                    className="input"
                    type="number"
                    step="0.001"
                    value={churn}
                    onChange={(e) => setChurn(toNum(e.target.value, 0.03))}
                  />
                  <label>Продажи камер 1‑й мес</label>
                  <input
                    className="input"
                    type="number"
                    value={salesStart}
                    onChange={(e) => setSalesStart(toNum(e.target.value, 2000))}
                  />
                  <label>Рост продаж %/мес</label>
                  <input
                    className="input"
                    type="number"
                    step="0.001"
                    value={salesGrowthPct}
                    onChange={(e) =>
                      setSalesGrowthPct(toNum(e.target.value, 0.03))
                    }
                  />
                  <label>Доля облака новых</label>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    value={cloudNewShare}
                    onChange={(e) =>
                      setCloudNewShare(toNum(e.target.value, 0.2))
                    }
                  />
                </div>
              </Section>

              <Section title="Ключевые показатели">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-500">Месяц безубыточности</div>
                  <div className="font-semibold">
                    {breakevenMonth ? `Месяц ${breakevenMonth}` : "—"}
                  </div>
                  <div className="text-gray-500">Выручка / мес (последний)</div>
                  <div className="font-semibold">
                    <Num value={forecast.rows.at(-1)?.revenue || 0} />
                  </div>
                  <div className="text-gray-500">
                    Себестоимость / мес (последний)
                  </div>
                  <div className="font-semibold">
                    <Num value={forecast.rows.at(-1)?.totalCost || 0} />
                  </div>
                  <div className="text-gray-500">
                    Активные облачные аккаунты (последний)
                  </div>
                  <div className="font-semibold">
                    <Num value={forecast.rows.at(-1)?.activeCloudAcc || 0} />
                  </div>
                </div>
              </Section>

              <Section title="Годовая сводка (агрегировано)">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-600">
                        <th className="py-2">Год</th>
                        <th>Выручка</th>
                        <th>Себестоимость</th>
                        <th>Прибыль</th>
                        <th>Активные облачные (на конец)</th>
                        <th>Камер всего (на конец)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {forecast.years.map((y) => (
                        <tr key={y.year} className="border-t">
                          <td className="py-1">{y.year}</td>
                          <td>
                            <Num value={y.revenue} />
                          </td>
                          <td>
                            <Num value={y.cost} />
                          </td>
                          <td
                            className={
                              y.profit >= 0 ? "text-green-600" : "text-red-600"
                            }
                          >
                            <Num value={y.profit} />
                          </td>
                          <td>
                            <Num value={y.endActiveCloudAcc} />
                          </td>
                          <td>
                            <Num value={y.endTotalCams} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            </div>

            <Section title="Прогноз — таблица по месяцам (описания в подсказках)">
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs md:text-sm">
                  <thead>
                    <tr className="text-left text-gray-600">
                      <th className="py-2">
                        Мес <Help text="Номер месяца от 1 до горизонта" />
                      </th>
                      <th>
                        Продажи камер{" "}
                        <Help text="Сколько камер продано в месяц" />
                      </th>
                      <th>
                        Новые акк <Help text="Продажи / камер на акк" />
                      </th>
                      <th>
                        Новые облачные <Help text="Новые акк × доля облака" />
                      </th>
                      <th>
                        Активные облачные{" "}
                        <Help text="Прошлые×(1−churn)+новые" />
                      </th>
                      <th>
                        Камер всего{" "}
                        <Help text="Кумулятивно: камеры прошлого + продажи" />
                      </th>
                      <th>Выручка</th>
                      <th>Yandex cost</th>
                      <th>Tuya cost</th>
                      <th>Себестоимость</th>
                      <th>Прибыль</th>
                      <th>Накопит. прибыль</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecast.rows.map((r) => (
                      <tr key={r.month} className="border-t">
                        <td className="py-1">{r.month}</td>
                        <td>
                          <Num value={r.sales} />
                        </td>
                        <td>
                          <Num value={r.newAcc} />
                        </td>
                        <td>
                          <Num value={r.newCloudAcc} />
                        </td>
                        <td>
                          <Num value={r.activeCloudAcc} />
                        </td>
                        <td>
                          <Num value={r.totalCams} />
                        </td>
                        <td>
                          <Num value={r.revenue} />
                        </td>
                        <td>
                          <Num value={r.yCost} />
                        </td>
                        <td>
                          <Num value={r.tCost} />
                        </td>
                        <td>
                          <Num value={r.totalCost} />
                        </td>
                        <td
                          className={
                            r.profit >= 0 ? "text-green-600" : "text-red-600"
                          }
                        >
                          <Num value={r.profit} />
                        </td>
                        <td
                          className={
                            r.cumProfit >= 0 ? "text-green-600" : "text-red-600"
                          }
                        >
                          <Num value={r.cumProfit} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title="Графики">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-64 bg-white rounded-xl p-3 border border-gray-100">
                  <div className="text-sm font-medium mb-2">
                    Выручка vs Себестоимость vs Прибыль (помесячно)
                  </div>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={forecast.rows}
                      margin={{ left: 0, right: 0, top: 10, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="5%"
                            stopColor="#8884d8"
                            stopOpacity={0.4}
                          />
                          <stop
                            offset="95%"
                            stopColor="#8884d8"
                            stopOpacity={0}
                          />
                        </linearGradient>
                        <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="5%"
                            stopColor="#82ca9d"
                            stopOpacity={0.4}
                          />
                          <stop
                            offset="95%"
                            stopColor="#82ca9d"
                            stopOpacity={0}
                          />
                        </linearGradient>
                        <linearGradient id="g3" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="5%"
                            stopColor="#ff7300"
                            stopOpacity={0.4}
                          />
                          <stop
                            offset="95%"
                            stopColor="#ff7300"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <RTooltip
                        formatter={(v) =>
                          new Intl.NumberFormat("ru-RU").format(Number(v))
                        }
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        name="Выручка"
                        stroke="#8884d8"
                        fill="url(#g1)"
                      />
                      <Area
                        type="monotone"
                        dataKey="totalCost"
                        name="Себестоимость"
                        stroke="#82ca9d"
                        fill="url(#g2)"
                      />
                      <Area
                        type="monotone"
                        dataKey="profit"
                        name="Прибыль"
                        stroke="#ff7300"
                        fill="url(#g3)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="h-64 bg-white rounded-xl p-3 border border-gray-100">
                  <div className="text-sm font-medium mb-2">
                    Рост базы (облачные аккаунты)
                  </div>
                  <ResponsiveContainer width="100%" height="100%">
                    <RLineChart data={forecast.rows}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <RTooltip
                        formatter={(v) =>
                          new Intl.NumberFormat("ru-RU").format(Number(v))
                        }
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="activeCloudAcc"
                        name="Облачные аккаунты"
                        stroke="#2563eb"
                      />
                    </RLineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </Section>
          </>
        )}

        <Section title="Подсказки">
          <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
            <li>
              Переключатель «Непрерывная запись (Full)» включает расчёт ГБ/день
              от битрейта: ГБ/день = (Мбит/с ÷ 8) × 3600 × часов/день ÷ 1024.
            </li>
            <li>
              При Motion Detection используется поле «ГБ/день/камера (Motion)».
            </li>
            <li>
              Хранилище тарифицируется по правилу: на аккаунт берётся min(факт;
              лимит пакета) × камер/аккаунт.
            </li>
            <li>
              CDN считается как доля (по умолчанию 30%) от объёма хранения на
              аккаунт.
            </li>
            <li>
              Tuya SDK/API/Msgs/Relay распределяются на аккаунт пропорционально
              общей базе камер.
            </li>
            <li>
              Во вкладке «Прогноз» можно задать горизонт, отток (churn),
              стартовые продажи, темп роста и долю облака среди новых, смотреть
              таблицу по месяцам и годовые итоги.
            </li>
          </ul>
        </Section>
      </div>

      {/* Tiny input style */}
      <style>{`
        .input { @apply bg-white border border-gray-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full; }
      `}</style>
    </div>
  );
}
