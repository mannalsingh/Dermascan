

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import shutil
import uuid
import os
from services.model_service import ModelService
from services.gradcam_service import GradCAMService
from utils.image_utils import validate_image

router = APIRouter(tags=['Prediction'])

model_service = ModelService()
gradcam_service = GradCAMService(model_service)

@router.post('/predict')
async def predict_image(file: UploadFile = File(...)):

    os.makedirs('uploads/temp', exist_ok=True)

    temp_filename = f"temp_{uuid.uuid4().hex}.jpg"
    temp_path = os.path.join('uploads/temp', temp_filename)
    
    try:
        
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        validate_image(temp_path)

        prediction_result = model_service.predict(temp_path)
        prediction = prediction_result.get('prediction')
        confidence_score = prediction_result.get('confidence_score')

        heatmap_filename = gradcam_service.generate_heatmap(temp_path)
        
        return JSONResponse({
            'prediction': prediction,
            'confidence_score': confidence_score,
            'heatmap_url': f'http://127.0.0.1:8000/heatmaps/{heatmap_filename}',
            'model_version': '1.0.0-stub'
        })
        
    except HTTPException as he:
        
        raise he
    except Exception as e:
        
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        
        if os.path.exists(temp_path):
            os.remove(temp_path)
