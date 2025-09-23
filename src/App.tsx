import React, { useMemo, useState } from "react";
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

// ------------------------------------------------------------
// Mini App v3 — Cloud Pricing & Profit Calculator (RU)
// Что нового:
// - Исправлена вёрстка: табличные цифры, выравнивание вправо, min-width таблиц,
//   горизонтальная прокрутка, компактные заголовки, нормальные инпуты без @apply.
// - Подробные подсказки (иконка ?), раздел «Руководство» прямо в приложении.
// - Вкладка «Прогноз»: помесячная и годовая модель, кумулятивная прибыль, графики.
// - TypeScript-фиксы (нет .at; типизированы Tooltip и агрегаторы.)
// ------------------------------------------------------------

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white shadow-sm rounded-2xl p-5 border border-gray-100 overflow-hidden">
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
  return (
    <span className="tabular-nums whitespace-nowrap">
      {fmt.format(isFinite(value) ? value : 0)}
    </span>
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

function TariffsEditor({
  tariffs,
  setTariffs,
  defaults,
}: {
  tariffs: any[];
  setTariffs: (t: any[]) => void;
  defaults: any[];
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");

  const families: Array<{
    key: "camera" | "smarthome" | "bundle";
    title: string;
  }> = [
    { key: "camera", title: "Камеры" },
    { key: "smarthome", title: "Умный дом" },
    { key: "bundle", title: "Комбо" },
  ];

  const updateTariff = (id: string, patch: any) => {
    setTariffs(tariffs.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };
  const updateTariffNested = (
    id: string,
    path: "varCost" | "forecast",
    key: string,
    value: any
  ) => {
    setTariffs(
      tariffs.map((t) =>
        t.id === id ? { ...t, [path]: { ...(t[path] || {}), [key]: value } } : t
      )
    );
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3 text-sm">
        <button
          className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200"
          onClick={() => setTariffs(JSON.parse(JSON.stringify(defaults)))}
        >
          Сбросить на дефолт
        </button>
        <button
          className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200"
          onClick={() => {
            setShowExport(!showExport);
            setShowImport(false);
          }}
        >
          {showExport ? "Скрыть экспорт" : "Экспорт тарифов (JSON)"}
        </button>
        <button
          className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200"
          onClick={() => {
            setShowImport(!showImport);
            setShowExport(false);
          }}
        >
          {showImport ? "Скрыть импорт" : "Импорт тарифов (JSON)"}
        </button>
      </div>

      {showExport && (
        <div className="mb-4">
          <textarea
            className={`${inputCls} w-full h-40 font-mono`}
            readOnly
            value={JSON.stringify(tariffs, null, 2)}
          />
        </div>
      )}
      {showImport && (
        <div className="mb-4">
          <textarea
            className={`${inputCls} w-full h-40 font-mono`}
            placeholder="Вставьте JSON тарифов"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
          />
          <div className="mt-2">
            <button
              className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white"
              onClick={() => {
                try {
                  const parsed = JSON.parse(importText);
                  if (Array.isArray(parsed)) setTariffs(parsed);
                } catch (e) {
                  /* ignore */
                }
              }}
            >
              Импортировать
            </button>
          </div>
        </div>
      )}

      {families.map((fam) => (
        <div key={fam.key} className="mb-4">
          <div className="text-sm font-semibold mb-2">{fam.title}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tariffs
              .filter((t) => t.family === fam.key)
              .map((t) => (
                <div
                  key={t.id}
                  className="bg-gray-50 rounded-xl p-4 border border-gray-100"
                >
                  <div className="flex items-start gap-2">
                    <div className="font-semibold flex-1">{t.name}</div>
                    <button
                      className="text-indigo-600 text-sm"
                      onClick={() => setOpen({ ...open, [t.id]: !open[t.id] })}
                    >
                      {open[t.id] ? "Свернуть" : "Изменить"}
                    </button>
                  </div>
                  <div className="text-xs text-gray-600 mb-2">
                    {t.description}
                  </div>
                  <div className="text-sm font-medium mb-2">
                    Цена: <Num value={t.price || 0} /> ₽/мес
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-sm mb-3">
                    {(t.features || []).map((f: string, i: number) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>

                  {open[t.id] && (
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                      <label>
                        Цена (₽/мес){" "}
                        <Help text="ARPU тарифа за месяц. 0 для Free" />
                      </label>
                      <input
                        className={inputCls}
                        type="number"
                        value={t.price || 0}
                        onChange={(e) =>
                          updateTariff(t.id, { price: Number(e.target.value) })
                        }
                      />

                      <label>
                        Включено камер{" "}
                        <Help text="Сколько камер входит в тариф без доплаты" />
                      </label>
                      <input
                        className={inputCls}
                        type="number"
                        value={t.includedCams ?? 1}
                        onChange={(e) =>
                          updateTariff(t.id, {
                            includedCams: Number(e.target.value),
                          })
                        }
                      />

                      <label>
                        Архив (дней){" "}
                        <Help text="Глубина архива видеозаписей. 0 — без архива" />
                      </label>
                      <input
                        className={inputCls}
                        type="number"
                        value={t.archiveDays ?? 0}
                        onChange={(e) =>
                          updateTariff(t.id, {
                            archiveDays: Number(e.target.value),
                          })
                        }
                      />

                      <label>
                        Лимит ГБ/кам{" "}
                        <Help text="Жёсткий cap объёма хранения на камеру за период" />
                      </label>
                      <input
                        className={inputCls}
                        type="number"
                        value={t.gbCapPerCam ?? 0}
                        onChange={(e) =>
                          updateTariff(t.id, {
                            gbCapPerCam: Number(e.target.value),
                          })
                        }
                      />

                      <label>
                        Overage ₽/ГБ{" "}
                        <Help text="Стоимость перерасхода (факт − лимит), ₽/ГБ" />
                      </label>
                      <input
                        className={inputCls}
                        type="number"
                        value={t.overageRUBperGB ?? 0}
                        onChange={(e) =>
                          updateTariff(t.id, {
                            overageRUBperGB: Number(e.target.value),
                          })
                        }
                      />

                      <div className="col-span-2 font-semibold mt-2">
                        Переменная себестоимость (varCost)
                      </div>
                      <label>
                        Yandex Storage ₽/ГБ·мес{" "}
                        <Help text="Стоимость хранения за ГБ в месяц" />
                      </label>
                      <input
                        className={inputCls}
                        type="number"
                        step={0.01}
                        value={t.varCost?.yandexStorageRUBpGBm ?? ""}
                        onChange={(e) =>
                          updateTariffNested(
                            t.id,
                            "varCost",
                            "yandexStorageRUBpGBm",
                            Number(e.target.value)
                          )
                        }
                      />
                      <label>
                        Yandex CDN ₽/ГБ{" "}
                        <Help text="Стоимость CDN за ГБ скачиваний" />
                      </label>
                      <input
                        className={inputCls}
                        type="number"
                        step={0.01}
                        value={t.varCost?.yandexCDNRUBpGB ?? ""}
                        onChange={(e) =>
                          updateTariffNested(
                            t.id,
                            "varCost",
                            "yandexCDNRUBpGB",
                            Number(e.target.value)
                          )
                        }
                      />
                      <label>
                        avgGbPerDayMotion{" "}
                        <Help text="Средний объём/день/камера в Motion‑режиме" />
                      </label>
                      <input
                        className={inputCls}
                        type="number"
                        step={0.1}
                        value={t.varCost?.avgGbPerDayMotion ?? ""}
                        onChange={(e) =>
                          updateTariffNested(
                            t.id,
                            "varCost",
                            "avgGbPerDayMotion",
                            Number(e.target.value)
                          )
                        }
                      />
                      <label>
                        cdnRatio <Help text="Доля скачиваний из CDN (0..1)" />
                      </label>
                      <input
                        className={inputCls}
                        type="number"
                        step={0.01}
                        value={t.varCost?.cdnRatio ?? ""}
                        onChange={(e) =>
                          updateTariffNested(
                            t.id,
                            "varCost",
                            "cdnRatio",
                            Number(e.target.value)
                          )
                        }
                      />
                      <label>
                        Tuya API $/1млн{" "}
                        <Help text="Стоимость API на 1 млн вызовов (USD)" />
                      </label>
                      <input
                        className={inputCls}
                        type="number"
                        step={0.01}
                        value={t.varCost?.tuyaAPIperMLNUSD ?? ""}
                        onChange={(e) =>
                          updateTariffNested(
                            t.id,
                            "varCost",
                            "tuyaAPIperMLNUSD",
                            Number(e.target.value)
                          )
                        }
                      />
                      <label>
                        Tuya Msgs $/1млн{" "}
                        <Help text="Стоимость сообщений/событий на 1 млн (USD)" />
                      </label>
                      <input
                        className={inputCls}
                        type="number"
                        step={0.01}
                        value={t.varCost?.tuyaMsgsperMLNUSD ?? ""}
                        onChange={(e) =>
                          updateTariffNested(
                            t.id,
                            "varCost",
                            "tuyaMsgsperMLNUSD",
                            Number(e.target.value)
                          )
                        }
                      />
                      <label>
                        Tuya Relay $/ГБ{" "}
                        <Help text="Перенаправление потоков (relay), стоимость за ГБ (USD)" />
                      </label>
                      <input
                        className={inputCls}
                        type="number"
                        step={0.01}
                        value={t.varCost?.tuyaRelayUSDpGB ?? ""}
                        onChange={(e) =>
                          updateTariffNested(
                            t.id,
                            "varCost",
                            "tuyaRelayUSDpGB",
                            Number(e.target.value)
                          )
                        }
                      />

                      <div className="col-span-2 font-semibold mt-2">
                        Мультипликаторы (varCost multipliers)
                      </div>
                      <label>
                        Storage ×{" "}
                        <Help text="Множитель к цене Yandex Storage (по тарифу)" />
                      </label>
                      <input
                        className={inputCls}
                        type="number"
                        step={0.05}
                        value={t.varCost?.yandexStorageRUBpGBmMul ?? ""}
                        onChange={(e) =>
                          updateTariffNested(
                            t.id,
                            "varCost",
                            "yandexStorageRUBpGBmMul",
                            Number(e.target.value)
                          )
                        }
                      />
                      <label>
                        CDN ×{" "}
                        <Help text="Множитель к цене Yandex CDN (по тарифу)" />
                      </label>
                      <input
                        className={inputCls}
                        type="number"
                        step={0.05}
                        value={t.varCost?.yandexCDNRUBpGBMul ?? ""}
                        onChange={(e) =>
                          updateTariffNested(
                            t.id,
                            "varCost",
                            "yandexCDNRUBpGBMul",
                            Number(e.target.value)
                          )
                        }
                      />
                      <label>
                        avgGb/day ×{" "}
                        <Help text="Множитель к среднему объёму/день/камера" />
                      </label>
                      <input
                        className={inputCls}
                        type="number"
                        step={0.05}
                        value={t.varCost?.avgGbPerDayMotionMul ?? ""}
                        onChange={(e) =>
                          updateTariffNested(
                            t.id,
                            "varCost",
                            "avgGbPerDayMotionMul",
                            Number(e.target.value)
                          )
                        }
                      />
                      <label>
                        cdnRatio ×{" "}
                        <Help text="Множитель к доле CDN для тарифа" />
                      </label>
                      <input
                        className={inputCls}
                        type="number"
                        step={0.05}
                        value={t.varCost?.cdnRatioMul ?? ""}
                        onChange={(e) =>
                          updateTariffNested(
                            t.id,
                            "varCost",
                            "cdnRatioMul",
                            Number(e.target.value)
                          )
                        }
                      />
                      <label>
                        Tuya API ×{" "}
                        <Help text="Множитель к стоимости API (по тарифу)" />
                      </label>
                      <input
                        className={inputCls}
                        type="number"
                        step={0.05}
                        value={t.varCost?.tuyaApiMul ?? ""}
                        onChange={(e) =>
                          updateTariffNested(
                            t.id,
                            "varCost",
                            "tuyaApiMul",
                            Number(e.target.value)
                          )
                        }
                      />
                      <label>
                        Tuya Msgs ×{" "}
                        <Help text="Множитель к стоимости сообщений (по тарифу)" />
                      </label>
                      <input
                        className={inputCls}
                        type="number"
                        step={0.05}
                        value={t.varCost?.tuyaMsgsMul ?? ""}
                        onChange={(e) =>
                          updateTariffNested(
                            t.id,
                            "varCost",
                            "tuyaMsgsMul",
                            Number(e.target.value)
                          )
                        }
                      />
                      <label>
                        Tuya Relay ×{" "}
                        <Help text="Множитель к цене relay/GB (по тарифу)" />
                      </label>
                      <input
                        className={inputCls}
                        type="number"
                        step={0.05}
                        value={t.varCost?.tuyaRelayMul ?? ""}
                        onChange={(e) =>
                          updateTariffNested(
                            t.id,
                            "varCost",
                            "tuyaRelayMul",
                            Number(e.target.value)
                          )
                        }
                      />

                      <div className="col-span-2 font-semibold mt-2">
                        Прогноз/маркетинг
                      </div>
                      <label>
                        baseShare0{" "}
                        <Help text="Стартовая доля в пуле аудитории семейства (0..1)" />
                      </label>
                      <input
                        className={inputCls}
                        type="number"
                        step={0.01}
                        value={t.forecast?.baseShare0 ?? ""}
                        onChange={(e) =>
                          updateTariffNested(
                            t.id,
                            "forecast",
                            "baseShare0",
                            Number(e.target.value)
                          )
                        }
                      />
                      <label>
                        adoptionNew{" "}
                        <Help text="Доля новых, кто выбирает этот тариф (0..1)" />
                      </label>
                      <input
                        className={inputCls}
                        type="number"
                        step={0.01}
                        value={t.forecast?.adoptionNew ?? ""}
                        onChange={(e) =>
                          updateTariffNested(
                            t.id,
                            "forecast",
                            "adoptionNew",
                            Number(e.target.value)
                          )
                        }
                      />
                      <label>
                        churn <Help text="Месячный отток этого тарифа (0..1)" />
                      </label>
                      <input
                        className={inputCls}
                        type="number"
                        step={0.001}
                        value={t.forecast?.churn ?? ""}
                        onChange={(e) =>
                          updateTariffNested(
                            t.id,
                            "forecast",
                            "churn",
                            Number(e.target.value)
                          )
                        }
                      />
                      <label>
                        upgradeTo (id){" "}
                        <Help text="Целевой тариф для апгрейда" />
                      </label>
                      <select
                        className={inputCls}
                        value={t.forecast?.upgradeTo ?? ""}
                        onChange={(e) =>
                          updateTariffNested(
                            t.id,
                            "forecast",
                            "upgradeTo",
                            e.target.value || null
                          )
                        }
                      >
                        <option value="">—</option>
                        {tariffs.map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.id}
                          </option>
                        ))}
                      </select>
                      <label>
                        upgradeRate{" "}
                        <Help text="Доля, апгрейдящаяся в месяц (0..1)" />
                      </label>
                      <input
                        className={inputCls}
                        type="number"
                        step={0.001}
                        value={t.forecast?.upgradeRate ?? ""}
                        onChange={(e) =>
                          updateTariffNested(
                            t.id,
                            "forecast",
                            "upgradeRate",
                            Number(e.target.value)
                          )
                        }
                      />
                      <label>
                        downgradeTo (id){" "}
                        <Help text="Целевой тариф для даунгрейда" />
                      </label>
                      <select
                        className={inputCls}
                        value={t.forecast?.downgradeTo ?? ""}
                        onChange={(e) =>
                          updateTariffNested(
                            t.id,
                            "forecast",
                            "downgradeTo",
                            e.target.value || null
                          )
                        }
                      >
                        <option value="">—</option>
                        {tariffs.map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.id}
                          </option>
                        ))}
                      </select>
                      <label>
                        downgradeRate{" "}
                        <Help text="Доля, даунгрейдящаяся в месяц (0..1)" />
                      </label>
                      <input
                        className={inputCls}
                        type="number"
                        step={0.001}
                        value={t.forecast?.downgradeRate ?? ""}
                        onChange={(e) =>
                          updateTariffNested(
                            t.id,
                            "forecast",
                            "downgradeRate",
                            Number(e.target.value)
                          )
                        }
                      />
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function BaseMixEditor({
  tariffs,
  setTariffs,
}: {
  tariffs: any[];
  setTariffs: (t: any[]) => void;
}) {
  const families: Array<{
    key: "camera" | "smarthome" | "bundle";
    title: string;
  }> = [
    { key: "camera", title: "Камеры" },
    { key: "smarthome", title: "Умный дом" },
    { key: "bundle", title: "Комбо" },
  ];

  const updateShare = (id: string, nextVal: number) => {
    const v = isFinite(nextVal) ? Math.max(0, nextVal) : 0;
    setTariffs(
      tariffs.map((t: any) =>
        t.id === id
          ? { ...t, forecast: { ...(t.forecast || {}), baseShare0: v } }
          : t
      )
    );
  };

  const normalizeFamily = (fam: "camera" | "smarthome" | "bundle") => {
    const list = tariffs.filter((t: any) => t.family === fam);
    const sum = list.reduce(
      (s: number, t: any) => s + (t.forecast?.baseShare0 || 0),
      0
    );
    if (sum <= 0) return;
    setTariffs(
      tariffs.map((t: any) =>
        t.family === fam
          ? {
              ...t,
              forecast: {
                ...(t.forecast || {}),
                baseShare0: (t.forecast?.baseShare0 || 0) / sum,
              },
            }
          : t
      )
    );
  };

  const evenFamily = (fam: "camera" | "smarthome" | "bundle") => {
    const list = tariffs.filter((t: any) => t.family === fam);
    const w = list.length ? 1 / list.length : 0;
    setTariffs(
      tariffs.map((t: any) =>
        t.family === fam
          ? { ...t, forecast: { ...(t.forecast || {}), baseShare0: w } }
          : t
      )
    );
  };

  return (
    <div className="space-y-4">
      {families.map((f) => {
        const list = tariffs.filter((t: any) => t.family === f.key);
        const sum = list.reduce(
          (s: number, t: any) => s + (t.forecast?.baseShare0 || 0),
          0
        );
        return (
          <div
            key={f.key}
            className="bg-gray-50 rounded-xl p-4 border border-gray-100"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="font-semibold">{f.title}</div>
              <div className="text-xs text-gray-600">
                Сумма долей:{" "}
                <span
                  className={`font-medium ${
                    Math.abs(sum - 1) < 1e-6
                      ? "text-green-600"
                      : "text-amber-600"
                  }`}
                >
                  {new Intl.NumberFormat("ru-RU", {
                    maximumFractionDigits: 2,
                  }).format(sum)}
                </span>
              </div>
              <div className="ml-auto flex gap-2 text-sm">
                <button
                  className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200"
                  onClick={() => normalizeFamily(f.key)}
                >
                  Нормализовать
                </button>
                <button
                  className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200"
                  onClick={() => evenFamily(f.key)}
                >
                  Равномерно
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[700px] table-auto text-sm">
                <thead>
                  <tr className="text-left">
                    <th className={thCls}>Тариф</th>
                    <th className={thCls}>
                      Доля в базе (0..1){" "}
                      <Help text="Распределение текущей базы внутри семейства. Сумма по семейству = 1." />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((t: any) => (
                    <tr key={t.id} className="border-t">
                      <td className={`${tdTextCls} py-1`}>{t.name}</td>
                      <td className={tdTextCls}>
                        <input
                          className={`${inputCls} w-32`}
                          type="number"
                          step={0.01}
                          value={t.forecast?.baseShare0 ?? 0}
                          onChange={(e) =>
                            updateShare(t.id, Number(e.target.value))
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---- Utils: clamp, safeDiv ----
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const safeDiv = (a, b) => (b ? a / b : 0);

// ---- Weights: uniform & logistic ----
function uniformWeights(months) {
  if (months <= 0) return [];
  const w = 1 / months;
  return Array.from({ length: months }, () => w);
}

function logisticWeights(months, k = 0.5, x0 = null) {
  if (months <= 0) return [];
  const mid = x0 == null ? (months + 1) / 2 : clamp(x0, 1, months);
  const xs = Array.from({ length: months + 1 }, (_, i) => i); // 0..months
  const cdf = xs.map((t) => 1 / (1 + Math.exp(-k * (t - mid))));
  const diffs = [];
  for (let i = 1; i < cdf.length; i++)
    diffs.push(Math.max(0, cdf[i] - cdf[i - 1]));
  const sum = diffs.reduce((s, v) => s + v, 0) || 1;
  return diffs.map((v) => v / sum);
}

function makeCompetitorSchedule({
  mode = "uniform",
  total,
  months,
  params = {},
}) {
  const m = Math.max(1, Math.floor(months || 1));
  const W =
    mode === "logistic"
      ? logisticWeights(m, params.k ?? 0.5, params.x0 ?? null)
      : uniformWeights(m);
  return W.map((w) => w * (total || 0)); // абсолютные значения/мес
}

const inputCls =
  "w-full h-9 bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";
const thCls = "py-2 px-2 whitespace-nowrap text-xs leading-tight text-gray-600";
const tdNumCls = "px-2 text-right";
const tdTextCls = "px-2";

export default function App() {
  // ---------- Global inputs ----------
  const [fx, setFx] = useState(90); // ₽ за 1 USD
  const [accounts, setAccounts] = useState(22000);
  const [avgCams, setAvgCams] = useState(1);
  const [cloudShare, setCloudShare] = useState(0.2); // 0..1 доля текущих аккаунтов с облаком
  // Коэффициент нагрузки бесплатников (0..1): сколько от платного аккаунта
  const [freeLoadShare, setFreeLoadShare] = useState(0.25);
  // Распределение текущей базы: платящие vs бесплатные, и сплит по семействам
  const [paidSplit, setPaidSplit] = useState({
    camera: 0.6,
    smarthome: 0.2,
    bundle: 0.2,
  });
  const [freeSplit, setFreeSplit] = useState({ camera: 0.7, smarthome: 0.3 });
  const [cdnRatio, setCdnRatio] = useState(0.25);
  const [liveHours, setLiveHours] = useState(1);
  const [relayShare, setRelayShare] = useState(0.15);
  const [apiPerDay, setApiPerDay] = useState(70);
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

  const [tariffs, setTariffs] = useState<Tariff[]>(DEFAULT_TARIFFS);

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
  const [smhBaseStart, setSmhBaseStart] = useState(2000);
  const [smhGrowth, setSmhGrowth] = useState(0.02);
  const [bundleBaseStart, setBundleBaseStart] = useState(1000);
  const [bundleGrowth, setBundleGrowth] = useState(0.03);

  // Competitor split across families
  const [competitorSplit, setCompetitorSplit] = useState({
    camera: 0.7,
    smarthome: 0.1,
    bundle: 0.2,
  });

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
  type UnitTariffRow = {
    id: string;
    name: string;
    family: Tariff["family"];
    revenueAcc: number;
    overageAcc: number;
    yandexCostAcc: number;
    tuyaCostAcc: number;
    costAcc: number;
    profitAcc: number;
    marginAcc: number;
  };

  const unitTariffRows: UnitTariffRow[] = useMemo(() => {
    const rows: UnitTariffRow[] = [];
    const totalPaidAcc = Math.max(0, Math.round(accounts * cloudShare));
    const totalFreeAcc = Math.max(0, Math.round(accounts - totalPaidAcc));
    const accEquiv = Math.max(
      1,
      Math.round(totalPaidAcc + totalFreeAcc * freeLoadShare)
    );
    const camsPaidTotal = Math.round(totalPaidAcc * avgCams);
    const camsFreeTotal = Math.round(totalFreeAcc * avgCams);
    const camsEquiv = camsPaidTotal + camsFreeTotal * freeLoadShare;
    const backendOpsPerAcc =
      (backendFixed + opsFixed) / Math.max(cloudAccounts, 1);

    // Распределяем Tuya SDK и переменные издержки только между платными аккаунтами
    const sdkPerAccEquiv = tuyaSDKmoRUB / accEquiv;

    const apiTotal = camsEquiv * apiPerDay * monthDays;
    const apiRubTotal =
      Math.max(0, (apiTotal - 1_000_000) / 1_000_000) * tuyaApiUSDpm * fx;
    const baseApiPerAcc = apiRubTotal / accEquiv;

    const msgsTotal = camsEquiv * 10 * monthDays;
    const msgsRubTotal = (msgsTotal / 1_000_000) * tuyaMsgUSDpm * fx;
    const baseMsgsPerAcc = msgsRubTotal / accEquiv;

    const relayGbTotal = camsEquiv * camHoursPerDayForRelay * 0.72 * monthDays;
    const relayRubTotal = relayGbTotal * tuyaRelayUSDpGB * fx;
    const baseRelayPerAcc = relayRubTotal / accEquiv;

    for (const t of tariffs) {
      const vc = (t.varCost || {}) as any;

      // Effective parameters: absolute overrides with optional multipliers fallback
      const storagePrice =
        (vc.yandexStorageRUBpGBm ?? ycStorageRUBpGBm) *
        (vc.yandexStorageRUBpGBmMul ?? 1);
      const cdnPrice =
        (vc.yandexCDNRUBpGB ?? ycCDNRUBpGB) * (vc.yandexCDNRUBpGBMul ?? 1);
      const cdnRatioEff = (vc.cdnRatio ?? cdnRatio) * (vc.cdnRatioMul ?? 1);

      // GB/day per camera effective
      const gbPerDayBase = fullMode
        ? ((bitrateMbps / 8) * 3600 * fullHours) / 1024
        : gbPerDay;
      const gbPerDayEff =
        (vc.avgGbPerDayMotion ?? gbPerDayBase) * (vc.avgGbPerDayMotionMul ?? 1);

      const archiveDays = t.archiveDays || 0;
      const camsPerAcc = t.includedCams || avgCams;
      const capPerCam = t.gbCapPerCam || 0;
      const overagePrice = t.overageRUBperGB || 0;
      const price = t.price || 0;

      // volume calc
      const factPerCamGB = archiveDays > 0 ? gbPerDayEff * archiveDays : 0;
      const billPerCamGB =
        capPerCam > 0 ? Math.min(factPerCamGB, capPerCam) : factPerCamGB;
      const storageGBacc = billPerCamGB * camsPerAcc;
      const cdnGBacc = storageGBacc * cdnRatioEff;

      const backendAlloc =
        t.family === "camera" && (t.price || 0) > 0 ? backendOpsPerAcc : 0;
      const yandexCostAcc =
        storageGBacc * storagePrice + cdnGBacc * cdnPrice + backendAlloc;

      const overGBacc =
        Math.max(0, factPerCamGB - (capPerCam || 0)) * camsPerAcc;
      const overageAcc = overGBacc * overagePrice;

      // Tuya per-account effective using price overrides proportionally to base
      const apiPriceUSDpm = vc.tuyaAPIperMLNUSD ?? tuyaApiUSDpm;
      const msgsPriceUSDpm = vc.tuyaMsgsperMLNUSD ?? tuyaMsgUSDpm;
      const relayPriceUSDpGB = vc.tuyaRelayUSDpGB ?? tuyaRelayUSDpGB;

      const wTariff = (t.price || 0) > 0 ? 1 : freeLoadShare;
      const apiPerAcc =
        baseApiPerAcc *
        (apiPriceUSDpm / Math.max(tuyaApiUSDpm, 1e-9)) *
        (vc.tuyaApiMul ?? 1) *
        wTariff;
      const msgsPerAcc =
        baseMsgsPerAcc *
        (msgsPriceUSDpm / Math.max(tuyaMsgUSDpm, 1e-9)) *
        (vc.tuyaMsgsMul ?? 1) *
        wTariff;
      const relayPerAcc =
        baseRelayPerAcc *
        (relayPriceUSDpGB / Math.max(tuyaRelayUSDpGB, 1e-9)) *
        (vc.tuyaRelayMul ?? 1) *
        wTariff;
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
  }, [
    tariffs,
    // globals
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
  ]);

  // Portfolio now: split base into paid vs free, then across families and tariffs
  const tariffPortfolio = useMemo(() => {
    const totalPaid = Math.round(accounts * cloudShare);
    const totalFree = Math.max(0, Math.round(accounts - totalPaid));

    const paidPools: Record<Tariff["family"], number> = {
      camera: Math.round(totalPaid * (paidSplit.camera || 0)),
      smarthome: Math.round(totalPaid * (paidSplit.smarthome || 0)),
      bundle: Math.round(totalPaid * (paidSplit.bundle || 0)),
    };
    const freePools: Partial<Record<Tariff["family"], number>> = {
      camera: Math.round(totalFree * (freeSplit.camera || 0)),
      smarthome: Math.round(totalFree * (freeSplit.smarthome || 0)),
    };

    const alloc: Record<string, number> = {};

    function allocByShare(list: Tariff[], pool: number) {
      if (!list.length || !pool) return;
      const sum = list.reduce((s, t) => s + (t.forecast?.baseShare0 || 0), 0);
      if (sum > 0) {
        for (const t of list)
          alloc[t.id] =
            (alloc[t.id] || 0) +
            Math.round(pool * ((t.forecast?.baseShare0 || 0) / sum));
      } else {
        const w = 1 / list.length;
        for (const t of list)
          alloc[t.id] = (alloc[t.id] || 0) + Math.round(pool * w);
      }
    }

    (["camera", "smarthome", "bundle"] as Array<Tariff["family"]>).forEach(
      (fam) => {
        const ts = tariffs.filter((t) => t.family === fam);
        const paidTs = ts.filter((t) => (t.price || 0) > 0);
        const freeTs = ts.filter((t) => (t.price || 0) === 0);

        // Paid pools always distributed across paid tariffs
        allocByShare(paidTs, paidPools[fam] || 0);
        // Free pools (only for camera/smarthome) across free tariffs
        if (fam !== "bundle")
          allocByShare(freeTs, (freePools as any)[fam] || 0);
      }
    );

    const rows = tariffs.map((t) => {
      const accs = alloc[t.id] || 0;
      const u = unitTariffRows.find((r) => r.id === t.id);
      const revenue = (u ? u.revenueAcc : 0) * accs;
      const yCost = (u ? u.yandexCostAcc : 0) * accs;
      const tCost = (u ? u.tuyaCostAcc : 0) * accs;
      const cost = (u ? u.costAcc : 0) * accs;
      const profit = (u ? u.profitAcc : 0) * accs;
      return {
        id: t.id,
        name: t.name,
        family: t.family,
        accs,
        revenue,
        yCost,
        tCost,
        cost,
        profit,
      };
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
  }, [tariffs, unitTariffRows, accounts, cloudShare, paidSplit, freeSplit]);

  // ---------------- PROGNOZ (months/years) ----------------
  const [months, setMonths] = useState(24);
  const [churn, setChurn] = useState(0.03);
  const [salesStart, setSalesStart] = useState(2000); // камер в 1-й месяц
  const [salesGrowthPct, setSalesGrowthPct] = useState(0.03); // рост продаж в мес
  const [cloudNewShare, setCloudNewShare] = useState(0.2); // доля облака среди новых

  // ---- Competitor migration ----
  const [competitorBase, setCompetitorBase] = useState(20000); // вся база конкурентов, шт
  const [competitorConversionPct, setCompetitorConversionPct] = useState(0.1); // доля, которую перетянем (0..1)
  const [competitorHorizon, setCompetitorHorizon] = useState(12); // за сколько месяцев перетянем
  const [competitorMode, setCompetitorMode] = useState("uniform"); // "uniform" | "logistic"
  const [competitorK, setCompetitorK] = useState(0.5); // крутизна S-кривой (логистическая)
  const [competitorMid, setCompetitorMid] = useState(null); // месяц середины S-кривой (null = центр)

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

  // breakeven moved below (after tariffForecast init)

  // ---------- Helper: distribute by adoption within family ----------
  function distributeByAdoption(
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
  }

  // ---------- Forecast v7 by tariffs (separate from legacy) ----------
  type TFRow = {
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
  };

  const tariffForecast = useMemo(() => {
    // competitor schedule
    const competitorTarget = competitorBase * competitorConversionPct;
    const competitorPlan = makeCompetitorSchedule({
      mode: competitorMode,
      total: competitorTarget,
      months: competitorHorizon,
      params: { k: competitorK, x0: competitorMid },
    });

    // initial pools
    let cameraPool = Math.round(cloudAccounts); // из текущей базы облака
    let smhPool = Math.round(smhBaseStart);
    let bundlePool = Math.round(bundleBaseStart);

    // initial active by tariff via baseShare0
    const activeByTariff: Record<string, number> = {};
    const families: Tariff["family"][] = ["camera", "smarthome", "bundle"];
    for (const fam of families) {
      const pool =
        fam === "camera"
          ? cameraPool
          : fam === "smarthome"
          ? smhPool
          : bundlePool;
      const ts = tariffs.filter((t) => t.family === fam);
      let used = 0;
      for (const t of ts) {
        const share = t.forecast?.baseShare0 || 0;
        const v = Math.round(pool * share);
        if (v > 0) {
          activeByTariff[t.id] = v;
          used += v;
        } else {
          activeByTariff[t.id] = 0;
        }
      }
      // remainder to free
      const free = ts.find((t) => (t.price || 0) === 0);
      if (free)
        activeByTariff[free.id] =
          (activeByTariff[free.id] || 0) + Math.max(0, pool - used);
    }

    const rows: TFRow[] = [];
    let cumProfit = 0;

    for (let m = 1; m <= months; m++) {
      // new camera from sales
      const sales = Math.round(
        salesStart * Math.pow(1 + salesGrowthPct, m - 1)
      );
      const newAccFromSales = sales / Math.max(avgCams, 1e-9);
      const newCloud = newAccFromSales * cloudNewShare;
      const compGainTotal = m <= competitorHorizon ? competitorPlan[m - 1] : 0;
      const compGainCamera = compGainTotal * (competitorSplit.camera || 0);
      const compGainBundle = compGainTotal * (competitorSplit.bundle || 0);
      const compGainSmh = compGainTotal * (competitorSplit.smarthome || 0);

      // pools evolution (for info)
      cameraPool = Math.round(
        cameraPool * (1 - churn) + newAccFromSales + compGainCamera
      );
      smhPool = Math.round(smhPool * (1 + smhGrowth) + compGainSmh);
      const prevBundlePool = bundlePool;
      bundlePool = Math.round(bundlePool * (1 + bundleGrowth) + compGainBundle);

      // allocations for new in month
      const newByTariff: Record<string, number> = {};
      const allocCam = distributeByAdoption(
        newCloud + compGainCamera,
        "camera",
        tariffs
      );
      for (const k in allocCam)
        newByTariff[k] = (newByTariff[k] || 0) + allocCam[k];

      const prevSmhPool = Math.round(
        smhPool / (1 + smhGrowth) - compGainSmh / (1 + smhGrowth)
      ); // approx previous before growth
      const smhDelta = Math.max(0, smhPool - prevSmhPool);
      const allocSmh = distributeByAdoption(smhDelta, "smarthome", tariffs);
      for (const k in allocSmh)
        newByTariff[k] = (newByTariff[k] || 0) + allocSmh[k];

      const bundleDelta = Math.max(0, bundlePool - prevBundlePool);
      const allocBundle = distributeByAdoption(bundleDelta, "bundle", tariffs);
      for (const k in allocBundle)
        newByTariff[k] = (newByTariff[k] || 0) + allocBundle[k];

      // upgrades/downgrades and churn
      const nextActiveByTariff: Record<string, number> = { ...activeByTariff };
      const upIn: Record<string, number> = {};
      const downIn: Record<string, number> = {};

      for (const t of tariffs) {
        const id = t.id;
        const base = activeByTariff[id] || 0;
        const upOut = t.forecast?.upgradeTo
          ? base * (t.forecast?.upgradeRate || 0)
          : 0;
        const downOut = t.forecast?.downgradeTo
          ? base * (t.forecast?.downgradeRate || 0)
          : 0;
        if (t.forecast?.upgradeTo)
          upIn[t.forecast.upgradeTo] =
            (upIn[t.forecast.upgradeTo] || 0) + upOut;
        if (t.forecast?.downgradeTo)
          downIn[t.forecast.downgradeTo] =
            (downIn[t.forecast.downgradeTo] || 0) + downOut;
        const churnRate = t.forecast?.churn || 0;
        const churnOut = base * churnRate;
        nextActiveByTariff[id] = Math.max(
          0,
          Math.round(base - upOut - downOut - churnOut + (newByTariff[id] || 0))
        );
      }
      for (const id in upIn)
        nextActiveByTariff[id] = Math.round(
          (nextActiveByTariff[id] || 0) + upIn[id]
        );
      for (const id in downIn)
        nextActiveByTariff[id] = Math.round(
          (nextActiveByTariff[id] || 0) + downIn[id]
        );

      // economics per tariff
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

        // storage/cdn if archive
        const archiveDays = t.archiveDays || 0;
        const includedCams = t.includedCams || 1;
        const gbCapPerCam = t.gbCapPerCam || 0;
        const overageRUBperGB = t.overageRUBperGB || 0;

        const vc = t.varCost || {};
        const vcStorage = vc.yandexStorageRUBpGBm ?? ycStorageRUBpGBm;
        const vcCDN = vc.yandexCDNRUBpGB ?? ycCDNRUBpGB;
        const vcCdnRatio = vc.cdnRatio ?? cdnRatio;
        const vcGbDay = vc.avgGbPerDayMotion ?? gbPerDay; // используем текущий gbPerDay
        const vcRelayUSD = vc.tuyaRelayUSDpGB ?? tuyaRelayUSD;
        const vcApiUSD = vc.tuyaAPIperMLNUSD ?? tuyaApiUSD;
        const vcMsgUSD = vc.tuyaMsgsperMLNUSD ?? tuyaMsgUSD;

        let yandexCost = 0;
        let overageRev = 0;
        if (archiveDays > 0) {
          const factPerCamGB = vcGbDay * archiveDays;
          const billPerCamGB = Math.min(
            factPerCamGB,
            gbCapPerCam || factPerCamGB
          );
          const storageGB = billPerCamGB * includedCams;
          const cdnGB = storageGB * vcCdnRatio;
          yandexCost = act * (storageGB * vcStorage + cdnGB * vcCDN);
          if (
            overageRUBperGB > 0 &&
            gbCapPerCam &&
            factPerCamGB > gbCapPerCam
          ) {
            const overGB = (factPerCamGB - gbCapPerCam) * includedCams;
            overageRev = act * overGB * overageRUBperGB;
          }
        }

        // Tuya approximate variable cost per account (с учётом мультипликаторов и отключения для free)
        const apiCallsPerAcc = apiPerDay * monthDays; // от глобалей (приближение)
        const msgsPerAcc = 10 * monthDays;
        const relayGBPerAcc = camHoursPerDayForRelay * 0.72 * monthDays; // 0.72 GB/h
        const wTariff = (t.price || 0) > 0 ? 1 : freeLoadShare;
        const apiMul = (t.varCost?.tuyaApiMul ?? 1) * wTariff;
        const msgsMul = (t.varCost?.tuyaMsgsMul ?? 1) * wTariff;
        const relayMul = (t.varCost?.tuyaRelayMul ?? 1) * wTariff;
        const tuyaCostPerAcc =
          Math.max(0, (apiCallsPerAcc - 1_000_000) / 1_000_000) *
            vcApiUSD *
            fx *
            apiMul +
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

      // summary
      const activeByFamily = { camera: 0, smarthome: 0, bundle: 0 } as {
        camera: number;
        smarthome: number;
        bundle: number;
      };
      for (const t of tariffs) {
        const fam = t.family;
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

      // move to next state
      for (const k in nextActiveByTariff)
        activeByTariff[k] = nextActiveByTariff[k];
    }

    return { rows };
  }, [
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
    tariffs,
    // cost params
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
  ]);

  const [detailMonth, setDetailMonth] = useState<number | null>(null);

  // breakeven from new tariff forecast (now that tariffForecast is defined)
  const breakevenMonth = useMemo(
    () => tariffForecast.rows.find((r) => r.cumProfit > 0)?.month ?? null,
    [tariffForecast]
  );

  // ---------------- UI ----------------
  const [tab, setTab] = useState("calc");

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
                    onChange={(e) => setCompetitorMode(e.target.value)}
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
