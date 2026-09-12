import { useEffect, useState } from "react";

const variants = ["dots", "grid", "aurora", "gradient", "none"] as const;
type BackgroundVariant = (typeof variants)[number];

type TuningValues = {
  variant: BackgroundVariant;
  opacity: number;
  patternSize: number;
  tint: number;
  motion: number;
  availabilityBand: number;
  availabilityOutline: number;
  availabilityOpacity: number;
};

const defaults: TuningValues = {
  variant: "dots",
  opacity: 0.22,
  patternSize: 32,
  tint: 40,
  motion: 10,
  availabilityBand: 9,
  availabilityOutline: 2.5,
  availabilityOpacity: 0.34,
};

export function TunePanel() {
  const [values, setValues] = useState<TuningValues>(defaults);
  const [forceDarkTheme, setForceDarkTheme] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!forceDarkTheme) {
      return;
    }

    const shell = document.querySelector<HTMLElement>(".app-shell");
    if (!shell) {
      return;
    }

    const originalClassName = shell.className;
    const enforceDarkTheme = () => {
      shell.classList.remove("app-shell--hotel-analog");
      shell.classList.add("app-shell--dark-digital");
    };
    const observer = new MutationObserver(enforceDarkTheme);

    enforceDarkTheme();
    observer.observe(shell, { attributes: true, attributeFilter: ["class"] });

    return () => {
      observer.disconnect();
      shell.className = originalClassName;
    };
  }, [forceDarkTheme]);

  useEffect(() => {
    const shell = document.querySelector<HTMLElement>(".app-shell");
    if (!shell) {
      return;
    }

    shell.dataset.bg = values.variant;
    shell.style.setProperty("--bg-pattern-opacity", String(values.opacity));
    shell.style.setProperty("--bg-pattern-size", `${values.patternSize}px`);
    shell.style.setProperty("--bg-pattern-tint", `${values.tint}%`);
    shell.style.setProperty("--bg-motion", `${values.motion}s`);
    shell.style.setProperty("--availability-band", `${values.availabilityBand}px`);
    shell.style.setProperty("--availability-band-outline", `${values.availabilityOutline}px`);
    shell.style.setProperty("--availability-opacity", String(values.availabilityOpacity));
  }, [values]);

  const output = [
    "/* Availability */",
    ":root {",
    `  --availability-band: ${values.availabilityBand}px;`,
    `  --availability-band-outline: ${values.availabilityOutline}px;`,
    `  --availability-opacity: ${values.availabilityOpacity};`,
    "}",
    "",
    "/* Background */",
    ":root {",
    `  --bg-pattern-opacity: ${values.opacity};`,
    `  --bg-pattern-size: ${values.patternSize}px;`,
    `  --bg-pattern-tint: ${values.tint}%;`,
    `  --bg-motion: ${values.motion}s;`,
    "}",
    `/* data-bg="${values.variant}" */`,
  ].join(String.fromCharCode(10));

  function update<Key extends keyof TuningValues>(key: Key, value: TuningValues[Key]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  if (collapsed) {
    return (
      <aside className="background-tuner background-tuner--collapsed" aria-label="Tuning panel">
        <button type="button" onClick={() => setCollapsed(false)}>Tune</button>
      </aside>
    );
  }

  return (
    <aside className="background-tuner" aria-label="Tuning panel">
      <div className="background-tuner__header">
        <div>
          <h2>Tuning panel</h2>
          <p>Adjust the clock wall styles live.</p>
        </div>
        <div className="background-tuner__header-actions">
          <button type="button" onClick={() => setValues({ ...defaults })}>Reset To Current</button>
          <button type="button" onClick={() => setCollapsed(true)} aria-label="Collapse tuning panel">Hide</button>
        </div>
      </div>

      <label className="background-tuner__checkbox">
        <input type="checkbox" checked={forceDarkTheme} onChange={(event) => setForceDarkTheme(event.target.checked)} />
        <span>Force Dark Theme</span>
      </label>

      <fieldset className="background-tuner__group">
        <legend>Background</legend>

        <div className="background-tuner__variants">
          <span>Variant</span>
          <div>
            {variants.map((variant) => (
              <button
                key={variant}
                type="button"
                className={values.variant === variant ? "background-tuner__variant--active" : undefined}
                aria-pressed={values.variant === variant}
                onClick={() => update("variant", variant)}
              >
                {variant}
              </button>
            ))}
          </div>
        </div>

        <label className="background-tuner__control">
          <span>Opacity <output>{values.opacity.toFixed(2)}</output></span>
          <input type="range" min="0" max="0.6" step="0.01" value={values.opacity} onChange={(event) => update("opacity", Number(event.target.value))} />
        </label>

        <label className="background-tuner__control">
          <span>Pattern size <output>{values.patternSize}px</output></span>
          <input type="range" min="12" max="64" step="2" value={values.patternSize} onChange={(event) => update("patternSize", Number(event.target.value))} />
        </label>

        <label className="background-tuner__control">
          <span>Tint <output>{values.tint}%</output></span>
          <input type="range" min="0" max="100" step="5" value={values.tint} onChange={(event) => update("tint", Number(event.target.value))} />
        </label>

        <label className="background-tuner__control">
          <span>Motion <output>{values.motion}s</output></span>
          <input type="range" min="0" max="60" step="2" value={values.motion} onChange={(event) => update("motion", Number(event.target.value))} />
        </label>
      </fieldset>

      <fieldset className="background-tuner__group">
        <legend>Availability</legend>

        <label className="background-tuner__control">
          <span>Band Width <output>{values.availabilityBand}px</output></span>
          <input type="range" min="4" max="16" step="0.5" value={values.availabilityBand} onChange={(event) => update("availabilityBand", Number(event.target.value))} />
        </label>

        <label className="background-tuner__control">
          <span>Outline Width <output>{values.availabilityOutline}px</output></span>
          <input type="range" min="1" max="6" step="0.5" value={values.availabilityOutline} onChange={(event) => update("availabilityOutline", Number(event.target.value))} />
        </label>

        <label className="background-tuner__control">
          <span>Opacity <output>{values.availabilityOpacity.toFixed(2)}</output></span>
          <input type="range" min="0.1" max="1" step="0.02" value={values.availabilityOpacity} onChange={(event) => update("availabilityOpacity", Number(event.target.value))} />
        </label>
      </fieldset>

      <div className="background-tuner__output">
        <div>
          <span>CSS to commit</span>
          <button type="button" onClick={() => void navigator.clipboard.writeText(output).catch(() => undefined)}>Copy</button>
        </div>
        <pre>{output}</pre>
      </div>
    </aside>
  );
}
