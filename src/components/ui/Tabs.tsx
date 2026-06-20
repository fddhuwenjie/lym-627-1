import * as React from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  key: string;
  label: string;
  count?: number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeKey,
  onChange,
  className,
}) => {
  return (
    <div className={cn("flex items-center gap-1 border-b border-slate-200", className)}>
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={cn(
              "relative px-4 py-2.5 text-sm font-medium transition-colors",
              "flex items-center gap-2",
              isActive
                ? "text-brand-600"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            )}
          >
            <span>{tab.label}</span>
            {typeof tab.count === "number" && (
              <span
                className={cn(
                  "inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-xs font-medium rounded-full",
                  isActive
                    ? "bg-brand-100 text-brand-700"
                    : "bg-slate-100 text-slate-600"
                )}
              >
                {tab.count}
              </span>
            )}
            {isActive && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-brand-500 rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
};
