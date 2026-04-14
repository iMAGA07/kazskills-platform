// Custom SVG icon set for Kazskills Platform
// Hand-crafted icons, not from any library
import React from 'react';

type P = {
  size?: number;
  color?: string;
  style?: React.CSSProperties;
  className?: string;
};

const mk = (size: number, color: string, style?: React.CSSProperties, className?: string) => ({
  width: size,
  height: size,
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
  style,
  className,
  'aria-hidden': true as const,
});

export const IcDashboard = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <path d="M2.5 10L10 3.5L17.5 10" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round"/>
    <path d="M4.5 9V16.5H8.5V12H11.5V16.5H15.5V9" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
  </svg>
);

export const IcBook = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <path d="M10 5C10 5 7.5 4 4 5V16.5C7.5 15.5 10 16.5 10 16.5V5Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M10 5C10 5 12.5 4 16 5V16.5C12.5 15.5 10 16.5 10 16.5V5Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M10 5V16.5" stroke={color} strokeWidth="1.1" strokeDasharray="1.8 1.2"/>
  </svg>
);

export const IcMedal = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <circle cx="10" cy="13" r="5" stroke={color} strokeWidth="1.5"/>
    <path d="M7.5 3H5.5L7 8H13L14.5 3H12.5" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
    <path d="M10 10.5V13.5M8.5 12H11.5" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const IcPerson = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <circle cx="10" cy="6.5" r="3.2" stroke={color} strokeWidth="1.5"/>
    <path d="M3 17.5C3 14 6.2 11.5 10 11.5C13.8 11.5 17 14 17 17.5" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const IcTeam = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 22 20">
    <circle cx="8" cy="6" r="2.8" stroke={color} strokeWidth="1.4"/>
    <path d="M1.5 17C1.5 14 4.5 12 8 12" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
    <circle cx="14" cy="6" r="2.8" stroke={color} strokeWidth="1.4"/>
    <path d="M14 12C17.5 12 20.5 14 20.5 17" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M8 12C9.5 11.2 12.5 11.2 14 12" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);

export const IcGraph = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <path d="M2.5 17H17.5" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
    <rect x="3.5" y="10" width="3" height="7" rx="0.8" stroke={color} strokeWidth="1.3"/>
    <rect x="8.5" y="6.5" width="3" height="10.5" rx="0.8" stroke={color} strokeWidth="1.3"/>
    <rect x="13.5" y="3" width="3" height="14" rx="0.8" stroke={color} strokeWidth="1.3"/>
  </svg>
);

export const IcLogout = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <path d="M8.5 4H5C4.4 4 4 4.4 4 5V15C4 15.6 4.4 16 5 16H8.5" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M13 7L16.5 10.5L13 14" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8.5 10.5H16.5" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);

export const IcBell = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <path d="M10 2.5C7.2 2.5 5.5 4.8 5.5 7.5V13H14.5V7.5C14.5 4.8 12.8 2.5 10 2.5Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M3.5 13H16.5" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M8 13C8 14.1 8.9 15 10 15C11.1 15 12 14.1 12 13" stroke={color} strokeWidth="1.4"/>
    <path d="M10 2.5V1.5" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);

export const IcSearch = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <circle cx="8.5" cy="8.5" r="5.2" stroke={color} strokeWidth="1.5"/>
    <path d="M12.5 12.5L17 17" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

export const IcPlay = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <rect x="2.5" y="2.5" width="15" height="15" rx="4" stroke={color} strokeWidth="1.5"/>
    <path d="M8 7L14 10.5L8 14V7Z" fill={color} opacity="0.9"/>
  </svg>
);

export const IcCheck = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <path d="M4 10.5L8 14.5L16 6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const IcCheckCircle = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <circle cx="10" cy="10" r="7.5" stroke={color} strokeWidth="1.5"/>
    <path d="M6.5 10L8.5 12L13.5 7" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const IcClock = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <circle cx="10" cy="10" r="7.5" stroke={color} strokeWidth="1.5"/>
    <path d="M10 6.5V10.5L12.5 13" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const IcShield = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <path d="M10 2.5L3.5 5.5V10.5C3.5 14 6.4 17 10 18C13.6 17 16.5 14 16.5 10.5V5.5L10 2.5Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M7 10L9 12L13 8" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const IcPlus = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <path d="M10 4V16M4 10H16" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

