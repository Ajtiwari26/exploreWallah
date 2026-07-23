/**
 * ExploreWallah - Floating WhatsApp Support Widget
 * 
 * Constant floating glassmorphism WhatsApp chat button with official WhatsApp green (#25D366),
 * vector SVG icon, pulse glow animation, and direct messaging link.
 */

import React, { useState } from 'react';

interface WhatsAppWidgetProps {
  phoneNumber?: string;
  defaultMessage?: string;
}

export const WhatsAppWidget: React.FC<WhatsAppWidgetProps> = ({
  phoneNumber = '919876543210', // Default support line
  defaultMessage = 'Hi ExploreWallah! I would like to inquire about Himalayan trek packages.',
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(defaultMessage)}`;

  return (
    <div
      className="ew-whatsapp-floating-container"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Tooltip Popup */}
      <div className={`ew-whatsapp-tooltip ${isHovered ? 'visible' : ''}`}>
        <span className="ew-tooltip-status">🟢 Online</span>
        <span className="ew-tooltip-text">Chat with a Himalayan Trek Expert!</span>
      </div>

      {/* Floating Glass Button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="ew-whatsapp-btn"
        aria-label="Contact ExploreWallah Support on WhatsApp"
        title="Chat on WhatsApp"
      >
        {/* Pulsing Aura Ring */}
        <div className="ew-whatsapp-pulse-ring" />

        {/* WhatsApp Official SVG Icon */}
        <svg
          className="ew-whatsapp-svg"
          viewBox="0 0 32 32"
          width="32"
          height="32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M16 2C8.268 2 2 8.268 2 16c0 2.82.83 5.447 2.26 7.643L2.5 29.5l6.046-1.725A13.923 13.923 0 0016 30c7.732 0 14-6.268 14-14S23.732 2 16 2zm-1.07 5.6c-.33 0-.87.124-1.33.62-.46.495-1.75 1.71-1.75 4.17 0 2.458 1.79 4.835 2.04 5.17.25.336 3.52 5.374 8.53 7.54 1.19.516 2.12.824 2.85 1.055 1.2.38 2.29.327 3.15.198.96-.143 2.95-1.206 3.36-2.37.41-1.165.41-2.16.29-2.37-.12-.21-.46-.336-.96-.587-.5-.25-2.95-1.457-3.41-1.625-.46-.168-.8-.25-1.13.25-.33.495-1.29 1.625-1.58 1.957-.29.336-.58.378-1.08.126-.5-.25-2.11-.778-4.02-2.482-1.49-1.326-2.5-2.964-2.79-3.46-.29-.495-.03-.763.22-1.01.23-.223.5-.58.75-.87.25-.29.33-.495.5-.824.17-.336.08-.63-.04-.88-.12-.25-1.13-2.72-1.55-3.725-.41-1.006-.83-.86-1.13-.876-.29-.016-.62-.02-.95-.02z"
            fill="#FFFFFF"
          />
        </svg>
      </a>
    </div>
  );
};
