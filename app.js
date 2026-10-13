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

  /* Map */
  let world = null;
  const NAME_FIX = { 'United States': 'United States of America' };
  const CENTRE = { 'United States': [-98.5, 39.5], France: [2.4, 46.6], Norway: [9, 61.5], Singapore: [103.8, 1.35], Canada: [-100, 56], Malaysia: [102, 4] };
  async function loadWorld() {
    try {
      const topo = await d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json');
      world = topojson.feature(topo, topo.objects.countries).features.filter((f) => f.properties.name !== 'Antarctica');
    } catch (err) {
      console.error('World map failed to load', err);
      $('#world').outerHTML = '<p class="note">The map could not load. The bars beside it show the same counts.</p>';
    }
  }
  function renderMap() {
    const rows = yearRows();
    const byCountry = d3.rollups(rows.filter((a) => a.k), (v) => v, (a) => a.k).sort((a, b) => b[1].length - a[1].length);
    $('#mapCountries').textContent = byCountry.length;
    hbars($('#regionBars'), d3.rollups(rows.filter((a) => a.reg), (v) => v.length, (a) => a.reg).sort((a, b) => b[1] - a[1]),
      { onClick: (k) => { state.reg = k; state.cty = ''; goDirectory(); } });
    hbars($('#countryBars'), byCountry.slice(0, 10).map(([k, v]) => [k, v.length]),
      { onClick: (k) => { state.cty = k; goDirectory(); } });
    if (!world) return;

    const W = 960, H = 470;
    const proj = d3.geoNaturalEarth1().fitExtent([[6, 6], [W - 6, H - 6]], { type: 'FeatureCollection', features: world });
    const path = d3.geoPath(proj);
    const svg = d3.select('#world').attr('viewBox', `0 0 ${W} ${H}`);
    const byName = new Map(world.map((f) => [f.properties.name, f]));
    const has = new Set(byCountry.map(([k]) => NAME_FIX[k] || k));
    svg.selectAll('path.land').data(world).join('path').attr('class', 'land').attr('d', path)
      .classed('on', (f) => has.has(f.properties.name));

    const r = d3.scaleSqrt().domain([0, d3.max(byCountry, (d) => d[1].length)]).range([0, 34]);
    const bubbles = byCountry.map(([k, people]) => {
      const f = byName.get(NAME_FIX[k] || k);
      const ll = CENTRE[k] || (f && d3.geoCentroid(f));
      if (!ll) return null;
      const [x, y] = proj(ll);
      const cities = d3.rollups(people.filter((a) => a.c), (v) => v.length, (a) => a.c).sort((a, b) => b[1] - a[1]).slice(0, 3);
      return { k, n: people.length, x, y, r: Math.max(3.5, r(people.length)), cities };
    }).filter(Boolean).sort((a, b) => b.n - a.n);

    const g = svg.selectAll('g.bubs').data([0]).join('g').attr('class', 'bubs');
    g.selectAll('circle.bub').data(bubbles, (d) => d.k).join('circle').attr('class', 'bub')
      .attr('tabindex', 0).attr('role', 'button')
      .attr('aria-label', (d) => `${d.k}: ${d.n} ambassadors`)
      .classed('sel', (d) => d.k === state.cty)
      .attr('cx', (d) => d.x).attr('cy', (d) => d.y)
      .on('pointermove', (e, d) => showTip(e, `<b>${esc(d.k)}</b><br>${d.n} ambassador${d.n > 1 ? 's' : ''}${d.cities.length ? `<br>${d.cities.map(([c, n]) => `${esc(c)} ${n}`).join(', ')}` : ''}`))
      .on('pointerleave', hideTip)
      .on('click', (e, d) => { state.cty = d.k; goDirectory(); })
      .on('keydown', (e, d) => { if (e.key === 'Enter') { state.cty = d.k; goDirectory(); } })
      .transition().duration(reduced ? 0 : 600).attr('r', (d) => d.r);
    g.selectAll('text.blbl').data(bubbles.filter((d) => d.r >= 11), (d) => d.k).join('text').attr('class', 'blbl')
      .attr('x', (d) => d.x).attr('y', (d) => d.y).text((d) => d.n);
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
  const yearBadges = (a) => `<span class="yrs" aria-label="Classes: ${[...a.yrs].sort().join(', ')}">${YEARS.map((y) => `<span class="${a.yrs.has(y) ? 'on' : ''}">${String(y).slice(2)}</span>`).join('')}</span>`;

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
    $('#world') && d3.selectAll('#world .bub').classed('sel', (d) => d.k === state.cty);
    syncUrl();
  }
  function goDirectory() {
    state.shown = PAGE;
    renderFilters(); renderDirectory();
    $('#directory').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  }

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
    renderYearSeg(); renderHero(); renderMap(); renderFlow(); renderSlope(); renderYearPatterns(); renderFilters(); renderDirectory();
  }
  renderAll();
  loadWorld().then(renderMap);
})();
