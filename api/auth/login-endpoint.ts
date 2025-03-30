import { RequestHandler } from "express";
import { DbService } from "../../db/db-service";
import { AccessTokenService } from "../../jwt/jwt-service";

export const loginEndpoint =
  (dbService: DbService, jwtService: AccessTokenService): RequestHandler =>
  async (req, res) => {
    const { username, password } = req.body;

    // Validate input.
    if (!username || !password) {
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
    const user = dbService.getUserByUsername(username);
    if (!user || user.password !== password) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    // Generate JWT token.
    const token = jwtService.signToken(user.username, user.level);

    // Send response.
    res.json({ token });
  };
