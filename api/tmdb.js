// Vercel Serverless Function: proxy لـ TMDB عشان التوكن مايظهرش في المتصفح.
// التوكن بيتخزّن في Vercel كـ Environment Variable باسم TMDB_TOKEN.

const ALLOWED = [
  /^\/trending\/movie\/(day|week)$/,
  /^\/movie\/(popular|top_rated|now_playing)$/,
  /^\/movie\/\d+$/,
  /^\/search\/movie$/,
  /^\/discover\/movie$/,
  /^\/genre\/movie\/list$/,
];

module.exports = async function handler(req, res) {
  const token = process.env.TMDB_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'TMDB_TOKEN is not configured' });
  }

  const { path, ...rest } = req.query;
  const target = Array.isArray(path) ? path[0] : path;

  // نسمح بمسارات الأفلام بس
  if (!target || !ALLOWED.some((rule) => rule.test(target))) {
    return res.status(400).json({ error: 'Unsupported path' });
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(rest)) {
    const v = Array.isArray(value) ? value[0] : value;
    if (v !== undefined) params.set(key, String(v));
  }

  try {
    const upstream = await fetch(`https://api.themoviedb.org/3${target}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}`, accept: 'application/json' },
    });

    const body = await upstream.text();
    res.setHeader('Content-Type', 'application/json');
    // كاش 5 دقايق على Vercel عشان الموقع يبقى أسرع ونقلّل الطلبات على TMDB
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(upstream.status).send(body);
  } catch {
    return res.status(502).json({ error: 'Failed to reach TMDB' });
  }
};
