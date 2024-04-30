import express, { query } from "express";
import bcrypt from "bcrypt";
import JWT from "jsonwebtoken";
import dotenv from "dotenv";
import { promisify } from "util";
import mariadb from "mariadb";
import { RateLimiterMemory } from "rate-limiter-flexible";

const pool = mariadb.createPool({
  database: "Lockerroom",
  host: "localhost",
  user: "root",
  password: "Marieke3005",
  connectionLimit: 1,
});

dotenv.config();

const limiter = new RateLimiterMemory({
  points: 5, // Number of points allowed
  duration: 3600, // Per hour
});

const server = express();
const sign = promisify(JWT.sign);
const verify = promisify(JWT.verify);

server.use(express.json());

// User registration endpoint
server.post("/register", async (req, res) => {
  const { email, nickname, password } = req.body;
  if (!email || !password || !nickname) {
    return res.status(400).send({ error: "Invalid request" });
  }
  try {
    const encryptedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO User (user_email, user_password, user_name) VALUES ("${email}", "${encryptedPassword}", "${nickname}")`
    );
    return res.send({ info: "User successfully created" });
  } catch (err) {
    console.log(err);
    return res.status(500).send({ error: "Internal server error" });
  }
});

// User login endpoint
server.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).send({ error: "Invalid request" });
  }

  try {
    // Check if IP address is being rate limited
    await limiter.consume(req.ip);

    const [rows] = await pool.query(
      `SELECT * FROM User WHERE user_email = "${email}"`
    );

    if (rows.length === 0) {
      return res.status(401).send({ error: "Invalid credentials" });
    }

    const id = rows.user_id;
    const nickname = rows.user_name;
    const hashedPassword = rows.user_password;
    const isPasswordValid = await bcrypt.compare(password, hashedPassword);

    if (!isPasswordValid) {
      // If password is incorrect, record failed login attempt
      await limiter.consume(req.ip);
      return res.status(401).send({ error: "Invalid credentials" });
    }

    const token = await sign({ id, nickname }, process.env.JWT_SECRET);
    return res.send({ token });
  } catch (err) {
    console.log(err);
    return res.status(500).send({ error: "Internal server error" });
  }
});

// Middleware to verify JWT token
server.use(async (req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).send({ error: "Unauthorized" });
  }
  try {
    const decoded = await verify(
      req.headers.authorization.split(" ")[1],
      process.env.JWT_SECRET
    );
    if (decoded !== undefined) {
      req.user = decoded;
      return next();
    }
  } catch (err) {
    console.log(err);
  }
  return res.status(403).send({ error: "Invalid token" });
});

// Create lobby endpoint
server.post("/lobby", async (req, res) => {
  const { nickname, Teamname } = req.body;
  if (!nickname) {
    return res.status(400).send({ error: "Invalid request" });
  }
  try {
    const [rows] = await pool.query(
      `SELECT * FROM User WHERE user_name = "${nickname}"`
    );
    const userId = rows.user_id;
    await pool.query(
      `INSERT INTO Lobby (admin_id, Lobby_name) VALUES (${userId}, "${Teamname}")`
    );
    const lobby = await pool.query(
      `SELECT * FROM Lobby WHERE Lobby_name = "${Teamname}"`
    );
    const lobbyId = lobby[0].lobby_id;
    await pool.query(
      `INSERT INTO Team (team_name, team_lobby_id) VALUES ("${Teamname}", ${lobbyId})`
    );
    const team = await pool.query(
      `SELECT * FROM Team WHERE team_name = "${Teamname}"`
    );
    const teamId = team[0].team_id;
    await pool.query(
      `INSERT INTO TeamMember (user_id, team_id) VALUES (${userId}, ${teamId})`
    );
    return res.send({ info: "Team created successfully" });
  } catch (err) {
    console.log(err);
    return res.status(500).send({ error: "Internal server error" });
  }
});

// Get messages from a lobby endpoint
server.get("/lobby/:lobbyId", async (req, res) => {
  const lobbyId = req.params.lobbyId;
  try {
    const rows = await pool.query(
      `SELECT * FROM Message WHERE lobby_id = ${lobbyId}`
    );
    return res.send(rows);
  } catch (err) {
    console.log(err);
    return res.status(500).send({ error: "Internal server error" });
  }
});

// Get a single messages from a lobby endpoint
server.get("/lobby/:lobbyId/:messageId", async (req, res) => {
  const lobbyId = req.params.lobbyId;

  try {
    const [rows] = await pool.query(
      `SELECT * FROM Message WHERE lobby_id = ${lobbyId} AND message_id = ${req.params.messageId}`
    );
    return res.send(rows);
  } catch (err) {
    console.log(err);
    return res.status(500).send({ error: "Internal server error" });
  }
});

// Post message to a lobby endpoint
server.post("/lobby/:lobbyId", async (req, res) => {
  const { nickname, message } = req.body;
  const user = await pool.query(
    `SELECT * FROM User WHERE user_name = "${nickname}"`
  );
  const userId = user[0].user_id;
  const team = await pool.query(
    `SELECT * FROM TeamMember WHERE user_id = ${userId}`
  );
  const teamId = team[0].team_id;
  const lobby = await pool.query(
    `SELECT * FROM Team WHERE team_id = ${teamId}`
  );
  const lobbyId = lobby[0].team_lobby_id;
  if (!message) {
    return res.status(400).send({ error: "Invalid request" });
  }
  try {
    await pool.query(
      `INSERT INTO Message (lobby_id, user_id, message_content) VALUES (${lobbyId}, ${userId}, "${message}")`
    );
    return res.send({ info: "Message posted successfully" });
  } catch (err) {
    console.log(err);
    return res.status(500).send({ error: "Internal server error" });
  }
});

// Get users from a lobby
server.get("/users", async (req, res) => {
  const { nickname } = req.body;
  const user = await pool.query(
    `SELECT * FROM User WHERE user_name = "${nickname}"`
  );
  const userId = user[0].user_id;
  try {
    const [rows] = await pool.query(
      `SELECT team_id FROM TeamMember WHERE user_id = ${userId}`
    );
    const teamId = rows.team_id;
    const rows2 = await pool.query(
      `SELECT user_id FROM TeamMember WHERE team_id = ${teamId}`
    );
    const ids = [];
    for (let i = 0; i < rows2.length; i++) {
      ids.push(rows2[i].user_id);
    }
    console.log(ids);
    const rows3 = await pool.query(
      `SELECT * FROM User WHERE user_id IN (${ids})`
    );

    return res.send(rows3);
  } catch (err) {
    console.log(err);
    return res.status(500).send({ error: "Internal server error" });
  }
});

//Get a single user by id if admin , if no admin can only get details from people that are in the same lobby
server.get("/users/:userId", async (req, res) => {
  const userId = req.params.userId;
  const { nickname } = req.body;
  const user = await pool.query(
    `SELECT * FROM User WHERE user_name = "${nickname}"`
  );
  const userIdFromReq = user[0].user_id;
  const team = await pool.query(
    `SELECT * FROM TeamMember WHERE user_id = ${userIdFromReq}`
  );
  const teamId = team[0].team_id;
  const teamLobby = await pool.query(
    `SELECT * FROM Team WHERE team_id = ${teamId}`
  );
  const teamLobbyId = teamLobby[0].team_lobby_id;
  const isAdmin = await pool.query(
    `SELECT * FROM Message WHERE lobby_id = ${teamLobbyId} AND user_id = ${userId}`
  );
  if (isAdmin.length > 0) {
    const [rows] = await pool.query(
      `SELECT * FROM User WHERE user_id = ${userId}`
    );
    return res.send(rows);
  } else {
    const teamMembers = await pool.query(
      `SELECT * FROM TeamMember WHERE team_id = ${teamId}`
    );
    const userIds = teamMembers.map((row) => row.user_id);
    const [rows] = await pool.query(
      `SELECT * FROM User WHERE user_id IN (${userIds}) AND user_id = ${userId}`
    );
    return res.send(rows);
  }
});

//add user to lobby as admin
server.post("/lobby/:LobbyId/add-user", async (req, res) => {
  const { personToAdd, nickname } = req.body;
  const lobbyId = req.params.LobbyId;
  const user = await pool.query(
    `SELECT * FROM User WHERE user_name = "${personToAdd}"`
  );
  const userId = user[0].user_id;
  const adminUser = await pool.query(
    `SELECT * FROM User WHERE user_name = "${nickname}"`
  );
  const adminId = adminUser[0].user_id;
  const lobbyAdmin = await pool.query(
    `SELECT * FROM Lobby WHERE admin_id = "${adminId}"`
  );
  const adminLobbyId = lobbyAdmin[0].lobby_id;
  try {
    if (adminLobbyId == adminId) {
      const teamId = await pool.query(
        `SELECT * FROM Team WHERE team_lobby_id = "${lobbyId}"`
      );
      const teamId2 = teamId[0].team_id;
      await pool.query(
        `INSERT INTO TeamMember (user_id, team_id) VALUES (${userId}, "${teamId2}")`
      );
      return res.send({ info: "User added successfully" });
    } else {
      return res
        .status(403)
        .send({ error: "You are not authorized to add this user" });
    }
  } catch (err) {
    console.log(err);
    return res.status(500).send({ error: "Internal server error" });
  }
});

//remove user from lobby
server.post("/lobby/:LobbyId/remove-user", async (req, res) => {
  const { personToRemove, nickname } = req.body;
  const lobbyId = req.params.LobbyId;
  const user = await pool.query(
    `SELECT * FROM User WHERE user_name = "${personToRemove}"`
  );
  const userId = user[0].user_id;
  const adminUser = await pool.query(
    `SELECT * FROM User WHERE user_name = "${nickname}"`
  );
  const adminId = adminUser[0].user_id;
  const lobbyAdmin = await pool.query(
    `SELECT * FROM Lobby WHERE admin_id = "${adminId}"`
  );
  const adminLobbyId = lobbyAdmin[0].lobby_id;
  try {
    if (adminLobbyId == adminId) {
      const teamId = await pool.query(
        `SELECT * FROM Team WHERE team_lobby_id = "${lobbyId}"`
      );
      const teamId2 = teamId[0].team_id;
      await pool.query(
        `DELETE FROM TeamMember WHERE user_id = "${userId}" AND team_id = "${teamId2}"`
      );
      return res.send({ info: "User removed successfully" });
    } else {
      return res
        .status(403)
        .send({ error: "You are not authorized to remove this user" });
    }
  } catch (err) {
    console.log(err);
    return res.status(500).send({ error: "Internal server error" });
  }
});

// Edit message endpoint
server.patch("/lobby/:lobbyId/:messageId", async (req, res) => {
  const { nickname, message } = req.body;
  const lobbyId = req.params.lobbyId;
  const user = await pool.query(
    `SELECT * FROM User WHERE user_name = "${nickname}"`
  );
  const userId = user[0].user_id;
  const lobby = await pool.query(
    `SELECT * FROM Lobby WHERE lobby_id = ${lobbyId}`
  );
  const adminId = lobby[0].admin_id;
  const messageId = req.params.messageId;
  if (!message) {
    return res.status(400).send({ error: "Invalid request" });
  }
  try {
    const [rows] = await pool.query(
      `SELECT * FROM Message WHERE message_id = ${messageId} AND user_id = ${userId}`
    );
    if (rows === "[]" || userId !== adminId) {
      return res
        .status(403)
        .send({ error: "You are not authorized to edit this message" });
    } else if (userId === adminId) {
      await pool.query(
        `UPDATE Message SET message_content = "${message}" WHERE message_id = ${messageId}`
      );
    }
    await pool.query(
      `UPDATE Message SET message_content = "${message}" WHERE message_id = ${messageId}`
    );
    return res.send({ info: "Message updated successfully" });
  } catch (err) {
    console.log(err);
    return res.status(500).send({ error: "Internal server error" });
  }
});

// Delete message endpoint
server.delete("/message/:messageId", async (req, res) => {
  const { nickname } = req.body;
  const user = await pool.query("SELECT * FROM User WHERE user_name = ?", [
    nickname,
  ]);
  const userId = user[0].user_id;
  const messageId = req.params.messageId;
  try {
    const [rows] = await pool.query(
      "SELECT * FROM Message WHERE message_id = ? AND user_id = ?",
      [messageId, userId]
    );
    const lobbyId = rows.lobby_id;
    const lobby = await pool.query("SELECT * FROM Lobby WHERE lobby_id = ?", [
      lobbyId,
    ]);
    const adminId = lobby.admin_id;
    if (rows.length === 0) {
      return res
        .status(403)
        .send({ error: "You are not authorized to delete this message" });
    } else if (userId === adminId) {
      await pool.query("DELETE FROM Message WHERE message_id = ?", [messageId]);
    }
    await pool.query("DELETE FROM Message WHERE message_id = ?", [messageId]);
    return res.send({ info: "Message deleted successfully" });
  } catch (err) {
    console.log(err);
    return res.status(500).send({ error: "Internal server error" });
  }
});

// Send a Private Message
server.post("/private-message", async (req, res) => {
  const { nickname, recipient, message } = req.body;
  const user = await pool.query(
    `SELECT * FROM User WHERE user_name = "${nickname}"`
  );
  const userId = user[0].user_id;
  const recipientUser = await pool.query(
    `SELECT * FROM User WHERE user_name = "${recipient}"`
  );
  const recipientId = recipientUser[0].user_id;
  if (!message) {
    return res.status(400).send({ error: "Invalid request" });
  }
  const timestamp = new Date();
  const formattedTimestamp = timestamp
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
  await pool.query(
    `INSERT INTO pms (sender_id, receiver_id, message, created_at) VALUES (${userId}, ${recipientId}, "${message}", "${formattedTimestamp}")`
  );
  try {
    return res.send({ info: "Message sent successfully" });
  } catch (err) {
    console.log(err);
    return res.status(500).send({ error: "Internal server error" });
  }
});

//show all private messages
server.get("/private-message", async (req, res) => {
  const { nickname } = req.body;
  const user = await pool.query(
    `SELECT * FROM User WHERE user_name = "${nickname}"`
  );
  const userId = user[0].user_id;
  try {
    const rows = await pool.query(
      `SELECT * FROM pms WHERE sender_id = ${userId} OR receiver_id = ${userId}`
    );
    return res.send(rows);
  } catch (err) {
    console.log(err);
    return res.status(500).send({ error: "Internal server error" });
  }
});

//Admin can add not registered people
server.post("/lobby/:lobbyid/add-new", async (req, res) => {
  const { emailToInvite, nickname } = req.body;
  const lobbyId = req.params.lobbyid;
  await pool.query(
    `INSERT INTO User (user_name, user_password, user_email) VALUES ("John Doe", "123456", "${emailToInvite}")`
  );
  //user needs to get email with nickname and password so they can change later
  const user = await pool.query(
    `SELECT * FROM User WHERE user_email = "${emailToInvite}"`
  );
  const userId = user[0].user_id;
  const adminUser = await pool.query(
    `SELECT * FROM User WHERE user_name = "${nickname}"`
  );
  const adminId = adminUser[0].user_id;
  const lobbyAdmin = await pool.query(
    `SELECT * FROM Lobby WHERE admin_id = "${adminId}"`
  );
  const adminLobbyId = lobbyAdmin[0].lobby_id;
  try {
    if (adminLobbyId == lobbyId) {
      const teamId = await pool.query(
        `SELECT * FROM Team WHERE team_lobby_id = "${lobbyId}"`
      );
      const teamId2 = teamId[0].team_id;
      await pool.query(
        `INSERT INTO TeamMember (user_id, team_id) VALUES (${userId}, "${teamId2}")`
      );
      return res.send({ info: "User added successfully" });
    } else {
      return res
        .status(403)
        .send({ error: "You are not authorized to add this user" });
    }
  } catch (err) {
    console.log(err);
    return res.status(500).send({ error: "Internal server error" });
  }
});

//pagination for lobby messages
server.get("/page/lobby/:lobbyId", async (req, res) => {
  const lobbyId = req.params.lobbyId;
  const { limit, offset } = req.body;
  try {
    const rows = await pool.query(
      `SELECT * FROM Message WHERE lobby_id = ${lobbyId} LIMIT ${limit} OFFSET ${offset}`
    );
    return res.send(rows);
  } catch (err) {
    console.log(err);
    return res.status(500).send({ error: "Internal server error" });
  }
});

server.listen(3000, () => {
  console.log("Server is running on port 3000");
});
