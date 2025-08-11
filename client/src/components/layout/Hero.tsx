import React from "react";

type Props = {
  /** e.g., "/img/home-hero-01.jpg" — from public/ */
  bgSrc?: string;
  className?: string;
  children?: React.ReactNode;
  /** optional overlay opacity (0–100) */
  overlay?: number;
  /** content positioning: 'start', 'center', 'end' */
  contentPosition?: 'start' | 'center' | 'end';
};

export default function Hero({ 
  bgSrc = "/img/home-hero-01.jpg", 
  className = "", 
  children, 
  overlay = 30,
  contentPosition = 'center'
}: Props) {
  const positionClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end'
  };

  return (
    <section className={`relative w-full min-h-[70vh] lg:min-h-[80vh] overflow-hidden ${className}`}>
      {/* Background image */}
      <div
        className="absolute inset-0 bg-center bg-cover"
        style={{ backgroundImage: `url(${bgSrc})` }}
        aria-hidden="true"
      />
      {/* Subtle vignette + brand tint */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(80% 60% at 50% 40%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.45) 100%)"
        }}
        aria-hidden="true"
      />
      {/* Color wash */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: `rgba(20,40,80,${overlay/100})` }}
        aria-hidden="true"
      />

      {/* Foreground content */}
      <div className={`relative z-10 mx-auto max-w-6xl px-6 py-16 flex flex-col items-center ${positionClasses[contentPosition]} h-full text-white`}>
        {children}
      </div>
    </section>
  );
}
