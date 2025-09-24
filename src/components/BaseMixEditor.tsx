import { useState } from "react";
import { inputCls } from "../ui/styles";

export default function BaseMixEditor({
  tariffs,
  setTariffs,
}: {
  tariffs: any[];
  setTariffs: (t: any[]) => void;
}) {
  const [mode, setMode] = useState<"paid" | "free">("paid");
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
    const list = tariffs.filter(
      (t: any) => t.family === fam && (mode === "paid" ? (t.price || 0) > 0 : (t.price || 0) === 0)
    );
    const sum = list.reduce(
      (s: number, t: any) => s + (t.forecast?.baseShare0 || 0),
      0
    );
    if (sum <= 0) return;
    setTariffs(
      tariffs.map((t: any) =>
        t.family === fam && list.some((x: any) => x.id === t.id)
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
    const list = tariffs.filter(
      (t: any) => t.family === fam && (mode === "paid" ? (t.price || 0) > 0 : (t.price || 0) === 0)
    );
    const w = list.length ? 1 / list.length : 0;
    setTariffs(
      tariffs.map((t: any) =>
        t.family === fam && list.some((x: any) => x.id === t.id)
          ? { ...t, forecast: { ...(t.forecast || {}), baseShare0: w } }
          : t
      )
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="text-sm font-medium">Группа тарифов:</div>
        <div className="bg-white rounded-xl border border-gray-200 p-1">
          <button
            className={`px-3 py-1 rounded-lg text-sm ${
              mode === "paid" ? "bg-indigo-600 text-white" : "hover:bg-gray-100"
            }`}
            onClick={() => setMode("paid")}
          >
            Платные
          </button>
          <button
            className={`px-3 py-1 rounded-lg text-sm ${
              mode === "free" ? "bg-indigo-600 text-white" : "hover:bg-gray-100"
            }`}
            onClick={() => setMode("free")}
          >
            Бесплатные
          </button>
        </div>
        <div className="text-xs text-gray-600">В этой группе сумма долей по семейству должна быть 1 — если что, помогу выровнять.</div>
      </div>
      {families.map((f) => {
        const list = tariffs.filter(
          (t: any) => t.family === f.key && (mode === "paid" ? (t.price || 0) > 0 : (t.price || 0) === 0)
        );
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
              <div className="font-semibold">{f.title} — {mode === "paid" ? "платные" : "бесплатные"}</div>
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
              <div className="flex-1" />
              <button
                className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs"
                onClick={() => normalizeFamily(f.key)}
              >
                Выровнять
              </button>
              <button
                className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs"
                onClick={() => evenFamily(f.key)}
              >
                Поровну
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {list.map((t: any) => (
                <div
                  key={t.id}
                  className="bg-white rounded-xl border border-gray-200 p-3"
                >
                  <div className="text-sm font-medium mb-1">{t.name}</div>
                  <div className="flex items-center gap-2">
                    <input
                      className={inputCls}
                      type="number"
                      step={0.001}
                      value={t.forecast?.baseShare0 ?? ""}
                      onChange={(e) =>
                        updateShare(t.id, Number(e.target.value))
                      }
                    />
                    <div className="text-xs text-gray-500">доля</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
