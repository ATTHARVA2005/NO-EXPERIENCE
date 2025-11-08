"use client";

import { Brain, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModernTutorAvatarProps {
  isActive?: boolean;
  phase?: string;
  progress?: number;
  className?: string;
}

export function ModernTutorAvatar({
  isActive = false,
  phase = "teaching",
  progress = 0,
  className,
}: ModernTutorAvatarProps) {
  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      {/* Animated Avatar */}
      <div className="relative">
        {/* Outer glow ring */}
        <div
          className={cn(
            "absolute inset-0 rounded-full blur-2xl transition-all duration-1000",
            isActive
              ? "bg-gradient-to-r from-emerald-500/40 via-cyan-500/40 to-blue-500/40 animate-pulse"
              : "bg-gradient-to-r from-purple-500/30 via-pink-500/30 to-orange-500/30"
          )}
        />

        {/* Middle ring */}
        <div
          className={cn(
            "relative w-32 h-32 rounded-full p-1 transition-all duration-500",
            isActive
              ? "bg-gradient-to-br from-emerald-500 via-cyan-500 to-blue-500"
              : "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500"
          )}
        >
          {/* Inner circle */}
          <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center">
            {/* Icon */}
            <div className="relative">
              <Brain className="w-14 h-14 text-white" />
              {isActive && (
                <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-cyan-400 animate-pulse" />
              )}
            </div>
          </div>
        </div>

        {/* Activity indicator */}
        {isActive && (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
            <div className="px-3 py-1 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-xs font-semibold text-white shadow-lg animate-pulse">
              Active
            </div>
          </div>
        )}
      </div>

      {/* Phase & Progress */}
      <div className="w-full space-y-2">
        <div className="text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wider">
            Current Phase
          </p>
          <p className="text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 capitalize">
            {phase}
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full">
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500 h-full rounded-full transition-all duration-500 relative overflow-hidden"
              style={{ width: `${progress}%` }}
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            </div>
          </div>
          <p className="text-xs text-gray-500 text-center mt-1">
            {progress}% complete
          </p>
        </div>
      </div>
    </div>
  );
}
