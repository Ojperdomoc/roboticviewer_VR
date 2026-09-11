type Props = {
  onStart: (facing: "user" | "environment") => void;
  busy: boolean;
  status: string;
  vr: boolean;
  setVr: (v: boolean) => void;
  game: boolean;
  setGame: (v: boolean) => void;
};

export default function StartScreen({ onStart, busy, status, vr, setVr, game, setGame }: Props) {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#04070d] px-4 py-10 text-slate-100">
      {/* Fondo decorativo */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.18),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(217,70,239,0.16),transparent_45%),radial-gradient(circle_at_50%_90%,rgba(16,185,129,0.14),transparent_50%)]" />
        <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(125,211,252,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(125,211,252,0.35)_1px,transparent_1px)] [background-size:46px_46px]" />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-[linear-gradient(to_top,#04070d,transparent)]" />
      </div>

      <div className="relative z-10 w-full max-w-3xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1.5 text-[11px] font-bold tracking-[0.25em] text-cyan-300">
            REALIDAD MIXTA · WEB XR
          </div>
          <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
            <span className="bg-gradient-to-r from-cyan-300 via-sky-200 to-fuchsia-300 bg-clip-text text-transparent">
              PROTOCOLO ANDROIDE
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
            Apunta la cámara de tu celular hacia tu cuerpo. La IA detecta tu esqueleto, tus manos y
            cada uno de tus dedos en tiempo real y <strong className="text-cyan-300">sólo altera tus
            partes corporales</strong>, reconstruyéndolas como prótesis robóticas.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { t: "1 · Detección", d: "33 puntos corporales + 21 puntos por mano (dedos incluidos)." },
            { t: "2 · Alteración", d: "Cada parte se reconstruye con placas, pistones y servos." },
            { t: "3 · Interacción", d: "Junta pulgar e índice para disparar o soltar un PEM." },
          ].map((c) => (
            <div
              key={c.t}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm"
            >
              <div className="text-[13px] font-bold text-cyan-300">{c.t}</div>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">{c.d}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => setGame(!game)}
            className={`rounded-2xl border p-4 text-left transition ${
              game
                ? "border-cyan-400/40 bg-cyan-400/10"
                : "border-white/10 bg-white/[0.03] hover:border-white/25"
            }`}
          >
            <div className="text-sm font-bold">Modo misión</div>
            <p className="mt-1 text-xs text-slate-400">
              Recoge cubos de datos con los dedos para instalar cada módulo robótico.
            </p>
          </button>
          <button
            onClick={() => setVr(!vr)}
            className={`rounded-2xl border p-4 text-left transition ${
              vr
                ? "border-fuchsia-400/40 bg-fuchsia-400/10"
                : "border-white/10 bg-white/[0.03] hover:border-white/25"
            }`}
          >
            <div className="text-sm font-bold">Modo VR estéreo</div>
            <p className="mt-1 text-xs text-slate-400">
              Vista dividida con paralaje de profundidad para visores tipo cartón.
            </p>
          </button>
        </div>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <button
            disabled={busy}
            onClick={() => onStart("user")}
            className="group flex-1 rounded-2xl bg-gradient-to-r from-cyan-400 to-sky-500 px-6 py-4 text-base font-black tracking-wide text-slate-900 shadow-[0_0_40px_-8px] shadow-cyan-400/60 transition hover:brightness-110 disabled:opacity-50"
          >
            {busy ? status || "CARGANDO…" : "ACTIVAR CON CÁMARA FRONTAL"}
          </button>
          <button
            disabled={busy}
            onClick={() => onStart("environment")}
            className="flex-1 rounded-2xl border border-white/15 bg-white/5 px-6 py-4 text-base font-bold text-slate-100 transition hover:border-cyan-300/50 hover:bg-white/10 disabled:opacity-50"
          >
            {busy ? "…" : "USAR CÁMARA TRASERA"}
          </button>
        </div>

        <p className="mt-5 text-center text-[11px] leading-relaxed text-slate-500">
          Se necesita permiso de cámara y conexión HTTPS (o localhost). Nada se envía a servidores:
          todo el procesamiento ocurre en tu dispositivo.
        </p>
      </div>
    </div>
  );
}
