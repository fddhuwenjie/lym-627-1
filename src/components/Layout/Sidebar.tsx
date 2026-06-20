import * as React from "react";
import { NavLink } from "react-router-dom";
import {
  CalendarDays,
  Calendar,
  ArrowLeftRight,
  FileBarChart,
  Settings,
  Store,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";

interface MenuItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

const menuItems: MenuItem[] = [
  {
    to: "/",
    label: "门店日历",
    icon: <CalendarDays className="h-5 w-5" />,
  },
  {
    to: "/my-schedule",
    label: "个人班表",
    icon: <Calendar className="h-5 w-5" />,
  },
  {
    to: "/shift-swaps",
    label: "待确认换班",
    icon: <ArrowLeftRight className="h-5 w-5" />,
    badge: "3",
  },
  {
    to: "/reports",
    label: "工时导出",
    icon: <FileBarChart className="h-5 w-5" />,
  },
  {
    to: "/settings",
    label: "系统配置",
    icon: <Settings className="h-5 w-5" />,
  },
];

const roleOptions = [
  { value: "manager", label: "门店经理" },
  { value: "supervisor", label: "主管" },
  { value: "staff", label: "普通员工" },
];

export const Sidebar: React.FC = () => {
  const [currentRole, setCurrentRole] = React.useState("manager");

  return (
    <aside className="w-60 flex-shrink-0 h-screen bg-white border-r border-slate-200 flex flex-col">
      <div className="flex items-center gap-2 px-5 h-16 border-b border-slate-100">
        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
          <Store className="h-5 w-5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-slate-900 leading-tight">
            排班系统
          </span>
          <span className="text-xs text-slate-400 leading-tight">
            Shift Manager
          </span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-auto scrollbar-thin">
        {menuItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )
            }
          >
            {item.icon}
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <Badge variant="danger" className="h-5 min-w-[20px] px-1.5 text-[10px]">
                {item.badge}
              </Badge>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-100 p-4">
        <div className="mb-3">
          <label className="block text-xs text-slate-400 mb-1.5">演示角色</label>
          <Select
            value={currentRole}
            onChange={setCurrentRole}
            options={roleOptions}
          />
        </div>
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-sm font-medium">
            张
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">
              张明远
            </p>
            <p className="text-xs text-slate-400 truncate">
              {roleOptions.find((r) => r.value === currentRole)?.label}
            </p>
          </div>
          <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
        </div>
      </div>
    </aside>
  );
};
