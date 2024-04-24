import express from "express";
import dotenv from "dotenv";
import mariadb from "mariadb";

const pool = mariadb.createPool({
  database: "Lockerroom",
  host: "localhost",
  user: "root",
  password: "Marieke3005",
  connectionLimit: 1,
});

dotenv.config();

const router = express.Router();

router.post("/", async (req, res) => {
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
router.get("/:lobbyId", async (req, res) => {
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
router.get("/:lobbyId/:messageId", async (req, res) => {
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
router.post("/:lobbyId", async (req, res) => {
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

//add user to lobby as admin
router.post("/:LobbyId/add-user", async (req, res) => {
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
router.post("/:LobbyId/remove-user", async (req, res) => {
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
router.patch("/:lobbyId/:messageId", async (req, res) => {
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

//get users from a lobby
router.get("/users", async (req, res) => {
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
router.get("/users/:userId", async (req, res) => {
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

//Admin can add not registered people
router.post("/:lobbyid/add-new", async (req, res) => {
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

//add user to lobby as admin
router.post("/lobby/:LobbyId/add-user", async (req, res) => {
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
router.post("/lobby/:LobbyId/remove-user", async (req, res) => {
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

//pagination for lobby messages
router.get("/page/lobby/:lobbyId", async (req, res) => {
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

export default router;
