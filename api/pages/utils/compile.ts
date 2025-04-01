import { execFile } from "child_process";
import { Response } from "express";
import { existsSync } from "fs";
import { Settings } from "../../../settings";

export const compile = (settings: Settings, res: Response) => {
  res.setHeader("Content-Type", "application/jsonl");

  if (!existsSync(settings.compile.script)) {
    console.error(
      `🛠️📜⚠️ Compile script not found: ${settings.compile.script}`
    );
    res.json(
      JSON.stringify({
        type: "err",
        data: `Compile script not found: ${settings.compile.script}`,
      }) + "\n"
    );
    return;
  }

  const childProcess = execFile("node", [settings.compile.script], {
    cwd: process.cwd(),
  });

  childProcess.stdout?.on("data", (data) => {
    res.write(JSON.stringify({ type: "out", data: data.toString() }) + "\n");
  });

  childProcess.stderr?.on("data", (data) => {
    res.write(JSON.stringify({ type: "err", data: data.toString() }) + "\n");
  });

  childProcess.on("close", (code, signal) => {
    if (code === undefined) {
      console.error(`🛠️📜☠️ Compile script terminated by signal: ${signal}`);
      res.write(
        JSON.stringify({
          type: "err",
          data: `Compile script terminated by signal: ${signal}`,
        }) + "\n"
      );
      return;
    }
    if (code !== 0) {
      console.error(`🛠️📜🚨 Compile script exited with code: ${code}`);
      res.write(
        JSON.stringify({
          type: "err",
          data: `Compile script exited with code: ${code}`,
        }) + "\n"
      );
      return;
    }
    console.log("🛠️📜✅ Compile script finished successfully");
    res.end();
  });
};
