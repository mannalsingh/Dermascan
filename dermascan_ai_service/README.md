# DermaScan AI Service

This is the FastAPI microservice for DermaScan AI, providing CNN-based skin lesion classification and Grad-CAM heatmap generation.

## Architecture

* **WHY FastAPI**: FastAPI is asynchronous, fast, and auto-generates API documentation (Swagger). It's ideal for wrapping ML models where performance and high concurrency are important.
* **WHY EfficientNet-B0**: It achieves state-of-the-art accuracy with significantly fewer parameters compared to VGG/ResNet, making it perfect for efficient deployment and inference.
* **WHY Grad-CAM**: Explainability is vital in medical AI. Grad-CAM highlights which regions of the image influenced the prediction, giving doctors confidence that the AI is looking at the relevant lesion, not just random background pixels.

## Setup

1. Make sure Python 3.9+ is installed.
2. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Run the Service

You can start the server using uvicorn:
```bash
python main.py
```
Or directly:
```bash
uvicorn main:app --reload --port 8000
```

## Stub Mode vs Production Mode

Currently, the service runs in **Stub Mode**. It returns realistic mock predictions and synthetic heatmaps because the real trained `.h5` model file is not included (it's too large). This is great for frontend/backend integration testing and demoing to a professor.

### How to Integrate the Real Model
1. Place your real `dermascan_model.h5` inside the `models/` directory.
2. In `requirements.txt`, uncomment the `tensorflow` requirement and install it.
3. In `services/model_service.py`, uncomment the TensorFlow imports and the real inference code inside `predict()`.
4. In `services/gradcam_service.py`, implement the real Grad-CAM logic in `_real_gradcam()`.

## API Documentation

Once running, FastAPI auto-generates an interactive Swagger UI. Visit:
[http://localhost:8000/docs](http://localhost:8000/docs)

## Testing the API

Sample curl command to test the `/predict` endpoint:
```bash
curl -X POST "http://localhost:8000/predict" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@path_to_your_skin_lesion_image.jpg"
```
