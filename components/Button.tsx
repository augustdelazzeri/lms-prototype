// Phase I Epic 1 & UI Refresh v2: EHS-style buttons with exact tokens
import React from "react";

/** 
 * WARNING: Core component used by GUARD-1302 isolated prototype.
 * Verify changes against /app/GUARD-1302.
 */

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "destructive";
  children: React.ReactNode;
}

export default function Button({ 
  variant = "primary", 
  children, 
  className = "",
  ...props 
}: ButtonProps) {
  const variantStyles = {
    primary: "inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-3 py-2 text-white hover:bg-[#1D4ED8] disabled:opacity-60",
    secondary: "inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-60",
    destructive: "inline-flex items-center gap-2 rounded-lg border border-red-300 px-3 py-2 text-red-600 hover:bg-red-50 disabled:opacity-60",
  };

  return (
    <button
      className={`${variantStyles[variant]} transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
