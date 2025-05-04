import { Router } from "express";
import { DbService } from "../../db/db-service.js";
import { addUserEndpoint } from "./add-user-endpoint.js";
import { deleteUserEndpoint } from "./delete-user-endpoint.js";
import { listUsersEndpoint } from "./list-users-endpoint.js";
import { updateUserPasswordEndpoint } from "./update-user-password-endpoint.js";

export const usersRouter = (dbService: DbService): Router =>
  Router()
    .get("/", listUsersEndpoint(dbService))
    .post("/", addUserEndpoint(dbService))
    .patch("/", updateUserPasswordEndpoint(dbService))
    .delete("/", deleteUserEndpoint(dbService));
