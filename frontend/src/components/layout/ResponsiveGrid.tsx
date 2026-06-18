import React from 'react';

interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  gap?: string;
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  className = '',
  gap = 'gap-6',
}) => {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${gap} ${className}`}>
      {children}
    </div>
  );
};

export default ResponsiveGrid;
