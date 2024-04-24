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

//pagination for messages
router.get("/:lobbyId", async (req, res) => {
  const lobbyId = req.params.lobbyId;
  const { limit, offset } = req.body;
  try {
    const rows = await client.query(
      `SELECT * FROM message WHERE lobby_id = $1 LIMIT $2 OFFSET $3`,
      [lobbyId, limit, offset]
    );
    return res.send(rows.rows);
  } catch (err) {
    console.log(err);
    return res.status(500).send({ error: "Internal server error" });
  }
});

export default router;
