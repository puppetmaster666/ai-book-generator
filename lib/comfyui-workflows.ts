/**
 * ComfyUI Workflow Builder
 * Builds workflow JSON for the RunPod ComfyUI serverless worker.
 * Compatible with blib-la/runpod-worker-comfyui format.
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
}

/**
 * Build a workflow for generating a comic panel with optional IP-Adapter character reference.
 * This workflow is designed for SDXL models (Pony V6, Illustrious, etc.)
 */
export function buildComicPanelWorkflow(input: ComicPanelInput): {
  workflow: object;
  images?: Record<string, string>;
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

  // Build the images dict for RunPod worker (base64 images that get saved as files)
  const images: Record<string, string> = {};
  if (hasReferences) {
    referenceImages.forEach((ref, idx) => {
      images[`ref_${idx}.png`] = ref.base64;
    });
  }

  // Build the ComfyUI workflow in API format
  const workflow: Record<string, object> = {
    // Node 1: Load checkpoint
    '1': {
      class_type: 'CheckpointLoaderSimple',
      inputs: {
        ckpt_name: checkpoint,
      },
    },
    // Node 2: CLIP Text Encode (positive prompt)
    '2': {
      class_type: 'CLIPTextEncode',
      inputs: {
        text: prompt,
        clip: ['1', 1],
      },
    },
    // Node 3: CLIP Text Encode (negative prompt)
    '3': {
      class_type: 'CLIPTextEncode',
      inputs: {
        text: negativePrompt,
        clip: ['1', 1],
      },
    },
    // Node 4: Empty Latent Image
    '4': {
      class_type: 'EmptyLatentImage',
      inputs: {
        width,
        height,
        batch_size: 1,
      },
    },
  };

  let modelOutput = '1'; // Track which node outputs the model (for IP-Adapter chaining)

  // If we have reference images, add IP-Adapter nodes
  if (hasReferences) {
    // Node 10: Load IP-Adapter model
    workflow['10'] = {
      class_type: 'IPAdapterModelLoader',
      inputs: {
        ipadapter_file: 'ip-adapter-plus-face_sdxl_vit-h.safetensors',
      },
    };

    // Node 11: Load CLIP Vision
    workflow['11'] = {
      class_type: 'CLIPVisionLoader',
      inputs: {
        clip_name: 'CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors',
      },
    };

    // Apply each reference image through IP-Adapter
    referenceImages.forEach((ref, idx) => {
      const loadNodeId = `20${idx}`;
      const applyNodeId = `21${idx}`;

      // Load reference image
      workflow[loadNodeId] = {
        class_type: 'LoadImage',
        inputs: {
          image: `ref_${idx}.png`,
        },
      };

      // Apply IP-Adapter
      workflow[applyNodeId] = {
        class_type: 'IPAdapterApply',
        inputs: {
          ipadapter: ['10', 0],
          clip_vision: ['11', 0],
          image: [loadNodeId, 0],
          model: [modelOutput, 0],
          weight: idx === 0 ? 0.85 : 0.6, // Primary reference gets higher weight
          noise: 0.0,
          weight_type: 'style transfer',
          start_at: 0.0,
          end_at: 1.0,
        },
      };

      modelOutput = applyNodeId;
    });
  }

  // Node 5: KSampler
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

  // Node 6: VAE Decode
  workflow['6'] = {
    class_type: 'VAEDecode',
    inputs: {
      samples: ['5', 0],
      vae: ['1', 2],
    },
  };

  // Node 7: Save Image (output)
  workflow['7'] = {
    class_type: 'SaveImage',
    inputs: {
      images: ['6', 0],
      filename_prefix: 'panel',
    },
  };

  return {
    workflow,
    images: Object.keys(images).length > 0 ? images : undefined,
  };
}

/**
 * Build a prompt string optimized for Pony V6 / SDXL comic models.
 * Pony V6 uses score tags and quality boosters.
 */
export function buildPonyPrompt(
  sceneDescription: string,
  characterDescription: string,
  artStyle: string = 'comic',
  extras: string = ''
): string {
  const styleMap: Record<string, string> = {
    comic: 'comic book style, western comic, bold lines, dynamic composition',
    manga: 'manga style, screentone shading, clean lineart, japanese comic',
    cartoon: 'cartoon style, vibrant colors, animated look, expressive characters',
    realistic: 'realistic illustration, detailed rendering, cinematic lighting',
    anime: 'anime style, large expressive eyes, clean coloring, cel shading',
  };

  const styleTag = styleMap[artStyle] || styleMap.comic;

  // Pony V6 uses quality score tags
  const parts = [
    'score_9, score_8_up, score_7_up',
    styleTag,
    characterDescription,
    sceneDescription,
    'masterpiece, best quality, highly detailed',
    extras,
  ].filter(Boolean);

  return parts.join(', ');
}
