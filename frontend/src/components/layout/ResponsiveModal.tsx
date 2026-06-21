import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ResponsiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export const ResponsiveModal: React.FC<ResponsiveModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  className = '',
  size = 'lg',
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Sizes mapper: Mobile: 95vw, Tablet: max-w-2xl (md), Desktop: max-w-4xl (lg)
  const sizeClasses = {
    sm: 'w-[95vw] sm:max-w-md lg:max-w-lg',
    md: 'w-[95vw] sm:max-w-xl lg:max-w-2xl',
    lg: 'w-[95vw] sm:max-w-2xl lg:max-w-4xl',
    xl: 'w-[95vw] sm:max-w-4xl lg:max-w-6xl',
    full: 'w-[95vw] sm:max-w-7xl lg:max-w-[95vw]',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      {/* Backdrop click */}
      <div className="absolute inset-0 cursor-default" onClick={onClose} />

      {/* Modal Card */}
      <div 
        className={`relative z-10 bg-card rounded-2xl border border-border shadow-large flex flex-col max-h-[90vh] overflow-hidden my-auto animate-in zoom-in-95 duration-200 ${sizeClasses[size]} ${className}`}
      >
        {/* Header */}
        {(title || typeof onClose === 'function') && (
          <div className="flex items-start justify-between p-4 sm:p-6 border-b border-border flex-shrink-0">
            <div>
              {title && <h3 className="text-base sm:text-lg font-bold text-foreground leading-tight">{title}</h3>}
              {subtitle && <p className="text-xs text-muted-foreground mt-1 leading-normal">{subtitle}</p>}
            </div>
            {onClose && (
              <button 
                onClick={onClose} 
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-all flex-shrink-0 ml-4"
                aria-label="Close modal"
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-4 sm:p-6 border-t border-border bg-muted/20 flex justify-end gap-2.5 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResponsiveModal;
