import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from '../components/ui/Toast';
import type {
  User,
  Store as StoreType,
  Position,
  Employee,
  ScheduleShift,
  ShiftSwap,
  AbsenceRecord,
  ExportRecord,
  ValidationResult,
} from '../types';
import {
  mockStores,
  mockPositions,
  mockEmployees,
  mockShifts,
  mockShiftSwaps,
  mockAbsenceRecords,
  mockExportRecords,
} from '../data/mockData';
import {
  generateId,
  calculateHours,
  isTimeOverlap,
  getDayOfWeek,
  parseDate,
  validateShiftEditable,
  validateQualification,
  validateWeeklyHours,
  validateCrossStoreConflict,
  validateAvailableTime,
  validateSwapQualification,
} from '../utils';

interface AppState {
  currentUser: User | null;
  currentStoreId: string;
  stores: StoreType[];
  positions: Position[];
  employees: Employee[];
  shifts: ScheduleShift[];
  shiftSwaps: ShiftSwap[];
  absences: AbsenceRecord[];
  exportRecords: ExportRecord[];

  setCurrentUser: (user: User | null) => void;
  setCurrentStoreId: (id: string) => void;

  addStore: (store: Omit<StoreType, 'id' | 'createdAt'>) => { success: boolean; errors?: string[] };
  updateStore: (id: string, data: Partial<StoreType>) => { success: boolean; errors?: string[] };
  removeStore: (id: string) => { success: boolean; errors?: string[] };

  addPosition: (position: Omit<Position, 'id'>) => { success: boolean; errors?: string[] };
  updatePosition: (id: string, data: Partial<Position>) => { success: boolean; errors?: string[] };
  removePosition: (id: string) => { success: boolean; errors?: string[] };

  addEmployee: (employee: Omit<Employee, 'id'>) => { success: boolean; errors?: string[] };
  updateEmployee: (id: string, data: Partial<Employee>) => { success: boolean; errors?: string[] };
  removeEmployee: (id: string) => { success: boolean; errors?: string[] };

  generateWeeklySchedule: (
    storeId: string,
    weekStart: string,
    weekEnd: string
  ) => { success: boolean; errors: string[]; createdCount: number };

  addShift: (shift: Omit<ScheduleShift, 'id' | 'anomalies' | 'isSettled'>) => {
    success: boolean;
    errors?: string[];
  };
  updateShift: (id: string, data: Partial<ScheduleShift>) => {
    success: boolean;
    errors?: string[];
  };
  removeShift: (id: string) => { success: boolean; errors?: string[] };

  markAbsence: (
    shiftId: string,
    reason: string,
    makeupShiftId?: string
  ) => { success: boolean; errors?: string[] };
  settleShifts: (storeId: string, startDate: string, endDate: string) => void;

  requestShiftSwap: (
    requesterId: string,
    requesterShiftId: string,
    targetEmployeeId: string,
    targetShiftId?: string,
    reason?: string
  ) => { success: boolean; errors?: string[] };
  confirmSwap: (swapId: string, targetEmployeeId: string) => {
    success: boolean;
    errors?: string[];
  };
  rejectSwap: (swapId: string, reason: string, rejectorId: string) => {
    success: boolean;
    errors?: string[];
  };
  approveSwap: (swapId: string, managerId: string) => { success: boolean; errors?: string[] };
  cancelSwap: (swapId: string) => { success: boolean; errors?: string[] };

  addExportRecord: (record: Omit<ExportRecord, 'id' | 'createdAt'>) => void;
}

function collectAnomalies(
  shift: Partial<ScheduleShift>,
  existingShifts: ScheduleShift[],
  employees: Employee[],
  positions: Position[],
  excludeShiftId?: string
): string[] {
  const anomalies: string[] = [];

  if (shift.employeeId) {
    const employee = employees.find((e) => e.id === shift.employeeId);
    const position = positions.find((p) => p.id === shift.positionId);

    if (employee && position) {
      const qualResult = validateQualification(employee, position);
      if (!qualResult.valid) anomalies.push(...qualResult.errors);
      anomalies.push(...(qualResult.warnings || []));
    }

    if (employee && shift.date && shift.startTime && shift.endTime) {
      const weeklyResult = validateWeeklyHours(
        employee,
        existingShifts,
        { ...(shift as ScheduleShift), id: excludeShiftId || 'temp' } as ScheduleShift
      );
      if (!weeklyResult.valid) anomalies.push(...weeklyResult.errors);
      anomalies.push(...(weeklyResult.warnings || []));

      const conflictResult = validateCrossStoreConflict(
        shift.employeeId,
        existingShifts,
        shift.date,
        shift.startTime,
        shift.endTime,
        excludeShiftId
      );
      if (!conflictResult.valid) anomalies.push(...conflictResult.errors);
      anomalies.push(...(conflictResult.warnings || []));

      const availResult = validateAvailableTime(
        employee,
        parseDate(shift.date),
        shift.startTime,
        shift.endTime
      );
      anomalies.push(...availResult.errors);
      anomalies.push(...(availResult.warnings || []));
    }
  }

  return anomalies;
}

