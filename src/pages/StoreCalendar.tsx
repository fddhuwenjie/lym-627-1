import React, { useState, useMemo, useCallback } from 'react';
import {
  Calendar,
  Plus,
  Lock,
  AlertTriangle,
  UserX,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Check,
} from 'lucide-react';
import {
  useShifts,
  useEmployees,
  usePositions,
  useStores,
  useCurrentStore,
  getStoreActions,
  useCurrentUser,
} from '@/store/hooks';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Select, SelectOption } from '@/components/ui/Select';
import { getWeekDates, formatDate, calculateHours } from '@/utils/dateUtils';
import type { ScheduleShift, Employee, Position, Store as StoreType } from '@/types';
import { cn } from '@/lib/utils';

interface TimeSlotConfig {
  name: string;
  startTime: string;
  endTime: string;
}

const TIME_SLOTS: TimeSlotConfig[] = [
  { name: '早班', startTime: '09:00', endTime: '14:00' },
  { name: '中班', startTime: '14:00', endTime: '19:00' },
  { name: '晚班', startTime: '19:00', endTime: '22:00' },
];

const WEEKDAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

const ANOMALY_DISPLAY: Record<string, { label: string; color: string }> = {
  qualification_mismatch: { label: '资质不匹配', color: 'text-red-600' },
  hours_over_limit: { label: '工时超限', color: 'text-red-600' },
  cross_store_conflict: { label: '跨店冲突', color: 'text-red-600' },
  unavailable_time: { label: '不可用时间', color: 'text-amber-600' },
};

interface ShiftEditState {
  isOpen: boolean;
  shift?: ScheduleShift;
  positionId?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
}

interface EmployeeOption {
  value: string;
  label: string;
  employee: Employee;
  errors: string[];
}

function getAnomalyDisplay(anomalyKey: string) {
  return ANOMALY_DISPLAY[anomalyKey] || { label: anomalyKey, color: 'text-red-600' };
}

function formatWeekRange(dates: Date[]): string {
  if (dates.length === 0) return '';
  const start = dates[0];
  const end = dates[dates.length - 1];
  const startStr = `${start.getMonth() + 1}月${start.getDate()}日`;
  const endStr = `${end.getMonth() + 1}月${end.getDate()}日`;
  return `${startStr} - ${endStr}`;
}

