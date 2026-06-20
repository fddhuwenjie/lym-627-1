import React, { useState, useMemo } from 'react';
import {
  useCurrentUser,
  useShiftSwaps,
  useShifts,
  useEmployees,
  usePositions,
  getStoreActions,
  useEmployeeById,
  usePositionById,
} from '@/store/hooks';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import {
  ArrowLeftRight,
  Clock,
  Check,
  X,
  User,
  Calendar,
  MessageSquare,
  Inbox,
} from 'lucide-react';
import type { ShiftSwap, ScheduleShift, Employee } from '@/types';

type TabKey = 'pending_me' | 'my_requests' | 'completed';

type SwapStatusBadge = 'warning' | 'info' | 'success' | 'danger' | 'neutral';

function getStatusBadgeVariant(status: ShiftSwap['status']): SwapStatusBadge {
  switch (status) {
    case 'pending':
    case 'pending_confirmation':
      return 'warning';
    case 'confirmed':
      return 'info';
    case 'approved':
      return 'success';
    case 'rejected':
      return 'danger';
    case 'cancelled':
      return 'neutral';
  }
}

function getStatusLabel(status: ShiftSwap['status']): string {
  switch (status) {
    case 'pending':
    case 'pending_confirmation':
      return '待确认';
    case 'confirmed':
      return '已确认';
    case 'approved':
      return '已批准';
    case 'rejected':
      return '已拒绝';
    case 'cancelled':
      return '已取消';
  }
}

