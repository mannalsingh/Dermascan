

import cv2
import numpy as np
import os
from fastapi import HTTPException

MIN_IMAGE_SIZE = (50, 50)     
MAX_IMAGE_SIZE = 10 * 1024 * 1024  
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png'}

def validate_image(image_path: str) -> bool:

    if not os.path.exists(image_path):
        raise HTTPException(status_code=400, detail="Image file does not exist.")

    file_size = os.path.getsize(image_path)
    if file_size > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=400, detail="Image file size exceeds the 10MB limit.")

    _, ext = os.path.splitext(image_path)
    if ext.lower() not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file format. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")

    img = cv2.imread(image_path)
    if img is None:
        raise HTTPException(status_code=400, detail="File is corrupted or not a valid image.")

    h, w = img.shape[:2]
    if w < MIN_IMAGE_SIZE[0] or h < MIN_IMAGE_SIZE[1]:
        raise HTTPException(status_code=400, detail=f"Image dimensions are too small. Minimum is {MIN_IMAGE_SIZE[0]}x{MIN_IMAGE_SIZE[1]}.")

    if len(img.shape) != 3 or img.shape[2] != 3:
        raise HTTPException(status_code=400, detail="Image must have 3 color channels (RGB/BGR).")
        
    return True

def preprocess_for_display(image_path: str, target_size: tuple = (224, 224)) -> np.ndarray:
    
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not read image: {image_path}")

    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    img_resized = cv2.resize(img_rgb, target_size)

    img_normalized = img_resized.astype(np.float32) / 255.0
    
    return img_normalized
