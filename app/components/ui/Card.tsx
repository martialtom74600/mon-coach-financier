import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export default function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div 
      onClick={onClick}
      className={`
        bg-white rounded-2xl shadow-sm border border-slate-100 
        transition-all duration-300 
        ${onClick ? 'cursor-pointer hover:shadow-md hover:border-indigo-100 active:scale-[0.98]' : 'hover:shadow-md'} 
        ${className}
      `}
    >
      {children}
    </div>
  );
}