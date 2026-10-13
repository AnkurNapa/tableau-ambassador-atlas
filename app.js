/* Ambassador Atlas: one data file (data.js sets window.AMB), plain DOM and d3 for geometry. */
(() => {
  const ALL = window.AMB || [];
  const YEARS = [2024, 2025, 2026];
  const FAMILIES = ['Tableau', 'DataDev', 'CRM Analytics', 'Teaching', 'Student'];
  const FAM_VAR = { Tableau: '--s1', DataDev: '--s2', 'CRM Analytics': '--s3', Teaching: '--s4', Student: '--s5' };
  const PAGE = 48;
  const LINKS = [
    ['bio', 'Official bio'], ['li', 'LinkedIn'], ['tp', 'Tableau Public'], ['x', 'X'], ['gh', 'GitHub'],
    ['blog', 'Blog'], ['yt', 'YouTube'], ['pod', 'Podcast'], ['tb', 'Trailblazer'], ['sl', 'DataFam Slack'], ['fo', 'Forums'],
  ];

  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeUrl = (u) => (/^https?:\/\//i.test(u || '') ? u : '');
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const fmt = d3.format(',');
  const pct = d3.format('.0%');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Programme family: 2024 used branch names, 2025 onwards the five programmes.
  const family = (a) => {
    const d = a.d.split(' + ')[0];
    if (a.y !== 2024) return FAMILIES.includes(d) ? d : 'Tableau';
    if (d === 'Academic') return 'Teaching';
    if (d === 'CRM Analytics' || d === 'DataDev') return d;
    return 'Tableau';
  };
  const famColor = (f) => `var(${FAM_VAR[f]})`;
  const title = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\bAi\b/, 'AI').replace(/\bMcp\b/, 'MCP').replace(/\bCrm\b/, 'CRM').replace(/\bApis?\b/, (m) => m.toUpperCase());

  const yearsById = d3.rollup(ALL, (v) => new Set(v.map((a) => a.y)), (a) => a.id);
  ALL.forEach((a) => {
    a.fam = family(a);
    a.yrs = yearsById.get(a.id);
    a.back = a.y === 2024 ? null : a.yrs.has(a.y - 1);
    a.loc = [a.c, a.s && a.s !== a.c ? a.s : '', a.k].filter(Boolean).join(', ');
    a.hay = [a.n, a.d, a.loc, a.reg, a.t.join(' '), a.ug.map((g) => g.n).join(' '), a.lang.join(' '), a.b].join(' ').toLowerCase();
  });

  // State lives in the URL so a filtered view can be shared.
  const params = new URLSearchParams(location.search);
  const state = {
    year: YEARS.includes(+params.get('year')) ? +params.get('year') : 2026,
    q: params.get('q') || '', des: params.get('des') || '', reg: params.get('reg') || '',
    cty: params.get('cty') || '', lang: params.get('lang') || '', ret: params.get('ret') === '1', shown: PAGE,
  };
  const syncUrl = () => {
    const p = new URLSearchParams();
    if (state.year !== 2026) p.set('year', state.year);
    ['q', 'des', 'reg', 'cty', 'lang'].forEach((k) => state[k] && p.set(k, state[k]));
    if (state.ret) p.set('ret', '1');
    history.replaceState(null, '', p.toString() ? `?${p}` : location.pathname);
  };
  const yearRows = () => ALL.filter((a) => a.y === state.year);

  /* Tooltip */
  const tip = $('#tip');
  const showTip = (e, html) => {
    tip.innerHTML = html; tip.hidden = false;
    const x = Math.min(e.clientX + 14, innerWidth - tip.offsetWidth - 8);
    const y = e.clientY + 16 + tip.offsetHeight > innerHeight ? e.clientY - tip.offsetHeight - 12 : e.clientY + 16;
    tip.style.left = `${x}px`; tip.style.top = `${y}px`;
  };
  const hideTip = () => { tip.hidden = true; };
  const personTip = (a) => `<b>${esc(a.n)}</b><br>${esc(a.d)}${a.loc ? `<br>${esc(a.loc)}` : ''}${a.back ? '<br>Returning ambassador' : a.back === false ? '<br>First year' : ''}`;

  /* Horizontal bar list, used by several cards */
  function hbars(el, rows, { onClick, colorOf, max } = {}) {
    const m = max || d3.max(rows, (r) => r[1]) || 1;
    el.innerHTML = rows.map(([label, v, extra]) => `
      <button type="button" class="hb${colorOf ? ' dot' : ''}" ${onClick ? 'data-click' : 'tabindex="-1"'} data-k="${esc(label)}" ${colorOf ? `style="--c:${colorOf(label, extra)}"` : ''} aria-label="${esc(label)}: ${v}">
        <span class="l">${esc(label)}</span><span class="t"><span class="f" style="transform:scaleX(${v / m})"></span></span><span class="v">${fmt(v)}</span>
      </button>`).join('');
    if (onClick) el.querySelectorAll('[data-click]').forEach((b) => b.addEventListener('click', () => onClick(b.dataset.k)));
  }

  /* Year switch */
  function renderYearSeg() {
    const seg = $('#yearSeg');
    seg.innerHTML = YEARS.map((y) => `<button type="button" role="radio" aria-checked="${y === state.year}" data-y="${y}">${y}</button>`).join('');
    seg.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      state.year = +b.dataset.y; state.des = ''; state.cty = ''; state.lang = ''; state.reg = ''; state.shown = PAGE;
      if (state.year === 2024) state.ret = false;
      renderAll();
    }));
  }

  /* Hero */
  function renderHero() {
    const rows = yearRows();
    $('#heroYear').textContent = state.year;
    $('#heroCount').textContent = fmt(rows.length);
    const countries = new Set(rows.map((a) => a.k).filter(Boolean)).size;
    const langs = new Set(rows.flatMap((a) => a.lang)).size;
    const back = rows.filter((a) => a.back).length;
    const stats = [
      ['Countries', countries],
      langs ? ['Languages', langs] : ['Programmes', new Set(rows.map((a) => a.d)).size],
      state.year === 2024 ? ['Regions', new Set(rows.map((a) => a.reg).filter(Boolean)).size] : ['Came back', pct(back / rows.length)],
      state.year === 2024 ? ['With a bio', pct(rows.filter((a) => a.b).length / rows.length)] : ['Run a user group', fmt(rows.filter((a) => a.ug.length).length)],
    ];
    $('#stats').innerHTML = stats.map(([k, v]) => `<div><dt>${k}</dt><dd>${typeof v === 'number' ? fmt(v) : v}</dd></div>`).join('');
    renderConstellation(rows);
  }

  function renderConstellation(rows) {
    const svg = d3.select('#constellation');
    const STEP = 12.5, DOT = 4.6;
    const groups = FAMILIES.map((f) => {
      const people = rows.filter((a) => a.fam === f)
        .sort((a, b) => (b.back === true) - (a.back === true) || d3.ascending(a.n, b.n));
      return { f, people, r: STEP * Math.sqrt(people.length) + 26 };
    }).filter((g) => g.people.length);
    d3.packSiblings(groups);
    const [x0, x1] = d3.extent(groups.flatMap((g) => [g.x - g.r, g.x + g.r]));
    const [y0, y1] = d3.extent(groups.flatMap((g) => [g.y - g.r, g.y + g.r]));
    svg.attr('viewBox', `${x0 - 10} ${y0 - 10} ${x1 - x0 + 20} ${y1 - y0 + 20}`);

    const nodes = groups.flatMap((g) => g.people.map((a, i) => {
      const rad = STEP * Math.sqrt(i + 0.5), ang = i * 2.39996;
      return { a, g, x: g.x + rad * Math.cos(ang), y: g.y + rad * Math.sin(ang) };
    }));

    const dots = svg.selectAll('circle.dot').data(nodes, (d) => `${d.a.y}-${d.a.id}`);
    dots.exit().remove();
    const enter = dots.enter().append('circle').attr('class', 'dot').attr('r', 0)
      .attr('tabindex', 0).attr('role', 'button')
      .on('pointermove', (e, d) => showTip(e, personTip(d.a)))
      .on('pointerleave', hideTip)
      .on('click', (e, d) => openDrawer(d.a))
      .on('keydown', (e, d) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDrawer(d.a); } });
    enter.merge(dots)
      .attr('aria-label', (d) => `${d.a.n}, ${d.a.d}`)
      .attr('cx', (d) => d.x).attr('cy', (d) => d.y)
      .attr('fill', (d) => (d.a.back === false ? css('--card') : css(FAM_VAR[d.g.f])))
      .attr('stroke', (d) => css(FAM_VAR[d.g.f]))
      .attr('stroke-width', (d) => (d.a.back === false ? 1.8 : 0))
      .transition().duration(reduced ? 0 : 700).delay((d, i) => (reduced ? 0 : i * 1.6))
      .attr('r', (d) => (d.a.back === false ? DOT - 0.9 : DOT));

    const labels = svg.selectAll('g.glbl').data(groups, (g) => g.f);
    labels.exit().remove();
    const le = labels.enter().append('g').attr('class', 'glbl');
    le.append('text').attr('class', 'lbl').attr('text-anchor', 'middle');
    le.append('text').attr('class', 'lbl-n').attr('text-anchor', 'middle');
    const lm = le.merge(labels).raise();
    lm.select('.lbl').attr('x', (g) => g.x).attr('y', (g) => g.y + g.r - 6).text((g) => g.f);
    lm.select('.lbl-n').attr('x', (g) => g.x).attr('y', (g) => g.y + g.r + 9).text((g) => fmt(g.people.length));

    const ringNote = state.year === 2024 ? 'No 2023 data, so all solid' : 'New this year';
    $('#constCap').innerHTML = groups.map((g) => `<button type="button" data-f="${esc(g.f)}"><i style="background:${famColor(g.f)}"></i>${esc(g.f)}</button>`).join('')
      + `<span><i class="ring"></i> ${ringNote}</span>`;
    $('#constCap').querySelectorAll('button').forEach((b) => {
      b.addEventListener('pointerenter', () => { svg.classed('dim', true); svg.selectAll('.dot').classed('hot', (d) => d.g.f === b.dataset.f); });
      b.addEventListener('pointerleave', () => { svg.classed('dim', false); svg.selectAll('.dot').classed('hot', false); });
      b.addEventListener('click', () => { const des = [...new Set(yearRows().filter((a) => a.fam === b.dataset.f).map((a) => a.d))]; state.des = des.length === 1 ? des[0] : ''; state.q = state.des ? '' : b.dataset.f; goDirectory(); });
    });
  }

  /* Map: Leaflet on OpenStreetMap tiles, one pin per ambassador at their city,
     clustered until you zoom in. Same build as the Beverage-AI Radar map.
     Coordinates come from geo.json (tools/geocode.py); a city that would not
     resolve falls back to its country. */
  let GEO = {};
  const WORLD_VIEW = { center: [25, 10], zoom: 2 };
  async function loadGeo() {
    try { GEO = await (await fetch('geo.json')).json(); } catch (err) { console.error('geo.json failed to load', err); }
  }
  const coordOf = (a) => GEO[a.loc] || GEO[a.k] || null;
  const mapState = { map: null, cluster: null, markers: [], rowsKey: null, active: undefined };

  function pickCountry(k) {
    state.cty = k || ''; state.shown = PAGE;
    renderFilters(); renderDirectory();
  }

  function buildMap() {
    const el = $('#world');
    if (!window.L) { el.innerHTML = '<p class="note">The map could not load. The bars beside it show the same counts.</p>'; return null; }
    el.innerHTML = `<div class="lmap" role="region" aria-label="World map of ambassadors">
        <button class="wmap__back" type="button">&larr; Back to world</button></div>
      <div class="wmap__legend"><span class="wmap__keys"></span><span class="wmap__note"></span></div>`;
    const map = L.map(el.querySelector('.lmap'), { scrollWheelZoom: false, worldCopyJump: true }).setView(WORLD_VIEW.center, WORLD_VIEW.zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
    const cluster = L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 45, zoomToBoundsOnClick: false }).addTo(map);
    let wasHidden = true;
    new ResizeObserver(() => {
      map.invalidateSize();
      const hidden = !el.offsetWidth;
      if (wasHidden && !hidden) fitMap();
      wasHidden = hidden;
    }).observe(el);
    const back = el.querySelector('.wmap__back');
    L.DomEvent.disableClickPropagation(back);
    back.addEventListener('click', () => pickCountry(''));
    // A cluster that sits inside one country filters to it; a mixed one zooms in.
    cluster.on('clusterclick', (e) => {
      const keys = new Set(e.layer.getAllChildMarkers().map((mk) => mk._key));
      const only = keys.size === 1 ? [...keys][0] : null;
      if (only && only !== mapState.active) pickCountry(only);
      else e.layer.zoomToBounds({ padding: [30, 30] });
    });
    map.on('popupopen', (e) => {
      const btn = e.popup.getElement().querySelector('[data-bio]');
      const person = e.popup._source && e.popup._source._person;
      if (btn && person) btn.addEventListener('click', () => openDrawer(person));
    });
    return Object.assign(mapState, { map, cluster });
  }

  function fitMap() {
    const { map, markers, active } = mapState;
    if (!map) return;
    const pts = markers.filter((mk) => !active || mk._key === active).map((mk) => mk.getLatLng());
    if (pts.length) map.fitBounds(pts, { padding: [30, 30], maxZoom: active ? 9 : 3 });
    else map.setView(WORLD_VIEW.center, WORLD_VIEW.zoom);
  }

  function syncMap() {
    if (!mapState.map && !buildMap()) return;
    const el = $('#world');
    const rows = yearRows();
    const rowsKey = `${state.year}-${rows.length}`;
    if (rowsKey !== mapState.rowsKey) {
      mapState.rowsKey = rowsKey;
      mapState.cluster.clearLayers();
      mapState.markers = [];
      const cities = new Set();
      for (const a of rows) {
        const ll = coordOf(a);
        if (!a.k || !ll) continue;
        cities.add(a.loc);
        const mk = L.marker(ll, {
          title: a.n, alt: a.n, keyboard: true,
          icon: L.divIcon({ className: 'pin', html: `<span style="background:${famColor(a.fam)}"></span>`, iconSize: [14, 14] }),
        }).bindPopup(`<strong>${esc(a.n)}</strong><div class="pop__m">${esc(a.d)}${a.loc ? `<br>${esc(a.loc)}` : ''}</div>
          <button type="button" class="pop__b" data-bio>Read bio</button>`);
        mk._key = a.k; mk._person = a;
        mapState.markers.push(mk);
      }
      mapState.cluster.addLayers(mapState.markers);
      el.querySelector('.wmap__note').textContent = `${mapState.markers.length} of ${rows.length} ambassadors pinned, ${cities.size} places`;
      el.querySelector('.wmap__keys').innerHTML = FAMILIES.filter((f) => rows.some((a) => a.fam === f))
        .map((f) => `<span><i style="background:${famColor(f)}"></i>${esc(f)}</span>`).join('');
      mapState.active = undefined;
    }
    const active = state.cty || null;
    if (active !== mapState.active) {
      mapState.active = active;
      el.classList.toggle('is-zoomed', !!active);
      fitMap();
    }
  }

  function renderMap() {
    const rows = yearRows();
    const byCountry = d3.rollups(rows.filter((a) => a.k), (v) => v.length, (a) => a.k).sort((a, b) => b[1] - a[1]);
    $('#mapCountries').textContent = byCountry.length;
    hbars($('#regionBars'), d3.rollups(rows.filter((a) => a.reg), (v) => v.length, (a) => a.reg).sort((a, b) => b[1] - a[1]),
      { onClick: (k) => { state.reg = k; state.cty = ''; goDirectory(); } });
    hbars($('#countryBars'), byCountry.slice(0, 10), { onClick: (k) => { state.cty = k; goDirectory(); } });
    syncMap();
  }

  /* Patterns: flow between classes (fixed years, does not follow the year switch) */
  function renderFlow() {
    const ids = (y) => new Set(ALL.filter((a) => a.y === y).map((a) => a.id));
    const s = YEARS.map(ids);
    const rows = YEARS.map((y, i) => {
      const total = s[i].size;
      const back = i ? [...s[i]].filter((id) => s[i - 1].has(id)).length : null;
      const left = i < 2 ? [...s[i]].filter((id) => !s[i + 1].has(id)).length : null;
      return { y, total, back, fresh: back === null ? null : total - back, left };
    });
    const all3 = [...s[2]].filter((id) => s[0].has(id) && s[1].has(id)).length;
    $('#flowNote').textContent = `${rows[2].back} of the ${rows[1].total} ambassadors from 2025 came back in 2026 (${pct(rows[2].back / rows[1].total)}). ${all3} people have been in all three classes.`;

    const W = 760, rowH = 46, top = 22, H = top + rows.length * rowH + 10, L = 54, R = 120;
    const x = d3.scaleLinear().domain([0, d3.max(rows, (d) => d.total)]).range([0, W - L - R]);
    const svg = d3.select('#flow').attr('viewBox', `0 0 ${W} ${H}`);
    svg.selectAll('*').remove();
    const cBack = css('--s1'), cNew = css('--s3'), cUnk = css('--ink-3');
    [['Came back from the year before', cBack], ['New that year', cNew]].forEach(([t, c], i) => {
      const gx = L + i * 230;
      svg.append('rect').attr('x', gx).attr('y', 2).attr('width', 10).attr('height', 10).attr('rx', 2).attr('fill', c);
      svg.append('text').attr('class', 'dl2').attr('x', gx + 16).attr('y', 11).text(t);
    });
    rows.forEach((d, i) => {
      const y = top + i * rowH + 8, h = 22;
      svg.append('text').attr('class', 'dl').attr('x', 0).attr('y', y + h / 2 + 4).text(d.y);
      const segs = d.back === null ? [[d.total, cUnk, 'No 2023 data to compare']] : [[d.back, cBack, 'came back'], [d.fresh, cNew, 'new']];
      let x0 = L;
      segs.forEach(([v, c, label], j) => {
        const w = x(v) - (j < segs.length - 1 ? 2 : 0);
        svg.append('rect').attr('x', x0).attr('y', y).attr('width', Math.max(0, w)).attr('height', h)
          .attr('rx', 4).attr('fill', c)
          .on('pointermove', (e) => showTip(e, `<b>${d.y}</b><br>${fmt(v)} ${label}`)).on('pointerleave', hideTip);
        if (w > 40) svg.append('text').attr('x', x0 + 8).attr('y', y + h / 2 + 4).attr('fill', '#fff').attr('font-size', 12).attr('font-weight', 600).text(fmt(v));
        x0 += x(v);
      });
      svg.append('text').attr('class', 'dl2').attr('x', x0 + 8).attr('y', y + h / 2 + 4)
        .text(`${fmt(d.total)} total${d.left !== null ? `, ${d.left} left after` : ''}`);
    });
  }

  /* Patterns: slope chart by region (fixed years) */
  function renderSlope() {
    const regions = [...new Set(ALL.map((a) => a.reg).filter(Boolean))];
    const data = regions.map((r) => ({ r, v: YEARS.map((y) => ALL.filter((a) => a.y === y && a.reg === r).length) }))
      .sort((a, b) => b.v[2] - a.v[2]);
    const W = 380, H = 330, L = 30, R = 128, T = 18, B = 40;
    const x = d3.scalePoint().domain(YEARS).range([L, W - R]);
    const y = d3.scaleLinear().domain([0, d3.max(data, (d) => d3.max(d.v))]).nice().range([H - B, T]);
    const svg = d3.select('#slope').attr('viewBox', `0 0 ${W} ${H}`);
    svg.selectAll('*').remove();
    YEARS.forEach((yr) => {
      svg.append('line').attr('class', 'gridl').attr('x1', x(yr)).attr('x2', x(yr)).attr('y1', T - 6).attr('y2', H - B);
      svg.append('text').attr('class', 'ax').attr('x', x(yr)).attr('y', H - 4).attr('text-anchor', 'middle').text(yr);
    });
    const line = d3.line().x((v, i) => x(YEARS[i])).y((v) => y(v));
    const ink = css('--ink-3'), hi = css('--s1');
    // Dodge right-hand labels so small regions do not collide.
    const lab = data.map((d) => ({ d, y: y(d.v[2]) })).sort((a, b) => a.y - b.y);
    for (let k = 1; k < lab.length; k++) if (lab[k].y - lab[k - 1].y < 14) lab[k].y = lab[k - 1].y + 14;
    const gs = svg.selectAll('g.reg').data(data).join('g').attr('class', 'reg');
    gs.append('path').attr('d', (d) => line(d.v)).attr('fill', 'none').attr('stroke', ink).attr('stroke-width', 2);
    gs.selectAll('circle').data((d) => d.v.map((v, i) => ({ v, i, d }))).join('circle')
      .attr('cx', (p) => x(YEARS[p.i])).attr('cy', (p) => y(p.v)).attr('r', 4).attr('fill', ink)
      .attr('stroke', css('--card')).attr('stroke-width', 2);
    gs.append('text').attr('class', 'dl2').attr('x', W - R + 10).attr('y', (d) => lab.find((l) => l.d === d).y + 4)
      .text((d) => `${d.r} ${d.v[2]}`);
    gs.append('path').attr('d', (d) => line(d.v)).attr('fill', 'none').attr('stroke', 'transparent').attr('stroke-width', 16)
      .style('cursor', 'pointer')
      .on('pointermove', function (e, d) {
        gs.select('path').attr('stroke', (o) => (o === d ? hi : ink)).attr('stroke-width', (o) => (o === d ? 3 : 2)).attr('opacity', (o) => (o === d ? 1 : 0.35));
        gs.selectAll('circle').attr('fill', (p) => (p.d === d ? hi : ink)).attr('stroke', css('--card'));
        showTip(e, `<b>${esc(d.r)}</b><br>${YEARS.map((yr, i) => `${yr}: ${d.v[i]}`).join('<br>')}`);
      })
      .on('pointerleave', () => {
        gs.select('path').attr('stroke', ink).attr('stroke-width', 2).attr('opacity', 1);
        gs.selectAll('circle').attr('fill', ink);
        hideTip();
      })
      .on('click', (e, d) => { state.reg = d.r; state.cty = ''; goDirectory(); });
  }

  /* Patterns that follow the year switch */
  function renderYearPatterns() {
    const rows = yearRows();
    document.querySelectorAll('.yr').forEach((el) => { el.textContent = state.year; });
    const mix = d3.rollups(rows, (v) => ({ n: v.length, fam: v[0].fam }), (a) => a.d).sort((a, b) => b[1].n - a[1].n);
    $('#mixNote').textContent = state.year === 2024 ? '2024 grouped people by branch. Colour matches the closest programme today.' : 'Colour matches the constellation above.';
    hbars($('#mixBars'), mix.map(([k, o]) => [k, o.n, o.fam]), {
      colorOf: (k, fam) => famColor(fam), onClick: (k) => { state.des = k; goDirectory(); },
    });

    const langs = d3.rollups(rows.flatMap((a) => a.lang), (v) => v.length, (l) => l).sort((a, b) => b[1] - a[1]);
    const multi = rows.filter((a) => a.lang.length > 1).length;
    $('#langNote').textContent = langs.length ? `${langs.length} languages. ${multi} ambassadors speak more than one.` : 'Languages were not collected for the 2024 class.';
    hbars($('#langBars'), langs.slice(0, 10), { onClick: (k) => { state.lang = k; goDirectory(); } });

    const topics = d3.rollups(rows.flatMap((a) => a.t.map((t) => t.toLowerCase().trim())), (v) => v.length, (t) => t)
      .sort((a, b) => b[1] - a[1]).slice(0, 10).map(([t, n]) => [title(t), n]);
    if (!topics.length) $('#topicBars').innerHTML = '<p class="note">Topics were not collected for the 2024 class.</p>';
    else hbars($('#topicBars'), topics, { onClick: (k) => { state.q = k; goDirectory(); } });
  }

  /* Directory */
  function fillSelect(el, label, rows, key, value) {
    const opts = d3.rollups(rows.flatMap(key).filter(Boolean), (v) => v.length, (d) => d).sort((a, b) => d3.ascending(a[0], b[0]));
    el.innerHTML = `<option value="">${label}</option>` + opts.map(([k, n]) => `<option value="${esc(k)}">${esc(k)} (${n})</option>`).join('');
    el.value = opts.some(([k]) => k === value) ? value : '';
    el.setAttribute('aria-label', label);
  }
  function renderFilters() {
    const rows = yearRows();
    fillSelect($('#fDes'), 'All programmes', rows, (a) => [a.d], state.des);
    fillSelect($('#fReg'), 'All regions', rows, (a) => [a.reg], state.reg);
    fillSelect($('#fCty'), 'All countries', rows, (a) => [a.k], state.cty);
    fillSelect($('#fLang'), 'All languages', rows, (a) => a.lang, state.lang);
    $('#fLang').disabled = state.year === 2024;
    $('#fRet').disabled = state.year === 2024;
    $('#fRet').checked = state.ret;
    $('#q').value = state.q;
  }
  const filtered = () => {
    const q = state.q.toLowerCase().trim();
    return yearRows().filter((a) => (!state.des || a.d === state.des) && (!state.reg || a.reg === state.reg)
      && (!state.cty || a.k === state.cty) && (!state.lang || a.lang.includes(state.lang))
      && (!state.ret || a.back) && (!q || a.hay.includes(q)))
      .sort((a, b) => d3.ascending(a.n, b.n));
  };
  const initials = (n) => n.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const photo = (a, cls = 'ph') => (safeUrl(a.img)
    ? `<img class="${cls}" src="${esc(a.img)}" alt="" loading="lazy" decoding="async" width="56" height="56" referrerpolicy="no-referrer" data-ini="${esc(initials(a.n))}">`
    : `<span class="${cls} ini" aria-hidden="true">${esc(initials(a.n))}</span>`);
  const yearBadges = (a) => !a.yrs.size ? '' : `<span class="yrs" aria-label="Classes: ${[...a.yrs].sort().join(', ')}">${YEARS.map((y) => `<span class="${a.yrs.has(y) ? 'on' : ''}">${String(y).slice(2)}</span>`).join('')}</span>`;

  function renderDirectory() {
    const rows = filtered();
    const bits = [state.des, state.reg, state.cty, state.lang, state.ret && 'returning', state.q && `"${state.q}"`].filter(Boolean);
    $('#count').textContent = `${fmt(rows.length)} of ${fmt(yearRows().length)} ambassadors in ${state.year}${bits.length ? `, filtered by ${bits.join(', ')}` : ''}.`;
    const show = rows.slice(0, state.shown);
    $('#grid').innerHTML = show.map((a, i) => `<li><button type="button" class="person" data-i="${i}" style="--c:${famColor(a.fam)}">
        ${photo(a)}<span><span class="pn">${esc(a.n)}</span><span class="pm">${esc(a.d)}${a.loc ? `<br>${esc(a.loc)}` : ''}</span>${yearBadges(a)}</span>
      </button></li>`).join('') || '<li class="note">Nobody matches. Try clearing a filter.</li>';
    $('#grid').querySelectorAll('.person').forEach((b) => b.addEventListener('click', () => openDrawer(show[+b.dataset.i])));
    $('#moreBtn').hidden = rows.length <= state.shown;
    $('#moreBtn').textContent = `Show more (${fmt(rows.length - state.shown)} left)`;
    syncMap();
    syncUrl();
  }
  function goDirectory() {
    state.shown = PAGE;
    renderFilters(); renderDirectory();
    $('#directory').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  }

  /* Visionaries: one person per entry, linked to their ambassador record by name key. */
  const VIS = window.VIS || { cohorts: [], people: [], y2026: { named: [] } };
  const VIS_BY_ID = new Map(VIS.people.map((v) => [v.id, v]));
  const latestAmb = new Map();
  ALL.forEach((a) => { if (!latestAmb.has(a.id) || latestAmb.get(a.id).y < a.y) latestAmb.set(a.id, a); });
  const visState = { q: '', which: 'all' };
  const shortYear = (y) => (y.length === 4 ? `'${y.slice(2)}` : `'16/17`);

  // A Visionary opened in the drawer: their ambassador record if they have one, else a bare card.
  function visPerson(v) {
    const amb = latestAmb.get(v.id);
    if (amb) return amb;
    return { n: v.n, id: v.id, d: v.hof ? 'Tableau Visionary, Hall of Fame' : 'Tableau Visionary', fam: 'Tableau', loc: '', b: '', t: [], lang: [], ug: [], L: v.L, yrs: new Set(), img: '' };
  }
  const visSection = (a) => {
    const v = VIS_BY_ID.get(a.id);
    if (!v) return '';
    return `<p class="d-sec">Tableau Visionary</p><div class="chips">${v.y.map((y) => `<span>${esc(y)}</span>`).join('')}${v.hof ? '<span class="hof">Hall of Fame</span>' : ''}</div>`;
  };

  function renderVisStats() {
    const P = VIS.people;
    const in25 = P.filter((v) => v.y.includes('2025'));
    const amb26 = P.filter((v) => ALL.some((a) => a.y === 2026 && a.id === v.id)).length;
    $('#visCount').textContent = P.length;
    $('#visStats').innerHTML = [['2025 class', in25.length], ['Hall of Fame', P.filter((v) => v.hof).length], ['Five classes or more', P.filter((v) => v.y.length >= 5).length], ['Also 2026 ambassadors', amb26]]
      .map(([k, v]) => `<div><dt>${k}</dt><dd>${fmt(v)}</dd></div>`).join('');
  }

  // The loom: columns are people (ordered by first class, then length of run), rows are class years.
  function renderLoom() {
    const C = VIS.cohorts, P = VIS.people;
    const cw = 7.4, rh = 15, L = 54, T = 8, R = 40;
    const W = L + P.length * cw + R, H = T + C.length * rh + 8;
    const svg = d3.select('#loom').attr('viewBox', `0 0 ${W} ${H}`);
    svg.selectAll('*').remove();
    const cNew = css('--s3'), cBack = css('--s1'), cHof = css('--s2');
    C.forEach((c, i) => {
      const y = T + i * rh + rh / 2;
      svg.append('line').attr('class', 'thread').attr('x1', L - 4).attr('x2', W - R + 4).attr('y1', y).attr('y2', y);
      svg.append('text').attr('class', 'ax').attr('x', L - 10).attr('y', y + 4).attr('text-anchor', 'end').text(c);
      svg.append('text').attr('class', 'dl').attr('x', W - R + 10).attr('y', y + 4).text(P.filter((v) => v.y.includes(c)).length);
    });
    const cols = svg.selectAll('g.col').data(P).join('g').attr('class', 'col')
      .attr('transform', (v, i) => `translate(${L + i * cw},0)`)
      .attr('tabindex', 0).attr('role', 'button')
      .attr('aria-label', (v) => `${v.n}: ${v.y.join(', ')}${v.hof ? ', Hall of Fame' : ''}`)
      .on('pointermove', (e, v) => showTip(e, `<b>${esc(v.n)}</b><br>${v.y.length} class${v.y.length > 1 ? 'es' : ''}: ${v.y.map(shortYear).join(' ')}${v.hof ? '<br>Hall of Fame' : ''}`))
      .on('pointerleave', hideTip)
      .on('click', (e, v) => openDrawer(visPerson(v)))
      .on('keydown', (e, v) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDrawer(visPerson(v)); } });
    cols.append('rect').attr('class', 'hit').attr('x', -1).attr('y', T - 2).attr('width', cw).attr('height', C.length * rh + 4).attr('rx', 3);
    cols.each(function (v) {
      const g = d3.select(this);
      const rows = v.y.map((y) => C.indexOf(y)).sort((a, b) => a - b);
      // A run of consecutive classes is joined by a thin stem.
      for (let k = 1; k < rows.length; k++) {
        if (rows[k] === rows[k - 1] + 1) g.append('line').attr('x1', cw / 2 - 1).attr('x2', cw / 2 - 1)
          .attr('y1', T + rows[k - 1] * rh + rh / 2).attr('y2', T + rows[k] * rh + rh / 2)
          .attr('stroke', v.hof ? cHof : cBack).attr('stroke-width', 2).attr('opacity', 0.55);
      }
      rows.forEach((r, k) => g.append('circle').attr('cx', cw / 2 - 1).attr('cy', T + r * rh + rh / 2).attr('r', 3)
        .attr('fill', v.hof ? cHof : k === 0 ? cNew : cBack));
    });
    $('#loomLegend').innerHTML = `<span><i style="background:${cNew}"></i>First class</span><span><i style="background:${cBack}"></i>Returning</span><span><i style="background:${cHof}"></i>Hall of Fame member</span>`;
  }

  function renderVisBars() {
    const C = VIS.cohorts, P = VIS.people;
    const data = C.map((c) => {
      const inC = P.filter((v) => v.y.includes(c));
      const fresh = inC.filter((v) => v.y[0] === c).length;
      return { c, total: inC.length, fresh, back: inC.length - fresh };
    });
    const W = 760, H = 230, L = 28, B = 26, T = 22;
    const x = d3.scaleBand().domain(C).range([L, W]).padding(0.28);
    const y = d3.scaleLinear().domain([0, d3.max(data, (d) => d.total)]).nice().range([H - B, T]);
    const svg = d3.select('#visBars').attr('viewBox', `0 0 ${W} ${H}`);
    svg.selectAll('*').remove();
    y.ticks(4).forEach((t) => {
      svg.append('line').attr('class', 'gridl').attr('x1', L).attr('x2', W).attr('y1', y(t)).attr('y2', y(t));
      svg.append('text').attr('class', 'ax').attr('x', L - 6).attr('y', y(t) + 4).attr('text-anchor', 'end').text(t);
    });
    const cBack = css('--s1'), cNew = css('--s3');
    [['Returning', cBack], ['New that year', cNew]].forEach(([t, c], i) => {
      svg.append('rect').attr('x', L + i * 130).attr('y', 0).attr('width', 10).attr('height', 10).attr('rx', 2).attr('fill', c);
      svg.append('text').attr('class', 'dl2').attr('x', L + i * 130 + 16).attr('y', 9).text(t);
    });
    data.forEach((d) => {
      const tip = (e) => showTip(e, `<b>${d.c}</b><br>${d.total} Visionaries<br>${d.back} returning, ${d.fresh} new`);
      const g = svg.append('g').on('pointermove', tip).on('pointerleave', hideTip);
      g.append('rect').attr('x', x(d.c)).attr('width', x.bandwidth()).attr('y', y(d.back)).attr('height', y(0) - y(d.back)).attr('fill', cBack).attr('rx', 2);
      g.append('rect').attr('x', x(d.c)).attr('width', x.bandwidth()).attr('y', y(d.total)).attr('height', Math.max(0, y(d.back) - y(d.total) - 2)).attr('fill', cNew).attr('rx', 3);
      svg.append('text').attr('class', 'dl').attr('x', x(d.c) + x.bandwidth() / 2).attr('y', y(d.total) - 5).attr('text-anchor', 'middle').text(d.total);
      svg.append('text').attr('class', 'ax').attr('x', x(d.c) + x.bandwidth() / 2).attr('y', H - 8).attr('text-anchor', 'middle').text(shortYear(d.c));
    });
  }

  function renderVis26() {
    const n = VIS.y2026 || { named: [] };
    $('#vis26Note').textContent = `Tableau announced ${n.announced} Visionaries for 2026 on 18 March 2026. These ${n.named.length} are named in the announcement; the full list is on tableau.com.`;
    const key = (name) => { const t = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z ]/g, '').split(/\s+/).filter(Boolean); return `${t[0]}-${t[t.length - 1]}`; };
    $('#vis26').innerHTML = n.named.map((name) => `<button type="button" data-k="${esc(key(name))}" data-n="${esc(name)}">${esc(name)}</button>`).join('')
      + (n.source ? `<a href="${esc(n.source)}" target="_blank" rel="noopener noreferrer">Full announcement</a>` : '');
    $('#vis26').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      const v = VIS_BY_ID.get(b.dataset.k);
      const amb = latestAmb.get(b.dataset.k);
      openDrawer(amb || (v ? visPerson(v) : { n: b.dataset.n, id: b.dataset.k, d: '2026 Tableau Visionary', fam: 'Tableau', loc: '', b: '', t: [], lang: [], ug: [], L: {}, yrs: new Set(), img: '' }));
    }));
    const runs = d3.rollups(VIS.people.filter((v) => !v.y.includes('2025')), (g) => g.length, (v) => v.y.length).sort((a, b) => a[0] - b[0]);
    hbars($('#visLong'), runs.map(([k, n]) => [`${k} class${k > 1 ? 'es' : ''}`, n]));
  }

  function renderVisGrid() {
    $('#visSeg').innerHTML = [['all', 'All'], ['2025', '2025 class'], ['hof', 'Hall of Fame']]
      .map(([k, l]) => `<button type="button" role="radio" aria-checked="${visState.which === k}" data-k="${k}">${l}</button>`).join('');
    $('#visSeg').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { visState.which = b.dataset.k; renderVisGrid(); }));
    const q = visState.q.toLowerCase().trim();
    const rows = VIS.people.filter((v) => (visState.which === 'all' || (visState.which === 'hof' ? v.hof : v.y.includes('2025')))
      && (!q || v.n.toLowerCase().includes(q))).sort((a, b) => d3.ascending(a.n, b.n));
    $('#visGrid').innerHTML = rows.map((v, i) => {
      const p = visPerson(v);
      return `<li><button type="button" class="person" data-i="${i}" style="--c:${v.hof ? 'var(--s2)' : 'var(--s1)'}">${photo(p)}<span><span class="pn">${esc(v.n)}</span>
        <span class="pm">${v.y.length > 1 ? `${v.y.length} classes, ${esc(v.y[0])} to ${esc(v.y[v.y.length - 1])}` : `${esc(v.y[0])} only`}</span>
        <span class="yrs">${v.hof ? '<span class="hof">HOF</span>' : ''}${p.yrs.size ? '<span class="on">Ambassador</span>' : ''}</span></span></button></li>`;
    }).join('') || '<li class="note">Nobody matches.</li>';
    $('#visGrid').querySelectorAll('.person').forEach((b) => b.addEventListener('click', () => openDrawer(visPerson(rows[+b.dataset.i]))));
  }
  $('#vq').addEventListener('input', (e) => { visState.q = e.target.value; renderVisGrid(); });

  function renderVisionaries() { renderVisStats(); renderLoom(); renderVisBars(); renderVis26(); renderVisGrid(); }

  /* Bio drawer */
  const drawer = $('#drawer');
  function openDrawer(a) {
    hideTip();
    const links = LINKS.filter(([k]) => safeUrl(a.L[k])).map(([k, label]) => `<a href="${esc(a.L[k])}" target="_blank" rel="noopener noreferrer">${label}</a>`).join('');
    const groups = a.ug.map((g) => (safeUrl(g.u) ? `<a href="${esc(g.u)}" target="_blank" rel="noopener noreferrer">${esc(g.n)}</a>` : `<span>${esc(g.n)}</span>`)).join('');
    $('#dBody').innerHTML = `
      <div class="d-head" style="--c:${famColor(a.fam)}">${photo(a)}<div><h2 id="dName">${esc(a.n)}</h2>
        <div class="d-role">${esc(a.d)}${a.loc ? `<br>${esc(a.loc)}` : ''}</div>${yearBadges(a)}</div></div>
      ${a.b ? `<p class="d-bio">${esc(a.b)}</p>` : '<p class="note">No bio shared yet.</p>'}
      ${a.t.length ? `<p class="d-sec">Talk to me about</p><div class="chips">${a.t.map((t) => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
      ${a.lang.length ? `<p class="d-sec">Languages</p><div class="chips">${a.lang.map((t) => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
      ${visSection(a)}
      ${groups ? `<p class="d-sec">User groups</p><div class="chips">${groups}</div>` : ''}
      ${links ? `<p class="d-sec">Find them</p><div class="chips">${links}</div>` : ''}`;
    if (!drawer.open) drawer.showModal();
    drawer.scrollTop = 0;
  }
  $('#dClose').addEventListener('click', () => drawer.close());
  drawer.addEventListener('click', (e) => { if (e.target === drawer) drawer.close(); });
  // Broken photos fall back to initials.
  document.addEventListener('error', (e) => {
    const img = e.target;
    if (img.tagName === 'IMG' && img.dataset.ini) {
      const s = document.createElement('span');
      s.className = `${img.className} ini`; s.textContent = img.dataset.ini; s.setAttribute('aria-hidden', 'true');
      img.replaceWith(s);
    }
  }, true);

  /* Wiring */
  let qTimer;
  $('#q').addEventListener('input', (e) => { clearTimeout(qTimer); qTimer = setTimeout(() => { state.q = e.target.value; state.shown = PAGE; renderDirectory(); }, 150); });
  [['#fDes', 'des'], ['#fReg', 'reg'], ['#fCty', 'cty'], ['#fLang', 'lang']].forEach(([sel, k]) =>
    $(sel).addEventListener('change', (e) => { state[k] = e.target.value; state.shown = PAGE; renderDirectory(); }));
  $('#fRet').addEventListener('change', (e) => { state.ret = e.target.checked; state.shown = PAGE; renderDirectory(); });
  $('#clearBtn').addEventListener('click', () => { Object.assign(state, { q: '', des: '', reg: '', cty: '', lang: '', ret: false, shown: PAGE }); renderFilters(); renderDirectory(); });
  $('#moreBtn').addEventListener('click', () => { state.shown += PAGE; renderDirectory(); });
  $('#themeBtn').addEventListener('click', () => {
    const dark = document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('atlas-theme', document.documentElement.dataset.theme); } catch (e) { /* storage blocked: theme still applies for this visit */ }
    renderAll();
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', renderAll);

  function renderAll() {
    renderYearSeg(); renderHero(); renderMap(); renderFlow(); renderSlope(); renderYearPatterns(); renderFilters(); renderDirectory(); renderVisionaries();
  }
  renderAll();
  loadGeo().then(() => { mapState.rowsKey = null; syncMap(); });
})();
