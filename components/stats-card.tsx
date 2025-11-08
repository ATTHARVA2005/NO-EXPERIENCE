"use client";

import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  gradient?: "purple" | "pink" | "green" | "orange";
  className?: string;
}

const gradientClasses = {
  purple: "from-purple-500/20 to-blue-500/20",
  pink: "from-pink-500/20 to-purple-500/20",
  green: "from-green-500/20 to-teal-500/20",
  orange: "from-orange-500/20 to-red-500/20",
};

const iconGradients = {
  purple: "gradient-purple-blue",
  pink: "gradient-purple-pink",
  green: "gradient-green-teal",
  orange: "gradient-orange-red",
};

export function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  gradient = "purple",
  className,
}: StatsCardProps) {
  return (
    <Card
      className={cn(
        "glass-effect border-gray-800 hover-lift overflow-hidden relative",
        className
      )}
    >
      {/* Background gradient */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${gradientClasses[gradient]} opacity-50`}
      ></div>

      {/* Content */}
      <div className="relative p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-400 mb-1">{title}</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-bold text-white">{value}</h3>
              {trend && (
                <span
                  className={cn(
                    "text-sm font-medium px-2 py-0.5 rounded-full",
                    trend.isPositive
                      ? "bg-green-500/20 text-green-400"
                      : "bg-red-500/20 text-red-400"
                  )}
                >
                  {trend.isPositive ? "+" : ""}
                  {trend.value}%
                </span>
              )}
            </div>
          </div>

          {/* Icon */}
          <div
            className={`w-12 h-12 rounded-xl ${iconGradients[gradient]} flex items-center justify-center`}
          >
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Bottom accent line */}
      <div className={`h-1 ${iconGradients[gradient]}`}></div>
    </Card>
  );
}
