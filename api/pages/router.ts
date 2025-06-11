import { Router } from "express";
import { DbService } from "../../db/db-service.js";
import { Settings } from "../../settings.js";
import { addPageEndpoint } from "./add-page-endpoint.js";
import { deletePageEndpoint } from "./delete-page-endpoint.js";
import { getPagesEndpoint } from "./get-pages-endpoint.js";
import { swapPagesEndpoint } from "./swap-pages-endpoint.js";
import { updatePageEndpoint } from "./update-page-endpoint.js";

export const pagesRouter = (settings: Settings, dbService: DbService): Router =>
  Router()
    .post("/", addPageEndpoint(settings, dbService))
    .patch("/", updatePageEndpoint(settings, dbService))
    .delete("/", deletePageEndpoint(settings, dbService))
    .get("/", getPagesEndpoint(settings, dbService))
    .patch("/swap", swapPagesEndpoint(settings, dbService));
