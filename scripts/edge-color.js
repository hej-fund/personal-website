// Phones: tint Safari's top and bottom bars with the actual colour of the content at each screen
// edge, updated as you scroll. Each edge is sampled at several points across the screen; at each
// point the layers under it are read (photos and <img> pixels, solid backgrounds, dark overlays)
// and blended the way the browser draws them, then the points are averaged.
// Safari is told three ways, since versions differ in what they read: the theme-color tag, the
// page background, and 1px fixed strips along the top and bottom edges.
(function () {
    const mq = window.matchMedia('(max-width: 760px)');
    const POINTS = 9;            // samples across each edge
    const SAMPLE_W = 96;         // images are read from a 96px-wide copy (plenty for an average colour)

    const meta = document.querySelector('meta[name="theme-color"]') || (function () {
        const m = document.createElement('meta');
        m.name = 'theme-color';
        document.head.appendChild(m);
        return m;
    })();
    const fallback = meta.getAttribute('content') || '#0a0a0a';
    let topStrip = null, bottomStrip = null;

    function strip(edge) {
        const el = document.createElement('div');
        el.setAttribute('aria-hidden', 'true');
        el.style.cssText = 'position:fixed;left:0;right:0;height:1px;pointer-events:none;z-index:1;' + edge + ':0';
        document.body.appendChild(el);
        return el;
    }

    function parseRGBA(s) {
        const m = s && s.match(/rgba?\(([^)]+)\)/);
        if (!m) return null;
        const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat);
        return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
    }
    function hex(c) {
        return '#' + [c.r, c.g, c.b].map(function (v) {
            return Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
        }).join('');
    }

    // ── image pixels, read once per image and kept ──
    const images = {};   // url -> { w, h, data } once loaded, or 'loading' / 'failed'
    function pixels(url) {
        const entry = images[url];
        if (entry && entry !== 'loading' && entry !== 'failed') return entry;
        if (!entry) {
            images[url] = 'loading';
            const img = new Image();
            img.onload = function () {
                const w = SAMPLE_W, h = Math.max(1, Math.round(img.naturalHeight * w / img.naturalWidth));
                const c = document.createElement('canvas');
                c.width = w; c.height = h;
                const ctx = c.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                try {
                    images[url] = { w: w, h: h, nw: img.naturalWidth, nh: img.naturalHeight, data: ctx.getImageData(0, 0, w, h).data };
                } catch (e) {
                    images[url] = 'failed';
                }
                last = '';
                schedule();
            };
            img.onerror = function () { images[url] = 'failed'; };
            img.src = url;
        }
        return null;
    }

    // one CSS position component ("50%", "12px", "calc(50% + 15.6px)") within the free space
    function offset(comp, free) {
        let v = 0;
        const pct = comp.match(/(-?[\d.]+)%/);
        const px = comp.match(/(-?[\d.]+)px/);
        if (pct) v += parseFloat(pct[1]) / 100 * free;
        if (px) v += (/-\s*[\d.]+px/.test(comp) && comp.indexOf('calc') !== -1 ? -1 : 1) * Math.abs(parseFloat(px[1]));
        return v;
    }

    // colour of an image drawn into a box at a point, or null if the point is outside the image
    function sampleImage(url, box, x, y, size, position) {
        const p = pixels(url);
        if (!p) return null;
        const bw = box.width, bh = box.height;
        let dw, dh;
        const s = (size || 'auto').trim();
        if (s === 'cover' || s === 'contain') {
            const k = (s === 'cover' ? Math.max : Math.min)(bw / p.nw, bh / p.nh);
            dw = p.nw * k; dh = p.nh * k;
        } else if (s === 'fill') {
            dw = bw; dh = bh;
        } else {
            const parts = s.split(/\s+/);
            const len = function (v, base) { return /%$/.test(v) ? parseFloat(v) / 100 * base : /px$/.test(v) ? parseFloat(v) : null; };
            dw = len(parts[0], bw);
            dh = parts[1] ? len(parts[1], bh) : null;
            if (dw == null && dh == null) { dw = p.nw; dh = p.nh; }
            else if (dw == null) dw = dh * p.nw / p.nh;
            else if (dh == null) dh = dw * p.nh / p.nw;
        }
        const pos = (position || '50% 50%').match(/calc\([^)]*\)|\S+/g) || ['50%', '50%'];
        const ox = offset(pos[0], bw - dw), oy = offset(pos[1] || '50%', bh - dh);
        const u = (x - box.left - ox) / dw, v = (y - box.top - oy) / dh;
        if (u < 0 || u >= 1 || v < 0 || v >= 1) return null;
        const i = (Math.floor(v * p.h) * p.w + Math.floor(u * p.w)) * 4;
        return { r: p.data[i], g: p.data[i + 1], b: p.data[i + 2], a: 1 };
    }

    // the opaque colour under one screen point, with any see-through layers above it blended on
    function colourAt(x, y) {
        const above = [];        // semi-transparent layers, top first
        let base = null;
        const els = document.elementsFromPoint(x, y);
        for (let i = 0; i < els.length && !base; i++) {
            const el = els[i];
            if (el === topStrip || el === bottomStrip) continue;
            const cs = getComputedStyle(el);
            const box = el.getBoundingClientRect();
            // a ::before overlay covering the element (e.g. the darkening layer on the background photo)
            const before = getComputedStyle(el, '::before');
            if (before.content !== 'none' && before.position !== 'static') {
                const oc = parseRGBA(before.backgroundColor);
                if (oc && oc.a > 0) { if (oc.a >= 0.99) { base = oc; break; } above.push(oc); }
            }
            if (el.tagName === 'IMG' && el.complete && el.currentSrc) {
                const c = sampleImage(el.currentSrc, box, x, y, cs.objectFit === 'none' ? 'auto' : cs.objectFit, cs.objectPosition);
                if (c) { base = c; break; }
            }
            const bg = cs.backgroundImage.match(/url\(["']?([^"')]+)["']?\)/);
            if (bg) {
                const c = sampleImage(new URL(bg[1], location.href).href, box, x, y, cs.backgroundSize, cs.backgroundPosition);
                if (c) { base = c; break; }
            }
            const c = parseRGBA(cs.backgroundColor);
            if (c && c.a > 0) { if (c.a >= 0.99) { base = c; break; } above.push(c); }
        }
        if (!base) base = { r: 10, g: 10, b: 10, a: 1 };   // the page colour (not read back: this script changes it)
        for (let j = above.length - 1; j >= 0; j--) {
            const o = above[j];
            base = { r: base.r * (1 - o.a) + o.r * o.a, g: base.g * (1 - o.a) + o.g * o.a, b: base.b * (1 - o.a) + o.b * o.a, a: 1 };
        }
        return base;
    }

    function edge(y) {
        let r = 0, g = 0, b = 0;
        const w = window.innerWidth;
        for (let k = 0; k < POINTS; k++) {
            const c = colourAt((k + 0.5) * w / POINTS, y);
            r += c.r; g += c.g; b += c.b;
        }
        return hex({ r: r / POINTS, g: g / POINTS, b: b / POINTS });
    }

    let last = '';
    function update() {
        if (!mq.matches) return;
        if (!topStrip) { topStrip = strip('top'); bottomStrip = strip('bottom'); }
        const topC = edge(0);
        const botC = edge(window.innerHeight - 1);
        if (topC + botC === last) return;
        last = topC + botC;
        meta.setAttribute('content', topC);
        document.documentElement.style.backgroundColor = topC;
        topStrip.style.backgroundColor = topC;
        bottomStrip.style.backgroundColor = botC;
    }

    function reset() {
        meta.setAttribute('content', fallback);
        document.documentElement.style.backgroundColor = '';
        if (topStrip) { topStrip.remove(); bottomStrip.remove(); topStrip = bottomStrip = null; }
        last = '';
    }

    let queued = false;
    function schedule() {
        if (queued) return;
        queued = true;
        requestAnimationFrame(function () { queued = false; update(); });
    }

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('load', schedule);
    document.addEventListener('click', function () { setTimeout(schedule, 400); });   // e.g. photo viewer opened / closed
    mq.addEventListener('change', function () { if (mq.matches) schedule(); else reset(); });
    schedule();
    setTimeout(schedule, 1500);   // content pulled in later (phone home sections) settles
})();
