import express from "express";
import dotenv from "dotenv";
import pkg from "pg";
const { Client } = pkg;

export const client = new Client({
  connectionString:
    "postgres://u87su4rdj4g3ne:pb8f5b907bde55ddfdf5f1d00589068c2f1ab88017c9ef96f90243720747fa119@cb4l59cdg4fg1k.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/d2l4jkbrhusvjf",
  ssl: {
    rejectUnauthorized: false,
  },
});

client.connect();

dotenv.config();

export const router = express.Router();

//Route to get all lobbies ids a user is in
router.get("/:userId", async (req, res) => {
  const userId = req.params.userId;
  try {
    const team = await client.query(
      `SELECT * FROM teammembers WHERE user_id = $1`,
      [userId]
    );
    const info = [];
    for (let i = 0; i < team.rows.length; i++) {
      const teamId = team.rows[i].team_id;
      const lobby = await client.query(
        `SELECT * FROM team WHERE team_id = $1`,
        [teamId]
      );
      const userName = await client.query(
        `SELECT * FROM users WHERE user_id = $1`,
        [userId]
      );
      lobby.rows.forEach((row) => {
        info.push({
          teamName: row.team_name,
          teamId: row.team_lobby_id,
          userName: userName.rows[0].user_name,
        });
      });
    }
    return res.send(info);
  } catch (err) {
    console.log(err);
    return res.status(500).send({ error: "Internal server error" });
  }
});

//Route to create a lobby
router.post("/", async (req, res) => {
  const { Teamname, nickname } = req.body;
  if (!nickname) {
    return res.status(400).send({ error: "Invalid request" });
  }
  try {
    const result = await client.query(
      `SELECT * FROM users WHERE user_name = $1`,
      [nickname]
    );
    const userId = result.rows[0].user_id;
    await client.query(
      `INSERT INTO lobby (admin_id, lobby_name) VALUES ($1, $2)`,
      [userId, Teamname]
    );
    const lobby = await client.query(
      `SELECT * FROM lobby WHERE lobby_name = $1`,
      [Teamname]
    );
    const lobbyId = lobby.rows[0].lobby_id;
    await client.query(
      `INSERT INTO team (team_name, team_lobby_id) VALUES ($1, $2)`,
      [Teamname, lobbyId]
    );
    const team = await client.query(`SELECT * FROM team WHERE team_name = $1`, [
      Teamname,
    ]);
    const teamId = team.rows[0].team_id;
    await client.query(
      `INSERT INTO teammembers (user_id, team_id) VALUES ($1, $2)`,
      [userId, teamId]
    );
    return res.send({ info: "Team created successfully" });
  } catch (err) {
    console.log(err);
    return res.status(500).send({ error: "Internal server error" });
  }
});

// Get messages from a lobby endpoint
router.get("/info/:lobbyId", async (req, res) => {
  const lobbyId = req.params.lobbyId;
  try {
    const messages = await client.query(
      `SELECT * FROM message WHERE lobby_id = $1`,
      [lobbyId]
    );
    return res.send(messages);
  } catch (err) {
    console.log(err);
    return res.status(500).send({ error: "Internal server error" });
  }
});

// Get a single messages from a lobby endpoint
router.get("/:lobbyId/:messageId", async (req, res) => {
  const lobbyId = req.params.lobbyId;
  const messageId = req.params.messageId;

  try {
    const rows = await client.query(
      `SELECT * FROM message WHERE lobby_id = $1 AND message_id = $2`,
      [lobbyId, messageId]
    );
    return res.send(rows.rows);
  } catch (err) {
    console.log(err);
    return res.status(500).send({ error: "Internal server error" });
  }
});

// Post message to a lobby endpoint
router.post("/:lobbyId", async (req, res) => {
  const { id, message } = req.body;
  const lobbyId = req.params.lobbyId;
  const userId = id;
  if (!message) {
    return res.status(400).send({ error: "Invalid request" });
  }
  try {
    await client.query(
      `INSERT INTO message (lobby_id, user_id, message_content) VALUES ($1, $2, $3)`,
      [lobbyId, userId, message]
    );
    return res.send({ info: "message posted successfully" });
  } catch (err) {
    console.log(err);
    return res.status(500).send({ error: "Internal server error" });
  }
});

