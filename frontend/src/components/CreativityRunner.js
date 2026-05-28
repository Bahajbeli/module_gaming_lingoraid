import React, { useEffect, useMemo, useRef, useState } from 'react';
import api, { getAssetUrl } from '../utils/axios';
import { useSound } from '../hooks/useSound';

const CreativityRunner = ({ onComplete, itemId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cfg, setCfg] = useState(null); // { title, image, points }
  const { playCorrect, playWrong } = useSound();

  const [assign, setAssign] = useState({}); // idx -> label index
  const imgRef = useRef(null);
  const containerRef = useRef(null);
  const pointRefs = useRef({}); // idx -> ref
  const labelRefs = useRef({}); // idx -> ref
  const [lines, setLines] = useState([]); // [{x1,y1,x2,y2}]
  const [imgSize, setImgSize] = useState({ w: 0, h: 0, nw: 0, nh: 0 });

  useEffect(() => {
    (async () => {
      try {
        const url = itemId ? `/api/creativity/item/${itemId}` : '/api/creativity/latest';
        const res = await api.get(url);
        setCfg(res.data);
        setLoading(false);
      } catch (e) {
        const msg = e?.response?.data?.error || 'Error de chargement de l\'activité';
        setError(msg);
        setLoading(false);
      }
    })();
  }, [itemId]);

  const labels = useMemo(() => {
    if (!cfg) return [];
    // Mélanger l'ordre des labels pour plus de créativité
    const allLabels = cfg.points.map(p => p.text || p.word).filter(Boolean);
    return allLabels.sort(() => Math.random() - 0.5);
  }, [cfg]);

  // Garder les points dans l'ordre fourni (structure visuelle propre et stable)
  const shuffledPoints = useMemo(() => {
    if (!cfg) return [];
    return Array.isArray(cfg.points) ? [...cfg.points] : [];
  }, [cfg]);

  const onDrop = (e, idx) => {
    const labelIndex = Number(e.dataTransfer.getData('text/plain'));
    if (Number.isNaN(labelIndex)) return;
    setAssign(a => ({ ...a, [idx]: labelIndex }));
  };

  const onDragStart = (e, i) => {
    e.dataTransfer.setData('text/plain', String(i));
  };

  const score = useMemo(() => {
    if (!cfg) return 0;
    let ok = 0;
    shuffledPoints.forEach((p, i) => {
      const li = assign[i];
      if (li != null && labels[li] === (p.text || p.word)) ok++;
    });
    return Math.round((ok / shuffledPoints.length) * 100);
  }, [cfg, assign, labels, shuffledPoints]);

  // Recalculate lines whenever assignments change or layout changes
  const recalcLines = () => {
    const cont = containerRef.current;
    if (!cont || !cfg) return setLines([]);
    const contRect = cont.getBoundingClientRect();
    const img = imgRef.current;
    const imgRect = img?.getBoundingClientRect();
    const result = [];
    Object.keys(assign).forEach((k) => {
      const pIdx = Number(k);
      const lIdx = assign[pIdx];
      const pRef = pointRefs.current[pIdx];
      const lRef = labelRefs.current[lIdx];
      if (!pRef?.current || !lRef?.current) return;
      const pr = pRef.current.getBoundingClientRect();
      const lr = lRef.current.getBoundingClientRect();
      let x1 = pr.left + pr.width / 2 - contRect.left;
      let y1 = pr.top  + pr.height / 2 - contRect.top;
      let x2 = lr.left + lr.width / 2 - contRect.left;
      let y2 = lr.top  + lr.height / 2 - contRect.top;

      // Offset to touch the edge of the point circle and label pill
      const dx = x2 - x1;
      const dy = y2 - y1;
      const d = Math.hypot(dx, dy) || 1;
      const pointRadius = Math.max(pr.width, pr.height) / 2; // ~12px
      const labelPadding = Math.min(lr.width, lr.height) / 4; // small inset
      x1 += (dx / d) * pointRadius;
      y1 += (dy / d) * pointRadius;
      x2 -= (dx / d) * labelPadding;
      y2 -= (dy / d) * labelPadding;

      // Clamp start point inside image box to ensure the segment enters the image
      if (imgRect && cfg.image) {
        const ix = imgRect.left - contRect.left;
        const iy = imgRect.top - contRect.top;
        const iw = imgRect.width;
        const ih = imgRect.height;
        x1 = Math.min(Math.max(x1, ix), ix + iw);
        y1 = Math.min(Math.max(y1, iy), iy + ih);
      }

      result.push({ x1, y1, x2, y2 });
    });
    setLines(result);
  };

  useEffect(() => { recalcLines(); }, [assign, cfg]);
  useEffect(() => {
    const onResize = () => {
      // Update image size info
      const imgEl = imgRef.current;
      if (imgEl) {
        setImgSize({ w: imgEl.clientWidth || 0, h: imgEl.clientHeight || 0, nw: imgEl.naturalWidth || 0, nh: imgEl.naturalHeight || 0 });
      }
      recalcLines();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const onImageLoad = () => {
    const imgEl = imgRef.current;
    if (imgEl) {
      setImgSize({ w: imgEl.clientWidth || 0, h: imgEl.clientHeight || 0, nw: imgEl.naturalWidth || 0, nh: imgEl.naturalHeight || 0 });
      recalcLines();
    }
  };

  if (loading) return <div className="p-6 text-center">Loading...</div>;
  if (error) return <div className="p-6 text-center text-red-600">{error}</div>;
  if (!cfg) return null;

  const mid = Math.ceil(labels.length / 2);

  return (
    <div ref={containerRef} className="relative flex flex-col md:flex-row items-stretch gap-6 w-full max-w-6xl mx-auto">
      {/* SVG overlay for lines */}
      <svg className="pointer-events-none absolute inset-0 w-full h-full z-20">
        {lines.map((ln, i) => (
          <line key={i} x1={ln.x1} y1={ln.y1} x2={ln.x2} y2={ln.y2} stroke="#8b5cf6" strokeWidth="4" strokeLinecap="round" strokeOpacity="0.8" />
        ))}
      </svg>

      {/* Sidebar – libellés */}
      <div className="w-full md:w-80 flex-shrink-0 z-10 flex flex-col bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-6 text-white text-center">
          <h3 className="text-xl font-bold mb-1">Libellés</h3>
          <p className="text-purple-100 text-sm">Glissez-les vers les points sur l'image</p>
        </div>
        
        <div className="p-6 flex-1 bg-gray-50/50 flex flex-col">
          <div className="flex flex-col gap-4 flex-1 content-start justify-center">
            {labels.map((t, i) => (
              <div
                key={i}
                draggable
                onDragStart={(e) => onDragStart(e, i)}
                className="px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-purple-300 transition-all cursor-grab active:cursor-grabbing text-gray-700 font-semibold text-center select-none"
                ref={(el) => { if (!labelRefs.current[i]) labelRefs.current[i] = { current: el }; else labelRefs.current[i].current = el; }}
              >
                {t}
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={() => {
                if (score === 100) playCorrect();
                else playWrong();
                onComplete?.(score);
              }}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold px-6 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1"
            >
              Valider ma réponse ({score}%)
            </button>
          </div>
        </div>
      </div>

      {/* Main Area – Image or Emojis */}
      <div className="flex-1 bg-gradient-to-br from-yellow-50 to-amber-100 rounded-2xl shadow-xl border border-amber-200 p-6 z-10 flex items-center justify-center min-h-[400px]">
        {cfg.image ? (
          <div className="relative w-full max-w-[760px] border-4 border-white rounded-xl overflow-hidden shadow-md">
            <img
              ref={imgRef}
              src={getAssetUrl(cfg.image)}
              alt="creativity"
              className="w-full h-auto object-contain block"
              onLoad={onImageLoad}
            />
            {shuffledPoints.map((p, i) => {
              const left =
                p.xpct != null && imgSize.w
                  ? p.xpct * imgSize.w
                  : imgSize.w && imgSize.nw
                  ? p.x * (imgSize.w / imgSize.nw)
                  : p.x;
              const top =
                p.ypct != null && imgSize.h
                  ? p.ypct * imgSize.h
                  : imgSize.h && imgSize.nh
                  ? p.y * (imgSize.h / imgSize.nh)
                  : p.y;
              return (
                <div
                  key={i}
                  className="absolute w-12 h-12 flex items-center justify-center cursor-pointer transition-transform hover:scale-110"
                  style={{ left, top, transform: 'translate(-50%, -50%)' }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => onDrop(e, i)}
                  title={assign[i] != null ? labels[assign[i]] : 'Glissez un libellé ici'}
                  ref={(el) => { if (!pointRefs.current[i]) pointRefs.current[i] = { current: el }; else pointRefs.current[i].current = el; }}
                >
                  <span className="text-3xl md:text-4xl select-none pointer-events-none drop-shadow-sm">
                    {p.emoji || '●'}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-wrap justify-center items-center gap-6 p-4 w-full max-w-2xl" ref={imgRef}>
            {shuffledPoints.map((p, i) => (
              <div
                key={i}
                className="relative w-20 h-20 flex flex-col items-center justify-center cursor-pointer transition-transform hover:scale-110 bg-white rounded-2xl shadow-sm border-2 border-amber-100 hover:border-purple-300"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDrop(e, i)}
                title={assign[i] != null ? labels[assign[i]] : 'Glissez un libellé ici'}
                ref={(el) => { if (!pointRefs.current[i]) pointRefs.current[i] = { current: el }; else pointRefs.current[i].current = el; }}
              >
                <span className="text-5xl select-none pointer-events-none drop-shadow-sm pb-1">
                  {p.emoji || '❓'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CreativityRunner;


