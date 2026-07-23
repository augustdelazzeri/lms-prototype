// Phase I Epic 1 & Polish Pack: Badge component
import React from "react";

/** 
 * WARNING: Core component used by GUARD-1302 isolated prototype.
 * Verify changes against /app/GUARD-1302.
 */

interface BadgeProps {
  children: React.ReactNode;
  variant?: "success" | "warning" | "error" | "info" | "default" | "exempt";
  className?: string;
  title?: string; // For tooltip on hover
}

export default function Badge({ 
  children, 
  variant = "default",
  className = "",
  title
}: BadgeProps) {
  const variantStyles = {
    success: "bg-green-100 text-green-800 border-green-200",
    warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
    error: "bg-red-100 text-red-800 border-red-200",
    info: "bg-blue-100 text-blue-800 border-blue-200",
    default: "bg-gray-100 text-gray-800 border-gray-200",
    exempt: "bg-purple-100 text-purple-800 border-purple-200",
  };

  return (
    <span 
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variantStyles[variant]} ${className} ${title ? "cursor-help" : ""}`}
      title={title}
    >
      {children}
    </span>
  );
}

