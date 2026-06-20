import React, { useState, useMemo } from 'react';
import {
  useCurrentUser,
  useEmployees,
  useShifts,
  usePositions,
  useStores,
  useShiftSwaps,
  getStoreActions,
  useEmployeeById,
  usePositionById,
} from '@/store/hooks';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { formatDate, calculateHours, getWeekDates } from '@/utils/dateUtils';
import {
  ArrowLeftRight,
  Clock,
  User,
  Calendar,
} from 'lucide-react';
import type { ScheduleShift, Employee, Position } from '@/types';

const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

type ShiftStatus = 'normal' | 'absent' | 'borrowed' | 'anomaly';

function getShiftStatus(shift: ScheduleShift): ShiftStatus {
  if (shift.isAbsent) return 'absent';
  if (shift.isBorrowed) return 'borrowed';
  if (shift.anomalies && shift.anomalies.length > 0) return 'anomaly';
  return 'normal';
}

function getStatusBadgeVariant(status: ShiftStatus): 'success' | 'danger' | 'warning' | 'info' {
  switch (status) {
    case 'normal':
      return 'success';
    case 'absent':
      return 'danger';
    case 'borrowed':
      return 'info';
    case 'anomaly':
      return 'warning';
  }
}

function getStatusLabel(status: ShiftStatus): string {
  switch (status) {
    case 'normal':
      return '正常';
    case 'absent':
      return '缺勤';
    case 'borrowed':
      return '借调';
    case 'anomaly':
      return '异常';
  }
}

interface SwapModalData {
  shift: ScheduleShift | null;
  targetEmployeeId: string;
  targetShiftId: string;
  reason: string;
}

