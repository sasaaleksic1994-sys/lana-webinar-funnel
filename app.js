(function () {
  const cfg = window.FUNNEL_CONFIG;
  const start = new Date(cfg.webinarStart);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger) && !reduced;
  const isDesktop = () => window.matchMedia('(min-width: 961px)').matches;
  if (!hasGsap) document.documentElement.classList.add('reduced');

  // Wechsel zwischen Desktop- und Handy-Layout (nur beim Fenster-Ziehen): sauber neu aufbauen,
  // damit keine Positionen der gepinnten Desktop-Story hängen bleiben
  const startDesktop = isDesktop();
  let bpTimer;
  window.addEventListener('resize', () => {
    clearTimeout(bpTimer);
    bpTimer = setTimeout(() => { if (isDesktop() !== startDesktop) location.reload(); }, 300);
  });

  // ---------- Termin + Countdown ----------
  const dateLabel = document.getElementById('date-label');
  if (dateLabel) {
    const fmt = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
    dateLabel.textContent = 'Live · ' + fmt.format(start).replace(' um ', ' · ') + ' Uhr';
  }
  const cd = document.getElementById('countdown');
  if (cd) {
    const set = (k, v) => { cd.querySelector(`[data-cd="${k}"]`).textContent = String(v).padStart(2, '0'); };
    const tick = () => {
      let diff = Math.max(0, start - new Date());
      const d = Math.floor(diff / 864e5); diff -= d * 864e5;
      const h = Math.floor(diff / 36e5); diff -= h * 36e5;
      const m = Math.floor(diff / 6e4); diff -= m * 6e4;
      set('d', d); set('h', h); set('m', m); set('s', Math.floor(diff / 1e3));
    };
    tick(); setInterval(tick, 1000);
  }

  // ---------- Headline Wort für Wort ----------
  document.querySelectorAll('.split').forEach((h) => {
    const words = [];
    const wrap = (node) => [...node.childNodes].forEach((c) => {
      if (c.nodeType === 3) {
        const frag = document.createDocumentFragment();
        c.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) return frag.appendChild(document.createTextNode(part));
          const outer = document.createElement('span'); outer.style.cssText = 'display:inline-block;overflow:hidden;vertical-align:top';
          const inner = document.createElement('span'); inner.style.display = 'inline-block'; inner.textContent = part;
          outer.appendChild(inner); frag.appendChild(outer); words.push(inner);
        });
        c.replaceWith(frag);
      } else if (c.nodeType === 1) wrap(c);
    });
    wrap(h);
    if (hasGsap) gsap.from(words, { yPercent: 110, duration: 1, ease: 'power4.out', stagger: 0.06, delay: 0.15 });
  });

  if (hasGsap) {
    gsap.registerPlugin(ScrollTrigger);

    // Weiches Scrollen
    if (window.Lenis) {
      const lenis = new Lenis({ lerp: 0.1 });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
      document.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
        const el = document.querySelector(a.getAttribute('href'));
        if (el) { e.preventDefault(); lenis.scrollTo(el, { offset: -90 }); }
      }));
    }


    // Parallax Porträt
    gsap.to('.parallax', { yPercent: -12, ease: 'none', scrollTrigger: { trigger: '.portrait', start: 'top bottom', end: 'bottom top', scrub: true } });
  }

  // ---------- Einblenden (IntersectionObserver: unabhängig von nachladenden Bildern/Videos) ----------
  const showIO = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting && !(isDesktop() && e.target.closest('.stage'))) { e.target.classList.add('in'); showIO.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  // Kacheln/Kreis immer vormerken: auf dem Desktop steuert GSAP sie, die Klasse .in wirkt nur im Handy-Layout
  const toShow = [...document.querySelectorAll('.reveal'), ...document.querySelectorAll('.stage .tile, .stage .whole')];
  toShow.forEach((el) => showIO.observe(el));
  // Absicherung: zusätzlich beim Scrollen prüfen, falls der Observer nicht feuert
  const checkShow = () => {
    const vh = window.innerHeight;
    toShow.forEach((el) => {
      if (el.classList.contains('in')) return;
      const r = el.getBoundingClientRect();
      if (r.top < vh * 0.95 && r.bottom > 0 && !(isDesktop() && el.closest('.stage'))) el.classList.add('in');
    });
  };
  window.addEventListener('scroll', checkShow, { passive: true });
  window.addEventListener('load', checkShow);
  window.addEventListener('resize', () => { checkShow(); if (hasGsap) ScrollTrigger.refresh(); });
  checkShow();
  // Positionen neu berechnen, sobald alles geladen ist
  if (hasGsap) window.addEventListener('load', () => ScrollTrigger.refresh());

  // ---------- Mobil: goldene Umrandung folgt dem Scrollen ----------
  const goldTiles = [...document.querySelectorAll('.stage .tile')];
  const goldScroll = () => {
    if (isDesktop()) return;
    const vh = window.innerHeight;
    goldTiles.forEach((t, i) => {
      const r = t.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (vh * 0.7 - r.top) / r.height));
      t.style.setProperty('--p', p.toFixed(3));
      // Verbindung zur vorherigen Karte füllt sich, sobald diese fertig umrandet ist
      const prev = goldTiles[i - 1];
      const c = prev ? Math.min(1, Math.max(0, (vh * 0.7 - r.top + 16) / 16)) : 0;
      t.style.setProperty('--c', c.toFixed(3));
      t.classList.toggle('lit', p >= 0.999);
    });
  };
  window.addEventListener('scroll', goldScroll, { passive: true });
  window.addEventListener('resize', goldScroll);
  goldScroll();

  // ---------- Zähler ----------
  const countUp = (el) => {
    const target = +el.dataset.count, suffix = el.dataset.suffix || '';
    if (!hasGsap) { el.textContent = target.toLocaleString('de-DE') + suffix; return; }
    const o = { v: 0 };
    gsap.to(o, { v: target, duration: 1.8, ease: 'power2.out', onUpdate: () => { el.textContent = Math.round(o.v).toLocaleString('de-DE') + suffix; } });
  };
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { countUp(e.target); io.unobserve(e.target); } }), { threshold: 0.6 });
  document.querySelectorAll('[data-count]').forEach((el) => io.observe(el));

  // ---------- Scroll-Story: Blatt zerfällt in 5 Bereiche ----------
  const stage = document.getElementById('stage');
  if (stage) {
    const tiles = [...stage.querySelectorAll('.tile')];
    const whole = stage.querySelector('.whole');
    const sheet = document.getElementById('sheet');
    const svg = document.getElementById('links');
    const step = document.getElementById('story-step'), title = document.getElementById('story-title'), text = document.getElementById('story-text');
    const copy = [
      ['01 / Der Silo-Fehler', 'Ein Blatt sagt: <span class="serif">„alles normal“.</span>', 'Einzelne Laborwerte können unauffällig sein. Doch einzelne Zahlen erzählen nicht immer die ganze Geschichte.'],
      ['02 / Die Verbindung', 'Dein Körper arbeitet <span class="serif">nicht in Schubladen.</span>', 'Blut, Darm, Hormone und Nährstoffversorgung greifen ineinander. Isolierte Auswertungen zeigen nicht jeden Zusammenhang.'],
      ['03 / Der Aha-Moment', 'Erst gemeinsam entsteht <span class="serif">das ganze Bild.</span>', 'Genau diesen Blick auf vernetzte Daten zeigt Lana im kostenlosen Live-Webinar.'],
    ];
    let phase = -1;
    const setPhase = (p) => {
      if (p === phase) return; phase = p;
      step.textContent = copy[p][0]; title.innerHTML = copy[p][1]; text.textContent = copy[p][2];
      if (hasGsap) gsap.fromTo([title, text], { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.06 });
    };
    setPhase(0);

    const positions = () => {
      const r = stage.getBoundingClientRect();
      const mobile = r.width < 600;
      const tw = tiles[0].offsetWidth / 2, th = tiles[0].offsetHeight / 2;
      // so weit wie möglich nach außen, damit Linien zwischen Kreis und Kacheln sichtbar bleiben
      const rx = mobile ? r.width * 0.36 : Math.min(r.width / 2 - tw - 8, 420);
      const ry = mobile ? r.height * 0.36 : r.height / 2 - th - 36;
      // oben, rechts, unten rechts, unten links, links – unten ganz nach außen, damit die Linien sichtbar sind
      const dirs = [[0, -1], [1, -0.22], [0.6, 1], [-0.6, 1], [-1, -0.22]];
      return dirs.map(([dx, dy]) => ({ x: dx * rx, y: dy * ry }));
    };
    const drawLinks = (pos) => {
      const r = stage.getBoundingClientRect();
      svg.setAttribute('viewBox', `0 0 ${r.width} ${r.height}`);
      svg.innerHTML = pos.map((p) => `<path d="M${r.width / 2},${r.height / 2} L${r.width / 2 + p.x},${r.height / 2 + p.y}"/>`).join('');
      return [...svg.querySelectorAll('path')];
    };

    const loadVideos = () => tiles.forEach((t) => { const v = t.querySelector('video'); if (v && !v.src) { v.src = v.dataset.src; v.play().catch(() => {}); } });
    new IntersectionObserver((es) => { if (es[0].isIntersecting) loadVideos(); }, { rootMargin: '200px' }).observe(stage);

    if (hasGsap) {
      ScrollTrigger.matchMedia({
        '(min-width: 961px)': () => {
          const pos = positions();
          const paths = drawLinks(pos);
          paths.forEach((p) => { const l = p.getTotalLength(); p.style.strokeDasharray = `${l}`; p.style.strokeDashoffset = `${l}`; });
          const tl = gsap.timeline({
            scrollTrigger: { trigger: '#story', start: 'top top', end: '+=900', scrub: 0.6, pin: '.story-pin', anticipatePin: 1,
              onUpdate: (s) => setPhase(s.progress < 0.3 ? 0 : s.progress < 0.7 ? 1 : 2) },
          });
          tl.to(sheet, { scale: 0.85, rotate: 0, duration: 0.3 })
            .to(sheet, { opacity: 0, scale: 0.6, duration: 0.3 }, '>-0.05')
            .to(tiles, { opacity: 1, duration: 0.2 }, '<')
            .to(tiles, { x: (i) => pos[i].x, y: (i) => pos[i].y, rotate: (i) => (i % 2 ? 4 : -4), duration: 0.8, ease: 'power2.out', stagger: 0.05 }, '<')
            .to(paths, { strokeDashoffset: 0, duration: 0.6, stagger: 0.05 }, '>-0.2')
            .to(whole, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.6)' }, '<0.2')
            .to(tiles, { rotate: 0, duration: 0.3 });
        },
        '(max-width: 960px)': () => {
          // Mobil: Einblenden per CSS-Klasse (siehe IntersectionObserver unten)
          // Reste der Desktop-Animation entfernen (z. B. nach Verkleinern des Fensters)
          gsap.set([sheet, whole, ...tiles], { clearProps: 'transform,opacity,translate,rotate,scale' });
          svg.innerHTML = '';
          setPhase(2);
        },
      });
    } else {
      // Ohne Animation: Endzustand anzeigen
      sheet.style.display = 'none'; whole.style.opacity = 1; whole.style.transform = 'none';
      if (isDesktop()) { const pos = positions(); drawLinks(pos); tiles.forEach((t, i) => { t.style.opacity = 1; t.style.transform = `translate(${pos[i].x}px, ${pos[i].y}px)`; }); }
      setPhase(2);
    }
  }

  // ---------- Ferritin-Regler ----------
  const fer = document.getElementById('fer');
  if (fer) {
    const upd = () => {
      const v = +fer.value;
      document.getElementById('fer-val').textContent = v;
      const normal = v >= 15; // typische Untergrenze im Laborbereich
      const normBar = document.getElementById('norm-bar');
      normBar.style.width = Math.min(100, (v / 150) * 100 + 30) + '%';
      normBar.style.background = normal ? '#2e8b57' : '#b42318';
      document.getElementById('norm-label').textContent = normal ? '✓ normal' : 'unter Normbereich';
      const pct = Math.min(100, Math.round((v / 50) * 100));
      const optBar = document.getElementById('opt-bar');
      optBar.style.width = pct + '%';
      optBar.style.background = pct >= 100 ? '#2e8b57' : '#f6ad55';
      document.getElementById('opt-label').textContent = pct + ' %';
      document.getElementById('verdict').innerHTML = normal && pct < 100
        ? `<b>Laut Labor: „alles normal“.</b> Bis zum optimalen Bereich fehlen dir aber noch ${50 - v} Punkte – genau diese Lücke erklärt Lana im Webinar.`
        : pct >= 100 ? '<b>Im optimalen Bereich.</b> Im Webinar erfährst du, welche Werte zusätzlich über deine Energie entscheiden.'
        : '<b>Unter dem Normbereich.</b> Sprich darüber mit deiner Ärztin oder deinem Arzt – und hol dir im Webinar das ganze Bild.';
    };
    fer.addEventListener('input', upd); upd();
  }

  // ---------- Timeline ----------
  const tl = document.getElementById('timeline');
  if (tl) {
    const items = [...tl.querySelectorAll('.tl-item')];
    const fill = document.getElementById('tl-fill');
    if (hasGsap) {
      gsap.to(fill, { height: '100%', ease: 'none', scrollTrigger: { trigger: tl, start: 'top 65%', end: 'bottom 65%', scrub: true } });
      items.forEach((it) => ScrollTrigger.create({ trigger: it, start: 'top 65%', onEnter: () => it.classList.add('on'), onLeaveBack: () => it.classList.remove('on') }));
    } else { fill.style.height = '100%'; items.forEach((it) => it.classList.add('on')); }
  }

  // ---------- Stimmen horizontal (Desktop) ----------
  if (hasGsap) {
    ScrollTrigger.matchMedia({
      '(min-width: 961px)': () => {
        const track = document.getElementById('voices');
        const dist = () => Math.max(0, track.scrollWidth - track.parentElement.clientWidth);
        if (dist() > 0) gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: '#voices-sec', start: 'top 20%', end: () => '+=' + dist(), scrub: 0.6, pin: true, invalidateOnRefresh: true } });
      },
      '(max-width: 960px)': () => {
        // Verschiebung vom Desktop entfernen, sonst liegen die Stimmen außerhalb des Bildes
        gsap.set('#voices', { clearProps: 'transform' });
      },
    });
  }

  // ---------- Video ----------
  const vw = document.getElementById('video');
  if (vw) {
    const v = vw.querySelector('video');
    // Play-Button und Titel ausblenden, solange das Video läuft; danach übernehmen die Video-Steuerelemente
    vw.querySelector('.play').addEventListener('click', (e) => { e.stopPropagation(); v.controls = true; v.play(); });
    vw.querySelector('.poster-layer').addEventListener('click', () => { v.controls = true; v.play(); });
    v.addEventListener('play', () => vw.classList.add('playing'));
    v.addEventListener('ended', () => { vw.classList.remove('playing'); v.controls = false; });
  }

  // ---------- Magnetische Buttons ----------
  if (hasGsap && window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.magnetic').forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * 0.18, y: (e.clientY - r.top - r.height / 2) * 0.3, duration: 0.4, ease: 'power3.out' });
      });
      el.addEventListener('mouseleave', () => gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, .4)' }));
    });
  }

  // ---------- Sticky-CTA (mobil) ----------
  const sticky = document.getElementById('sticky-cta');
  const formCard = document.getElementById('anmeldung');
  if (sticky && formCard) {
    let formVisible = true;
    const update = () => sticky.classList.toggle('show', !formVisible && window.scrollY > 700);
    new IntersectionObserver(([e]) => { formVisible = e.isIntersecting; update(); }).observe(formCard);
    window.addEventListener('scroll', update, { passive: true });
  }

  // ---------- Formular ----------
  const form = document.getElementById('signup');
  if (!form) return;
  const errBox = document.getElementById('form-error');
  const btn = document.getElementById('submit-btn');
  const btnLabel = btn.querySelector('.label');
  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  const params = new URLSearchParams(location.search);
  const quelle = params.get('utm_source') || (document.referrer ? new URL(document.referrer).hostname : 'direkt');

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    errBox.style.display = 'none';
    const vorname = form.vorname.value.trim();
    const email = form.email.value.trim().toLowerCase();
    let ok = true;
    form.vorname.closest('.field').classList.toggle('invalid', !vorname); ok = ok && !!vorname;
    form.email.closest('.field').classList.toggle('invalid', !emailOk(email)); ok = ok && emailOk(email);
    if (!document.getElementById('consent').checked) {
      errBox.textContent = 'Bitte bestätige, dass du die Zugangsdaten per E-Mail erhalten möchtest.';
      errBox.style.display = 'block'; ok = false;
    }
    if (!ok || form.website.value) return;

    const payload = {
      vorname, email, quelle,
      utm_campaign: params.get('utm_campaign') || '',
      utm_content: params.get('utm_content') || '',
      anmeldedatum: new Date().toISOString(),
      webinar: cfg.webinarStart,
    };
    btn.disabled = true; btnLabel.textContent = 'Wird gesendet …';
    try {
      if (cfg.endpoint) {
        // text/plain vermeidet den CORS-Preflight bei Google Apps Script
        const res = await fetch(cfg.endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || 'Unbekannter Fehler');
      } else {
        console.info('[Demo-Modus] Kein Endpoint gesetzt. Payload:', payload);
      }
      sessionStorage.setItem('lk_vorname', vorname);
      sessionStorage.setItem('lk_email', email);
      location.href = 'danke.html';
    } catch (e) {
      errBox.textContent = 'Das hat leider nicht geklappt. Bitte versuche es in einem Moment noch einmal.';
      errBox.style.display = 'block';
      btn.disabled = false; btnLabel.textContent = 'Jetzt kostenfreies Ticket sichern';
    }
  });
})();
