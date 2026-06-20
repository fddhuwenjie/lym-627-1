import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/Layout/AppLayout";
import StoreCalendar from "@/pages/StoreCalendar";
import MySchedule from "@/pages/MySchedule";
import ShiftSwaps from "@/pages/ShiftSwaps";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<StoreCalendar />} />
          <Route path="/my-schedule" element={<MySchedule />} />
          <Route path="/shift-swaps" element={<ShiftSwaps />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}
