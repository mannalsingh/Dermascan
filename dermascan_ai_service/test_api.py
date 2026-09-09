import httpx

url = "http://127.0.0.1:8000/predict"
image_path = "../test_assets/test_skin.jpg"

print(f"Sending POST request to {url} with {image_path}...")
try:
    with open(image_path, "rb") as f:
        files = {"file": ("test_skin.jpg", f, "image/jpeg")}
        response = httpx.post(url, files=files, timeout=60.0)
    print("Status Code:", response.status_code)
    print("JSON Response:", response.json())
except Exception as e:
    print("Error occurred:", e)
