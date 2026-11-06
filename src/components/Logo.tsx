import React from 'react';
import { Link } from 'react-router-dom';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true, onClick }) => {
  const iconSize = size === 'sm' ? 'w-6 h-6' : size === 'lg' ? 'w-9 h-9' : 'w-7 h-7';
  const textSize = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-base';

  const content = (
    <div className="flex items-center gap-2 group cursor-pointer select-none">
      <div
        className={`${iconSize} relative flex items-center justify-center rounded-md bg-[#141414] border border-[#333333] shadow-md group-hover:border-[#1FC8DB] transition-all overflow-hidden`}
      >
        {/* CapCut signature stylized overlapping trapezoid icon */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="w-4 h-4"
        >
          <path
            d="M4 6.5L11 12L4 17.5V6.5Z"
            fill="#1FC8DB"
          />
          <path
            d="M20 6.5L13 12L20 17.5V6.5Z"
            fill="#E6E6E6"
          />
          <circle cx="12" cy="12" r="2" fill="#141414" stroke="#1FC8DB" strokeWidth="1" />
        </svg>
      </div>

      {showText && (
        <div className="flex items-center gap-1.5">
          <span className={`font-black tracking-tight text-white ${textSize}`}>
            Cap<span className="text-[#1FC8DB]">Cut</span>
          </span>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#262626] text-[#1FC8DB] border border-[#333333]">
            Web
          </span>
        </div>
      )}
    </div>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="text-left">
        {content}
      </button>
    );
  }

  return <Link to="/">{content}</Link>;
};

