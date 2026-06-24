# ConnectCall — Render Deployment Guide

This guide walks you through deploying ConnectCall on Render.com.
You will create **two services**:
- A **Web Service** (backend — Node.js + Express + Socket.io)
- A **Static Site** (frontend — React + Vite)

---

## Step 1 — Push your code to GitHub

1. Create a new repository on GitHub (e.g. `connectcall`).
2. Upload or push the `ConnectCall` folder into the repo root so GitHub has:
   ```
   connectcall/
   ├── backend/
   └── frontend/
   ```
3. Make sure **both** `backend/` and `frontend/` are committed.

---

## Step 2 — Create a MongoDB database (free)

1. Go to [https://cloud.mongodb.com](https://cloud.mongodb.com) and sign up or log in.
2. Create a **free M0 cluster** (choose any region).
3. Inside the cluster, click **Connect → Connect your application**.
4. Copy the connection string. It looks like:
   ```
   mongodb+srv://youruser:yourpassword@cluster0.xxxxx.mongodb.net/connectcall?retryWrites=true&w=majority
   ```
5. Save this string — you will use it as `MONGODB_URI` below.

---

## Step 3 — Deploy the Backend (Web Service)

1. Go to [https://render.com](https://render.com) and sign up or log in.
2. Click **New → Web Service**.
3. Connect your GitHub account and select your repo.
4. Fill in the settings:

   | Setting | Value |
   |---|---|
   | **Name** | `connectcall-backend` |
   | **Root Directory** | `backend` |
   | **Environment** | `Node` |
   | **Build Command** | `npm install` |
   | **Start Command** | `npm start` |
   | **Instance Type** | Free |

5. Click **Advanced → Add Environment Variable** and add:

   | Key | Value |
   |---|---|
   | `MONGODB_URI` | *(your MongoDB connection string from Step 2)* |
   | `FRONTEND_URL` | *(leave blank for now — you will fill this in Step 5)* |

6. Click **Create Web Service**.
7. Wait for the deploy to finish (2–3 min). You will see a URL like:
   ```
   https://connectcall-backend.onrender.com
   ```
   **Copy this URL** — you need it in the next step.

---

## Step 4 — Deploy the Frontend (Static Site)

1. On Render, click **New → Static Site**.
2. Select the same repo.
3. Fill in the settings:

   | Setting | Value |
   |---|---|
   | **Name** | `connectcall-frontend` |
   | **Root Directory** | `frontend` |
   | **Build Command** | `npm install && npm run build` |
   | **Publish Directory** | `dist` |

4. Click **Advanced → Add Environment Variable** and add:

   | Key | Value |
   |---|---|
   | `VITE_API_URL` | *(the backend URL from Step 3, e.g. `https://connectcall-backend.onrender.com`)* |

5. Click **Create Static Site**.
6. Wait for the deploy to finish. You will see a URL like:
   ```
   https://connectcall-frontend.onrender.com
   ```
   **Copy this URL**.

---

## Step 5 — Update Backend CORS to allow the Frontend

1. In Render, open your **connectcall-backend** Web Service.
2. Go to **Environment**.
3. Update the `FRONTEND_URL` variable to your frontend URL:
   ```
   https://connectcall-frontend.onrender.com
   ```
4. Click **Save Changes**. Render will redeploy the backend automatically.

---

## Step 6 — Test it

1. Open `https://connectcall-frontend.onrender.com` in your browser.
2. Register an account and start a meeting.
3. Open the same URL on your phone or another device.
4. Join with the meeting code — you should see and hear each other.

---

## Troubleshooting

**Video / audio not connecting between devices**
- Make sure the backend is deployed and its URL is set in `VITE_API_URL`.
- On Render Free tier, the backend sleeps after 15 minutes of inactivity. The first request after sleep takes ~30 seconds. Wait a moment and try again.
- The app uses public TURN servers (`openrelay.metered.ca`) for cross-network calls — these are free and work for most networks.

**"Network Error" or API calls failing**
- Check that `VITE_API_URL` does NOT have a trailing slash.
- Make sure `FRONTEND_URL` in the backend matches exactly (no trailing slash).

**Socket.io disconnecting**
- Render Free web services have 15-min sleep. Upgrade to a Starter plan ($7/mo) if you want the backend to always be on.

---

## Local Development

```bash
# Terminal 1 — Backend
cd backend
npm install
# create backend/.env with MONGODB_URI=your_connection_string
node src/index.js

# Terminal 2 — Frontend
cd frontend
npm install
# VITE_API_URL is blank so Vite proxies /api and /socket.io to localhost:8000
npm run dev
```

Open http://localhost:5173 in your browser.
