import { Response } from "express";
import { DbService } from "../../../db/db-service.js";
import { Settings } from "../../../settings.js";
import { compile } from "../../../web/compile.js";

export const compileSite = async (
  settings: Settings,
  dbService: DbService,
  res: Response
) => {
  res.setHeader("Content-Type", "application/jsonl");
  res.write(
    JSON.stringify({ type: "out", data: "Starting site compilation..." }) + "\n"
  );

  try {
    await compile(settings, dbService, (lvl, msg) => {
      if (settings.logLevel !== "debug" && lvl === "debug") {
        return;
      }

      console.log(`[${lvl}] ${msg}`);
      res.write(JSON.stringify({ type: "out", data: msg }) + "\n");
    });
  } catch (err) {
    console.error("🛠️📜🚨 Compile script error:", err);
    res.write(
      JSON.stringify({ type: "err", data: `Compile script error: ${err}` }) +
        "\n"
    );
    res.end();
    return;
  }

  console.log("🛠️📜✅ Site compilation finished successfully");
  res.write(
    JSON.stringify({ type: "out", data: "Site compilation finished" }) + "\n"
  );
  res.end();
};
