/**
 * Minimal ComfyUI client:
 * - POST /prompt { prompt, client_id }
 * - Poll GET /history/:prompt_id until completed
 * - Download first image via GET /view
 *
 * Env:
 *   COMFYUI_BASE_URL=http://localhost:8188
 *   COMFYUI_API_KEY=...
 *   COMFYUI_API_KEY_HEADER=Authorization|x-api-key|...
 *   COMFYUI_API_KEY_HEADER_PREFIX=Bearer
 */

const fs = require('fs');
const path = require('path');

const fetchFn = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

function getComfyUrl(p) {
  const base = String(process.env.COMFYUI_BASE_URL || 'http://localhost:8188').replace(/\/$/, '');
  return `${base}${p.startsWith('/') ? '' : '/'}${p}`;
}

function getAuthHeaders() {
  const key = process.env.COMFYUI_API_KEY;
  if (!key) return {};

  const header = process.env.COMFYUI_API_KEY_HEADER || 'Authorization';
  const prefix = process.env.COMFYUI_API_KEY_HEADER_PREFIX || '';

  if (header.toLowerCase() === 'authorization') {
    // Bearer token style
    return prefix
      ? { Authorization: `${prefix} ${key}` }
      : { Authorization: key };
  }

  return {
    [header]: key,
  };
}

async function waitForHistory(promptId, { timeoutMs = 180000, pollMs = 1200 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await fetchFn(getComfyUrl(`/history/${promptId}`), {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(`ComfyUI history error ${res.status}: ${await res.text()}`);
    const data = await res.json();

    // data format: { [promptId]: { status, outputs, ... } }
    const entry = data?.[promptId];
    if (entry && (entry.status === 'completed' || entry.status === 'success')) return entry;

    // If not found yet, keep waiting
    await new Promise((r) => setTimeout(r, pollMs));
  }
  throw new Error(`ComfyUI timeout waiting for prompt ${promptId}`);
}

function pickFirstImageFromHistory(historyEntry) {
  const outputs = historyEntry?.outputs || {};
  for (const nodeName of Object.keys(outputs)) {
    const node = outputs[nodeName];
    const images = node?.images;
    if (Array.isArray(images) && images.length > 0) {
      return images[0]; // { filename, subfolder, type, ... }
    }
  }
  return null;
}

async function downloadImageFromComfy(image, outPath) {
  if (!image?.filename) throw new Error('ComfyUI image missing filename');
  const filename = encodeURIComponent(image.filename);
  const subfolder = encodeURIComponent(image.subfolder || '');
  const type = encodeURIComponent(image.type || 'output');

  const url = getComfyUrl(`/view?filename=${filename}&subfolder=${subfolder}&type=${type}`);
  const res = await fetchFn(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!res.ok) throw new Error(`ComfyUI view error ${res.status}: ${await res.text()}`);
  const buffer = await res.arrayBuffer();
  fs.writeFileSync(outPath, Buffer.from(buffer));
  return outPath;
}

/**
 * @param {object} workflowObj - Workflow JSON object
 * @returns {{outPath: string, outUrl?: string}}
 */
async function generateImageViaWorkflow({ workflowObj, outputDir, filenamePrefix = 'comfy', seed = 0 } = {}) {
  if (!workflowObj) throw new Error('workflowObj required');
  if (!outputDir) throw new Error('outputDir required');

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const client_id = `lingoraid_${Date.now()}`;
  const res = await fetchFn(getComfyUrl('/prompt'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ prompt: workflowObj, client_id }),
  });

  if (!res.ok) throw new Error(`ComfyUI prompt error ${res.status}: ${await res.text()}`);
  const data = await res.json();

  const promptId = data?.prompt_id;
  if (!promptId) throw new Error('ComfyUI prompt_id missing in response');

  const historyEntry = await waitForHistory(promptId);
  const image = pickFirstImageFromHistory(historyEntry);
  if (!image) throw new Error('ComfyUI no image output found');

  const ext = path.extname(image.filename) || '.png';
  const outName = `${filenamePrefix}-${seed}-${promptId}${ext}`;
  const outPath = path.join(outputDir, outName);

  await downloadImageFromComfy(image, outPath);
  return { outPath };
}

module.exports = {
  getComfyUrl,
  generateImageViaWorkflow,
};

