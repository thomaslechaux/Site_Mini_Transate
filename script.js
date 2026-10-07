(() => {
  'use strict';
  const header = document.getElementById('site-header');
  const nav = document.getElementById('main-nav');
  const toggle = document.querySelector('.menu-toggle');
  const progress = document.querySelector('.scroll-progress');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let frameRequested = false;

  function setMenu(open) {
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('open', open);
    toggle.querySelector('.menu-label').textContent = open ? 'Fermer' : 'Menu';
  }
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', event => { if (event.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { setMenu(false); toggle.focus(); }
  });
  document.addEventListener('click', event => { if (!header.contains(event.target)) setMenu(false); });
  window.matchMedia('(min-width: 901px)').addEventListener('change', event => { if (event.matches) setMenu(false); });

  const anchors = [...nav.querySelectorAll('a[href^="#"]')];
  const sections = [...document.querySelectorAll('main > section[id]')];
  function updateScroll() {
    header.classList.toggle('scrolled', window.scrollY > 40);
    const total = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = `${total > 0 ? Math.min(100, window.scrollY / total * 100) : 0}%`;
    const edge = header.offsetHeight + 150;
    let current = 'accueil';
    for (const section of sections) { if (section.getBoundingClientRect().top <= edge) current = section.id; }
    for (const link of anchors) {
      if (link.hash === `#${current}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
    frameRequested = false;
  }
  window.addEventListener('scroll', () => { if (!frameRequested) { frameRequested = true; requestAnimationFrame(updateScroll); } }, { passive: true });
  window.addEventListener('resize', updateScroll);
  updateScroll();

  // Offer buttons select a subject; they never send a message.
  document.querySelectorAll('[data-offer]').forEach(link => {
    link.addEventListener('click', () => {
      document.getElementById('contact-subject').value = link.dataset.offer;
      document.getElementById('contact-name').focus({ preventScroll: true });
    });
  });

  const form = document.getElementById('contact-form');
  const status = document.getElementById('form-status');
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const values = new FormData(form);
    const name = String(values.get('name')).trim();
    const company = String(values.get('company')).trim();
    const email = String(values.get('email')).trim();
    const subject = `MTREIZ — ${String(values.get('subject'))}`;
    const body = `Bonjour Mathieu et Thomas,\n\n${String(values.get('message')).trim()}\n\n${name}${company ? '\n' + company : ''}\n${email}`;
    const url = `mailto:mtreiz.mini@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    // A mailto handoff cannot confirm sending; retain all fields for recovery.
    status.textContent = 'Le brouillon est prêt à être ouvert dans votre messagerie. Si rien ne s’ouvre, écrivez directement à mtreiz.mini@gmail.com ; votre texte reste disponible ci-dessus.';
    window.location.href = url;
  });

  const dialog = document.getElementById('gallery-dialog');
  const galleryButtons = [...document.querySelectorAll('[data-gallery]')];
  const galleryImage = document.getElementById('gallery-image');
  const caption = document.getElementById('gallery-caption');
  const count = document.getElementById('gallery-count');
  let active = 0;
  let lastTrigger = null;
  function displayPhoto(index) {
    active = (index + galleryButtons.length) % galleryButtons.length;
    const source = galleryButtons[active].querySelector('img');
    galleryImage.src = source.src;
    galleryImage.alt = source.alt;
    caption.textContent = source.alt;
    count.textContent = `${String(active + 1).padStart(2, '0')} / ${String(galleryButtons.length).padStart(2, '0')}`;
  }
  galleryButtons.forEach((button, index) => button.addEventListener('click', () => {
    lastTrigger = button;
    displayPhoto(index);
    dialog.showModal();
    document.body.classList.add('modal-open');
  }));
  dialog.querySelector('.lightbox-close').addEventListener('click', () => dialog.close());
  dialog.querySelector('.lightbox-prev').addEventListener('click', () => displayPhoto(active - 1));
  dialog.querySelector('.lightbox-next').addEventListener('click', () => displayPhoto(active + 1));
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); displayPhoto(active - 1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); displayPhoto(active + 1); }
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('modal-open');
    lastTrigger?.focus({ preventScroll: true });
  });
})();

