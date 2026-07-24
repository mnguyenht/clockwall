import { Check } from "lucide-react";

const glowPresets = [
  { name: "Emerald", value: "#21917e" },
  { name: "Cyan", value: "#2d8ca4" },
  { name: "Blue", value: "#4d74b8" },
  { name: "Violet", value: "#7b6cc4" },
  { name: "Rose", value: "#b85f7d" },
  { name: "Amber", value: "#a9832f" },
];

type GlowPaletteControlProps = {
  value: string;
  onChange: (value: string) => void;
};

export function GlowPaletteControl({ value, onChange }: GlowPaletteControlProps) {
  return (
    <div className="glow-palette" role="radiogroup" aria-label="Digital glow">
      {glowPresets.map((preset) => {
        const selected = preset.value.toLowerCase() === value.toLowerCase();

        return (
          <button
            key={preset.value}
            type="button"
            className={`glow-palette__swatch ${selected ? "glow-palette__swatch--selected" : ""}`}
            style={{ backgroundColor: preset.value }}
            onClick={() => onChange(preset.value)}
            role="radio"
            aria-checked={selected}
            aria-label={preset.name}
            title={preset.name}
          >
            {selected ? <Check size={13} /> : null}
          </button>
        );
      })}
    </div>
  );
}
