// import express from "express";
// import { WebSocketServer } from "ws";
// import dotenv from "dotenv";
// import Groq from "groq-sdk";
// import cors from "cors";
// import path from "path";

// dotenv.config();

// const app = express();
// app.use(cors());
// const PORT = process.env.PORT || 8000;

// // -------------------- Serve frontend --------------------
// const __dirname = path.resolve();
// app.use(express.static(path.join(__dirname, "../frontend")));

// // For any unknown route, serve index.html
// app.get("*", (req, res) => {
//   res.sendFile(path.join(__dirname, "../frontend", "index.html"));
// });
// // -------------------------------------------------------

// const server = app.listen(PORT, () =>
//   console.log(`✅ Backend running at http://localhost:${PORT}`)
// );

// const wss = new WebSocketServer({ server });
// const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// wss.on("connection", (ws) => {
//   console.log("🟢 Client connected via WebSocket");

//   ws.on("message", async (message) => {
//     console.log("User:", message.toString());

//     try {
//       const response = await groq.chat.completions.create({
//         model: "llama-3.1-8b-instant",
//         messages: [{ role: "user", content: message.toString() }],
//         stream: true,
//       });

//       for await (const chunk of response) {
//         const token = chunk.choices?.[0]?.delta?.content || "";
//         if (token) ws.send(token);
//       }
//     } catch (err) {
//       console.error("Error:", err);
//       ws.send("⚠️ Something went wrong. Please try again.\n");
//     }
//   });

//   ws.on("close", () => console.log("🔴 Client disconnected"));
// });




import express from "express";
import { WebSocketServer } from "ws";
import dotenv from "dotenv";
import Groq from "groq-sdk";
import cors from "cors";

dotenv.config();

const app = express();
app.use(cors());

// 🔥 IMPORTANT: Use Render/Railway port if provided
const PORT = process.env.PORT || 8000;

app.get("/", (req, res) => {
  res.send("🟢 Groq WebSocket Server is running!");
});

// Start HTTP server
const server = app.listen(PORT, () =>
  console.log(`✅ Backend running at http://localhost:${PORT}`)
);

// Create WebSocket server on top of Express
const wss = new WebSocketServer({ server });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

wss.on("connection", (ws) => {
  console.log("🟢 Client connected via WebSocket");

  ws.on("message", async (message) => {
    console.log("User:", message.toString());

    try {
      const response = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: message.toString() }],
        stream: true,
      });

      // Stream each token to the client
      for await (const chunk of response) {
        const token = chunk.choices?.[0]?.delta?.content || "";
        if (token) ws.send(token);
      }
    } catch (err) {
      console.error("❌ Error:", err);
      ws.send("⚠️ Something went wrong. Please try again.");
    }
  });

  ws.on("close", () => console.log("🔴 Client disconnected"));
});
