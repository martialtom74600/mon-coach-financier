import React from 'react';

interface InputGroupProps {
  label: string;
  value: string | number;
  onChange: (val: string) => void;
  type?: string;
  placeholder?: string;
  suffix?: string;
}

const InputGroup = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  suffix,
}: InputGroupProps) => (
  <div className="mb-3">
    <label className="block text-sm font-medium text-slate-600 mb-1">
      {label}
    </label>
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
      />
      {suffix && (
        <span className="absolute right-3 top-3 text-slate-400 text-sm">
          {suffix}
        </span>
      )}
    </div>
  </div>
);

export default InputGroup;
