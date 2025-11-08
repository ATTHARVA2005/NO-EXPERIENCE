"use client";

import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  gradient?: "purple" | "pink" | "green" | "orange";
  children?: ReactNode;
}

const gradientClasses = {
  purple: "gradient-purple-blue",
  pink: "gradient-purple-pink",
  green: "gradient-green-teal",
  orange: "gradient-orange-red",
};

const glowClasses = {
  purple: "glow-purple",
  pink: "glow-pink",
  green: "glow-green",
  orange: "glow-purple",
};

export function FeatureCard({
  icon: Icon,
  title,
  description,
  gradient = "purple",
  children,
}: FeatureCardProps) {
  return (
    <Card className="glass-effect border-gray-800 hover-lift group overflow-hidden">
      {/* Gradient top border */}
      <div className={`h-1 ${gradientClasses[gradient]}`}></div>

      <div className="p-6">
        {/* Icon with gradient background */}
        <div
          className={`w-14 h-14 rounded-xl ${gradientClasses[gradient]} flex items-center justify-center mb-4 ${glowClasses[gradient]} transition-all group-hover:scale-110`}
        >
          <Icon className="w-7 h-7 text-white" />
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>

        {/* Description */}
        <p className="text-gray-400 mb-4">{description}</p>

        {/* Optional children content */}
        {children}
      </div>

      {/* Hover gradient overlay */}
      <div className={`absolute inset-0 ${gradientClasses[gradient]} opacity-0 group-hover:opacity-5 transition-opacity pointer-events-none`}></div>
    </Card>
  );
}
