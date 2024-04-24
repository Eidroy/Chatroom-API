import express from "express";
import dotenv from "dotenv";
import authRoutes from "./routes/auth/authroute.mjs";
import lobbyRoutes from "./routes/lobbyroute.mjs";
import messageRoutes from "./routes/messageroute.mjs";
import userroutes from "./routes/userroute.mjs";
import pageroutes from "./routes/pageroute.mjs";

dotenv.config();

const server = express();

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
