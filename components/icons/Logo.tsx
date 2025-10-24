import React from 'react';

export const Logo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <defs>
      <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#a855f7', stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: '#ec4899', stopOpacity: 1 }} />
      </linearGradient>
    </defs>
    <path
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
      fill="url(#grad1)"
    />
    <path
      d="M12.5 14.25c-2.42 0-4.5 1.5-4.5 3.25h9c0-1.75-2.08-3.25-4.5-3.25zm-1-4.25c0 .55.45 1 1 1s1-.45 1-1-.45-1-1-1-1 .45-1 1zm-1.5 0c0 .55.45 1 1 1s1-.45 1-1-.45-1-1-1-1 .45-1 1zm4 0c0 .55.45 1 1 1s1-.45 1-1-.45-1-1-1-1 .45-1 1zM12 6c-1.93 0-3.5 1.57-3.5 3.5S10.07 13 12 13s3.5-1.57 3.5-3.5S13.93 6 12 6z"
      fill="white"
    />
  </svg>
);
