import { useState, useMemo } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Store,
  Users,
  Briefcase,
  X,
  Clock,
} from 'lucide-react';
import {
  useStores,
  usePositions,
  useEmployees,
  getStoreActions,
} from '@/store/hooks';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { Select } from '@/components/ui/Select';
import type { TableColumn } from '@/components/ui/Table';
import { Table } from '@/components/ui/Table';
import { cn } from '@/lib/utils';
import type { Store as StoreType, Position, Employee, EmployeeAvailability } from '@/types';

const QUALIFICATION_OPTIONS = [
  '食品健康证',
  '收银操作证',
  '管理资格证',
];

const WEEK_DAYS = [
  { key: 0, label: '周一' },
  { key: 1, label: '周二' },
  { key: 2, label: '周三' },
  { key: 3, label: '周四' },
  { key: 4, label: '周五' },
  { key: 5, label: '周六' },
  { key: 6, label: '周日' },
];

interface DayTimeSlot {
  startTime: string;
  endTime: string;
}

export default function Settings() {
  const stores = useStores();
  const positions = usePositions();
  const employees = useEmployees();
  const {
    addStore,
    updateStore,
    removeStore,
    addPosition,
    updatePosition,
    removePosition,
    addEmployee,
    updateEmployee,
    removeEmployee,
  } = getStoreActions();

  const [activeTab, setActiveTab] = useState<string>('stores');

  const [storeModalOpen, setStoreModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreType | null>(null);
  const [storeName, setStoreName] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storeStart, setStoreStart] = useState('09:00');
  const [storeEnd, setStoreEnd] = useState('22:00');

  const [positionModalOpen, setPositionModalOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [positionStoreId, setPositionStoreId] = useState('');
  const [positionName, setPositionName] = useState('');
  const [positionQualifications, setPositionQualifications] = useState<string[]>([]);

  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeeName, setEmployeeName] = useState('');
  const [employeeStoreId, setEmployeeStoreId] = useState('');
  const [employeePositionIds, setEmployeePositionIds] = useState<string[]>([]);
  const [employeeQualifications, setEmployeeQualifications] = useState<string[]>([]);
  const [employeeMaxWeeklyHours, setEmployeeMaxWeeklyHours] = useState<number>(40);
  const [employeeAvailability, setEmployeeAvailability] = useState<Record<number, DayTimeSlot[]>>({});

  const openStoreModal = (store?: StoreType) => {
    if (store) {
      setEditingStore(store);
      setStoreName(store.name);
      setStoreAddress(store.address || '');
      setStoreStart(store.businessHours?.start || '09:00');
      setStoreEnd(store.businessHours?.end || '22:00');
    } else {
      setEditingStore(null);
      setStoreName('');
      setStoreAddress('');
      setStoreStart('09:00');
      setStoreEnd('22:00');
    }
    setStoreModalOpen(true);
  };

  const handleSaveStore = () => {
    if (!storeName.trim()) return;
    const storeData = {
      name: storeName.trim(),
      address: storeAddress.trim(),
      businessHours: {
        start: storeStart,
        end: storeEnd,
      },
    };
    if (editingStore) {
      updateStore(editingStore.id, storeData);
    } else {
      addStore(storeData);
    }
    setStoreModalOpen(false);
  };

  const handleDeleteStore = (store: StoreType) => {
    if (window.confirm(`确定删除门店"${store.name}"吗？`)) {
      removeStore(store.id);
    }
  };

  const openPositionModal = (position?: Position) => {
    if (position) {
      setEditingPosition(position);
      setPositionStoreId(position.storeId);
      setPositionName(position.name);
      setPositionQualifications(position.requiredQualifications || []);
    } else {
      setEditingPosition(null);
      setPositionStoreId(stores[0]?.id || '');
      setPositionName('');
      setPositionQualifications([]);
    }
    setPositionModalOpen(true);
  };

  const handleSavePosition = () => {
    if (!positionName.trim() || !positionStoreId) return;
    const positionData = {
      storeId: positionStoreId,
      name: positionName.trim(),
      requiredQualifications: positionQualifications,
    };
    if (editingPosition) {
      updatePosition(editingPosition.id, positionData);
    } else {
      addPosition(positionData);
    }
    setPositionModalOpen(false);
  };

  const handleDeletePosition = (position: Position) => {
    if (window.confirm(`确定删除岗位"${position.name}"吗？`)) {
      removePosition(position.id);
    }
  };

  const toggleQualification = (
    qual: string,
    current: string[],
    setter: (v: string[]) => void
  ) => {
    if (current.includes(qual)) {
      setter(current.filter((q) => q !== qual));
    } else {
      setter([...current, qual]);
    }
  };

  const toggleEmployeePosition = (posId: string) => {
    if (employeePositionIds.includes(posId)) {
      setEmployeePositionIds(employeePositionIds.filter((id) => id !== posId));
    } else {
      setEmployeePositionIds([...employeePositionIds, posId]);
    }
  };

  const openEmployeeModal = (employee?: Employee) => {
    if (employee) {
      setEditingEmployee(employee);
      setEmployeeName(employee.name);
      setEmployeeStoreId(employee.storeId);
      setEmployeePositionIds(employee.positionIds || []);
      setEmployeeQualifications(employee.qualifications || []);
      setEmployeeMaxWeeklyHours(employee.maxWeeklyHours || 40);
      const avail: Record<number, DayTimeSlot[]> = {};
      if (employee.availability) {
        employee.availability.forEach((a) => {
          if (!avail[a.dayOfWeek]) avail[a.dayOfWeek] = [];
          avail[a.dayOfWeek].push({
            startTime: a.startTime,
            endTime: a.endTime,
          });
        });
      }
      setEmployeeAvailability(avail);
    } else {
      setEditingEmployee(null);
      setEmployeeName('');
      setEmployeeStoreId(stores[0]?.id || '');
      setEmployeePositionIds([]);
      setEmployeeQualifications([]);
      setEmployeeMaxWeeklyHours(40);
      setEmployeeAvailability({});
    }
    setEmployeeModalOpen(true);
  };

  const handleSaveEmployee = () => {
    if (!employeeName.trim() || !employeeStoreId) return;

    const availability: EmployeeAvailability[] = [];
    Object.entries(employeeAvailability).forEach(([dayKey, slots]) => {
      slots.forEach((slot) => {
        if (slot.startTime && slot.endTime) {
          availability.push({
            dayOfWeek: Number(dayKey),
            startTime: slot.startTime,
            endTime: slot.endTime,
          });
        }
      });
    });

    const employeeData = {
      storeId: employeeStoreId,
      name: employeeName.trim(),
      positionIds: employeePositionIds,
      qualifications: employeeQualifications,
      maxWeeklyHours: employeeMaxWeeklyHours,
      availability,
    };

    if (editingEmployee) {
      updateEmployee(editingEmployee.id, employeeData);
    } else {
      addEmployee(employeeData);
    }
    setEmployeeModalOpen(false);
  };

  const handleDeleteEmployee = (employee: Employee) => {
    if (window.confirm(`确定删除员工"${employee.name}"吗？`)) {
      removeEmployee(employee.id);
    }
  };

  const addDaySlot = (dayKey: number) => {
    setEmployeeAvailability((prev) => ({
      ...prev,
      [dayKey]: [...(prev[dayKey] || []), { startTime: '09:00', endTime: '18:00' }],
    }));
  };

  const removeDaySlot = (dayKey: number, slotIdx: number) => {
    setEmployeeAvailability((prev) => ({
      ...prev,
      [dayKey]: (prev[dayKey] || []).filter((_, idx) => idx !== slotIdx),
    }));
  };

  const updateDaySlot = (
    dayKey: number,
    slotIdx: number,
    field: 'startTime' | 'endTime',
    value: string
  ) => {
    setEmployeeAvailability((prev) => {
      const slots = [...(prev[dayKey] || [])];
      slots[slotIdx] = { ...slots[slotIdx], [field]: value };
      return { ...prev, [dayKey]: slots };
    });
  };

  const filteredPositionsByStore = useMemo(
    () => positions.filter((p) => p.storeId === employeeStoreId),
    [positions, employeeStoreId]
  );

  const storeColumns: TableColumn<StoreType>[] = [
    { key: 'name', title: '门店名称' },
    {
      key: 'address',
      title: '地址',
      render: (row) => row.address || '-',
    },
    {
      key: 'businessHours',
      title: '营业时间',
      render: (row) =>
        row.businessHours
          ? `${row.businessHours.start} ~ ${row.businessHours.end}`
          : '-',
    },
    {
      key: 'action',
      title: '操作',
      width: '160px',
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openStoreModal(row)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteStore(row)}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  const positionColumns: TableColumn<Position>[] = [
    {
      key: 'store',
      title: '所属门店',
      render: (row) => stores.find((s) => s.id === row.storeId)?.name || '-',
    },
    { key: 'name', title: '岗位名称' },
    {
      key: 'qualifications',
      title: '所需资质',
      render: (row) =>
        row.requiredQualifications && row.requiredQualifications.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {row.requiredQualifications.map((q) => (
              <Badge key={q} variant="info">
                {q}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-slate-400">-</span>
        ),
    },
    {
      key: 'action',
      title: '操作',
      width: '160px',
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openPositionModal(row)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeletePosition(row)}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  const employeeColumns: TableColumn<Employee>[] = [
    { key: 'name', title: '姓名' },
    {
      key: 'store',
      title: '所属门店',
      render: (row) => stores.find((s) => s.id === row.storeId)?.name || '-',
    },
    {
      key: 'positions',
      title: '岗位',
      render: (row) => {
        const posNames = row.positionIds
          .map((id) => positions.find((p) => p.id === id)?.name)
          .filter(Boolean);
        return posNames.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {posNames.map((name) => (
              <Badge key={name} variant="info">
                {name}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-slate-400">-</span>
        );
      },
    },
    {
      key: 'qualifications',
      title: '资质',
      render: (row) =>
        row.qualifications && row.qualifications.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {row.qualifications.map((q) => (
              <Badge key={q} variant="success">
                {q}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-slate-400">-</span>
        ),
    },
    {
      key: 'maxWeeklyHours',
      title: '周工时上限',
      render: (row) => `${row.maxWeeklyHours}h`,
    },
    {
      key: 'action',
      title: '操作',
      width: '160px',
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEmployeeModal(row)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteEmployee(row)}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">系统配置</h1>
      </div>

      <Tabs
        tabs={[
          { key: 'stores', label: '门店管理', count: stores.length },
          { key: 'positions', label: '岗位管理', count: positions.length },
          { key: 'employees', label: '员工管理', count: employees.length },
        ]}
        activeKey={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === 'stores' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Store className="h-4 w-4" />
              <span>共 {stores.length} 家门店</span>
            </div>
            <Button onClick={() => openStoreModal()}>
              <Plus className="h-4 w-4" />
              新增门店
            </Button>
          </div>
          <Table<StoreType>
            columns={storeColumns}
            data={stores}
            rowKey="id"
            emptyText="暂无门店数据"
          />
        </div>
      )}

      {activeTab === 'positions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Briefcase className="h-4 w-4" />
              <span>共 {positions.length} 个岗位</span>
            </div>
            <Button
              onClick={() => openPositionModal()}
              disabled={stores.length === 0}
            >
              <Plus className="h-4 w-4" />
              新增岗位
            </Button>
          </div>
          <Table<Position>
            columns={positionColumns}
            data={positions}
            rowKey="id"
            emptyText="暂无岗位数据"
          />
        </div>
      )}

      {activeTab === 'employees' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Users className="h-4 w-4" />
              <span>共 {employees.length} 名员工</span>
            </div>
            <Button
              onClick={() => openEmployeeModal()}
              disabled={stores.length === 0 || positions.length === 0}
            >
              <Plus className="h-4 w-4" />
              新增员工
            </Button>
          </div>
          <Table<Employee>
            columns={employeeColumns}
            data={employees}
            rowKey="id"
            emptyText="暂无员工数据"
          />
        </div>
      )}

      <Modal
        isOpen={storeModalOpen}
        onClose={() => setStoreModalOpen(false)}
        title={editingStore ? '编辑门店' : '新增门店'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setStoreModalOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveStore}>保存</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              门店名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="请输入门店名称"
              className="w-full h-10 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              地址
            </label>
            <input
              type="text"
              value={storeAddress}
              onChange={(e) => setStoreAddress(e.target.value)}
              placeholder="请输入门店地址"
              className="w-full h-10 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                营业开始时间
              </label>
              <input
                type="time"
                value={storeStart}
                onChange={(e) => setStoreStart(e.target.value)}
                className="w-full h-10 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                营业结束时间
              </label>
              <input
                type="time"
                value={storeEnd}
                onChange={(e) => setStoreEnd(e.target.value)}
                className="w-full h-10 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={positionModalOpen}
        onClose={() => setPositionModalOpen(false)}
        title={editingPosition ? '编辑岗位' : '新增岗位'}
        width="max-w-lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPositionModalOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSavePosition}>保存</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              所属门店 <span className="text-red-500">*</span>
            </label>
            <Select
              options={stores.map((s) => ({ value: s.id, label: s.name }))}
              value={positionStoreId}
              onChange={setPositionStoreId}
              placeholder="请选择门店"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              岗位名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={positionName}
              onChange={(e) => setPositionName(e.target.value)}
              placeholder="请输入岗位名称"
              className="w-full h-10 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              所需资质
            </label>
            <div className="flex flex-wrap gap-2">
              {QUALIFICATION_OPTIONS.map((qual) => (
                <button
                  key={qual}
                  type="button"
                  onClick={() =>
                    toggleQualification(
                      qual,
                      positionQualifications,
                      setPositionQualifications
                    )
                  }
                  className={cn(
                    'inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md border transition-colors',
                    positionQualifications.includes(qual)
                      ? 'bg-brand-50 text-brand-700 border-brand-300'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  )}
                >
                  {qual}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={employeeModalOpen}
        onClose={() => setEmployeeModalOpen(false)}
        title={editingEmployee ? '编辑员工' : '新增员工'}
        width="max-w-2xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEmployeeModalOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveEmployee}>保存</Button>
          </>
        }
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                姓名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                placeholder="请输入员工姓名"
                className="w-full h-10 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                所属门店 <span className="text-red-500">*</span>
              </label>
              <Select
                options={stores.map((s) => ({ value: s.id, label: s.name }))}
                value={employeeStoreId}
                onChange={(val) => {
                  setEmployeeStoreId(val);
                  setEmployeePositionIds([]);
                }}
                placeholder="请选择门店"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              岗位（可多选）
            </label>
            <div className="flex flex-wrap gap-2">
              {filteredPositionsByStore.length === 0 ? (
                <span className="text-sm text-slate-400">该门店暂无可选岗位</span>
              ) : (
                filteredPositionsByStore.map((pos) => (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => toggleEmployeePosition(pos.id)}
                    className={cn(
                      'inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md border transition-colors',
                      employeePositionIds.includes(pos.id)
                        ? 'bg-brand-50 text-brand-700 border-brand-300'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    )}
                  >
                    {pos.name}
                  </button>
                ))
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              资质（可多选）
            </label>
            <div className="flex flex-wrap gap-2">
              {QUALIFICATION_OPTIONS.map((qual) => (
                <button
                  key={qual}
                  type="button"
                  onClick={() =>
                    toggleQualification(
                      qual,
                      employeeQualifications,
                      setEmployeeQualifications
                    )
                  }
                  className={cn(
                    'inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md border transition-colors',
                    employeeQualifications.includes(qual)
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  )}
                >
                  {qual}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              周工时上限（小时）
            </label>
            <input
              type="number"
              min={0}
              max={168}
              value={employeeMaxWeeklyHours}
              onChange={(e) =>
                setEmployeeMaxWeeklyHours(Number(e.target.value) || 0)
              }
              className="w-full h-10 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700">
                可用时间配置
              </label>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                可为每天配置多个时段
              </span>
            </div>
            <div className="space-y-2 border border-slate-200 rounded-lg p-3 bg-slate-50/50">
              {WEEK_DAYS.map((day) => {
                const slots = employeeAvailability[day.key] || [];
                return (
                  <div key={day.key} className="flex items-start gap-3">
                    <div className="w-14 flex-shrink-0 pt-2">
                      <span className="text-sm font-medium text-slate-600">
                        {day.label}
                      </span>
                    </div>
                    <div className="flex-1 space-y-2">
                      {slots.map((slot, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2"
                        >
                          <input
                            type="time"
                            value={slot.startTime}
                            onChange={(e) =>
                              updateDaySlot(day.key, idx, 'startTime', e.target.value)
                            }
                            className="h-9 px-2 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                          />
                          <span className="text-slate-400">~</span>
                          <input
                            type="time"
                            value={slot.endTime}
                            onChange={(e) =>
                              updateDaySlot(day.key, idx, 'endTime', e.target.value)
                            }
                            className="h-9 px-2 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                          />
                          <button
                            type="button"
                            onClick={() => removeDaySlot(day.key, idx)}
                            className="h-8 w-8 flex items-center justify-center rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addDaySlot(day.key)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs text-brand-600 hover:bg-brand-50 rounded-md transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                        添加时段
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
