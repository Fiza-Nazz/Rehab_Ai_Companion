"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import api from "@/lib/api";
import toast from "react-hot-toast";

// Helper to determine color based on score (1-10)
const getScoreColor = (score: number) => {
  if (score <= 3) return "#10B981"; // Green (Good)
  if (score <= 6) return "#F59E0B"; // Yellow (Warning)
  return "#EF4444"; // Red (Danger)
};

export default function CheckInForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    pain: 5,
    fatigue: 5,
    mobility: 5,
    mood: 5,
    notes: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "notes" ? value : Number(value),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        checkin_date: new Date().toISOString().split("T")[0],
        pain_score: formData.pain,
        fatigue_score: formData.fatigue,
        mobility_score: formData.mobility,
        mood_score: formData.mood,
        notes: formData.notes,
      };
      
      await api.post("/checkin/", payload);
      toast.success("Check-in submitted! AI is generating your exercise plan...");
      
      router.push("/exercises");
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.detail || "Failed to submit check-in. Please try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const renderSlider = (name: keyof typeof formData, label: string, minLabel: string, maxLabel: string) => {
    const value = formData[name] as number;
    const color = getScoreColor(value);

    return (
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <label className="text-sm font-medium text-[#1A1A2E] uppercase tracking-wider">{label}</label>
          <span className="text-2xl font-semibold" style={{ color }}>{value}/10</span>
        </div>
        
        <input
          type="range"
          name={name}
          min="1"
          max="10"
          value={value}
          onChange={handleChange}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${color} ${(value - 1) * 11.1}%, #E5E7EB ${(value - 1) * 11.1}%)`
          }}
        />
        <div className="flex justify-between mt-2 text-xs text-[#6B7280]">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>

        {/* Custom styling for webkit slider thumb */}
        <style jsx>{`
          input[type=range]::-webkit-slider-thumb {
            appearance: none;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: white;
            border: 2px solid ${color};
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
        `}</style>
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit}>
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-6">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            className="w-12 h-12 border-4 border-[#E5E7EB] border-t-[#1A1A2E] rounded-full"
          />
          <p className="text-lg font-medium text-[#1A1A2E]">AI is analyzing your data...</p>
          <p className="text-sm text-[#6B7280]">Generating personalized exercise plan</p>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {renderSlider("pain", "Pain Score", "No pain", "Worst pain imaginable")}
          {renderSlider("fatigue", "Fatigue Level", "Full of energy", "Completely exhausted")}
          {renderSlider("mobility", "Mobility / Stiffness", "Moving freely", "Very stiff / restricted")}
          {renderSlider("mood", "Mood / Mental State", "Very positive", "Very distressed")}

          <div className="mb-8 mt-6">
            <label className="text-sm font-medium text-[#1A1A2E] uppercase tracking-wider block mb-3">
              Additional Notes (Optional)
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={4}
              placeholder="Any specific issues or feelings you want to log today?"
              className="w-full border border-[#E5E7EB] rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-[#1A1A2E] resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#1A1A2E] text-white py-4 rounded-xl font-medium text-lg hover:bg-[#0A0A0A] transition-colors shadow-sm"
          >
            Submit Check-in
          </button>
        </motion.div>
      )}
    </form>
  );
}
