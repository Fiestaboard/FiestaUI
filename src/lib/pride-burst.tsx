/** Pride flag colors used across the pride-month brand treatments. */
export const PRIDE_COLORS = ["#e40303", "#ff8c00", "#ffed00", "#008026", "#004dff", "#750787"];

/**
 * Spawns the pride confetti burst at the click position. Particles use the
 * `.pride-burst-particle` class from theme.css and clean themselves up on
 * animation end. Pure DOM — callers layer their own toast/sound on top.
 */
export function firePrideBurst(e: { clientX: number; clientY: number }) {
  for (let i = 0; i < 48; i++) {
    const p = document.createElement("div");
    p.className = "pride-burst-particle";
    const angle = (i / 48) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
    const dist = 80 + Math.random() * 160;
    p.style.setProperty("--tx", `${Math.cos(angle) * dist}px`);
    p.style.setProperty("--ty", `${Math.sin(angle) * dist}px`);
    p.style.setProperty("--rot", `${Math.random() * 720 - 360}deg`);
    p.style.setProperty("--dur", `${0.5 + Math.random() * 0.5}s`);
    p.style.background = PRIDE_COLORS[i % 6];
    p.style.left = `${e.clientX - 3.5}px`;
    p.style.top = `${e.clientY - 3.5}px`;
    document.body.appendChild(p);
    p.addEventListener("animationend", () => p.remove());
  }
}
