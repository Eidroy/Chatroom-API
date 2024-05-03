import express from "express";
import dotenv from "dotenv";
import authRoutes from "./routes/auth/authroute.mjs";
import lobbyRoutes from "./routes/lobbyroute.mjs";
import messageRoutes from "./routes/messageroute.mjs";
import userroutes from "./routes/userroute.mjs";
import pageroutes from "./routes/pageroute.mjs";
import cors from "cors";

dotenv.config();

const server = express();

const allowedOrigins = [
  "https://lockerroomyb.netlify.app",
  "http://127.0.0.1:5173",
];
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "username"],
};

server.use(cors(corsOptions));

server.use(express.json());

server.use("/auth", authRoutes);
server.use("/lobby", lobbyRoutes);
server.use("/message", messageRoutes);
server.use("/users", userroutes);
server.use("/page", pageroutes);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
