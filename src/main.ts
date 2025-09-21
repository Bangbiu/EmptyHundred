import { initRanksScene } from "./scene/Ranks";
import { Grids } from "./scene/Grids";

// Reveal-on-scroll for elements with .reveal-up
function initRevealUp() {
    const els = Array.from(document.querySelectorAll<HTMLElement>('.reveal-up'));
    if (!('IntersectionObserver' in window) || !els.length) {
        els.forEach(el => el.classList.add('is-visible'));
        return;
    }
    const io = new IntersectionObserver((entries) => {
        for (const e of entries) {
            if (e.isIntersecting) {
                e.target.classList.add('is-visible');
                io.unobserve(e.target);
            }
        }
    }, { threshold: 0.15 });
    els.forEach(el => io.observe(el));
};

function initGamePlayBars() {
    const items = document.querySelectorAll<HTMLElement>('.game');
    let maximalHours = 0;
    items.forEach((g) => {
        const hours = Math.max(0, Number(g.dataset.hours) || 0);
        if (hours > maximalHours) maximalHours = hours;
    });

    items.forEach((g) => {
        const hours = Math.max(0, Number(g.dataset.hours) || 0);
        const pct = Math.min(100, (hours / maximalHours) * 100);

        const hoursEl = g.querySelector<HTMLElement>('.game-hours');
        if (hoursEl) hoursEl.innerHTML = `${hours} h`;

        const fill = g.querySelector<HTMLElement>('.game-fill');
        if (fill) {
            // trigger transition
            requestAnimationFrame(() => {
                fill.style.width = pct + '%';
            });
        }
    });
}

function initHero() {
    const canvas = document.getElementById("bg") as HTMLCanvasElement;
    new Grids(canvas);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRevealUp);
    document.addEventListener('DOMContentLoaded', initGamePlayBars);
    document.addEventListener("DOMContentLoaded", initRanksScene);
    document.addEventListener("DOMContentLoaded", initHero);
} else {
    initRevealUp();
    initHero();
    initGamePlayBars();
    initRanksScene();
}