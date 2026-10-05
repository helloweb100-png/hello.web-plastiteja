/* ═══════════════════════════════════════════════════════════════════
   PLASTITEJA DANA SOLUTIONS · app.js
   JavaScript vanilla, sin dependencias.
   Módulos: loader · scroll suave · header/menú · hero (canvas) · reveal ·
            contadores · galería horizontal · cotizador · formulario WhatsApp
   ═══════════════════════════════════════════════════════════════════ */
(() => {
    'use strict';

    /* ───────── Configuración del negocio ───────── */
    const WA_NUMBER = '5215548725092';   // +52 1 55 4872 5092
    const PRICE_PER_M = 130;             // $ por metro lineal (promedio del catálogo)
    const TEJA_M = 0.384;                // largo aproximado de una "teja" dentro de la pieza

    /* ───────── Utilidades ───────── */
    const $ = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => [...c.querySelectorAll(s)];
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const root = document.documentElement;
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const fmtMXN = n => '$' + Math.round(n).toLocaleString('es-MX');
    const safe = (name, fn) => { try { fn(); } catch (err) { console.error('[plastiteja]', name, err); } };

    /* Un solo bucle rAF para todas las animaciones */
    const ticker = (() => {
        const fns = new Set();
        let last = performance.now();
        const loop = now => {
            const dt = Math.min(now - last, 64);
            last = now;
            fns.forEach(fn => fn(now, dt));
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
        return { add: fn => { fns.add(fn); return () => fns.delete(fn); } };
    })();

    /* ═════════════ SCROLL SUAVE (inercia estilo Lenis) ═════════════ */
    const smooth = (() => {
        const enabled = finePointer && !reduceMotion;
        let current = window.scrollY, target = current, running = false;
        const maxScroll = () => Math.max(0, root.scrollHeight - innerHeight);

        const api = {
            enabled,
            to(y) {
                y = clamp(y, 0, maxScroll());
                if (!enabled) { window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' }); return; }
                current = window.scrollY;
                target = y;
                running = true;
            }
        };
        if (!enabled) return api;

        /* ¿El elemento bajo el cursor puede hacer scroll por sí mismo? (textarea, listas, etc.) */
        const innerScrollable = (el, dy) => {
            while (el && el !== document.body && el !== root) {
                const oy = getComputedStyle(el).overflowY;
                if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 1) {
                    if (dy > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true;
                    if (dy < 0 && el.scrollTop > 0) return true;
                }
                el = el.parentElement;
            }
            return false;
        };

        window.addEventListener('wheel', e => {
            if (e.ctrlKey || e.shiftKey || e.defaultPrevented) return;
            if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
            if (root.classList.contains('menu-open') || root.classList.contains('is-loading')) return;
            if (innerScrollable(e.target, e.deltaY)) return;
            e.preventDefault();
            let dy = e.deltaY;
            if (e.deltaMode === 1) dy *= 34; else if (e.deltaMode === 2) dy *= innerHeight;
            if (!running) { current = window.scrollY; target = current; }
            target = clamp(target + dy, 0, maxScroll());
            running = true;
        }, { passive: false });

        /* Si el scroll lo mueve otra cosa (teclado, barra, anclas nativas), nos sincronizamos */
        window.addEventListener('scroll', () => {
            if (!running || Math.abs(window.scrollY - current) > 4) {
                current = target = window.scrollY;
                running = false;
            }
        }, { passive: true });

        ticker.add((_, dt) => {
            if (!running) return;
            const k = 1 - Math.pow(1 - 0.085, dt / 16.667);
            current += (target - current) * k;
            if (Math.abs(target - current) < 0.4) { current = target; running = false; }
            window.scrollTo(0, current);
        });
        return api;
    })();

    const scrollToEl = el => {
        if (!el) return;
        smooth.to(el.getBoundingClientRect().top + window.scrollY);
    };

    /* ═════════════ LOADER ═════════════ */
    function initLoader() {
        const loader = $('#loader');
        const finishReady = () => {
            root.classList.remove('is-loading');
            root.classList.add('is-ready');
            const h1 = $('#hero-title');
            if (h1) h1.classList.add('is-in');
            scheduleTooltip();
        };
        if (!loader || reduceMotion) {
            if (loader) loader.classList.add('is-gone');
            finishReady();
            return;
        }

        const arc = $('#loader-arc'), pct = $('#loader-pct'), bar = $('#loader-bar'), status = $('#loader-status');
        const steps = [[0, 'Reciclando materiales'], [28, 'Moldeando la teja'], [56, 'Curando el color terracota'], [84, 'Preparando tu cotizador'], [100, 'Listo']];
        const MIN_MS = 2500;
        const t0 = performance.now();
        let p = 0, finished = false;
        let fontsReady = !document.fonts;
        let loaded = document.readyState === 'complete';
        if (document.fonts) document.fonts.ready.then(() => { fontsReady = true; });
        window.addEventListener('load', () => { loaded = true; });

        const finish = () => {
            if (finished) return;
            finished = true;
            pct.textContent = '100';
            arc.style.strokeDashoffset = '0';
            bar.style.transform = 'scaleX(1)';
            status.textContent = 'Listo';
            setTimeout(() => {
                loader.classList.add('is-done');
                setTimeout(finishReady, 520);
                setTimeout(() => loader.classList.add('is-gone'), 1700);
            }, 380);
        };

        const stop = ticker.add(now => {
            if (finished) { stop(); return; }
            const elapsed = now - t0;
            const cap = loaded && elapsed > MIN_MS ? 100 : fontsReady ? (loaded ? 94 : 76) : 38;
            p = Math.min(cap, p + Math.max((cap - p) * 0.045, 0.14));
            const shown = Math.min(100, p);
            pct.textContent = String(Math.round(shown)).padStart(3, '0');
            arc.style.strokeDashoffset = String(100 - shown);
            bar.style.transform = `scaleX(${shown / 100})`;
            let label = steps[0][1];
            for (const [at, txt] of steps) if (shown >= at) label = txt;
            if (status.textContent !== label && shown < 100) status.textContent = label;
            if (shown >= 99.5) finish();
        });
        setTimeout(finish, 7500);   // seguro anti-bloqueo
    }

    /* ═════════════ TEXTO DIVIDIDO POR PALABRAS ═════════════ */
    function splitText(el) {
        let idx = 0;
        const walk = node => {
            [...node.childNodes].forEach(ch => {
                if (ch.nodeType === 3) {
                    const frag = document.createDocumentFragment();
                    ch.textContent.split(/([ \t\r\n]+)/).forEach(part => {
                        if (!part) return;
                        if (/^[ \t\r\n]+$/.test(part)) { frag.append(' '); return; }
                        const sp = document.createElement('span');
                        sp.className = 'sp';
                        const si = document.createElement('span');
                        si.className = 'sp__i';
                        si.style.setProperty('--wi', idx++);
                        si.textContent = part;
                        sp.append(si);
                        frag.append(sp);
                    });
                    ch.replaceWith(frag);
                } else if (ch.nodeType === 1 && ch.tagName !== 'BR') walk(ch);
            });
        };
        walk(el);
        el.classList.add('is-split');
    }

    /* ═════════════ REVEAL EN SCROLL ═════════════ */
    function initReveal() {
        $$('[data-split]').forEach(splitText);
        const els = $$('[data-reveal], [data-split]:not([data-hero])');
        if (!('IntersectionObserver' in window) || reduceMotion) {
            els.forEach(el => el.classList.add('is-in'));
            return;
        }
        const io = new IntersectionObserver(entries => {
            entries.forEach(en => {
                if (!en.isIntersecting) return;
                en.target.classList.add('is-in');
                io.unobserve(en.target);
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
        els.forEach(el => io.observe(el));
    }

    /* Párrafo que se "enciende" palabra por palabra con el scroll */
    function initWords() {
        const el = $('[data-words]');
        if (!el) return;
        const text = el.textContent.trim().replace(/\s+/g, ' ');
        el.textContent = '';
        const words = text.split(' ').map((w, i, arr) => {
            const s = document.createElement('span');
            s.className = 'sw';
            s.textContent = w;
            el.append(s);
            if (i < arr.length - 1) el.append(' ');
            return s;
        });
        if (reduceMotion) { words.forEach(w => w.classList.add('is-lit')); return; }
        let lit = -1;
        ticker.add(() => {
            const r = el.getBoundingClientRect();
            if (r.bottom < -100 || r.top > innerHeight + 100) return;
            const start = innerHeight * 0.85, end = innerHeight * 0.4;
            const p = clamp((start - r.top) / (r.height + (start - end)), 0, 1);
            const n = Math.round(p * words.length);
            if (n === lit) return;
            lit = n;
            words.forEach((w, i) => w.classList.toggle('is-lit', i < n));
        });
    }

    /* ═════════════ CONTADORES ═════════════ */
    function initCounters() {
        const els = $$('[data-count]');
        const fmt = (el, v) => {
            const dec = +el.dataset.decimals || 0;
            el.textContent = v.toLocaleString('es-MX', { minimumFractionDigits: dec, maximumFractionDigits: dec });
        };
        if (!('IntersectionObserver' in window) || reduceMotion) { els.forEach(el => fmt(el, +el.dataset.count)); return; }
        const run = el => {
            const target = parseFloat(el.dataset.count), dur = 2200, t0 = performance.now();
            const step = now => {
                const t = clamp((now - t0) / dur, 0, 1);
                fmt(el, target * (1 - Math.pow(1 - t, 4)));
                if (t < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
        };
        const io = new IntersectionObserver(entries => entries.forEach(en => {
            if (en.isIntersecting) { run(en.target); io.unobserve(en.target); }
        }), { threshold: 0.6 });
        els.forEach(el => io.observe(el));
    }

    /* ═════════════ HEADER · PROGRESO · NAV ACTIVA ═════════════ */
    function initHeader() {
        const header = $('#header'), bar = $('#progress-bar'), hero = $('#inicio');
        let lastY = window.scrollY, lastHp = -1;

        ticker.add(() => {
            const y = window.scrollY;
            header.classList.toggle('is-scrolled', y > 30);
            const down = y > lastY + 5, up = y < lastY - 5;
            if (!root.classList.contains('menu-open')) {
                if (down && y > 500) header.classList.add('is-hidden');
                else if (up || y < 300) header.classList.remove('is-hidden');
            }
            if (down || up) lastY = y;
            const max = root.scrollHeight - innerHeight;
            bar.style.transform = `scaleX(${max > 0 ? clamp(y / max, 0, 1) : 0})`;
            if (hero) {
                /* El hero se desvanece solo cuando su parte inferior empieza a salir de la pantalla */
                const start = Math.max(0, hero.offsetHeight - innerHeight);
                const hp = Math.round(clamp((y - start) / (innerHeight * 0.85), 0, 1) * 200) / 200;
                if (hp !== lastHp) { hero.style.setProperty('--hp', hp); lastHp = hp; }
            }
        });

        const links = $$('.nav a');
        if ('IntersectionObserver' in window) {
            const map = new Map(links.map(a => [a.getAttribute('href').slice(1), a]));
            const io = new IntersectionObserver(entries => entries.forEach(en => {
                const a = map.get(en.target.id);
                if (!a || !en.isIntersecting) return;
                links.forEach(l => l.removeAttribute('aria-current'));
                a.setAttribute('aria-current', 'true');
            }), { rootMargin: '-45% 0px -50% 0px' });
            map.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
        }

        /* Anclas con scroll suave */
        document.addEventListener('click', e => {
            const a = e.target.closest('a[href^="#"]');
            if (!a || a.getAttribute('href') === '#') return;
            const target = document.getElementById(a.getAttribute('href').slice(1));
            if (!target) return;
            e.preventDefault();
            scrollToEl(target);
            history.pushState(null, '', a.getAttribute('href'));
        });
        const top = $('#totop');
        if (top) top.addEventListener('click', () => smooth.to(0));
    }

    function initMenu() {
        const burger = $('#burger'), menu = $('#menu');
        if (!burger || !menu) return;
        const set = open => {
            root.classList.toggle('menu-open', open);
            burger.setAttribute('aria-expanded', String(open));
            burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
            menu.setAttribute('aria-hidden', String(!open));
            if (open) { $('#header').classList.remove('is-hidden'); setTimeout(() => { const a = $('a', menu); if (a) a.focus({ preventScroll: true }); }, 350); }
        };
        burger.addEventListener('click', () => set(!root.classList.contains('menu-open')));
        menu.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
        window.addEventListener('keydown', e => {
            if (e.key === 'Escape' && root.classList.contains('menu-open')) { set(false); burger.focus(); }
        });
        matchMedia('(min-width: 1024px)').addEventListener('change', e => { if (e.matches) set(false); });
    }

    /* ═════════════ HERO · CANVAS (malla ondulada tipo teja + partículas) ═════════════ */
    function initHero() {
        const hero = $('#inicio'), cv = $('#hero-canvas');
        if (!hero || !cv) return;
        const ctx = cv.getContext('2d');
        const mobile = innerWidth < 768;
        const rand = (a, b) => a + Math.random() * (b - a);
        const TAU = Math.PI * 2;

        let W = 0, H = 0, dpr = 1, visible = true, parts = [], gradRidge = null;
        const ptr = { x: 0, y: 0, sx: 0, sy: 0, px: -9999, py: -9999, active: false, last: 0 };

        const spawn = init => ({
            x: rand(0, W), y: init ? rand(0, H) : H + 12, z: rand(0.35, 1),
            vx: rand(-0.12, 0.12), vy: -rand(0.08, 0.4), r: rand(0.7, 2.2),
            terra: Math.random() < 0.14, tw: rand(0, TAU)
        });

        function resize() {
            const r = hero.getBoundingClientRect();
            if (Math.abs(r.width - W) < 1 && Math.abs(r.height - H) < 140 && W) return;
            dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
            W = r.width; H = r.height;
            cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            gradRidge = ctx.createLinearGradient(0, H * 0.57, 0, H);
            gradRidge.addColorStop(0, 'rgba(81,229,217,0)');
            gradRidge.addColorStop(0.35, 'rgba(81,229,217,.22)');
            gradRidge.addColorStop(1, 'rgba(81,229,217,.62)');
            parts = Array.from({ length: mobile ? 38 : 86 }, () => spawn(true));
            if (reduceMotion) draw(2600, 16);
        }

        /* Altura de la superficie ondulada (u: -1..1 ancho, z: profundidad) */
        const AMP = mobile ? 0.058 : 0.085, FREQ = mobile ? 4.4 : 7.5;
        const height = (u, z, t) =>
            AMP * Math.sin(u * Math.PI * FREQ + t * 0.00042) +
            AMP * 0.55 * Math.sin(z * 1.55 - t * 0.0009 + u * 1.3);

        function draw(t, dt) {
            ctx.clearRect(0, 0, W, H);
            ctx.globalAlpha = mobile ? 0.72 : 1;
            ctx.globalCompositeOperation = 'lighter';
            ctx.lineJoin = 'round';

            /* movimiento del "puntero" (real o automático) */
            if (!ptr.active) {
                ptr.x = Math.sin(t * 0.00023) * 0.45;
                ptr.y = Math.cos(t * 0.00031) * 0.3;
            }
            ptr.sx = lerp(ptr.sx, ptr.x, 0.04);
            ptr.sy = lerp(ptr.sy, ptr.y, 0.04);

            const hy = H * 0.57 + ptr.sy * H * 0.025;
            const camX = ptr.sx * 0.14;
            const zNear = 0.55, zFar = 7.5;
            const cols = mobile ? 22 : 46, rows = mobile ? 14 : 22, samples = mobile ? 56 : 84;
            const proj = (u, z, h) => {
                const s = 1 / z;
                return [W / 2 + (u * 1.55 + camX) * W * 0.5 * s, hy + (0.55 - h) * H * 0.62 * s];
            };

            /* Crestas (líneas que corren hacia el horizonte) */
            ctx.lineWidth = 1;
            ctx.strokeStyle = gradRidge;
            ctx.beginPath();
            for (let i = 0; i <= cols; i++) {
                const u = -1.25 + (2.5 * i) / cols;
                for (let j = 0; j <= samples; j++) {
                    const z = zNear + (zFar - zNear) * Math.pow(j / samples, 1.6);
                    const [x, y] = proj(u, z, height(u, z, t));
                    j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
                }
            }
            ctx.stroke();

            /* Cortes transversales: muestran el perfil ondulado y viajan hacia la cámara */
            const phase = (t * 0.00011) % 1;
            const scanZ = zNear + (zFar - zNear) * ((t * 0.00016) % 1);
            for (let k = 0; k < rows; k++) {
                const f = (k + 1 - phase) / rows;
                const z = zNear + (zFar - zNear) * Math.pow(f, 1.75);
                const depth = 1 - (z - zNear) / (zFar - zNear);
                const boost = Math.exp(-Math.pow((z - scanZ) / 0.55, 2));
                const a = Math.pow(depth, 1.5) * 0.46 + boost * 0.55;
                if (a < 0.015) continue;
                ctx.strokeStyle = `rgba(${boost > 0.25 ? '159,246,238' : '81,229,217'},${Math.min(a, 0.95).toFixed(3)})`;
                ctx.lineWidth = 0.8 + boost * 1.4 + depth * 0.5;
                ctx.beginPath();
                for (let j = 0; j <= samples; j++) {
                    const u = -1.4 + (2.8 * j) / samples;
                    const [x, y] = proj(u, z, height(u, z, t));
                    j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
                }
                ctx.stroke();
            }

            /* Partículas + conexiones */
            const link = mobile ? 90 : 125, link2 = link * link;
            for (const p of parts) {
                p.x += p.vx * p.z * (dt / 16.7);
                p.y += p.vy * p.z * (dt / 16.7);
                const dx = p.x - ptr.px, dy = p.y - ptr.py, d2 = dx * dx + dy * dy;
                if (d2 < 19600 && d2 > 1) { const d = Math.sqrt(d2), f = (140 - d) / 140; p.x += (dx / d) * f * 2.2; p.y += (dy / d) * f * 2.2; }
                if (p.y < -12 || p.x < -20 || p.x > W + 20) Object.assign(p, spawn(false), { x: rand(0, W) });
                p.tw += 0.03;
            }
            for (let i = 0; i < parts.length; i++) {
                const a = parts[i];
                for (let j = i + 1; j < parts.length; j++) {
                    const b = parts[j], dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
                    if (d2 < link2) {
                        ctx.strokeStyle = `rgba(81,229,217,${((1 - d2 / link2) * 0.22 * Math.min(a.z, b.z)).toFixed(3)})`;
                        ctx.lineWidth = 0.7;
                        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
                    }
                }
            }
            for (const p of parts) {
                const tw = 0.55 + Math.sin(p.tw) * 0.45;
                ctx.fillStyle = p.terra ? `rgba(226,85,63,${(0.55 * tw * p.z).toFixed(3)})` : `rgba(180,255,248,${(0.8 * tw * p.z).toFixed(3)})`;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.z, 0, TAU); ctx.fill();
            }
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;
        }

        /* Interacción con el puntero */
        if (finePointer) {
            hero.addEventListener('pointermove', e => {
                const r = hero.getBoundingClientRect();
                ptr.px = e.clientX - r.left; ptr.py = e.clientY - r.top;
                ptr.x = (ptr.px / r.width - 0.5) * 2; ptr.y = (ptr.py / r.height - 0.5) * 2;
                ptr.active = true;
                hero.style.setProperty('--mx', ptr.x.toFixed(3));
                hero.style.setProperty('--my', ptr.y.toFixed(3));
            }, { passive: true });
            hero.addEventListener('pointerleave', () => { ptr.active = false; ptr.px = ptr.py = -9999; });
        }

        if ('IntersectionObserver' in window) {
            new IntersectionObserver(([en]) => { visible = en.isIntersecting; }, { threshold: 0 }).observe(hero);
        }
        if ('ResizeObserver' in window) new ResizeObserver(resize).observe(hero); else window.addEventListener('resize', resize);
        resize();

        if (!reduceMotion) ticker.add((now, dt) => { if (visible && !document.hidden) draw(now, dt); });
    }

    /* ═════════════ INTERACCIONES (tilt · imán · spotlight · cursor) ═════════════ */
    function initInteractions() {
        /* Spotlight: delegación de eventos */
        document.addEventListener('pointermove', e => {
            const el = e.target.closest && e.target.closest('[data-spot]');
            if (!el) return;
            const r = el.getBoundingClientRect();
            el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
            el.style.setProperty('--my', (e.clientY - r.top) + 'px');
        }, { passive: true });

        if (!finePointer || reduceMotion) return;

        /* Tilt 3D */
        $$('[data-tilt]').forEach(el => {
            const target = $('.device__frame', el) || el;
            let rx = 0, ry = 0, trx = 0, tryy = 0;
            const max = target === el ? 9 : 11;
            el.addEventListener('pointermove', e => {
                const r = el.getBoundingClientRect();
                tryy = ((e.clientX - r.left) / r.width - 0.5) * max * 2;
                trx = -((e.clientY - r.top) / r.height - 0.5) * max * 2;
            });
            el.addEventListener('pointerleave', () => { trx = tryy = 0; });
            ticker.add(() => {
                if (Math.abs(rx - trx) < 0.01 && Math.abs(ry - tryy) < 0.01 && !trx && !tryy) return;
                rx = lerp(rx, trx, 0.1); ry = lerp(ry, tryy, 0.1);
                target.style.setProperty('--rx', rx.toFixed(2) + 'deg');
                target.style.setProperty('--ry', ry.toFixed(2) + 'deg');
            });
        });

        /* Botones magnéticos */
        $$('[data-magnetic]').forEach(el => {
            el.addEventListener('pointermove', e => {
                const r = el.getBoundingClientRect();
                el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px, ${(e.clientY - r.top - r.height / 2) * 0.28}px)`;
            });
            el.addEventListener('pointerleave', () => { el.style.transform = ''; });
        });

        /* Cursor personalizado */
        const cur = $('.cursor'), dot = $('.cursor__dot'), ring = $('.cursor__ring');
        if (!cur) return;
        let x = -100, y = -100, rx = x, ry = y;
        window.addEventListener('pointermove', e => {
            x = e.clientX; y = e.clientY;
            root.classList.add('has-cursor');
            cur.classList.toggle('is-hover', !!e.target.closest('a, button, summary, label, input, select, textarea, [data-tilt]'));
            cur.classList.toggle('on-light', !!e.target.closest('.is-light'));
        }, { passive: true });
        document.addEventListener('mouseleave', () => root.classList.remove('has-cursor'));
        ticker.add(() => {
            rx = lerp(rx, x, 0.18); ry = lerp(ry, y, 0.18);
            dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
            ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
        });
    }

    /* Parallax suave por elemento */
    function initParallax() {
        if (reduceMotion) return;
        const items = $$('[data-parallax]').map(el => ({ el, k: parseFloat(el.dataset.parallax) || 0.1 }));
        if (!items.length) return;
        ticker.add(() => items.forEach(({ el, k }) => {
            const r = el.getBoundingClientRect();
            if (r.bottom < -200 || r.top > innerHeight + 200) return;
            el.style.transform = `translate3d(0, ${(r.top + r.height / 2 - innerHeight / 2) * k}px, 0)`;
        }));
    }

    /* ═════════════ MARQUEE reactivo al scroll ═════════════ */
    function initMarquee() {
        const rows = $$('[data-marquee]');
        if (!rows.length || reduceMotion) return;
        const items = rows.map(r => ({ track: $('.marquee__track', r), dir: +r.dataset.marquee || -1, pos: 0, w: 0 }));
        const measure = () => items.forEach(i => { i.w = i.track.scrollWidth / 2; if (i.dir > 0) i.pos = -i.w; });
        measure();
        window.addEventListener('resize', measure);
        if (document.fonts) document.fonts.ready.then(measure);
        let lastY = window.scrollY, vel = 0;
        ticker.add((_, dt) => {
            const y = window.scrollY;
            vel = lerp(vel, Math.abs(y - lastY), 0.12);
            lastY = y;
            const speed = (0.55 + vel * 0.16) * (dt / 16.7);
            items.forEach(i => {
                if (!i.w) return;
                i.pos += i.dir * speed;
                if (i.pos <= -i.w) i.pos += i.w;
                if (i.pos > 0) i.pos -= i.w;
                i.track.style.transform = `translate3d(${i.pos}px, 0, 0)`;
            });
        });
    }

    /* ═════════════ GALERÍA · scroll horizontal fijado (escritorio) ═════════════ */
    function initHScroll() {
        const sec = $('[data-hscroll]');
        if (!sec) return;
        const viewport = $('.hs__viewport', sec), track = $('[data-hs-track]', sec);
        const mq = matchMedia('(min-width: 1024px)');
        let on = false, maxX = 0, cur = 0;

        const measure = () => {
            on = mq.matches && !reduceMotion;
            sec.classList.toggle('is-pinned', on);
            if (!on) { sec.style.height = ''; track.style.transform = ''; return; }
            const padL = parseFloat(getComputedStyle(viewport).paddingLeft) || 0;
            maxX = Math.max(0, track.scrollWidth + padL - viewport.clientWidth);
            sec.style.height = (maxX + innerHeight) + 'px';
        };
        measure();
        let t;
        window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(measure, 120); });
        mq.addEventListener('change', measure);
        window.addEventListener('load', measure);

        ticker.add(() => {
            if (!on) return;
            const r = sec.getBoundingClientRect();
            if (r.bottom < -300 || r.top > innerHeight + 300) return;
            const dist = Math.max(1, sec.offsetHeight - innerHeight);
            const p = clamp(-r.top / dist, 0, 1);
            const tgt = -p * maxX;
            cur = Math.abs(cur - tgt) < 0.1 ? tgt : lerp(cur, tgt, 0.14);
            track.style.transform = `translate3d(${cur}px, 0, 0)`;
            sec.style.setProperty('--p', p.toFixed(4));
        });
    }

    /* ═════════════ PROCESO · línea que se llena ═════════════ */
    function initSteps() {
        const wrap = $('#steps-wrap');
        if (!wrap) return;
        const line = $('.steps__line', wrap), steps = $$('.step', wrap);
        let lastP = -1;
        ticker.add(() => {
            const r = wrap.getBoundingClientRect();
            if (r.bottom < -200 || r.top > innerHeight + 200) return;
            const anchor = innerHeight * 0.58;
            const p = Math.round(clamp((anchor - r.top) / r.height, 0, 1) * 1000) / 1000;
            if (p === lastP) return;
            lastP = p;
            line.style.setProperty('--p', p);
            steps.forEach(s => s.classList.toggle('is-active', s.getBoundingClientRect().top + 42 < anchor));
        });
    }

    /* ═════════════ COTIZADOR ═════════════ */
    const catalog = $$('#ptable tbody tr').map(tr => ({
        tr, m: +tr.dataset.m, t: +tr.dataset.t, p: +tr.dataset.p, label: (+tr.dataset.m).toFixed(2)
    }));

    const quoteState = { mode: 'std', idx: 7, custom: 3.2, qty: 1, acc: false };
    let onQuoteChange = () => {};

    function initQuote() {
        const stageIn = $('.stage__in'), outLen = $('#out-len'), outTejas = $('#out-tejas');
        const outBreak = $('#out-break'), outTotal = $('#out-total'), waBtn = $('#calc-wa');
        const rng = $('#rng'), customInput = $('#custom-len'), qtyOut = $('#qty-out'), accChk = $('#calc-acc');
        const seg = $('.seg'), ctrlStd = $('#ctrl-std'), ctrlCustom = $('#ctrl-custom');
        if (!stageIn || !catalog.length) return;
        const s = quoteState;

        /* Odómetro: cada dígito es una columna que rueda */
        let layoutKey = '';
        const buildOdo = layout => {
            outTotal.innerHTML = '<span class="sr-only"></span><span class="cur" aria-hidden="true">$</span><span class="odo" aria-hidden="true">' +
                [...layout].map(c => c === 'd'
                    ? '<span class="odo__col"><span>' + [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => `<i>${d}</i>`).join('') + '</span></span>'
                    : `<span class="odo__sep">${c}</span>`).join('') + '</span>';
        };
        const setTotal = n => {
            const str = Math.round(n).toLocaleString('es-MX');
            const layout = str.replace(/\d/g, 'd');
            if (layout !== layoutKey) { buildOdo(layout); layoutKey = layout; void outTotal.offsetHeight; }
            const cols = $$('.odo__col > span', outTotal);
            let ci = 0;
            [...str].forEach(ch => { if (/\d/.test(ch)) cols[ci++].style.transform = `translateY(${-ch}em)`; });
            $('.sr-only', outTotal).textContent = '$' + str;
        };

        const current = () => {
            if (s.mode === 'std') {
                const r = catalog[s.idx];
                return { len: r.m, tejas: r.t, price: r.p, label: r.label + ' m' };
            }
            const len = clamp(s.custom || 0.5, 0.5, 8.05);
            return { len, tejas: Math.max(1, Math.round(len / TEJA_M)), price: Math.round(len * PRICE_PER_M), label: len.toFixed(2) + ' m' };
        };

        const message = cur => {
            const lines = [
                'Hola, vengo de su página web 👋',
                'Quiero cotizar plastiteja:',
                `• Medida: ${cur.label} × 1 m (${cur.tejas} tejas por pieza)${s.mode === 'custom' ? ' — medida a mi gusto' : ''}`,
                `• Cantidad: ${s.qty} ${s.qty === 1 ? 'pieza' : 'piezas'}`,
                `• Total estimado: ${fmtMXN(cur.price * s.qty)} MXN`
            ];
            if (s.acc) lines.push('• Incluir pijas y birlos: sí');
            lines.push('¿Me confirman disponibilidad y entrega a domicilio?');
            return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`;
        };

        const render = () => {
            const cur = current();
            stageIn.style.setProperty('--len', cur.len);
            outLen.textContent = cur.label;
            outTejas.textContent = cur.tejas;
            outBreak.textContent = `${s.qty} ${s.qty === 1 ? 'pieza' : 'piezas'} × ${fmtMXN(cur.price)}`;
            setTotal(cur.price * s.qty);
            qtyOut.textContent = s.qty;
            waBtn.href = message(cur);

            seg.style.setProperty('--seg-i', s.mode === 'std' ? 0 : 1);
            $$('input[name="mode"]', seg).forEach(i => i.closest('label').classList.toggle('is-on', i.value === s.mode));
            ctrlStd.hidden = s.mode !== 'std';
            ctrlCustom.hidden = s.mode !== 'custom';
            rng.value = s.idx;
            rng.style.setProperty('--fill', (s.idx / (catalog.length - 1)) * 100 + '%');
            catalog.forEach((r, i) => r.tr.classList.toggle('is-active', s.mode === 'std' && i === s.idx));
            accChk.checked = s.acc;
            onQuoteChange(cur);
        };

        $$('input[name="mode"]', seg).forEach(i => i.addEventListener('change', () => { s.mode = i.value; render(); }));
        rng.addEventListener('input', () => { s.idx = +rng.value; render(); });
        customInput.addEventListener('input', () => { const v = parseFloat(customInput.value); if (!isNaN(v)) { s.custom = v; render(); } });
        customInput.addEventListener('blur', () => { s.custom = clamp(parseFloat(customInput.value) || 0.5, 0.5, 8.05); customInput.value = s.custom; render(); });
        $('#qty-minus').addEventListener('click', () => { s.qty = Math.max(1, s.qty - 1); render(); });
        $('#qty-plus').addEventListener('click', () => { s.qty = Math.min(999, s.qty + 1); render(); });
        accChk.addEventListener('change', () => { s.acc = accChk.checked; render(); });
        catalog.forEach((r, i) => r.tr.addEventListener('click', () => { s.mode = 'std'; s.idx = i; render(); }));
        render();
    }

    /* ═════════════ FORMULARIO → WHATSAPP ═════════════ */
    function initForm() {
        const form = $('#wa-form'), card = $('.formcard');
        if (!form) return;
        const f = { name: $('#f-name'), phone: $('#f-phone'), size: $('#f-size'), qty: $('#f-qty'), zone: $('#f-zone'), msg: $('#f-msg'), acc: $('#f-acc') };
        let touched = false;

        catalog.forEach(r => f.size.append(new Option(`${r.label} m × 1 m — ${fmtMXN(r.p)}`, `${r.label} m × 1 m (${r.t} tejas) — ${fmtMXN(r.p)}`)));
        f.size.append(new Option('Varias medidas / a mi medida', 'Varias medidas o medida a mi gusto'));

        /* El formulario hereda lo que armaste en el cotizador, mientras no lo edites */
        onQuoteChange = cur => {
            if (touched) return;
            const q = quoteState;
            f.size.selectedIndex = q.mode === 'std' ? q.idx + 1 : f.size.options.length - 1;
            f.qty.value = q.qty;
            f.acc.checked = q.acc;
        };
        form.addEventListener('input', () => { touched = true; });
        form.addEventListener('change', () => { touched = true; });

        const rules = {
            name: v => v.trim().length >= 2 || 'Escribe tu nombre para atenderte mejor.',
            phone: v => !v.trim() || v.replace(/\D/g, '').length >= 10 || 'Ingresa un teléfono de 10 dígitos.',
            size: v => !!v || 'Elige la medida que te interesa.'
        };
        const setErr = (key, msg) => {
            const field = f[key].closest('.field'), out = $('#err-' + key);
            field.classList.toggle('has-err', !!msg);
            f[key].setAttribute('aria-invalid', msg ? 'true' : 'false');
            if (out) out.textContent = msg || '';
        };
        Object.keys(rules).forEach(k => f[k].addEventListener('input', () => { if (f[k].closest('.field').classList.contains('has-err')) { const r = rules[k](f[k].value); setErr(k, r === true ? '' : r); } }));

        form.addEventListener('submit', e => {
            e.preventDefault();
            let first = null;
            Object.keys(rules).forEach(k => {
                const r = rules[k](f[k].value);
                setErr(k, r === true ? '' : r);
                if (r !== true && !first) first = f[k];
            });
            if (first) { first.focus(); return; }

            const qty = clamp(parseInt(f.qty.value, 10) || 1, 1, 999);
            const lines = ['Hola, vengo de su página web 👋', 'Quiero cotizar plastiteja:', `• Nombre: ${f.name.value.trim()}`];
            if (f.phone.value.trim()) lines.push(`• Teléfono: ${f.phone.value.trim()}`);
            lines.push(`• Medida: ${f.size.value}`, `• Piezas: ${qty}`);
            if (f.zone.value.trim()) lines.push(`• Entrega en: ${f.zone.value.trim()}`);
            if (f.acc.checked) lines.push('• Incluir pijas y birlos: sí');
            if (f.msg.value.trim()) lines.push(`• Comentarios: ${f.msg.value.trim()}`);
            const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`;

            $('#done-link').href = url;
            card.classList.add('is-done');
            $('#form-done').setAttribute('aria-hidden', 'false');
            const w = window.open(url, '_blank');
            if (w) w.opener = null; else window.location.href = url;
        });

        $('#form-reset').addEventListener('click', () => {
            card.classList.remove('is-done');
            $('#form-done').setAttribute('aria-hidden', 'true');
            form.reset();
            touched = false;
            Object.keys(rules).forEach(k => setErr(k, ''));
            onQuoteChange();
        });

        onQuoteChange();   // sincroniza con el estado inicial del cotizador
    }

    /* ═════════════ FAQ · acordeón exclusivo (fallback) ═════════════ */
    function initFaq() {
        const all = $$('.faq details');
        all.forEach(d => d.addEventListener('toggle', () => { if (d.open) all.forEach(o => { if (o !== d) o.open = false; }); }));
    }

    /* ═════════════ WHATSAPP FLOTANTE · tooltip ═════════════ */
    let tipTimer;
    function scheduleTooltip() {
        const wa = $('#wa-float');
        if (!wa) return;
        const show = (delay, dur) => setTimeout(() => { wa.classList.add('is-tip'); setTimeout(() => wa.classList.remove('is-tip'), dur); }, delay);
        clearTimeout(tipTimer);
        show(6000, 6500);
        show(48000, 6000);
    }

    /* ═════════════ ARRANQUE ═════════════ */
    safe('year', () => $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); }));
    safe('scroll-reset', () => { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; window.scrollTo(0, 0); });
    safe('reveal', initReveal);
    safe('words', initWords);
    safe('counters', initCounters);
    safe('header', initHeader);
    safe('menu', initMenu);
    safe('hero', initHero);
    safe('interactions', initInteractions);
    safe('parallax', initParallax);
    safe('marquee', initMarquee);
    safe('hscroll', initHScroll);
    safe('steps', initSteps);
    safe('quote', initQuote);
    safe('form', initForm);
    safe('faq', initFaq);
    safe('loader', initLoader);
})();
