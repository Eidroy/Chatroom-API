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

// Edit message endpoint
router.patch("/:messageId", async (req, res) => {
  const { nickname, message } = req.body;
  const message_id = req.params.messageId;
  const user = await client.query(`SELECT * FROM users WHERE user_name = $1`, [
    nickname,
  ]);
  const userId = user.rows[0].user_id;
  const messageinfo = await client.query(
    `SELECT * FROM message WHERE message_id = $1`,
    [message_id]
  );
  const lobby = await client.query(`SELECT * FROM lobby WHERE lobby_id = $1`, [
    messageinfo.rows[0].lobby_id,
  ]);
  const adminId = lobby.rows[0].admin_id;
  const messageId = req.params.messageId;
  if (!message) {
    return res.status(400).send({ error: "Invalid request" });
  }
  try {
    const { rows } = await client.query(
      `SELECT * FROM message WHERE message_id = $1 AND user_id = $2`,
      [messageId, userId]
    );
    if (rows.length === 0 || userId !== adminId) {
      return res
        .status(403)
        .send({ error: "You are not authorized to edit this message" });
    } else if (userId === adminId || userId === messageinfo.rows[0].user_id) {
      await client.query(
        `UPDATE message SET message_content = $1 WHERE message_id = $2`,
        [message, messageId]
      );
    }
    await client.query(
      `UPDATE message SET message_content = $1 WHERE message_id = $2`,
      [message, messageId]
    );
    return res.send({ info: "Message updated successfully" });
  } catch (err) {
    console.log(err);
    return res.status(500).send({ error: "Internal server error" });
  }
});

// Delete message endpoint
router.delete("/:messageId", async (req, res) => {
  const { nickname } = req.body;
  const user = await client.query(`SELECT * FROM users WHERE user_name = $1`, [
    nickname,
  ]);
  const userId = user.rows[0].user_id;
  const messageId = req.params.messageId;
  try {
    const { rows } = await client.query(
      `SELECT * FROM message WHERE message_id = $1 AND user_id = $2`,
      [messageId, userId]
    );
    const lobbyId = rows[0].lobby_id;
    const lobby = await client.query(
      `SELECT * FROM lobby WHERE lobby_id = $1`,
      [lobbyId]
    );
    const adminId = lobby.rows[0].admin_id;
    if (rows.length === 0) {
      return res
        .status(403)
        .send({ error: "You are not authorized to delete this message" });
    } else if (userId === adminId) {
      await client.query(`DELETE FROM message WHERE message_id = $1`, [
        messageId,
      ]);
    }
    await client.query(`DELETE FROM message WHERE message_id = $1`, [
      messageId,
    ]);
    return res.send({ info: "message deleted successfully" });
  } catch (err) {
    console.log(err);
    return res.status(500).send({ error: "Internal server error" });
  }
});

// Send a Private Message
router.post("/private-message", async (req, res) => {
  const { nickname, recipient, message } = req.body;
  const user = await client.query(`SELECT * FROM users WHERE user_name = $1`, [
    nickname,
  ]);
  const userId = user.rows[0].user_id;
  const recipientUser = await client.query(
    `SELECT * FROM users WHERE user_name = $1`,
    [recipient]
  );
  const recipientId = recipientUser.rows[0].user_id;
  if (!message) {
    return res.status(400).send({ error: "Invalid request" });
  }
  const timestamp = new Date();
  const formattedTimestamp = timestamp
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
  await client.query(
    `INSERT INTO pms (sender_id, reciever_id, message, created_at) VALUES ($1, $2, $3, $4)`,
    [userId, recipientId, message, formattedTimestamp]
  );
  try {
    return res.send({ info: "message sent successfully" });
  } catch (err) {
    console.log(err);
    return res.status(500).send({ error: "Internal server error" });
  }
});

//show all private messages
router.get("/private-message", async (req, res) => {
  const { nickname } = req.body;
  const user = await client.query(`SELECT * FROM users WHERE user_name = $1`, [
    nickname,
  ]);
  const userId = user.rows[0].user_id;
  try {
    const { rows } = await client.query(
      `SELECT * FROM pms WHERE sender_id = $1 OR reciever_id = $1`,
      [userId]
    );
    return res.send(rows);
  } catch (err) {
    console.log(err);
    return res.status(500).send({ error: "Internal server error" });
  }
});

export default router;
