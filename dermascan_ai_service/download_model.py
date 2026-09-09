import os
import httpx

url = "https://huggingface.co/Rochard112/melanoma-detection-model/resolve/main/melanoma_model.onnx"
dest_dir = "models"
dest_path = os.path.join(dest_dir, "dermascan_model.onnx")

os.makedirs(dest_dir, exist_ok=True)

print(f"Downloading model from {url} to {dest_path}...")

try:
    with httpx.stream("GET", url, follow_redirects=True, timeout=120.0) as r:
        r.raise_for_status()
        with open(dest_path, "wb") as f:
            for chunk in r.iter_bytes(chunk_size=8192):
                if chunk:
                    f.write(chunk)
    print("Download completed successfully!")
except Exception as e:
    print(f"Error occurred: {e}")
