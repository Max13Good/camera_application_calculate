import { useMemo } from "react";
import { makeCompetitorSchedule } from "../lib/forecast";

export function useTariffForecast(opts: {
  tariffs: any[];
  months: number;
  salesStart: number;
  salesGrowthPct: number;
  avgCams: number;
  cloudNewShare: number;
  competitorBase: number;
  competitorConversionPct: number;
  competitorHorizon: number;
  competitorMode: "uniform" | "logistic";
  competitorK: number;
  competitorMid: number | null;
  competitorSplit: { camera: number; smarthome: number; bundle: number };
  smhBaseStart: number;
  smhGrowth: number;
  bundleBaseStart: number;
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

    // initial active by tariff via baseShare0
    let cameraPool = Math.round(cloudAccounts);
    let smhPool = Math.round(smhBaseStart);
    let bundlePool = Math.round(bundleBaseStart);

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
      const newAcc = sales * avgCams;
      const newCloudAcc = Math.round(newAcc * cloudNewShare);

      const migAll = Math.round(competitorPlan[Math.min(m - 1, competitorPlan.length - 1)] || 0);
      const migCam = Math.round(migAll * (competitorSplit.camera || 0));
      const migSmh = Math.round(migAll * (competitorSplit.smarthome || 0));
      const migBundle = Math.round(migAll * (competitorSplit.bundle || 0));

      cameraPool += newCloudAcc + migCam;
      smhPool += Math.round(smhBaseStart * Math.pow(1 + smhGrowth, m - 1) * (m === 1 ? 1 : 0)) + migSmh;
      bundlePool += Math.round(bundleBaseStart * Math.pow(1 + bundleGrowth, m - 1) * (m === 1 ? 1 : 0)) + migBundle;

      cameraPool = Math.max(0, Math.round(cameraPool * (1 - churn)));
      smhPool = Math.max(0, Math.round(smhPool * (1 - churn)));
      bundlePool = Math.max(0, Math.round(bundlePool * (1 - churn)));

      const activeByFamily = { camera: 0, smarthome: 0, bundle: 0 } as {
        camera: number;
        smarthome: number;
        bundle: number;
      };

      const revByTariff: Record<string, number> = {};
      const costByTariff: Record<string, number> = {};
      const profitByTariff: Record<string, number> = {};

      const tuyaApiUSD = tuyaApiUSDpm;
      const tuyaMsgUSD = tuyaMsgUSDpm;
      const tuyaRelayUSD = tuyaRelayUSDpGB;

      for (const t of tariffs) {
        const id = t.id;
        const act = nextActiveByTariff[id] || 0;
        const price = t.price || 0;
        let revenue = act * price;

        const archiveDays = t.archiveDays || 0;
        const includedCams = t.includedCams || 1;
        const gbCapPerCam = t.gbCapPerCam || 0;
        const overageRUBperGB = t.overageRUBperGB || 0;

        const vc = t.varCost || {};
        const vcStorage = (vc as any).yandexStorageRUBpGBm ?? ycStorageRUBpGBm;
        const vcCDN = (vc as any).yandexCDNRUBpGB ?? ycCDNRUBpGB;
        const vcCdnRatio = (vc as any).cdnRatio ?? cdnRatio;
        const vcGbDay = (vc as any).avgGbPerDayMotion ?? gbPerDay;
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

        const apiCallsPerAcc = apiPerDay * monthDays;
        const msgsPerAcc = 10 * monthDays;
        const relayGBPerAcc = camHoursPerDayForRelay * 0.72 * monthDays;
        const wTariff = (t.price || 0) > 0 ? 1 : freeLoadShare;
        const apiMul = ((t.varCost as any)?.tuyaApiMul ?? 1) * wTariff;
        const msgsMul = ((t.varCost as any)?.tuyaMsgsMul ?? 1) * wTariff;
        const relayMul = ((t.varCost as any)?.tuyaRelayMul ?? 1) * wTariff;
        const tuyaCostPerAcc =
          Math.max(0, (apiCallsPerAcc - 1_000_000) / 1_000_000) * vcApiUSD * fx * apiMul +
          (msgsPerAcc / 1_000_000) * vcMsgUSD * fx * msgsMul +
          relayGBPerAcc * vcRelayUSD * fx * relayMul;
        const tuyaCost = act * tuyaCostPerAcc;

        const cost = yandexCost + tuyaCost;
        revenue += overageRev;
        const profit = revenue - cost;
        revByTariff[id] = revenue;
        costByTariff[id] = cost;
        profitByTariff[id] = profit;
      }

      for (const t of tariffs) {
        const fam = t.family as "camera" | "smarthome" | "bundle";
        activeByFamily[fam] += nextActiveByTariff[t.id] || 0;
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
        },
      });

      // carry state forward
      nextActiveByTariff = { ...nextActiveByTariff };
    }

    return { rows };
  }, [JSON.stringify(opts)]);

  return r;
}
