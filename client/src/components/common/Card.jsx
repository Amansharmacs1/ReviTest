import React from 'react';

export const Card = ({ children, className = '', hoverEffect = false, ...props }) => {
  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 shadow-subtle ${
        hoverEffect
          ? 'transition-all duration-200 hover:shadow-card hover:border-slate-300'
          : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