export default function MySchedule() {
  const currentUser = useCurrentUser();
  const currentStoreId = currentUser?.storeId || '';
  const employees = useEmployees(currentStoreId);
  const positions = usePositions(currentStoreId);
  const stores = useStores();
  const allShifts = useShifts();
  const shiftSwaps = useShiftSwaps(currentStoreId);
  const { requestShiftSwap } = getStoreActions();

  const currentEmployee = useEmployeeById(currentUser?.id || '');

  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [swapData, setSwapData] = useState<SwapModalData>({
    shift: null,
    targetEmployeeId: '',
    targetShiftId: '',
    reason: '',
  });
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const weekDates = useMemo(() => getWeekDates(new Date()), []);
  const weekStartStr = formatDate(weekDates[0]);
  const weekEndStr = formatDate(weekDates[6]);

  const myShifts = useMemo(() => {
    if (!currentUser) return [];
    return allShifts.filter(
      (s) =>
        s.employeeId === currentUser.id &&
        s.date >= weekStartStr &&
        s.date <= weekEndStr
    );
  }, [allShifts, currentUser, weekStartStr, weekEndStr]);

  const weeklyHours = useMemo(() => {
    return myShifts.reduce((total, shift) => {
      return total + calculateHours(shift.startTime, shift.endTime);
    }, 0);
  }, [myShifts]);

  const maxWeeklyHours = currentEmployee?.maxWeeklyHours || 40;
  const hoursProgress = Math.min((weeklyHours / maxWeeklyHours) * 100, 100);

  const shiftsByDate = useMemo(() => {
    const map: Record<string, ScheduleShift[]> = {};
    weekDates.forEach((date) => {
      const dateStr = formatDate(date);
      map[dateStr] = myShifts.filter((s) => s.date === dateStr);
    });
    return map;
  }, [weekDates, myShifts]);

  const otherEmployees = useMemo(() => {
    if (!currentUser) return [];
    return employees.filter((e) => e.id !== currentUser.id);
  }, [employees, currentUser]);

  const targetEmployeeShifts = useMemo(() => {
    if (!swapData.targetEmployeeId) return [];
    return allShifts.filter(
      (s) =>
        s.employeeId === swapData.targetEmployeeId &&
        !s.isSettled &&
        s.date >= weekStartStr &&
        s.date <= weekEndStr
    );
  }, [swapData.targetEmployeeId, allShifts, weekStartStr, weekEndStr]);

  const monthlyStats = useMemo(() => {
    if (!currentUser) return { totalHours: 0, absenceCount: 0, swapCount: 0 };
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const monthStartStr = formatDate(monthStart);
    const monthEndStr = formatDate(monthEnd);

    const monthShifts = allShifts.filter(
      (s) =>
        s.employeeId === currentUser.id &&
        s.date >= monthStartStr &&
        s.date <= monthEndStr
    );

    const totalHours = monthShifts.reduce((total, shift) => {
      return total + calculateHours(shift.startTime, shift.endTime);
    }, 0);

    const absenceCount = monthShifts.filter((s) => s.isAbsent).length;

    const swapCount = shiftSwaps.filter(
      (s) =>
        (s.requesterId === currentUser.id || s.targetEmployeeId === currentUser.id) &&
        s.status === 'approved'
    ).length;

    return { totalHours, absenceCount, swapCount };
  }, [currentUser, allShifts, shiftSwaps]);

  const storeMap = useMemo(() => {
    const map: Record<string, string> = {};
    stores.forEach((s) => {
      map[s.id] = s.name;
    });
    return map;
  }, [stores]);

  const positionMap = useMemo(() => {
    const map: Record<string, string> = {};
    positions.forEach((p) => {
      map[p.id] = p.name;
    });
    return map;
  }, [positions]);

  const handleOpenSwapModal = (shift: ScheduleShift) => {
    setSwapData({
      shift,
      targetEmployeeId: '',
      targetShiftId: '',
      reason: '',
    });
    setSwapModalOpen(true);
  };

  const handleSubmitSwap = () => {
    if (!currentUser || !swapData.shift) return;
    if (!swapData.targetEmployeeId) return;

    const result = requestShiftSwap(
      currentUser.id,
      swapData.shift.id,
      swapData.targetEmployeeId,
      swapData.targetShiftId || undefined,
      swapData.reason || undefined
    );

    if (result.success) {
      setSwapModalOpen(false);
      setSwapData({
        shift: null,
        targetEmployeeId: '',
        targetShiftId: '',
        reason: '',
      });
    }
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'manager':
        return '店长';
      case 'admin':
        return '管理员';
      default:
        return '员工';
    }
  };

  const employeeOptions = otherEmployees.map((e) => ({
    value: e.id,
    label: e.name,
  }));

  const targetShiftOptions = targetEmployeeShifts.map((s) => ({
    value: s.id,
    label: `${s.date} ${s.startTime}-${s.endTime} ${positionMap[s.positionId] || ''}`,
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center">
                  <User className="w-7 h-7 text-brand-600" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-slate-900">
                    {currentUser?.name || '未登录'}
                  </h1>
                  <p className="text-sm text-slate-500 mt-1">
                    {getRoleLabel(currentUser?.role)} ·{' '}
                    {storeMap[currentStoreId] || '未分配门店'}
                  </p>
                </div>
              </div>
              <div className="flex-1 min-w-[240px] max-w-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    本周工时
                  </span>
                  <span className="text-sm text-slate-600">
                    <span className="font-semibold text-brand-600">{weeklyHours.toFixed(1)}</span>
                    <span className="text-slate-400"> / {maxWeeklyHours}h</span>
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand-400 to-brand-600 rounded-full transition-all duration-500"
                    style={{ width: `${hoursProgress}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  {weekStartStr} ~ {weekEndStr}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-slate-500" />
                本周班表
              </h2>
            </div>
            <div className="grid grid-cols-7 gap-px bg-slate-100">
              {weekDates.map((date, index) => {
                const dateStr = formatDate(date);
                const dayShifts = shiftsByDate[dateStr] || [];
                const isToday = formatDate(new Date()) === dateStr;
                return (
                  <div key={dateStr} className="bg-white min-h-[400px] flex flex-col">
                    <div
                      className={`px-3 py-3 text-center border-b border-slate-100 ${
                        isToday ? 'bg-brand-50' : ''
                      }`}
                    >
                      <p
                        className={`text-sm font-medium ${
                          isToday ? 'text-brand-600' : 'text-slate-700'
                        }`}
                      >
                        {WEEKDAY_LABELS[index]}
                      </p>
                      <p
                        className={`text-xs mt-0.5 ${
                          isToday ? 'text-brand-500' : 'text-slate-400'
                        }`}
                      >
                        {date.getMonth() + 1}/{date.getDate()}
                      </p>
                    </div>
                    <div className="flex-1 p-2 space-y-2">
                      {dayShifts.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-xs text-slate-300 py-8">
                          休息
                        </div>
                      ) : (
                        dayShifts.map((shift) => {
                          const status = getShiftStatus(shift);
                          return (
                            <div
                              key={shift.id}
                              className={`rounded-lg border p-3 space-y-2 ${
                                shift.isSettled
                                  ? 'bg-slate-50 border-slate-200'
                                  : 'bg-white border-slate-200 hover:border-brand-300 hover:shadow-sm transition-all'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-slate-500 truncate">
                                    {storeMap[shift.storeId]}
                                  </p>
                                  <p className="text-sm font-medium text-slate-800 mt-0.5">
                                    {positionMap[shift.positionId]}
                                  </p>
                                </div>
                                <Badge variant={getStatusBadgeVariant(status)}>
                                  {getStatusLabel(status)}
                                </Badge>
                              </div>
                              <p className="text-xs text-slate-600 font-mono">
                                {shift.startTime} - {shift.endTime}
                              </p>
                              <Button
                                size="sm"
                                variant={shift.isSettled ? 'ghost' : 'secondary'}
                                disabled={shift.isSettled}
                                className="w-full"
                                onClick={() => handleOpenSwapModal(shift)}
                              >
                                <ArrowLeftRight className="w-3.5 h-3.5" />
                                {shift.isSettled ? '已结算' : '发起换班'}
                              </Button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-base font-semibold text-slate-900 mb-4">月度统计</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">总工时</span>
                <span className="text-lg font-semibold text-slate-900">
                  {monthlyStats.totalHours.toFixed(1)}h
                </span>
              </div>
              <div className="w-full h-px bg-slate-100" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">缺勤次数</span>
                <span className="text-lg font-semibold text-red-600">
                  {monthlyStats.absenceCount}
                </span>
              </div>
              <div className="w-full h-px bg-slate-100" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">换班次数</span>
                <span className="text-lg font-semibold text-brand-600">
                  {monthlyStats.swapCount}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={swapModalOpen}
        onClose={() => setSwapModalOpen(false)}
        title="发起换班申请"
        width="max-w-md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSwapModalOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleSubmitSwap}
              disabled={!swapData.targetEmployeeId}
            >
              提交申请
            </Button>
          </>
        }
      >
        {swapData.shift && (
          <div className="space-y-5">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs text-slate-500 mb-1">我的班次</p>
              <p className="text-sm font-medium text-slate-800">
                {swapData.shift.date} {positionMap[swapData.shift.positionId]}
              </p>
              <p className="text-xs text-slate-600 font-mono mt-1">
                {swapData.shift.startTime} - {swapData.shift.endTime}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                选择目标员工 <span className="text-red-500">*</span>
              </label>
              <Select
                options={employeeOptions}
                value={swapData.targetEmployeeId}
                onChange={(value) =>
                  setSwapData((prev) => ({
                    ...prev,
                    targetEmployeeId: value,
                    targetShiftId: '',
                  }))
                }
                placeholder="请选择员工"
              />
            </div>

            {swapData.targetEmployeeId && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  选择对方班次（可选）
                </label>
                <Select
                  options={[
                    { value: '', label: '不指定班次，直接换给对方' },
                    ...targetShiftOptions,
                  ]}
                  value={swapData.targetShiftId}
                  onChange={(value) =>
                    setSwapData((prev) => ({ ...prev, targetShiftId: value }))
                  }
                  placeholder="请选择班次"
                />
                <p className="text-xs text-slate-400 mt-1">
                  不选择则表示将该班次直接转让给对方
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                申请原因
              </label>
              <textarea
                value={swapData.reason}
                onChange={(e) =>
                  setSwapData((prev) => ({ ...prev, reason: e.target.value }))
                }
                placeholder="请简要说明换班原因..."
                rows={3}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none"
              />
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="拒绝换班"
        width="max-w-sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectModalOpen(false)}>
              取消
            </Button>
            <Button
              variant="danger"
              disabled={!rejectReason.trim()}
            >
              确认拒绝
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">请填写拒绝原因：</p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="请输入拒绝原因..."
            rows={3}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
          />
        </div>
      </Modal>
    </div>
  );
}
