import { useMemo } from 'react';
import { useAppStore } from './index';
import type {
  User,
  Store as StoreType,
  Position,
  Employee,
  ScheduleShift,
  ShiftSwap,
  AbsenceRecord,
  ExportRecord,
} from '../types';

export function useCurrentUser(): User | null {
  return useAppStore((state) => state.currentUser);
}

export function useCurrentStoreId(): string {
  return useAppStore((state) => state.currentStoreId);
}

export function useStores(): StoreType[] {
  return useAppStore((state) => state.stores);
}

export function useAllPositions(): Position[] {
  return useAppStore((state) => state.positions);
}

export function usePositions(storeId?: string): Position[] {
  const positions = useAllPositions();
  return useMemo(() => {
    if (!storeId) return positions;
    return positions.filter((p) => p.storeId === storeId);
  }, [positions, storeId]);
}

export function useAllEmployees(): Employee[] {
  return useAppStore((state) => state.employees);
}

export function useEmployees(storeId?: string): Employee[] {
  const employees = useAllEmployees();
  return useMemo(() => {
    if (!storeId) return employees;
    return employees.filter((e) => e.storeId === storeId);
  }, [employees, storeId]);
}

export function useAllShifts(): ScheduleShift[] {
  return useAppStore((state) => state.shifts);
}

export function useShifts(storeId?: string, startDate?: string, endDate?: string): ScheduleShift[] {
  const shifts = useAllShifts();
  return useMemo(() => {
    return shifts.filter((s) => {
      if (storeId && s.storeId !== storeId) return false;
      if (startDate && s.date < startDate) return false;
      if (endDate && s.date > endDate) return false;
      return true;
    });
  }, [shifts, storeId, startDate, endDate]);
}

export function useAllShiftSwaps(): ShiftSwap[] {
  return useAppStore((state) => state.shiftSwaps);
}

export function useShiftSwaps(storeId?: string): ShiftSwap[] {
  const swaps = useAllShiftSwaps();
  return useMemo(() => {
    if (!storeId) return swaps;
    return swaps.filter((s) => s.storeId === storeId);
  }, [swaps, storeId]);
}

export function useAllAbsences(): AbsenceRecord[] {
  return useAppStore((state) => state.absences);
}

export function useAbsences(storeId?: string): AbsenceRecord[] {
  const shifts = useAllShifts();
  const absences = useAllAbsences();
  return useMemo(() => {
    if (!storeId) return absences;
    const shiftIds = new Set(shifts.filter((s) => s.storeId === storeId).map((s) => s.id));
    return absences.filter((a) => shiftIds.has(a.shiftId));
  }, [shifts, absences, storeId]);
}

export function useAllExportRecords(): ExportRecord[] {
  return useAppStore((state) => state.exportRecords);
}

export function useExportRecords(storeId?: string): ExportRecord[] {
  const records = useAllExportRecords();
  return useMemo(() => {
    if (!storeId) return records;
    return records.filter((r) => r.storeId === storeId);
  }, [records, storeId]);
}

export function useCurrentStore(): StoreType | null {
  const currentStoreId = useCurrentStoreId();
  const stores = useStores();
  return useMemo(() => {
    return stores.find((s) => s.id === currentStoreId) || null;
  }, [stores, currentStoreId]);
}

export function useShiftById(id: string): ScheduleShift | undefined {
  const shifts = useAllShifts();
  return useMemo(() => shifts.find((s) => s.id === id), [shifts, id]);
}

export function useEmployeeById(id: string): Employee | undefined {
  const employees = useAllEmployees();
  return useMemo(() => employees.find((e) => e.id === id), [employees, id]);
}

export function usePositionById(id: string): Position | undefined {
  const positions = useAllPositions();
  return useMemo(() => positions.find((p) => p.id === id), [positions, id]);
}

export function useSwapById(id: string): ShiftSwap | undefined {
  const swaps = useAllShiftSwaps();
  return useMemo(() => swaps.find((s) => s.id === id), [swaps, id]);
}

export function getStoreActions() {
  const s = useAppStore.getState();
  return {
    setCurrentUser: s.setCurrentUser,
    setCurrentStoreId: s.setCurrentStoreId,
    addStore: s.addStore,
    updateStore: s.updateStore,
    removeStore: s.removeStore,
    addPosition: s.addPosition,
    updatePosition: s.updatePosition,
    removePosition: s.removePosition,
    addEmployee: s.addEmployee,
    updateEmployee: s.updateEmployee,
    removeEmployee: s.removeEmployee,
    generateWeeklySchedule: s.generateWeeklySchedule,
    addShift: s.addShift,
    updateShift: s.updateShift,
    removeShift: s.removeShift,
    markAbsence: s.markAbsence,
    settleShifts: s.settleShifts,
    requestShiftSwap: s.requestShiftSwap,
    confirmSwap: s.confirmSwap,
    rejectSwap: s.rejectSwap,
    approveSwap: s.approveSwap,
    cancelSwap: s.cancelSwap,
    addExportRecord: s.addExportRecord,
  };
}
