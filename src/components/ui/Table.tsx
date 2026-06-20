import * as React from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TableColumn<T = any> {
  key: string;
  title: React.ReactNode;
  width?: string;
  render?: (row: T) => React.ReactNode;
}

export interface TableProps<T = any> {
  columns: TableColumn<T>[];
  data: T[];
  striped?: boolean;
  emptyText?: string;
  className?: string;
  rowKey?: string | ((row: T) => string);
}

export function Table<T extends Record<string, any>>({
  columns,
  data,
  striped = true,
  emptyText = "暂无数据",
  className,
  rowKey = "id",
}: TableProps<T>) {
  const getRowKey = (row: T, index: number): string => {
    if (typeof rowKey === "function") {
      return rowKey(row);
    }
    return String(row[rowKey] ?? index);
  };

  return (
    <div className={cn("w-full overflow-auto bg-white rounded-lg border border-slate-200", className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left font-medium text-slate-600"
                style={{ width: col.width }}
              >
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-16">
                <div className="flex flex-col items-center justify-center text-slate-400">
                  <Inbox className="h-12 w-12 mb-3 text-slate-300" />
                  <p className="text-sm">{emptyText}</p>
                </div>
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr
                key={getRowKey(row, index)}
                className={cn(
                  "border-b border-slate-100 last:border-b-0 transition-colors hover:bg-slate-50",
                  striped && index % 2 === 1 && "bg-slate-50/50"
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="px-4 py-3 text-slate-700 align-middle"
                    style={{ width: col.width }}
                  >
                    {col.render ? col.render(row) : String(row[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
