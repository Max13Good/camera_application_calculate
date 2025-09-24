import { useState, useRef, useEffect } from "react";

export default function Help({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  return (
    <span className="relative inline-flex items-center">
      <button
        ref={ref}
        type="button"
        className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-[10px] font-semibold cursor-help select-none"
        aria-label="Подсказка"
        title={text}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((s) => !s);
        }}
      >
        ?
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute z-50 top-5 left-0 max-w-xs whitespace-normal rounded-md bg-gray-800 text-white text-[11px] leading-snug px-2 py-1 shadow-lg"
        >
          {text}
        </span>
      )}
    </span>
  );
}
