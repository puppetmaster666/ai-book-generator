/**
 * ComfyUI Workflow Builder
 * Builds workflow JSON for the RunPod ComfyUI serverless worker.
 * Compatible with runpod-workers/worker-comfyui.
 *
 * Default deployment uses FLUX.1-dev-fp8.
 * Custom deployments can use SDXL/Pony V6 with IP-Adapter.
 */

export interface ComicPanelInput {
  prompt: string;
  negativePrompt?: string;
  referenceImages?: Array<{ name: string; base64: string }>;
  width?: number;
  height?: number;
  steps?: number;
  cfg?: number;
  seed?: number;
  checkpoint?: string;
  model?: 'flux' | 'sdxl';
  nsfw?: boolean; // Apply NSFW LoRA for explicit content
}

/**
 * Build a Flux workflow for the default RunPod deployment (flux1-dev-fp8).
 * This matches the exact format from the worker-comfyui docs.
 */
function buildFluxWorkflow(input: ComicPanelInput): object {
  const {
    prompt,
    width = 832,
    height = 1216,
    steps = 20,
    seed = Math.floor(Math.random() * 2147483647),
    checkpoint = 'flux1-dev-fp8.safetensors',
    nsfw = false,
  } = input;

  // If NSFW, add LoRA loader between checkpoint and KSampler
  const modelSource = nsfw ? '40' : '30'; // LoRA output or direct checkpoint

  const workflow: Record<string, object> = {
    '6': {
      inputs: { text: prompt, clip: [nsfw ? '40' : '30', 1] },
      class_type: 'CLIPTextEncode',
      _meta: { title: 'CLIP Text Encode (Positive Prompt)' },
    },
    '8': {
      inputs: { samples: ['31', 0], vae: ['30', 2] },
      class_type: 'VAEDecode',
      _meta: { title: 'VAE Decode' },
    },
    '9': {
      inputs: { filename_prefix: 'ComfyUI', images: ['8', 0] },
      class_type: 'SaveImage',
      _meta: { title: 'Save Image' },
    },
    '27': {
      inputs: { width, height, batch_size: 1 },
      class_type: 'EmptySD3LatentImage',
      _meta: { title: 'EmptySD3LatentImage' },
    },
    '30': {
      inputs: { ckpt_name: checkpoint },
      class_type: 'CheckpointLoaderSimple',
      _meta: { title: 'Load Checkpoint' },
    },
    '31': {
      inputs: {
        seed,
        steps,
        cfg: 1,
        sampler_name: 'euler',
        scheduler: 'simple',
        denoise: 1,
        model: [modelSource, 0],
        positive: ['35', 0],
        negative: ['33', 0],
        latent_image: ['27', 0],
      },
      class_type: 'KSampler',
      _meta: { title: 'KSampler' },
    },
    '33': {
      inputs: { text: '', clip: [nsfw ? '40' : '30', 1] },
      class_type: 'CLIPTextEncode',
      _meta: { title: 'CLIP Text Encode (Negative Prompt)' },
    },
    '35': {
      inputs: { guidance: 3.5, conditioning: ['6', 0] },
      class_type: 'FluxGuidance',
      _meta: { title: 'FluxGuidance' },
    },
  };

  // Add NSFW LoRA node if needed
  if (nsfw) {
    workflow['40'] = {
      inputs: {
        lora_name: 'flux-nsfw-uncensored.safetensors',
        strength_model: 0.85,
        strength_clip: 0.85,
        model: ['30', 0],
        clip: ['30', 1],
      },
      class_type: 'LoraLoader',
      _meta: { title: 'NSFW LoRA' },
    };
  }

  return workflow;
}

/**
 * Build an SDXL workflow with optional IP-Adapter for character consistency.
 * Used with custom deployments that have Pony V6 / Illustrious XL.
 */