// Diaporama d'accueil : quatre images, changement toutes les cinq secondes.
(() => {
  const hero = document.querySelector('.hero');
  const track = document.querySelector('.hero-track');
  const controls = document.querySelector('.hero-carousel-controls');
  if (!track || !controls) return;
  const slides = [...track.children];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0, timer = null, visible = true;
  controls.hidden = false;
  function show(index) {
    current = (index + slides.length) % slides.length;
    slides[current].loading = 'eager';
    track.style.transform = `translateX(-${current * 100}%)`;
  }
  function schedule() {
    clearInterval(timer);
    timer = null;
    if (!motion.matches && visible && !document.hidden) {
      timer = setInterval(() => show(current + 1), 5000);
    }
  }
  controls.querySelector('.hero-prev').addEventListener('click', () => { show(current - 1); schedule(); });
  controls.querySelector('.hero-next').addEventListener('click', () => { show(current + 1); schedule(); });
  document.addEventListener('visibilitychange', schedule);
  motion.addEventListener('change', schedule);
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; schedule(); }).observe(hero);
  show(0); schedule();
})();

// Biographies : ouverture au survol, au clic et au clavier.
document.querySelectorAll('.team-card').forEach(card => {
  const button = card.querySelector('.bio-toggle');
  if (!button) return;
  card.classList.add('bio-ready');
  let pinned = false, hovered = false;
  function render() {
    const open = pinned || hovered;
    card.classList.toggle('bio-open', open);
    button.setAttribute('aria-expanded', String(open));
    button.textContent = open ? 'Réduire' : 'Lire la suite';
    const name = card.querySelector('h3').textContent;
    button.setAttribute('aria-label', `${open ? 'Réduire' : 'Lire la suite de'} la présentation de ${name}`);
  }
  card.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') { hovered = true; render(); } });
  card.addEventListener('pointerleave', () => { hovered = false; render(); });
  button.addEventListener('click', () => { pinned = !(pinned || hovered); hovered = false; render(); });
});

// Inline disclosure of the analysis illustration, without leaving the page.
document.querySelectorAll('.analysis-toggle').forEach(button => {
  const panel = document.getElementById(button.getAttribute('aria-controls'));
  if (!panel) return;
  button.addEventListener('click', () => {
    const expanded = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(expanded));
    panel.hidden = !expanded;
    if (expanded) panel.querySelector('img').loading = 'eager';
  });
});

