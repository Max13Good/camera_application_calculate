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

// ------------------------------------------------------------
// Mini App v3 — Cloud Pricing & Profit Calculator (RU)
// Что нового:
// - Исправлена вёрстка: табличные цифры, выравнивание вправо, min-width таблиц,
//   горизонтальная прокрутка, компактные заголовки, нормальные инпуты без @apply.
// - Подробные подсказки (иконка ?), раздел «Руководство» прямо в приложении.
// - Вкладка «Прогноз»: помесячная и годовая модель, кумулятивная прибыль, графики.
// - TypeScript-фиксы (нет .at; типизированы Tooltip и агрегаторы.)
// ------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white shadow-sm rounded-2xl p-5 border border-gray-100 overflow-hidden">
      <h2 className="text-lg font-semibold mb-3">{title}</h2>
      {children}
    </div>
  );
}

function Num({ value, digits = 0 }: { value: number; digits?: number }) {
  const fmt = useMemo(
    () => new Intl.NumberFormat("ru-RU", { maximumFractionDigits: digits, minimumFractionDigits: digits }),
    [digits]
  );
  return (
    <span className="tabular-nums whitespace-nowrap">{fmt.format(isFinite(value) ? value : 0)}</span>
  );
}

function Help({ text }: { text: string }) {
  return (
    <span
      className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-[10px] font-semibold cursor-help"
      title={text}
    >
      ?
    </span>
  );
}

const inputCls =
  "w-full h-9 bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";
const thCls = "py-2 px-2 whitespace-nowrap text-xs leading-tight text-gray-600";
const tdNumCls = "px-2 text-right";
const tdTextCls = "px-2";

