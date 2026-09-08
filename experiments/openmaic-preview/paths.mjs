import { fileURLToPath } from "node:url";

export const editions = {
  statistics: { root: "./", slug: "openmaic-20260908" },
  "window-five-years": {
    root: "./lessons/window-five-years/",
    slug: "zhihu-window-20260908",
  },
};
export function editionPaths(name = process.env.ZH_LESSON || "statistics") {
  const edition = editions[name];
  if (!edition) throw new Error("Unknown lesson edition");
  return {
    name,
    slug: edition.slug,
    root: new URL(edition.root, import.meta.url),
    outDir: fileURLToPath(
      new URL(`../../public/demo/${edition.slug}/`, import.meta.url),
    ),
  };
}
