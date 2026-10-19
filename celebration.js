export function celebrate() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return Promise.resolve();
  const canvas = document.querySelector("#celebrationCanvas");
  const context = canvas.getContext("2d");
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * pixelRatio;
  canvas.height = window.innerHeight * pixelRatio;
  context.scale(pixelRatio, pixelRatio);
  const palette = ["#d5ad59", "#899b84", "#d28768", "#8da9ba", "#eee0a9", "#f5f4e9"];
  const particles = Array.from({ length: 150 }, () => ({
    x: window.innerWidth * (0.2 + Math.random() * 0.6),
    y: window.innerHeight * (0.22 + Math.random() * 0.28),
    vx: (Math.random() - 0.5) * 9,
    vy: (Math.random() - 1.1) * 10,
    gravity: 0.13 + Math.random() * 0.08,
    size: 3 + Math.random() * 4,
    rotation: Math.random() * 6,
    spin: (Math.random() - 0.5) * 0.2,
    color: palette[Math.floor(Math.random() * palette.length)],
    life: 100 + Math.random() * 45,
  }));
  const started = performance.now();
  return new Promise((resolve) => {
    function frame(now) {
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      let alive = false;
      for (const particle of particles) {
        if (particle.life <= 0) continue;
        alive = true;
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += particle.gravity;
        particle.vx *= 0.992;
        particle.rotation += particle.spin;
        particle.life -= 1;
        context.save();
        context.translate(particle.x, particle.y);
        context.rotate(particle.rotation);
        context.globalAlpha = Math.min(particle.life / 18, 1);
        context.fillStyle = particle.color;
        context.fillRect(-particle.size / 2, -particle.size / 3, particle.size, particle.size * 0.66);
        context.restore();
      }
      if (alive && now - started < 3200) requestAnimationFrame(frame);
      else {
        context.clearRect(0, 0, window.innerWidth, window.innerHeight);
        resolve();
      }
    }
    requestAnimationFrame(frame);
  });
}
