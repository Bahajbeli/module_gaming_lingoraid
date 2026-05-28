const fs = require('fs');
const path = require('path');

const { writeBackgroundImage } = require('./creativityLayoutService');
const { publishSceneImage } = require('./cloudinaryService');
const { generateImageViaWorkflow } = require('./comfyuiService');
const { generateImageViaGemini } = require('./geminiImageService');
const { generateImageViaPollinations } = require('./pollinationsImageService');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'creativity');

function isComfyuiProvider() {
  return String(process.env.CREATIVITY_IMAGE_PROVIDER || 'local-svg').toLowerCase() === 'comfyui';
}

function tryLoadWorkflow(workflowPath) {
  if (!workflowPath) return null;
  const abs = path.isAbsolute(workflowPath) ? workflowPath : path.join(__dirname, '..', workflowPath);
  if (!fs.existsSync(abs)) return null;
  const raw = fs.readFileSync(abs, 'utf8');
  return { absPath: abs, raw };
}

function replaceWorkflowPlaceholders(raw, placeholders) {
  let out = raw;
  for (const [k, v] of Object.entries(placeholders)) {
    const safe = String(v ?? '');
    out = out.replaceAll(`{{${k}}}`, safe);
  }
  return out;
}

async function getBackgroundImage({ puzzle, seed = 1 }) {
  const { title, theme, cefr, slug } = puzzle;

  const provider = String(process.env.CREATIVITY_IMAGE_PROVIDER || 'local-svg').toLowerCase();
  const comfyWorkflow = tryLoadWorkflow(process.env.COMFYUI_WORKFLOW_PATH);
  const useComfy = provider === 'comfyui' && !!comfyWorkflow;
  const useGemini = provider === 'gemini';
  const usePollinations = provider === 'pollinations';

  if (usePollinations) {
    try {
      const { outPath } = await generateImageViaPollinations({
        puzzle,
        outputDir: UPLOADS_DIR,
        filenamePrefix: slug,
        seed,
      });
      const { imageUrl } = await publishSceneImage({ localPath: outPath, slug: `${slug}-pollinations` });
      return { imageUrl, provider: 'pollinations' };
    } catch (e) {
      console.warn('⚠️ Pollinations image generation failed. Fallback local svg.', e.message);
    }
  }

  if (useGemini) {
    try {
      const { outPath } = await generateImageViaGemini({
        puzzle,
        outputDir: UPLOADS_DIR,
        filenamePrefix: slug,
        seed,
      });
      const { imageUrl } = await publishSceneImage({ localPath: outPath, slug: `${slug}-gemini` });
      return { imageUrl, provider: 'gemini' };
    } catch (e) {
      console.warn('⚠️ Gemini image generation failed. Fallback local svg.', e.message);
    }
  }

  if (useComfy) {
    // Workflow placeholders to be supported:
    // {{THEME}}, {{CEFR}}, {{SEED}}
    const replaced = replaceWorkflowPlaceholders(comfyWorkflow.raw, {
      THEME: theme,
      CEFR: cefr,
      SEED: seed,
    });

    let workflowObj;
    try {
      workflowObj = JSON.parse(replaced);
    } catch (e) {
      console.warn('⚠️ ComfyUI workflow JSON parse failed. Fallback local svg.', e.message);
      workflowObj = null;
    }

    if (workflowObj) {
      try {
        const { outPath } = await generateImageViaWorkflow({
          workflowObj,
          outputDir: UPLOADS_DIR,
          filenamePrefix: slug,
          seed,
        });

        const { imageUrl } = await publishSceneImage({ localPath: outPath, slug });
        return { imageUrl, provider: 'comfyui' };
      } catch (e) {
        console.warn('⚠️ ComfyUI generation failed. Fallback local svg.', e.message);
      }
    }
  }

  // Fallback local svg background (no hotspot circles: UI draws hotspots)
  const bg = writeBackgroundImage({ slug, title, theme, cefr, seed });
  const { imageUrl } = await publishSceneImage({ localPath: bg.filePath, slug });
  return { imageUrl, provider: 'local-svg' };
}

module.exports = {
  getBackgroundImage,
  isComfyuiProvider,
};