function formatDateTime(isoStr?: string): string {
  if (!isoStr) return '';
  const date = new Date(isoStr);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

interface TimelineStep {
  label: string;
  done: boolean;
  current: boolean;
  time?: string;
}

function getTimelineSteps(swap: ShiftSwap): TimelineStep[] {
  const steps: TimelineStep[] = [];

  steps.push({
    label: '发起申请',
    done: true,
    current: false,
    time: formatDateTime(swap.requestedAt || swap.createdAt),
  });

  const confirmed = swap.status === 'confirmed' || swap.status === 'approved';
  const currentConfirm = swap.status === 'pending_confirmation' || swap.status === 'pending';
  steps.push({
    label: '对方确认',
    done: confirmed,
    current: currentConfirm,
    time: swap.confirmedAt ? formatDateTime(swap.confirmedAt) : undefined,
  });

  const approved = swap.status === 'approved';
  const currentApprove = swap.status === 'confirmed';
  steps.push({
    label: '店长批准',
    done: approved,
    current: currentApprove,
    time: swap.approvedAt ? formatDateTime(swap.approvedAt) : undefined,
  });

  return steps;
}

interface SwapCardProps {
  swap: ShiftSwap;
  shiftsMap: Record<string, ScheduleShift>;
  employeesMap: Record<string, Employee>;
  positionsMap: Record<string, string>;
  currentUserId: string;
  currentUserRole?: string;
  onConfirm: (swapId: string) => void;
  onReject: (swapId: string) => void;
  onApprove: (swapId: string) => void;
  onCancel: (swapId: string) => void;
}

function SwapCard({
  swap,
  shiftsMap,
  employeesMap,
  positionsMap,
  currentUserId,
  currentUserRole,
  onConfirm,
  onReject,
  onApprove,
  onCancel,
}: SwapCardProps) {
  const requester = employeesMap[swap.requesterId];
  const targetEmployee = employeesMap[swap.targetEmployeeId];
  const requesterShift = shiftsMap[swap.requesterShiftId];
  const targetShift = swap.targetShiftId ? shiftsMap[swap.targetShiftId] : undefined;

  const isTarget = swap.targetEmployeeId === currentUserId;
  const isRequester = swap.requesterId === currentUserId;
  const isManager = currentUserRole === 'manager' || currentUserRole === 'admin';

  const showConfirmReject =
    (swap.status === 'pending_confirmation' || swap.status === 'pending') && isTarget;
  const showApprove = swap.status === 'confirmed' && isManager;
  const showCancel =
    (swap.status === 'pending_confirmation' ||
      swap.status === 'pending' ||
      swap.status === 'confirmed') &&
    isRequester;

  const timelineSteps = getTimelineSteps(swap);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center">
            <ArrowLeftRight className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-800">
                {requester?.name || '未知员工'}
              </span>
              <span className="text-slate-400">→</span>
              <span className="text-sm font-medium text-slate-800">
                {targetEmployee?.name || '未知员工'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDateTime(swap.requestedAt || swap.createdAt)}
            </p>
          </div>
        </div>
        <Badge variant={getStatusBadgeVariant(swap.status)}>
          {getStatusLabel(swap.status)}
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5">
            <User className="w-3 h-3" />
            <span>{requester?.name} 的班次</span>
          </div>
          {requesterShift ? (
            <>
              <p className="text-sm font-medium text-slate-800 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {requesterShift.date}
              </p>
              <p className="text-xs text-slate-600 mt-1">
                {positionsMap[requesterShift.positionId] || '未知岗位'}
              </p>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {requesterShift.startTime} - {requesterShift.endTime}
              </p>
            </>
          ) : (
            <p className="text-xs text-slate-400">班次信息不存在</p>
          )}
        </div>

        <div className="p-3 bg-brand-50/50 rounded-lg border border-brand-100">
          <div className="flex items-center gap-1.5 text-xs text-brand-600 mb-1.5">
            <User className="w-3 h-3" />
            <span>{targetEmployee?.name} 的班次</span>
          </div>
          {targetShift ? (
            <>
              <p className="text-sm font-medium text-slate-800 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {targetShift.date}
              </p>
              <p className="text-xs text-slate-600 mt-1">
                {positionsMap[targetShift.positionId] || '未知岗位'}
              </p>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {targetShift.startTime} - {targetShift.endTime}
              </p>
            </>
          ) : (
            <p className="text-xs text-slate-500">不指定班次（直接转让）</p>
          )}
        </div>
      </div>

      {swap.reason && (
        <div className="flex items-start gap-2 p-3 bg-amber-50/50 rounded-lg border border-amber-100">
          <MessageSquare className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-amber-600 font-medium">申请原因</p>
            <p className="text-sm text-slate-700 mt-0.5">{swap.reason}</p>
          </div>
        </div>
      )}

      {swap.rejectReason && (
        <div className="flex items-start gap-2 p-3 bg-red-50/50 rounded-lg border border-red-100">
          <X className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-red-600 font-medium">拒绝原因</p>
            <p className="text-sm text-slate-700 mt-0.5">{swap.rejectReason}</p>
          </div>
        </div>
      )}

      <div className="relative pl-2 pt-1">
        <div className="space-y-0">
          {timelineSteps.map((step, idx) => (
            <div key={idx} className="relative flex items-start gap-3 pb-4 last:pb-0">
              <div className="relative flex flex-col items-center">
                <div
                  className={`w-3 h-3 rounded-full border-2 flex-shrink-0 z-10 ${
                    step.done
                      ? 'bg-emerald-500 border-emerald-500'
                      : step.current
                      ? 'bg-white border-brand-500 ring-4 ring-brand-100'
                      : 'bg-white border-slate-300'
                  }`}
                >
                  {step.done && <Check className="w-2 h-2 text-white m-auto" />}
                </div>
                {idx < timelineSteps.length - 1 && (
                  <div
                    className={`absolute top-3 w-0.5 h-full ${
                      step.done ? 'bg-emerald-300' : 'bg-slate-200'
                    }`}
                  />
                )}
              </div>
              <div className="flex-1 pb-1">
                <p
                  className={`text-sm ${
                    step.done
                      ? 'text-slate-700 font-medium'
                      : step.current
                      ? 'text-brand-600 font-medium'
                      : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </p>
                {step.time && (
                  <p className="text-xs text-slate-400 mt-0.5">{step.time}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {(showConfirmReject || showApprove || showCancel) && (
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          {showConfirmReject && (
            <>
              <Button variant="danger" size="sm" onClick={() => onReject(swap.id)}>
                <X className="w-4 h-4" />
                拒绝
              </Button>
              <Button variant="primary" size="sm" onClick={() => onConfirm(swap.id)}>
                <Check className="w-4 h-4" />
                确认
              </Button>
            </>
          )}
          {showApprove && (
            <Button variant="primary" size="sm" onClick={() => onApprove(swap.id)}>
              <Check className="w-4 h-4" />
              批准
            </Button>
          )}
          {showCancel && !showConfirmReject && !showApprove && (
            <Button variant="ghost" size="sm" onClick={() => onCancel(swap.id)}>
              取消申请
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default function ShiftSwaps() {
  const currentUser = useCurrentUser();
  const currentStoreId = currentUser?.storeId || '';
  const allSwaps = useShiftSwaps(currentStoreId);
  const allShifts = useShifts();
  const allEmployees = useEmployees();
  const allPositions = usePositions();
  const { confirmSwap, rejectSwap, approveSwap, cancelSwap } = getStoreActions();

  const [activeTab, setActiveTab] = useState<TabKey>('pending_me');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingSwapId, setRejectingSwapId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const shiftsMap = useMemo(() => {
    const map: Record<string, ScheduleShift> = {};
    allShifts.forEach((s) => {
      map[s.id] = s;
    });
    return map;
  }, [allShifts]);

  const employeesMap = useMemo(() => {
    const map: Record<string, Employee> = {};
    allEmployees.forEach((e) => {
      map[e.id] = e;
    });
    return map;
  }, [allEmployees]);

  const positionsMap = useMemo(() => {
    const map: Record<string, string> = {};
    allPositions.forEach((p) => {
      map[p.id] = p.name;
    });
    return map;
  }, [allPositions]);

  const filteredSwaps = useMemo(() => {
    if (!currentUser) return [];
    switch (activeTab) {
      case 'pending_me':
        return allSwaps.filter(
          (s) =>
            s.targetEmployeeId === currentUser.id &&
            (s.status === 'pending_confirmation' || s.status === 'pending')
        );
      case 'my_requests':
        return allSwaps.filter(
          (s) =>
            s.requesterId === currentUser.id &&
            (s.status === 'pending_confirmation' ||
              s.status === 'pending' ||
              s.status === 'confirmed')
        );
      case 'completed':
        return allSwaps.filter(
          (s) =>
            (s.requesterId === currentUser.id || s.targetEmployeeId === currentUser.id) &&
            (s.status === 'approved' || s.status === 'rejected' || s.status === 'cancelled')
        );
      default:
        return [];
    }
  }, [activeTab, allSwaps, currentUser]);

  const sortedSwaps = useMemo(() => {
    return [...filteredSwaps].sort((a, b) => {
      const timeA = a.requestedAt || a.createdAt || '';
      const timeB = b.requestedAt || b.createdAt || '';
      return timeB.localeCompare(timeA);
    });
  }, [filteredSwaps]);

  const pendingMeCount = useMemo(() => {
    if (!currentUser) return 0;
    return allSwaps.filter(
      (s) =>
        s.targetEmployeeId === currentUser.id &&
        (s.status === 'pending_confirmation' || s.status === 'pending')
    ).length;
  }, [allSwaps, currentUser]);

  const myRequestsCount = useMemo(() => {
    if (!currentUser) return 0;
    return allSwaps.filter(
      (s) =>
        s.requesterId === currentUser.id &&
        (s.status === 'pending_confirmation' ||
          s.status === 'pending' ||
          s.status === 'confirmed')
    ).length;
  }, [allSwaps, currentUser]);

  const completedCount = useMemo(() => {
    if (!currentUser) return 0;
    return allSwaps.filter(
      (s) =>
        (s.requesterId === currentUser.id || s.targetEmployeeId === currentUser.id) &&
        (s.status === 'approved' || s.status === 'rejected' || s.status === 'cancelled')
    ).length;
  }, [allSwaps, currentUser]);

  const handleConfirm = (swapId: string) => {
    if (!currentUser) return;
    confirmSwap(swapId, currentUser.id);
  };

  const handleOpenReject = (swapId: string) => {
    setRejectingSwapId(swapId);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = () => {
    if (!rejectingSwapId || !currentUser || !rejectReason.trim()) return;
    rejectSwap(rejectingSwapId, rejectReason.trim(), currentUser.id);
    setRejectModalOpen(false);
    setRejectingSwapId(null);
    setRejectReason('');
  };

  const handleApprove = (swapId: string) => {
    if (!currentUser) return;
    approveSwap(swapId, currentUser.id);
  };

  const handleCancel = (swapId: string) => {
    cancelSwap(swapId);
  };

  const tabs = [
    { key: 'pending_me', label: '待我确认', count: pendingMeCount },
    { key: 'my_requests', label: '我发起的', count: myRequestsCount },
    { key: 'completed', label: '已完成', count: completedCount },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h1 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-brand-600" />
            换班申请
          </h1>
        </div>
        <div className="px-6">
          <Tabs
            tabs={tabs}
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as TabKey)}
          />
        </div>
        <div className="p-6">
          {sortedSwaps.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400">
              <Inbox className="w-14 h-14 mb-3 text-slate-300" />
              <p className="text-sm">
                {activeTab === 'pending_me' && '暂无待确认的换班申请'}
                {activeTab === 'my_requests' && '暂无发起中的换班申请'}
                {activeTab === 'completed' && '暂无已完成的换班申请'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedSwaps.map((swap) => (
                <SwapCard
                  key={swap.id}
                  swap={swap}
                  shiftsMap={shiftsMap}
                  employeesMap={employeesMap}
                  positionsMap={positionsMap}
                  currentUserId={currentUser?.id || ''}
                  currentUserRole={currentUser?.role}
                  onConfirm={handleConfirm}
                  onReject={handleOpenReject}
                  onApprove={handleApprove}
                  onCancel={handleCancel}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="拒绝换班申请"
        width="max-w-sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectModalOpen(false)}>
              取消
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmReject}
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
            rows={4}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
          />
        </div>
      </Modal>
    </div>
  );
}
