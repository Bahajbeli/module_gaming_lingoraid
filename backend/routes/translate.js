const express = require('express');

// Polyfill fetch for Node versions < 18
const nodeFetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
const doFetch = typeof fetch === 'function' ? fetch : nodeFetch;

const router = express.Router();

// POST /api/translate - body: { q, source, target }
router.post('/', async (req, res) => {
	try {
		const { q, source = 'de', target = 'fr' } = req.body || {};
		if (!q || typeof q !== 'string') {
			return res.status(400).json({ error: 'Paramètre q (texte) requis' });
		}

        const candidates = [
            // Priorité aux endpoints publics stables
            'https://translate.argosopentech.com',
            'https://translate.astian.org',
            process.env.LIBRETRANSLATE_URL,
            'http://localhost:5001'
        ].filter(Boolean);

        let lastErr;
		for (const base of candidates) {
			try {
				const url = `${base}/translate`;
				const controller = new AbortController();
				const t = setTimeout(() => controller.abort(), 6000);
                const ltRes = await doFetch(url, {
					method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'User-Agent': 'DL-Translate-Proxy/1.0'
                    },
					body: JSON.stringify({ q, source, target, format: 'text' }),
					signal: controller.signal
				});
				clearTimeout(t);
                const ctype = ltRes.headers.get('content-type') || '';
                if (!ltRes.ok || !ctype.includes('application/json')) {
					const text = await ltRes.text();
                    lastErr = new Error(`Upstream ${base} HTTP ${ltRes.status}: ${text.substring(0,120)}`);
					console.error('[Translate] upstream error:', lastErr.message);
					continue;
				}
				const data = await ltRes.json();
				return res.json({ translation: data.translatedText || data?.translation || '' });
			} catch (e) {
				lastErr = e;
				console.error('[Translate] fetch failed for candidate', base, e.message);
				continue;
			}
		}

        // Final fallback: MyMemory (no key required)
        try {
            const mmUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=${encodeURIComponent(source)}|${encodeURIComponent(target)}`;
            const mmRes = await doFetch(mmUrl, {
                headers: { 'Accept': 'application/json', 'User-Agent': 'DL-Translate-Proxy/1.0' }
            });
            if (mmRes.ok) {
                const mm = await mmRes.json();
                const text = mm?.responseData?.translatedText || '';
                if (text) return res.json({ translation: text });
                lastErr = new Error('MyMemory returned empty translation');
            } else {
                lastErr = new Error(`MyMemory HTTP ${mmRes.status}`);
            }
        } catch (e) {
            lastErr = e;
        }

        throw lastErr || new Error('No translation backends available');
	} catch (error) {
		console.error('Erreur traduction:', error);
		return res.status(500).json({ error: 'Erreur interne de traduction', details: error?.message });
	}
});

module.exports = router;
