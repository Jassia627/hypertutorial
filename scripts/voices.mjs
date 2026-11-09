// The 3 most natural-sounding voices a provider offers for a language, for the setup menu.
// Each entry: { label, voice, route } where route is "provider/model" for Speko's explicit routing.

const FALLBACK = {
  speko: [
    { label: 'Johan · masculina, colombiana (ElevenLabs v3)', voice: '4uvQjLPvqApx1dVzpNfM', route: 'elevenlabs/eleven_v3_conversational' },
    { label: 'Carito · femenina, latinoamericana, cálida (ElevenLabs v3)', voice: 'NNuHMQa2acKEytgZ6uvw', route: 'elevenlabs/eleven_v3_conversational' },
    { label: 'Mizael · masculina, mexicana, narrador cálido (ElevenLabs v3)', voice: 'HRUUrQrYM9LfgDbWoMXS', route: 'elevenlabs/eleven_v3_conversational' },
  ],
  openai: [
    { label: 'coral · femenina, cálida', voice: 'coral' },
    { label: 'sage · femenina, serena', voice: 'sage' },
    { label: 'ash · masculina, clara', voice: 'ash' },
  ],
};

// Speko's catalog measures each voice; rank the most human ones (conversational models, clean audio, Latin accent).
function score(v) {
  const labels = v.quality?.labels ?? [];
  const model = v.use_with?.model ?? '';
  let s = 0;
  if (v.vendor === 'elevenlabs' && model.includes('v3')) s += 6;
  else if (v.vendor === 'cartesia' && model.includes('3.5')) s += 4;
  else if (['inworld', 'azure', 'xai'].includes(v.vendor)) s += 2;
  if (v.quality?.verdict === 'measured') s += 1;
  for (const l of ['no hiss', 'no muffling', 'no clipping']) if (labels.includes(l)) s += 1;
  if (/latin|colomb|mexic|mx/i.test(v.accent ?? '')) s += 1;
  if ((v.why?.best_for ?? []).some((b) => /review by ear|phone and ivr/i.test(b))) s -= 4;
  return s;
}

async function speko(env, language) {
  const r = await fetch(`https://api.speko.dev/v1/tts/voices?language=${language}&limit=100`, { headers: { authorization: `Bearer ${env.SPEKO_API_KEY}` } });
  if (!r.ok) throw new Error('catálogo ' + r.status);
  const rows = (await r.json()).data.filter((v) => v.use_with?.voice).sort((a, b) => score(b) - score(a));
  // Best overall, then the best of the other gender, then the next best: a varied but top-quality shortlist.
  const first = rows[0];
  const other = rows.find((v) => v.gender && v.gender !== first.gender);
  const picks = [first, other, ...rows.filter((v) => v !== first && v !== other)].filter(Boolean).slice(0, 3);
  const gender = { female: 'femenina', male: 'masculina' };
  const es = (acc) => (acc ?? '').replace(/latin american/i, 'latinoamericana').replace(/((w+))/, ', $1').replace(/colombian/i, 'colombiana').replace(/mexican/i, 'mexicana').replace(/venezuelan/i, 'venezolana').replace(/peninsular/i, 'de España').replace(/multilingual-neutral/i, 'neutra');
  return picks.map((v) => ({
    label: `${v.name.split(' - ')[0]} · ${[gender[v.gender] ?? v.gender, es(v.accent)].filter(Boolean).join(', ')} (${v.vendor} ${v.use_with.model})`,
    voice: v.use_with.voice,
    route: `${v.use_with.provider}/${v.use_with.model}`,
  }));
}

async function elevenlabs(env) {
  const r = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': env.ELEVENLABS_API_KEY } });
  if (!r.ok) throw new Error('voces ' + r.status);
  return (await r.json()).voices.slice(0, 3).map((v) => ({ label: `${v.name} · ${[v.labels?.gender, v.labels?.accent].filter(Boolean).join(', ')}`, voice: v.voice_id }));
}

export async function topVoices(provider, env, language = 'es') {
  try {
    if (provider === 'speko') return await speko(env, language);
    if (provider === 'elevenlabs') return await elevenlabs(env);
  } catch (e) {
    console.log(`  (No pude leer el catálogo de ${provider}: ${e.message}. Muestro la lista recomendada.)`);
  }
  return FALLBACK[provider] ?? [];
}
