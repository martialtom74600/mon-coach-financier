import React from 'react';

interface ButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  className?: string;
  disabled?: boolean;
}

const Button = ({
  onClick,
  children,
  variant = 'primary',
  className = '',
  disabled = false,
}: ButtonProps) => {
  const baseStyle =
    'px-4 py-3 rounded-lg font-medium transition-all active:scale-95 flex items-center justify-center gap-2';
  const variants = {
    primary:
      'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed',
    secondary:
      'bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50',
    outline:
      'border-2 border-slate-200 text-slate-600 hover:border-slate-300 bg-transparent',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100',
  };
  return (
    <button
      onClick={onClick}
      className={`${baseStyle} ${variants[variant]} ${className}`}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default Button;
