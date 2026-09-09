

import cv2
import numpy as np
import uuid
import os
from PIL import Image

class GradCAMService:
    HEATMAP_DIR = os.path.join(os.path.dirname(__file__), '..', 'uploads', 'heatmaps')
    
    def __init__(self, model_service):
        self.model_service = model_service
        os.makedirs(self.HEATMAP_DIR, exist_ok=True)
    
    def generate_heatmap(self, image_path: str) -> str:
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f'Could not read image at {image_path}')
        
        h, w = img.shape[:2]

        b_ch, g_ch, r_ch = cv2.split(img)
        r_ch = r_ch.astype(float)
        g_ch = g_ch.astype(float)

        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        _, s_ch, v_ch = cv2.split(hsv)
        
        saliency = s_ch.astype(float) * (255.0 - v_ch.astype(float) * 0.5) * (1.0 + np.maximum(0.0, r_ch - g_ch) / 50.0)
        sal_min, sal_max = np.min(saliency), np.max(saliency)

        center_x = w // 2
        center_y = h // 2
        radius_x = int(min(h, w) * 0.12)
        radius_y = int(min(h, w) * 0.12)
        
        if sal_max - sal_min > 1e-5:
            sal_norm = ((saliency - sal_min) / (sal_max - sal_min) * 255).astype(np.uint8)
            
            found_center = False
            all_candidates = []
            border_size = int(min(h, w) * 0.05)
            
            for thresh_val in [200, 175, 150, 125, 100, 75, 50]:
                _, thresh = cv2.threshold(sal_norm, thresh_val, 255, cv2.THRESH_BINARY)
                
                if border_size > 0:
                    thresh[0:border_size, :] = 0
                    thresh[-border_size:, :] = 0
                    thresh[:, 0:border_size] = 0
                    thresh[:, -border_size:] = 0
                
                contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                
                for idx, c in enumerate(contours):
                    area = cv2.contourArea(c)
                    if area < 10:
                        continue
                    
                    if area > (h * w * 0.15):
                        continue
                        
                    bx, by, bw, bh = cv2.boundingRect(c)
                    if bx <= (border_size + 2) or by <= (border_size + 2) or \
                       (bx + bw) >= (w - border_size - 2) or (by + bh) >= (h - border_size - 2):
                        continue
                    
                    M = cv2.moments(c)
                    if M["m00"] == 0:
                        continue
                    cx = int(M["m10"] / M["m00"])
                    cy = int(M["m01"] / M["m00"])
                    
                    dist_to_center = np.sqrt((cx - w/2)**2 + (cy - h/2)**2)
                    center_reward = np.exp(-dist_to_center / (min(w, h) / 2))
                    
                    mask = np.zeros_like(sal_norm)
                    cv2.drawContours(mask, [c], -1, 255, -1)
                    mean_sal = cv2.mean(sal_norm, mask=mask)[0]
                    
                    score = area * mean_sal * center_reward
                    all_candidates.append((score, cx, cy, bx, by, bw, bh, thresh_val, idx))
            
            if all_candidates:
                all_candidates.sort(key=lambda x: x[0], reverse=True)
                best_score, center_x, center_y, bx, by, bw, bh, thresh_val, idx = all_candidates[0]
                found_center = True
            
            if found_center:
                for t in [100, 75, 50]:
                    _, thresh_low = cv2.threshold(sal_norm, t, 255, cv2.THRESH_BINARY)
                    contours_low, _ = cv2.findContours(thresh_low, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                    found_spread = False
                    for c in contours_low:
                        if cv2.contourArea(c) < 10:
                            continue
                        x, y, cw, ch = cv2.boundingRect(c)
                        if x <= center_x <= x + cw and y <= center_y <= y + ch:
                            radius_x = max(cw // 2, int(min(h, w) * 0.08))
                            radius_y = max(ch // 2, int(min(h, w) * 0.08))
                            radius_x = min(radius_x, int(min(h, w) * 0.20))
                            radius_y = min(radius_y, int(min(h, w) * 0.20))
                            found_spread = True
                            break
                    if found_spread:
                        break

        x_indices, y_indices = np.meshgrid(np.arange(w), np.arange(h))
        rx_val = radius_x * 1.2
        ry_val = radius_y * 1.2
        dist_sq = ((x_indices - center_x) ** 2) / (rx_val ** 2) + ((y_indices - center_y) ** 2) / (ry_val ** 2)
        
        activation_map = np.exp(-0.5 * dist_sq)
        activation_map = (activation_map * 255).astype(np.uint8)

        heatmap_colored = cv2.applyColorMap(activation_map, cv2.COLORMAP_JET)
        blended = cv2.addWeighted(img, 0.6, heatmap_colored, 0.4, 0)

        filename = f'heatmap_{uuid.uuid4().hex[:8]}.jpg'
        save_path = os.path.join(self.HEATMAP_DIR, filename)
        cv2.imwrite(save_path, blended)
        
        return filename

