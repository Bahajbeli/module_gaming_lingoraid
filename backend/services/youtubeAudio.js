const fs = require('fs');
const path = require('path');
const youtubedl = require('youtube-dl-exec');

const SHADOWING_DIR = path.join(__dirname, '../uploads/shadowing');
const MAX_DURATION_SEC = Number(process.env.SHADOWING_MAX_DURATION_SEC || 1800);

const YTDL_OPTS = {
  noWarnings: true,
  noPlaylist: true,
  noCheckCertificates: true,
};

if (!fs.existsSync(SHADOWING_DIR)) {
  fs.mkdirSync(SHADOWING_DIR, { recursive: true });
}

function extractYoutubeId(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const re of patterns) {
    const m = trimmed.match(re);
    if (m) return m[1];
  }
  return null;
}

function watchUrl(videoId) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

function findCachedAudio(videoId) {
  const exts = ['.mp3', '.m4a', '.webm', '.opus', '.ogg'];
  for (const ext of exts) {
    const p = path.join(SHADOWING_DIR, `${videoId}${ext}`);
    if (fs.existsSync(p)) return p;
  }
  const match = fs
    .readdirSync(SHADOWING_DIR)
    .find((f) => f.startsWith(`${videoId}.`));
  return match ? path.join(SHADOWING_DIR, match) : null;
}

async function getVideoMeta(videoId) {
  const url = watchUrl(videoId);
  const info = await youtubedl(url, {
    ...YTDL_OPTS,
    dumpSingleJson: true,
    skipDownload: true,
  });
  const durationSec = Math.floor(Number(info.duration) || 0);
  return {
    title: info.title || `YouTube ${videoId}`,
    durationSec,
    thumbnail: info.thumbnail,
  };
}

/**
 * Télécharge l'audio (m4a/webm) via yt-dlp.
 */
async function downloadAudio(videoId) {
  const url = watchUrl(videoId);
  const meta = await getVideoMeta(videoId);

  if (meta.durationSec > MAX_DURATION_SEC) {
    throw new Error(
      `Vidéo trop longue (${Math.ceil(meta.durationSec / 60)} min). Maximum : ${Math.ceil(MAX_DURATION_SEC / 60)} min.`
    );
  }

  const cached = findCachedAudio(videoId);
  if (cached) {
    return { filePath: cached, ...meta };
  }

  const outTemplate = path.join(SHADOWING_DIR, `${videoId}.%(ext)s`);

  try {
    // Format natif (m4a/webm) — bitrate réduit si >10 min pour rester sous la limite Whisper (~25 Mo)
    const audioFormat =
      meta.durationSec > 600
        ? 'bestaudio[abr<=64][ext=m4a]/bestaudio[abr<=64][ext=webm]/bestaudio[filesize<24M]/bestaudio'
        : 'bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio/best';
    await youtubedl(url, {
      ...YTDL_OPTS,
      format: audioFormat,
      output: outTemplate,
    });
  } catch (err) {
    const msg = err?.stderr || err?.message || String(err);
    if (/private|unavailable|copyright|blocked/i.test(msg)) {
      throw new Error(
        'Cette vidéo n’est pas accessible (privée, supprimée ou restreinte).'
      );
    }
    throw new Error(
      `Impossible de télécharger l’audio YouTube. Essayez une autre vidéo ou réessayez plus tard. (${msg.slice(0, 120)})`
    );
  }

  const filePath = findCachedAudio(videoId);
  if (!filePath) {
    throw new Error('Téléchargement terminé mais fichier audio introuvable.');
  }

  return { filePath, ...meta };
}

module.exports = {
  extractYoutubeId,
  getVideoMeta,
  downloadAudio,
  MAX_DURATION_SEC,
  SHADOWING_DIR,
};
