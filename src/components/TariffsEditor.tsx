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
                        <Help text="Сколько дней хранится запись в архиве" />
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
                        <Help text="Жёсткий cap объёма хранения на камеру за период" />
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
                        <Help text="Стоимость перерасхода (факт − лимит), ₽/ГБ" />
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
                        <Help text="Цена хранения на ГБ-месяц для тарифа" />
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
                        ГБ/день/камера (Motion)
                        <Help text="Средний объём/день/камера в Motion‑режиме" />
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
                        CDN × <Help text="Множитель к цене Yandex CDN (по тарифу)" />
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
                        <Help text="Множитель к среднему объёму/день/камера" />
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
                        <Help text="Множитель к доле CDN для тарифа" />
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
                        <Help text="Доля новых покупателей в сегменте (0..1)" />
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
                        upgradeRate <Help text="Доля, апгрейдящаяся в месяц (0..1)" />
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
                        downgradeRate <Help text="Доля, даунгрейдящаяся в месяц (0..1)" />
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
