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

// Delete message endpoint
router.delete("/:messageId", async (req, res) => {
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
router.post("/private-message", async (req, res) => {
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
    `INSERT INTO PMS (sender_id, receiver_id, message, created_at) VALUES (${userId}, ${recipientId}, "${message}", "${formattedTimestamp}")`
  );
  try {
    return res.send({ info: "Message sent successfully" });
  } catch (err) {
    console.log(err);
    return res.status(500).send({ error: "Internal server error" });
  }
});

//show all private messages
router.get("/private-message", async (req, res) => {
  const { nickname } = req.body;
  const user = await pool.query(
    `SELECT * FROM User WHERE user_name = "${nickname}"`
  );
  const userId = user[0].user_id;
  try {
    const rows = await pool.query(
      `SELECT * FROM PMS WHERE sender_id = ${userId} OR receiver_id = ${userId}`
    );
    return res.send(rows);
  } catch (err) {
    console.log(err);
    return res.status(500).send({ error: "Internal server error" });
  }
});

export default router;
