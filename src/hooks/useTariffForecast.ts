import { useMemo } from "react";
import { makeCompetitorSchedule } from "../lib/forecast";

export function useTariffForecast(opts: {
  tariffs: any[];
  months: number;
  salesStart: number;
  salesGrowthPct: number;
  avgCams: number;
  // scenario from Calculator
  accounts: number;
  cloudShare: number;
  paidSplit: { camera: number; smarthome: number; bundle: number };
  freeSplit: { camera: number; smarthome: number };
  cloudNewShare: number;
  competitorBase: number;
  competitorConversionPct: number;
  competitorHorizon: number;
  competitorMode: "uniform" | "logistic";
  competitorK: number;
  competitorMid: number | null;
  competitorSplit: { camera: number; smarthome: number; bundle: number };
  smhBaseStart: number; // kept for growth math; initial pools now from scenario splits
  smhGrowth: number;
  bundleBaseStart: number; // kept for growth math; initial pools now from scenario splits
  bundleGrowth: number;
  // cost params
  ycStorageRUBpGBm: number;
  ycCDNRUBpGB: number;
  cdnRatio: number;
  gbPerDay: number;
  tuyaApiUSDpm: number;
  tuyaMsgUSDpm: number;
  tuyaRelayUSDpGB: number;
  fx: number;
  apiPerDay: number;
  monthDays: number;
  camHoursPerDayForRelay: number;
  churn: number;
  cloudAccounts: number;
  freeLoadShare?: number;
}) {
  const r = useMemo(() => {
    const {
      tariffs,
      months,
      salesStart,
      salesGrowthPct,
      avgCams,
      cloudNewShare,
      accounts,
      cloudShare,
      paidSplit,
      freeSplit,
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
      freeLoadShare = 0.25,
    } = opts;

    // competitor schedule
    const competitorTarget = competitorBase * competitorConversionPct;
    const competitorPlan = makeCompetitorSchedule({
      mode: competitorMode,
      total: competitorTarget,
      months: competitorHorizon,
      params: { k: competitorK, x0: competitorMid },
    });

    // helper: distribute new additions inside family by adoptionNew among paid tariffs;
    // leftover to free if exists
    function distributeByAdoption(totalNew: number, family: "camera" | "smarthome" | "bundle", all: any[]) {
      const familyTariffs = all.filter((t) => t.family === family);
      const paid = familyTariffs.filter((t) => (t.price || 0) > 0);
      const free = familyTariffs.find((t) => (t.price || 0) === 0) || null;
      const sumAdoption = paid.reduce((s, t) => s + (t.forecast?.adoptionNew || 0), 0);
      const scale = sumAdoption > 0 ? 1 / sumAdoption : 0;
      const alloc: Record<string, number> = {};
      let used = 0;
      if (sumAdoption > 0) {
        for (const t of paid) {
          const v = Math.round(totalNew * (t.forecast?.adoptionNew || 0) * scale);
          if (v > 0) alloc[t.id] = v;
          used += v;
        }
      }
      const rest = Math.max(0, Math.round(totalNew - used));
      if (free && rest > 0) alloc[free.id] = (alloc[free.id] || 0) + rest;
      return alloc;
    }

    // initial active by tariff via Calculator scenario (текущая база)
    const paidAcc = Math.max(0, Math.round(accounts * cloudShare));
    const freeAcc = Math.max(0, Math.round(accounts - paidAcc));
    let cameraPool = Math.max(
      0,
      Math.round(paidAcc * (paidSplit?.camera || 0) + freeAcc * (freeSplit?.camera || 0))
    );
    let smhPool = Math.max(0, Math.round(paidAcc * (paidSplit?.smarthome || 0)));
    let bundlePool = Math.max(0, Math.round(paidAcc * (paidSplit?.bundle || 0)));

    // Fallbacks: if scenario splits yield 0, use legacy starts
    if (cameraPool === 0 && cloudAccounts) cameraPool = Math.round(cloudAccounts);
    if (smhPool === 0 && smhBaseStart) smhPool = Math.round(smhBaseStart);
    if (bundlePool === 0 && bundleBaseStart) bundlePool = Math.round(bundleBaseStart);

    const activeByTariff: Record<string, number> = {};
    for (const fam of ["camera", "smarthome", "bundle"] as const) {
      const pool = fam === "camera" ? cameraPool : fam === "smarthome" ? smhPool : bundlePool;
      const ts = tariffs.filter((t) => t.family === fam);
      let used = 0;
      for (const t of ts) {
        const share = t.forecast?.baseShare0 || 0;
        const v = Math.round(pool * share);
        if (v > 0) activeByTariff[t.id] = v;
        used += v;
      }
      const rem = Math.max(0, pool - used);
      if (rem > 0 && ts.length) {
        let i = 0;
        while (i < rem) {
          const t = ts[i % ts.length];
          activeByTariff[t.id] = (activeByTariff[t.id] || 0) + 1;
          i++;
        }
      }
    }

    const rows: any[] = [];
    let cumProfit = 0;
    let nextActiveByTariff: Record<string, number> = { ...activeByTariff };
    for (let m = 1; m <= months; m++) {
      const sales = Math.round(salesStart * Math.pow(1 + salesGrowthPct, m - 1));
      // sales — это камеры в месяц; переводим в аккаунты
      const newAccFromSales = Math.round(sales / Math.max(avgCams, 1e-9));
      const newCloudAcc = Math.round(newAccFromSales * cloudNewShare);

      const migAll = Math.round(competitorPlan[Math.min(m - 1, competitorPlan.length - 1)] || 0);
      const migCam = Math.round(migAll * (competitorSplit.camera || 0));
      const migSmh = Math.round(migAll * (competitorSplit.smarthome || 0));
      const migBundle = Math.round(migAll * (competitorSplit.bundle || 0));

      // pools are informative; фактическое распределение делаем по тарифам ниже
      cameraPool = Math.max(0, Math.round((cameraPool + newCloudAcc + migCam) * (1 - churn)));
      smhPool = Math.max(0, Math.round((smhPool * (1 + (m === 1 ? 0 : smhGrowth)) + migSmh) * (1 - churn)));
      bundlePool = Math.max(0, Math.round((bundlePool * (1 + (m === 1 ? 0 : bundleGrowth)) + migBundle) * (1 - churn)));

      // allocate new additions among tariffs by adoption
      const allocCam = distributeByAdoption(newCloudAcc + migCam, "camera", tariffs);
      const allocSmh = distributeByAdoption(migSmh, "smarthome", tariffs);
      const allocBundle = distributeByAdoption(migBundle, "bundle", tariffs);
      const newByTariff: Record<string, number> = {};
      for (const k in allocCam) newByTariff[k] = (newByTariff[k] || 0) + allocCam[k];
      for (const k in allocSmh) newByTariff[k] = (newByTariff[k] || 0) + allocSmh[k];
      for (const k in allocBundle) newByTariff[k] = (newByTariff[k] || 0) + allocBundle[k];

      // churn + upgrade/downgrade + add
      const nextMap: Record<string, number> = {};
      for (const t of tariffs) {
        const id = t.id;
        const actPrev = nextActiveByTariff[id] || 0;
        const churned = Math.round((t.forecast?.churn || 0) * actPrev);
        let stay = Math.max(0, actPrev - churned);
        const upTo = t.forecast?.upgradeTo || null;
        const upCnt = Math.round((t.forecast?.upgradeRate || 0) * stay);
        const dnTo = t.forecast?.downgradeTo || null;
        const dnCnt = Math.round((t.forecast?.downgradeRate || 0) * stay);
        stay = Math.max(0, stay - upCnt - dnCnt);
        nextMap[id] = (nextMap[id] || 0) + stay;
        if (upTo) nextMap[upTo] = (nextMap[upTo] || 0) + upCnt;
        if (dnTo) nextMap[dnTo] = (nextMap[dnTo] || 0) + dnCnt;
      }
      // add new entries
      for (const id in newByTariff) nextMap[id] = (nextMap[id] || 0) + newByTariff[id];
      nextActiveByTariff = nextMap;

      const activeByFamily = { camera: 0, smarthome: 0, bundle: 0 } as {
        camera: number;
        smarthome: number;
        bundle: number;
      };
      for (const t of tariffs) {
        const fam = t.family as "camera" | "smarthome" | "bundle";
        activeByFamily[fam] += nextActiveByTariff[t.id] || 0;
      }

      const revByTariff: Record<string, number> = {};
      const costByTariff: Record<string, number> = {};
      const profitByTariff: Record<string, number> = {};
      const yCostByTariff: Record<string, number> = {};
      const tCostByTariff: Record<string, number> = {};
      const detail: Array<{
        id: string;
        name: string;
        family: 'camera' | 'smarthome' | 'bundle';
        active: number;
        revenue: number;
        yCost: number;
        tCost: number;
        cost: number;
        profit: number;
      }> = [];

      const tuyaApiUSD = tuyaApiUSDpm;
      const tuyaMsgUSD = tuyaMsgUSDpm;
      const tuyaRelayUSD = tuyaRelayUSDpGB;

      // Precompute org-level free API allowance across all tariffs for the month
      const apiCallsPerAcc = apiPerDay * monthDays;
      const msgsPerAcc = 10 * monthDays;
      const relayGBPerAcc = camHoursPerDayForRelay * 0.72 * monthDays;
      let totalApiCallsWeighted = 0;
      for (const t of tariffs) {
        const act = nextActiveByTariff[t.id] || 0;
        const wTariff = (t.price || 0) > 0 ? 1 : freeLoadShare;
        const apiMul = ((t.varCost as any)?.tuyaApiMul ?? 1) * wTariff;
        totalApiCallsWeighted += act * apiCallsPerAcc * apiMul;
      }
      const apiFree = 1_000_000;
      const apiFactor = totalApiCallsWeighted > 0 ? Math.max(0, (totalApiCallsWeighted - apiFree) / totalApiCallsWeighted) : 0;

      for (const t of tariffs) {
        const id = t.id;
        const act = nextActiveByTariff[id] || 0;
        const price = t.price || 0;
        let revenue = act * price;

        const archiveDays = t.archiveDays || 0;
        const includedCams = t.includedCams || avgCams;
        const gbCapPerCam = t.gbCapPerCam || 0;
        const overageRUBperGB = t.overageRUBperGB || 0;

        const vc = t.varCost || {};
        const vcStorage = ((vc as any).yandexStorageRUBpGBm ?? ycStorageRUBpGBm) * (((vc as any).yandexStorageRUBpGBmMul ?? 1));
        const vcCDN = ((vc as any).yandexCDNRUBpGB ?? ycCDNRUBpGB) * (((vc as any).yandexCDNRUBpGBMul ?? 1));
        const vcCdnRatio = (((vc as any).cdnRatio ?? cdnRatio) * (((vc as any).cdnRatioMul ?? 1)));
        const vcGbDay = (((vc as any).avgGbPerDayMotion ?? gbPerDay) * (((vc as any).avgGbPerDayMotionMul ?? 1)));
        const vcRelayUSD = (vc as any).tuyaRelayUSDpGB ?? tuyaRelayUSD;
        const vcApiUSD = (vc as any).tuyaAPIperMLNUSD ?? tuyaApiUSD;
        const vcMsgUSD = (vc as any).tuyaMsgsperMLNUSD ?? tuyaMsgUSD;

        let yandexCost = 0;
        let overageRev = 0;
        if (archiveDays > 0) {
          const factPerCamGB = vcGbDay * archiveDays;
          const billPerCamGB = Math.min(factPerCamGB, gbCapPerCam || factPerCamGB);
          const storageGB = billPerCamGB * includedCams;
          const cdnGB = storageGB * vcCdnRatio;
          yandexCost = act * (storageGB * vcStorage + cdnGB * vcCDN);
          if (overageRUBperGB > 0 && gbCapPerCam && factPerCamGB > gbCapPerCam) {
            const overGB = (factPerCamGB - gbCapPerCam) * includedCams;
            overageRev = act * overGB * overageRUBperGB;
          }
        }

        const wTariff = (t.price || 0) > 0 ? 1 : freeLoadShare;
        const apiMul = ((t.varCost as any)?.tuyaApiMul ?? 1) * wTariff;
        const msgsMul = ((t.varCost as any)?.tuyaMsgsMul ?? 1) * wTariff;
        const relayMul = ((t.varCost as any)?.tuyaRelayMul ?? 1) * wTariff;
        const tuyaCostPerAcc =
          // Apply org-level free API pool via apiFactor (0..1)
          (apiCallsPerAcc / 1_000_000) * vcApiUSD * fx * apiMul * apiFactor +
          (msgsPerAcc / 1_000_000) * vcMsgUSD * fx * msgsMul +
          relayGBPerAcc * vcRelayUSD * fx * relayMul;
        const tuyaCost = act * tuyaCostPerAcc;

        const cost = yandexCost + tuyaCost;
        revenue += overageRev;
        const profit = revenue - cost;
        revByTariff[id] = revenue;
        costByTariff[id] = cost;
        profitByTariff[id] = profit;
        yCostByTariff[id] = yandexCost;
        tCostByTariff[id] = tuyaCost;
        detail.push({
          id,
          name: t.name,
          family: t.family,
          active: act,
          revenue,
          yCost: yandexCost,
          tCost: tuyaCost,
          cost,
          profit,
        });
      }

      const revenue = Object.values(revByTariff).reduce((s, v) => s + v, 0);
      const cost = Object.values(costByTariff).reduce((s, v) => s + v, 0);
      const profit = revenue - cost;
      cumProfit += profit;

      rows.push({
        month: m,
        activeByFamily,
        revenue,
        cost,
        profit,
        cumProfit,
        breakdown: {
          activeByTariff: { ...nextActiveByTariff },
          revByTariff,
          costByTariff,
          profitByTariff,
          yCostByTariff,
          tCostByTariff,
        },
        detail,
      });
    }

    return { rows };
  }, [JSON.stringify(opts)]);

  return r;
}
