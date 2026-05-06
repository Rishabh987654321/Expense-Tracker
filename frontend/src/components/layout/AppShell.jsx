import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import Footer from './Footer';

export default function AppShell() {
  return (
    <div className="h-screen flex flex-col">
      <Topbar />
      <div className="flex-1 flex min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-muted/20">
          <div className="mx-auto w-full max-w-7xl p-6">
            <Outlet />
          </div>
          <Footer className="bg-background" />
        </main>
      </div>
    </div>
  );
}
