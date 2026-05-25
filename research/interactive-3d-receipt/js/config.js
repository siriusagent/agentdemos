
export const CONFIG = {
  COLS: 22,
  ROWS: 48,
  W: 3.15,
  H: 6.45,
  ITERATIONS: 10, // Optimized iteration count
  GRAVITY: 0.0028,
  DAMPING: 0.985,
  AIR: 0.992,
  FOLD_MEMORY: 0.012,
  TEX_W: 1000,
  TEX_H: 2000,
  DPR: Math.max(1, Math.min(2, window.devicePixelRatio || 1))
};