function isEmployeeQualifiedForPosition(employee: Employee, positionId: string, positions: Position[]): boolean {
  const position = positions.find((p) => p.id === positionId);
  if (!position) return false;
  const result = validateQualification(employee, position);
  return result.valid;
}

function isEmployeeAvailableAt(
  employee: Employee,
  date: string,
  startTime: string,
  endTime: string
): boolean {
  const result = validateAvailableTime(employee, parseDate(date), startTime, endTime);
  return result.valid;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: {
        id: 'user_manager_1',
        name: '张店长',
        role: 'manager',
        storeId: 'store_center',
      },
      currentStoreId: 'store_center',
      stores: mockStores,
      positions: mockPositions,
      employees: mockEmployees,
      shifts: mockShifts,
      shiftSwaps: mockShiftSwaps,
      absences: mockAbsenceRecords,
      exportRecords: mockExportRecords,

      setCurrentUser: (user) => set({ currentUser: user }),
      setCurrentStoreId: (id) => set({ currentStoreId: id }),

      addStore: (store) => {
        if (!store.name?.trim()) {
          toast.error('门店名称不能为空');
          return { success: false, errors: ['门店名称不能为空'] };
        }
        const newStore: StoreType = {
          ...store,
          id: generateId('store'),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ stores: [...state.stores, newStore] }));
        toast.success('门店创建成功');
        return { success: true };
      },

      updateStore: (id, data) => {
        const store = get().stores.find((s) => s.id === id);
        if (!store) {
          toast.error('门店不存在');
          return { success: false, errors: ['门店不存在'] };
        }
        if (data.name !== undefined && !data.name.trim()) {
          toast.error('门店名称不能为空');
          return { success: false, errors: ['门店名称不能为空'] };
        }
        set((state) => ({
          stores: state.stores.map((s) => (s.id === id ? { ...s, ...data } : s)),
        }));
        toast.success('门店更新成功');
        return { success: true };
      },

      removeStore: (id) => {
        const hasRelatedData =
          get().positions.some((p) => p.storeId === id) ||
          get().employees.some((e) => e.storeId === id) ||
          get().shifts.some((s) => s.storeId === id);
        if (hasRelatedData) {
          toast.error('该门店下存在关联数据，无法删除');
          return { success: false, errors: ['该门店下存在关联数据，无法删除'] };
        }
        set((state) => ({
          stores: state.stores.filter((s) => s.id !== id),
          currentStoreId: state.currentStoreId === id ? '' : state.currentStoreId,
        }));
        toast.success('门店删除成功');
        return { success: true };
      },

      addPosition: (position) => {
        if (!position.name?.trim()) {
          toast.error('岗位名称不能为空');
          return { success: false, errors: ['岗位名称不能为空'] };
        }
        if (!position.storeId) {
          toast.error('岗位必须关联门店');
          return { success: false, errors: ['岗位必须关联门店'] };
        }
        const newPosition: Position = { ...position, id: generateId('pos') };
        set((state) => ({ positions: [...state.positions, newPosition] }));
        toast.success('岗位创建成功');
        return { success: true };
      },

      updatePosition: (id, data) => {
        const position = get().positions.find((p) => p.id === id);
        if (!position) {
          toast.error('岗位不存在');
          return { success: false, errors: ['岗位不存在'] };
        }
        if (data.name !== undefined && !data.name.trim()) {
          toast.error('岗位名称不能为空');
          return { success: false, errors: ['岗位名称不能为空'] };
        }
        set((state) => ({
          positions: state.positions.map((p) => (p.id === id ? { ...p, ...data } : p)),
        }));
        toast.success('岗位更新成功');
        return { success: true };
      },

      removePosition: (id) => {
        const hasRelatedShifts = get().shifts.some((s) => s.positionId === id);
        const hasRelatedEmployees = get().employees.some((e) => e.positionIds.includes(id));
        if (hasRelatedShifts || hasRelatedEmployees) {
          toast.error('该岗位下存在关联数据，无法删除');
          return { success: false, errors: ['该岗位下存在关联数据，无法删除'] };
        }
        set((state) => ({ positions: state.positions.filter((p) => p.id !== id) }));
        toast.success('岗位删除成功');
        return { success: true };
      },

      addEmployee: (employee) => {
        if (!employee.name?.trim()) {
          toast.error('员工姓名不能为空');
          return { success: false, errors: ['员工姓名不能为空'] };
        }
        if (!employee.storeId) {
          toast.error('员工必须关联门店');
          return { success: false, errors: ['员工必须关联门店'] };
        }
        if (employee.maxWeeklyHours !== undefined && employee.maxWeeklyHours < 0) {
          toast.error('每周最大工时不能为负数');
          return { success: false, errors: ['每周最大工时不能为负数'] };
        }
        const newEmployee: Employee = { ...employee, id: generateId('emp') };
        set((state) => ({ employees: [...state.employees, newEmployee] }));
        toast.success('员工创建成功');
        return { success: true };
      },

      updateEmployee: (id, data) => {
        const employee = get().employees.find((e) => e.id === id);
        if (!employee) {
          toast.error('员工不存在');
          return { success: false, errors: ['员工不存在'] };
        }
        if (data.name !== undefined && !data.name.trim()) {
          toast.error('员工姓名不能为空');
          return { success: false, errors: ['员工姓名不能为空'] };
        }
        if (data.maxWeeklyHours !== undefined && data.maxWeeklyHours < 0) {
          toast.error('每周最大工时不能为负数');
          return { success: false, errors: ['每周最大工时不能为负数'] };
        }
        set((state) => ({
          employees: state.employees.map((e) => (e.id === id ? { ...e, ...data } : e)),
        }));
        toast.success('员工更新成功');
        return { success: true };
      },

      removeEmployee: (id) => {
        const hasSettledShifts = get().shifts.some(
          (s) => s.employeeId === id && s.isSettled
        );
        if (hasSettledShifts) {
          toast.error('该员工存在已结算班次，无法删除');
          return { success: false, errors: ['该员工存在已结算班次，无法删除'] };
        }
        set((state) => ({
          employees: state.employees.filter((e) => e.id !== id),
          shifts: state.shifts.map((s) =>
            s.employeeId === id ? { ...s, employeeId: undefined } : s
          ),
        }));
        toast.success('员工删除成功');
        return { success: true };
      },

      generateWeeklySchedule: (storeId, weekStart, weekEnd) => {
        const errors: string[] = [];
        let createdCount = 0;

        const storePositions = get().positions.filter((p) => p.storeId === storeId);
        const storeEmployees = get().employees.filter((e) => e.storeId === storeId);
        const existingShifts = get().shifts.filter(
          (s) => s.storeId === storeId && s.date >= weekStart && s.date <= weekEnd
        );

        if (storePositions.length === 0) {
          errors.push('该门店下暂无岗位配置');
          return { success: false, errors, createdCount: 0 };
        }
        if (storeEmployees.length === 0) {
          errors.push('该门店下暂无员工配置');
          return { success: false, errors, createdCount: 0 };
        }

        const timeSlots = [
          { startTime: '08:00', endTime: '12:00' },
          { startTime: '12:00', endTime: '16:00' },
          { startTime: '16:00', endTime: '20:00' },
        ];

        const currentDate = new Date(weekStart);
        const endDate = new Date(weekEnd);
        const newShifts: ScheduleShift[] = [];

        const employeeShiftCount: Record<string, number> = {};
        storeEmployees.forEach((e) => {
          employeeShiftCount[e.id] = 0;
        });

        while (currentDate <= endDate) {
          const dateStr = currentDate.toISOString().split('T')[0];

          for (const position of storePositions) {
            for (const slot of timeSlots) {
              const existing = existingShifts.find(
                (s) =>
                  s.date === dateStr &&
                  s.positionId === position.id &&
                  s.startTime === slot.startTime &&
                  s.endTime === slot.endTime
              );
              if (existing) continue;

              const availableEmployees = storeEmployees.filter((emp) => {
                if (!isEmployeeQualifiedForPosition(emp, position.id, storePositions)) return false;
                if (!isEmployeeAvailableAt(emp, dateStr, slot.startTime, slot.endTime)) return false;
                if (
                  validateCrossStoreConflict(
                    emp.id,
                    [...existingShifts, ...newShifts],
                    dateStr,
                    slot.startTime,
                    slot.endTime
                  ).valid === false
                )
                  return false;
                const currentHours = calculateHours;
                const weeklyCheck = validateWeeklyHours(
                  emp,
                  [...existingShifts, ...newShifts],
                  {
                    id: 'temp_check',
                    storeId,
                    positionId: position.id,
                    employeeId: emp.id,
                    date: dateStr,
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    isSettled: false,
                    anomalies: [],
                  }
                );
                if (!weeklyCheck.valid) return false;
                return true;
              });

              if (availableEmployees.length === 0) {
                errors.push(
                  `${dateStr} ${slot.startTime}-${slot.endTime} ${position.name} 暂无可用员工`
                );
                const anomalies = collectAnomalies(
                  {
                    storeId,
                    positionId: position.id,
                    date: dateStr,
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                  },
                  [...existingShifts, ...newShifts],
                  storeEmployees,
                  storePositions
                );
                newShifts.push({
                  id: generateId('shift'),
                  storeId,
                  positionId: position.id,
                  date: dateStr,
                  startTime: slot.startTime,
                  endTime: slot.endTime,
                  isSettled: false,
                  anomalies,
                });
                createdCount++;
                continue;
              }

              availableEmployees.sort(
                (a, b) => employeeShiftCount[a.id] - employeeShiftCount[b.id]
              );
              const selectedEmployee = availableEmployees[0];
              employeeShiftCount[selectedEmployee.id]++;

              const shiftData = {
                storeId,
                positionId: position.id,
                employeeId: selectedEmployee.id,
                date: dateStr,
                startTime: slot.startTime,
                endTime: slot.endTime,
              };
              const anomalies = collectAnomalies(
                shiftData,
                [...existingShifts, ...newShifts],
                storeEmployees,
                storePositions
              );
              newShifts.push({
                ...shiftData,
                id: generateId('shift'),
                isSettled: false,
                anomalies,
              });
              createdCount++;
            }
          }

          currentDate.setDate(currentDate.getDate() + 1);
        }

        set((state) => ({ shifts: [...state.shifts, ...newShifts] }));
        toast.success(`已生成 ${createdCount} 个班次`);
        return { success: errors.length === 0, errors, createdCount };
      },

      addShift: (shift) => {
        const anomalies = collectAnomalies(
          shift,
          get().shifts,
          get().employees,
          get().positions
        );
        const newShift: ScheduleShift = {
          ...shift,
          id: generateId('shift'),
          isSettled: false,
          anomalies,
        };
        set((state) => ({ shifts: [...state.shifts, newShift] }));
        toast.success('班次创建成功');
        return { success: true };
      },

      updateShift: (id, data) => {
        const shift = get().shifts.find((s) => s.id === id);
        if (!shift) {
          toast.error('班次不存在');
          return { success: false, errors: ['班次不存在'] };
        }
        const editableCheck = validateShiftEditable(shift);
        if (!editableCheck.valid) {
          toast.error(editableCheck.errors[0]);
          return { success: false, errors: editableCheck.errors };
        }
        const merged = { ...shift, ...data };
        const anomalies = collectAnomalies(
          merged,
          get().shifts,
          get().employees,
          get().positions,
          id
        );
        set((state) => ({
          shifts: state.shifts.map((s) => (s.id === id ? { ...merged, anomalies } : s)),
        }));
        toast.success('班次更新成功');
        return { success: true };
      },

      removeShift: (id) => {
        const shift = get().shifts.find((s) => s.id === id);
        if (!shift) {
          toast.error('班次不存在');
          return { success: false, errors: ['班次不存在'] };
        }
        const editableCheck = validateShiftEditable(shift);
        if (!editableCheck.valid) {
          toast.error(editableCheck.errors[0]);
          return { success: false, errors: editableCheck.errors };
        }
        set((state) => ({ shifts: state.shifts.filter((s) => s.id !== id) }));
        toast.success('班次删除成功');
        return { success: true };
      },

      markAbsence: (shiftId, reason, makeupShiftId) => {
        const shift = get().shifts.find((s) => s.id === shiftId);
        if (!shift) {
          toast.error('班次不存在');
          return { success: false, errors: ['班次不存在'] };
        }
        if (!shift.employeeId) {
          toast.error('该班次未分配员工');
          return { success: false, errors: ['该班次未分配员工'] };
        }
        if (makeupShiftId) {
          const makeupShift = get().shifts.find((s) => s.id === makeupShiftId);
          if (!makeupShift) {
            toast.error('补班班次不存在');
            return { success: false, errors: ['补班班次不存在'] };
          }
        }
        const absence: AbsenceRecord = {
          id: generateId('absence'),
          shiftId,
          employeeId: shift.employeeId,
          reason,
          makeupShiftId,
          createdAt: new Date().toISOString(),
          recordedAt: new Date().toISOString(),
        };
        set((state) => ({
          absences: [...state.absences, absence],
          shifts: state.shifts.map((s) => (s.id === shiftId ? { ...s, isAbsent: true } : s)),
        }));
        toast.success('缺勤已记录');
        return { success: true };
      },

      settleShifts: (storeId, startDate, endDate) => {
        set((state) => ({
          shifts: state.shifts.map((s) =>
            s.storeId === storeId && s.date >= startDate && s.date <= endDate
              ? { ...s, isSettled: true, settledAt: new Date().toISOString() }
              : s
          ),
        }));
        toast.success('班次结算完成');
      },

      requestShiftSwap: (requesterId, requesterShiftId, targetEmployeeId, targetShiftId, reason) => {
        const requesterShift = get().shifts.find((s) => s.id === requesterShiftId);
        const storeId = requesterShift?.storeId || get().currentStoreId;

        if (!requesterShift) {
          toast.error('请求换班的班次不存在');
          return { success: false, errors: ['请求换班的班次不存在'] };
        }
        if (requesterShift.isSettled) {
          toast.error('已结算班次不能申请换班');
          return { success: false, errors: ['已结算班次不能申请换班'] };
        }
        if (requesterShift.employeeId !== requesterId) {
          toast.error('只能申请自己班次的换班');
          return { success: false, errors: ['只能申请自己班次的换班'] };
        }

        const targetEmployee = get().employees.find((e) => e.id === targetEmployeeId);
        if (!targetEmployee) {
          toast.error('目标员工不存在');
          return { success: false, errors: ['目标员工不存在'] };
        }

        if (targetShiftId) {
          const targetShift = get().shifts.find((s) => s.id === targetShiftId);
          if (!targetShift) {
            toast.error('目标班次不存在');
            return { success: false, errors: ['目标班次不存在'] };
          }
          if (targetShift.isSettled) {
            toast.error('已结算班次不能进行换班');
            return { success: false, errors: ['已结算班次不能进行换班'] };
          }
          if (targetShift.employeeId !== targetEmployeeId) {
            toast.error('目标班次不属于目标员工');
            return { success: false, errors: ['目标班次不属于目标员工'] };
          }
          if (targetShift.storeId !== requesterShift.storeId) {
            toast.error('跨门店换班不支持');
            return { success: false, errors: ['跨门店换班不支持'] };
          }

          const requester = get().employees.find((e) => e.id === requesterId);
          if (requester && targetEmployee) {
            const swapQualResult = validateSwapQualification(
              requester,
              targetEmployee,
              requesterShift,
              targetShift,
              get().positions
            );
            if (!swapQualResult.valid) {
              toast.error(swapQualResult.errors[0]);
              return { success: false, errors: swapQualResult.errors };
            }
          }
        }

        const swap: ShiftSwap = {
          id: generateId('swap'),
          storeId,
          requesterId,
          requesterShiftId,
          targetEmployeeId,
          targetShiftId,
          status: 'pending_confirmation',
          reason,
          requestedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ shiftSwaps: [...state.shiftSwaps, swap] }));
        toast.success('换班申请已提交');
        return { success: true };
      },

      confirmSwap: (swapId, targetEmployeeId) => {
        const swap = get().shiftSwaps.find((s) => s.id === swapId);
        if (!swap) {
          toast.error('换班申请不存在');
          return { success: false, errors: ['换班申请不存在'] };
        }
        if (swap.status !== 'pending_confirmation') {
          toast.error('该换班申请状态不支持确认');
          return { success: false, errors: ['该换班申请状态不支持确认'] };
        }
        if (swap.targetEmployeeId !== targetEmployeeId) {
          toast.error('无权确认此换班申请');
          return { success: false, errors: ['无权确认此换班申请'] };
        }
        set((state) => ({
          shiftSwaps: state.shiftSwaps.map((s) =>
            s.id === swapId
              ? { ...s, status: 'confirmed', confirmedAt: new Date().toISOString() }
              : s
          ),
        }));
        toast.success('已确认换班申请，等待店长审批');
        return { success: true };
      },

      rejectSwap: (swapId, reason, rejectorId) => {
        const swap = get().shiftSwaps.find((s) => s.id === swapId);
        if (!swap) {
          toast.error('换班申请不存在');
          return { success: false, errors: ['换班申请不存在'] };
        }
        if (swap.status !== 'pending_confirmation' && swap.status !== 'confirmed') {
          toast.error('该换班申请状态不支持拒绝');
          return { success: false, errors: ['该换班申请状态不支持拒绝'] };
        }
        set((state) => ({
          shiftSwaps: state.shiftSwaps.map((s) =>
            s.id === swapId
              ? { ...s, status: 'rejected', rejectReason: reason, rejectorId }
              : s
          ),
        }));
        toast.success('已拒绝换班申请');
        return { success: true };
      },

      approveSwap: (swapId, managerId) => {
        const swap = get().shiftSwaps.find((s) => s.id === swapId);
        if (!swap) {
          toast.error('换班申请不存在');
          return { success: false, errors: ['换班申请不存在'] };
        }
        if (swap.status !== 'confirmed') {
          toast.error('该换班申请状态不支持审批');
          return { success: false, errors: ['该换班申请状态不支持审批'] };
        }

        const requesterShift = get().shifts.find((s) => s.id === swap.requesterShiftId);
        if (requesterShift?.isSettled) {
          toast.error('申请方班次已结算，无法审批');
          return { success: false, errors: ['申请方班次已结算，无法审批'] };
        }

        if (swap.targetShiftId) {
          const targetShift = get().shifts.find((s) => s.id === swap.targetShiftId);
          if (targetShift?.isSettled) {
            toast.error('目标方班次已结算，无法审批');
            return { success: false, errors: ['目标方班次已结算，无法审批'] };
          }
        }

        set((state) => {
          let newShifts = [...state.shifts];

          if (swap.targetShiftId) {
            const reqShift = newShifts.find((s) => s.id === swap.requesterShiftId);
            const tgtShift = newShifts.find((s) => s.id === swap.targetShiftId);
            if (reqShift && tgtShift) {
              const reqEmployeeId = reqShift.employeeId;
              const tgtEmployeeId = tgtShift.employeeId;
              newShifts = newShifts.map((s) => {
                if (s.id === swap.requesterShiftId) {
                  return { ...s, employeeId: tgtEmployeeId };
                }
                if (s.id === swap.targetShiftId) {
                  return { ...s, employeeId: reqEmployeeId };
                }
                return s;
              });
            }
          } else {
            newShifts = newShifts.map((s) =>
              s.id === swap.requesterShiftId
                ? { ...s, employeeId: swap.targetEmployeeId }
                : s
            );
          }

          return {
            shifts: newShifts,
            shiftSwaps: state.shiftSwaps.map((s) =>
              s.id === swapId
                ? { ...s, status: 'approved', managerId, approvedAt: new Date().toISOString() }
                : s
            ),
          };
        });
        toast.success('换班已审批通过');
        return { success: true };
      },

      cancelSwap: (swapId) => {
        const swap = get().shiftSwaps.find((s) => s.id === swapId);
        if (!swap) {
          toast.error('换班申请不存在');
          return { success: false, errors: ['换班申请不存在'] };
        }
        if (swap.status === 'approved') {
          toast.error('已审批通过的换班不能取消');
          return { success: false, errors: ['已审批通过的换班不能取消'] };
        }
        set((state) => ({
          shiftSwaps: state.shiftSwaps.map((s) =>
            s.id === swapId ? { ...s, status: 'cancelled' } : s
          ),
        }));
        toast.success('换班申请已取消');
        return { success: true };
      },

      addExportRecord: (record) => {
        const newRecord: ExportRecord = {
          ...record,
          id: generateId('export'),
          createdAt: new Date().toISOString(),
          exportedAt: new Date().toISOString(),
        };
        set((state) => ({ exportRecords: [...state.exportRecords, newRecord] }));
      },
    }),
    {
      name: 'shift-scheduling-system',
    }
  )
);
