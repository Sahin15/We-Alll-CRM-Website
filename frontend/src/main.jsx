import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "bootstrap/dist/css/bootstrap.min.css";
import "react-toastify/dist/ReactToastify.css";
import "react-datepicker/dist/react-datepicker.css";
import "./index.css";
import { initMobileDebug } from "./utils/mobileDebug";

// Initialize mobile debugging in production
initMobileDebug();

// Robust React mounting with error handling for iOS
try {
  const rootElement = document.getElementById("root");
  
  if (!rootElement) {
    throw new Error("Root element not found");
  }
  
  const root = ReactDOM.createRoot(rootElement);
  
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  
  console.log("React app mounted successfully");
} catch (error) {
  console.error("Failed to mount React app:", error);
  
  // Show error message to user
  const rootElement = document.getElementById("root");
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="display:flex;justify-content:center;align-items:center;height:100vh;background:#f8d7da;font-family:sans-serif;padding:20px;">
        <div style="text-align:center;color:#721c24;max-width:400px;">
          <h2 style="margin:0 0 10px;">App Error</h2>
          <p>Failed to start the application.</p>
          <p style="font-size:12px;color:#666;margin-top:10px;">${error.message}</p>
          <button onclick="location.reload()" style="margin-top:20px;padding:10px 20px;background:#dc3545;color:white;border:none;border-radius:5px;font-size:16px;cursor:pointer;">
            Reload Page
          </button>
        </div>
      </div>
    `;
  }
}
