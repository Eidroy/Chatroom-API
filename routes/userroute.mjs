import express from "express";
import dotenv from "dotenv";
import pkg from "pg";
const { Client } = pkg;

const client = new Client({
  connectionString:
    "postgres://u87su4rdj4g3ne:pb8f5b907bde55ddfdf5f1d00589068c2f1ab88017c9ef96f90243720747fa119@cb4l59cdg4fg1k.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/d2l4jkbrhusvjf",
  ssl: {
    rejectUnauthorized: false,
  },
});

client.connect();

dotenv.config();

const router = express.Router();

//get users from a lobby
router.get("/", async (req, res) => {
  const { nickname } = req.body;
  const user = await client.query(`SELECT * FROM users WHERE user_name = $1`, [
    nickname,
  ]);
  const userId = user.rows[0].user_id;
  try {
    const result = await client.query(
      `SELECT team_id FROM teammembers WHERE user_id = $1`,
      [userId]
    );
    const teamId = result.rows[0].team_id;
    const rows2 = await client.query(
      `SELECT user_id FROM teammembers WHERE team_id = $1`,
      [teamId]
    );
    const ids = [];
    for (let i = 0; i < rows2.rows.length; i++) {
      ids.push(rows2.rows[i].user_id);
    }
    console.log(ids);
    const rows3 = await client.query(
      `SELECT * FROM users WHERE user_id = ANY($1)`,
      [ids]
    );
    return res.send(rows3.rows);
  } catch (err) {
    console.log(err);
    return res.status(500).send({ error: "Internal server error" });
  }
});

//Get a single user by id if admin , if no admin can only get details from people that are in the same lobby
router.get("/:userId", async (req, res) => {
  const userId = req.params.userId;
  const { nickname } = req.body;
  const user = await client.query(`SELECT * FROM users WHERE user_name = $1`, [
    nickname,
  ]);
  const userIdFromReq = user.rows[0].user_id;
  const team = await client.query(
    `SELECT * FROM teammembers WHERE user_id = $1`,
    [userIdFromReq]
  );
  const teamId = team.rows[0].team_id;
  const teamlobby = await client.query(
    `SELECT * FROM team WHERE team_id = $1`,
    [teamId]
  );
  const teamlobbyId = teamlobby.rows[0].team_lobby_id;
  const isAdmin = await client.query(
    `SELECT * FROM message WHERE lobby_id = $1 AND user_id = $2`,
    [teamlobbyId, userIdFromReq]
  );
  if (isAdmin.length > 0) {
    const [rows] = await client.query(
      `SELECT * FROM users WHERE user_id = $1`,
      [userId]
    );
    return res.send(rows);
  } else {
    const teamMembers = await client.query(
      `SELECT * FROM teammembers WHERE team_id = $1`,
      [teamId]
    );
    const userIds = teamMembers.rows.map((row) => row.user_id);
    const rows = await client.query(
      `SELECT * FROM users WHERE user_id = ANY($1) AND user_id = $2`,
      [userIds, userIdFromReq]
    );
    return res.send(rows.rows);
  }
});

export default router;
