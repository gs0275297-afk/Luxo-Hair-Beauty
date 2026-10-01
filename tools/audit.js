/*
  Auditoria de layout no navegador (ferramenta de QA — não vai para o ar).

  Com o site aberto em http://localhost:4173, rode no console:
      (await import('/tools/audit.js')).default()

  Confere, no tamanho de tela atual: rolagem horizontal, textos cortados,
  áreas de toque pequenas, fontes minúsculas e fotos exibidas acima da
  resolução real do arquivo.
*/
export default async function audit() {
  document.querySelectorAll('[data-reveal],[data-split]').forEach((el) => el.classList.add('is-in'));
  document.querySelectorAll('img').forEach((img) => { img.loading = 'eager'; });
  await new Promise((r) => setTimeout(r, 3600)); // espera animações de entrada e imagens

  const vw = innerWidth;
  const vh = innerHeight;
  const dpr = devicePixelRatio;
  const visible = (el) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0;
  };
  const name = (el) => {
    const cls = typeof el.className === 'string' && el.className ? `.${el.className.split(' ')[0]}` : '';
    return `${el.tagName.toLowerCase()}${cls} "${(el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 24)}"`;
  };
  const clippedByAncestor = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const o = getComputedStyle(p).overflowX;
      if (o === 'hidden' || o === 'clip' || o === 'auto' || o === 'scroll') return true;
    }
    return false;
  };

  const out = { vw, vh, dpr, pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };

  out.offscreen = [...document.querySelectorAll('header *, main *, footer *')]
    .filter((el) => visible(el) && !el.closest('dialog, .menu') && !clippedByAncestor(el))
    .filter((el) => { const r = el.getBoundingClientRect(); return r.right > vw + 1 || r.left < -1; })
    .slice(0, 8).map(name);

  out.clippedText = [...document.querySelectorAll('.display, .footer__mark, .highlights__big, .member__name, .svc__title, .btn, .eyebrow, .link-arrow, .rating, .location__address')]
    .filter((el) => visible(el) && el.scrollWidth > el.clientWidth + 2)
    .map((el) => `${name(el)} ${el.scrollWidth}>${el.clientWidth}`);

  if (vw < 900) {
    out.smallTapTargets = [...document.querySelectorAll('a, button')]
      .filter((el) => visible(el) && !el.closest('dialog, .menu'))
      .filter((el) => {
        // a área clicável pode ser ampliada por um pseudo-elemento esticado
        const after = getComputedStyle(el, '::after');
        if (after.position === 'absolute' && after.content !== 'none' && parseFloat(after.height) >= 44) return false;
        const r = el.getBoundingClientRect();
        return r.height < 44 || r.width < 44;
      })
      .map((el) => { const r = el.getBoundingClientRect(); return `${name(el)} ${Math.round(r.width)}x${Math.round(r.height)}`; });
  }

  out.tinyText = [...new Set([...document.querySelectorAll('header *, main *, footer *')]
    .filter((el) => visible(el) && !el.closest('[aria-hidden="true"]') && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))
    .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 10.4)
    .map((el) => `${name(el)} ${parseFloat(getComputedStyle(el).fontSize).toFixed(1)}px`))];

  // fotos: largura que a imagem ocupa de fato (object-fit: cover) x largura real do arquivo
  out.images = [...document.querySelectorAll('img')].filter(visible).map((img) => {
    const r = img.getBoundingClientRect();
    const aspect = Number(img.getAttribute('width')) / Number(img.getAttribute('height'));
    const shown = Math.max(img.offsetWidth, img.offsetHeight * aspect);
    const file = img.currentSrc.split('/').pop();
    const fileW = Number((file.match(/-(\d+)\.\w+$/) || [])[1]);
    const largest = Number(img.getAttribute('width'));
    return {
      file,
      shownCssPx: Math.round(shown),
      chosenVsNeed: +(fileW / (shown * dpr)).toFixed(2),        // < 1: o navegador escolheu um arquivo pequeno
      bestAt1x: +(largest / shown).toFixed(2),                   // < 1: ampliada mesmo em tela comum
      bestAt2x: +(largest / (shown * 2)).toFixed(2),
      inView: r.top < vh && r.bottom > 0,
    };
  });
  out.imagesUpscaledAt1x = out.images.filter((i) => i.bestAt1x < 1).map((i) => `${i.file} ${i.bestAt1x}`);
  out.imagesPoorPick = out.images.filter((i) => i.chosenVsNeed < 0.85 && i.bestAt1x * (1 / dpr) > i.chosenVsNeed + 0.05).map((i) => `${i.file} ${i.chosenVsNeed}`);

  const cta = document.querySelector('.hero__actions .btn');
  out.heroCtaVisibleOnLoad = cta.getBoundingClientRect().bottom + scrollY <= vh;
  out.heroHeight = document.querySelector('.hero').offsetHeight;
  delete out.images;
  return out;
}
