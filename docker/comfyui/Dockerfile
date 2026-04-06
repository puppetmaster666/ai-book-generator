FROM runpod/worker-comfyui:5.1.0-base

# Install custom nodes for character consistency
RUN comfy-node-install comfyui_ipadapter_plus comfyui-impact-pack

# Download Pony Diffusion V6 XL (uncensored SDXL model for comics)
RUN comfy model download \
  --url https://huggingface.co/AstraliteHeart/pony-diffusion-v6xl/resolve/main/ponyDiffusionV6XL.safetensors \
  --relative-path models/checkpoints \
  --filename ponyDiffusionV6XL.safetensors

# Download FLUX.1-dev-fp8 as well (for realistic styles)
RUN comfy model download \
  --url https://huggingface.co/Comfy-Org/flux1-dev/resolve/main/flux1-dev-fp8.safetensors \
  --relative-path models/checkpoints \
  --filename flux1-dev-fp8.safetensors

# Download IP-Adapter face model (for character consistency)
RUN comfy model download \
  --url https://huggingface.co/h94/IP-Adapter/resolve/main/sdxl_models/ip-adapter-plus-face_sdxl_vit-h.safetensors \
  --relative-path models/ipadapter \
  --filename ip-adapter-plus-face_sdxl_vit-h.safetensors

# Download CLIP Vision encoder (required by IP-Adapter)
RUN comfy model download \
  --url https://huggingface.co/h94/IP-Adapter/resolve/main/models/image_encoder/model.safetensors \
  --relative-path models/clip_vision \
  --filename CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors
