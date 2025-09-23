export default function Help({ text }: { text: string }) {
  return (
    <span
      className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-[10px] font-semibold cursor-help"
      title={text}
    >
      ?
    </span>
  );
}
