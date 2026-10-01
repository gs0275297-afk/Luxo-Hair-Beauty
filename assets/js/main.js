(() => {
  'use strict';

  const root = document.documentElement;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isDesktop = () => innerWidth >= 900;
  const pad = (n) => String(n).padStart(2, '0');
  const WA = 'https://wa.me/5567984836484?text=';

  // trava de scroll compartilhada entre menu, perfil e galeria
  const locks = new Set();
  const lock = (key, on) => {
    locks[on ? 'add' : 'delete'](key);
    root.classList.toggle('is-locked', locks.size > 0);
  };

  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* ---------- header ---------- */
  const header = $('[data-header]');
  let lastY = scrollY;
  const onHeaderScroll = () => {
    const y = scrollY;
    header.classList.toggle('is-scrolled', y > 24);
    if (Math.abs(y - lastY) < 8) return;
    header.classList.toggle('is-hidden', y > lastY && y > innerHeight * 0.6);
    lastY = y;
  };
  onHeaderScroll();

  /* ---------- menu mobile ---------- */
  const menu = $('[data-menu]');
  const toggle = $('[data-menu-toggle]');
  const setMenu = (open) => {
    root.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    $('.menu-toggle__label', toggle).textContent = open ? 'Fechar' : 'Menu';
    menu.inert = !open;
    lock('menu', open);
  };
  toggle.addEventListener('click', () => setMenu(!root.classList.contains('menu-open')));
  $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && root.classList.contains('menu-open')) { setMenu(false); toggle.focus(); }
  });
  matchMedia('(min-width: 1024px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  /* ---------- link ativo na navegação ---------- */
  const navLinks = $$('.nav a');
  if (navLinks.length && 'IntersectionObserver' in window) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((a) => a.classList.toggle('is-current', a.getAttribute('href') === `#${entry.target.id}`));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main section[id]').forEach((s) => spy.observe(s));
  }

  /* ---------- títulos palavra por palavra ---------- */
  const split = (el) => {
    let i = 0;
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === Node.ELEMENT_NODE) { walk(child); return; }
        if (child.nodeType !== Node.TEXT_NODE) return;
        const frag = document.createDocumentFragment();
        const before = child.previousSibling;
        child.textContent.split(/(\s+)/).forEach((part, index) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(' '); return; }
          const word = document.createElement('span');
          word.className = 'w';
          word.setAttribute('aria-hidden', 'true');
          const inner = document.createElement('span');
          inner.style.setProperty('--i', i++);
          inner.textContent = part;
          word.append(inner);
          // pontuação colada a um <em> (ex.: "resultado.") nunca quebra para a linha seguinte
          if (index === 0 && before && before.nodeType === Node.ELEMENT_NODE) {
            const keep = document.createElement('span');
            keep.className = 'nw';
            before.replaceWith(keep);
            keep.append(before, word);
            return;
          }
          frag.append(word);
        });
        child.replaceWith(frag);
      });
    };
    walk(el);
    el.classList.add('is-split');
  };
  $$('[data-split]').forEach(split);

  /* ---------- entrada ao rolar ---------- */
  const revealEls = $$('[data-reveal], [data-split]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- parallax ---------- */
  const floats = $$('[data-parallax]').map((el) => ({
    el, speed: parseFloat(el.dataset.parallax), fromTop: el.classList.contains('hero__media'), cur: 0, on: false,
  }));
  const inners = $$('[data-parallax-in]').map((el) => ({ el, frame: el.closest('.frame'), on: false }));

  const updateParallax = () => {
    const vh = innerHeight;
    const k = isDesktop() ? 1 : 0.5;
    floats.forEach((it) => {
      if (!it.on) return;
      let y;
      if (it.fromTop) {
        y = scrollY * -it.speed * k;
      } else {
        const r = it.el.getBoundingClientRect();
        y = (r.top - it.cur + r.height / 2 - vh / 2) * it.speed * k;
      }
      it.cur = Math.max(-150, Math.min(150, y));
      it.el.style.setProperty('--py', `${it.cur.toFixed(1)}px`);
    });
    inners.forEach((it) => {
      if (!it.on) return;
      const r = it.frame.getBoundingClientRect();
      const p = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / ((vh + r.height) / 2)));
      it.el.style.translate = `0 ${(-p * r.height * 0.075).toFixed(1)}px`;
    });
  };

  if (!reduced && 'IntersectionObserver' in window) {
    const lookup = new Map();
    floats.forEach((it) => lookup.set(it.el, it));
    inners.forEach((it) => lookup.set(it.frame, it));
    const pio = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { lookup.get(entry.target).on = entry.isIntersecting; });
      updateParallax();
    }, { rootMargin: '25% 0px' });
    lookup.forEach((_, el) => pio.observe(el));
  }

  /* ---------- WhatsApp fixo ---------- */
  const waFloat = $('[data-wa-float]');
  const hero = $('.hero');
  let ctaInView = false;
  const updateWa = () => {
    waFloat.classList.toggle('is-visible', scrollY > hero.offsetHeight * 0.7 && !ctaInView);
  };
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => { ctaInView = entry.isIntersecting; updateWa(); })
      .observe($('.contact__cta'));
  }

  /* ---------- um único listener de scroll ---------- */
  let ticking = false;
  const onFrame = () => {
    ticking = false;
    onHeaderScroll();
    updateWa();
    if (!reduced) updateParallax();
  };
  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(onFrame); } };
  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', request);
  request();

  /* ---------- serviços ---------- */
  const panels = $$('[data-svc-panel]');
  const canHover = matchMedia('(hover: hover)').matches;
  const activate = (panel) => {
    panels.forEach((p) => {
      const on = p === panel;
      p.classList.toggle('is-active', on);
      $('button', p).setAttribute('aria-expanded', String(on));
    });
  };
  panels.forEach((panel) => {
    const btn = $('button', panel);
    if (canHover) panel.addEventListener('mouseenter', () => { if (isDesktop()) activate(panel); });
    btn.addEventListener('focus', () => { if (isDesktop()) activate(panel); });
    btn.addEventListener('click', () => {
      if (panel.classList.contains('is-active')) return;
      activate(panel);
      if (isDesktop()) return;
      // no celular o painel anterior fecha e empurra o conteúdo: realinha
      setTimeout(() => {
        const top = panel.getBoundingClientRect().top;
        if (top < 0 || top > innerHeight * 0.45) {
          scrollTo({ top: scrollY + top - 12, behavior: reduced ? 'auto' : 'smooth' });
        }
      }, 520);
    });
  });

  /* ---------- equipe ---------- */
  const TEAM = window.LUXO_TEAM || [];
  const PHOTOS = window.LUXO_TEAM_PHOTOS || {};
  const members = $$('[data-member]');
  const dataFor = (el) => TEAM.find((m) => m.id === el.dataset.member) || { id: el.dataset.member, name: $('.member__name', el).textContent };

  const teamPicture = (person, sizes) => {
    const widths = PHOTOS[person.id];
    if (!widths || !widths.length) return null;
    const set = (ext) => widths.map((w) => `assets/img/equipe/${person.id}-${w}.${ext} ${w}w`).join(', ');
    const pic = document.createElement('picture');
    pic.innerHTML =
      `<source type="image/avif" srcset="${set('avif')}" sizes="${sizes}">` +
      `<source type="image/webp" srcset="${set('webp')}" sizes="${sizes}">` +
      `<img src="assets/img/equipe/${person.id}-${widths[widths.length - 1]}.jpg" loading="lazy" decoding="async" alt="">`;
    $('img', pic).alt = `${person.name}, do Luxo Hair Beauty`;
    return pic;
  };

  members.forEach((el) => {
    const person = dataFor(el);
    const pic = teamPicture(person, '(max-width: 899px) 74vw, 22vw');
    if (pic) { $('.member__portrait', el).prepend(pic); el.classList.add('has-photo'); }
  });

  const profile = $('[data-profile]');
  if (profile && typeof profile.showModal === 'function') {
    const el = {
      media: $('[data-profile-media]', profile),
      letter: $('[data-profile-letter]', profile),
      num: $('[data-profile-num]', profile),
      name: $('[data-profile-name]', profile),
      role: $('[data-profile-role]', profile),
      bio: $('[data-profile-bio]', profile),
      spec: $('[data-profile-spec]', profile),
      wa: $('[data-profile-wa]', profile),
      waLabel: $('[data-profile-wa-label]', profile),
      ig: $('[data-profile-ig]', profile),
    };
    let current = 0;

    const fill = (i) => {
      current = (i + members.length) % members.length;
      const p = dataFor(members[current]);
      el.num.textContent = pad(current + 1);
      el.name.textContent = p.name;
      el.letter.textContent = p.name.charAt(0);
      el.role.textContent = p.role || '';
      el.role.hidden = !p.role;
      el.bio.textContent = p.bio ||
        `${p.name} integra a equipe do Luxo Hair Beauty, no Centro de Três Lagoas.\n` +
        `No Instagram do salão há um destaque só de ${p.name}. Para saber serviços e horários, fale com a gente pelo WhatsApp.`;
      const list = $('ul', el.spec);
      list.replaceChildren(...(p.specialties || []).map((s) => Object.assign(document.createElement('li'), { textContent: s })));
      el.spec.hidden = !list.children.length;
      el.wa.href = WA + encodeURIComponent(`Olá! Gostaria de agendar um horário com ${p.name} no Luxo Hair Beauty.`);
      el.waLabel.textContent = `Agendar com ${p.name}`;
      el.ig.href = p.instagram || 'https://www.instagram.com/luxohairbeauty/';
      $('picture', el.media)?.remove();
      const pic = teamPicture(p, '(max-width: 899px) 100vw, 40vw');
      if (pic) { $('img', pic).loading = 'eager'; el.media.prepend(pic); }
      el.letter.hidden = Boolean(pic);
    };

    const open = (i) => {
      fill(i);
      profile.showModal();
      lock('profile', true);
      requestAnimationFrame(() => requestAnimationFrame(() => profile.classList.add('is-open')));
    };
    const close = () => {
      profile.classList.remove('is-open');
      setTimeout(() => { profile.close(); lock('profile', false); }, reduced ? 0 : 620);
    };

    members.forEach((m, i) => {
      $('.member__card', m).setAttribute('aria-haspopup', 'dialog');
      $('.member__card', m).addEventListener('click', (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        open(i);
      });
    });
    fill(0);
    $('[data-profile-close]', profile).addEventListener('click', close);
    $('[data-profile-prev]', profile).addEventListener('click', () => fill(current - 1));
    $('[data-profile-next]', profile).addEventListener('click', () => fill(current + 1));
    profile.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
    profile.addEventListener('click', (e) => { if (e.target === profile) close(); });
  }

  /* ---------- galeria ampliada ---------- */
  const lightbox = $('[data-lightbox]');
  const shots = $$('[data-shot]');
  if (lightbox && shots.length && typeof lightbox.showModal === 'function') {
    const stage = $('[data-lightbox-stage]', lightbox);
    const caption = $('[data-lightbox-caption]', lightbox);
    const count = $('[data-lightbox-count]', lightbox);
    let current = 0;

    const show = (i) => {
      current = (i + shots.length) % shots.length;
      const shot = shots[current];
      const pic = $('picture', shot).cloneNode(true);
      const img = $('img', pic);
      const natural = img.getAttribute('width');
      // nunca amplia além da resolução real da foto
      const sizes = `min(92vw, ${natural}px)`;
      $$('source', pic).forEach((s) => { s.sizes = sizes; });
      img.loading = 'eager';
      img.removeAttribute('style');
      img.style.maxWidth = `min(100%, ${natural}px)`;
      const loaded = () => img.classList.add('is-loaded');
      img.addEventListener('load', loaded, { once: true });
      stage.replaceChildren(pic);
      if (img.complete && img.naturalWidth) requestAnimationFrame(loaded);
      caption.textContent = $('.shot__cap span', shot).textContent;
      count.textContent = `${pad(current + 1)} / ${pad(shots.length)}`;
    };

    const close = () => {
      lightbox.classList.remove('is-open');
      setTimeout(() => { lightbox.close(); lock('lightbox', false); stage.replaceChildren(); }, reduced ? 0 : 420);
    };

    shots.forEach((shot, i) => {
      shot.addEventListener('click', (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        show(i);
        lightbox.showModal();
        lock('lightbox', true);
        requestAnimationFrame(() => lightbox.classList.add('is-open'));
      });
    });
    $('[data-lightbox-close]', lightbox).addEventListener('click', close);
    $('[data-lightbox-prev]', lightbox).addEventListener('click', () => show(current - 1));
    $('[data-lightbox-next]', lightbox).addEventListener('click', () => show(current + 1));
    lightbox.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox || e.target.classList.contains('lightbox__figure') || e.target === stage) close();
    });
    lightbox.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') show(current - 1);
      if (e.key === 'ArrowRight') show(current + 1);
    });
    let startX = null;
    lightbox.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
    lightbox.addEventListener('touchend', (e) => {
      if (startX === null) return;
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 48) show(current + (dx < 0 ? 1 : -1));
      startX = null;
    });
  }

  /* ---------- números ---------- */
  const counters = $$('[data-count]');
  if (!reduced && 'IntersectionObserver' in window) {
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        cio.unobserve(entry.target);
        const el = entry.target;
        const end = parseFloat(el.dataset.count);
        const decimals = parseInt(el.dataset.decimals || '0', 10);
        const t0 = performance.now();
        const step = (t) => {
          const p = Math.min(1, (t - t0) / 1700);
          const eased = 1 - Math.pow(1 - p, 4);
          el.textContent = (end * eased).toFixed(decimals).replace('.', ',');
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.6 });
    counters.forEach((el) => cio.observe(el));
  }

  /* ---------- cursor com rótulo (desktop) ---------- */
  const cursor = $('[data-cursor-el]');
  if (cursor && !reduced && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const label = $('span', cursor);
    let x = -200, y = -200, tx = -200, ty = -200, raf = 0;
    const loop = () => {
      x += (tx - x) * 0.2;
      y += (ty - y) * 0.2;
      cursor.style.setProperty('--x', `${x.toFixed(1)}px`);
      cursor.style.setProperty('--y', `${y.toFixed(1)}px`);
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.3 ? requestAnimationFrame(loop) : 0;
    };
    addEventListener('mousemove', (e) => {
      tx = e.clientX; ty = e.clientY;
      if (!raf) raf = requestAnimationFrame(loop);
    }, { passive: true });
    $$('[data-cursor]').forEach((target) => {
      target.addEventListener('mouseenter', () => { label.textContent = target.dataset.cursor; cursor.classList.add('is-on'); });
      target.addEventListener('mouseleave', () => cursor.classList.remove('is-on'));
    });
  }
})();
