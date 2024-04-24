import express from "express";
import dotenv from "dotenv";
import authRoutes from "./routes/auth/authroute.mjs";
import lobbyRoutes from "./routes/lobbyroute.mjs";
import messageRoutes from "./routes/messageroute.mjs";

dotenv.config();

const server = express();

server.use(express.json());

server.use("/auth", authRoutes);
server.use("/lobby", lobbyRoutes);
server.use("/message", messageRoutes);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
