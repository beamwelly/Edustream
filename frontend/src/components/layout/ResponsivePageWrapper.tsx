import React from 'react';

interface ResponsivePageWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export const ResponsivePageWrapper: React.FC<ResponsivePageWrapperProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 w-full ${className}`}>
      {children}
    </div>
  );
};

export default ResponsivePageWrapper;