export const IcEdit = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <path d="M14 3.5L16.5 6L8 14.5L4 15.5L5 11.5L14 3.5Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M12.5 5L15 7.5" stroke={color} strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);

export const IcTrash = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <path d="M3.5 6H16.5" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M8 6V4H12V6" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M5 6L5.5 16H14.5L15 6" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M8 9.5V13M12 9.5V13" stroke={color} strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);

export const IcDownload = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <path d="M10 3V13" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
    <path d="M6.5 9.5L10 13L13.5 9.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M4 17H16" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const IcEye = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <path d="M2 10C4.2 6.2 6.8 4.5 10 4.5C13.2 4.5 15.8 6.2 18 10C15.8 13.8 13.2 15.5 10 15.5C6.8 15.5 4.2 13.8 2 10Z" stroke={color} strokeWidth="1.5"/>
    <circle cx="10" cy="10" r="2.5" stroke={color} strokeWidth="1.5"/>
  </svg>
);

export const IcClose = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <path d="M5 5L15 15M15 5L5 15" stroke={color} strokeWidth="1.7" strokeLinecap="round"/>
  </svg>
);

export const IcArrowRight = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <path d="M4 10H16" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
    <path d="M12 6L16 10L12 14" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const IcArrowLeft = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <path d="M16 10H4" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
    <path d="M8 6L4 10L8 14" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const IcCamera = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <rect x="2" y="6" width="16" height="11.5" rx="2.5" stroke={color} strokeWidth="1.5"/>
    <circle cx="10" cy="12" r="3" stroke={color} strokeWidth="1.5"/>
    <path d="M7 6L8.5 3.5H11.5L13 6" stroke={color} strokeWidth="1.4" strokeLinejoin="round"/>
    <rect x="14.5" y="8" width="1.5" height="1.5" rx="0.5" fill={color}/>
  </svg>
);

export const IcCameraOff = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <rect x="2" y="6" width="16" height="11.5" rx="2.5" stroke={color} strokeWidth="1.5"/>
    <circle cx="10" cy="12" r="3" stroke={color} strokeWidth="1.5" strokeDasharray="2 1.5"/>
    <path d="M3 3.5L17 17.5" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const IcWarning = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <path d="M10 2.5L18.5 17.5H1.5L10 2.5Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M10 8V11.5" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    <circle cx="10" cy="14.5" r="0.9" fill={color}/>
  </svg>
);

export const IcTimer = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <circle cx="10" cy="12" r="6.5" stroke={color} strokeWidth="1.5"/>
    <path d="M10 8V12.5L12.5 14" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8 2.5H12" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M10 2.5V4.5" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M15.5 4.5L16.5 5.5" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const IcFlame = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <path d="M10 18C6.5 18 4 15.8 4 13C4 10.2 5.5 8.5 7 7C7 8.5 8 9.5 8.5 10C8.5 8 9 6 10.5 4C10.5 6.5 12 8 12.5 9C13 8 13.5 7 13 5C15 6.5 16 9 16 13C16 15.8 13.5 18 10 18Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M10 18C8.5 18 8 16.8 8 15.5C8 14.2 9 13.5 10 13.5C11 13.5 12 14.2 12 15.5C12 16.8 11.5 18 10 18Z" fill={color} opacity="0.25"/>
  </svg>
);

export const IcChevronDown = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <path d="M5 7.5L10 12.5L15 7.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const IcChevronUp = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <path d="M5 12.5L10 7.5L15 12.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const IcChevronLeft = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <path d="M12.5 5L7.5 10L12.5 15" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const IcChevronRight = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <path d="M7.5 5L12.5 10L7.5 15" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const IcTrendingUp = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <path d="M2.5 14L8 8.5L11.5 12L17.5 5.5" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M13.5 5.5H17.5V9.5" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const IcBarChart = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <path d="M2.5 17H17.5" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
    <rect x="4" y="9.5" width="3" height="7.5" rx="0.8" fill={color} opacity="0.85"/>
    <rect x="8.5" y="6" width="3" height="11" rx="0.8" fill={color} opacity="0.85"/>
    <rect x="13" y="3" width="3" height="14" rx="0.8" fill={color} opacity="0.85"/>
  </svg>
);

export const IcYoutube = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <rect x="1.5" y="5" width="17" height="11" rx="3" stroke={color} strokeWidth="1.5"/>
    <path d="M8.5 8L13.5 10.5L8.5 13V8Z" fill={color} opacity="0.9"/>
  </svg>
);

