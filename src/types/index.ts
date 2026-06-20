export interface TimeSlot {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
}

export interface BusinessHours {
  start: string;
  end: string;
}

export interface Store {
  id: string;
  name: string;
  address: string;
  createdAt?: string;
  businessHours?: BusinessHours;
  shifts?: TimeSlot[];
}

export interface Position {
  id: string;
  storeId: string;
  name: string;
  description?: string;
  requiredQualifications?: string[];
}

export interface Employee {
  id: string;
  storeId: string;
  name: string;
  positionIds: string[];
  maxWeeklyHours: number;
  maxConsecutiveDays?: number;
  role?: 'manager' | 'employee';
  qualifications?: string[];
  availableTimes?: { [key: number]: string[] };
  availability?: EmployeeAvailability[];
}

export interface EmployeeAvailability {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface ScheduleShift {
  id: string;
  storeId: string;
  positionId: string;
  employeeId?: string;
  date: string;
  startTime: string;
  endTime: string;
  isSettled: boolean;
  anomalies: string[];
  timeSlotId?: string;
  isAbsent?: boolean;
  isBorrowed?: boolean;
  settledAt?: string;
  sourceStoreId?: string;
}

export interface ShiftSwap {
  id: string;
  storeId?: string;
  requesterId: string;
  requesterShiftId: string;
  targetEmployeeId: string;
  targetShiftId?: string;
  status: 'pending' | 'pending_confirmation' | 'confirmed' | 'approved' | 'rejected' | 'cancelled';
  reason?: string;
  rejectReason?: string;
  rejectorId?: string;
  managerId?: string;
  createdAt?: string;
  requestedAt?: string;
  confirmedAt?: string;
  approvedAt?: string;
}

export interface AbsenceRecord {
  id: string;
  shiftId: string;
  employeeId: string;
  reason: string;
  makeupShiftId?: string;
  createdAt?: string;
  date?: string;
  recordedAt?: string;
}

export interface ExportRecord {
  id: string;
  storeId?: string;
  type: 'schedule' | 'settlement' | 'swap' | 'weekly_hours' | 'anomaly_report';
  startDate: string;
  endDate: string;
  createdAt?: string;
  filePath?: string;
  exportedAt?: string;
  exportedBy?: string;
  fileName?: string;
  rowCount?: number;
}

export interface User {
  id: string;
  name: string;
  role: 'manager' | 'employee' | 'admin';
  storeId?: string;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}
