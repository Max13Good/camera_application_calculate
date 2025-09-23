import React, { useMemo, useState } from "react";

// ------------------------------------------------------------
// Mini App: Cloud Pricing & Profit Calculator (RU)
// Single-file React component. Uses Tailwind for styling.
// ------------------------------------------------------------

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

// Helper: clamp number
const toNum = (v: any, fallback = 0) => {
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return isFinite(n) ? n : fallback;
};

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
  const [gbPerDayMotion, setGbPerDayMotion] = useState(1); // if not full

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
  const gbPerDay = useMemo(() => {
    if (fullMode) {
      // Mbps -> MB/s = /8; seconds per hour = 3600; hours per day; MB->GB = /1024
      return ((bitrateMbps / 8) * 3600 * fullHours) / 1024;
    }
    return gbPerDayMotion;
  }, [fullMode, bitrateMbps, fullHours, gbPerDayMotion]);

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
    notes: string;
  };

  const unitRows: UnitRow[] = useMemo(() => {
    const rows: UnitRow[] = [];
    const sdkPerAcc = tuyaSDKmoRUB / Math.max(accounts, 1);

    // Totals for shared (per account allocation)
    const apiTotal = camsTotal * apiPerDay * monthDays; // calls
    const apiRubTotal =
      Math.max(0, (apiTotal - 1_000_000) / 1_000_000) * tuyaApiUSDpm * fx;
    const apiPerAcc = apiRubTotal / Math.max(accounts, 1);

    const msgsTotal = camsTotal * 10 * monthDays; // assumption
    const msgsRubTotal = (msgsTotal / 1_000_000) * tuyaMsgUSDpm * fx;
    const msgsPerAcc = msgsRubTotal / Math.max(accounts, 1);

    const relayGbTotal = camsTotal * camHoursPerDayForRelay * 0.72 * monthDays; // 0.72 GB/h @ ~1 Mbps
    const relayRubTotal = relayGbTotal * tuyaRelayUSDpGB * fx;
    const relayPerAcc = relayRubTotal / Math.max(accounts, 1);

    const backendOpsPerAcc =
      (backendFixed + opsFixed) / Math.max(cloudAccounts, 1);

    for (const pkg of pkgs) {
      const factPerCamGB = gbPerDay * pkg.days; // factual need
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
        notes: "Юнит‑экономика одного облачного аккаунта",
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

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold">
          Мини‑калькулятор: Облачное хранилище камер (RU)
        </h1>
        <p className="text-sm text-gray-600">
          Играй параметрами — смотри юнит‑экономику по пакетам и общую прибыль.
          Все значения в ₽, если не указано иное.
        </p>

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Section title="База / Пользователи">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <label>Курс ₽ за $</label>
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
              <label>Камер на аккаунт (ср.)</label>
              <input
                className="input"
                type="number"
                step="0.1"
                value={avgCams}
                onChange={(e) => setAvgCams(toNum(e.target.value, 2))}
              />
              <label>Доля облака (0..1)</label>
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
                onChange={(e) => setBackendFixed(toNum(e.target.value, 15000))}
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
              <label>Битрейт (Мбит/с)</label>
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
              <label>ГБ/день/камера (Motion)</label>
              <input
                className="input"
                type="number"
                step="0.1"
                value={gbPerDayMotion}
                onChange={(e) => setGbPerDayMotion(toNum(e.target.value, 1))}
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
                onChange={(e) => setTuyaSDKyrUSD(toNum(e.target.value, 5000))}
              />
              <label>Tuya API ($/1 млн)</label>
              <input
                className="input"
                type="number"
                step="0.01"
                value={tuyaApiUSDpm}
                onChange={(e) => setTuyaApiUSDpm(toNum(e.target.value, 3.15))}
              />
              <label>Tuya Msgs ($/1 млн)</label>
              <input
                className="input"
                type="number"
                step="0.01"
                value={tuyaMsgUSDpm}
                onChange={(e) => setTuyaMsgUSDpm(toNum(e.target.value, 1.24))}
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

        {/* Packages table (editable inline) */}
        <Section title="Пакеты (кликабельно)">
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
                  <th>Выручка/акк</th>
                  <th>Overage/акк</th>
                  <th>Yandex cost/акк</th>
                  <th>Tuya cost/акк</th>
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
              Хранилище тарифицируется по правилу: на аккаунт берётся
              min(фактический объём; лимит пакета) × кол-во камер на аккаунт.
            </li>
            <li>
              CDN считается как доля (по умолчанию 30%) от объёма хранения на
              аккаунт.
            </li>
            <li>
              Tuya SDK/API/Msgs/Relay распределяются на аккаунт пропорционально
              общей базе.
            </li>
            <li>
              Измени «Микс» пакетов, чтобы смоделировать распределение
              подписчиков.
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
