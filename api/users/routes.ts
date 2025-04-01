import { Router } from "express";
import { Settings } from "../../settings";
import { DbService } from "../../db/db-service";
import { listUsersEndpoint } from "./list-users";
import { addUserEndpoint } from "./add-user";
import { updateUserPasswordEndpoint } from "./update-user-password";
import { deleteUserEndpoint } from "./delete-user";

export const usersRouter = (dbService: DbService) =>
  Router()
    .get("/", listUsersEndpoint(dbService))
    .post("/", addUserEndpoint(dbService))
    .patch("/", updateUserPasswordEndpoint(dbService))
    .delete("/", deleteUserEndpoint(dbService));
