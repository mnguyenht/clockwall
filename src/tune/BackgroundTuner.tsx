import { useEffect, useState } from "react";

const variants = ["dots", "grid", "aurora", "gradient", "none"] as const;
type BackgroundVariant = (typeof variants)[number];

type TuningValues = {
  variant: BackgroundVariant;
  opacity: number;
  patternSize: number;
  tint: number;
  motion: number;
};

const defaults: TuningValues = {
  variant: "dots",
  opacity: 0.3,
  patternSize: 26,
  tint: 30,
  motion: 0,
};

export function BackgroundTuner() {
  const [values, setValues] = useState<TuningValues>(defaults);

  useEffect(() => {
    const shell = document.querySelector<HTMLElement>(".app-shell");
    if (!shell) {
      return;
    }

    const originalClassName = shell.className;
    const forceDarkTheme = () => {
      shell.classList.remove("app-shell--hotel-analog");
      shell.classList.add("app-shell--dark-digital");
    };
    const observer = new MutationObserver(forceDarkTheme);

    forceDarkTheme();
    observer.observe(shell, { attributes: true, attributeFilter: ["class"] });

    return () => {
      observer.disconnect();
      shell.className = originalClassName;
    };
  }, []);

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
  }, [values]);

  const output = [
    `--bg-pattern-opacity: ${values.opacity};`,
    `--bg-pattern-size: ${values.patternSize}px;`,
    `--bg-pattern-tint: ${values.tint}%;`,
    `--bg-motion: ${values.motion}s;`,
    `/* data-bg="${values.variant}" */`,
  ].join(String.fromCharCode(10));

  function update<Key extends keyof TuningValues>(key: Key, value: TuningValues[Key]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  return (
    <aside className="background-tuner" aria-label="Dark background tuner">
      <div className="background-tuner__header">
        <div>
          <h2>Background tuner</h2>
          <p>Dark theme is forced while this panel is open.</p>
        </div>
        <button type="button" onClick={() => setValues({ ...defaults })}>Reset to current</button>
      </div>

      <fieldset className="background-tuner__variants">
        <legend>Variant</legend>
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
      </fieldset>

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
