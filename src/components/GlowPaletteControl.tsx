import { m, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";

// Pre-2026-09 palette kept for one-line revert.
export const legacyGlowPresets = [
  { name: "Emerald", value: "#21917e" },
  { name: "Cyan", value: "#2d8ca4" },
  { name: "Blue", value: "#4d74b8" },
  { name: "Violet", value: "#7b6cc4" },
  { name: "Rose", value: "#b85f7d" },
  { name: "Amber", value: "#a9832f" },
];

export const glowPresets = [
  { name: "Emerald", glow: "#17c1a0" },
  { name: "Cyan", glow: "#22b8d8" },
  { name: "Indigo", glow: "#5b8cff" },
  { name: "Violet", glow: "#a06bff" },
  { name: "Rose", glow: "#ff5f9e" },
  { name: "Amber", glow: "#ffb224" },
];

type GlowPaletteControlProps = {
  value: string;
  onChange: (value: string) => void;
};

export function GlowPaletteControl({ value, onChange }: GlowPaletteControlProps) {
  const shouldReduceMotion = useReducedMotion();
  const transition = shouldReduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 420, damping: 30 };

  return (
    <div className="glow-palette" role="radiogroup" aria-label="Digital glow">
      {glowPresets.map((preset) => {
        const selected = preset.glow.toLowerCase() === value.toLowerCase();

        return (
          <m.button
            key={preset.glow}
            type="button"
            className={`glow-palette__swatch ${selected ? "glow-palette__swatch--selected" : ""}`}
            style={{ backgroundColor: preset.glow }}
            onClick={() => onChange(preset.glow)}
            role="radio"
            aria-checked={selected}
            aria-label={preset.name}
            title={preset.name}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
            whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
            transition={transition}
          >
            {selected ? <Check size={13} /> : null}
          </m.button>
        );
      })}
    </div>
  );
}
