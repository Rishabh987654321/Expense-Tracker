import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import Footer from './Footer';

export default function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="h-screen flex flex-col">
      <Topbar onMenuClick={() => setMobileOpen(true)} />
      <div className="flex-1 flex min-h-0">
        <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
        <main className="flex-1 overflow-y-auto bg-muted/20">
          <div className="mx-auto w-full max-w-7xl p-4 sm:p-6">
            <Outlet />
          </div>
          <Footer className="bg-background" />
        </main>
      </div>
    </div>
  );
}
