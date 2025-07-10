import { PageTypeHandler } from "./web/page-type-handler";

export type Settings = {
  bcryptRounds: number;
  webroot: string;
  pageTypeHandlers: Record<string, PageTypeHandler<any>>;
  langs: string[];
  dependencies?: Record<string, string[]>;
  logLevel?: "debug" | "info";
};
