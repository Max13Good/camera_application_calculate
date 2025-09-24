import { useState } from "react";
import Help from "./Help";
import Num from "./Num";
import { inputCls } from "../ui/styles";

export default function TariffsEditor({
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
          Сбросить к пресету
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
            placeholder="Вставь сюда JSON тарифов — и поехали"
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

                  {open[t.id] && (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <label>Включено камер</label>
                      <input
                        className={inputCls}
                        type="number"
                        value={t.includedCams ?? ""}
                        onChange={(e) =>
                          updateTariff(t.id, {
                            includedCams: Number(e.target.value),
                          })
                        }
                      />
                      <label>
                        Архив, дней
                        <Help text="На сколько дней хочешь хранить записи в архиве." />
                      </label>
                      <input
                        className={inputCls}
                        type="number"
                        value={t.archiveDays ?? ""}
                        onChange={(e) =>
                          updateTariff(t.id, {
                            archiveDays: Number(e.target.value),
                          })
                        }
                      />
                      <label>
                        GB cap/камера
                        <Help text="Лимит объёма на камеру за период. Всё, что сверху — как перерасход." />
                      </label>
                      <input
                        className={inputCls}
                        type="number"
                        value={t.gbCapPerCam ?? ""}
                        onChange={(e) =>
                          updateTariff(t.id, {
                            gbCapPerCam: Number(e.target.value),
                          })
                        }
                      />
                      <label>
                        Оverage ₽/ГБ
                        <Help text="Сколько берём за перерасход (факт минус лимит) — ₽ за каждый ГБ." />
                      </label>
                      <input
                        className={inputCls}
                        type="number"
                        value={t.overageRUBperGB ?? ""}
                        onChange={(e) =>
                          updateTariff(t.id, {
                            overageRUBperGB: Number(e.target.value),
                          })
                        }
                      />

                      <div className="col-span-2 font-medium mt-2">
                        Тарифы за единицу (RUB/USD)
                      </div>
                      <label>
                        Yandex Storage ₽/ГБ·мес
                        <Help text="Сколько платим за хранение за ГБ‑месяц. Можешь задать прямо для этого тарифа." />
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
                        Yandex CDN ₽/ГБ
                        <Help text="Цена CDN за каждый ГБ скачиваний. Если не знаешь — оставь базовое." />
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
                        ГБ/день/камера (Motion)
                        <Help text="Сколько в среднем пишет камера в день при записи по событиям." />
                      </label>
                      <input
                        className={inputCls}
                        type="number"
                        step={0.01}
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
                        cdnRatio <Help text="Доля скачиваний из CDN (0..1). Чем больше — тем дороже CDN, но быстрее пользователю." />
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

                      <div className="col-span-2 font-medium mt-2">
                        Мультипликаторы (× к базовым)
                      </div>

                      <label>Yandex Storage ×</label>
                      <input
                        className={inputCls}
                        type="number"
                        step={0.01}
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
                        CDN × <Help text="Во сколько раз хотим умножить базовую цену CDN именно для этого тарифа." />
                      </label>
                      <input
                        className={inputCls}
                        type="number"
                        step={0.01}
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
                        Motion GB ×
                        <Help text="Насколько умножаем средний объём/день/камера (если тариф активнее/спокойнее среднего)." />
                      </label>
                      <input
                        className={inputCls}
                        type="number"
                        step={0.01}
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
                        cdnRatio ×
                        <Help text="Подправь долю CDN именно для этого тарифа, если нужно." />
                      </label>
                      <input
                        className={inputCls}
                        type="number"
                        step={0.01}
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
                      <label>Tuya API ×</label>
                      <input
                        className={inputCls}
                        type="number"
                        step={0.01}
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
                      <label>Tuya Msgs ×</label>
                      <input
                        className={inputCls}
                        type="number"
                        step={0.01}
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
                      <label>Tuya Relay ×</label>
                      <input
                        className={inputCls}
                        type="number"
                        step={0.01}
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

                      <div className="col-span-2 font-medium mt-2">
                        Прогноз/маркетинг
                      </div>
                      <label>Base share (t=0)</label>
                      <input
                        className={inputCls}
                        type="number"
                        step={0.001}
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
                        Adoption new
                        <Help text="Какую долю новых пользователей заберёт этот тариф внутри семейства (0..1)." />
                      </label>
                      <input
                        className={inputCls}
                        type="number"
                        step={0.001}
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
                      <label>Churn (отток/мес)</label>
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
                      <label>upgradeTo</label>
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
                        upgradeRate <Help text="Какая доля в среднем апгрейдится за месяц (0..1)." />
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
                      <label>downgradeTo</label>
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
                        downgradeRate <Help text="Какая доля уходит на тариф попроще за месяц (0..1)." />
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
