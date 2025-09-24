import { useMemo, useState } from "react";
import {
  LineChart as RLineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import Section from "./components/Section";
import Num from "./components/Num";
import Help from "./components/Help";
import TariffsEditor from "./components/TariffsEditor";
import BaseMixEditor from "./components/BaseMixEditor";
import { useLocalStorageState } from "./hooks/useLocalStorage";
import { computeUnitTariffRows, computeTariffPortfolio } from "./lib/economics";
import { useTariffForecast } from "./hooks/useTariffForecast";

// ------------------------------------------------------------
// Mini App v3 — Cloud Pricing & Profit Calculator (RU)
// Что нового:
// - Исправлена вёрстка: табличные цифры, выравнивание вправо, min-width таблиц,
//   горизонтальная прокрутка, компактные заголовки, нормальные инпуты без @apply.
// - Подробные подсказки (иконка ?), раздел «Руководство» прямо в приложении.
// - Вкладка «Прогноз»: помесячная и годовая модель, кумулятивная прибыль, графики.
// - TypeScript-фиксы (нет .at; типизированы Tooltip и агрегаторы.)
// ------------------------------------------------------------

// legacy inline components removed

// [removed] TariffsEditor_OLD
// end removed

// [removed] BaseMixEditor_OLD
// end removed

// ---- Utils: clamp, safeDiv ----
export const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));
export const safeDiv = (a: number, b: number) => (b ? a / b : 0);

// ---- Weights: uniform & logistic ----
/* function uniformWeights(months: number): number[] {
  if (months <= 0) return [];
  const w = 1 / months;
  return Array.from({ length: months }, () => w);
}*/

/* function logisticWeights(
  months: number,
  k: number = 0.5,
  x0: number | null = null
): number[] {
  if (months <= 0) return [];
  const mid = x0 == null ? (months + 1) / 2 : clamp(x0, 1, months);
  const xs = Array.from({ length: months + 1 }, (_, i) => i); // 0..months
  const cdf = xs.map((t) => 1 / (1 + Math.exp(-k * (t - mid))));
  const diffs = [];
  for (let i = 1; i < cdf.length; i++)
    diffs.push(Math.max(0, cdf[i] - cdf[i - 1]));
  const sum = diffs.reduce((s, v) => s + v, 0) || 1;
  return diffs.map((v) => v / sum);
}*/

/* function makeCompetitorSchedule({
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
  return W.map((w) => w * (total || 0)); // абсолютные значения/мес
}*/

const inputCls =
  "w-full h-9 bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";
const thCls = "py-2 px-2 whitespace-nowrap text-xs leading-tight text-gray-600";
const tdNumCls = "px-2 text-right";
const tdTextCls = "px-2";

