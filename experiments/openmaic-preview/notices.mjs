import fs from "node:fs/promises";
const root = new URL("./node_modules/", import.meta.url);
const sections = [
  "知径学习讲解试作\n\nOpenMAIC 提供课程大纲生成、讲解动作生成和课件渲染。统计图形由知径按数据计算，配音和播放器由知径衔接。\nhttps://github.com/THU-MAIC/OpenMAIC\n\n下面保留本试作构建依赖的许可声明。开发工具不一定包含在浏览器产物中。",
];
const packages = [];
for (const name of await fs.readdir(root)) {
  if (name.startsWith("@"))
    for (const child of await fs.readdir(new URL(`${name}/`, root)))
      packages.push(`${name}/${child}`);
  else if (!name.startsWith(".")) packages.push(name);
}
for (const name of packages.sort()) {
  const dir = new URL(`${name}/`, root);
  let pkg;
  try {
    pkg = JSON.parse(await fs.readFile(new URL("package.json", dir), "utf8"));
  } catch {
    continue;
  }
  const files = (await fs.readdir(dir)).filter((n) =>
    /^(license|licence|copying|notice)(\.|$)/i.test(n),
  );
  sections.push(
    `${pkg.name}@${pkg.version}\nLicense: ${pkg.license || "See package"}\n`,
  );
  for (const file of files) {
    try {
      sections.push(await fs.readFile(new URL(file, dir), "utf8"));
    } catch {
      /* Directories are not license text. */
    }
  }
}
await fs.mkdir(new URL("./public/", import.meta.url), { recursive: true });
await fs.writeFile(
  new URL("./public/THIRD-PARTY-NOTICES.txt", import.meta.url),
  sections.join("\n\n--------------------\n\n"),
);
console.log("License notices assembled");
