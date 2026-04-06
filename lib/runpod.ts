/**
 * RunPod Serverless API Client
 * Submits ComfyUI workflow jobs and retrieves results.
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
    images?: Array<{ base64: string; filename: string }>;
    message?: string;
  };
  error?: string;
}

/**
 * Submit a ComfyUI workflow job (async, returns job ID).
 */
export async function submitComfyJob(workflow: object, images?: Record<string, string>): Promise<string> {
  const res = await fetch(`${getBaseUrl()}/run`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      input: {
        workflow,
        ...(images ? { images } : {}),
      },
    }),
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
    if (data.status === 'FAILED') throw new Error(`RunPod job failed: ${data.error || 'unknown'}`);
    if (data.status === 'TIMED_OUT') throw new Error('RunPod job timed out');
    if (data.status === 'CANCELLED') throw new Error('RunPod job was cancelled');

    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error(`Polling timed out after ${timeoutMs}ms`);
}

/**
 * Submit a workflow and wait for the result (synchronous helper).
 */
export async function runComfyWorkflow(
  workflow: object,
  images?: Record<string, string>,
  timeoutMs = 120000
): Promise<{ base64: string; filename: string }[]> {
  const jobId = await submitComfyJob(workflow, images);
  console.log(`[RunPod] Job submitted: ${jobId}`);

  const result = await pollComfyJob(jobId, timeoutMs);

  if (!result.output?.images || result.output.images.length === 0) {
    throw new Error('RunPod job completed but returned no images');
  }

  return result.output.images;
}

/**
 * Check if RunPod is configured.
 */
export function isRunPodConfigured(): boolean {
  return !!(RUNPOD_API_KEY && RUNPOD_ENDPOINT_ID);
}