//add user to lobby as admin
router.post("/:lobbyId/add-user", async (req, res) => {
  const { personToAdd, username } = req.body;
  const lobbyId = req.params.lobbyId;
  const user = await client.query(`SELECT * FROM users WHERE user_name = $1`, [
    personToAdd,
  ]);
  if (user.rows.length == 0) {
    return res.status(404).send({ error: "User not found" });
  }
  const userId = user.rows[0].user_id;
  const adminUser = await client.query(
    `SELECT * FROM users WHERE user_name = $1`,
    [username]
  );
  const adminId = adminUser.rows[0].user_id;
  const lobbyAdmin = await client.query(
    `SELECT * FROM lobby WHERE admin_id = $1`,
    [adminId]
  );
  const lobbyAdminID = lobbyAdmin.rows[0].admin_id;
  try {
    if (lobbyAdminID == adminId) {
      const teamId = await client.query(
        `SELECT * FROM team WHERE team_lobby_id = $1`,
        [lobbyId]
      );
      const teamId2 = teamId.rows[0].team_id;
      await client.query(
        `INSERT INTO teammembers (user_id, team_id) VALUES ($1, $2)`,
        [userId, teamId2]
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
router.post("/:lobbyId/remove-user", async (req, res) => {
  const { personToRemove, username } = req.body;
  const lobbyId = req.params.lobbyId;
  const user = await client.query(`SELECT * FROM users WHERE user_name = $1`, [
    personToRemove,
  ]);
  if (user.rows.length == 0) {
    return res.status(404).send({ error: "User not found" });
  }
  const userId = user.rows[0].user_id;
  const adminUser = await client.query(
    `SELECT * FROM users WHERE user_name = $1`,
    [username]
  );
  const adminId = adminUser.rows[0].user_id;
  const lobbyAdmin = await client.query(
    `SELECT * FROM lobby WHERE admin_id = $1`,
    [adminId]
  );
  const lobbyAdminID = lobbyAdmin.rows[0].admin_id;
  try {
    if (lobbyAdminID == adminId) {
      const teamId = await client.query(
        `SELECT * FROM team WHERE team_lobby_id = $1`,
        [lobbyId]
      );
      const teamId2 = teamId.rows[0].team_id;
      await client.query(
        `DELETE FROM teammembers WHERE user_id = $1 AND team_id = $2`,
        [userId, teamId2]
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

//Admin can add not registered people
router.post("/:lobbyid/add-new", async (req, res) => {
  const { emailToInvite, nickname } = req.body;
  const lobbyId = req.params.lobbyid;
  await client.query(
    `INSERT INTO users (user_name, user_password, user_email) VALUES ($1, $2, $3)`,
    ["John Doe", "123456", emailToInvite]
  );
  //user needs to get email with nickname and password so they can change later
  const user = await client.query(`SELECT * FROM users WHERE user_email = $1`, [
    emailToInvite,
  ]);
  const userId = user.rows[0].user_id;
  const adminUser = await client.query(
    `SELECT * FROM users WHERE user_name = $1`,
    [nickname]
  );
  const adminId = adminUser.rows[0].user_id;
  const lobbyAdmin = await client.query(
    `SELECT * FROM lobby WHERE admin_id = $1`,
    [adminId]
  );
  const adminlobbyId = lobbyAdmin.rows[0].lobby_id;
  try {
    if (adminlobbyId == lobbyId) {
      const teamId = await client.query(
        `SELECT * FROM team WHERE team_lobby_id = $1`,
        [lobbyId]
      );
      const teamId2 = teamId.rows[0].team_id;
      await client.query(
        `INSERT INTO teammembers (user_id, team_id) VALUES ($1, $2)`,
        [userId, teamId2]
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

export default router;
