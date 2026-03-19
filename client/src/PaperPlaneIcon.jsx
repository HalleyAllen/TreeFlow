import React from 'react';

const PaperPlaneIcon = ({ size = 20, color = 'white' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      transform="rotate(90 12 12)"
    >
      <path
        d="M22 2L2 12L22 22L19 14L22 2Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default PaperPlaneIcon;