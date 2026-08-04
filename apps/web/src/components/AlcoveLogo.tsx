import React from "react";

interface AlcoveLogoProps {
  className?: string;
  iconOnly?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "dark" | "light";
  hideText?: boolean;
}

export default function AlcoveLogo({
  className = "",
  iconOnly = false,
  size = "md",
  variant = "dark",
  hideText = false,
}: AlcoveLogoProps) {
  // Dimension definitions for logo image sizes
  const imageSizes = {
    sm: "h-7 w-auto object-contain",
    md: "h-9 w-auto object-contain",
    lg: "h-12 w-auto object-contain",
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl",
  };

  const LOGO_S3_URL = "https://studyspace-photos.s3.ap-south-1.amazonaws.com/useful/image-logo-removebg-preview.png";

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* S3 Logo Image */}
      <img
        src={LOGO_S3_URL}
        alt="Alcove Logo"
        className={`${imageSizes[size]} shrink-0 transition-opacity hover:opacity-95`}
      />

      {!iconOnly && !hideText && (
        <span
          className={`font-serif font-bold tracking-tight ${textSizes[size]} ${
            variant === "light" ? "text-white" : "text-[#2d3738]"
          }`}
        >
          Alcove
        </span>
      )}
    </div>
  );
}
