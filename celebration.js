export function celebrate() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return Promise.resolve();
  const canvas = document.querySelector("#celebrationCanvas");
  const context = canvas.getContext("2d");
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = innerWidth * ratio;
  canvas.height = innerHeight * ratio;
  context.scale(ratio, ratio);
  const colors = ["#d5ad59", "#899b84", "#d28768", "#8da9ba", "#eee0a9"];
  const particles = Array.from({ length: 145 }, () => ({
    x: innerWidth * (.2 + Math.random() * .6),
    y: innerHeight * (.2 + Math.random() * .3),
    vx: (Math.random() - .5) * 9,
    vy: (Math.random() - 1.1) * 10,
    gravity: .13 + Math.random() * .08,
    size: 3 + Math.random() * 4,
    color: colors[Math.floor(Math.random() * colors.length)],
    life: 100 + Math.random() * 45,
  }));
  const started = performance.now();
  return new Promise((resolve) => {
    function frame(now) {
      context.clearRect(0, 0, innerWidth, innerHeight);
      let alive = false;
      particles.forEach((particle) => {
        if (particle.life <= 0) return;
        alive = true;
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += particle.gravity;
        particle.vx *= .992;
        particle.life -= 1;
        context.globalAlpha = Math.min(particle.life / 18, 1);
        context.fillStyle = particle.color;
        context.fillRect(particle.x, particle.y, particle.size, particle.size * .65);
      });
      context.globalAlpha = 1;
      if (alive && now - started < 3200) requestAnimationFrame(frame);
      else {
        context.clearRect(0, 0, innerWidth, innerHeight);
        resolve();
      }
    }
    requestAnimationFrame(frame);
  });
}
