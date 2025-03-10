import React from 'react';

interface IconProps {
  className?: string;
}

export function BloombergIcon({ className }: IconProps) {
  return (
    <svg 
      className={className}
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="24" height="24" rx="4" fill="#000000" />
      <path d="M5 7H7V17H5V7Z" fill="white" />
      <path d="M8 7H10.5C12.5 7 14 8.5 14 10.5C14 12.5 12.5 14 10.5 14H8V7Z" fill="white" />
      <path d="M10 9V12H10.5C11.3 12 12 11.3 12 10.5C12 9.7 11.3 9 10.5 9H10Z" fill="black" />
      <path d="M15 7H17V17H15V7Z" fill="white" />
      <path d="M18 7H20.5C22.5 7 24 8.5 24 10.5C24 12.5 22.5 14 20.5 14H18V7Z" fill="white" />
      <path d="M20 9V12H20.5C21.3 12 22 11.3 22 10.5C22 9.7 21.3 9 20.5 9H20Z" fill="black" />
    </svg>
  );
}

export function DFIcon({ className }: IconProps) {
  return (
    <svg 
      className={className}
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="24" height="24" rx="4" fill="#0066CC" />
      <path d="M4 6H10C12 6 14 8 14 10C14 12 12 14 10 14H4V6Z" fill="white" />
      <path d="M6 8V12H10C11 12 12 11 12 10C12 9 11 8 10 8H6Z" fill="#0066CC" />
      <path d="M15 6H20V8H15V6Z" fill="white" />
      <path d="M15 9H19V11H15V9Z" fill="white" />
      <path d="M15 12H20V14H15V12Z" fill="white" />
      <path d="M4 16H20V18H4V16Z" fill="white" />
    </svg>
  );
}
