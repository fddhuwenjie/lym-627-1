import type {
  ScheduleShift,
  Store,
  Position,
  Employee,
} from '../types';
import { calculateHours } from './dateUtils';

const ANOMALY_LABELS: Record<string, string> = {
  qualification_mismatch: '资质不匹配',
  hours_over_limit: '工时超限',
  cross_store_conflict: '跨店冲突',
  unavailable_time: '不可用时间',
  settled_modification: '结算后修改',
};

function escapeCSV(value: string | number | boolean | undefined | null): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateHoursReportCSV(
  shifts: ScheduleShift[],
  stores: Store[],
  positions: Position[],
  employees: Employee[]
): string {
  const headers = [
    '日期',
    '门店',
    '员工',
    '岗位',
    '开始时间',
    '结束时间',
    '工时(小时)',
    '异常',
    '结算状态',
    '是否缺勤',
    '是否借调',
  ];

  const storeMap = new Map(stores.map((s) => [s.id, s]));
  const positionMap = new Map(positions.map((p) => [p.id, p]));
  const employeeMap = new Map(employees.map((e) => [e.id, e]));

  const rows: string[][] = [headers];

  for (const shift of shifts) {
    const store = storeMap.get(shift.storeId);
    const position = positionMap.get(shift.positionId);
    const employee = employeeMap.get(shift.employeeId);
    const hours = calculateHours(shift.startTime, shift.endTime);
    const anomalyLabels = shift.anomalies
      .map((a) => ANOMALY_LABELS[a] || a)
      .join('、');

    rows.push([
      shift.date,
      store?.name || '',
      employee?.name || '',
      position?.name || '',
      shift.startTime,
      shift.endTime,
      hours.toFixed(1),
      anomalyLabels,
      shift.isSettled ? '已锁定' : '未结算',
      shift.isAbsent ? '是' : '否',
      shift.isBorrowed ? '是' : '否',
    ]);
  }

  return rows.map((row) => row.map(escapeCSV).join(',')).join('\n');
}

export function downloadCSV(content: string, filename: string): void {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
