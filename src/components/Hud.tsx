import { MODULES, MATERIALS } from "../game/config";
import type { Options, PartId, Stats } from "../game/engine";

type Props = {
  stats: Stats;
  opt: Options;
  setOpt: (o: Partial<Options>) => void;
  panel: boolean;
  setPanel: (v: boolean) => void;
  onPause: () => void;
  onRestart: () => void;
  onCamera: () => void;
  onPhoto: () => void;
  onFullscreen: () => void;
  onExit: () => void;
  stereoWarning: boolean;
};

function Btn({
  children,
  onClick,
  active,
  tone = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  tone?: "default" | "primary" | "danger";
}) {
  const base =
    "rounded-xl px-3 py-2 text-[11px] font-bold tracking-wide transition select-none active:scale-95 backdrop-blur-md border";
  const styles = active
    ? "border-cyan-300/60 bg-cyan-400/20 text-cyan-100"
    : tone === "primary"
      ? "border-cyan-300/50 bg-cyan-400/15 text-cyan-100 hover:bg-cyan-400/25"
      : tone === "danger"
        ? "border-rose-400/40 bg-rose-500/15 text-rose-100 hover:bg-rose-500/25"
        : "border-white/15 bg-black/40 text-slate-200 hover:border-white/35 hover:bg-black/60";
  return (
    <button onClick={onClick} className={`${base} ${styles}`}>
      {children}
    </button>
  );
}

