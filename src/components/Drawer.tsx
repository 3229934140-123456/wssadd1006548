import { X } from 'lucide-react';
import { cn } from '@/utils/helpers';
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: ReactNode;
}

const widthMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl'
};

export default function Drawer({ open, onClose, title, children, width = 'lg', footer }: DrawerProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 animate-[fadeIn_0.2s_ease]"
        onClick={onClose}
      />
      <div className="absolute right-0 top-0 h-full w-full">
        <div className={cn(
          'ml-auto h-full bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out animate-[slideInRight_0.3s_ease]',
          widthMap[width]
        )}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {children}
          </div>
          {footer && (
            <div className="border-t border-slate-100 px-6 py-4 bg-slate-50/50">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