export default function App() {
  // ---------- Global inputs ----------
  const [fx, setFx] = useLocalStorageState("app.fx", 90); // ₽ за 1 USD
  const [accounts, setAccounts] = useLocalStorageState("app.accounts", 22000);
  const [avgCams, setAvgCams] = useLocalStorageState("app.avgCams", 1);
  const [cloudShare, setCloudShare] = useLocalStorageState("app.cloudShare", 0.2); // 0..1 доля текущих аккаунтов с облаком
  // Коэффициент нагрузки бесплатников (0..1): сколько от платного аккаунта
  const [freeLoadShare, setFreeLoadShare] = useLocalStorageState("app.freeLoadShare", 0.25);
  // Распределение текущей базы: платящие vs бесплатные, и сплит по семействам
  const [paidSplit, setPaidSplit] = useLocalStorageState("app.paidSplit", {
    camera: 0.6,
    smarthome: 0.2,
    bundle: 0.2,
  });
  const [freeSplit, setFreeSplit] = useLocalStorageState("app.freeSplit", { camera: 0.7, smarthome: 0.3 });
  const [cdnRatio, setCdnRatio] = useLocalStorageState("app.cdnRatio", 0.25);
  const [liveHours, setLiveHours] = useLocalStorageState("app.liveHours", 1);
  const [relayShare, setRelayShare] = useLocalStorageState("app.relayShare", 0.15);
  const [apiPerDay, setApiPerDay] = useLocalStorageState("app.apiPerDay", 70);
  const [monthDays, setMonthDays] = useLocalStorageState("app.monthDays", 30);
  const [backendFixed, setBackendFixed] = useLocalStorageState("app.backendFixed", 15000);
  const [opsFixed, setOpsFixed] = useLocalStorageState("app.opsFixed", 1000);

  // Recording mode
  const [fullMode, setFullMode] = useLocalStorageState("app.fullMode", false);
  const [bitrateMbps, setBitrateMbps] = useLocalStorageState("app.bitrateMbps", 1.5);
  const [fullHours, setFullHours] = useLocalStorageState("app.fullHours", 24);
  const [gbPerDayMotion, setGbPerDayMotion] = useLocalStorageState("app.gbPerDayMotion", 1);

  // Unit prices
  const [tuyaSDKyrUSD, setTuyaSDKyrUSD] = useLocalStorageState("app.tuyaSDKyrUSD", 5000);
  const [tuyaApiUSDpm, setTuyaApiUSDpm] = useLocalStorageState("app.tuyaApiUSDpm", 3.15);
  const [tuyaMsgUSDpm, setTuyaMsgUSDpm] = useLocalStorageState("app.tuyaMsgUSDpm", 1.24);
  const [tuyaRelayUSDpGB, setTuyaRelayUSDpGB] = useLocalStorageState("app.tuyaRelayUSDpGB", 0.08);
  const [ycStorageRUBpGBm, setYcStorageRUBpGBm] = useLocalStorageState("app.ycStorageRUBpGBm", 1.2);
  const [ycCDNRUBpGB, setYcCDNRUBpGB] = useLocalStorageState("app.ycCDNRUBpGB", 0.6);

  // -------- Tariff v7 model --------
  type Tariff = {
    id: string;
    family: "camera" | "smarthome" | "bundle";
    name: string;
    description: string;
    features: string[];
    price: number; // ₽/мес
    includedCams?: number;
    archiveDays?: number;
    gbCapPerCam?: number;
    overageRUBperGB?: number;
    varCost?: {
      yandexStorageRUBpGBm?: number;
      yandexCDNRUBpGB?: number;
      avgGbPerDayMotion?: number;
      bitrateMbps?: number;
      liveHoursPerDay?: number;
      cdnRatio?: number;
      tuyaAPIperMLNUSD?: number;
      tuyaMsgsperMLNUSD?: number;
      tuyaRelayUSDpGB?: number;
      // multipliers
      yandexStorageRUBpGBmMul?: number;
      yandexCDNRUBpGBMul?: number;
      avgGbPerDayMotionMul?: number;
      cdnRatioMul?: number;
      tuyaApiMul?: number;
      tuyaMsgsMul?: number;
      tuyaRelayMul?: number;
    };
    forecast?: {
      baseShare0?: number;
      adoptionNew?: number;
      churn?: number;
      upgradeTo?: string | null;
      upgradeRate?: number;
      downgradeTo?: string | null;
      downgradeRate?: number;
    };
  };

  const DEFAULT_TARIFFS: Tariff[] = [
    // Cameras family
    {
      id: "cam_free",
      family: "camera",
      name: "CAM-FREE",
      description: "Онлайн‑просмотр и базовые уведомления. Без архива.",
      features: [
        "Онлайн‑просмотр",
        "Базовые уведомления (без превью)",
        "1 зона детекции",
        "2 участника доступа",
        "Локальные сценарии «камера→уведомление»",
      ],
      price: 0,
      includedCams: 1,
      archiveDays: 0,
      gbCapPerCam: 0,
      overageRUBperGB: 0,
      varCost: {
        cdnRatioMul: 0,
        yandexCDNRUBpGBMul: 0,
        yandexStorageRUBpGBmMul: 0,
        // Бесплатные создают базовую нагрузку на Tuya (20% от платного)
        tuyaApiMul: 0.2,
        tuyaMsgsMul: 0.2,
        tuyaRelayMul: 0,
      },
      forecast: { baseShare0: 0.7, adoptionNew: 0, churn: 0.04 },
    },
    {
      id: "cam_addon_49",
      family: "camera",
      name: "CAM‑ADDON",
      description: "Уведомления с превью + базовый умный дом (Алиса).",
      features: [
        "Пуш‑уведомления с превью (TTL 48 ч)",
        "1–2 зоны детекции",
        "Быстрые команды (вкл/выкл, сигналка)",
        "Интеграция с Алисой",
        "До 3 пользователей",
        "Fair‑Use: ≤60 пушей/сутки, relay ≤15 мин/сутки",
      ],
      price: 59,
      includedCams: 1,
      archiveDays: 0,
      gbCapPerCam: 0,
      overageRUBperGB: 0,
      forecast: {
        baseShare0: 0.15,
        adoptionNew: 0.25,
        churn: 0.03,
        upgradeTo: "cam_arch_7",
        upgradeRate: 0.02,
      },
    },
    {
      id: "cam_arch_7",
      family: "camera",
      name: "CAM‑ARCH‑S",
      description: "Архив 7 дней. Лимит 5 ГБ/кам. 1 камера.",
      features: [
        "Запись по событиям (Motion)",
        "Архив 7 дней",
        "Лимит 5 ГБ/кам (перерасход 7 ₽/ГБ)",
        "Предпросмотр роликов, экспорт клипов",
        "3–5 зон детекции",
        "Приоритетный доступ (CDN/relay Fair‑Use)",
        "Общий доступ до 5 пользователей",
      ],
      price: 169,
      includedCams: 1,
      archiveDays: 7,
      gbCapPerCam: 5,
      overageRUBperGB: 10,
      forecast: {
        baseShare0: 0.1,
        adoptionNew: 0.35,
        churn: 0.025,
        upgradeTo: "cam_arch_30",
        upgradeRate: 0.015,
        downgradeTo: "cam_addon_49",
        downgradeRate: 0.005,
      },
    },
    {
      id: "cam_arch_30",
      family: "camera",
      name: "CAM‑ARCH‑M",
      description: "Архив 30 дней. Лимит 25 ГБ/кам. 1 камера.",
      features: [
        "Запись по событиям (Motion)",
        "Архив 30 дней",
        "Лимит 25 ГБ/кам (перерасход 7 ₽/ГБ)",
        "Приоритетный доступ (CDN/relay Fair‑Use)",
      ],
      price: 349,
      includedCams: 1,
      archiveDays: 30,
      gbCapPerCam: 25,
      overageRUBperGB: 10,
      forecast: {
        baseShare0: 0.04,
        adoptionNew: 0.25,
        churn: 0.02,
        upgradeTo: "cam_arch_90",
        upgradeRate: 0.01,
        downgradeTo: "cam_arch_7",
        downgradeRate: 0.01,
      },
    },
    {
      id: "cam_arch_90",
      family: "camera",
      name: "CAM‑ARCH‑L",
      description: "Архив 90 дней. Лимит 75 ГБ/кам. 2 камеры.",
      features: [
        "Запись по событиям (Motion)",
        "Архив 90 дней",
        "Лимит 75 ГБ/кам (перерасход 7 ₽/ГБ)",
        "2 камеры включено",
        "Web‑клиент",
        "Приоритетная поддержка",
      ],
      price: 799,
      includedCams: 1,
      archiveDays: 90,
      gbCapPerCam: 75,
      overageRUBperGB: 10,
      forecast: {
        baseShare0: 0.01,
        adoptionNew: 0.15,
        churn: 0.015,
        downgradeTo: "cam_arch_30",
        downgradeRate: 0.01,
      },
    },

    // Smart home family
    {
      id: "smh_free",
      family: "smarthome",
      name: "SMH‑FREE",
      description: "Базовое подключение/Callback и 2–3 устройства.",
      features: [
        "2–3 базовых устройства",
        "3 простых сценария",
        "7 дней логов (узкий журнал)",
      ],
      price: 0,
      varCost: {
        // Базовая нагрузка free для SMH — 20% от платного
        tuyaApiMul: 0.2,
        tuyaMsgsMul: 0.2,
        tuyaRelayMul: 0,
      },
      forecast: { baseShare0: 0.8, adoptionNew: 0, churn: 0.04 },
    },
    {
      id: "smh_49",
      family: "smarthome",
      name: "SMH‑49",
      description: "Управление + расписания, базовые сцены, 30 дней логов.",
      features: [
        "Вкл/выкл, расписания",
        "Сценарии И/ИЛИ",
        "3 пользователя",
        "Интеграция с Алисой",
        "30 дней логов",
      ],
      price: 49,
      forecast: { baseShare0: 0.2, adoptionNew: 0.25, churn: 0.03 },
    },

    // Bundle family
    {
      id: "bundle_89",
      family: "bundle",
      name: "BUNDLE‑BASE",
      description: "Уведомления по камерам + умный дом (базовый).",
      features: [
        "Всё из CAM‑ADDON‑49 + SMH‑49",
        "Единый доступ семьи и общие плитки",
        "Fair‑Use: пуши/relay как в CAM‑ADDON‑49",
      ],
      price: 109,
      includedCams: 1,
      archiveDays: 0,
      forecast: {
        baseShare0: 0.6,
        adoptionNew: 0.4,
        churn: 0.03,
        upgradeTo: "bundle_arch_7",
        upgradeRate: 0.02,
      },
    },
    {
      id: "bundle_arch_7",
      family: "bundle",
      name: "BUNDLE‑ARCH‑S",
      description: "Bundle + архив 7 дней (лимиты как у камер).",
      features: [
        "Архив 7 дней",
        "Лимит 5 ГБ/кам (перерасход 7 ₽/ГБ)",
        "Объединённые сценарии «камера→действие»",
      ],
      price: 209,
      includedCams: 1,
      archiveDays: 7,
      gbCapPerCam: 5,
      overageRUBperGB: 10,
      forecast: {
        baseShare0: 0.25,
        adoptionNew: 0.35,
        churn: 0.025,
        upgradeTo: "bundle_arch_30",
        upgradeRate: 0.015,
        downgradeTo: "bundle_89",
        downgradeRate: 0.01,
      },
    },
    {
      id: "bundle_arch_30",
      family: "bundle",
      name: "BUNDLE‑ARCH‑M",
      description: "Bundle + архив 30 дней (25 ГБ/кам).",
      features: ["Архив 30 дней", "Лимит 25 ГБ/кам (перерасход 7 ₽/ГБ)"],
      price: 389,
      includedCams: 1,
      archiveDays: 30,
      gbCapPerCam: 25,
      overageRUBperGB: 10,
      forecast: {
        baseShare0: 0.1,
        adoptionNew: 0.2,
        churn: 0.02,
        upgradeTo: "bundle_arch_90",
        upgradeRate: 0.01,
        downgradeTo: "bundle_arch_7",
        downgradeRate: 0.01,
      },
    },
    {
      id: "bundle_arch_90",
      family: "bundle",
      name: "BUNDLE‑ARCH‑L",
      description: "Bundle + архив 90 дней (75 ГБ/кам). 2 камеры.",
      features: [
        "Архив 90 дней",
        "Лимит 75 ГБ/кам (перерасход 7 ₽/ГБ)",
        "2 камеры включено",
      ],
      price: 839,
      includedCams: 1,
      archiveDays: 90,
      gbCapPerCam: 75,
      overageRUBperGB: 10,
      forecast: {
        baseShare0: 0.05,
        adoptionNew: 0.05,
        churn: 0.015,
        downgradeTo: "bundle_arch_30",
        downgradeRate: 0.01,
      },
    },
  ];

  const [tariffs, setTariffs] = useLocalStorageState<Tariff[]>(
    "app.tariffs",
    DEFAULT_TARIFFS
  );

  // Derived counts
  const camsTotal = useMemo(
    () => Math.round(accounts * avgCams),
    [accounts, avgCams]
  );
  const cloudAccounts = useMemo(
    () => Math.round(accounts * cloudShare),
    [accounts, cloudShare]
  );
  // Камеры у платящих (оценка): платные камеры + платные bundle
  const camsCloud = useMemo(() => {
    const paid = Math.round(accounts * cloudShare);
    const camPaid = Math.round(paid * (paidSplit?.camera || 0));
    const bundlePaid = Math.round(paid * (paidSplit?.bundle || 0));
    return Math.round((camPaid + bundlePaid) * avgCams);
  }, [accounts, cloudShare, paidSplit, avgCams]);

  // Smart Home & Bundle organic growth (DECLARED EARLY to avoid TDZ)
  const [smhBaseStart, setSmhBaseStart] = useLocalStorageState(
    "app.smhBaseStart",
    2000
  );
  const [smhGrowth, setSmhGrowth] = useLocalStorageState("app.smhGrowth", 0.02);
  const [bundleBaseStart, setBundleBaseStart] = useLocalStorageState(
    "app.bundleBaseStart",
    1000
  );
  const [bundleGrowth, setBundleGrowth] = useLocalStorageState(
    "app.bundleGrowth",
    0.03
  );

  // Competitor split across families
  const [competitorSplit, setCompetitorSplit] = useLocalStorageState(
    "app.competitorSplit",
    {
      camera: 0.7,
      smarthome: 0.1,
      bundle: 0.2,
    }
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

  // Unit economics per tariff (per active tariff account)
  const unitTariffRows = useMemo(
    () =>
      computeUnitTariffRows({
        tariffs,
        avgCams,
        gbPerDay,
        fullMode,
        bitrateMbps,
        fullHours,
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
        camHoursPerDayForRelay,
        tuyaRelayUSDpGB,
        cloudAccounts,
        cloudShare,
        freeLoadShare,
      }),
    [
      tariffs,
      avgCams,
      gbPerDay,
      fullMode,
      bitrateMbps,
      fullHours,
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
      camHoursPerDayForRelay,
      tuyaRelayUSDpGB,
      cloudAccounts,
      cloudShare,
      freeLoadShare,
    ]
  );

  // Portfolio now: split base into paid vs free, then across families and tariffs
  const tariffPortfolio = useMemo(
    () =>
      computeTariffPortfolio({
        tariffs,
        unitTariffRows,
        accounts,
        cloudShare,
        paidSplit,
        freeSplit,
      }),
    [tariffs, unitTariffRows, accounts, cloudShare, paidSplit, freeSplit]
  );

  // ---------------- PROGNOZ (months/years) ----------------
  const [months, setMonths] = useLocalStorageState("app.months", 24);
  const [churn, setChurn] = useLocalStorageState("app.churn", 0.03);
  const [salesStart, setSalesStart] = useLocalStorageState("app.salesStart", 2000); // камер в 1-й месяц
  const [salesGrowthPct, setSalesGrowthPct] = useLocalStorageState(
    "app.salesGrowthPct",
    0.03
  ); // рост продаж в мес
  const [cloudNewShare, setCloudNewShare] = useLocalStorageState(
    "app.cloudNewShare",
    0.2
  ); // доля облака среди новых

  // ---- Competitor migration ----
  const [competitorBase, setCompetitorBase] = useLocalStorageState(
    "app.competitorBase",
    20000
  ); // вся база конкурентов, шт
  const [competitorConversionPct, setCompetitorConversionPct] =
    useLocalStorageState("app.competitorConversionPct", 0.1); // доля, которую перетянем (0..1)
  const [competitorHorizon, setCompetitorHorizon] = useLocalStorageState(
    "app.competitorHorizon",
    12
  ); // за сколько месяцев перетянем
  const [competitorMode, setCompetitorMode] = useLocalStorageState<
    "uniform" | "logistic"
  >("app.competitorMode", "uniform"); // "uniform" | "logistic"
  const [competitorK, setCompetitorK] = useLocalStorageState(
    "app.competitorK",
    0.5
  ); // крутизна S-кривой (логистическая)
  const [competitorMid, setCompetitorMid] = useLocalStorageState(
    "app.competitorMid",
    null as any
  ); // месяц середины S-кривой (null = центр)

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
  const __noop = <T,>(_v?: T) => {};
  __noop<ForecastRow>();

  // breakeven moved below (after tariffForecast init)

  // ---------- Helper: distribute by adoption within family ----------
  /* function distributeByAdoption(
    totalNew: number,
    family: Tariff["family"],
    all: Tariff[]
  ) {
    const familyTariffs = all.filter((t) => t.family === family);
    const paid = familyTariffs.filter((t) => (t.price || 0) > 0);
    const free = familyTariffs.find((t) => (t.price || 0) === 0) || null;
    const sumAdoption = paid.reduce(
      (s, t) => s + (t.forecast?.adoptionNew || 0),
      0
    );
    const scale = sumAdoption > 1 ? 1 / sumAdoption : 1;
    const alloc: Record<string, number> = {};
    let used = 0;
    for (const t of paid) {
      const a = (t.forecast?.adoptionNew || 0) * scale;
      const v = Math.round(totalNew * a);
      alloc[t.id] = v;
      used += v;
    }
    if (free) alloc[free.id] = Math.max(0, Math.round(totalNew - used));
    return alloc; // {tariffId: newCount}
  }*/

  // ---------- Forecast v7 by tariffs (separate from legacy) ----------
  /* type TFRow = {
    month: number;
    activeByFamily: { camera: number; smarthome: number; bundle: number };
    revenue: number;
    cost: number;
    profit: number;
    cumProfit: number;
    breakdown: {
      activeByTariff: Record<string, number>;
      revByTariff: Record<string, number>;
      costByTariff: Record<string, number>;
      profitByTariff: Record<string, number>;
    };
  };*/

  const tariffForecast = useTariffForecast({
    tariffs,
    months,
    salesStart,
    salesGrowthPct,
    avgCams,
    cloudNewShare,
    competitorBase,
    competitorConversionPct,
    competitorHorizon,
    competitorMode,
    competitorK,
    competitorMid,
    competitorSplit,
    smhBaseStart,
    smhGrowth,
    bundleBaseStart,
    bundleGrowth,
    ycStorageRUBpGBm,
    ycCDNRUBpGB,
    cdnRatio,
    gbPerDay,
    tuyaApiUSDpm,
    tuyaMsgUSDpm,
    tuyaRelayUSDpGB,
    fx,
    apiPerDay,
    monthDays,
    camHoursPerDayForRelay,
    churn,
    cloudAccounts,
  });

  const [detailMonth, setDetailMonth] = useState<number | null>(null);

  // breakeven from new tariff forecast (now that tariffForecast is defined)
  const breakevenMonth = useMemo(
    () => tariffForecast.rows.find((r) => r.cumProfit > 0)?.month ?? null,
    [tariffForecast]
  );

  // ---------------- UI ----------------
  const [tab, setTab] = useLocalStorageState("app.tab", "calc");

  const lastTar = tariffForecast.rows[tariffForecast.rows.length - 1];

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
            <button
              onClick={() => setTab("tariffs")}
              className={`px-3 py-1.5 rounded-lg text-sm ${
                tab === "tariffs"
                  ? "bg-indigo-600 text-white"
                  : "hover:bg-gray-100"
              }`}
            >
              Тарифы
            </button>
          </div>
        </div>

        {/* ===== Руководство ===== */}
        <Section title="Руководство по использованию">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
            <div>
              <div className="font-semibold mb-1">Что делает калькулятор</div>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  Считает юнит‑экономику <b>на 1 облачный аккаунт</b> для
                  каждого пакетного плана (выручка, себестоимость Tuya+Yandex,
                  прибыль, маржа).
                </li>
                <li>
                  Умножает на текущий <b>микс пакетов</b> и показывает сводные
                  суммы по портфелю.
                </li>
                <li>
                  Строит <b>прогноз по месяцам</b> (продажи, рост облачной базы,
                  выручка/затраты/прибыль, кумулятивная прибыль) и{" "}
                  <b>годовую сводку</b>.
                </li>
                <li>
                  Отображает графики: «Выручка/Себестоимость/Прибыль» и «Рост
                  облачной базы».
                </li>
              </ul>
            </div>
            <div>
              <div className="font-semibold mb-1">Как пользоваться</div>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  Во вкладке «Калькулятор» задайте исходные параметры: курс,
                  размер базы, среднее камер/акк, долю облака, трафик
                  (Motion/Full), цены Tuya и Yandex.
                </li>
                <li>
                  Отредактируй <b>пакеты</b>: дни архива, лимит ГБ/кам,
                  включённые камеры, цены, стоимость перерасхода и долю в миксе.
                </li>
                <li>
                  Смотри расчёт <b>на аккаунт</b> и <b>суммарно по портфелю</b>.
                </li>
                <li>
                  Во вкладке «Прогноз» укажи: горизонт (мес), churn, продажи в
                  1‑й месяц, темп роста, долю облака у новых. Ниже — таблица и
                  графики.
                </li>
              </ul>
            </div>
          </div>
        </Section>

        <Section title="Источники тарифов (ссылки)">
          <div className="text-sm leading-relaxed space-y-2">
            <p>
              Ниже — открытые страницы провайдеров, на основе которых заданы
              цены переменных издержек. Пожалуйста, уточняйте актуальность —
              провайдеры регулярно обновляют условия.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Yandex Cloud Object Storage (₽/ГБ·мес):
                <a
                  className="ml-1 text-indigo-600 hover:underline"
                  href="https://cloud.yandex.ru/prices/object-storage"
                  target="_blank"
                  rel="noreferrer"
                >
                  cloud.yandex.ru/prices/object-storage
                </a>
              </li>
              <li>
                Yandex Cloud CDN (₽/ГБ трафика):
                <a
                  className="ml-1 text-indigo-600 hover:underline"
                  href="https://cloud.yandex.ru/prices/cdn"
                  target="_blank"
                  rel="noreferrer"
                >
                  cloud.yandex.ru/prices/cdn
                </a>
              </li>
              <li>
                Tuya IoT Platform — API/Msgs/Relay (USD):
                <a
                  className="ml-1 text-indigo-600 hover:underline"
                  href="https://developer.tuya.com/en/pricing"
                  target="_blank"
                  rel="noreferrer"
                >
                  developer.tuya.com/en/pricing
                </a>
                <span className="text-gray-500 ml-2">(тарифы SDK, API calls, Messaging, Relay)</span>
              </li>
            </ul>
            <p className="text-xs text-gray-500">
              Примечание: для упрощения расчётов используются усреднения и
              допущения (например, 0.72 ГБ/час для relay, бесплатная ступень API
              1 млн/мес и т.п.). Подкорректируйте поля в блоке «Тарифы за
              единицу (RUB/USD)» и мультипликаторы под ваши условия.
            </p>
          </div>
        </Section>

        {tab === "calc" && (
          <>
            {/* Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Section title="База / Пользователи">
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                  <label>
                    Курс ₽ за ${" "}
                    <Help text="Курс для конвертации цен Tuya в рубли." />
                  </label>
                  <input
                    className={inputCls}
                    type="number"
                    value={fx}
                    onChange={(e) => setFx(Number(e.target.value))}
                  />

                  <label>Аккаунтов (всего)</label>
                  <input
                    className={inputCls}
                    type="number"
                    value={accounts}
                    onChange={(e) => setAccounts(Number(e.target.value))}
                  />

                  <label>
                    Камер на аккаунт (ср.){" "}
                    <Help text="Сколько камер в среднем привязано к одному аккаунту." />
                  </label>
                  <input
                    className={inputCls}
                    type="number"
                    step={0.1}
                    value={avgCams}
                    onChange={(e) => setAvgCams(Number(e.target.value))}
                  />

                  <label>
                    Доля платящих (0..1){" "}
                    <Help text="Доля существующих аккаунтов, которые платят (в т.ч. камеры/SMH/Bundle)." />
                  </label>
                  <input
                    className={inputCls}
                    type="number"
                    step={0.01}
                    value={cloudShare}
                    onChange={(e) => setCloudShare(Number(e.target.value))}
                  />

                  <label>
                    Нагрузка бесплатных (0..1){" "}
                    <Help text="Во сколько раз free-аккаунт легче платного по Tuya нагрузке. 0.25 = 25% от платного." />
                  </label>
                  <input
                    className={inputCls}
                    type="number"
                    step={0.05}
                    value={freeLoadShare}
                    onChange={(e) => setFreeLoadShare(Number(e.target.value))}
                  />

                  <label>Дней в месяце</label>
                  <input
                    className={inputCls}
                    type="number"
                    value={monthDays}
                    onChange={(e) => setMonthDays(Number(e.target.value))}
                  />

                  <label>Backend фикс (₽/мес)</label>
                  <input
                    className={inputCls}
                    type="number"
                    value={backendFixed}
                    onChange={(e) => setBackendFixed(Number(e.target.value))}
                  />

                  <label>Ops фикс (₽/мес)</label>
                  <input
                    className={inputCls}
                    type="number"
                    value={opsFixed}
                    onChange={(e) => setOpsFixed(Number(e.target.value))}
                  />
                </div>
              </Section>

              <Section title="Трафик / Видео">
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
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
                    <Help text="Используется в режиме Full для расчёта ГБ/день." />
                  </label>
                  <input
                    className={inputCls}
                    type="number"
                    step={0.1}
                    value={bitrateMbps}
                    onChange={(e) => setBitrateMbps(Number(e.target.value))}
                  />

                  <label>Часов/день (Full)</label>
                  <input
                    className={inputCls}
                    type="number"
                    value={fullHours}
                    onChange={(e) => setFullHours(Number(e.target.value))}
                  />

                  <label>
                    ГБ/день/камера (Motion){" "}
                    <Help text="Средний фактический объём при записи по событиям." />
                  </label>
                  <input
                    className={inputCls}
                    type="number"
                    step={0.1}
                    value={gbPerDayMotion}
                    onChange={(e) => setGbPerDayMotion(Number(e.target.value))}
                  />

                  <label>Доля CDN скачиваний</label>
                  <input
                    className={inputCls}
                    type="number"
                    step={0.01}
                    value={cdnRatio}
                    onChange={(e) => setCdnRatio(Number(e.target.value))}
                  />

                  <label>Live часов/день</label>
                  <input
                    className={inputCls}
                    type="number"
                    step={0.1}
                    value={liveHours}
                    onChange={(e) => setLiveHours(Number(e.target.value))}
                  />

                  <label>Доля relay в live</label>
                  <input
                    className={inputCls}
                    type="number"
                    step={0.01}
                    value={relayShare}
                    onChange={(e) => setRelayShare(Number(e.target.value))}
                  />

                  <label>API вызовов/камера/день</label>
                  <input
                    className={inputCls}
                    type="number"
                    value={apiPerDay}
                    onChange={(e) => setApiPerDay(Number(e.target.value))}
                  />
                </div>
              </Section>

              <Section title="Тарифы за единицу (RUB/USD)">
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                  <label>Tuya SDK ($/год)</label>
                  <input
                    className={inputCls}
                    type="number"
                    value={tuyaSDKyrUSD}
                    onChange={(e) => setTuyaSDKyrUSD(Number(e.target.value))}
                  />

                  <label>Tuya API ($/1 млн)</label>
                  <input
                    className={inputCls}
                    type="number"
                    step={0.01}
                    value={tuyaApiUSDpm}
                    onChange={(e) => setTuyaApiUSDpm(Number(e.target.value))}
                  />

                  <label>Tuya Msgs ($/1 млн)</label>
                  <input
                    className={inputCls}
                    type="number"
                    step={0.01}
                    value={tuyaMsgUSDpm}
                    onChange={(e) => setTuyaMsgUSDpm(Number(e.target.value))}
                  />

                  <label>Tuya Relay ($/ГБ)</label>
                  <input
                    className={inputCls}
                    type="number"
                    step={0.01}
                    value={tuyaRelayUSDpGB}
                    onChange={(e) => setTuyaRelayUSDpGB(Number(e.target.value))}
                  />

                  <label>Yandex Storage (₽/ГБ‑мес)</label>
                  <input
                    className={inputCls}
                    type="number"
                    step={0.01}
                    value={ycStorageRUBpGBm}
                    onChange={(e) =>
                      setYcStorageRUBpGBm(Number(e.target.value))
                    }
                  />

                  <label>Yandex CDN (₽/ГБ)</label>
                  <input
                    className={inputCls}
                    type="number"
                    step={0.01}
                    value={ycCDNRUBpGB}
                    onChange={(e) => setYcCDNRUBpGB(Number(e.target.value))}
                  />
                </div>
              </Section>
            </div>

            {/* Scenario: split base into paid/free and across families */}
            <Section title="Сценарий распределения базы (платящие/бесплатные)">
              <div className="text-sm text-gray-700 mb-3">
                Доля облака = доля платящих аккаунтов. Ниже задайте, как
                платящие и бесплатные распределяются по семействам. Можно быстро
                применить пресеты.
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <div className="font-semibold mb-2">
                    Платящие аккаунты — сплит по семействам (сумма = 1)
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                    <label>Камеры</label>
                    <input
                      className={inputCls}
                      type="number"
                      step={0.01}
                      value={paidSplit.camera}
                      onChange={(e) =>
                        setPaidSplit((ps) => ({
                          ...ps,
                          camera: Number(e.target.value),
                        }))
                      }
                    />
                    <label>Умный дом</label>
                    <input
                      className={inputCls}
                      type="number"
                      step={0.01}
                      value={paidSplit.smarthome}
                      onChange={(e) =>
                        setPaidSplit((ps) => ({
                          ...ps,
                          smarthome: Number(e.target.value),
                        }))
                      }
                    />
                    <label>Комбо</label>
                    <input
                      className={inputCls}
                      type="number"
                      step={0.01}
                      value={paidSplit.bundle}
                      onChange={(e) =>
                        setPaidSplit((ps) => ({
                          ...ps,
                          bundle: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                  {(() => {
                    const s =
                      (paidSplit.camera || 0) +
                      (paidSplit.smarthome || 0) +
                      (paidSplit.bundle || 0);
                    return (
                      <div className="mt-2 flex items-center gap-3">
                        <div
                          className={`text-xs ${
                            Math.abs(s - 1) < 1e-6
                              ? "text-green-600"
                              : "text-amber-600"
                          }`}
                        >
                          Сумма:{" "}
                          {new Intl.NumberFormat("ru-RU", {
                            maximumFractionDigits: 2,
                          }).format(s)}
                        </div>
                        <button
                          className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs"
                          onClick={() => {
                            const s0 =
                              (paidSplit.camera || 0) +
                              (paidSplit.smarthome || 0) +
                              (paidSplit.bundle || 0);
                            if (s0 > 0)
                              setPaidSplit({
                                camera: paidSplit.camera / s0,
                                smarthome: paidSplit.smarthome / s0,
                                bundle: paidSplit.bundle / s0,
                              });
                          }}
                        >
                          Нормализовать
                        </button>
                      </div>
                    );
                  })()}
                </div>

                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <div className="font-semibold mb-2">
                    Бесплатные аккаунты — сплит (сумма = 1)
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                    <label>Камеры (free)</label>
                    <input
                      className={inputCls}
                      type="number"
                      step={0.01}
                      value={freeSplit.camera}
                      onChange={(e) =>
                        setFreeSplit((fs) => ({
                          ...fs,
                          camera: Number(e.target.value),
                        }))
                      }
                    />
                    <label>Умный дом (free)</label>
                    <input
                      className={inputCls}
                      type="number"
                      step={0.01}
                      value={freeSplit.smarthome}
                      onChange={(e) =>
                        setFreeSplit((fs) => ({
                          ...fs,
                          smarthome: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                  {(() => {
                    const s =
                      (freeSplit.camera || 0) + (freeSplit.smarthome || 0);
                    return (
                      <div className="mt-2 flex items-center gap-3">
                        <div
                          className={`text-xs ${
                            Math.abs(s - 1) < 1e-6
                              ? "text-green-600"
                              : "text-amber-600"
                          }`}
                        >
                          Сумма:{" "}
                          {new Intl.NumberFormat("ru-RU", {
                            maximumFractionDigits: 2,
                          }).format(s)}
                        </div>
                        <button
                          className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs"
                          onClick={() => {
                            const s0 =
                              (freeSplit.camera || 0) +
                              (freeSplit.smarthome || 0);
                            if (s0 > 0)
                              setFreeSplit({
                                camera: freeSplit.camera / s0,
                                smarthome: freeSplit.smarthome / s0,
                              });
                          }}
                        >
                          Нормализовать
                        </button>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="text-gray-500 mr-1">Пресеты:</span>
                <button
                  className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200"
                  onClick={() => {
                    setPaidSplit({ camera: 0.7, smarthome: 0.1, bundle: 0.2 });
                    setFreeSplit({ camera: 0.8, smarthome: 0.2 });
                  }}
                >
                  Камеры-центричный
                </button>
                <button
                  className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200"
                  onClick={() => {
                    setPaidSplit({ camera: 0.4, smarthome: 0.2, bundle: 0.4 });
                    setFreeSplit({ camera: 0.6, smarthome: 0.4 });
                  }}
                >
                  Bundle-центричный
                </button>
                <button
                  className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200"
                  onClick={() => {
                    setPaidSplit({ camera: 0.3, smarthome: 0.5, bundle: 0.2 });
                    setFreeSplit({ camera: 0.4, smarthome: 0.6 });
                  }}
                >
                  SMH-центричный
                </button>
              </div>
            </Section>

            {/* Tariffs editor in Calc */}
            <Section title="Тарифы (редактируемые)">
              <TariffsEditor
                tariffs={tariffs}
                setTariffs={setTariffs}
                defaults={DEFAULT_TARIFFS}
              />
            </Section>

            {/* Base mix editor */}
            <Section title="Распределение текущей базы (микс внутри семейств)">
              <div className="text-sm text-gray-700 mb-3">
                Настройте доли (0..1) по тарифам для каждой продуктовой линии.
                Сумма по семейству должна быть равна 1. Кнопки
                нормализуют/распределяют равномерно.
              </div>
              <BaseMixEditor tariffs={tariffs} setTariffs={setTariffs} />
            </Section>

            {/* Unit economics per tariff */}
            <Section title="Юнит‑экономика по тарифам (на 1 активный аккаунт тарифа)">
              <div className="overflow-x-auto">
                <table className="min-w-[1100px] table-auto text-sm">
                  <thead>
                    <tr className="text-left">
                      <th className={thCls}>Тариф</th>
                      <th className={thCls}>Семейство</th>
                      <th className={thCls}>Выручка/акк</th>
                      <th className={thCls}>Overage/акк</th>
                      <th className={thCls}>Yandex/акк</th>
                      <th className={thCls}>Tuya/акк</th>
                      <th className={thCls}>Себестоимость/акк</th>
                      <th className={thCls}>Прибыль/акк</th>
                      <th className={thCls}>Маржа %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unitTariffRows.map((r) => (
                      <tr key={r.id} className="border-t">
                        <td className={`${tdTextCls} font-medium py-1`}>
                          {r.name}
                        </td>
                        <td className={tdTextCls}>{r.family}</td>
                        <td className={tdNumCls}>
                          <Num value={r.revenueAcc} />
                        </td>
                        <td className={tdNumCls}>
                          <Num value={r.overageAcc} />
                        </td>
                        <td className={tdNumCls}>
                          <Num value={r.yandexCostAcc} />
                        </td>
                        <td className={tdNumCls}>
                          <Num value={r.tuyaCostAcc} />
                        </td>
                        <td className={tdNumCls}>
                          <Num value={r.costAcc} />
                        </td>
                        <td
                          className={`${tdNumCls} ${
                            r.profitAcc >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          <Num value={r.profitAcc} />
                        </td>
                        <td className={tdNumCls}>
                          <Num value={r.marginAcc} digits={1} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            {/* Portfolio now */}
            <Section title="Срез сейчас по портфелю (по семействам)">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-gray-500">Аккаунтов всего</div>
                  <div className="text-xl font-semibold">
                    <Num value={accounts} />
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-gray-500">Платящих аккаунтов</div>
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
                  <div className="text-gray-500">Камер у платящих (оценка)</div>
                  <div className="text-xl font-semibold">
                    <Num value={camsCloud} />
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto mt-4">
                <table className="min-w-[1100px] table-auto text-sm">
                  <thead>
                    <tr className="text-left">
                      <th className={thCls}>Тариф</th>
                      <th className={thCls}>Семейство</th>
                      <th className={thCls}>Активные (оценка)</th>
                      <th className={thCls}>Выручка</th>
                      <th className={thCls}>Yandex cost</th>
                      <th className={thCls}>Tuya cost</th>
                      <th className={thCls}>Себестоимость</th>
                      <th className={thCls}>Прибыль</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tariffPortfolio.rows.map((r) => (
                      <tr key={r.id} className="border-t">
                        <td className={`${tdTextCls} font-medium py-1`}>
                          {r.name}
                        </td>
                        <td className={tdTextCls}>{r.family}</td>
                        <td className={tdNumCls}>
                          <Num value={r.accs} />
                        </td>
                        <td className={tdNumCls}>
                          <Num value={r.revenue} />
                        </td>
                        <td className={tdNumCls}>
                          <Num value={r.yCost} />
                        </td>
                        <td className={tdNumCls}>
                          <Num value={r.tCost} />
                        </td>
                        <td className={tdNumCls}>
                          <Num value={r.cost} />
                        </td>
                        <td
                          className={`${tdNumCls} ${
                            r.profit >= 0 ? "text-green-600" : "text-red-600"
                          }`}
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
                      <td className={tdNumCls}>
                        <Num value={tariffPortfolio.totals.accs} />
                      </td>
                      <td className={tdNumCls}>
                        <Num value={tariffPortfolio.totals.revenue} />
                      </td>
                      <td className={tdNumCls}>
                        <Num value={tariffPortfolio.totals.yCost} />
                      </td>
                      <td className={tdNumCls}>
                        <Num value={tariffPortfolio.totals.tCost} />
                      </td>
                      <td className={tdNumCls}>
                        <Num value={tariffPortfolio.totals.cost} />
                      </td>
                      <td
                        className={`${tdNumCls} ${
                          tariffPortfolio.totals.profit >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        <Num value={tariffPortfolio.totals.profit} />
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
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                  <label>Горизонт (мес)</label>
                  <input
                    className={inputCls}
                    type="number"
                    value={months}
                    onChange={(e) => setMonths(Number(e.target.value))}
                  />

                  <label>Churn (отток/мес)</label>
                  <input
                    className={inputCls}
                    type="number"
                    step={0.001}
                    value={churn}
                    onChange={(e) => setChurn(Number(e.target.value))}
                  />

                  <label>Продажи камер 1‑й мес</label>
                  <input
                    className={inputCls}
                    type="number"
                    value={salesStart}
                    onChange={(e) => setSalesStart(Number(e.target.value))}
                  />

                  <label>Рост продаж %/мес</label>
                  <input
                    className={inputCls}
                    type="number"
                    step={0.001}
                    value={salesGrowthPct}
                    onChange={(e) => setSalesGrowthPct(Number(e.target.value))}
                  />

                  <label>Доля облака новых</label>
                  <input
                    className={inputCls}
                    type="number"
                    step={0.01}
                    value={cloudNewShare}
                    onChange={(e) => setCloudNewShare(Number(e.target.value))}
                  />

                  <label>SMH база (старт)</label>
                  <input
                    className={inputCls}
                    type="number"
                    value={smhBaseStart}
                    onChange={(e) => setSmhBaseStart(Number(e.target.value))}
                  />

                  <label>SMH рост/мес</label>
                  <input
                    className={inputCls}
                    type="number"
                    step={0.001}
                    value={smhGrowth}
                    onChange={(e) => setSmhGrowth(Number(e.target.value))}
                  />

                  <label>Bundle база (старт)</label>
                  <input
                    className={inputCls}
                    type="number"
                    value={bundleBaseStart}
                    onChange={(e) => setBundleBaseStart(Number(e.target.value))}
                  />

                  <label>Bundle рост/мес</label>
                  <input
                    className={inputCls}
                    type="number"
                    step={0.001}
                    value={bundleGrowth}
                    onChange={(e) => setBundleGrowth(Number(e.target.value))}
                  />

                  <div className="col-span-2 h-2"></div>
                  <div className="col-span-2 font-semibold">
                    Приток от конкурентов
                  </div>

                  <label>База конкурентов (акк)</label>
                  <input
                    className={inputCls}
                    type="number"
                    value={competitorBase}
                    onChange={(e) => setCompetitorBase(Number(e.target.value))}
                  />

                  <label>
                    Конверсия конкурентов (0..1){" "}
                    <Help text="Доля базы конкурентов, которую удастся конвертировать в нашу базу за весь период" />
                  </label>
                  <input
                    className={inputCls}
                    type="number"
                    step={0.01}
                    value={competitorConversionPct}
                    onChange={(e) =>
                      setCompetitorConversionPct(Number(e.target.value))
                    }
                  />

                  <label>Горизонт конверсии (мес)</label>
                  <input
                    className={inputCls}
                    type="number"
                    value={competitorHorizon}
                    onChange={(e) =>
                      setCompetitorHorizon(Number(e.target.value))
                    }
                  />

                  <label>Кривая распределения</label>
                  <select
                    className={inputCls}
                    value={competitorMode}
                    onChange={(e) =>
                      setCompetitorMode(
                        (e.target.value as "uniform" | "logistic")
                      )
                    }
                  >
                    <option value="uniform">Равномерная</option>
                    <option value="logistic">S-кривая (логистическая)</option>
                  </select>

                  {competitorMode === "logistic" && (
                    <>
                      <label>
                        Крутизна S-кривой (k){" "}
                        <Help text="Больше k — резче переход (быстрее рост в середине)" />
                      </label>
                      <input
                        className={inputCls}
                        type="number"
                        step={0.1}
                        value={competitorK}
                        onChange={(e) => setCompetitorK(Number(e.target.value))}
                      />

                      <label>
                        Середина (месяц){" "}
                        <Help text="Где максимум скорости; null — середина горизонта" />
                      </label>
                      <input
                        className={inputCls}
                        type="number"
                        placeholder="пусто = центр"
                        value={competitorMid ?? ""}
                        onChange={(e) => {
                          const v = e.target.value.trim();
                          setCompetitorMid(v === "" ? null : Number(v));
                        }}
                      />
                    </>
                  )}

                  <label>Сплит конкурентов: Camera</label>
                  <input
                    className={inputCls}
                    type="number"
                    step={0.01}
                    value={competitorSplit.camera}
                    onChange={(e) =>
                      setCompetitorSplit({
                        ...competitorSplit,
                        camera: Number(e.target.value),
                      })
                    }
                  />
                  <label>Сплит конкурентов: SmartHome</label>
                  <input
                    className={inputCls}
                    type="number"
                    step={0.01}
                    value={competitorSplit.smarthome}
                    onChange={(e) =>
                      setCompetitorSplit({
                        ...competitorSplit,
                        smarthome: Number(e.target.value),
                      })
                    }
                  />
                  <label>Сплит конкурентов: Bundle</label>
                  <input
                    className={inputCls}
                    type="number"
                    step={0.01}
                    value={competitorSplit.bundle}
                    onChange={(e) =>
                      setCompetitorSplit({
                        ...competitorSplit,
                        bundle: Number(e.target.value),
                      })
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
                    <Num value={lastTar?.revenue ?? 0} />
                  </div>

                  <div className="text-gray-500">
                    Себестоимость / мес (последний)
                  </div>
                  <div className="font-semibold">
                    <Num value={lastTar?.cost ?? 0} />
                  </div>

                  <div className="text-gray-500">
                    Активные (всего, последний)
                  </div>
                  <div className="font-semibold">
                    <Num
                      value={
                        lastTar
                          ? lastTar.activeByFamily.camera +
                            lastTar.activeByFamily.smarthome +
                            lastTar.activeByFamily.bundle
                          : 0
                      }
                    />
                  </div>
                </div>
              </Section>
            </div>

            {/* Tariff forecast summary */}
            <Section title="Прогноз по тарифам — сводка по месяцам">
              <div className="flex items-center gap-3 mb-3 text-sm">
                <div className="text-gray-600">Детализация по месяцу:</div>
                <input
                  className={`${inputCls} w-28`}
                  type="number"
                  min={1}
                  max={months}
                  placeholder="№ мес"
                  value={detailMonth ?? ""}
                  onChange={(e) => {
                    const v = e.target.value.trim();
                    setDetailMonth(
                      v === "" ? null : Math.min(months, Math.max(1, Number(v)))
                    );
                  }}
                />
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[900px] table-auto text-sm">
                  <thead>
                    <tr className="text-left">
                      <th className={thCls}>Мес</th>
                      <th className={thCls}>Активные Camera</th>
                      <th className={thCls}>Активные SMH</th>
                      <th className={thCls}>Активные Bundle</th>
                      <th className={thCls}>Выручка</th>
                      <th className={thCls}>Себестоимость</th>
                      <th className={thCls}>Прибыль</th>
                      <th className={thCls}>Накопит.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tariffForecast.rows.map((r) => (
                      <tr key={r.month} className="border-t">
                        <td className={`${tdTextCls} py-1`}>{r.month}</td>
                        <td className={tdNumCls}>
                          <Num value={r.activeByFamily.camera} />
                        </td>
                        <td className={tdNumCls}>
                          <Num value={r.activeByFamily.smarthome} />
                        </td>
                        <td className={tdNumCls}>
                          <Num value={r.activeByFamily.bundle} />
                        </td>
                        <td className={tdNumCls}>
                          <Num value={r.revenue} />
                        </td>
                        <td className={tdNumCls}>
                          <Num value={r.cost} />
                        </td>
                        <td
                          className={`${tdNumCls} ${
                            r.profit >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          <Num value={r.profit} />
                        </td>
                        <td
                          className={`${tdNumCls} ${
                            r.cumProfit >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          <Num value={r.cumProfit} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {detailMonth && (
                <div className="mt-4 overflow-x-auto">
                  <div className="text-sm font-medium mb-2">
                    Детализация по тарифам (месяц {detailMonth})
                  </div>
                  {(() => {
                    const r = tariffForecast.rows[detailMonth - 1];
                    if (!r)
                      return (
                        <div className="text-sm text-gray-500">Нет данных</div>
                      );
                    return (
                      <>
                        <table className="min-w-[1100px] table-auto text-sm">
                          <thead>
                            <tr className="text-left">
                              <th className={thCls}>Тариф</th>
                              <th className={thCls}>Семейство</th>
                              <th className={thCls}>Активные</th>
                              <th className={thCls}>Выручка</th>
                              <th className={thCls}>Себестоимость</th>
                              <th className={thCls}>Прибыль</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tariffs.map((t) => (
                              <tr key={t.id} className="border-t">
                                <td className={`${tdTextCls} py-1`}>
                                  {t.name}
                                </td>
                                <td className={tdTextCls}>{t.family}</td>
                                <td className={tdNumCls}>
                                  <Num
                                    value={
                                      r.breakdown.activeByTariff[t.id] || 0
                                    }
                                  />
                                </td>
                                <td className={tdNumCls}>
                                  <Num
                                    value={r.breakdown.revByTariff[t.id] || 0}
                                  />
                                </td>
                                <td className={tdNumCls}>
                                  <Num
                                    value={r.breakdown.costByTariff[t.id] || 0}
                                  />
                                </td>
                                <td
                                  className={`${tdNumCls} ${
                                    (r.breakdown.profitByTariff[t.id] || 0) >= 0
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  <Num
                                    value={
                                      r.breakdown.profitByTariff[t.id] || 0
                                    }
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                          <div className="h-64 bg-white rounded-xl p-3 border border-gray-100">
                            <div className="text-sm font-medium mb-2">
                              Структура выручки по семействам
                            </div>
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  dataKey="value"
                                  data={[
                                    {
                                      name: "Камеры",
                                      value: tariffs
                                        .filter((t) => t.family === "camera")
                                        .reduce(
                                          (s, t) =>
                                            s +
                                            (r.breakdown.revByTariff[t.id] ||
                                              0),
                                          0
                                        ),
                                    },
                                    {
                                      name: "Умный дом",
                                      value: tariffs
                                        .filter((t) => t.family === "smarthome")
                                        .reduce(
                                          (s, t) =>
                                            s +
                                            (r.breakdown.revByTariff[t.id] ||
                                              0),
                                          0
                                        ),
                                    },
                                    {
                                      name: "Комбо",
                                      value: tariffs
                                        .filter((t) => t.family === "bundle")
                                        .reduce(
                                          (s, t) =>
                                            s +
                                            (r.breakdown.revByTariff[t.id] ||
                                              0),
                                          0
                                        ),
                                    },
                                  ]}
                                  label
                                >
                                  {["#6366f1", "#10b981", "#f59e0b"].map(
                                    (c, i) => (
                                      <Cell key={i} fill={c} />
                                    )
                                  )}
                                </Pie>
                                <Legend />
                                <RTooltip
                                  formatter={(v: number | string) =>
                                    new Intl.NumberFormat("ru-RU").format(
                                      Number(v)
                                    )
                                  }
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>

                          <div className="h-64 bg-white rounded-xl p-3 border border-gray-100">
                            <div className="text-sm font-medium mb-2">
                              Выручка по тарифам (топ)
                            </div>
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={tariffs
                                  .map((t) => ({
                                    name: t.name,
                                    revenue: r.breakdown.revByTariff[t.id] || 0,
                                  }))
                                  .sort((a, b) => b.revenue - a.revenue)
                                  .slice(0, 6)}
                                margin={{
                                  top: 10,
                                  right: 10,
                                  left: 0,
                                  bottom: 0,
                                }}
                              >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                  dataKey="name"
                                  tick={{ fontSize: 10 }}
                                  interval={0}
                                  angle={-20}
                                  textAnchor="end"
                                  height={60}
                                />
                                <YAxis tick={{ fontSize: 11 }} />
                                <RTooltip
                                  formatter={(v: number | string) =>
                                    new Intl.NumberFormat("ru-RU").format(
                                      Number(v)
                                    )
                                  }
                                />
                                <Bar dataKey="revenue" fill="#2563eb" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </Section>

            {/* Графики v7 */}
            <Section title="Графики (v7)">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-64 bg-white rounded-xl p-3 border border-gray-100">
                  <div className="text-sm font-medium mb-2">
                    Выручка vs Себестоимость vs Прибыль (помесячно)
                  </div>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={tariffForecast.rows}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
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
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <RTooltip
                        formatter={(v: number | string) =>
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
                        dataKey="cost"
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
                    Рост активной базы (в сумме)
                  </div>
                  <ResponsiveContainer width="100%" height="100%">
                    <RLineChart
                      data={tariffForecast.rows.map((r) => ({
                        ...r,
                        activeTotal:
                          r.activeByFamily.camera +
                          r.activeByFamily.smarthome +
                          r.activeByFamily.bundle,
                      }))}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <RTooltip
                        formatter={(v: number | string) =>
                          new Intl.NumberFormat("ru-RU").format(Number(v))
                        }
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="activeTotal"
                        name="Активные всего"
                        stroke="#2563eb"
                      />
                    </RLineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </Section>
          </>
        )}

        {tab === "tariffs" && (
          <>
            <Section title="Тарифные линии — обзор по сегментам (без цен)">
              <div className="text-sm text-gray-700 mb-3">
                Ниже — функциональные наборы для разных потребительских
                сегментов. Используйте это описание для сайта/презентаций.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Камеры — базовый */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="font-semibold mb-2">Камеры — базовый</div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Онлайн-просмотр, базовые уведомления</li>
                    <li>Мини-архив событий (24 часа)</li>
                    <li>1 виртуальная зона детекции</li>
                    <li>Доступ для семьи: до 2 пользователей</li>
                  </ul>
                </div>

                {/* Камеры — расширенный */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="font-semibold mb-2">Камеры — расширенный</div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Архив 7/30/90 дней, лимиты ГБ/камера</li>
                    <li>3–5 зон детекции, превью в уведомлениях</li>
                    <li>Приоритетный доступ (CDN/relay)</li>
                    <li>Расширенные уведомления и аналитика</li>
                  </ul>
                </div>

                {/* Умный дом — базовый */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="font-semibold mb-2">Умный дом — базовый</div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Расширенные сценарии (условия «если/и/или»)</li>
                    <li>Журнал событий 7 дней</li>
                    <li>Общий доступ: до 3 пользователей</li>
                    <li>Интеграция с Алисой</li>
                  </ul>
                </div>

                {/* Умный дом — расширенный */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="font-semibold mb-2">
                    Умный дом — расширенный
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Полная логика сценариев, гости/домохозяйства</li>
                    <li>Аналитика потребления (розетки и т.п.)</li>
                    <li>Интеллектуальные уведомления</li>
                    <li>Интеграции: Telegram/умные колонки</li>
                  </ul>
                </div>

                {/* Bundle */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 lg:col-span-3">
                  <div className="font-semibold mb-2">
                    Bundle (камеры + умный дом)
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Объединённый доступ и общий аккаунт семьи</li>
                    <li>Синхронизация настроек и резервные копии</li>
                    <li>Единые сценарии: «камера → действие устройства»</li>
                    <li>Приоритетное соединение и поддержка</li>
                  </ul>
                </div>
              </div>
            </Section>

            {/* Editable tariffs grid */}
            <Section title="Редактирование тарифов">
              <TariffsEditor
                tariffs={tariffs}
                setTariffs={setTariffs}
                defaults={DEFAULT_TARIFFS}
              />
            </Section>
          </>
        )}

        <Section title="Примечания и допущения">
          <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
            <li>
              Перерасход (overage) считается как разница между фактическим
              объёмом в архиве и лимитом тарифа по ГБ/камера, если разница
              положительная.
            </li>
            <li>
              Tuya API/Msgs/Relay распределены по аккаунтам пропорционально
              общей базе камер; уточнить тарифы у Tuya — сейчас это ориентиры
              нужно, в открытом доступе не нашел
            </li>
            <li>
              Хранилище Yandex считается: min(факт; лимит) × камер/аккаунт; CDN
              — доля от хранения (по умолчанию 30%).
            </li>
            <li>
              Графики и годовые итоги строятся поверх помесячной модели; в годах
              агрегируется каждые 12 месяцев.
            </li>
          </ul>
        </Section>
      </div>
    </div>
  );
}
