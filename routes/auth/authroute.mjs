import express from "express";
import bcrypt from "bcrypt";
import JWT from "jsonwebtoken";
import dotenv from "dotenv";
import { promisify } from "util";
import { RateLimiterMemory } from "rate-limiter-flexible";
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

const limiter = new RateLimiterMemory({
  points: 5, // Number of points allowed
  duration: 3600, // Per hour
});

const router = express.Router();
const sign = promisify(JWT.sign);
const verify = promisify(JWT.verify);

// User registration endpoint
router.post("/register", async (req, res) => {
  const { email, nickname, password } = req.body;
  if (!email || !password || !nickname) {
    return res.status(400).send({ error: "Invalid request" });
  }
  try {
    const encryptedPassword = await bcrypt.hash(password, 10);
    await client.query(
      'INSERT INTO "users" (user_email, user_password, user_name) VALUES ($1, $2, $3)',
      [email, encryptedPassword, nickname]
    );
    return res.send({ info: `User ${nickname} successfully created` });
  } catch (err) {
    console.log(err);
    return res.status(500).send({ error: `${err}` });
  }
});

//user login endpoint
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).send({ error: "Invalid request" });
  }

  try {
    // Check if IP address is being rate limited
    await limiter.consume(req.ip);

    const { rows } = await client.query(
      'SELECT * FROM "users" WHERE user_email = $1',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).send({ error: "Invalid credentials" });
    }

    const id = rows[0].user_id;
    const username = rows[0].user_name;
    const hashedPassword = rows[0].user_password;
    const isPasswordValid = await bcrypt.compare(password, hashedPassword);

    if (!isPasswordValid) {
      // If password is incorrect, record failed login attempt
      await limiter.consume(req.ip);
      return res.status(401).send({ error: "Invalid credentials" });
    }

    const token = await sign({ id, username }, process.env.JWT_SECRET);
    return res.send({ id, token, username });
  } catch (err) {
    console.log(err);
    return res.status(500).send({ error: "Internal server error" });
  }
});

// Middleware to verify JWT token
router.use(async (req, res, next) => {
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

export default router;
