import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  children: React.ReactNode;
}

export default function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  const baseStyle = 'px-4 py-3 rounded-xl font-bold transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200',
    secondary: 'bg-white text-indigo-700 border border-indigo-100 hover:bg-indigo-50',
    outline: 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-indigo-600',
    ghost: 'bg-transparent text-slate-500 hover:bg-slate-100',
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}