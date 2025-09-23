import React from "react";

export default function Section({
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

