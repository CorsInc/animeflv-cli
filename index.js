#!/usr/bin/env node

const axios = require('axios');
const cheerio = require('cheerio');

const BASE = 'https://animeflv.net';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function extractVar($, varName) {
  const scripts = $('script').toArray();
  for (const el of scripts) {
    const text = $(el).html() || '';
    const match = text.match(new RegExp(`var\\s+${varName}\\s*=\\s*(\\[.+?\\])\\s*;`, 's'));
    if (match) {
      try { return JSON.parse(match[1].replace(/'/g, '"')); } catch { return null; }
    }
  }
  return null;
}

function extractVarRaw($, varName) {
  const scripts = $('script').toArray();
  for (const el of scripts) {
    const text = $(el).html() || '';
    const match = text.match(new RegExp(`var\\s+${varName}\\s*=\\s*(.+?)\\s*;`, 's'));
    if (match) return match[1].trim();
  }
  return null;
}

async function searchAnime(query) {
  const url = `${BASE}/api/suggestion?q=${encodeURIComponent(query)}`;
  const { data } = await axios.get(url, {
    headers: { 'User-Agent': UA, Referer: BASE, 'X-Requested-With': 'XMLHttpRequest' },
  });
  return Array.isArray(data) ? data : [];
}

async function getAnimeInfo(slug) {
  const url = `${BASE}/anime/${slug}`;
  const { data } = await axios.get(url, { headers: { 'User-Agent': UA } });
  const $ = cheerio.load(data);
  const title = $('h1.Title').text().trim() || $('h1').first().text().trim();
  const synopsis = $('div.Description p').text().trim();
  const genres = [];
  $('nav.Nvgnrs a').each((i, el) => genres.push($(el).text().trim()));
  const status = $('p.AnmStts').text().replace('Estado:', '').trim();
  const type = $('p.AnmTp').text().replace('Tipo:', '').trim();
  const cover = $('div.AnimeCover img').attr('src') || '';
  const episodesRaw = extractVar($, 'episodes');
  // episodes = [[num, id], ...] — URL usa el número secuencial
  const episodes = episodesRaw ? episodesRaw.map(e => ({ number: e[0], id: e[1] })) : [];
  const animeInfo = extractVar($, 'anime_info');
  const animeId = animeInfo ? animeInfo[0] : null;
  return { slug, animeId, title, synopsis, genres, status, type, cover, episodes };
}

async function getEpisodeLinks(slug, episodeNum) {
  const url = `${BASE}/ver/${slug}-${episodeNum}`;
  const { data } = await axios.get(url, { headers: { 'User-Agent': UA } });
  const $ = cheerio.load(data);
  const videosRaw = extractVarRaw($, 'videos');
  if (!videosRaw) return [];
  let videos;
  try { videos = JSON.parse(videosRaw.replace(/'/g, '"')); } catch { return []; }
  const result = [];
  for (const [lang, servers] of Object.entries(videos)) {
    for (const sv of servers) {
      result.push({ lang, server: sv.server, url: sv.url || sv.code || '', title: sv.title || '' });
    }
  }
  return result;
}

module.exports = { searchAnime, getAnimeInfo, getEpisodeLinks };

if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    const cmd = args[0];
    if (!cmd || cmd === '--help' || cmd === '-h') {
      console.log(`
Uso: node index.js <comando> [opciones]

Comandos:
  search <query>      Buscar anime
  info <slug>         Info de un anime + lista de episodios
  links <slug> <ep>   Links de streaming para un episodio
  all <slug>          Info + links de todos los episodios

Ejemplos:
  node index.js search "dragon ball"
  node index.js info dragon-ball-daima
  node index.js links dragon-ball-daima 1
`);
      return;
    }
    if (cmd === 'search') {
      const query = args.slice(1).join(' ');
      if (!query) { console.log('❌ Especifica una búsqueda'); return; }
      const results = await searchAnime(query);
      if (!results.length) { console.log('❌ Sin resultados'); return; }
      console.log(`\n🔍 Resultados para "${query}":\n`);
      results.forEach((r, i) => console.log(`  ${i+1}. ${r.title} (${r.type||'?'}) — /anime/${r.slug}`));
      return;
    }
    if (cmd === 'info') {
      const slug = args[1];
      if (!slug) { console.log('❌ Especifica un slug'); return; }
      const info = await getAnimeInfo(slug);
      console.log(`\n📺 ${info.title}`);
      console.log(`   Tipo: ${info.type} | Estado: ${info.status}`);
      if (info.genres.length) console.log(`   Géneros: ${info.genres.join(', ')}`);
      if (info.synopsis) console.log(`   Sinopsis: ${info.synopsis.slice(0,200)}...`);
      console.log(`   Episodios: ${info.episodes.length}`);
      info.episodes.slice(0,10).forEach(e => console.log(`     Ep. ${e.number} — /ver/${slug}-${e.number}`));
      return;
    }
    if (cmd === 'links') {
      const slug = args[1], ep = args[2];
      if (!slug || !ep) { console.log('❌ Uso: node index.js links <slug> <ep>'); return; }
      const links = await getEpisodeLinks(slug, ep);
      if (!links.length) { console.log('❌ No se encontraron links'); return; }
      console.log(`\n🔗 Links para ${slug} - Episodio ${ep}:\n`);
      links.forEach(l => console.log(`  [${l.lang}] ${l.server.toUpperCase()}: ${l.url}`));
      return;
    }
    if (cmd === 'all') {
      const slug = args[1];
      if (!slug) { console.log('❌ Especifica un slug'); return; }
      const info = await getAnimeInfo(slug);
      console.log(`\n📺 ${info.title} — ${info.episodes.length} episodios\n`);
      for (const ep of info.episodes) {
        try {
          const links = await getEpisodeLinks(slug, ep.number);
          console.log(`  Ep. ${ep.number}:`);
          if (links.length) links.forEach(l => console.log(`    [${l.lang}] ${l.server}: ${l.url}`));
          else console.log(`    ❌ Sin links`);
          await new Promise(r => setTimeout(r, 500));
        } catch (err) { console.log(`  Ep. ${ep.number}: ❌ Error — ${err.message}`); }
      }
      return;
    }
    console.log('❌ Comando desconocido. Usa --help.');
  })().catch(err => { console.error('❌ Error:', err.message); process.exit(1); });
}
