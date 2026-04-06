FROM runpod/worker-comfyui:5.1.0-base

# Install custom nodes for character consistency and LoRA support
RUN comfy-node-install comfyui_ipadapter_plus comfyui-impact-pack

# ─── BASE MODELS ───

# Flux.1-dev-fp8 (base model, handles most content)
RUN comfy model download \
  --url https://huggingface.co/Comfy-Org/flux1-dev/resolve/main/flux1-dev-fp8.safetensors \
  --relative-path models/checkpoints \
  --filename flux1-dev-fp8.safetensors

# Pony Diffusion V6 XL (best for comic/illustration, uncensored SDXL)
RUN comfy model download \
  --url https://huggingface.co/AstraliteHeart/pony-diffusion-v6xl/resolve/main/ponyDiffusionV6XL.safetensors \
  --relative-path models/checkpoints \
  --filename ponyDiffusionV6XL.safetensors

# ─── NSFW LORAS (for explicit content on top of base Flux) ───

# Flux NSFW Uncensored (top rated, 328 likes on HuggingFace)
RUN comfy model download \
  --url https://huggingface.co/Heartsync/Flux-NSFW-uncensored/resolve/main/flux_nsfw.safetensors \
  --relative-path models/loras \
  --filename flux-nsfw-uncensored.safetensors

# Lustly.ai NSFW LoRA (explicit content, 2K+ downloads)
RUN comfy model download \
  --url https://huggingface.co/lustlyai/Flux_Lustly.ai_Uncensored_nsfw_v1/resolve/main/Flux_Lustly.ai_Uncensored_nsfw_v1.safetensors \
  --relative-path models/loras \
  --filename flux-lustly-nsfw.safetensors

# ─── CHARACTER CONSISTENCY ───

# IP-Adapter face model (keeps face consistent across panels)
RUN comfy model download \
  --url https://huggingface.co/h94/IP-Adapter/resolve/main/sdxl_models/ip-adapter-plus-face_sdxl_vit-h.safetensors \
  --relative-path models/ipadapter \
  --filename ip-adapter-plus-face_sdxl_vit-h.safetensors

# CLIP Vision encoder (required by IP-Adapter)
RUN comfy model download \
  --url https://huggingface.co/h94/IP-Adapter/resolve/main/models/image_encoder/model.safetensors \
  --relative-path models/clip_vision \
  --filename CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors
