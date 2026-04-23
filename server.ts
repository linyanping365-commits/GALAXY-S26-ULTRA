import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Postback API endpoint requested by the user
  app.get("/api/postback", (req, res) => {
    const { uid, oid, amt, title } = req.query;
    console.log("Postback received:", { uid, oid, amt, title });
    
    // Simulate successful sync with the structure expected by the optimized frontend
    res.json({ 
      status: "success", 
      message: "Sync completed", 
      received: { 
        userId: uid, 
        promoOffer: oid, 
        payout: amt, 
        title: title 
      } 
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
