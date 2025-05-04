import { RequestHandler } from "express";
import { DbService } from "../../db/db-service.js";
import { AccessTokenService } from "../../jwt/jwt-service.js";
import bcrypt from "bcrypt";

export const loginEndpoint =
  (dbService: DbService, jwtService: AccessTokenService): RequestHandler =>
  async (req, res) => {
    const { username, password } = req.body;

    // Validate input.
    if (username === undefined || password === undefined) {
      res.status(400).json({ error: "Username and password are required" });
      return;
    }
    if (typeof username !== "string") {
      res.status(400).json({ error: "Username must be a string" });
      return;
    }
    if (typeof password !== "string") {
      res.status(400).json({ error: "Password must be a string" });
      return;
    }

    // Check credentials against the database.
    const userRes = dbService.users.get(username);
    if ("error" in userRes) {
      res.status(500).json({
        error: `Database error: ${userRes.error}`,
      });
      return;
    }
    const user = userRes.user;
    if (user === undefined || !bcrypt.compareSync(password, user.password)) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    // Generate JWT token.
    const token = jwtService.signToken(user.username, user.level);

    // Send response.
    res.json({ token });
  };
