// FIX: Use environment variable so you can set your own backend URL after deploying.
// Set REACT_APP_SERVER_URL in your frontend environment on Render (or .env file locally).
// Example: REACT_APP_SERVER_URL=https://your-backend.onrender.com
const server = process.env.REACT_APP_SERVER_URL || "http://localhost:8000";

export default server;
