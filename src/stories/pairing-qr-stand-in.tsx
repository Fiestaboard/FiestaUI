/**
 * A QR-shaped stand-in for stories and the inventory (07e draws "QR ·
 * stand-in (pairing code)"). It is NOT a scannable code: FiestaUI ships no
 * QR encoder, the host renders the real one. Deterministic (a fixed LCG), so
 * VRT is stable, and dark-on-white with its own quiet zone, the way a real
 * pairing code must be drawn to scan in dark mode.
 */
const N = 25;

function modules(): boolean[] {
  const cells: boolean[] = [];
  let seed = 20261113;
  for (let i = 0; i < N * N; i++) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    cells.push(seed % 100 < 48);
  }
  return cells;
}

const CELLS = modules();

/** The three finder corners and their one-module separators stay clear. */
function inFinder(x: number, y: number): boolean {
  return (x < 8 && y < 8) || (x >= N - 8 && y < 8) || (x < 8 && y >= N - 8);
}

function Finder({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width="7" height="7" fill="#0f0d0a" />
      <rect x="1" y="1" width="5" height="5" fill="#ffffff" />
      <rect x="2" y="2" width="3" height="3" fill="#0f0d0a" />
    </g>
  );
}

export function PairingQrStandIn() {
  return (
    <svg viewBox={`-2 -2 ${N + 4} ${N + 4}`} shapeRendering="crispEdges" aria-hidden="true">
      <rect x="-2" y="-2" width={N + 4} height={N + 4} fill="#ffffff" />
      {CELLS.map((on, i) => {
        const x = i % N;
        const y = Math.floor(i / N);
        return on && !inFinder(x, y) ? <rect key={i} x={x} y={y} width="1" height="1" fill="#0f0d0a" /> : null;
      })}
      <Finder x={0} y={0} />
      <Finder x={N - 7} y={0} />
      <Finder x={0} y={N - 7} />
    </svg>
  );
}