export default function App() {
  // ---------- Global inputs ----------
  const [fx, setFx] = useState(90); // ₽ за 1 USD
  const [accounts, setAccounts] = useState(4800);
  const [avgCams, setAvgCams] = useState(2);
  const [cloudShare, setCloudShare] = useState(0.2); // 0..1 доля текущих аккаунтов с облаком
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

  type Pkg = {
    name: string;
    days: number;
    capPerCamGB: number;
    includedCams: number;
    price: number;
    addlCamPrice: number;
    overagePerGB: number;
    mix: number; // доля среди облачных аккаунтов
  };
  const [pkgs, setPkgs] = useState<Pkg[]>([
    { name: "Basic", days: 7, capPerCamGB: 5, includedCams: 1, price: 150, addlCamPrice: 99, overagePerGB: 7, mix: 0.5 },
    { name: "Standard", days: 30, capPerCamGB: 25, includedCams: 1, price: 299, addlCamPrice: 149, overagePerGB: 7, mix: 0.35 },
    { name: "Premium", days: 90, capPerCamGB: 75, includedCams: 2, price: 699, addlCamPrice: 199, overagePerGB: 7, mix: 0.15 },
  ]);

  // Derived counts
  const camsTotal = useMemo(() => Math.round(accounts * avgCams), [accounts, avgCams]);
  const cloudAccounts = useMemo(() => Math.round(accounts * cloudShare), [accounts, cloudShare]);
  const camsCloud = useMemo(() => Math.round(cloudAccounts * avgCams), [cloudAccounts, avgCams]);

  // GB/day per camera (mode-dependent)
  const gbPerDay = useMemo(
    () => (fullMode ? (bitrateMbps / 8) * 3600 * fullHours / 1024 : gbPerDayMotion),
    [fullMode, bitrateMbps, fullHours, gbPerDayMotion]
  );

  // Helper functions
  const tuyaSDKmoRUB = useMemo(() => (tuyaSDKyrUSD / 12) * fx, [tuyaSDKyrUSD, fx]);
  const camHoursPerDayForRelay = useMemo(() => liveHours * relayShare, [liveHours, relayShare]);

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
    const apiRubTotal = Math.max(0, (apiTotal - 1_000_000) / 1_000_000) * tuyaApiUSDpm * fx;
    const apiPerAcc = apiRubTotal / Math.max(accounts, 1);

    const msgsTotal = camsTotal * 10 * monthDays; // эвенты/сообщения
    const msgsRubTotal = (msgsTotal / 1_000_000) * tuyaMsgUSDpm * fx;
    const msgsPerAcc = msgsRubTotal / Math.max(accounts, 1);

    const relayGbTotal = camsTotal * camHoursPerDayForRelay * 0.72 * monthDays; // ~0.72 GB/h при ~1 Мбит/с
    const relayRubTotal = relayGbTotal * tuyaRelayUSDpGB * fx;
    const relayPerAcc = relayRubTotal / Math.max(accounts, 1);

    const backendOpsPerAcc = (backendFixed + opsFixed) / Math.max(cloudAccounts, 1);

    for (const pkg of pkgs) {
      const factPerCamGB = gbPerDay * pkg.days; // фактическая потребность
      const billablePerCamGB = Math.min(factPerCamGB, pkg.capPerCamGB); // лимит тарифа
      const storageGBacc = billablePerCamGB * avgCams;
      const cdnGBacc = storageGBacc * cdnRatio;

      const yandexCostAcc = storageGBacc * ycStorageRUBpGBm + cdnGBacc * ycCDNRUBpGB + backendOpsPerAcc;

      const extraCams = Math.max(0, avgCams - pkg.includedCams);
      const revenueAcc = pkg.price + extraCams * pkg.addlCamPrice;
      const overagePerCam = Math.max(0, factPerCamGB - pkg.capPerCamGB);
      const overageAcc = overagePerCam * avgCams * pkg.overagePerGB;

      const tuyaCostAcc = sdkPerAcc + apiPerAcc + msgsPerAcc + relayPerAcc;
      const costAcc = yandexCostAcc + tuyaCostAcc;
      const profitAcc = revenueAcc + overageAcc - costAcc;
      const marginAcc = (revenueAcc + overageAcc) > 0 ? (profitAcc / (revenueAcc + overageAcc)) * 100 : 0;

      rows.push({ name: pkg.name, revenueAcc, overageAcc, yandexCostAcc, tuyaCostAcc, costAcc, profitAcc, marginAcc });
    }
    return rows;
  }, [pkgs, avgCams, gbPerDay, cdnRatio, ycStorageRUBpGBm, ycCDNRUBpGB, backendFixed, opsFixed, tuyaSDKmoRUB, accounts, camsTotal, apiPerDay, monthDays, tuyaApiUSDpm, fx, tuyaMsgUSDpm, liveHours, relayShare, tuyaRelayUSDpGB, cloudAccounts, camHoursPerDayForRelay]);

  // Portfolio summary (mix × cloud accounts)
  const portfolio = useMemo(() => {
    const rows = unitRows.map(r => {
      const mix = pkgs.find(p => p.name === r.name)?.mix ?? 0;
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

  type ForecastRow = {
    month: number;
    sales: number;
    newAcc: number;
    newCloudAcc: number;
    activeCloudAcc: number;
    totalCams: number;
    revenue: number;
    yCost: number;
    tCost: number;
    totalCost: number;
    profit: number;
    cumProfit: number;
  };

  const forecast = useMemo(() => {
    // Взвешенные средние per-account по портфелю
    const mixMap: Record<string, number> = Object.fromEntries(pkgs.map(p => [p.name, p.mix]));
    const w = (key: keyof UnitRow): number =>
      unitRows.reduce((s, r) => s + (r[key] as number) * (mixMap[r.name] ?? 0), 0);

    const revPerAcc = w("revenueAcc") + w("overageAcc");
    const yCostPerAcc = w("yandexCostAcc");
    const tCostPerAcc = w("tuyaCostAcc");

    const rows: ForecastRow[] = [];
    let activeCloudAcc = Math.round(cloudAccounts); // старт с текущей базы
    let totalCams = camsTotal;

    for (let m = 1; m <= months; m++) {
      const sales = Math.round(salesStart * Math.pow(1 + salesGrowthPct, m - 1));
      const newAcc = sales / Math.max(avgCams, 1e-9);
      const newCloudAcc = newAcc * cloudNewShare;

      activeCloudAcc = Math.round(activeCloudAcc * (1 - churn) + newCloudAcc);
      totalCams += sales;

      const revenue = activeCloudAcc * revPerAcc;
      const yCost = activeCloudAcc * yCostPerAcc;
      const tCost = activeCloudAcc * tCostPerAcc; // приближение
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
        cumProfit: (rows.length ? rows[rows.length - 1].cumProfit : 0) + profit,
      });
    }

    // Годы (агрегация по 12 мес)
    const years = [] as { year: number; revenue: number; cost: number; profit: number; endActiveCloudAcc: number; endTotalCams: number }[];
    for (let i = 0; i < rows.length; i += 12) {
      const chunk = rows.slice(i, i + 12);
      if (!chunk.length) break;
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
  }, [months, churn, salesStart, salesGrowthPct, cloudNewShare, unitRows, pkgs, cloudAccounts, camsTotal, avgCams]);

  const breakevenMonth = useMemo(() => forecast.rows.find(r => r.cumProfit > 0)?.month ?? null, [forecast]);

  // ---------------- UI ----------------
  const [tab, setTab] = useState<"calc" | "forecast">("calc");

  const last = forecast.rows[forecast.rows.length - 1];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Мини‑калькулятор: Облачное хранилище камер (RU)</h1>
          <div className="ml-auto flex gap-2 bg-white rounded-xl p-1 border border-gray-200">
            <button
              onClick={() => setTab("calc")}
              className={`px-3 py-1.5 rounded-lg text-sm ${tab === "calc" ? "bg-indigo-600 text-white" : "hover:bg-gray-100"}`}
            >
              Калькулятор
            </button>
            <button
              onClick={() => setTab("forecast")}
              className={`px-3 py-1.5 rounded-lg text-sm ${tab === "forecast" ? "bg-indigo-600 text-white" : "hover:bg-gray-100"}`}
            >
              Прогноз
            </button>
          </div>
        </div>

        {/* ===== Руководство ===== */}
        <Section title="Руководство по использованию">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
            <div>
              <div className="font-semibold mb-1">Что делает калькулятор</div>
              <ul className="list-disc pl-5 space-y-1">
                <li>Считает юнит‑экономику <b>на 1 облачный аккаунт</b> для каждого пакетного плана (выручка, себестоимость Tuya+Yandex, прибыль, маржа).</li>
                <li>Умножает на текущий <b>микс пакетов</b> и показывает сводные суммы по портфелю.</li>
                <li>Строит <b>прогноз по месяцам</b> (продажи, рост облачной базы, выручка/затраты/прибыль, кумулятивная прибыль) и <b>годовую сводку</b>.</li>
                <li>Отображает графики: «Выручка/Себестоимость/Прибыль» и «Рост облачной базы».</li>
              </ul>
            </div>
            <div>
              <div className="font-semibold mb-1">Как пользоваться</div>
              <ul className="list-disc pl-5 space-y-1">
                <li>Во вкладке «Калькулятор» задайте исходные параметры: курс, размер базы, среднее камер/акк, долю облака, трафик (Motion/Full), цены Tuya и Yandex.</li>
                <li>Отредактируйте <b>пакеты</b>: дни архива, лимит ГБ/кам, включённые камеры, цены, стоимость перерасхода и долю в миксе.</li>
                <li>Смотрите расчёт <b>на аккаунт</b> и <b>суммарно по портфелю</b>.</li>
                <li>Во вкладке «Прогноз» укажите: горизонт (мес), churn, продажи в 1‑й месяц, темп роста, долю облака у новых. Ниже — таблица и графики.</li>
              </ul>
            </div>
          </div>
        </Section>

        {tab === "calc" && (
          <>
            {/* Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Section title="База / Пользователи">
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                  <label>Курс ₽ за $ <Help text="Курс для конвертации цен Tuya в рубли." /></label>
                  <input className={inputCls} type="number" value={fx} onChange={e => setFx(Number(e.target.value))} />

                  <label>Аккаунтов (всего)</label>
                  <input className={inputCls} type="number" value={accounts} onChange={e => setAccounts(Number(e.target.value))} />

                  <label>Камер на аккаунт (ср.) <Help text="Сколько камер в среднем привязано к одному аккаунту." /></label>
                  <input className={inputCls} type="number" step={0.1} value={avgCams} onChange={e => setAvgCams(Number(e.target.value))} />

                  <label>Доля облака (0..1) <Help text="Доля существующих аккаунтов, которые купили облачное хранение." /></label>
                  <input className={inputCls} type="number" step={0.01} value={cloudShare} onChange={e => setCloudShare(Number(e.target.value))} />

                  <label>Дней в месяце</label>
                  <input className={inputCls} type="number" value={monthDays} onChange={e => setMonthDays(Number(e.target.value))} />

                  <label>Backend фикс (₽/мес)</label>
                  <input className={inputCls} type="number" value={backendFixed} onChange={e => setBackendFixed(Number(e.target.value))} />

                  <label>Ops фикс (₽/мес)</label>
                  <input className={inputCls} type="number" value={opsFixed} onChange={e => setOpsFixed(Number(e.target.value))} />
                </div>
              </Section>

              <Section title="Трафик / Видео">
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                  <label className="col-span-2 flex items-center gap-2">
                    <input type="checkbox" checked={fullMode} onChange={e => setFullMode(e.target.checked)} />
                    Непрерывная запись (Full)
                  </label>

                  <label>Битрейт (Мбит/с) <Help text="Используется в режиме Full для расчёта ГБ/день." /></label>
                  <input className={inputCls} type="number" step={0.1} value={bitrateMbps} onChange={e => setBitrateMbps(Number(e.target.value))} />

                  <label>Часов/день (Full)</label>
                  <input className={inputCls} type="number" value={fullHours} onChange={e => setFullHours(Number(e.target.value))} />

                  <label>ГБ/день/камера (Motion) <Help text="Средний фактический объём при записи по событиям." /></label>
                  <input className={inputCls} type="number" step={0.1} value={gbPerDayMotion} onChange={e => setGbPerDayMotion(Number(e.target.value))} />

                  <label>Доля CDN скачиваний</label>
                  <input className={inputCls} type="number" step={0.01} value={cdnRatio} onChange={e => setCdnRatio(Number(e.target.value))} />

                  <label>Live часов/день</label>
                  <input className={inputCls} type="number" step={0.1} value={liveHours} onChange={e => setLiveHours(Number(e.target.value))} />

                  <label>Доля relay в live</label>
                  <input className={inputCls} type="number" step={0.01} value={relayShare} onChange={e => setRelayShare(Number(e.target.value))} />

                  <label>API вызовов/камера/день</label>
                  <input className={inputCls} type="number" value={apiPerDay} onChange={e => setApiPerDay(Number(e.target.value))} />
                </div>
              </Section>

              <Section title="Тарифы за единицу (RUB/USD)">
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                  <label>Tuya SDK ($/год)</label>
                  <input className={inputCls} type="number" value={tuyaSDKyrUSD} onChange={e => setTuyaSDKyrUSD(Number(e.target.value))} />

                  <label>Tuya API ($/1 млн)</label>
                  <input className={inputCls} type="number" step={0.01} value={tuyaApiUSDpm} onChange={e => setTuyaApiUSDpm(Number(e.target.value))} />

                  <label>Tuya Msgs ($/1 млн)</label>
                  <input className={inputCls} type="number" step={0.01} value={tuyaMsgUSDpm} onChange={e => setTuyaMsgUSDpm(Number(e.target.value))} />

                  <label>Tuya Relay ($/ГБ)</label>
                  <input className={inputCls} type="number" step={0.01} value={tuyaRelayUSDpGB} onChange={e => setTuyaRelayUSDpGB(Number(e.target.value))} />

                  <label>Yandex Storage (₽/ГБ‑мес)</label>
                  <input className={inputCls} type="number" step={0.01} value={ycStorageRUBpGBm} onChange={e => setYcStorageRUBpGBm(Number(e.target.value))} />

                  <label>Yandex CDN (₽/ГБ)</label>
                  <input className={inputCls} type="number" step={0.01} value={ycCDNRUBpGB} onChange={e => setYcCDNRUBpGB(Number(e.target.value))} />
                </div>
              </Section>
            </div>

            {/* Packages table */}
            <Section title="Пакеты (редактируемые)">
              <div className="overflow-x-auto">
                <table className="min-w-[1100px] table-auto text-sm">
                  <thead>
                    <tr className="text-left">
                      <th className={thCls}>Пакет</th>
                      <th className={thCls}>Дней</th>
                      <th className={thCls}>Лимит ГБ/кам</th>
                      <th className={thCls}>Вкл. камер</th>
                      <th className={thCls}>Цена/мес</th>
                      <th className={thCls}>Доп. камера</th>
                      <th className={thCls}>Перерасход ₽/ГБ</th>
                      <th className={thCls}>Микс</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pkgs.map((p, idx) => (
                      <tr key={p.name} className="border-t">
                        <td className={`${tdTextCls} font-medium py-1`}>{p.name}</td>
                        <td className={tdTextCls}><input className={`${inputCls} w-24`} type="number" value={p.days} onChange={e => { const next=[...pkgs]; next[idx] = { ...p, days: Number(e.target.value) }; setPkgs(next); }} /></td>
                        <td className={tdTextCls}><input className={`${inputCls} w-28`} type="number" value={p.capPerCamGB} onChange={e => { const next=[...pkgs]; next[idx] = { ...p, capPerCamGB: Number(e.target.value) }; setPkgs(next); }} /></td>
                        <td className={tdTextCls}><input className={`${inputCls} w-24`} type="number" value={p.includedCams} onChange={e => { const next=[...pkgs]; next[idx] = { ...p, includedCams: Number(e.target.value) }; setPkgs(next); }} /></td>
                        <td className={tdTextCls}><input className={`${inputCls} w-28`} type="number" value={p.price} onChange={e => { const next=[...pkgs]; next[idx] = { ...p, price: Number(e.target.value) }; setPkgs(next); }} /></td>
                        <td className={tdTextCls}><input className={`${inputCls} w-28`} type="number" value={p.addlCamPrice} onChange={e => { const next=[...pkgs]; next[idx] = { ...p, addlCamPrice: Number(e.target.value) }; setPkgs(next); }} /></td>
                        <td className={tdTextCls}><input className={`${inputCls} w-28`} type="number" value={p.overagePerGB} onChange={e => { const next=[...pkgs]; next[idx] = { ...p, overagePerGB: Number(e.target.value) }; setPkgs(next); }} /></td>
                        <td className={tdTextCls}><input className={`${inputCls} w-24`} type="number" step={0.01} value={p.mix} onChange={e => { const next=[...pkgs]; next[idx] = { ...p, mix: Number(e.target.value) }; setPkgs(next); }} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            {/* Unit economics */}
            <Section title="Юнит‑экономика по пакетам (на 1 облачный аккаунт)">
              <div className="overflow-x-auto">
                <table className="min-w-[1100px] table-auto text-sm">
                  <thead>
                    <tr className="text-left">
                      <th className={thCls}>Пакет</th>
                      <th className={thCls}>Выручка/акк <Help text="Цена пакета + оплата за доп. камеры сверх включённых." /></th>
                      <th className={thCls}>Overage/акк <Help text="Плата за перерасход лимита ГБ (факт − лимит, если > 0)." /></th>
                      <th className={thCls}>Yandex cost/акк <Help text="Хранилище + CDN + доля фиксированных затрат." /></th>
                      <th className={thCls}>Tuya cost/акк <Help text="SDK + API + Msgs + Relay, распределённые на аккаунт." /></th>
                      <th className={thCls}>Себестоимость/акк</th>
                      <th className={thCls}>Прибыль/акк</th>
                      <th className={thCls}>Маржа %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unitRows.map(r => (
                      <tr key={r.name} className="border-t">
                        <td className={`${tdTextCls} font-medium py-1`}>{r.name}</td>
                        <td className={tdNumCls}><Num value={r.revenueAcc} /></td>
                        <td className={tdNumCls}><Num value={r.overageAcc} /></td>
                        <td className={tdNumCls}><Num value={r.yandexCostAcc} /></td>
                        <td className={tdNumCls}><Num value={r.tuyaCostAcc} /></td>
                        <td className={tdNumCls}><Num value={r.costAcc} /></td>
                        <td className={`${tdNumCls} ${r.profitAcc >= 0 ? "text-green-600" : "text-red-600"}`}><Num value={r.profitAcc} /></td>
                        <td className={tdNumCls}><Num value={r.marginAcc} digits={1} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            {/* Portfolio summary */}
            <Section title="Суммарно по портфелю (микс × облачные аккаунты)">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="bg-gray-50 rounded-xl p-3"><div className="text-gray-500">Аккаунтов всего</div><div className="text-xl font-semibold"><Num value={accounts} /></div></div>
                <div className="bg-gray-50 rounded-xl p-3"><div className="text-gray-500">Облачных аккаунтов</div><div className="text-xl font-semibold"><Num value={cloudAccounts} /></div></div>
                <div className="bg-gray-50 rounded-xl p-3"><div className="text-gray-500">Камер всего</div><div className="text-xl font-semibold"><Num value={camsTotal} /></div></div>
                <div className="bg-gray-50 rounded-xl p-3"><div className="text-gray-500">Камер в облаке</div><div className="text-xl font-semibold"><Num value={camsCloud} /></div></div>
              </div>
              <div className="overflow-x-auto mt-4">
                <table className="min-w-[1100px] table-auto text-sm">
                  <thead>
                    <tr className="text-left">
                      <th className={thCls}>Пакет</th>
                      <th className={thCls}>Облачные аккаунты</th>
                      <th className={thCls}>Выручка</th>
                      <th className={thCls}>Yandex cost</th>
                      <th className={thCls}>Tuya cost</th>
                      <th className={thCls}>Себестоимость</th>
                      <th className={thCls}>Прибыль</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.rows.map(r => (
                      <tr key={r.name} className="border-t">
                        <td className={`${tdTextCls} font-medium py-1`}>{r.name}</td>
                        <td className={tdNumCls}><Num value={r.accs} /></td>
                        <td className={tdNumCls}><Num value={r.revenue} /></td>
                        <td className={tdNumCls}><Num value={r.yCost} /></td>
                        <td className={tdNumCls}><Num value={r.tCost} /></td>
                        <td className={tdNumCls}><Num value={r.cost} /></td>
                        <td className={`${tdNumCls} ${r.profit >= 0 ? "text-green-600" : "text-red-600"}`}><Num value={r.profit} /></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t font-semibold">
                      <td className="py-2">ИТОГО</td>
                      <td></td>
                      <td className={tdNumCls}><Num value={portfolio.totals.revenue} /></td>
                      <td className={tdNumCls}><Num value={portfolio.totals.yCost} /></td>
                      <td className={tdNumCls}><Num value={portfolio.totals.tCost} /></td>
                      <td className={tdNumCls}><Num value={portfolio.totals.cost} /></td>
                      <td className={`${tdNumCls} ${portfolio.totals.profit >= 0 ? "text-green-600" : "text-red-600"}`}><Num value={portfolio.totals.profit} /></td>
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
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                  <label>Горизонт (мес)</label>
                  <input className={inputCls} type="number" value={months} onChange={e => setMonths(Number(e.target.value))} />

                  <label>Churn (отток/мес)</label>
                  <input className={inputCls} type="number" step={0.001} value={churn} onChange={e => setChurn(Number(e.target.value))} />

                  <label>Продажи камер 1‑й мес</label>
                  <input className={inputCls} type="number" value={salesStart} onChange={e => setSalesStart(Number(e.target.value))} />

                  <label>Рост продаж %/мес</label>
                  <input className={inputCls} type="number" step={0.001} value={salesGrowthPct} onChange={e => setSalesGrowthPct(Number(e.target.value))} />

                  <label>Доля облака новых</label>
                  <input className={inputCls} type="number" step={0.01} value={cloudNewShare} onChange={e => setCloudNewShare(Number(e.target.value))} />
                </div>
              </Section>

              <Section title="Ключевые показатели">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-500">Месяц безубыточности</div>
                  <div className="font-semibold">{breakevenMonth ? `Месяц ${breakevenMonth}` : "—"}</div>

                  <div className="text-gray-500">Выручка / мес (последний)</div>
                  <div className="font-semibold"><Num value={last?.revenue ?? 0} /></div>

                  <div className="text-gray-500">Себестоимость / мес (последний)</div>
                  <div className="font-semibold"><Num value={last?.totalCost ?? 0} /></div>

                  <div className="text-gray-500">Активные облачные аккаунты (последний)</div>
                  <div className="font-semibold"><Num value={last?.activeCloudAcc ?? 0} /></div>
                </div>
              </Section>

              <Section title="Годовая сводка (агрегировано)">
                <div className="overflow-x-auto">
                  <table className="min-w-[900px] table-auto text-sm">
                    <thead>
                      <tr className="text-left">
                        <th className={thCls}>Год</th>
                        <th className={thCls}>Выручка</th>
                        <th className={thCls}>Себестоимость</th>
                        <th className={thCls}>Прибыль</th>
                        <th className={thCls}>Облачные (конец)</th>
                        <th className={thCls}>Камер всего (конец)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {forecast.years.map(y => (
                        <tr key={y.year} className="border-t">
                          <td className={`${tdTextCls} py-1`}>{y.year}</td>
                          <td className={tdNumCls}><Num value={y.revenue} /></td>
                          <td className={tdNumCls}><Num value={y.cost} /></td>
                          <td className={`${tdNumCls} ${y.profit >= 0 ? "text-green-600" : "text-red-600"}`}><Num value={y.profit} /></td>
                          <td className={tdNumCls}><Num value={y.endActiveCloudAcc} /></td>
                          <td className={tdNumCls}><Num value={y.endTotalCams} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            </div>

            <Section title="Прогноз — таблица по месяцам (описания в подсказках)">
              <div className="overflow-x-auto">
                <table className="min-w-[1200px] table-auto text-xs md:text-sm">
                  <thead>
                    <tr className="text-left">
                      <th className={thCls}>Мес <Help text="Номер месяца от 1 до горизонта" /></th>
                      <th className={thCls}>Продажи камер <Help text="Сколько камер продано в месяц" /></th>
                      <th className={thCls}>Новые акк <Help text="Продажи / камер на акк" /></th>
                      <th className={thCls}>Новые облачные <Help text="Новые акк × доля облака" /></th>
                      <th className={thCls}>Активные облачные <Help text="Прошлые×(1−churn)+новые" /></th>
                      <th className={thCls}>Камер всего <Help text="Кумулятивно: камеры прошлого + продажи" /></th>
                      <th className={thCls}>Выручка</th>
                      <th className={thCls}>Yandex cost</th>
                      <th className={thCls}>Tuya cost</th>
                      <th className={thCls}>Себестоимость</th>
                      <th className={thCls}>Прибыль</th>
                      <th className={thCls}>Накопит. прибыль</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecast.rows.map(r => (
                      <tr key={r.month} className="border-t">
                        <td className={`${tdTextCls} py-1`}>{r.month}</td>
                        <td className={tdNumCls}><Num value={r.sales} /></td>
                        <td className={tdNumCls}><Num value={r.newAcc} /></td>
                        <td className={tdNumCls}><Num value={r.newCloudAcc} /></td>
                        <td className={tdNumCls}><Num value={r.activeCloudAcc} /></td>
                        <td className={tdNumCls}><Num value={r.totalCams} /></td>
                        <td className={tdNumCls}><Num value={r.revenue} /></td>
                        <td className={tdNumCls}><Num value={r.yCost} /></td>
                        <td className={tdNumCls}><Num value={r.tCost} /></td>
                        <td className={tdNumCls}><Num value={r.totalCost} /></td>
                        <td className={`${tdNumCls} ${r.profit >= 0 ? "text-green-600" : "text-red-600"}`}><Num value={r.profit} /></td>
                        <td className={`${tdNumCls} ${r.cumProfit >= 0 ? "text-green-600" : "text-red-600"}`}><Num value={r.cumProfit} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title="Графики">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-64 bg-white rounded-xl p-3 border border-gray-100">
                  <div className="text-sm font-medium mb-2">Выручка vs Себестоимость vs Прибыль (помесячно)</div>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={forecast.rows} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                      <RTooltip formatter={(v: number | string) => new Intl.NumberFormat("ru-RU").format(Number(v))} />
                      <Legend />
                      <Area type="monotone" dataKey="revenue" name="Выручка" stroke="#8884d8" fill="url(#g1)" />
                      <Area type="monotone" dataKey="totalCost" name="Себестоимость" stroke="#82ca9d" fill="url(#g2)" />
                      <Area type="monotone" dataKey="profit" name="Прибыль" stroke="#ff7300" fill="url(#g3)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="h-64 bg-white rounded-xl p-3 border border-gray-100">
                  <div className="text-sm font-medium mb-2">Рост базы (облачные аккаунты)</div>
                  <ResponsiveContainer width="100%" height="100%">
                    <RLineChart data={forecast.rows} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <RTooltip formatter={(v: number | string) => new Intl.NumberFormat("ru-RU").format(Number(v))} />
                      <Legend />
                      <Line type="monotone" dataKey="activeCloudAcc" name="Облачные аккаунты" stroke="#2563eb" />
                    </RLineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </Section>
          </>
        )}

        <Section title="Примечания и допущения">
          <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
            <li>Перерасход (overage) считается как разница между фактическим объёмом в архиве и лимитом тарифа по ГБ/камера, если разница положительная.</li>
            <li>Tuya API/Msgs/Relay распределены по аккаунтам пропорционально общей базе камер; уточняйте тарифы у Tuya — это ориентиры.</li>
            <li>Хранилище Yandex считается: min(факт; лимит) × камер/аккаунт; CDN — доля от хранения (по умолчанию 30%).</li>
            <li>Графики и годовые итоги строятся поверх помесячной модели; в годах агрегируется каждые 12 месяцев.</li>
          </ul>
        </Section>
      </div>
    </div>
  );
}
