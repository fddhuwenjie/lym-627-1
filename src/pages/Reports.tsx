import { useState, useMemo, useRef, useEffect } from 'react';
import {
  FileDown,
  Download,
  AlertCircle,
  Store,
  Users,
  Briefcase,
  ChevronUp,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import {
  useStores,
  usePositions,
  useEmployees,
  useShifts,
  useAbsences,
  useExportRecords,
  useCurrentUser,
  getStoreActions,
} from '@/store/hooks';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import type { TableColumn } from '@/components/ui/Table';
import { Table } from '@/components/ui/Table';
import { generateHoursReportCSV, downloadCSV } from '@/utils/csvExport';
import { calculateHours, getWeekDates, formatDate } from '@/utils/dateUtils';
import { cn } from '@/lib/utils';
import type { ScheduleShift, ExportRecord } from '@/types';
import { toast } from '@/components/ui/Toast';

const ANOMALY_LABELS: Record<string, string> = {
  qualification_mismatch: '资质不匹配',
  hours_over_limit: '工时超限',
  cross_store_conflict: '跨店冲突',
  unavailable_time: '不可用时间',
  settled_modification: '结算后修改',
};

const EXPORT_TYPE_LABELS: Record<string, string> = {
  schedule: '排班表',
  settlement: '结算表',
  swap: '换班记录',
  weekly_hours: '周工时',
  anomaly_report: '异常报告',
};

type SortKey =
  | 'store'
  | 'employee'
  | 'position'
  | 'date'
  | 'hours'
  | null;

type SortOrder = 'asc' | 'desc';

export default function Reports() {
  const stores = useStores();
  const positions = usePositions();
  const employees = useEmployees();
  const absences = useAbsences();
  const exportRecords = useExportRecords();
  const currentUser = useCurrentUser();
  const { addExportRecord, updateShift } = getStoreActions();

  const [activeTab, setActiveTab] = useState<string>('details');
  const [startDate, setStartDate] = useState<string>(() => formatDate(getWeekDates()[0]));
  const [endDate, setEndDate] = useState<string>(() => formatDate(getWeekDates()[6]));
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
  const [selectedPositionId, setSelectedPositionId] = useState<string>('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [editingShift, setEditingShift] = useState<ScheduleShift | null>(null);
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);
  const storeDropdownRef = useRef<HTMLDivElement>(null);

  const allShifts = useShifts();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        storeDropdownRef.current &&
        !storeDropdownRef.current.contains(e.target as Node)
      ) {
        setStoreDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredShifts = useMemo(() => {
    let result = [...allShifts];

    if (startDate) {
      result = result.filter((s) => s.date >= startDate);
    }
    if (endDate) {
      result = result.filter((s) => s.date <= endDate);
    }
    if (selectedStoreIds.length > 0) {
      result = result.filter((s) => selectedStoreIds.includes(s.storeId));
    }
    if (selectedPositionId) {
      result = result.filter((s) => s.positionId === selectedPositionId);
    }
    if (selectedEmployeeId) {
      result = result.filter((s) => s.employeeId === selectedEmployeeId);
    }

    if (sortKey) {
      result.sort((a, b) => {
        let aVal = '';
        let bVal = '';
        switch (sortKey) {
          case 'store':
            aVal = stores.find((s) => s.id === a.storeId)?.name || '';
            bVal = stores.find((s) => s.id === b.storeId)?.name || '';
            break;
          case 'employee':
            aVal = employees.find((e) => e.id === a.employeeId)?.name || '';
            bVal = employees.find((e) => e.id === b.employeeId)?.name || '';
            break;
          case 'position':
            aVal = positions.find((p) => p.id === a.positionId)?.name || '';
            bVal = positions.find((p) => p.id === b.positionId)?.name || '';
            break;
          case 'date':
            aVal = a.date;
            bVal = b.date;
            break;
          case 'hours': {
            const aH = calculateHours(a.startTime, a.endTime);
            const bH = calculateHours(b.startTime, b.endTime);
            return sortOrder === 'asc' ? aH - bH : bH - aH;
          }
        }
        if (sortOrder === 'asc') {
          return aVal.localeCompare(bVal, 'zh-CN');
        }
        return bVal.localeCompare(aVal, 'zh-CN');
      });
    }

    return result;
  }, [
    allShifts,
    startDate,
    endDate,
    selectedStoreIds,
    selectedPositionId,
    selectedEmployeeId,
    sortKey,
    sortOrder,
    stores,
    employees,
    positions,
  ]);

  const anomalousShifts = useMemo(
    () => filteredShifts.filter((s) => s.anomalies.length > 0),
    [filteredShifts]
  );

  const stats = useMemo(() => {
    const weekDates = getWeekDates();
    const weekStart = formatDate(weekDates[0]);
    const weekEnd = formatDate(weekDates[6]);

    const weekShifts = allShifts.filter(
      (s) => s.date >= weekStart && s.date <= weekEnd
    );

    const totalHours = weekShifts.reduce(
      (sum, s) => sum + calculateHours(s.startTime, s.endTime),
      0
    );

    const anomalyCount = weekShifts.filter(
      (s) => s.anomalies.length > 0
    ).length;

    const absenceCount = absences.length;

    const settledCount = allShifts.filter((s) => s.isSettled).length;

    return {
      totalHours: totalHours.toFixed(1),
      anomalyCount,
      absenceCount,
      settledCount,
    };
  }, [allShifts, absences]);

  const totalHoursSum = useMemo(
    () =>
      filteredShifts.reduce(
        (sum, s) => sum + calculateHours(s.startTime, s.endTime),
        0
      ),
    [filteredShifts]
  );

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const handleToggleStore = (storeId: string) => {
    setSelectedStoreIds((prev) =>
      prev.includes(storeId)
        ? prev.filter((id) => id !== storeId)
        : [...prev, storeId]
    );
  };

  const handleSelectAllStores = () => {
    if (selectedStoreIds.length === stores.length) {
      setSelectedStoreIds([]);
    } else {
      setSelectedStoreIds(stores.map((s) => s.id));
    }
  };

  const handleExportCSV = () => {
    if (filteredShifts.length === 0) {
      toast.warning('没有可导出的数据');
      return;
    }

    const csv = generateHoursReportCSV(
      filteredShifts,
      stores,
      positions,
      employees
    );
    const fileName = `工时报表_${startDate}_${endDate}.csv`;
    downloadCSV(csv, fileName);

    addExportRecord({
      type: 'weekly_hours',
      startDate,
      endDate,
      exportedBy: currentUser?.id,
      fileName,
      rowCount: filteredShifts.length,
    });

    toast.success('导出成功');
  };

  const handleRedownload = (record: ExportRecord) => {
    const shiftsInRange = allShifts.filter(
      (s) => s.date >= record.startDate && s.date <= record.endDate
    );
    const csv = generateHoursReportCSV(
      shiftsInRange,
      stores,
      positions,
      employees
    );
    downloadCSV(csv, record.fileName || '工时报表.csv');
  };

  const handleEditShift = (shift: ScheduleShift) => {
    setEditingShift(shift);
    setEditStartTime(shift.startTime);
    setEditEndTime(shift.endTime);
  };

  const handleSaveEdit = () => {
    if (!editingShift) return;
    if (!editStartTime || !editEndTime) {
      toast.error('请填写完整的时间');
      return;
    }
    const result = updateShift(editingShift.id, {
      startTime: editStartTime,
      endTime: editEndTime,
    });
    if (result.success) {
      setEditingShift(null);
    }
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) {
      return <ChevronUp className="h-3 w-3 text-slate-300" />;
    }
    return sortOrder === 'asc' ? (
      <ChevronUp className="h-3 w-3 text-brand-500" />
    ) : (
      <ChevronDown className="h-3 w-3 text-brand-500" />
    );
  };

  const shiftColumns: TableColumn<ScheduleShift>[] = [
    {
      key: 'store',
      title: (
        <button
          type="button"
          onClick={() => handleSort('store')}
          className="flex items-center gap-1 hover:text-slate-900"
        >
          门店
          {renderSortIcon('store')}
        </button>
      ),
      render: (row) => (
        <span className={row.anomalies.length > 0 || row.isAbsent ? 'anomaly-marker' : ''}>
          {stores.find((s) => s.id === row.storeId)?.name || '-'}
        </span>
      ),
    },
    {
      key: 'employee',
      title: (
        <button
          type="button"
          onClick={() => handleSort('employee')}
          className="flex items-center gap-1 hover:text-slate-900"
        >
          员工
          {renderSortIcon('employee')}
        </button>
      ),
      render: (row) => employees.find((e) => e.id === row.employeeId)?.name || '-',
    },
    {
      key: 'position',
      title: (
        <button
          type="button"
          onClick={() => handleSort('position')}
          className="flex items-center gap-1 hover:text-slate-900"
        >
          岗位
          {renderSortIcon('position')}
        </button>
      ),
      render: (row) => positions.find((p) => p.id === row.positionId)?.name || '-',
    },
    {
      key: 'date',
      title: (
        <button
          type="button"
          onClick={() => handleSort('date')}
          className="flex items-center gap-1 hover:text-slate-900"
        >
          日期
          {renderSortIcon('date')}
        </button>
      ),
    },
    {
      key: 'timeSlot',
      title: '上班时段',
      render: (row) => `${row.startTime} ~ ${row.endTime}`,
    },
    {
      key: 'hours',
      title: (
        <button
          type="button"
          onClick={() => handleSort('hours')}
          className="flex items-center gap-1 hover:text-slate-900"
        >
          工时(h)
          {renderSortIcon('hours')}
        </button>
      ),
      render: (row) => calculateHours(row.startTime, row.endTime).toFixed(1),
    },
    {
      key: 'anomalies',
      title: '异常标注',
      render: (row) =>
        row.anomalies.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {row.anomalies.map((a) => (
              <Badge key={a} variant="danger" className="anomaly-badge">
                {ANOMALY_LABELS[a] || a}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-slate-400">-</span>
        ),
    },
    {
      key: 'absent',
      title: '缺勤',
      render: (row) =>
        row.isAbsent ? <Badge variant="danger">缺勤</Badge> : <span className="text-slate-400">-</span>,
    },
    {
      key: 'settled',
      title: '结算状态',
      render: (row) =>
        row.isSettled ? (
          <Badge variant="settled">已锁定</Badge>
        ) : (
          <Badge variant="neutral">未结算</Badge>
        ),
    },
  ];

  const anomalyColumns: TableColumn<ScheduleShift>[] = [
    { key: 'date', title: '日期' },
    {
      key: 'store',
      title: '门店',
      render: (row) => stores.find((s) => s.id === row.storeId)?.name || '-',
    },
    {
      key: 'employee',
      title: '员工',
      render: (row) => employees.find((e) => e.id === row.employeeId)?.name || '-',
    },
    {
      key: 'position',
      title: '岗位',
      render: (row) => positions.find((p) => p.id === row.positionId)?.name || '-',
    },
    {
      key: 'timeSlot',
      title: '时段',
      render: (row) => `${row.startTime} ~ ${row.endTime}`,
    },
    {
      key: 'anomalies',
      title: '异常原因',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.anomalies.map((a) => (
            <Badge key={a} variant="danger">
              {ANOMALY_LABELS[a] || a}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'action',
      title: '操作',
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleEditShift(row)}
        >
          编辑
        </Button>
      ),
    },
  ];

  const exportColumns: TableColumn<ExportRecord>[] = [
    { key: 'fileName', title: '文件名' },
    {
      key: 'type',
      title: '类型',
      render: (row) => EXPORT_TYPE_LABELS[row.type] || row.type,
    },
    {
      key: 'exportedAt',
      title: '导出时间',
      render: (row) => row.exportedAt ? new Date(row.exportedAt).toLocaleString('zh-CN') : '-',
    },
    {
      key: 'exportedBy',
      title: '导出人',
      render: (row) =>
        row.exportedBy
          ? employees.find((e) => e.id === row.exportedBy)?.name || '-'
          : '-',
    },
    { key: 'rowCount', title: '数据条数' },
    {
      key: 'action',
      title: '操作',
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleRedownload(row)}
        >
          <Download className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const storeDisplayText = selectedStoreIds.length === 0
    ? '全部门店'
    : selectedStoreIds.length === stores.length
    ? '全部门店'
    : `已选${selectedStoreIds.length}家`;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">工时统计与导出</h1>
        <Button onClick={handleExportCSV}>
          <FileDown className="h-4 w-4" />
          导出CSV报表
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-brand-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">本周总工时</p>
              <p className="text-2xl font-semibold text-slate-900 mt-0.5">
                {stats.totalHours}
                <span className="text-sm font-normal text-slate-400 ml-1">h</span>
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setActiveTab('anomalies')}
          className="bg-white rounded-xl border border-slate-200 p-5 text-left hover:border-brand-300 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">异常班次数量</p>
              <p className="text-2xl font-semibold text-slate-900 mt-0.5">
                {stats.anomalyCount}
                <span className="text-sm font-normal text-slate-400 ml-1">条</span>
              </p>
            </div>
          </div>
        </button>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Users className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">缺勤人次</p>
              <p className="text-2xl font-semibold text-slate-900 mt-0.5">
                {stats.absenceCount}
                <span className="text-sm font-normal text-slate-400 ml-1">次</span>
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Store className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">已结算周期数</p>
              <p className="text-2xl font-semibold text-slate-900 mt-0.5">
                {stats.settledCount}
                <span className="text-sm font-normal text-slate-400 ml-1">条</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              开始日期
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full h-10 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              结束日期
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full h-10 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
          <div ref={storeDropdownRef}>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              门店
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setStoreDropdownOpen((prev) => !prev)}
                className="flex items-center justify-between w-full h-10 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 hover:border-slate-300"
              >
                <span className="truncate text-slate-700">{storeDisplayText}</span>
                <ChevronRight
                  className={cn(
                    'h-4 w-4 text-slate-400 transition-transform',
                    storeDropdownOpen && 'rotate-90'
                  )}
                />
              </button>
              {storeDropdownOpen && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 py-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                  <button
                    type="button"
                    onClick={handleSelectAllStores}
                    className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    {selectedStoreIds.length === stores.length ? '取消全选' : '全选'}
                  </button>
                  <div className="h-px bg-slate-100 my-0.5" />
                  {stores.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleToggleStore(s.id)}
                      className={cn(
                        'w-full px-3 py-2 text-left text-sm transition-colors flex items-center gap-2',
                        selectedStoreIds.includes(s.id)
                          ? 'bg-brand-50 text-brand-700'
                          : 'text-slate-700 hover:bg-slate-50'
                      )}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              岗位
            </label>
            <Select
              options={[
                { value: '', label: '全部岗位' },
                ...positions.map((p) => ({ value: p.id, label: p.name })),
              ]}
              value={selectedPositionId}
              onChange={setSelectedPositionId}
              placeholder="全部岗位"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              员工
            </label>
            <Select
              options={[
                { value: '', label: '全部员工' },
                ...employees.map((e) => ({ value: e.id, label: e.name })),
              ]}
              value={selectedEmployeeId}
              onChange={setSelectedEmployeeId}
              placeholder="全部员工"
            />
          </div>
        </div>
      </div>

      <Tabs
        tabs={[
          { key: 'details', label: '工时明细', count: filteredShifts.length },
          { key: 'anomalies', label: '异常班次', count: anomalousShifts.length },
          { key: 'history', label: '导出历史', count: exportRecords.length },
        ]}
        activeKey={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === 'details' && (
        <div className="space-y-0">
          <div className={cn(
            'w-full overflow-auto bg-white rounded-lg border border-slate-200',
            'report-table-wrapper'
          )}>
            <style>{`
              .report-table-wrapper tr:has(.anomaly-marker),
              .report-table-wrapper tr:has(.anomaly-badge) {
                background-color: #fef2f2 !important;
                box-shadow: inset 2px 0 0 0 #ef4444, inset -2px 0 0 0 #ef4444;
              }
              .report-table-wrapper tr:has(.anomaly-marker) td:first-child,
              .report-table-wrapper tr:has(.anomaly-badge) td:first-child {
                box-shadow: inset 0 2px 0 0 #ef4444;
              }
              .report-table-wrapper tr:has(.anomaly-marker) td:last-child,
              .report-table-wrapper tr:has(.anomaly-badge) td:last-child {
                box-shadow: inset 0 -2px 0 0 #ef4444;
              }
            `}</style>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {shiftColumns.map((col) => (
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
                {filteredShifts.length === 0 ? (
                  <tr>
                    <td colSpan={shiftColumns.length} className="px-4 py-16">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <Briefcase className="h-12 w-12 mb-3 text-slate-300" />
                        <p className="text-sm">暂无数据</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredShifts.map((row, index) => (
                    <tr
                      key={row.id}
                      className={cn(
                        'border-b border-slate-100 last:border-b-0 transition-colors hover:bg-slate-50',
                        index % 2 === 1 && 'bg-slate-50/50'
                      )}
                    >
                      {shiftColumns.map((col) => (
                        <td
                          key={col.key}
                          className="px-4 py-3 text-slate-700 align-middle"
                          style={{ width: col.width }}
                        >
                          {col.render ? col.render(row) : String(row[col.key as keyof ScheduleShift] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="bg-slate-50 border border-slate-200 border-t-0 rounded-b-lg px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600">合计</span>
            <span className="text-sm font-semibold text-slate-900">
              总工时: {totalHoursSum.toFixed(1)} h
            </span>
          </div>
        </div>
      )}

      {activeTab === 'anomalies' && (
        <Table<ScheduleShift>
          columns={anomalyColumns}
          data={anomalousShifts}
          rowKey="id"
          emptyText="暂无异常班次"
        />
      )}

      {activeTab === 'history' && (
        <Table<ExportRecord>
          columns={exportColumns}
          data={exportRecords}
          rowKey="id"
          emptyText="暂无导出记录"
        />
      )}

      <Modal
        isOpen={!!editingShift}
        onClose={() => setEditingShift(null)}
        title="编辑班次"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditingShift(null)}>
              取消
            </Button>
            <Button onClick={handleSaveEdit}>保存</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                开始时间
              </label>
              <input
                type="time"
                value={editStartTime}
                onChange={(e) => setEditStartTime(e.target.value)}
                className="w-full h-10 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                结束时间
              </label>
              <input
                type="time"
                value={editEndTime}
                onChange={(e) => setEditEndTime(e.target.value)}
                className="w-full h-10 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
