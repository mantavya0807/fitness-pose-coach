import React from 'react';
import { cn } from "../../lib/utils";

export function Progress({ value = 0, max = 100, className, ...props }) {
  return (
    <div className={cn("w-full bg-gray-200 rounded-full overflow-hidden", className)} {...props}>
      <div
        className="bg-blue-600 h-full transition-all duration-300 ease-in-out"
        style={{ width: `${Math.min(Math.max(0, value), max)}%` }}
        role="progressbar"
        aria-valuemin="0"
        aria-valuemax={max}
        aria-valuenow={value}
      />
    </div>
  );
}