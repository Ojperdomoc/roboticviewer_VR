import { useCallback, useEffect, useRef, useState } from "react";
import Hud from "./components/Hud";
import StartScreen from "./components/StartScreen";
import { Engine, type Options, type Stats } from "./game/engine";

const EMPTY_STATS: Stats = {
  score: 0,
  best: 0,
  time: 120,
  energy: 100,
  combo: 0,
  fps: 0,
  hands: 0,
  poseFound: false,
  installed: { manos: true, brazos: true, torso: true, piernas: true, cabeza: true },
  collected: { manos: 0, brazos: 0, torso: 0, piernas: 0, cabeza: 0 },
  nextModule: null,
  status: "EN ESPERA",
  over: false,
  victory: false,
  paused: false,
};

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);

  const [phase, setPhase] = useState<"intro" | "playing">("intro");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [panel, setPanel] = useState(false);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [hint, setHint] = useState(true);
  const [vr, setVr] = useState(false);
  const [game, setGame] = useState(true);
  const [opt, setOptState] = useState<Options>({
    material: "cromo",
    stereo: false,
    ipd: 0.55,
    background: "real",
    diagnostics: false,
    game: true,
    sound: true,
    partOn: { manos: true, brazos: true, torso: true, piernas: true, cabeza: true },
  });

  // ---------------------------------------------------------------- opciones
  const setOpt = useCallback((patch: Partial<Options>) => {
    setOptState((prev) => {
      const next = { ...prev, ...patch };
      engineRef.current?.setOptions(next);
      if (patch.game !== undefined && patch.game !== prev.game) engineRef.current?.resetGame();
      return next;
    });
  }, []);

  useEffect(() => {
    engineRef.current?.setOptions(opt);
  }, [opt]);

  // Sincroniza el modo VR elegido en la pantalla de inicio
  useEffect(() => {
    setOptState((p) => ({ ...p, stereo: vr, game }));
  }, [vr, game]);

  // ------------------------------------------------------------------ inicio
  const handleStart = useCallback(
    async (facing: "user" | "environment") => {
      if (!videoRef.current || !canvasRef.current) return;
      setBusy(true);
      setStatus("Preparando sensores…");
      try {
        if (!engineRef.current) {
          engineRef.current = new Engine(
            canvasRef.current,
            videoRef.current,
            (s) => setStats(s),
            (msg, isBusy) => {
              setStatus(msg);
              setBusy(isBusy);
            },
          );
        }
        engineRef.current.setOptions({ ...opt, stereo: vr, game });
        await engineRef.current.start(facing);
        engineRef.current.resetGame();
        setPhase("playing");
        setHint(true);
        window.setTimeout(() => setHint(false), 9000);
        // Wake lock para que no se apague la pantalla
        try {
          // @ts-ignore
          await navigator.wakeLock?.request("screen");
        } catch {
          /* noop */
        }
      } catch {
        setBusy(false);
        setStatus("Permiso de cámara denegado o no disponible.");
      }
    },
    [opt, vr, game],
  );

  // ------------------------------------------------------------------- ciclo
  useEffect(() => {
    const onResize = () => engineRef.current?.resize();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  useEffect(() => {
    const el = document.documentElement;
    if (opt.stereo && phase === "playing") {
      try {
        // @ts-ignore
        void (screen.orientation as unknown as { lock?: (o: string) => Promise<void> })?.lock?.("landscape");
      } catch {
        /* noop */
      }
    } else {
      try {
        // @ts-ignore
        void (screen.orientation as unknown as { unlock?: () => void })?.unlock?.();
      } catch {
        /* noop */
      }
    }
    if (opt.stereo && phase === "playing" && !document.fullscreenElement) {
      void el.requestFullscreen?.().catch(() => undefined);
    }
  }, [opt.stereo, phase]);

  useEffect(() => {
    return () => engineRef.current?.destroy();
  }, []);

  const exit = useCallback(() => {
    engineRef.current?.stop();
    setPhase("intro");
    setBusy(false);
    setStatus("");
  }, []);

  const restart = useCallback(() => {
    engineRef.current?.resetGame();
  }, []);

  const togglePause = useCallback(() => engineRef.current?.togglePause(), []);

  const switchCamera = useCallback(() => {
    void engineRef.current?.switchCamera();
  }, []);

  const photo = useCallback(() => engineRef.current?.snapshot(), []);

  const fullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen?.();
    else void document.documentElement.requestFullscreen?.().catch(() => undefined);
  }, []);

  // -------------------------------------------------------------------- UI
  if (phase === "intro") {
    return (
      <StartScreen
        onStart={handleStart}
        busy={busy}
        status={status}
        vr={vr}
        setVr={setVr}
        game={game}
        setGame={setGame}
      />
    );
  }

  const warning = opt.stereo && window.innerHeight > window.innerWidth;

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#04070d] text-slate-100">
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-0"
      />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {hint && !stats.over && (
        <div className="pointer-events-none absolute inset-x-0 bottom-24 z-20 flex justify-center px-4">
          <div className="rounded-2xl border border-cyan-300/30 bg-black/60 px-4 py-2 text-center text-[11px] leading-relaxed text-cyan-100 backdrop-blur-md">
            Toca los cubos de datos con la punta de tus dedos · Junta pulgar + índice y suelta para
            disparar · mantenlo 1 s para un PEM
          </div>
        </div>
      )}

      <Hud
        stats={stats}
        opt={opt}
        setOpt={setOpt}
        panel={panel}
        setPanel={setPanel}
        onPause={togglePause}
        onRestart={restart}
        onCamera={switchCamera}
        onPhoto={photo}
        onFullscreen={fullscreen}
        onExit={exit}
        stereoWarning={!!warning}
      />
    </div>
  );
}