export default function Hud({
  stats,
  opt,
  setOpt,
  panel,
  setPanel,
  onPause,
  onRestart,
  onCamera,
  onPhoto,
  onFullscreen,
  onExit,
  stereoWarning,
}: Props) {
  const mm = Math.floor(Math.max(0, stats.time) / 60);
  const ss = Math.floor(Math.max(0, stats.time) % 60);
  const lowEnergy = stats.energy <= 35;

  return (
    <>
      {/* Barra superior */}
      {!opt.stereo && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-3">
          <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-white/10 bg-black/50 px-3 py-2 backdrop-blur-md">
            <div className="text-[10px] font-bold tracking-widest text-slate-400">PTS</div>
            <div className="font-mono text-xl font-black tabular-nums text-cyan-200">
              {stats.score.toString().padStart(5, "0")}
            </div>
            {stats.combo > 1 && (
              <div className="rounded-md bg-fuchsia-500/25 px-1.5 py-0.5 text-[10px] font-black text-fuchsia-200">
                x{stats.combo}
              </div>
            )}
          </div>

          <div className="pointer-events-auto flex flex-col items-center gap-1 rounded-2xl border border-white/10 bg-black/50 px-3 py-2 backdrop-blur-md">
            <div className="font-mono text-lg font-black tabular-nums text-slate-100">
              {mm}:{ss.toString().padStart(2, "0")}
            </div>
            <div className="text-[9px] font-bold tracking-widest text-slate-400">
              {stats.status}
            </div>
          </div>

          <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-white/10 bg-black/50 px-3 py-2 backdrop-blur-md">
            <div className="text-right">
              <div className="text-[9px] font-bold tracking-widest text-slate-400">ENERGÍA</div>
              <div className={`font-mono text-sm font-black ${lowEnergy ? "text-rose-300" : "text-emerald-300"}`}>
                {Math.round(stats.energy)}%
              </div>
            </div>
            <div className="h-8 w-2 overflow-hidden rounded-full bg-white/10">
              <div
                className={`w-full rounded-full transition-all duration-200 ${lowEnergy ? "bg-rose-500" : "bg-emerald-400"}`}
                style={{ height: `${stats.energy}%`, marginTop: `${100 - stats.energy}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Rail de módulos corporales */}
      {!opt.stereo && (
        <div className="pointer-events-none absolute left-2 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-1.5 sm:left-3 sm:gap-2">
          {MODULES.map((m) => {
            const id = m.id as PartId;
            const done = stats.installed[id];
            const got = Math.min(stats.collected[id] ?? 0, m.need);
            const active = done && opt.partOn[id];
            return (
              <div
                key={m.id}
                className={`pointer-events-auto w-28 rounded-xl border px-2 py-1.5 backdrop-blur-md transition sm:w-44 sm:px-3 sm:py-2 ${
                  active
                    ? "border-cyan-300/50 bg-cyan-400/15"
                    : done
                      ? "border-white/15 bg-black/45"
                      : "border-white/10 bg-black/30"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{m.icon}</span>
                  <span
                    className={`text-[10px] font-black tracking-wider ${active ? "text-cyan-100" : "text-slate-300"}`}
                  >
                    {m.short}
                  </span>
                  {done && <span className="ml-auto text-[9px] font-bold text-emerald-300">ON</span>}
                </div>
                {!done && (
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-400"
                      style={{ width: `${(got / m.need) * 100}%` }}
                    />
                  </div>
                )}
                {done && (
                  <button
                    onClick={() => setOpt({ partOn: { ...opt.partOn, [id]: !opt.partOn[id] } })}
                    className="mt-1.5 w-full rounded-md bg-white/10 py-0.5 text-[9px] font-bold text-slate-200 hover:bg-white/20"
                  >
                    {opt.partOn[id] ? "OCULTAR" : "MOSTRAR"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Estado de tracking */}
      {!opt.stereo && (
        <div className="pointer-events-none absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-xl border border-white/10 bg-black/45 px-3 py-2 font-mono text-[10px] leading-relaxed text-slate-300 backdrop-blur-md">
          <div className={stats.poseFound ? "text-emerald-300" : "text-amber-300"}>
            CUERPO {stats.poseFound ? "FIJADO" : "—"}
          </div>
          <div className={stats.hands > 0 ? "text-emerald-300" : "text-amber-300"}>
            MANOS {stats.hands}
          </div>
          <div className="text-slate-400">FPS {stats.fps}</div>
        </div>
      )}

      {/* Controles inferiores */}
      <div className="absolute inset-x-0 bottom-0 z-20 flex flex-wrap items-center justify-center gap-2 p-3">
        <Btn onClick={() => setPanel(!panel)} active={panel}>
          ⚙ AJUSTES
        </Btn>
        <Btn onClick={onPause}>{stats.paused ? "▶ REANUDAR" : "⏸ PAUSA"}</Btn>
        <Btn onClick={onRestart}>↻ REINICIAR</Btn>
        <Btn onClick={onCamera}>🔄 CÁMARA</Btn>
        <Btn onClick={onPhoto}>📸 FOTO</Btn>
        <Btn onClick={onFullscreen} tone="primary">
          ⛶ PANTALLA
        </Btn>
        <Btn onClick={onExit} tone="danger">
          ✕ SALIR
        </Btn>
      </div>

      {stereoWarning && (
        <div className="pointer-events-none absolute left-1/2 top-16 z-20 -translate-x-1/2 rounded-lg border border-fuchsia-400/40 bg-black/70 px-3 py-1.5 text-[11px] font-bold text-fuchsia-200 backdrop-blur">
          Gira el teléfono a horizontal y colócalo en tu visor VR
        </div>
      )}

      {/* Panel de ajustes */}
      {panel && (
        <div className="absolute inset-x-0 bottom-0 z-30 max-h-[72vh] overflow-y-auto rounded-t-3xl border-t border-white/15 bg-[#060b14]/95 p-4 pb-24 backdrop-blur-xl">
          <div className="mx-auto max-w-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black tracking-[0.2em] text-cyan-300">CONFIGURACIÓN</h2>
              <button onClick={() => setPanel(false)} className="text-xs font-bold text-slate-400">
                CERRAR
              </button>
            </div>

            <Section title="Material del cuerpo">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {Object.values(MATERIALS).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setOpt({ material: m.id })}
                    className={`rounded-xl border px-2 py-2 text-[11px] font-bold transition ${
                      opt.material === m.id
                        ? "border-cyan-300/70 bg-cyan-400/20 text-cyan-100"
                        : "border-white/10 bg-white/5 text-slate-300 hover:border-white/30"
                    }`}
                  >
                    <span
                      className="mx-auto mb-1 block h-4 w-4 rounded-full border"
                      style={{
                        background: `linear-gradient(135deg, ${m.hull}, ${m.hullDark})`,
                        borderColor: m.accent,
                      }}
                    />
                    {m.name}
                  </button>
                ))}
              </div>
            </Section>

            <Section title="Partes alteradas">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {MODULES.map((m) => {
                  const id = m.id as PartId;
                  const installed = stats.installed[id];
                  return (
                    <button
                      key={m.id}
                      disabled={!installed}
                      onClick={() => setOpt({ partOn: { ...opt.partOn, [id]: !opt.partOn[id] } })}
                      className={`rounded-xl border px-2 py-2 text-[11px] font-bold transition disabled:opacity-35 ${
                        installed && opt.partOn[id]
                          ? "border-cyan-300/60 bg-cyan-400/20 text-cyan-100"
                          : "border-white/10 bg-white/5 text-slate-300"
                      }`}
                    >
                      <div className="text-base">{m.icon}</div>
                      {m.short}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                En modo misión cada parte se desbloquea al recoger cubos de datos. Activa el modo
                libre para tener todo el cuerpo robótico.
              </p>
            </Section>

            <Section title="Entorno">
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ["real", "Cámara real"],
                    ["grid", "Rejilla táctica"],
                    ["void", "Sólo robot"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setOpt({ background: id })}
                    className={`rounded-xl border px-2 py-2 text-[11px] font-bold transition ${
                      opt.background === id
                        ? "border-cyan-300/60 bg-cyan-400/20 text-cyan-100"
                        : "border-white/10 bg-white/5 text-slate-300"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Section>

            <Section title="Visor VR">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setOpt({ stereo: !opt.stereo })}
                  className={`rounded-xl border px-4 py-2 text-[11px] font-bold transition ${
                    opt.stereo
                      ? "border-fuchsia-300/60 bg-fuchsia-400/20 text-fuchsia-100"
                      : "border-white/10 bg-white/5 text-slate-300"
                  }`}
                >
                  {opt.stereo ? "ESTÉREO ACTIVADO" : "ACTIVAR ESTÉREO"}
                </button>
                <label className="flex flex-1 items-center gap-2 text-[11px] text-slate-300">
                  <span className="whitespace-nowrap">Separación</span>
                  <input
                    type="range"
                    min={0}
                    max={1.4}
                    step={0.05}
                    value={opt.ipd}
                    onChange={(e) => setOpt({ ipd: Number(e.target.value) })}
                    className="w-full accent-fuchsia-400"
                  />
                </label>
              </div>
            </Section>

            <Section title="Extras">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setOpt({ diagnostics: !opt.diagnostics })}
                  className={`rounded-xl border px-3 py-2 text-[11px] font-bold ${
                    opt.diagnostics
                      ? "border-cyan-300/60 bg-cyan-400/20 text-cyan-100"
                      : "border-white/10 bg-white/5 text-slate-300"
                  }`}
                >
                  DIAGNÓSTICO (ángulos)
                </button>
                <button
                  onClick={() => setOpt({ sound: !opt.sound })}
                  className={`rounded-xl border px-3 py-2 text-[11px] font-bold ${
                    opt.sound
                      ? "border-cyan-300/60 bg-cyan-400/20 text-cyan-100"
                      : "border-white/10 bg-white/5 text-slate-300"
                  }`}
                >
                  SONIDO {opt.sound ? "ON" : "OFF"}
                </button>
                <button
                  onClick={() => setOpt({ game: !opt.game })}
                  className={`rounded-xl border px-3 py-2 text-[11px] font-bold ${
                    opt.game
                      ? "border-cyan-300/60 bg-cyan-400/20 text-cyan-100"
                      : "border-white/10 bg-white/5 text-slate-300"
                  }`}
                >
                  {opt.game ? "MODO MISIÓN" : "MODO LIBRE"}
                </button>
              </div>
            </Section>
          </div>
        </div>
      )}

      {/* Fin de partida */}
      {stats.over && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-white/15 bg-[#070d18]/95 p-6 text-center shadow-2xl">
            <div
              className={`text-3xl font-black ${stats.victory ? "text-cyan-300" : "text-rose-300"}`}
            >
              {stats.victory ? "TRANSFORMACIÓN COMPLETA" : "SISTEMA CAÍDO"}
            </div>
            <p className="mt-2 text-xs text-slate-400">
              {stats.victory
                ? "Todo tu cuerpo ha sido reconstruido en aleación inteligente."
                : "El reactor se quedó sin energía. Vuelve a intentarlo."}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/5 p-3">
                <div className="text-[10px] font-bold tracking-widest text-slate-400">PUNTOS</div>
                <div className="font-mono text-xl font-black text-cyan-200">{stats.score}</div>
              </div>
              <div className="rounded-xl bg-white/5 p-3">
                <div className="text-[10px] font-bold tracking-widest text-slate-400">RÉCORD</div>
                <div className="font-mono text-xl font-black text-fuchsia-200">{stats.best}</div>
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-2">
              <button
                onClick={onRestart}
                className="rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 px-4 py-3 text-sm font-black text-slate-900"
              >
                REINTENTAR MISIÓN
              </button>
              <button
                onClick={() => {
                  setOpt({ game: false });
                  onRestart();
                }}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-bold text-slate-200"
              >
                SEGUIR EN MODO LIBRE
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-[10px] font-black tracking-[0.2em] text-slate-500">{title}</div>
      {children}
    </div>
  );
}
