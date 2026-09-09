# DermaScan AI – React Frontend

React.js + Tailwind CSS + Recharts frontend for the DermaScan AI skin cancer screening application.

## Stack
- **React 18** + React Router v6
- **Tailwind CSS** – responsive, mobile-first styling
- **Recharts** – analytics charts
- **Axios** – API communication with JWT interceptors
- **Vite** – build tool

## Setup & Running

### Prerequisites
- Node.js 18+
- Backend running at `localhost:5000`
- AI Service running at `localhost:8000`

### Install dependencies
```bash
npm install
```

### Run development server
```bash
npm run dev
```
Opens at: http://localhost:3000

### Build for production
```bash
npm run build
```

## Pages

| Route | Description |
|---|---|
| `/` | Landing / marketing page |
| `/login` | User login |
| `/register` | User registration |
| `/dashboard` | Main dashboard with stats & recent scans |
| `/screening` | Upload image + get AI prediction |
| `/history` | List of past screenings |
| `/history/:id` | Screening detail with Grad-CAM heatmap |
| `/analytics` | Pie, bar, and trend charts |
| `/profile` | User profile management |

## Architecture
```
React Frontend (port 3000)
   ↓ Vite proxy
Node.js Backend (port 5000)
   ↓
MongoDB Atlas + Python AI Service (port 8000)
```

## Notes
- JWT token stored in `localStorage`
- Vite dev proxy forwards `/api/*` → `localhost:5000` (no CORS issues in dev)
- Heatmap images served directly from AI service at `localhost:8000`
- Fully responsive: works on desktop and mobile browsers
