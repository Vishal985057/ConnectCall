# ConnectCall — Complete Render Deployment Guide

Deploy the **backend** as a Web Service and the **frontend** as a Static Site on Render.com.

---

## What you need before starting

- A [GitHub](https://github.com) account (free)
- A [Render](https://render.com) account (free)
- A [MongoDB Atlas](https://cloud.mongodb.com) account (free)

---

## Step 1 — Push your code to GitHub

1. Go to https://github.com → **New repository** → name it `connectcall` → **Create**.
2. Upload the entire `ConnectCall` folder so your repo looks like:
   ```
   connectcall/
   ├── backend/
   │   ├── src/
   │   ├── controllers/
   │   ├── models/
   │   ├── routes/
   │   └── package.json
   └── frontend/
       ├── src/
       ├── index.html
       └── package.json
   ```
   You can drag-and-drop via the GitHub website, or use `git push`.

---

## Step 2 — Create a free MongoDB database

1. Go to https://cloud.mongodb.com → Sign up → **Build a Database** → choose **M0 Free**.
2. Pick any cloud region → **Create**.
3. Under **Security → Database Access** → **Add New Database User**:
   - Username: `connectcalluser`
   - Password: choose a strong password → **Add User**
4. Under **Security → Network Access** → **Add IP Address** → click **Allow Access from Anywhere** → **Confirm**.
5. On your cluster, click **Connect** → **Drivers** → copy the connection string:
   ```
   mongodb+srv://connectcalluser:<password>@cluster0.xxxxx.mongodb.net/connectcall?retryWrites=true&w=majority
   ```
   Replace `<password>` with your actual password. **Save this string.**

---

## Step 3 — Deploy the Backend (Web Service)

1. Go to https://render.com → **New** → **Web Service**.
2. Connect your GitHub account and select your `connectcall` repo.
3. Fill in the settings:

   | Setting | Value |
   |---|---|
   | **Name** | `connectcall-backend` |
   | **Root Directory** | `backend` |
   | **Environment** | `Node` |
   | **Build Command** | `npm install` |
   | **Start Command** | `npm start` |
   | **Instance Type** | Free |

4. Under **Environment Variables**, click **Add Environment Variable**:

   | Key | Value |
   |---|---|
   | `MONGODB_URI` | *(your MongoDB connection string from Step 2)* |
   | `FRONTEND_URL` | *(leave empty for now — you'll fill this in Step 5)* |

5. Click **Create Web Service**.
6. Wait 2–3 minutes for the first deploy. You'll get a URL like:
   ```
   https://connectcall-backend.onrender.com
   ```
   ✅ **Copy this URL** — you need it in the next step.

---

## Step 4 — Deploy the Frontend (Static Site)

1. On Render → **New** → **Static Site**.
2. Select the same `connectcall` repo.
3. Fill in the settings:

   | Setting | Value |
   |---|---|
   | **Name** | `connectcall-frontend` |
   | **Root Directory** | `frontend` |
   | **Build Command** | `npm install && npm run build` |
   | **Publish Directory** | `dist` |

4. Under **Environment Variables**, add:

   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://connectcall-backend.onrender.com` *(from Step 3 — no trailing slash)* |

5. Click **Create Static Site**.
6. Wait 2–4 minutes. You'll get a URL like:
   ```
   https://connectcall-frontend.onrender.com
   ```
   ✅ **Copy this URL** — you need it in the next step.

---

## Step 5 — Update Backend CORS

> This step prevents "blocked by CORS" errors when the frontend calls the backend.

1. In Render, open your **connectcall-backend** Web Service.
2. Click **Environment** in the left sidebar.
3. Set `FRONTEND_URL` to your frontend URL:
   ```
   https://connectcall-frontend.onrender.com
   ```
4. Click **Save Changes**. Render redeploys the backend automatically (~1 min).

---

## Step 6 — Test everything

1. Open your frontend URL on a desktop browser.
2. Register an account and click **New meeting**.
3. Copy the meeting link and open it on your phone or another browser tab.
4. Join with the code — you should see and hear each other.

✅ Done! Your app is live.

---

## Troubleshooting

### Video / audio not connecting
- Confirm `VITE_API_URL` in the frontend env is set to the backend URL (no trailing slash).
- The app uses public TURN servers (`openrelay.metered.ca`) for cross-network calls. If connectivity still fails, sign up for a free account at https://www.metered.ca and replace the ICE config in `frontend/src/pages/Meet.jsx` with your own credentials.
- Screen sharing is not available on iOS Safari (browser limitation, unrelated to ConnectCall).

### "Network Error" / API calls fail
- Double-check `FRONTEND_URL` in the backend matches the static site URL exactly (no trailing slash).
- Check the backend logs on Render for MongoDB connection errors.

### Backend slow to respond / socket disconnect
- Free Render services sleep after **15 minutes of no traffic**. The first wake-up takes ~30 seconds. Participants should wait a moment and try again. To keep it always-on, upgrade to a Render Starter plan ($7/month).

### CORS errors in browser console
- Make sure `FRONTEND_URL` in the backend environment is correct and the backend has redeployed since you saved the value.

---

## Local development

```bash
# Terminal 1 — Backend
cd backend
npm install
# Create backend/.env:
#   MONGODB_URI=mongodb+srv://...
#   PORT=8000
node src/index.js

# Terminal 2 — Frontend
cd frontend
npm install
# Create frontend/.env:
#   VITE_API_URL=   (empty — Vite auto-proxies to localhost:8000)
npm run dev
```

Open http://localhost:5173 in your browser.

---

## Summary of environment variables

### Backend (`backend/.env` / Render environment)

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | ✅ Yes | MongoDB Atlas connection string |
| `FRONTEND_URL` | ✅ Yes (production) | Frontend URL for CORS (no trailing slash) |
| `PORT` | No | Render sets this automatically |

### Frontend (`frontend/.env` / Render environment)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | ✅ Yes (production) | Backend URL (no trailing slash). Leave empty for local dev. |
