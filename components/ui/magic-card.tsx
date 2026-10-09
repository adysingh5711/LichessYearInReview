"use client";

import { motion, useMotionTemplate, useMotionValue } from "motion/react";
import { useTheme } from "next-themes";
import React from "react";

import { cn } from "@/lib/utils";

const SIZE = 200;

export function MagicCard({ children, className }: React.HTMLAttributes<HTMLDivElement>) {
  const { theme } = useTheme();
  const mouseX = useMotionValue(-SIZE);
  const mouseY = useMotionValue(-SIZE);
  const color = theme === "dark" ? "#262626" : "#f3f4f6";

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top } = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - left);
    mouseY.set(e.clientY - top);
  };
  const handleMouseLeave = () => {
    mouseX.set(-SIZE);
    mouseY.set(-SIZE);
  };

  const spotlight = useMotionTemplate`radial-gradient(${SIZE}px circle at ${mouseX}px ${mouseY}px, ${color}, transparent 100%)`;
  const border = useMotionTemplate`radial-gradient(${SIZE}px circle at ${mouseX}px ${mouseY}px, #9E7AFF, #FE8BBB, hsl(var(--border)) 100%)`;

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn("group relative flex w-full rounded-xl", className)}
    >
      <div className="absolute inset-px z-10 rounded-xl bg-background" />
      <div className="relative z-30 w-full">{children}</div>
      <motion.div
        className="pointer-events-none absolute inset-px z-10 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: spotlight, opacity: 0.8 }}
      />
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-xl bg-border duration-300 group-hover:opacity-100"
        style={{ background: border }}
      />
    </div>
  );
}
