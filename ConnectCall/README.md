# ConnectCall — Video Conferencing App

A full-featured, browser-based HD video conferencing application built with React (frontend) and Node.js/Express/Socket.io (backend).

## Features

- HD video & audio calls via WebRTC (peer-to-peer)
- Host-controlled waiting room (admit / deny)
- Real-time in-meeting chat with message history
- Screen sharing
- Raise / lower hand
- Speaker view & grid view
- Meeting history per user
- Mute / unmute mic & camera
- Shareable meeting links and codes
- Fully responsive — works on desktop and mobile browsers

---

## Project Structure

```
ConnectCall/
├── backend/                  # Node.js + Express + Socket.io API server
│   ├── src/index.js          # App entry point
│   ├── controllers/
│   │   └── socketManager.js  # WebRTC signaling + room management
│   ├── models/
│   │   ├── user.model.js     # Mongoose User schema
│   │   └── meeting.model.js  # Mongoose Meeting schema
│   ├── routes/
│   │   └── index.js          # REST API routes (auth, history)
│   ├── .gitignore
│   └── package.json
│
├── frontend/                 # React + Vite + Tailwind CSS SPA
│   ├── src/
│   │   ├── lib/
│   │   │   ├── AuthContext.jsx   # Auth state (login/logout/token)
│   │   │   └── api.js            # Fetch wrapper for REST API
│   │   ├── pages/
│   │   │   ├── Landing.jsx   # Public marketing page
│   │   │   ├── Auth.jsx      # Login / register page
│   │   │   ├── Home.jsx      # Dashboard
│   │   │   ├── History.jsx   # Past meetings list
│   │   │   └── Meet.jsx      # Full video call room
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── .gitignore
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## Local Development

### Prerequisites
- Node.js 18+
- MongoDB (local install or MongoDB Atlas free tier)

### 1. Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure backend

Create `backend/.env`:

```
PORT=8000
MONGODB_URI=mongodb://localhost:27017/connectcall
FRONTEND_URL=http://localhost:5173
```

For MongoDB Atlas use your Atlas connection string instead.

### 3. Run backend

```bash
cd backend
npm run dev
```

Server starts on http://localhost:8000

### 4. Run frontend

```bash
cd frontend
npm run dev
```

App starts on http://localhost:5173 — Vite proxies /api and /socket.io to the backend automatically.

---

## Deploying on Render — Step by Step

You will deploy:
1. Backend → Render **Web Service** (Node.js)
2. Frontend → Render **Static Site** (built React)
3. Database → **MongoDB Atlas** (free M0 cluster)

---

### STEP 1 — Set up MongoDB Atlas (free)

1. Go to https://www.mongodb.com/atlas and create a free account.
2. Create a free **M0** cluster (any region).
3. Under **Database Access**: create a user with Read and write permissions. Note the username and password.
4. Under **Network Access**: click Add IP Address → Allow Access from Anywhere (0.0.0.0/0). Required for Render.
5. On your cluster, click Connect → Drivers → Node.js. Copy the connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   Replace `<password>` with your database password, and add the DB name before the `?`:
   ```
   mongodb+srv://myuser:mypass@cluster0.xxxxx.mongodb.net/connectcall?retryWrites=true&w=majority
   ```
   Save this — you will need it soon.

---

### STEP 2 — Push code to GitHub

1. Create a new repository on https://github.com (can be private).
2. Initialize and push from your ConnectCall folder:

   Open your terminal in the ConnectCall folder, then:
   - Run: initialize a new repo
   - Run: add all files
   - Run: make an initial commit
   - Run: push to your new GitHub repo

   (Standard GitHub workflow — follow the instructions shown on your new repo page.)

---

### STEP 3 — Deploy Backend on Render (Web Service)

1. Go to https://render.com and sign in.
2. Click **New** → **Web Service**.
3. Connect GitHub and select your repository.
4. Configure the service:

   | Setting | Value |
   |---------|-------|
   | Name | connectcall-backend |
   | Root Directory | backend |
   | Runtime | Node |
   | Build Command | npm install |
   | Start Command | node src/index.js |
   | Instance Type | Free |

5. Add **Environment Variables**:

   | Key | Value |
   |-----|-------|
   | MONGODB_URI | Your Atlas connection string from Step 1 |
   | FRONTEND_URL | (leave blank for now — add after frontend deploy) |
   | NODE_ENV | production |

6. Click **Create Web Service** and wait for it to say **Live**.
7. Copy your backend URL (e.g. https://connectcall-backend.onrender.com). **Save it.**

> Free tier note: Render free services sleep after 15 min of inactivity. First wake takes ~30s.
> Upgrade to Starter ($7/mo) for always-on hosting.

---

### STEP 4 — Deploy Frontend on Render (Static Site)

1. In Render, click **New** → **Static Site**.
2. Select the same repository.
3. Configure:

   | Setting | Value |
   |---------|-------|
   | Name | connectcall-frontend |
   | Root Directory | frontend |
   | Build Command | npm install && npm run build |
   | Publish Directory | dist |

4. Add **Environment Variables**:

   | Key | Value |
   |-----|-------|
   | VITE_API_URL | Your backend URL from Step 3 (e.g. https://connectcall-backend.onrender.com) |

5. Click **Create Static Site**. Wait for build to finish.
6. Copy your frontend URL (e.g. https://connectcall-frontend.onrender.com). **Save it.**

---

### STEP 5 — Configure SPA Routing (critical!)

React Router requires the server to return index.html for all routes.

1. In your Static Site dashboard → **Redirects/Rewrites** tab.
2. Add a rewrite rule:
   - Source: `/*`
   - Destination: `/index.html`
   - Action: Rewrite
3. Save changes.

Without this, refreshing any page (e.g. /meet/abc-def) will return a 404.

---

### STEP 6 — Update backend CORS setting

1. Go back to your **connectcall-backend** Web Service.
2. Go to **Environment** tab → find FRONTEND_URL.
3. Set it to your frontend URL from Step 4.
4. Click **Save Changes** — Render redeploys automatically.

---

### STEP 7 — Test

1. Open your frontend URL.
2. Register an account, then create a new meeting.
3. Copy the meeting link and open it in a second browser window or device.
4. The host will see a notification to admit the second user.
5. Both users should see each other's video!

---

## Environment Variables Reference

### Backend

| Variable | Required | Description |
|----------|----------|-------------|
| PORT | No | Server port (default: 8000) |
| MONGODB_URI | YES | MongoDB Atlas connection string |
| FRONTEND_URL | Recommended | Frontend origin for CORS |
| NODE_ENV | No | Set to production in production |

### Frontend

| Variable | Required in prod | Description |
|----------|----------|-------------|
| VITE_API_URL | YES | Backend base URL |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6, Vite 5, Tailwind CSS 3 |
| Backend | Node.js 18+, Express 4, Socket.io 4 |
| Database | MongoDB + Mongoose 8 |
| Real-time | WebRTC (peer-to-peer), Socket.io (signaling + room management) |
| Auth | bcrypt password hashing, random token sessions |
| Hosting | Render (Web Service + Static Site) |
| DB Hosting | MongoDB Atlas |

---

## Troubleshooting

**CORS errors in browser console**
→ Make sure FRONTEND_URL on the backend matches your frontend's exact origin (no trailing slash).

**Remote video not showing**
→ WebRTC requires HTTPS. Both Render services use HTTPS by default.
→ Corporate firewalls may block WebRTC. For production, add a TURN server.

**Page refresh gives 404**
→ Add the SPA rewrite rule on Render Static Site (Step 5 above).

**Backend seems slow to respond**
→ Free tier sleeps after 15 min. First request after sleep takes ~30s. Upgrade to eliminate this.

**MongoDB connection error**
→ Ensure 0.0.0.0/0 is in Atlas Network Access.
→ Double-check your connection string username, password, and database name.