export const IcDocument = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <path d="M5 3H12L16.5 7.5V17H5V3Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M12 3V7.5H16.5" stroke={color} strokeWidth="1.4" strokeLinejoin="round"/>
    <path d="M7.5 10.5H12.5M7.5 13H12.5M7.5 7.5H10" stroke={color} strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);

export const IcPresentation = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <rect x="2" y="3.5" width="16" height="10.5" rx="1.5" stroke={color} strokeWidth="1.5"/>
    <path d="M7 17.5L10 14L13 17.5" stroke={color} strokeWidth="1.4" strokeLinejoin="round"/>
    <path d="M10 14V17.5" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M6 7.5H10M6 10H12" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
);

export const IcMore = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <circle cx="10" cy="4.5" r="1.3" fill={color}/>
    <circle cx="10" cy="10" r="1.3" fill={color}/>
    <circle cx="10" cy="15.5" r="1.3" fill={color}/>
  </svg>
);

export const IcMail = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <rect x="2.5" y="5" width="15" height="11" rx="2" stroke={color} strokeWidth="1.5"/>
    <path d="M2.5 7L10 11.5L17.5 7" stroke={color} strokeWidth="1.4" strokeLinejoin="round"/>
  </svg>
);

export const IcPhone = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <path d="M5 3H8.5L10 7.5L7.5 9C8.5 11 9.5 12 11.5 13L13 10.5L17.5 12V15.5C17.5 16.3 16.5 17.5 15 17.5C8.5 17.5 3 12 3 5.5C3 4 4 3 5 3Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
  </svg>
);

export const IcBuilding = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <rect x="3" y="3" width="9" height="14" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M12 7.5H17V17H12" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M6 6.5H9M6 9.5H9M6 12.5H9" stroke={color} strokeWidth="1.3" strokeLinecap="round"/>
    <rect x="7.5" y="13" width="2.5" height="4" rx="0.5" fill={color} opacity="0.35"/>
    <path d="M14.5 10.5V10.51M14.5 13V13.01" stroke={color} strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const IcBriefcase = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <rect x="2" y="7" width="16" height="11" rx="2" stroke={color} strokeWidth="1.5"/>
    <path d="M7 7V5.5C7 5 7.5 4.5 8 4.5H12C12.5 4.5 13 5 13 5.5V7" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M2 12H18" stroke={color} strokeWidth="1.3" strokeLinecap="round"/>
    <rect x="8.5" y="10.5" width="3" height="3" rx="0.5" fill={color} opacity="0.4"/>
  </svg>
);

export const IcSave = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <path d="M3.5 3.5H14L16.5 6V16.5H3.5V3.5Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
    <rect x="6" y="3.5" width="6" height="4.5" rx="0.5" stroke={color} strokeWidth="1.3"/>
    <rect x="5.5" y="10" width="9" height="6.5" rx="0.5" stroke={color} strokeWidth="1.3"/>
    <path d="M12 3.5V5.5" stroke={color} strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);

export const IcLock = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <rect x="4" y="9" width="12" height="9" rx="2" stroke={color} strokeWidth="1.5"/>
    <path d="M7 9V7C7 5 8 3.5 10 3.5C12 3.5 13 5 13 7V9" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="10" cy="13.5" r="1.5" fill={color} opacity="0.6"/>
    <path d="M10 15V16" stroke={color} strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);

export const IcInfo = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <circle cx="10" cy="10" r="7.5" stroke={color} strokeWidth="1.5"/>
    <path d="M10 9V14" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    <circle cx="10" cy="6.5" r="0.9" fill={color}/>
  </svg>
);

export const IcXCircle = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <circle cx="10" cy="10" r="7.5" stroke={color} strokeWidth="1.5"/>
    <path d="M7 7L13 13M13 7L7 13" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);

export const IcRefresh = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <path d="M3.5 10C3.5 6.4 6.4 3.5 10 3.5C12.5 3.5 14.7 4.8 16 6.8" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
    <path d="M16.5 10C16.5 13.6 13.6 16.5 10 16.5C7.5 16.5 5.3 15.2 4 13.2" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
    <path d="M14 4L16 7H13" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
    <path d="M6 14L4 17H7" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
  </svg>
);

export const IcTarget = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <circle cx="10" cy="10" r="7.5" stroke={color} strokeWidth="1.4"/>
    <circle cx="10" cy="10" r="4.5" stroke={color} strokeWidth="1.3"/>
    <circle cx="10" cy="10" r="2" fill={color} opacity="0.7"/>
  </svg>
);

