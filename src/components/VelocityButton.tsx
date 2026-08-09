import React from 'react';

interface VelocityButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
}

export const VelocityButton: React.FC<VelocityButtonProps> = ({
  onClick,
  children,
  className = '',
  style,
  ariaLabel,
}) => {
  return (
    <button
      onClick={onClick}
      className={`velocity-btn ${className}`}
      style={style}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
};
