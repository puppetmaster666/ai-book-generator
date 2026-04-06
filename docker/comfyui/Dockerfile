FROM runpod/worker-comfyui:5.1.0-base

# Install custom nodes for character consistency
RUN comfy-node-install comfyui_ipadapter_plus comfyui-impact-pack

# ─── BASE MODELS ───

# Flux.1-dev-fp8 (for SFW content, best prompt following)
RUN comfy model download \
  --url https://huggingface.co/Comfy-Org/flux1-dev/resolve/main/flux1-dev-fp8.safetensors \
  --relative-path models/checkpoints \
  --filename flux1-dev-fp8.safetensors

# LUSTIFY! Apex V8 (top NSFW SDXL checkpoint, 289K downloads, April 2026)
ARG CIVITAI_API_KEY
RUN comfy model download \
  --url https://civitai.com/api/download/models/2808677 \
  --relative-path models/checkpoints \
  --filename lustifySDXLNSFW_apexV8.safetensors \
  --set-civitai-api-token "$CIVITAI_API_KEY"

# ─── CHARACTER CONSISTENCY ───

# IP-Adapter face model
RUN comfy model download \
  --url https://huggingface.co/h94/IP-Adapter/resolve/main/sdxl_models/ip-adapter-plus-face_sdxl_vit-h.safetensors \
  --relative-path models/ipadapter \
  --filename ip-adapter-plus-face_sdxl_vit-h.safetensors

# CLIP Vision encoder (required by IP-Adapter)
RUN comfy model download \
  --url https://huggingface.co/h94/IP-Adapter/resolve/main/models/image_encoder/model.safetensors \
  --relative-path models/clip_vision \
  --filename CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors
