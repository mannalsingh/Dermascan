# DermaScan AI Backend

Node.js and Express.js REST API backend for the DermaScan AI application.

## Setup Instructions

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Environment Variables:**
    *   Copy `.env.example` to a new file named `.env`.
    *   Fill in the required values (especially `MONGODB_URI` and `JWT_SECRET`).
    ```bash
    cp .env.example .env
    ```

3.  **Start the Server:**
    *   For development (uses nodemon for auto-restart):
        ```bash
        npm run dev
        ```
    *   For production:
        ```bash
        npm start
        ```

## Architecture

The backend follows an MVC-like structure (without views):

*   `server.js`: The entry point. Configures middleware and mounts routes.
*   `routes/`: Defines the API endpoints and maps them to controllers.
*   `controllers/`: Contains the business logic for handling requests and interacting with models.
*   `models/`: Mongoose schemas defining the database structure.
*   `middleware/`: Custom middleware (like JWT authentication and file uploads).

Flow: Request -> Routes -> Middleware (Auth/Upload) -> Controller -> Model (MongoDB) -> Response.

## Note on AI Service (Stub Mode)

If the actual FastAPI AI service is not running at `AI_SERVICE_URL`, the `uploadScreening` controller will fall back to a **STUB MODE**. It will catch the connection error and return mock prediction data (Benign, 87% confidence) so that you can continue developing and testing the mobile app without needing the AI service running. **Remove this fallback before production.**

## API Endpoints

### Auth
*   **POST** `/api/auth/register`
    *   Body: `{ "name": "John Doe", "email": "john@example.com", "password": "password123" }`
    *   Response: `{ "success": true, "token": "jwt_token...", "user": { ... } }`
*   **POST** `/api/auth/login`
    *   Body: `{ "email": "john@example.com", "password": "password123" }`

### User
*   **GET** `/api/user/profile` (Requires Auth)
*   **PUT** `/api/user/profile` (Requires Auth)

### Screening
*   **POST** `/api/screening/upload` (Requires Auth)
    *   Body: `multipart/form-data` with an image file under the key `image`.
*   **GET** `/api/screening/history` (Requires Auth)
*   **GET** `/api/screening/:id` (Requires Auth)
*   **GET** `/api/screening/:id/report` (Requires Auth) - Downloads PDF.

### Analytics
*   **GET** `/api/analytics/summary` (Requires Auth)
