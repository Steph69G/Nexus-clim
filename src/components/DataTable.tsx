import React from "react";

export default function DataTable({
  columns,
  rows,
  renderCell,
}: {
  columns: { key: string; label: string }[];
  rows: Record<string, any>[];
  renderCell?: (colKey: string, value: any, row: any) => React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            {columns.map(c=>(
              <th key={c.key} className="text-left font-medium px-3 py-2 border-b">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx)=>(
            <tr key={r.id ?? idx} className="odd:bg-white even:bg-gray-50">
              {columns.map(c=>(
                <td key={c.key} className="px-3 py-2 border-b align-middle">
                  {renderCell ? renderCell(c.key, r[c.key], r) : String(r[c.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td className="px-3 py-6 text-center text-gray-500" colSpan={columns.length}>
              Aucune donnée
            </td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
