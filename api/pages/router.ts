import { Router } from "express";
import { DbService } from "../../db/db-service";
import { addPageEndpoint } from "./add-page-endpoint";
import { Settings } from "../../settings";
import { updatePageEndpoint } from "./update-page-endpoint";
import { deletePageEndpoint } from "./delete-page-endpoint";
import { getPagesEndpoint } from "./get-pages-endpoint";
import { swapPagesEndpoint } from "./swap-pages-endpoint";

export const pagesRouter = (settings: Settings, dbService: DbService) =>
  Router()
    .post("/", addPageEndpoint(settings, dbService))
    .patch("/", updatePageEndpoint(settings, dbService))
    .delete("/", deletePageEndpoint(settings, dbService))
    .get("/", getPagesEndpoint(dbService))
    .patch("/swap", swapPagesEndpoint(settings, dbService))
