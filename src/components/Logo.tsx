import React from 'react';
import { Link } from 'react-router-dom';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true }) => {
  const iconSize = size === 'sm' ? 'w-6 h-6' : size === 'lg' ? 'w-9 h-9' : 'w-7 h-7';
  const textSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-xl' : 'text-lg';

  return (
    <Link to="/" className="flex items-center gap-2.5 group cursor-pointer select-none">
      <div
        className={`${iconSize} relative flex items-center justify-center rounded-lg bg-gradient-to-tr from-cyan-500 via-sky-400 to-indigo-500 shadow-md shadow-cyan-500/20 group-hover:shadow-cyan-400/40 transition-all`}
      >
        {/* Sleek play triangle */}
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-4 h-4 text-slate-950 ml-0.5"
        >
          <path d="M5 3.868v16.264c0 .859.945 1.38 1.672.927l13.011-8.132a1.084 1.084 0 0 0 0-1.854L6.672 2.94C5.945 2.488 5 3.01 5 3.868Z" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className={`font-bold tracking-tight text-white ${textSize}`}>
              Clip<span className="text-cyan-400">Forge</span>
            </span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-800/50">
              WEB
            </span>
          </div>
        </div>
      )}
    </Link>
  );
};