function buildSdxlWorkflow(input: ComicPanelInput): {
  workflow: object;
  images?: Array<{ name: string; image: string }>;
} {
  const {
    prompt,
    negativePrompt = 'text, watermark, signature, blurry, low quality, deformed, ugly, bad anatomy, bad hands, missing fingers, extra fingers',
    referenceImages,
    width = 832,
    height = 1216,
    steps = 25,
    cfg = 7,
    seed = Math.floor(Math.random() * 2147483647),
    checkpoint = 'ponyDiffusionV6XL.safetensors',
  } = input;

  const hasReferences = referenceImages && referenceImages.length > 0;

  // Build the images array for RunPod worker (base64 images that get saved as files)
  const inputImages: Array<{ name: string; image: string }> = [];
  if (hasReferences) {
    referenceImages.forEach((ref, idx) => {
      inputImages.push({
        name: `ref_${idx}.png`,
        image: ref.base64,
      });
    });
  }

  const workflow: Record<string, object> = {
    '1': {
      class_type: 'CheckpointLoaderSimple',
      inputs: { ckpt_name: checkpoint },
    },
    '2': {
      class_type: 'CLIPTextEncode',
      inputs: { text: prompt, clip: ['1', 1] },
    },
    '3': {
      class_type: 'CLIPTextEncode',
      inputs: { text: negativePrompt, clip: ['1', 1] },
    },
    '4': {
      class_type: 'EmptyLatentImage',
      inputs: { width, height, batch_size: 1 },
    },
  };

  let modelOutput = '1';

  // If we have reference images, add IP-Adapter nodes
  if (hasReferences) {
    workflow['10'] = {
      class_type: 'IPAdapterModelLoader',
      inputs: { ipadapter_file: 'ip-adapter-plus-face_sdxl_vit-h.safetensors' },
    };
    workflow['11'] = {
      class_type: 'CLIPVisionLoader',
      inputs: { clip_name: 'CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors' },
    };

    referenceImages.forEach((ref, idx) => {
      const loadNodeId = `20${idx}`;
      const applyNodeId = `21${idx}`;

      workflow[loadNodeId] = {
        class_type: 'LoadImage',
        inputs: { image: `ref_${idx}.png` },
      };

      workflow[applyNodeId] = {
        class_type: 'IPAdapterApply',
        inputs: {
          ipadapter: ['10', 0],
          clip_vision: ['11', 0],
          image: [loadNodeId, 0],
          model: [modelOutput, 0],
          weight: idx === 0 ? 0.85 : 0.6,
          noise: 0.0,
          weight_type: 'style transfer',
          start_at: 0.0,
          end_at: 1.0,
        },
      };

      modelOutput = applyNodeId;
    });
  }

  workflow['5'] = {
    class_type: 'KSampler',
    inputs: {
      model: [modelOutput, 0],
      positive: ['2', 0],
      negative: ['3', 0],
      latent_image: ['4', 0],
      seed,
      steps,
      cfg,
      sampler_name: 'euler_ancestral',
      scheduler: 'normal',
      denoise: 1.0,
    },
  };

  workflow['6'] = {
    class_type: 'VAEDecode',
    inputs: { samples: ['5', 0], vae: ['1', 2] },
  };

  workflow['7'] = {
    class_type: 'SaveImage',
    inputs: { images: ['6', 0], filename_prefix: 'panel' },
  };

  return {
    workflow,
    images: inputImages.length > 0 ? inputImages : undefined,
  };
}

/**
 * Build a workflow for generating a comic panel.
 * Automatically picks the right workflow format based on model type.
 */
export function buildComicPanelWorkflow(input: ComicPanelInput): {
  workflow: object;
  images?: Array<{ name: string; image: string }>;
} {
  const modelType = input.model || 'flux';

  if (modelType === 'flux') {
    return { workflow: buildFluxWorkflow(input) };
  }

  return buildSdxlWorkflow(input);
}

/**
 * Build a prompt string for Flux models.
 * Flux uses natural language prompts (no score tags like Pony).
 */
export function buildFluxPrompt(
  sceneDescription: string,
  characterDescription: string,
  artStyle: string = 'comic'
): string {
  const styleMap: Record<string, string> = {
    comic: 'comic book illustration style, bold dynamic composition, vibrant colors',
    manga: 'manga illustration style, clean lineart, screentone shading, black and white with gray tones',
    cartoon: 'cartoon illustration style, bright colors, expressive characters, animated look',
    realistic: 'realistic digital illustration, detailed lighting, cinematic composition',
    anime: 'anime illustration style, detailed coloring, expressive eyes, clean lines',
    shonen: 'shonen manga style, action-oriented, dynamic poses, bold linework',
    watercolor: 'watercolor illustration style, soft edges, translucent color washes',
    noir: 'film noir style, high contrast black and white, dramatic shadows',
  };

  const styleTag = styleMap[artStyle] || styleMap.comic;

  const parts = [
    styleTag,
    characterDescription,
    sceneDescription,
    'high quality, detailed illustration',
    'no text, no words, no letters, no speech bubbles, no writing in the image',
  ].filter(Boolean);

  return parts.join('. ');
}

/**
 * Build a prompt string optimized for Pony V6 / SDXL models.
 * Uses Danbooru-style tags and score quality boosters.
 * Pony V6 responds to tags, not natural language.
 */
export function buildPonyPrompt(
  sceneDescription: string,
  characterDescription: string,
  artStyle: string = 'comic',
  extras: string = '',
  nsfw: boolean = false
): string {
  const styleMap: Record<string, string> = {
    comic: 'comic book style, western comic, bold lines, dynamic composition',
    manga: 'manga style, screentone shading, clean lineart, japanese comic',
    cartoon: 'cartoon style, vibrant colors, animated look, expressive characters',
    realistic: 'realistic, photorealistic, detailed skin texture, cinematic lighting',
    anime: 'anime style, large expressive eyes, clean coloring, cel shading',
    shonen: 'shonen manga style, action-oriented, dynamic poses',
  };

  const styleTag = styleMap[artStyle] || styleMap.comic;

  // Pony V6 uses rating tags to unlock explicit content
  const ratingTag = nsfw ? 'rating_explicit, nsfw' : 'rating_safe';

  const parts = [
    'score_9, score_8_up, score_7_up',
    ratingTag,
    styleTag,
    characterDescription,
    sceneDescription,
    'masterpiece, best quality, highly detailed',
    'no text, no words, no letters, no speech bubbles',
    extras,
  ].filter(Boolean);

  return parts.join(', ');
}
