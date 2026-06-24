# Deployment Guide — Video Conferencing App

## What was fixed
1. **TURN relay servers added** — without TURN, calls only work on the same WiFi/network.
   STUN alone cannot relay traffic across different networks (mobile vs home WiFi, etc.)
2. **`ontrack` replaces deprecated `onaddstream`** — Chrome removed `onaddstream`; this
   is why remote video never appeared on other devices.
3. **`addTrack` replaces deprecated `addStream`** — same reason as above.
4. **`useEffect` infinite loop fixed** — missing `[]` caused `getPermissions()` to run
   on every render, constantly restarting the camera and corrupting the stream.
5. **Video/audio toggle fixed** — now uses `track.enabled` instead of re-creating the
   stream (which caused WebRTC renegotiation on every mic/camera click).
6. **App.js syntax error fixed** — `path='/home's` typo broke the router.
7. **Backend URL & MongoDB now use env variables** — no more hardcoded third-party server.

---

## Step 1 — MongoDB Atlas (Free)
1. Go to https://cloud.mongodb.com and sign up / log in.
2. Create a free M0 cluster.
3. Under **Database Access**: Add a DB user with a username & password.
4. Under **Network Access**: Add `0.0.0.0/0` (allow all IPs).
5. Click **Connect → Drivers** and copy the connection string:
   `mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/videocall?retryWrites=true&w=majority`

---

## Step 2 — Deploy Backend on Render (Free)
1. Push the `backend/` folder to a GitHub repository.
2. Go to https://render.com → **New → Web Service**.
3. Connect your GitHub repo.
4. Settings:
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Under **Environment Variables**, add:
   | Key | Value |
   |-----|-------|
   | `MONGODB_URI` | your Atlas connection string |
   | `FRONTEND_URL` | (leave blank for now, fill in after Step 3) |
   | `PORT` | `8000` |
6. Click **Create Web Service**. Wait for it to deploy.
7. Copy your backend URL — it will look like `https://your-backend.onrender.com`.

---

## Step 3 — Deploy Frontend on Render (Free)
1. Push the `frontend/` folder to a GitHub repository.
2. Go to https://render.com → **New → Static Site**.
3. Connect your GitHub repo.
4. Settings:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `build`
5. Under **Environment Variables**, add:
   | Key | Value |
   |-----|-------|
   | `REACT_APP_SERVER_URL` | `https://your-backend.onrender.com` (from Step 2) |
6. Click **Create Static Site**.
7. Copy your frontend URL — e.g. `https://your-app.onrender.com`.

---

## Step 4 — Update Backend CORS
Go back to your backend service on Render → **Environment** → set:
```
FRONTEND_URL = https://your-app.onrender.com
```
Then click **Manual Deploy → Deploy latest commit** to restart.

---

## Step 5 — Test Cross-Device
1. Open `https://your-app.onrender.com` on **Device A** (e.g. laptop).
2. Register / Login → go to Home → note the meeting code.
3. Open the same URL on **Device B** (e.g. phone) on a **different network** (mobile data).
4. Enter the same meeting code → both devices should see/hear each other.

---

## Local Development
```bash
# Terminal 1 — Backend
cd backend
cp .env.example .env        # fill in your MONGODB_URI
npm install
npm run dev                 # runs on port 8000

# Terminal 2 — Frontend
cd frontend
cp .env.example .env        # REACT_APP_SERVER_URL=http://localhost:8000
npm install
npm start                   # opens on port 3000
```
