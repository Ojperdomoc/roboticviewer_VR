// ---------------------------------------------------------------------------
// Cargador de MediaPipe Tasks Vision (Hand Landmarker + Pose Landmarker)
// Se carga desde CDN en tiempo de ejecución para no inflar el bundle.
// ---------------------------------------------------------------------------

const VERSION = "0.10.35";
const CDN_A = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}`;
const CDN_B = `https://unpkg.com/@mediapipe/tasks-vision@${VERSION}`;

export const MODEL_URLS = {
  hand: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
  pose: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker/float16/1/pose_landmarker_lite.task`,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let visionModule: Promise<any> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function loadVisionModule(): Promise<any> {
  if (!visionModule) {
    visionModule = new Promise((resolve, reject) => {
      const tryLoad = (url: string, fallback: string | null) => {
        // @ts-ignore - import dinámico desde CDN
        import(/* @vite-ignore */ url)
          .then(resolve)
          .catch((err: unknown) => {
            if (fallback) tryLoad(fallback, null);
            else reject(err);
          });
      };
      tryLoad(`${CDN_A}/vision_bundle.mjs`, `${CDN_B}/vision_bundle.mjs`);
    });
  }
  return visionModule;
}

export type Trackers = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hand: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pose: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  close: () => void;
};

export async function createTrackers(numHands = 2): Promise<Trackers> {
  const vision = await loadVisionModule();

  let fileset;
  try {
    fileset = await vision.FilesetResolver.forVisionTasks(`${CDN_A}/wasm`);
  } catch {
    fileset = await vision.FilesetResolver.forVisionTasks(`${CDN_B}/wasm`);
  }

  const makeHand = (delegate: "GPU" | "CPU") =>
    vision.HandLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URLS.hand, delegate },
      runningMode: "VIDEO",
      numHands,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

  const makePose = (delegate: "GPU" | "CPU") =>
    vision.PoseLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URLS.pose, delegate },
      runningMode: "VIDEO",
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

  let hand;
  let pose;
  try {
    hand = await makeHand("GPU");
    pose = await makePose("GPU");
  } catch {
    hand = await makeHand("CPU");
    pose = await makePose("CPU");
  }

  return {
    hand,
    pose,
    close: () => {
      try {
        hand?.close();
      } catch {
        /* noop */
      }
      try {
        pose?.close();
      } catch {
        /* noop */
      }
    },
  };
}
