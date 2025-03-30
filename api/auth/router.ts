import { Router } from "express";
import { DbService } from "../../db/db-service";
import { AccessTokenService } from "../../jwt/jwt-service";
import { loginEndpoint } from "./login-endpoint";

export const authRouter = (dbService: DbService, jwtService: AccessTokenService) =>
  Router().post("/login", loginEndpoint(dbService, jwtService));
