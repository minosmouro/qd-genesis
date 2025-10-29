import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, Sun, Moon } from 'lucide-react';
import Button from '@/components/ui/Button';
import Sidebar from '@/components/Sidebar';
import { useTheme } from '@/contexts/ThemeContext';
import TokenStatus from '@/components/TokenStatus';
import { cn } from '@/utils/cn';

const Layout: React.FC = () => {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-text-primary flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background text-text-primary flex">
      <Sidebar />
      <div className="flex-1 flex flex-col md:pl-64">
        {/* Top Header with glassmorphism */}
        <header className="bg-surface/50 backdrop-blur-xl border-b border-border/50 shadow-soft sticky top-0 z-40">
          <div className="flex justify-end items-center h-16 px-6 gap-4">
            {/* Theme Toggle with modern styling */}
            <button
              onClick={toggleTheme}
              className="relative p-2 rounded-lg bg-surface/80 hover:bg-surface border border-border/50 transition-all duration-200 hover:scale-105 group"
              aria-label="Toggle theme"
            >
              <div className="relative w-5 h-5">
                <Sun className={cn(
                  "h-5 w-5 absolute inset-0 transition-all duration-300",
                  theme === 'dark' ? 'rotate-0 scale-100 opacity-100' : 'rotate-90 scale-0 opacity-0'
                )} />
                <Moon className={cn(
                  "h-5 w-5 absolute inset-0 transition-all duration-300",
                  theme === 'light' ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
                )} />
              </div>
            </button>

            {/* Token status visible on all pages */}
            <div className="hidden sm:flex items-center">
              <TokenStatus pollIntervalMs={5 * 60 * 1000} />
            </div>

            {/* User Menu with avatar */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface/80 border border-border/50">
                <div className="w-8 h-8 rounded-full bg-brand-navy dark:bg-brand-navy-light flex items-center justify-center text-white font-semibold text-sm">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-text-primary hidden md:block">
                  {user?.username}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="flex items-center gap-2 hover:text-danger transition-colors"
                aria-label="Sair"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden md:inline">Sair</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto px-4 md:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
