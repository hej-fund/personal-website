// Phone layout. Home page: one long scroll with a compact header; About, Projects and Stats are
// pulled in from their own pages, so their content only lives in one place. Other pages: header
// links and Back point at the matching spot on that scroll. Desktop is untouched.
(function () {
    const mq = window.matchMedia('(max-width: 760px)');
    const HEADER_H = 56;                  // phone header height (matches the CSS)
    const SECTIONS = [
        { id: 'm-about', page: 'about.html', label: 'About', select: '.about-layout' },
        { id: 'm-projects', page: 'projects.html', label: 'Projects', select: '.page-content' },
        { id: 'm-stats', page: 'stats.html', label: 'Stats', select: '.page-content', scripts: true },
    ];
    const hero = document.querySelector('.hero');

    // where the scroll page was when the visitor left it, so Back can return there
    const store = {
        get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
        set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* storage blocked */ } },
        del: function (k) { try { sessionStorage.removeItem(k); } catch (e) { /* storage blocked */ } },
    };

    // ─── Other pages: on phones, header links and Back go to the matching spot on the scroll page ───
    // (pages without a viewport tag report a ~980px layout width on phones, so check the screen too)
    if (!hero) {
        const target = { About: 'm-about', Projects: 'm-projects', Stats: 'm-stats' };
        const backTarget = { 'projects.html': 'm-projects' };   // sub-pages of Projects
        const isPhone = function () { return mq.matches || Math.min(screen.width, screen.height) <= 760; };
        const rewire = function (a, id) {
            if (a.dataset.desktopHref === undefined) a.dataset.desktopHref = a.getAttribute('href') || '';
            if (isPhone()) a.setAttribute('href', 'index.html#' + id);
            else if (a.dataset.desktopHref) a.setAttribute('href', a.dataset.desktopHref);
            else a.removeAttribute('href');                    // current page stays unclickable on desktop
        };
        const applyLinks = function () {
            document.querySelectorAll('.site-nav .nav-links a').forEach(function (a) {
                const id = target[a.textContent.trim()];
                if (id) rewire(a, id);
            });
            document.querySelectorAll('.back-btn').forEach(function (a) {
                const id = backTarget[a.dataset.desktopHref !== undefined ? a.dataset.desktopHref : a.getAttribute('href')];
                if (id) rewire(a, id);
            });
        };
        applyLinks();
        mq.addEventListener('change', applyLinks);
        document.querySelectorAll('.back-btn').forEach(function (a) {
            a.addEventListener('click', function (e) {
                if (!isPhone() || store.get('mReturnY') === null) return;   // nothing saved: go to the section
                e.preventDefault();
                store.set('mReturn', '1');
                location.href = 'index.html';
            });
        });
        return;
    }

    const reportBtn = document.querySelector('.btn-report');
    const reportHome = { parent: reportBtn && reportBtn.parentNode, next: reportBtn && reportBtn.nextSibling };
    let loaded = false, ready = false, header = null, observer = null, heroWatch = null;

    function heroButton(page) {
        return document.querySelector('.hero .buttons a[data-page="' + page + '"]') ||
               document.querySelector('.hero .buttons a[href="' + page + '"]');
    }

    // On phones the hero buttons jump down the page; on desktop they go to the pages as before
    function updateButtons() {
        SECTIONS.forEach(function (s) {
            const a = heroButton(s.page);
            if (!a) return;
            a.dataset.page = s.page;
            a.setAttribute('href', mq.matches && document.getElementById(s.id) ? '#' + s.id : s.page);
        });
    }

    // Run a pulled-in page's own scripts (Stats draws its numbers and chart this way)
    function runScripts(doc) {
        const external = Array.from(doc.querySelectorAll('head script[src]'));
        const inline = Array.from(doc.querySelectorAll('body script:not([src])'));
        doc.querySelectorAll('head style').forEach(function (st) {
            document.head.appendChild(st.cloneNode(true));
        });
        return external.reduce(function (p, s) {
            return p.then(function () {
                return new Promise(function (resolve) {
                    const el = document.createElement('script');
                    el.src = s.getAttribute('src');
                    el.onload = el.onerror = resolve;
                    document.head.appendChild(el);
                });
            });
        }, Promise.resolve()).then(function () {
            inline.forEach(function (s) {
                const el = document.createElement('script');
                // own scope so names can't clash with the home page, and leave the tab title alone
                el.textContent = '(function () {\n' + s.textContent.replace(/document\.title\s*=/g, 'void ') + '\n})();';
                document.body.appendChild(el);
            });
        });
    }

    function load() {
        if (loaded) return;
        loaded = true;
        const main = document.createElement('main');
        main.className = 'mobile-scroll';
        hero.after(main);

        Promise.all(SECTIONS.map(function (s) {
            return fetch(s.page)
                .then(function (r) { return r.ok ? r.text() : Promise.reject(r.status); })
                .then(function (html) {
                    const doc = new DOMParser().parseFromString(html, 'text/html');
                    const part = doc.querySelector(s.select);
                    if (!part) return null;
                    const section = document.createElement('section');
                    section.id = s.id;
                    section.className = 'mobile-section';
                    section.appendChild(document.importNode(part, true));
                    return { section: section, doc: s.scripts ? doc : null };
                })
                .catch(function () { return null; });   // if a page can't be loaded, its link keeps going to it
        })).then(function (built) {
            built.forEach(function (b) {
                if (!b) return;
                main.appendChild(b.section);
                if (b.doc) runScripts(b.doc);
            });
            ready = true;
            updateButtons();
            buildHeader();
            // came back via a page's Back link: return to where the scroll was
            if (store.get('mReturn') === '1' && mq.matches) {
                store.del('mReturn');
                const y = Number(store.get('mReturnY'));
                if (!isNaN(y)) window.scrollTo({ top: y, behavior: 'instant' });
            // arrived from another page's link (index.html#m-...)
            } else if (/^#m-/.test(location.hash) && mq.matches) {
                setTimeout(function () { jumpTo(location.hash.slice(1)); }, 300);
            }
        });
    }

    function buildHeader() {
        if (header || !ready || !mq.matches) return;
        header = document.createElement('header');
        header.className = 'site-nav site-nav--home';
        const links = SECTIONS.map(function (s) {
            const ok = document.getElementById(s.id);
            return '<a href="' + (ok ? '#' + s.id : s.page) + '" data-section="' + s.id + '">' + s.label + '</a>';
        }).join('');
        // high-res PNG of favicon.svg: phone browsers draw small SVG images soft
        header.innerHTML =
            '<a href="#top" class="nav-brand" aria-label="Back to top"><img src="assets/logo-256.png?v=1" alt="" width="34" height="34"></a>' +
            '<nav class="nav-links">' + links + '</nav>';
        document.body.insertBefore(header, document.body.firstChild);

        header.querySelector('.nav-brand').addEventListener('click', function (e) {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        // highlight the link for the section currently on screen
        observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                const a = header && header.querySelector('[data-section="' + en.target.id + '"]');
                if (a) a.classList.toggle('is-active', en.isIntersecting);
            });
        }, { rootMargin: '-45% 0px -50% 0px' });
        SECTIONS.forEach(function (s) {
            const el = document.getElementById(s.id);
            if (el) observer.observe(el);
        });

        // the header only slides in once the name screen has been scrolled completely past;
        // Report Bug moves into it then (same button, so the bug form stays wired up) and back after
        let past = null;
        heroWatch = function () {
            const now = hero.getBoundingClientRect().bottom <= HEADER_H + 1;   // touching the header counts as past
            if (now === past || !header) return;
            past = now;
            header.classList.toggle('is-visible', past);
            if (!reportBtn) return;
            if (past) header.appendChild(reportBtn);
            else if (reportHome.parent) reportHome.parent.insertBefore(reportBtn, reportHome.next);
        };
        window.addEventListener('scroll', heroWatch, { passive: true });
        window.addEventListener('resize', heroWatch);
        heroWatch();
    }

    function removeHeader() {
        if (!header) return;
        if (reportBtn && reportHome.parent) reportHome.parent.insertBefore(reportBtn, reportHome.next);
        if (observer) observer.disconnect();
        if (heroWatch) {
            window.removeEventListener('scroll', heroWatch);
            window.removeEventListener('resize', heroWatch);
        }
        header.remove();
        header = observer = heroWatch = null;
    }

    function apply() {
        if (mq.matches) {
            load();
            buildHeader();          // no-op until the sections have loaded
        } else {
            removeHeader();
        }
        updateButtons();
    }

    // Section jumps: land the section's top line just under the header. The target is re-checked
    // once scrolling settles, because late-loading images or a collapsing address bar can shift it.
    function jumpTo(id) {
        const el = document.getElementById(id);
        if (!el) return;
        // native anchor scroll (honours the CSS scroll-margin-top), then a re-check once it settles
        const target = function () { return el.getBoundingClientRect().top + window.scrollY - HEADER_H; };
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        let last = -1, still = 0;
        const settle = setInterval(function () {
            still = Math.abs(window.scrollY - last) < 1 ? still + 1 : 0;
            last = window.scrollY;
            if (still >= 3) {                       // stopped moving for ~150ms
                clearInterval(settle);
                if (Math.abs(target() - window.scrollY) > 2) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 50);
        setTimeout(function () { clearInterval(settle); }, 4000);
    }

    // leaving the scroll page (e.g. a project's View button): remember the position for Back
    document.addEventListener('click', function (e) {
        const a = e.target.closest && e.target.closest('a[href]');
        if (!a || !mq.matches || a.target === '_blank') return;
        const href = a.getAttribute('href');
        if (href.charAt(0) === '#' || /^(mailto:|https?:)/.test(href)) return;
        store.set('mReturnY', String(Math.round(window.scrollY)));
    }, true);

    document.addEventListener('click', function (e) {
        const a = e.target.closest && e.target.closest('a[href^="#m-"]');
        if (!a || !mq.matches) return;
        e.preventDefault();
        jumpTo(a.getAttribute('href').slice(1));
    });

    apply();
    mq.addEventListener('change', apply);
})();
