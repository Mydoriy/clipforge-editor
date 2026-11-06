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
    <div
      className="flex items-center gap-2 group cursor-pointer select-none"
      title="ClipForge Desktop Web - Độc lập, không liên kết với CapCut hay ByteDance"
    >
      {/* Custom geometric ClipForge icon: stylized interlocking dual facets forming modern cutting prism */}
      <div
        className={`${iconSize} relative flex items-center justify-center rounded-lg bg-[#111622] border border-[#223049] shadow-md group-hover:border-[#1FC8DB] transition-all overflow-hidden`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="w-4 h-4"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Cyan primary cutting prism facet */}
          <path
            d="M3 6L13 3L11 13L3 17V6Z"
            fill="url(#cyanGlow)"
            fillOpacity="0.95"
          />
          {/* Silver/Ice secondary facet */}
          <path
            d="M21 18L11 21L13 11L21 7V18Z"
            fill="#E2E8F0"
            fillOpacity="0.9"
          />
          {/* Center aperture focal core */}
          <circle cx="12" cy="12" r="2.2" fill="#0B0F19" stroke="#1FC8DB" strokeWidth="1.5" />
          <defs>
            <linearGradient id="cyanGlow" x1="3" y1="3" x2="13" y2="17" gradientUnits="userSpaceOnUse">
              <stop stopColor="#1FC8DB" />
              <stop offset="1" stopColor="#0891B2" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {showText && (
        <div className="flex items-center gap-1.5">
          <span className={`font-black tracking-tight text-white ${textSize}`}>
            Clip<span className="text-[#1FC8DB]">Forge</span>
          </span>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#162032] text-[#1FC8DB] border border-[#223049]">
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