// One-shot route animation, with manual stages and reduced-motion support.
(() => {
  const section = document.querySelector('.ocean-journey');
  if (!section) return;
  const paths = [...section.querySelectorAll('.journey-line')];
  const lengths = paths.map(path => path.getTotalLength());
  const boat = section.querySelector('#journey-boat');
  const progress = section.querySelector('.journey-progress>span');
  const caption = section.querySelector('.journey-caption');
  const stages = [...section.querySelectorAll('[data-journey-stage]')];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0, elapsed = 0, previous = 0, running = false, visible = false, started = false, phase = '';
  paths.forEach((path, i) => { path.style.strokeDasharray = lengths[i]; });
  // A faceted sailing model. Its waterline axis, not the mast, defines the heading.
  const model = boat.querySelector('[data-boat="model"]');
  const faces = [];
  let modelLayer = 0;
  function face(points, color) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    node.setAttribute('fill', color);
    node.setAttribute('stroke', color);
    node.setAttribute('stroke-width', '.35');
    model.append(node);
    faces.push({ points, node, layer: modelLayer });
  }
  // Mini scow proportions: a broad rounded bow and full beam.
  const outline = [[31,0,0],[30.5,-5,0],[29,-9,0],[26,-12,0],[21,-13.5,0],[9,-14,0],[-9,-14,0],[-26,-12.5,0],[-28,-10,0],[-28,10,0],[-26,12.5,0],[-9,14,0],[9,14,0],[21,13.5,0],[26,12,0],[29,9,0],[30.5,5,0]];
  for (let i=0; i<outline.length; i++) {
    const a=outline[i], b=outline[(i+1)%outline.length];
    face([[a[0],a[1]*.88,0],[b[0],b[1]*.88,0],[b[0],b[1],7],[a[0],a[1],7]],'#061d32');
    face([[a[0],a[1],6],[b[0],b[1],6],[b[0],b[1],7],[a[0],a[1],7]],'#ee7038');
  }
  modelLayer = 1;
  face(outline.map(([x,y])=>[x,y,7]), '#dce5e9');
  modelLayer = 2;
  face(outline.map(([x,y])=>[x*.96,y*.89,7.2]), '#061d32');
  modelLayer = 3;
  face([[-25,-9,7],[-6,-9,7],[-6,9,7],[-25,9,7]], '#061d32');
  face([[-24,-7,7],[-8,-7,7],[-8,7,7],[-24,7,7]], '#ee7038');
  face([[-6,-8,7],[12,-7,7],[10,-5,12],[-4,-6,12]], '#ee7038');
  face([[-6,8,7],[12,7,7],[10,5,12],[-4,6,12]], '#ee7038');
  face([[-4,-6,12],[10,-5,12],[10,5,12],[-4,6,12]], '#ee7038');
  face([[0,-4,12.2],[7,-4,12.2],[7,4,12.2],[0,4,12.2]], '#061d32');
  // Fine bowsprit ahead of the round bow distinguishes the direction of travel.
  face([[27,-.7,7],[39,-.7,7],[39,.7,7],[27,.7,7]], '#061d32');
  // Cockpit seats, companionway and deck hatches remain visible.
  face([[-24,-10,7.5],[-7,-10,7.5],[-7,-7.5,8.5],[-24,-7.5,8.5]], '#dce5e9');
  face([[-24,10,7.5],[-7,10,7.5],[-7,7.5,8.5],[-24,7.5,8.5]], '#dce5e9');
  face([[-6,-4,7],[-6,4,7],[-6,4,11],[-6,-4,11]], '#061d32');
  face([[17,-3,7.5],[23,-3,7.5],[23,3,7.5],[17,3,7.5]], '#ee7038');
  modelLayer = 4;
  // Square-top mainsail: straight luff, curved leech and a single boom plane.
  const leech = [[0,29],[.2,29],[.4,26.5],[.6,23],[.8,18],[.94,12],[1,10]];
  const sailPoint = (u,v) => {
    const hi = leech.findIndex(([height])=>height>=u);
    const [u0,w0] = leech[Math.max(0,hi-1)], [u1,w1] = leech[Math.max(0,hi)];
    const width = u1===u0 ? w1 : w0+(w1-w0)*(u-u0)/(u1-u0);
    const chord = width*v;
    return [3-chord*.93, -chord*.37-1.6*Math.sin(Math.PI*v)*Math.sin(Math.PI*u), 14+65*u];
  };
  const levels=[0,.16,.23,.3,.42,.56,.7,.82,.94,1];
  for(let row=0;row<levels.length-1;row++) for(let col=0;col<6;col++) {
    const u=levels[row], top=levels[row+1], v=col/6;
    const color = row === 1 ? '#ee7038' : '#061d32';
    face([sailPoint(u,v),sailPoint(u,v+1/6),sailPoint(top,v+1/6),sailPoint(top,v)],color);
  }
  // Full-length battens follow the sail surface, with a pale reinforcement at the head.
  for(const height of [.16,.42,.63,.82,.94]) for(let col=0;col<6;col++) {
    const v=col/6;
    face([sailPoint(height,v),sailPoint(height,v+1/6),sailPoint(height+.004,v+1/6),sailPoint(height+.004,v)],'#93a8b6');
  }
  face([sailPoint(.991,0),sailPoint(.991,1),sailPoint(1,1),sailPoint(1,0)],'#dce5e9');
  face([[3,0,13],[-24,-10.7,13],[-24,-10.7,14.2],[3,0,14.2]],'#061d32');
  face([[5,0,72],[34,0,8],[9,24,14]],'#ee7038');
  face([[5,0,72],[9,24,14],[8,17,36]],'#ee7038');
  face([[5,0,72],[34,0,8],[23,10,23]],'#ee7038');
  face([[2.5,0,7],[3.5,0,7],[3.5,0,80],[2.5,0,80]],'#e7edf0');
  function orientBoat(angle) {
    const c=Math.cos(angle), s=Math.sin(angle);
    const project=([x,y,z=0])=>[1.05*(x*c-y*s), 1.05*(x*s+y*c-z*.7)];
    const point=p=>project(p).map(v=>v.toFixed(2)).join(',');
    // Paint distant facets first so the hull and sails remain a volume as it turns.
    const depth=points=>points.reduce((sum,[x,y,z])=>sum+(x*s+y*c)*.82+z,0)/points.length;
    faces.sort((a,b)=>a.layer-b.layer || depth(a.points)-depth(b.points)).forEach(({points,node})=>{
      node.setAttribute('points',points.map(point).join(' ')); model.append(node);
    });
    boat.dataset.heading=String(angle);
  }
  function draw(first, second, message, stage) {
    paths[0].style.strokeDashoffset = lengths[0] * (1 - first);
    paths[1].style.strokeDashoffset = lengths[1] * (1 - second);
    const leg = second > 0 ? 1 : 0;
    const point = paths[leg].getPointAtLength(lengths[leg] * (leg ? second : first));
    boat.setAttribute('transform', `translate(${point.x} ${point.y})`);
    const distance = lengths[leg] * (leg ? second : first);
    const before = paths[leg].getPointAtLength(Math.max(0, distance - .25));
    const after = paths[leg].getPointAtLength(Math.min(lengths[leg], distance + .25));
    orientBoat(Math.atan2(after.y - before.y, after.x - before.x));
    progress.style.transform = `scaleX(${(1350 * first + 2800 * second) / 4150})`;
    if (phase !== message) { caption.textContent = message; phase = message; }
    stages.forEach((button, i) => button.setAttribute('aria-pressed', String(i + 1 === stage)));
  }
  function stop() { running = false; cancelAnimationFrame(frame); previous = 0; }
  function tick(now) {
    if (!running || !visible || document.hidden) { previous = 0; return; }
    if (previous) elapsed += Math.min(now - previous, 100);
    previous = now;
    if (elapsed < 4500) draw(elapsed / 4500, 0, 'Quitter La Rochelle, franchir le cap Finisterre et rejoindre les Canaries.', 1);
    else if (elapsed < 6200) draw(1, 0, 'Escale à Las Palmas de Gran Canaria. Un nouveau départ se prépare.', 1);
    else if (elapsed < 14000) draw(1, (elapsed - 6200) / 7800, 'Cap sur le Brésil : traverser le Pot au Noir, puis franchir l’équateur.', 2);
    else { draw(1, 1, 'Salvador de Bahia. L’Atlantique est derrière nous.', 2); stop(); return; }
    frame = requestAnimationFrame(tick);
  }
  function play() {
    stop(); started = true; elapsed = 0;
    if (motion.matches) { draw(1, 1, 'De La Rochelle à Salvador de Bahia, avec une escale aux Canaries.', 2); return; }
    draw(0, 0, 'Départ de La Rochelle. La traversée commence.', 1);
    running = true; frame = requestAnimationFrame(tick);
  }
  section.querySelector('.journey-replay').addEventListener('click', play);
  const disclosure = section.closest('.route-disclosure');
  disclosure?.addEventListener('toggle', () => {
    if (disclosure.open) play();
    else { stop(); visible = false; }
  });
  stages.forEach((button, i) => button.addEventListener('click', () => {
    stop(); started = true;
    draw(1, i, i ? '2 800 milles des Canaries à Salvador de Bahia, au-delà de l’équateur.' : '1 350 milles de La Rochelle à Las Palmas de Gran Canaria.', i + 1);
  }));
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible && !started) play();
    else if (visible && running) { previous = 0; cancelAnimationFrame(frame); frame = requestAnimationFrame(tick); }
    else if (!visible) { cancelAnimationFrame(frame); previous = 0; }
  }, {threshold:.2}).observe(section);
  document.addEventListener('visibilitychange', () => { previous = 0; cancelAnimationFrame(frame); if (!document.hidden && running && visible) frame = requestAnimationFrame(tick); });
  motion.addEventListener('change', () => { if (motion.matches) { stop(); draw(1, 1, 'De La Rochelle à Salvador de Bahia, avec une escale aux Canaries.', 2); } });
  if (motion.matches) draw(1, 1, 'De La Rochelle à Salvador de Bahia, avec une escale aux Canaries.', 2);
  else draw(0, 0, 'Deux étapes, des Canaries jusqu’au Brésil.', 0);
})();
