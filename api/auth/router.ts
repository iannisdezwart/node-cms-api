import { Router } from "express";
import { DbService } from "../../db/db-service.js";
import { AccessTokenService } from "../../jwt/jwt-service.js";
import { loginEndpoint } from "./login-endpoint.js";

export const authRouter = (
  dbService: DbService,
  jwtService: AccessTokenService
): Router => Router().post("/login", loginEndpoint(dbService, jwtService));
