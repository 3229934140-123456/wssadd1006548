import { NavLink, useLocation } from 'react-router-dom';
import { CalendarDays, PlusCircle, FileText, User, Stethoscope } from 'lucide-react';
import { cn } from '@/utils/helpers';
import { useAppStore } from '@/store/useAppStore';

export default function TopNav() {
  const location = useLocation();
  const currentNurse = useAppStore(s => s.currentNurse);

  const navItems = [
    { path: '/', label: '今日待回访', icon: CalendarDays, badge: useAppStore.getState().getTodayPlans().length },
    { path: '/new', label: '新增回访', icon: PlusCircle },
    { path: '/records', label: '回访记录', icon: FileText }
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-md shadow-blue-200">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">口腔回访工作台</h1>
            <p className="text-xs text-slate-500 -mt-0.5">术后回访管理系统</p>
          </div>
        </div>

        <nav className="flex items-center gap-1">
          {navItems.map(({ path, label, icon: Icon, badge }) => {
            const isActive = location.pathname === path;
            return (
              <NavLink
                key={path}
                to={path}
                className={cn(
                  'relative px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                )}
              >
                <Icon className={cn('w-4 h-4', isActive ? 'text-blue-600' : '')} />
                <span>{label}</span>
                {typeof badge === 'number' && badge > 0 && (
                  <span className={cn(
                    'ml-1 px-1.5 py-0.5 rounded-full text-xs font-semibold min-w-[20px] text-center',
                    isActive ? 'bg-blue-600 text-white' : 'bg-red-500 text-white'
                  )}>
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
              <User className="w-4 h-4 text-slate-600" />
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-slate-800 leading-tight">{currentNurse}</p>
              <p className="text-xs text-slate-500 leading-tight">前台护士</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
