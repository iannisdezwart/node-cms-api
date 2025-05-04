import { PageCompiler } from "./web/compile.js";

export type Settings = {
  bcryptRounds: number;
  webroot: string;
  pageCompilers: Record<string, PageCompiler>;
  dependencies?: Record<string, string[]>;
};
