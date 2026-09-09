import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.model_service import ModelService
import cv2
import numpy as np

if len(sys.argv) > 1:
    image_path = sys.argv[1]
else:
    image_path = "../test_assets/test_skin.jpg"

if not os.path.exists(image_path):
    print(f"Error: Test image not found at '{image_path}'!")
    print("Please specify a valid image path or place a test image in the 'test_assets' directory.")
    sys.exit(1)

print("Initializing ModelService...")
model_service = ModelService()

print(f"\n==================================================")
print(f"Diagnostic Test on: {image_path}")
print(f"==================================================")

img = cv2.imread(image_path)
if img is not None:
    print(f"[Image Diagnostics]")
    print(f"  Shape: {img.shape}")
    print(f"  Dtype: {img.dtype}")
    print(f"  Pixel min/max: min={img.min()}, max={img.max()}")
    print(f"  Pixel mean: {img.mean():.2f}")
    
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    _, s, v = cv2.split(hsv)
    std_v = np.std(v)
    std_s = np.std(s)
    
    h, w, _ = img.shape
    cy, cx = h // 2, w // 2
    dy, dx = h // 4, w // 4
    center_crop = img[cy-dy:cy+dy, cx-dx:cx+dx]
    avg_center = np.mean(center_crop)
    avg_full = np.mean(img)
    contrast = max(0.0, float(avg_full - avg_center))
    
    print(f"\n[Hybrid Pre-check Heuristic Values]")
    print(f"  Contrast (full_mean - center_mean): {contrast:.4f}")
    print(f"  Value channel standard deviation (std_v): {std_v:.4f}")
    print(f"  Saturation channel standard deviation (std_s): {std_s:.4f}")
else:
    print("Failed to read image with OpenCV!")

if not model_service.stub_mode and model_service.session is not None:
    sess = model_service.session
    print(f"\n[ONNX Inference]")
    try:
        preprocessed = model_service.preprocess_image(image_path)
        outputs = sess.run(None, {"input": preprocessed})
        raw_output = outputs[0][0]
        
        exp_output = np.exp(raw_output - np.max(raw_output))
        probabilities = exp_output / np.sum(exp_output)
        
        print(f"  Raw Output Logits: {raw_output}")
        print(f"  Model Output Probabilities:")
        print(f"    - Benign (Class 0): {probabilities[0]:.6f}")
        print(f"    - Malignant (Class 1): {probabilities[1]:.6f}")
    except Exception as e:
        print(f"  Inference error during diagnostics: {e}")
else:
    print(f"\n[Running in STUB/Fallback Mode]")

print(f"\n[Final Output]")
result = model_service.predict(image_path)
print(f"  Prediction Result: {result}")

print(f"\n[Heatmap Generation]")
try:
    from services.gradcam_service import GradCAMService
    gradcam_service = GradCAMService(model_service)
    saved_fn = gradcam_service.generate_heatmap(image_path)
    print(f"  Heatmap saved to uploads/heatmaps/{saved_fn}")
except Exception as e:
    print(f"  Heatmap generation error: {e}")

print(f"==================================================")

