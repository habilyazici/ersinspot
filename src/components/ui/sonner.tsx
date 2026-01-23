"use client";

import { Toaster as Sonner, ToasterProps } from "sonner@2.0.3";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      pauseOnHover={false}
      duration={2000}
      dismissible={false}
      closeButton={false}
      interactable={false}
      expand={false}
      style={
        {
          "--normal-bg": "#ffffff",
          "--normal-text": "#1f2937",
          "--normal-border": "#e5e7eb",
          "zIndex": "99999",
          "pointerEvents": "none",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };