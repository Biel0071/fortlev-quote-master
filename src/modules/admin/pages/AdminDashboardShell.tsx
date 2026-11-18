import { Outlet } from "react-router-dom";

export default function AdminDashboardShell() {
  return (
    <div className="mx-auto w-full max-w-7xl min-w-0 overflow-x-hidden px-3 py-4 sm:px-6 sm:py-6 space-y-5">
      <Outlet />
    </div>
  );
}
