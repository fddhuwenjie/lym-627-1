import * as React from "react";
import { useLocation } from "react-router-dom";
import {
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Calendar as CalendarIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";

const storeOptions = [
  { value: "store-1", label: "上海南京路店" },
  { value: "store-2", label: "上海陆家嘴店" },
  { value: "store-3", label: "北京王府井店" },
  { value: "store-4", label: "深圳华强北店" },
];

const routeNameMap: Record<string, string> = {
  "/": "门店日历",
  "/my-schedule": "个人班表",
  "/shift-swaps": "待确认换班",
  "/reports": "工时导出",
  "/settings": "系统配置",
};

function getWeekNumber(date: Date): number {
  const target = new Date(date.valueOf());
  const dayNumber = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNumber + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

function getWeekRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  const day = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function formatDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}.${m}.${day}`;
}

export const Header: React.FC = () => {
  const location = useLocation();
  const [currentStore, setCurrentStore] = React.useState("store-1");
  const [weekOffset, setWeekOffset] = React.useState(0);

  const baseDate = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [weekOffset]);

  const weekNumber = getWeekNumber(baseDate);
  const { start, end } = getWeekRange(baseDate);

  const currentPageName =
    routeNameMap[location.pathname] ||
    Object.entries(routeNameMap).find(([path]) =>
      location.pathname.startsWith(path)
    )?.[1] ||
    "首页";

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-400">首页</span>
        <ChevronRight className="h-4 w-4 text-slate-300" />
        <span className="font-medium text-slate-700">{currentPageName}</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="w-52">
          <Select
            value={currentStore}
            onChange={setCurrentStore}
            options={storeOptions}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-full"
            onClick={() => setWeekOffset((o) => o - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg">
            <CalendarIcon className="h-4 w-4 text-brand-500" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-semibold text-slate-800">
                第 {weekNumber} 周
              </span>
              <span className="text-xs text-slate-500">
                {formatDate(start)} - {formatDate(end)}
              </span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 ml-1" />
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-full"
            onClick={() => setWeekOffset((o) => o + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setWeekOffset(0)}
            className="ml-1"
          >
            本周
          </Button>
        </div>
      </div>
    </header>
  );
};
