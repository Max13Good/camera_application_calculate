export type UnitTariffRow = {
  id: string;
  name: string;
  family: "camera" | "smarthome" | "bundle";
  revenueAcc: number;
  overageAcc: number;
  yandexCostAcc: number;
  tuyaCostAcc: number;
  costAcc: number;
  profitAcc: number;
  marginAcc: number;
};

export function computeUnitTariffRows(opts: {
  tariffs: any[];
  // globals
  avgCams: number;
  gbPerDay: number;
  fullMode: boolean;
  bitrateMbps: number;
  fullHours: number;
  cdnRatio: number;
  ycStorageRUBpGBm: number;
  ycCDNRUBpGB: number;
  backendFixed: number;
  opsFixed: number;
  tuyaSDKmoRUB: number;
  accounts: number;
  camsTotal: number;
  apiPerDay: number;
  monthDays: number;
  tuyaApiUSDpm: number;
  fx: number;
  tuyaMsgUSDpm: number;
  camHoursPerDayForRelay: number;
  tuyaRelayUSDpGB: number;
  cloudAccounts: number;
  cloudShare: number;
  freeLoadShare: number;
}): UnitTariffRow[] {
  const {
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
  } = opts;

  const rows: UnitTariffRow[] = [];
  const totalPaidAcc = Math.max(0, Math.round(accounts * cloudShare));
  const totalFreeAcc = Math.max(0, Math.round(accounts - totalPaidAcc));
  const accEquiv = Math.max(1, Math.round(totalPaidAcc + totalFreeAcc * freeLoadShare));
  const camsPaidTotal = Math.round(totalPaidAcc * avgCams);
  const camsFreeTotal = Math.round(totalFreeAcc * avgCams);
  const camsEquiv = camsPaidTotal + camsFreeTotal * freeLoadShare;
  const backendOpsPerAcc = (backendFixed + opsFixed) / Math.max(cloudAccounts, 1);

  const sdkPerAccEquiv = tuyaSDKmoRUB / accEquiv;

  const apiTotal = camsEquiv * apiPerDay * monthDays;
  const apiRubTotal = Math.max(0, (apiTotal - 1_000_000) / 1_000_000) * tuyaApiUSDpm * fx;
  const baseApiPerAcc = apiRubTotal / accEquiv;

  const msgsTotal = camsEquiv * 10 * monthDays;
  const msgsRubTotal = (msgsTotal / 1_000_000) * tuyaMsgUSDpm * fx;
  const baseMsgsPerAcc = msgsRubTotal / accEquiv;

  const relayGbTotal = camsEquiv * camHoursPerDayForRelay * 0.72 * monthDays;
  const relayRubTotal = relayGbTotal * tuyaRelayUSDpGB * fx;
  const baseRelayPerAcc = relayRubTotal / accEquiv;

  for (const t of tariffs) {
    const vc = (t.varCost || {}) as any;
    const storagePrice = (vc.yandexStorageRUBpGBm ?? ycStorageRUBpGBm) * (vc.yandexStorageRUBpGBmMul ?? 1);
    const cdnPrice = (vc.yandexCDNRUBpGB ?? ycCDNRUBpGB) * (vc.yandexCDNRUBpGBMul ?? 1);
    const cdnRatioEff = (vc.cdnRatio ?? cdnRatio) * (vc.cdnRatioMul ?? 1);

    const gbPerDayBase = fullMode ? ((bitrateMbps / 8) * 3600 * fullHours) / 1024 : gbPerDay;
    const gbPerDayEff = (vc.avgGbPerDayMotion ?? gbPerDayBase) * (vc.avgGbPerDayMotionMul ?? 1);

    const archiveDays = t.archiveDays || 0;
    const camsPerAcc = t.includedCams || avgCams;
    const capPerCam = t.gbCapPerCam || 0;
    const overagePrice = t.overageRUBperGB || 0;
    const price = t.price || 0;

    const factPerCamGB = archiveDays > 0 ? gbPerDayEff * archiveDays : 0;
    const billPerCamGB = capPerCam > 0 ? Math.min(factPerCamGB, capPerCam) : factPerCamGB;
    const storageGBacc = billPerCamGB * camsPerAcc;
    const cdnGBacc = storageGBacc * cdnRatioEff;

    const backendAlloc = t.family === "camera" && (t.price || 0) > 0 ? backendOpsPerAcc : 0;
    const yandexCostAcc = storageGBacc * storagePrice + cdnGBacc * cdnPrice + backendAlloc;

    const overGBacc = Math.max(0, factPerCamGB - (capPerCam || 0)) * camsPerAcc;
    const overageAcc = overGBacc * overagePrice;

    const apiPriceUSDpm = vc.tuyaAPIperMLNUSD ?? tuyaApiUSDpm;
    const msgsPriceUSDpm = vc.tuyaMsgsperMLNUSD ?? tuyaMsgUSDpm;
    const relayPriceUSDpGB = vc.tuyaRelayUSDpGB ?? tuyaRelayUSDpGB;

    const wTariff = (t.price || 0) > 0 ? 1 : freeLoadShare;
    const apiPerAcc = baseApiPerAcc * (apiPriceUSDpm / Math.max(tuyaApiUSDpm, 1e-9)) * (vc.tuyaApiMul ?? 1) * wTariff;
    const msgsPerAcc = baseMsgsPerAcc * (msgsPriceUSDpm / Math.max(tuyaMsgUSDpm, 1e-9)) * (vc.tuyaMsgsMul ?? 1) * wTariff;
    const relayPerAcc = baseRelayPerAcc * (relayPriceUSDpGB / Math.max(tuyaRelayUSDpGB, 1e-9)) * (vc.tuyaRelayMul ?? 1) * wTariff;
    const sdkPart = sdkPerAccEquiv * wTariff;
    const tuyaCostAcc = sdkPart + apiPerAcc + msgsPerAcc + relayPerAcc;

    const revenueAcc = price + overageAcc;
    const costAcc = yandexCostAcc + tuyaCostAcc;
    const profitAcc = revenueAcc - costAcc;
    const marginAcc = revenueAcc > 0 ? (profitAcc / revenueAcc) * 100 : 0;

    rows.push({
      id: t.id,
      name: t.name,
      family: t.family,
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
}

export function computeTariffPortfolio(opts: {
  tariffs: any[];
  unitTariffRows: UnitTariffRow[];
  accounts: number;
  cloudShare: number;
  paidSplit: { camera: number; smarthome: number; bundle: number };
  freeSplit: { camera: number; smarthome: number };
}) {
  const { tariffs, unitTariffRows, accounts, cloudShare, paidSplit, freeSplit } = opts;
  const totalPaid = Math.round(accounts * cloudShare);
  const totalFree = Math.max(0, Math.round(accounts - totalPaid));

  const paidPools: Record<"camera" | "smarthome" | "bundle", number> = {
    camera: Math.round(totalPaid * (paidSplit?.camera || 0)),
    smarthome: Math.round(totalPaid * (paidSplit?.smarthome || 0)),
    bundle: Math.round(totalPaid * (paidSplit?.bundle || 0)),
  };
  const freePools: Record<"camera" | "smarthome", number> = {
    camera: Math.round(totalFree * (freeSplit?.camera || 0)),
    smarthome: Math.round(totalFree * (freeSplit?.smarthome || 0)),
  };

  const alloc: Record<string, number> = {};
  function allocByShare(list: any[], pool: number) {
    const sum = list.reduce((s, t) => s + (t.forecast?.baseShare0 || 0), 0);
    if (sum > 0) {
      for (const t of list)
        alloc[t.id] = (alloc[t.id] || 0) + Math.round(pool * ((t.forecast?.baseShare0 || 0) / sum));
    } else if (list.length > 0) {
      const w = 1 / list.length;
      for (const t of list) alloc[t.id] = (alloc[t.id] || 0) + Math.round(pool * w);
    }
  }

  (['camera', 'smarthome', 'bundle'] as const).forEach((fam) => {
    const ts = tariffs.filter((t) => t.family === fam);
    const paidTs = ts.filter((t) => (t.price || 0) > 0);
    const freeTs = ts.filter((t) => (t.price || 0) === 0);
    allocByShare(paidTs, paidPools[fam] || 0);
    if (fam !== 'bundle') allocByShare(freeTs, (freePools as any)[fam] || 0);
  });

  const rows = tariffs.map((t) => {
    const accs = alloc[t.id] || 0;
    const u = unitTariffRows.find((r) => r.id === t.id);
    const revenue = (u ? u.revenueAcc : 0) * accs;
    const yCost = (u ? u.yandexCostAcc : 0) * accs;
    const tCost = (u ? u.tuyaCostAcc : 0) * accs;
    const cost = (u ? u.costAcc : 0) * accs;
    const profit = (u ? u.profitAcc : 0) * accs;
    return { id: t.id, name: t.name, family: t.family, accs, revenue, yCost, tCost, cost, profit };
  });
  const totals = rows.reduce(
    (s, r) => ({
      accs: s.accs + r.accs,
      revenue: s.revenue + r.revenue,
      yCost: s.yCost + r.yCost,
      tCost: s.tCost + r.tCost,
      cost: s.cost + r.cost,
      profit: s.profit + r.profit,
    }),
    { accs: 0, revenue: 0, yCost: 0, tCost: 0, cost: 0, profit: 0 }
  );
  return { rows, totals };
}

