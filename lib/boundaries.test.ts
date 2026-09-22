import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const SKIPPED_DIRECTORIES: ReadonlySet<string> = new Set(["node_modules", ".next", ".git"]);

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    if (SKIPPED_DIRECTORIES.has(entry)) {
      return [];
    }
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const sourceFiles = ["app", "components", "lib", "prisma"]
  .flatMap((directory) => walk(join(ROOT, directory)))
  .filter((path) => /\.(ts|tsx)$/.test(path) && !/\.test\.tsx?$/.test(path) && !path.endsWith(".d.ts"))
  .map((path) => relative(ROOT, path).split("\\").join("/"));

function importsOf(file: string): string[] {
  const source = readFileSync(join(ROOT, file), "utf8");
  const specifiers: string[] = [];
  for (const match of source.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)) {
    if (match[1] !== undefined) {
      specifiers.push(match[1]);
    }
  }
  return specifiers;
}

const PURE_MODULES = ["lib/money.ts", "lib/domain.ts", "lib/phone.ts", "lib/sanitize.ts"];
const DATA_ACCESS_ALLOWED = (file: string): boolean =>
  file === "lib/db.ts" || file === "lib/rate-limit.ts" || file.startsWith("lib/services/") || file === "prisma/seed.ts";

describe("architecture boundaries", () => {
  it("finds the source files it is meant to check", () => {
    expect(sourceFiles.length).toBeGreaterThan(20);
  });

  it("keeps pure domain modules free of app imports", () => {
    for (const file of PURE_MODULES) {
      const appImports = importsOf(file).filter((specifier) => specifier.startsWith("@/"));
      expect(appImports, file).toEqual([]);
    }
  });

  it("confines Prisma to the data-access layer", () => {
    const offenders = sourceFiles.filter(
      (file) => !DATA_ACCESS_ALLOWED(file) && importsOf(file).includes("@prisma/client"),
    );
    expect(offenders).toEqual([]);
  });

  it("keeps pages, layouts and components away from the database and services", () => {
    const uiFiles = sourceFiles.filter((file) => file.startsWith("components/") || /^app\/.*\.tsx$/.test(file));
    const offenders = uiFiles.filter((file) =>
      importsOf(file).some(
        (specifier) =>
          specifier === "@prisma/client" || specifier === "@/lib/db" || specifier.startsWith("@/lib/services/"),
      ),
    );
    expect(offenders).toEqual([]);
  });

  it("keeps marketing code independent of the dashboard", () => {
    const marketing = sourceFiles.filter((file) => file.startsWith("app/(marketing)/") || file.startsWith("components/marketing/"));
    const offenders = marketing.filter((file) =>
      importsOf(file).some((specifier) => specifier.startsWith("@/components/dashboard") || specifier.includes("(dashboard)")),
    );
    expect(offenders).toEqual([]);
  });

  it("marks every action file with use server and exports only async functions", () => {
    const actionFiles = sourceFiles.filter((file) => file.startsWith("app/actions/"));
    expect(actionFiles.length).toBeGreaterThanOrEqual(3);
    for (const file of actionFiles) {
      const source = readFileSync(join(ROOT, file), "utf8");
      expect(source.trimStart().startsWith('"use server"'), file).toBe(true);
      expect(/^export\s+(const|let|var|class)\s/m.test(source), file).toBe(false);
    }
  });

  it("never reads secrets from public environment variables", () => {
    const offenders = sourceFiles.filter((file) => {
      const source = readFileSync(join(ROOT, file), "utf8");
      return /NEXT_PUBLIC_[A-Z_]*(SECRET|PASSWORD|DATABASE)/.test(source);
    });
    expect(offenders).toEqual([]);
  });
});
