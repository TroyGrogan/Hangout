import React from 'react';

/**
 * PaperAirplane Component
 * SVG icon for a paper airplane used in the send button
 */
const PaperAirplane = () => {
  return (
    <svg 
      className="paper-airplane"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="20"
      height="20"
    >
      <path d="M22 2L11 13"></path>
      <path d="M22 2L15 22L11 13L2 9L22 2Z"></path>
    </svg>
  );
};

export default PaperAirplane; 