/**
 * RunPod Serverless API Client
 * Submits ComfyUI workflow jobs and retrieves results.
 * Compatible with runpod-workers/worker-comfyui.
 */

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const RUNPOD_ENDPOINT_ID = process.env.RUNPOD_COMFYUI_ENDPOINT_ID;

function getBaseUrl() {
  if (!RUNPOD_ENDPOINT_ID) throw new Error('RUNPOD_COMFYUI_ENDPOINT_ID is not set');
  return `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}`;
}

function getHeaders() {
  if (!RUNPOD_API_KEY) throw new Error('RUNPOD_API_KEY is not set');
  return {
    'Authorization': `Bearer ${RUNPOD_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

export interface RunPodJobResult {
  id: string;
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'TIMED_OUT';
  output?: {
    // worker-comfyui v5+ format
    images?: Array<{ filename: string; type: string; data: string }>;
    // Legacy/simple format (single image as data URL in message)
    message?: string;
    status?: string;
    errors?: string[];
  };
  error?: string;
}

/**
 * Submit a ComfyUI workflow job (async, returns job ID).
 * Images array format: [{ name: "filename.png", image: "base64data" }]
 */
export async function submitComfyJob(
  workflow: object,
  images?: Array<{ name: string; image: string }>
): Promise<string> {
  const payload = {
    input: {
      workflow,
      ...(images && images.length > 0 ? { images } : {}),
    },
  };

  console.log('[RunPod] Submitting job. Payload keys:', Object.keys(payload.input));
  console.log('[RunPod] Workflow keys:', Object.keys(workflow as Record<string, unknown>));

  const res = await fetch(`${getBaseUrl()}/run`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RunPod submit failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.id;
}

/**
 * Poll a job until completion (with timeout).
 */
export async function pollComfyJob(jobId: string, timeoutMs = 120000): Promise<RunPodJobResult> {
  const start = Date.now();
  const pollInterval = 2000;

  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`${getBaseUrl()}/status/${jobId}`, {
      headers: getHeaders(),
    });

    if (!res.ok) {
      throw new Error(`RunPod status check failed (${res.status})`);
    }

    const data: RunPodJobResult = await res.json();

    if (data.status === 'COMPLETED') return data;
    if (data.status === 'FAILED') throw new Error(`RunPod job failed: ${data.error || data.output?.errors?.join(', ') || 'unknown'}`);
    if (data.status === 'TIMED_OUT') throw new Error('RunPod job timed out');
    if (data.status === 'CANCELLED') throw new Error('RunPod job was cancelled');

    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error(`Polling timed out after ${timeoutMs}ms`);
}

/**
 * Extract the base64 image data from a completed job result.
 * Handles both worker-comfyui response formats:
 * - v5+: output.images[] array with { filename, type, data }
 * - Simple: output.message as a data URL string
 */
function extractImagesFromResult(result: RunPodJobResult): string[] {
  if (!result.output) {
    throw new Error('RunPod job completed but returned no output');
  }

  const images: string[] = [];

  // Format 1: images array (v5+)
  if (result.output.images && result.output.images.length > 0) {
    for (const img of result.output.images) {
      // img.data can be base64 or an S3 URL depending on config
      images.push(img.data);
    }
  }

  // Format 2: single image as data URL in message field
  if (images.length === 0 && result.output.message) {
    const msg = result.output.message;
    if (msg.startsWith('data:image/')) {
      // Extract base64 from data URL
      const base64 = msg.includes(',') ? msg.split(',')[1] : msg;
      images.push(base64);
    } else {
      // Might be raw base64 already
      images.push(msg);
    }
  }

  if (images.length === 0) {
    throw new Error('RunPod job completed but returned no images');
  }

  return images;
}

/**
 * Submit a workflow and wait for the result.
 * Returns array of base64 image strings.
 */
export async function runComfyWorkflow(
  workflow: object,
  images?: Array<{ name: string; image: string }>,
  timeoutMs = 120000
): Promise<string[]> {
  const jobId = await submitComfyJob(workflow, images);
  console.log(`[RunPod] Job submitted: ${jobId}`);

  const result = await pollComfyJob(jobId, timeoutMs);
  return extractImagesFromResult(result);
}

/**
 * Check if RunPod is configured.
 */
export function isRunPodConfigured(): boolean {
  return !!(RUNPOD_API_KEY && RUNPOD_ENDPOINT_ID);
}
