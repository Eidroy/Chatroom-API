import express from "express";
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
    await pool.query(
      `INSERT INTO User (user_email, user_password, user_name) VALUES ("${email}", "${encryptedPassword}", "${nickname}")`
    );
    return res.send({ info: "User successfully created" });
  } catch (err) {
    console.log(err);
    return res.status(500).send({ error: "Internal server error" });
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
