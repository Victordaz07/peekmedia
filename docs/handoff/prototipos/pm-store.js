(function () {
  const KEY = 'pm-content-v2', CKEY = 'pm-clients-v1', SKEY = 'pm-settings-v1';
  const Q = '[Qué incluye]';
  const defaults = {
    whatsapp: '',
    website: '[Sitio web]',
    instagram: 'peekmedia.rd',
    followers: '[Seguidores]',
    postsCount: '[Publicaciones]',
    heroText: 'Ideas que encuentran a su gente. Marketing digital desde Santo Domingo, con estrategia y cercanía.',
    aboutText: 'Peek Media es una agencia de marketing digital en Santo Domingo, liderada por Dagoberto Nuñez. Dagoberto tiene más de 5 años de experiencia en marketing digital y campañas publicitarias en República Dominicana, y hoy también es director de marketing de una inmobiliaria en RD.',
    aboutPhoto: '',
    caseText: 'Dagoberto Nuñez dirige el marketing de una inmobiliaria en República Dominicana. Desde ahí aplica lo mismo que ofrece Peek Media: estrategia, contenido y campañas pensadas para resultados.',
    casePhoto: '',
    caseMetrics: [
      { value: '[Resultado / métrica verificada]', label: 'Estrategia' },
      { value: '[Resultado / métrica verificada]', label: 'Contenido' },
      { value: '[Resultado / métrica verificada]', label: 'Resultados' }
    ],
    plans: [
      { name: 'Plan Básico', desc: 'Para empezar a tener presencia constante en redes.', price: 'Desde RD$ 12,000 / mes', items: [Q, Q, Q], featured: false },
      { name: 'Plan Estratégico', desc: 'Estrategia, contenido y campañas trabajando juntos.', price: 'Desde RD$ 25,000 / mes', items: [Q, Q, Q], featured: true },
      { name: 'Auditoría de Redes', desc: 'Revisamos tus redes y te decimos qué mejorar.', price: 'Desde RD$ 6,500', items: [Q, Q, Q], featured: false }
    ],
    process: [
      { title: 'Diagnóstico', desc: 'Revisamos tu marca, tus redes y a tu competencia.' },
      { title: 'Estrategia', desc: 'Definimos a quién le hablamos, qué decimos y dónde.' },
      { title: 'Contenido', desc: 'Creamos y publicamos piezas pensadas para tu gente.' },
      { title: 'Medición', desc: 'Revisamos los números y ajustamos lo que haga falta.' }
    ],
    posts: [
      { title: 'Te queremos ayudar: apoya negocios locales', tag: 'Comunidad', image: '', url: '' },
      { title: 'Un regalo para el emprendedor', tag: 'Tips', image: '', url: '' },
      { title: 'Adivina la red social', tag: 'Juego', image: '', url: '' },
      { title: 'Debí publicar más', tag: 'Humor', image: '', url: '' },
      { title: 'El cliente dice: haz que se haga viral', tag: 'Humor', image: '', url: '' },
      { title: 'No te imagines una empanada con lentes', tag: 'Creatividad', image: '', url: '' }
    ],
    clientLogos: [
      { name: '[Logo cliente]', image: '' }, { name: '[Logo cliente]', image: '' }, { name: '[Logo cliente]', image: '' },
      { name: '[Logo cliente]', image: '' }, { name: '[Logo cliente]', image: '' }
    ],
    testimonials: [
      { quote: '[Espacio para testimonio real de un cliente]', name: '[Nombre]', business: '[Negocio]' },
      { quote: '[Espacio para testimonio real de un cliente]', name: '[Nombre]', business: '[Negocio]' },
      { quote: '[Espacio para testimonio real de un cliente]', name: '[Nombre]', business: '[Negocio]' }
    ],
    faq: [
      { q: '¿Cuánto tiempo toma ver resultados?', a: '[Respuesta]' },
      { q: '¿Necesito firmar un contrato largo?', a: '[Respuesta]' },
      { q: '¿Trabajan con negocios fuera de Santo Domingo?', a: '[Respuesta]' },
      { q: '¿La inversión en anuncios está incluida en el plan?', a: '[Respuesta]' },
      { q: '¿Qué necesito para empezar?', a: '[Respuesta]' }
    ],
    quoteServices: [
      { name: 'Manejo de redes sociales', desc: 'Publicación y comunidad en tus cuentas.', price: '10000', unit: 'mensual' },
      { name: 'Diseño de posts y carruseles', desc: 'Piezas gráficas para tu feed.', price: '6000', unit: 'mensual' },
      { name: 'Reels y video corto', desc: 'Guion, edición y publicación.', price: '8000', unit: 'mensual' },
      { name: 'Campañas en Meta Ads', desc: 'Facebook e Instagram. La inversión en anuncios va aparte.', price: '7000', unit: 'mensual' },
      { name: 'Reporte mensual de métricas', desc: 'Qué funcionó y qué ajustar.', price: '2500', unit: 'mensual' },
      { name: 'Auditoría de redes', desc: 'Diagnóstico completo de tus cuentas.', price: '6500', unit: 'único' },
      { name: 'Estrategia de contenido', desc: 'Pilares, tono y calendario.', price: '9000', unit: 'único' },
      { name: 'Identidad visual', desc: 'Logo, colores y tipografía.', price: '15000', unit: 'único' },
      { name: 'Sesión de fotos o video', desc: 'Producción para tu marca.', price: '8000', unit: 'único' }
    ]
  };
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const read = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const write = (k, v) => { localStorage.setItem(k, JSON.stringify(v)); window.dispatchEvent(new Event('pm-change')); };

  function load() { const s = read(KEY); return s ? Object.assign(clone(defaults), s) : clone(defaults); }
  function save(c) { write(KEY, c); }
  function reset() { localStorage.removeItem(KEY); window.dispatchEvent(new Event('pm-change')); }
  function loadClients() { return read(CKEY) || []; }
  function saveClients(list) { write(CKEY, list); }
  function loadSettings() { return Object.assign({ pin: '', apiVersion: 'v21.0', defaultToken: '' }, read(SKEY) || {}); }
  function saveSettings(s) { write(SKEY, s); }
  function waLink(num, msg) {
    const n = String(num || '').replace(/\D/g, '');
    return 'https://wa.me/' + n + (msg ? '?text=' + encodeURIComponent(msg) : '');
  }
  function parsePrice(p) {
    const n = parseFloat(String(p || '').replace(/[^\d.]/g, ''));
    return isNaN(n) ? null : n;
  }
  function money(n) { return 'RD$ ' + Number(n).toLocaleString('es-DO', { maximumFractionDigits: 2 }); }

  async function graph(path, params, token, ver) {
    const u = new URL('https://graph.facebook.com/' + (ver || 'v21.0') + '/' + path);
    Object.entries(params || {}).forEach(([k, v]) => u.searchParams.set(k, v));
    u.searchParams.set('access_token', token);
    const r = await fetch(u.toString());
    const j = await r.json();
    if (j.error) throw new Error(j.error.message);
    return j;
  }

  async function syncClient(cl, settings) {
    const token = cl.token || settings.defaultToken;
    if (!token) throw new Error('Falta el access token de Meta (en el cliente o en Ajustes).');
    if (!cl.igId && !cl.adAccount) throw new Error('Agrega el ID de Instagram Business o la cuenta publicitaria.');
    const ver = settings.apiVersion || 'v21.0';
    const out = { date: new Date().toISOString() };
    if (cl.igId) {
      out.profile = await graph(cl.igId, { fields: 'username,followers_count,media_count' }, token, ver);
      const until = Math.floor(Date.now() / 1000), since = until - 29 * 86400;
      try {
        const ins = await graph(cl.igId + '/insights', { metric: 'reach,accounts_engaged,total_interactions,profile_views', period: 'day', metric_type: 'total_value', since, until }, token, ver);
        out.insights = {};
        (ins.data || []).forEach((m) => { out.insights[m.name] = m.total_value ? m.total_value.value : null; });
      } catch (e) { out.insightsError = e.message; }
      try {
        const media = await graph(cl.igId + '/media', { fields: 'caption,media_type,timestamp,like_count,comments_count,permalink', limit: 12 }, token, ver);
        out.media = media.data || [];
      } catch (e) { out.mediaError = e.message; }
    }
    if (cl.adAccount) {
      try {
        const id = 'act_' + String(cl.adAccount).replace(/^act_/, '');
        const a = await graph(id + '/insights', { fields: 'spend,impressions,reach,clicks,ctr,cpc', date_preset: 'last_30d' }, token, ver);
        out.ads = (a.data && a.data[0]) || {};
      } catch (e) { out.adsError = e.message; }
    }
    return out;
  }

  window.PMStore = { defaults, load, save, reset, loadClients, saveClients, loadSettings, saveSettings, waLink, parsePrice, money, syncClient };
})();