export const IcFilter = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <path d="M3 5H17" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M5.5 10H14.5" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M8 15H12" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const IcGrip = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <circle cx="7.5" cy="6" r="1.3" fill={color}/>
    <circle cx="12.5" cy="6" r="1.3" fill={color}/>
    <circle cx="7.5" cy="10" r="1.3" fill={color}/>
    <circle cx="12.5" cy="10" r="1.3" fill={color}/>
    <circle cx="7.5" cy="14" r="1.3" fill={color}/>
    <circle cx="12.5" cy="14" r="1.3" fill={color}/>
  </svg>
);

export const IcCircle = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <circle cx="10" cy="10" r="7.5" stroke={color} strokeWidth="1.5"/>
  </svg>
);

export const IcUsers = IcTeam;
export const IcAward = IcMedal;
export const IcBookOpen = IcBook;

export const IcUserPlus = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <circle cx="8" cy="6.5" r="3.2" stroke={color} strokeWidth="1.5"/>
    <path d="M2 17.5C2 14 4.8 11.5 8 11.5C9.2 11.5 10.3 11.8 11.2 12.4" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M14.5 12V18M11.5 15H17.5" stroke={color} strokeWidth="1.7" strokeLinecap="round"/>
  </svg>
);

export const IcSortAsc = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <path d="M4 14.5H8.5M4 10H10.5M4 5.5H16.5" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M14.5 8.5V17M14.5 17L12 14.5M14.5 17L17 14.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const IcSortDesc = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <path d="M4 14.5H8.5M4 10H10.5M4 5.5H16.5" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M14.5 17V8.5M14.5 8.5L12 11M14.5 8.5L17 11" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const IcImport = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <path d="M10 13V3M10 3L7 6M10 3L13 6" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M4 14V16.5C4 17 4.5 17.5 5 17.5H15C15.5 17.5 16 17 16 16.5V14" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

// Plain-name aliases for pages that import without the Ic prefix
export const ArrowLeft = IcArrowLeft;
export const ArrowRight = IcArrowRight;
export const CheckCircle2 = IcCheckCircle;
export const ChevronLeft = IcChevronLeft;
export const ChevronRight = IcChevronRight;
export const FileText = IcDocument;
export const Presentation = IcPresentation;
export const Video = IcYoutube;
export const Clock = IcClock;
export const BookOpen = IcBook;
export const Users = IcTeam;
export const Award = IcMedal;
export const Play = IcPlay;
export const Lock = IcLock;
export const Target = IcTarget;
export const Timer = IcTimer;
export const RotateCcw = IcRefresh;
export const Camera = IcCamera;
export const CameraOff = IcCameraOff;
export const AlertTriangle = IcWarning;
export const AlertCircle = IcWarning;
export const Send = IcArrowRight;
export const X = IcClose;
export const Circle = IcCircle;
export const Youtube = IcYoutube;
export const Plus = IcPlus;
export const Trash2 = IcTrash;
export const GripVertical = IcGrip;
export const ChevronDown = IcChevronDown;
export const ChevronUp = IcChevronUp;
export const Check = IcCheck;
export const Save = IcSave;
export const Search = IcSearch;
export const Bell = IcBell;
export const Eye = IcEye;
export const Edit = IcEdit;
export const Download = IcDownload;
export const Info = IcInfo;
export const XCircle = IcXCircle;
export const Refresh = IcRefresh;
export const Filter = IcFilter;
export const More = IcMore;
export const Mail = IcMail;
export const Phone = IcPhone;
export const Building = IcBuilding;
export const Briefcase = IcBriefcase;
export const Shield = IcShield;
export const TrendingUp = IcTrendingUp;
export const BarChart = IcBarChart;
export const Flame = IcFlame;
export const Graph = IcGraph;
export const Logout = IcLogout;
export const Person = IcPerson;
export const Dashboard = IcDashboard;
export const Book = IcBook;
export const Medal = IcMedal;
export const Team = IcTeam;
export const Warning = IcWarning;
export const Close = IcClose;

export const IcFileText = ({ size = 18, color = 'currentColor', style, className }: P) => (
  <svg {...mk(size, color, style, className)} viewBox="0 0 20 20">
    <path d="M5 2.5H12.5L16.5 6.5V17.5H5V2.5Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M12.5 2.5V6.5H16.5" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M8 10H14M8 13H14" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);