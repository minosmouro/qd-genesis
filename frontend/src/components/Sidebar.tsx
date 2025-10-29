import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Home,
  Users,
  Handshake,
  Settings,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Shield,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import Button from '@/components/ui/Button';
import Logo from '@/components/Logo';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, badge: null },
  { name: 'Imóveis', href: '/properties', icon: Home, badge: null },
  { name: 'Parcerias', href: '/partnerships', icon: Users, badge: null },
  { name: 'Refresh CanalPro', href: '/refresh', icon: RotateCcw, badge: null },
  { name: 'Leads', href: '/leads', icon: Handshake, badge: 'Em breve' },
  { name: 'Clientes', href: '/clients', icon: Users, badge: 'Em breve' },
];

const bottomNavigation = [
  { name: 'Configurações', href: '/settings', icon: Settings },
  { name: 'Monitor de Tokens', href: '/tokens', icon: Shield },
];

const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);

  const getLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 relative group overflow-hidden',
      isActive
        ? 'bg-brand-navy dark:bg-brand-navy-light text-white shadow-lg shadow-brand-navy/30 dark:shadow-brand-navy-light/30'
        : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary hover:shadow-sm',
      // foco acessível com token primary
      'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background'
    );

  return (
    <aside
      className={cn(
        // largura responsiva dependendo do estado collapsed
        collapsed ? 'w-20' : 'w-64',
        // aplica token de tipografia e cores com glassmorphism
        'flex-shrink-0 bg-surface/95 backdrop-blur-xl border-r border-border/50 p-4 flex flex-col md:fixed md:top-0 md:bottom-0 md:left-0 md:overflow-auto md:z-50 transition-all duration-300 font-sans shadow-xl'
      )}
    >
      {/* Decorative accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-brand-yellow dark:bg-brand-yellow-light opacity-70" />

      {/* Logo + collapse button */}
      <div className="relative flex items-center h-16 px-2 mb-8">
        <div className="relative">
          <Logo
            size={collapsed ? 'sm' : 'md'}
            className={cn(collapsed ? 'w-8' : 'w-28')}
          />
        </div>
        {/* Nome removido conforme solicitado; manter apenas texto para leitores de tela */}
        <span className="sr-only">QuadraDois</span>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(s => !s)}
          className={cn(
            "absolute right-0 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all duration-200",
            "hover:bg-brand-navy/10 dark:hover:bg-brand-navy-light/10 hover:text-brand-navy dark:hover:text-brand-navy-light hover:scale-110",
            "border border-transparent hover:border-brand-navy/20 dark:hover:border-brand-navy-light/20"
          )}
          aria-label={
            collapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'
          }
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Section Label */}
      {!collapsed && (
          <div className="mb-3 px-3 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-brand-yellow dark:text-brand-yellow-light" />
          <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">
            Menu Principal
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav
        className="flex-1 flex flex-col gap-y-1.5"
        role="navigation"
        aria-label="Navegação principal"
      >
        {navigation.map((item, index) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={getLinkClass}
            title={item.name}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            {/* Active indicator line */}
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full shadow-lg shadow-white/50" />
                )}
                
                {/* Icon with glow effect when active */}
                <div className={cn(
                  "relative flex items-center justify-center",
                  collapsed ? 'mx-auto' : ''
                )}>
                  {isActive && (
                    <div className="absolute inset-0 bg-white/20 rounded-lg blur-md" />
                  )}
                  <item.icon className={cn(
                    'h-5 w-5 relative z-10',
                    isActive && 'drop-shadow-lg'
                  )} />
                </div>

                {/* Label */}
                <span className={cn(
                  'truncate relative z-10',
                  collapsed ? 'sr-only' : 'flex-1'
                )}>
                  {item.name}
                </span>

                {/* Badge */}
                {!collapsed && item.badge && (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-brand-navy/10 dark:bg-brand-yellow-light/20 text-brand-navy dark:text-brand-yellow-light rounded-full border border-brand-navy/20 dark:border-brand-yellow-light/30">
                    {item.badge}
                  </span>
                )}

                {/* Hover effect overlay */}
                <div className="absolute inset-0 bg-brand-yellow/5 dark:bg-brand-yellow-light/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Navigation */}
      <div className="mt-auto pt-4 border-t border-border/50">
        {!collapsed && (
          <div className="mb-3 px-3 flex items-center gap-2">
            <Settings className="w-3.5 h-3.5 text-text-secondary" />
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">
              Sistema
            </span>
          </div>
        )}
        <nav
          className="flex flex-col gap-y-1.5"
          role="navigation"
          aria-label="Navegação secundária"
        >
          {bottomNavigation.map(item => (
            <NavLink
              key={item.name}
              to={item.href}
              className={getLinkClass}
              title={item.name}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full shadow-lg shadow-white/50" />
                  )}
                  
                  <div className={cn(
                    "relative flex items-center justify-center",
                    collapsed ? 'mx-auto' : ''
                  )}>
                    {isActive && (
                      <div className="absolute inset-0 bg-white/20 rounded-lg blur-md" />
                    )}
                    <item.icon className={cn(
                      'h-5 w-5 relative z-10',
                      isActive && 'drop-shadow-lg'
                    )} />
                  </div>

                  <span className={cn(
                    'truncate relative z-10',
                    collapsed ? 'sr-only' : 'flex-1'
                  )}>
                    {item.name}
                  </span>

                  <div className="absolute inset-0 bg-brand-yellow/5 dark:bg-brand-yellow-light/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer info */}
        {!collapsed && (
          <div className="mt-6 px-3 py-3 rounded-xl bg-brand-yellow/5 dark:bg-brand-yellow-light/5 border border-brand-navy/10 dark:border-brand-navy-light/10">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs font-semibold text-text-primary">Sistema Online</span>
            </div>
            <p className="text-[10px] text-text-secondary leading-relaxed">
              Versão 2.0.0 • Todos os sistemas operacionais
            </p>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;