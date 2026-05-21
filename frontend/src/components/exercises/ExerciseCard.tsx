"use client";

import { motion } from "framer-motion";

interface ExerciseCardProps {
  name: string;
  description: string;
  duration: number;
  reps: number;
  sets: number;
  target: string;
  delay?: number;
}

export default function ExerciseCard({
  name,
  description,
  duration,
  reps,
  sets,
  target,
  delay = 0,
}: ExerciseCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow group"
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-semibold text-[#1A1A2E]">{name}</h3>
        <span className="text-xs font-medium uppercase tracking-wider text-[#C9A84C] bg-[#FFFBEB] px-3 py-1 rounded-full border border-[#FEF3C7]">
          {target}
        </span>
      </div>
      
      <p className="text-sm text-[#6B7280] leading-relaxed mb-6 h-16 line-clamp-3">
        {description}
      </p>

      <div className="flex gap-4 pt-4 border-t border-[#E5E7EB]">
        <div>
          <p className="text-xs uppercase tracking-wider text-[#6B7280] mb-1">Duration</p>
          <p className="font-medium text-[#1A1A2E]">{duration} min</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-[#6B7280] mb-1">Sets</p>
          <p className="font-medium text-[#1A1A2E]">{sets}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-[#6B7280] mb-1">Reps</p>
          <p className="font-medium text-[#1A1A2E]">{reps}</p>
        </div>
      </div>

      <button className="w-full mt-6 bg-[#F8F5F0] text-[#1A1A2E] py-2.5 rounded-lg font-medium text-sm group-hover:bg-[#1A1A2E] group-hover:text-white transition-colors">
        Mark Complete
      </button>
    </motion.div>
  );
}
