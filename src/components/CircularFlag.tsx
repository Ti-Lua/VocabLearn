import React from 'react';

interface CircularFlagProps {
  code: 'en' | 'zh' | 'ja' | string;
  size?: number;
  className?: string;
}

export function CircularFlag({ code, size = 48, className = '' }: CircularFlagProps) {
  if (code === 'en') {
    // UK Union Jack in Circle
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className={`rounded-full shadow-md flex-shrink-0 ${className}`}
      >
        <defs>
          <clipPath id="circle-clip-en">
            <circle cx="50" cy="50" r="50" />
          </clipPath>
        </defs>
        <g clipPath="url(#circle-clip-en)">
          {/* Blue field */}
          <rect width="100" height="100" fill="#012169" />
          {/* White diagonals */}
          <line x1="0" y1="0" x2="100" y2="100" stroke="#FFF" strokeWidth="18" />
          <line x1="100" y1="0" x2="0" y2="100" stroke="#FFF" strokeWidth="18" />
          {/* Red diagonals */}
          <line x1="0" y1="0" x2="50" y2="50" stroke="#C8102E" strokeWidth="7" />
          <line x1="100" y1="0" x2="50" y2="50" stroke="#C8102E" strokeWidth="7" />
          <line x1="0" y1="100" x2="50" y2="50" stroke="#C8102E" strokeWidth="7" />
          <line x1="100" y1="100" x2="50" y2="50" stroke="#C8102E" strokeWidth="7" />
          {/* White cross */}
          <rect x="38" width="24" height="100" fill="#FFF" />
          <rect y="38" width="100" height="24" fill="#FFF" />
          {/* Red cross */}
          <rect x="43" width="14" height="100" fill="#C8102E" />
          <rect y="43" width="100" height="14" fill="#C8102E" />
        </g>
      </svg>
    );
  }

  if (code === 'zh') {
    // China Five-star Red Flag in Circle
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className={`rounded-full shadow-md flex-shrink-0 ${className}`}
      >
        <defs>
          <clipPath id="circle-clip-zh">
            <circle cx="50" cy="50" r="50" />
          </clipPath>
        </defs>
        <g clipPath="url(#circle-clip-zh)">
          <rect width="100" height="100" fill="#DE2910" />
          {/* Big yellow star */}
          <polygon
            points="25,12 28,21 37,21 30,27 33,36 25,30 17,36 20,27 13,21 22,21"
            fill="#FFDE00"
          />
          {/* 4 Small stars */}
          <polygon
            points="42,10 43,14 47,14 44,17 45,21 42,18 39,21 40,17 37,14 41,14"
            fill="#FFDE00"
            transform="scale(0.8) translate(10, 0)"
          />
          <polygon
            points="50,18 51,22 55,22 52,25 53,29 50,26 47,29 48,25 45,22 49,22"
            fill="#FFDE00"
            transform="scale(0.8) translate(14, 4)"
          />
          <polygon
            points="50,30 51,34 55,34 52,37 53,41 50,38 47,41 48,37 45,34 49,34"
            fill="#FFDE00"
            transform="scale(0.8) translate(14, 12)"
          />
          <polygon
            points="42,39 43,43 47,43 44,46 45,50 42,47 39,50 40,46 37,43 41,43"
            fill="#FFDE00"
            transform="scale(0.8) translate(10, 16)"
          />
        </g>
      </svg>
    );
  }

  // Japan Hinomaru in Circle
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`rounded-full shadow-md flex-shrink-0 ${className}`}
    >
      <defs>
        <clipPath id="circle-clip-ja">
          <circle cx="50" cy="50" r="50" />
        </clipPath>
      </defs>
      <g clipPath="url(#circle-clip-ja)">
        <rect width="100" height="100" fill="#FFFFFF" />
        <circle cx="50" cy="50" r="28" fill="#BC002D" />
      </g>
    </svg>
  );
}