export default function StoreCalendar() {
  const currentStore = useCurrentStore();
  const currentStoreId = currentStore?.id || '';
  const stores = useStores();
  const storeActions = getStoreActions();
  const currentUser = useCurrentUser();

  const [weekOffset, setWeekOffset] = useState(0);
  const [shiftEditState, setShiftEditState] = useState<ShiftEditState>({ isOpen: false });
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [absenceReason, setAbsenceReason] = useState<string>('');
  const [showAbsenceForm, setShowAbsenceForm] = useState(false);
  const [settleConfirmOpen, setSettleConfirmOpen] = useState(false);

  const weekDates = useMemo(() => {
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + weekOffset * 7);
    return getWeekDates(baseDate);
  }, [weekOffset]);

  const weekStartStr = useMemo(() => formatDate(weekDates[0]), [weekDates]);
  const weekEndStr = useMemo(() => formatDate(weekDates[weekDates.length - 1]), [weekDates]);

  const positions = usePositions(currentStoreId);
  const employees = useEmployees(currentStoreId);
  const shifts = useShifts(currentStoreId, weekStartStr, weekEndStr);

  const isWeekSettled = useMemo(() => {
    if (shifts.length === 0) return false;
    return shifts.every((s) => s.isSettled);
  }, [shifts]);

  const hasSomeSettled = useMemo(() => {
    return shifts.some((s) => s.isSettled);
  }, [shifts]);

  const shiftMap = useMemo(() => {
    const map = new Map<string, ScheduleShift>();
    for (const shift of shifts) {
      const key = `${shift.date}_${shift.positionId}_${shift.startTime}_${shift.endTime}`;
      map.set(key, shift);
    }
    return map;
  }, [shifts]);

  const storeOptions: SelectOption[] = useMemo(
    () => stores.map((s) => ({ value: s.id, label: s.name })),
    [stores]
  );

  const handleStoreChange = useCallback(
    (storeId: string) => {
      storeActions.setCurrentStoreId(storeId);
    },
    [storeActions]
  );

  const handlePrevWeek = useCallback(() => {
    setWeekOffset((prev) => prev - 1);
  }, []);

  const handleNextWeek = useCallback(() => {
    setWeekOffset((prev) => prev + 1);
  }, []);

  const handleThisWeek = useCallback(() => {
    setWeekOffset(0);
  }, []);

  const handleGenerateSchedule = useCallback(() => {
    if (!currentStoreId) return;
    storeActions.generateWeeklySchedule(currentStoreId, weekStartStr, weekEndStr);
  }, [currentStoreId, weekStartStr, weekEndStr, storeActions]);

  const handleSettleShifts = useCallback(() => {
    if (!currentStoreId) return;
    storeActions.settleShifts(currentStoreId, weekStartStr, weekEndStr);
    setSettleConfirmOpen(false);
  }, [currentStoreId, weekStartStr, weekEndStr, storeActions]);

  const openAddShiftModal = useCallback(
    (positionId: string, date: string, startTime: string, endTime: string) => {
      setShiftEditState({ isOpen: true, positionId, date, startTime, endTime });
      setSelectedEmployeeId('');
      setShowAbsenceForm(false);
      setAbsenceReason('');
    },
    []
  );

  const openEditShiftModal = useCallback((shift: ScheduleShift) => {
    setShiftEditState({ isOpen: true, shift });
    setSelectedEmployeeId(shift.employeeId || '');
    setShowAbsenceForm(false);
    setAbsenceReason('');
  }, []);

  const closeModal = useCallback(() => {
    setShiftEditState({ isOpen: false });
    setSelectedEmployeeId('');
    setShowAbsenceForm(false);
    setAbsenceReason('');
  }, []);

  const employeeOptions: EmployeeOption[] = useMemo(() => {
    if (!shiftEditState.isOpen || !shiftEditState.positionId || !shiftEditState.date) {
      return [];
    }

    const position = positions.find((p) => p.id === shiftEditState.positionId);
    const { startTime, endTime, date } = shiftEditState;

    return employees.map((emp) => {
      const errors: string[] = [];

      if (position) {
        const missingQualifications = (position.requiredQualifications || []).filter(
          (q) => !emp.qualifications.includes(q)
        );
        if (missingQualifications.length > 0) {
          errors.push(`缺少资质: ${missingQualifications.join('、')}`);
        }
      }

      if (date && startTime && endTime) {
        const dayOfWeek = weekDates.findIndex(
          (d) => formatDate(d) === date
        );
        if (dayOfWeek >= 0) {
          const availableSlots = emp.availableTimes?.[dayOfWeek] || [];
          if (availableSlots.length > 0) {
            const isInAvailable = availableSlots.some((slot) => {
              const [slotStart, slotEnd] = slot.split('-');
              const [s1h, s1m] = startTime.split(':').map(Number);
              const [e1h, e1m] = endTime.split(':').map(Number);
              const [s2h, s2m] = slotStart.split(':').map(Number);
              const [e2h, e2m] = slotEnd.split(':').map(Number);
              const start1 = s1h * 60 + s1m;
              const end1 = e1h * 60 + e1m;
              const start2 = s2h * 60 + s2m;
              const end2 = e2h * 60 + e2m;
              return start1 < end2 && start2 < end1;
            });
            if (!isInAvailable) {
              errors.push('不在可用时间范围内');
            }
          }
        }

        const empShifts = shifts.filter(
          (s) =>
            s.employeeId === emp.id &&
            s.id !== shiftEditState.shift?.id
        );
        let totalHours = 0;
        for (const s of empShifts) {
          totalHours += calculateHours(s.startTime, s.endTime);
        }
        const newHours = calculateHours(startTime, endTime);
        if (totalHours + newHours > emp.maxWeeklyHours) {
          errors.push(
            `周工时超限: 当前${totalHours.toFixed(1)}h + ${newHours}h > 上限${emp.maxWeeklyHours}h`
          );
        }

        const hasConflict = empShifts.some((s) => {
          if (s.date !== date) return false;
          const [s1h, s1m] = s.startTime.split(':').map(Number);
          const [e1h, e1m] = s.endTime.split(':').map(Number);
          const [s2h, s2m] = startTime.split(':').map(Number);
          const [e2h, e2m] = endTime.split(':').map(Number);
          const start1 = s1h * 60 + s1m;
          const end1 = e1h * 60 + e1m;
          const start2 = s2h * 60 + s2m;
          const end2 = e2h * 60 + e2m;
          return start1 < end2 && start2 < end1;
        });
        if (hasConflict) {
          errors.push('该时段已有排班冲突');
        }
      }

      return {
        value: emp.id,
        label: emp.name,
        employee: emp,
        errors,
      };
    });
  }, [shiftEditState, positions, employees, shifts, weekDates]);

  const handleSaveShift = useCallback(() => {
    if (!shiftEditState.positionId || !shiftEditState.date || !currentStoreId) return;

    const shiftData = {
      storeId: currentStoreId,
      positionId: shiftEditState.positionId,
      employeeId: selectedEmployeeId || undefined,
      date: shiftEditState.date,
      startTime: shiftEditState.startTime || '',
      endTime: shiftEditState.endTime || '',
    };

    if (shiftEditState.shift) {
      storeActions.updateShift(shiftEditState.shift.id, shiftData);
    } else {
      storeActions.addShift(shiftData);
    }
    closeModal();
  }, [shiftEditState, selectedEmployeeId, currentStoreId, storeActions, closeModal]);

  const handleMarkAbsence = useCallback(() => {
    if (!shiftEditState.shift || !absenceReason.trim()) return;
    storeActions.markAbsence(shiftEditState.shift.id, absenceReason.trim());
    closeModal();
  }, [shiftEditState, absenceReason, storeActions, closeModal]);

  const handleDeleteShift = useCallback(() => {
    if (!shiftEditState.shift) return;
    storeActions.removeShift(shiftEditState.shift.id);
    closeModal();
  }, [shiftEditState, storeActions, closeModal]);

  const editingShift = shiftEditState.shift;
  const isReadOnly = editingShift?.isSettled;
  const editingPosition = positions.find((p) => p.id === (editingShift?.positionId || shiftEditState.positionId));
  const editingEmployee = employees.find((e) => e.id === selectedEmployeeId);

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Button variant="secondary" size="sm" onClick={handlePrevWeek}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="secondary" size="sm" onClick={handleThisWeek}>
                <Check className="h-4 w-4" />
                本周
              </Button>
              <Button variant="secondary" size="sm" onClick={handleNextWeek}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-50 rounded-lg">
              <Calendar className="h-4 w-4 text-brand-600" />
              <span className="text-sm font-medium text-brand-700">
                {formatWeekRange(weekDates)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-40">
              <Select
                options={storeOptions}
                value={currentStoreId}
                onChange={handleStoreChange}
                placeholder="选择门店"
              />
            </div>

            {isWeekSettled ? (
              <Badge variant="settled">
                <Lock className="h-3 w-3 mr-1" />
                本周已结算
              </Badge>
            ) : hasSomeSettled ? (
              <Badge variant="warning">
                <Lock className="h-3 w-3 mr-1" />
                部分已结算
              </Badge>
            ) : null}

            <Button variant="secondary" size="sm" onClick={handleGenerateSchedule}>
              <RefreshCw className="h-4 w-4" />
              批量生成排班
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setSettleConfirmOpen(true)}
              disabled={isWeekSettled || shifts.length === 0}
            >
              <Check className="h-4 w-4" />
              结算本周
            </Button>
          </div>
        </div>
      </div>

      {shifts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mb-4">
              <Calendar className="h-8 w-8 text-brand-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">本周暂无排班</h3>
            <p className="text-sm text-slate-500 mb-6 max-w-sm">
              点击下方按钮自动生成排班，或直接点击表格空白单元格手动添加
            </p>
            <Button onClick={handleGenerateSchedule}>
              <RefreshCw className="h-4 w-4" />
              生成本周排班
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="bg-brand-700 text-white text-left px-4 py-3 text-sm font-semibold sticky left-0 z-10 w-40">
                    岗位 / 时段
                  </th>
                  {weekDates.map((date, idx) => {
                    const isToday = formatDate(date) === formatDate(new Date());
                    return (
                      <th
                        key={idx}
                        className={cn(
                          'bg-brand-700 text-white text-center px-3 py-3 text-sm font-semibold min-w-[140px]',
                          isToday && 'bg-brand-800'
                        )}
                      >
                        <div>{WEEKDAY_NAMES[idx]}</div>
                        <div className={cn(
                          'text-xs font-normal mt-0.5',
                          isToday && 'text-brand-200'
                        )}>
                          {date.getMonth() + 1}/{date.getDate()}
                          {isToday && ' (今天)'}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {positions.map((position) => (
                  <React.Fragment key={position.id}>
                    {TIME_SLOTS.map((slot, slotIdx) => {
                      const isFirstSlotOfPosition = slotIdx === 0;
                      return (
                        <tr
                          key={`${position.id}_${slot.name}`}
                          className="border-t border-slate-100 hover:bg-slate-50/50"
                        >
                          {isFirstSlotOfPosition && (
                            <td
                              rowSpan={TIME_SLOTS.length}
                              className="bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 sticky left-0 z-10 align-top border-r border-slate-100"
                            >
                              <div className="font-semibold text-slate-800">{position.name}</div>
                              {position.requiredQualifications && position.requiredQualifications.length > 0 && (
                                <div className="text-xs text-slate-500 mt-1">
                                  {position.requiredQualifications.join('、')}
                                </div>
                              )}
                            </td>
                          )}
                          <td className="px-4 py-2 bg-slate-50 text-xs text-slate-600 whitespace-nowrap border-r border-slate-100">
                            <div className="font-medium text-slate-700">{slot.name}</div>
                            <div className="text-slate-500">{slot.startTime}-{slot.endTime}</div>
                          </td>
                          {weekDates.map((date) => {
                            const dateStr = formatDate(date);
                            const key = `${dateStr}_${position.id}_${slot.startTime}_${slot.endTime}`;
                            const shift = shiftMap.get(key);
                            const emp = shift?.employeeId ? employees.find((e) => e.id === shift.employeeId) : null;

                            return (
                              <td
                                key={dateStr}
                                className={cn(
                                  'p-1.5 align-top border-r border-slate-100 last:border-r-0',
                                  shift?.isSettled && 'bg-slate-100/60 opacity-80'
                                )}
                              >
                                {shift ? (
                                  <ShiftCell
                                    shift={shift}
                                    employee={emp || null}
                                    onClick={() => openEditShiftModal(shift)}
                                  />
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openAddShiftModal(position.id, dateStr, slot.startTime, slot.endTime)
                                    }
                                    className={cn(
                                      'w-full min-h-[72px] rounded-lg border border-dashed border-slate-200',
                                      'flex items-center justify-center text-slate-300 hover:text-brand-500',
                                      'hover:border-brand-300 hover:bg-brand-50/50 transition-all',
                                      'cursor-pointer'
                                    )}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </button>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        isOpen={shiftEditState.isOpen}
        onClose={closeModal}
        title={
          isReadOnly
            ? '查看班次（已结算）'
            : editingShift
            ? '编辑班次'
            : '新增班次'
        }
        width="max-w-xl"
        footer={
          isReadOnly ? (
            <Button variant="secondary" onClick={closeModal}>
              关闭
            </Button>
          ) : (
            <>
              {editingShift && !showAbsenceForm && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleDeleteShift}
                  className="mr-auto"
                >
                  <UserX className="h-4 w-4" />
                  删除班次
                </Button>
              )}
              {editingShift && !showAbsenceForm && editingShift.employeeId && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowAbsenceForm(true)}
                >
                  <AlertTriangle className="h-4 w-4" />
                  记录缺勤
                </Button>
              )}
              <Button variant="secondary" onClick={closeModal}>
                取消
              </Button>
              {!showAbsenceForm && (
                <Button variant="primary" onClick={handleSaveShift}>
                  {editingShift ? '保存修改' : '确认添加'}
                </Button>
              )}
              {showAbsenceForm && (
                <Button
                  variant="danger"
                  onClick={handleMarkAbsence}
                  disabled={!absenceReason.trim()}
                >
                  确认缺勤
                </Button>
              )}
            </>
          )
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">岗位</label>
              <div className="px-3 py-2 bg-slate-50 rounded-lg text-sm text-slate-700">
                {editingPosition?.name || '-'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">日期</label>
              <div className="px-3 py-2 bg-slate-50 rounded-lg text-sm text-slate-700">
                {shiftEditState.date || editingShift?.date || '-'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">开始时间</label>
              <div className="px-3 py-2 bg-slate-50 rounded-lg text-sm text-slate-700">
                {shiftEditState.startTime || editingShift?.startTime || '-'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">结束时间</label>
              <div className="px-3 py-2 bg-slate-50 rounded-lg text-sm text-slate-700">
                {shiftEditState.endTime || editingShift?.endTime || '-'}
              </div>
            </div>
          </div>

          {showAbsenceForm ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">缺勤原因</label>
              <textarea
                value={absenceReason}
                onChange={(e) => setAbsenceReason(e.target.value)}
                placeholder="请输入缺勤原因"
                rows={3}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  安排员工
                </label>
                {isReadOnly ? (
                  <div className="px-3 py-2 bg-slate-50 rounded-lg text-sm text-slate-700">
                    {editingEmployee?.name || '未安排'}
                  </div>
                ) : (
                  <Select
                    options={employeeOptions.map((o) => ({ value: o.value, label: o.label }))}
                    value={selectedEmployeeId}
                    onChange={setSelectedEmployeeId}
                    placeholder="选择员工（不选则为空班次）"
                  />
                )}
              </div>

              {selectedEmployeeId && (
                <div>
                  {(() => {
                    const opt = employeeOptions.find((o) => o.value === selectedEmployeeId);
                    if (!opt || opt.errors.length === 0) return null;
                    return (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-1">
                        <div className="text-xs font-medium text-red-700 flex items-center gap-1">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          校验警告
                        </div>
                        {opt.errors.map((err, idx) => (
                          <div key={idx} className="text-xs text-red-600 pl-4">
                            • {err}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}

              {editingShift && editingShift.anomalies.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-1">
                  <div className="text-xs font-medium text-red-700 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    班次异常
                  </div>
                  {editingShift.anomalies.map((anomaly, idx) => {
                    const display = getAnomalyDisplay(anomaly);
                    return (
                      <div key={idx} className={cn('text-xs pl-4', display.color)}>
                        • {display.label}
                      </div>
                    );
                  })}
                </div>
              )}

              {editingShift?.isAbsent && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-xs font-medium text-red-700 flex items-center gap-1">
                    <UserX className="h-3.5 w-3.5" />
                    该班次已标记为缺勤
                  </div>
                </div>
              )}

              {editingShift?.isBorrowed && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-xs font-medium text-blue-700">
                    借调班次 · 来源门店：
                    {editingShift.sourceStoreId
                      ? stores.find((s) => s.id === editingShift.sourceStoreId)?.name
                      : '-'}
                  </div>
                </div>
              )}

              {editingShift?.isSettled && (
                <div className="p-3 bg-violet-50 border border-violet-200 rounded-lg">
                  <div className="text-xs font-medium text-violet-700 flex items-center gap-1">
                    <Lock className="h-3.5 w-3.5" />
                    已结算 · {editingShift.settledAt ? new Date(editingShift.settledAt).toLocaleString('zh-CN') : '-'}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={settleConfirmOpen}
        onClose={() => setSettleConfirmOpen(false)}
        title="确认结算本周排班"
        width="max-w-md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSettleConfirmOpen(false)}>
              取消
            </Button>
            <Button variant="primary" onClick={handleSettleShifts}>
              确认结算
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            确认结算 <span className="font-medium text-slate-800">{formatWeekRange(weekDates)}</span> 的排班？
          </p>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="text-xs font-medium text-amber-700 flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              结算后所有班次将被锁定，无法再编辑或删除
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

interface ShiftCellProps {
  shift: ScheduleShift;
  employee: Employee | null;
  onClick: () => void;
}

function ShiftCell({ shift, employee, onClick }: ShiftCellProps) {
  const hasAnomaly = shift.anomalies.length > 0;
  const isAbsent = shift.isAbsent;
  const isBorrowed = shift.isBorrowed;
  const isSettled = shift.isSettled;

  return (
    <div className="relative group">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'w-full min-h-[72px] rounded-lg p-2 text-left transition-all cursor-pointer relative overflow-hidden',
          'border',
          isSettled && 'bg-slate-100 opacity-80',
          !isSettled && !isAbsent && !hasAnomaly && !isBorrowed && 'bg-white border-slate-200 hover:border-brand-400 hover:shadow-md',
          hasAnomaly && !isSettled && 'bg-white border-2 border-red-400 animate-breathe',
          isBorrowed && !isSettled && 'bg-white border-2 border-blue-400',
          isAbsent && 'bg-white'
        )}
        style={
          isAbsent
            ? {
                backgroundImage:
                  'linear-gradient(135deg, rgba(239,68,68,0.1) 25%, transparent 25%, transparent 50%, rgba(239,68,68,0.1) 50%, rgba(239,68,68,0.1) 75%, transparent 75%, transparent)',
                backgroundSize: '8px 8px',
              }
            : undefined
        }
      >
        {isSettled && (
          <div className="absolute top-1 right-1">
            <Lock className="h-3 w-3 text-violet-500" />
          </div>
        )}

        <div className="space-y-0.5">
          <div className={cn(
            'text-sm font-medium truncate pr-5',
            isSettled ? 'text-slate-500' : 'text-slate-800'
          )}>
            {employee?.name || '未安排'}
          </div>
          <div className={cn(
            'text-xs',
            isSettled ? 'text-slate-400' : 'text-slate-500'
          )}>
            {shift.startTime}-{shift.endTime}
          </div>

          {isAbsent && (
            <Badge variant="danger" className="mt-0.5 text-[10px] px-1.5 py-0">
              <UserX className="h-2.5 w-2.5 mr-0.5" />
              缺勤
            </Badge>
          )}

          {isBorrowed && !isAbsent && (
            <Badge variant="info" className="mt-0.5 text-[10px] px-1.5 py-0">
              借调
            </Badge>
          )}

          {isSettled && !isAbsent && (
            <Badge variant="settled" className="mt-0.5 text-[10px] px-1.5 py-0">
              已锁定
            </Badge>
          )}

          {hasAnomaly && !isSettled && (
            <div className="flex items-center gap-0.5 mt-0.5">
              <AlertTriangle className="h-3 w-3 text-red-500 flex-shrink-0" />
              <span className="text-[10px] text-red-600 font-medium">异常</span>
            </div>
          )}
        </div>

        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-30 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <div className="bg-slate-900 text-white text-xs rounded-lg py-2 px-3 shadow-xl min-w-[180px] max-w-[240px]">
            <div className="font-medium mb-1">
              {employee?.name || '未安排员工'} · {shift.startTime}-{shift.endTime}
            </div>
            <div className="text-slate-300 text-[11px] mb-1">
              岗位: {employee?.positionIds.join(', ') || '-'}
            </div>

            {hasAnomaly && (
              <div className="mt-1.5 pt-1.5 border-t border-slate-700 space-y-0.5">
                <div className="text-red-400 font-medium text-[11px]">异常原因:</div>
                {shift.anomalies.map((a, idx) => {
                  const display = getAnomalyDisplay(a);
                  return (
                    <div key={idx} className="text-[11px] text-red-300">
                      • {display.label}
                    </div>
                  );
                })}
              </div>
            )}

            {isSettled && (
              <div className="mt-1.5 pt-1.5 border-t border-slate-700 text-[11px] text-violet-300">
                已结算锁定 · {shift.settledAt ? new Date(shift.settledAt).toLocaleDateString('zh-CN') : '-'}
              </div>
            )}

            {isAbsent && (
              <div className="mt-1.5 pt-1.5 border-t border-slate-700 text-[11px] text-red-300">
                已标记缺勤
              </div>
            )}

            {isBorrowed && (
              <div className="mt-1.5 pt-1.5 border-t border-slate-700 text-[11px] text-blue-300">
                借调班次
              </div>
            )}

            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45" />
          </div>
        </div>
      </button>
    </div>
  );
}
