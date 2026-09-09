

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
import os

from routers import predict

os.makedirs('uploads/heatmaps', exist_ok=True)
os.makedirs('uploads/temp', exist_ok=True)

app = FastAPI(
    title='DermaScan AI Service',
    description='CNN-based skin lesion classification with Grad-CAM heatmap generation',
    version='1.0.0'
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],  
    allow_methods=['*'],
    allow_headers=['*'],
)

app.mount('/heatmaps', StaticFiles(directory='uploads/heatmaps'), name='heatmaps')

app.include_router(predict.router)

@app.get('/')
def root():
    return {'service': 'DermaScan AI Service', 'status': 'running', 'version': '1.0.0'}

@app.get('/health')
def health():
    from routers.predict import model_service
    import os
    return {
        'status': 'ok', 
        'message': 'AI service is ready',
        'model_path': model_service.MODEL_PATH,
        'model_exists': os.path.exists(model_service.MODEL_PATH),
        'stub_mode': model_service.stub_mode,
        'has_session': model_service.session is not None
    }

if __name__ == '__main__':
    uvicorn.run('main:app', host='0.0.0.0', port=8000, reload=True)
