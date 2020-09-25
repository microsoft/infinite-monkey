import path from "path";
import fs from "fs";
import faker from "faker";
import graphGenerator from "ngraph.generators";

faker.seed(123);

const scope = `@${faker.hacker.noun().toLowerCase().replace(/\s/g, "-")}`;

// TODO: algo should be customizable along with the size
const packageGraph = graphGenerator.complete(6);

// Generate the package name & versions
packageGraph.forEachNode((node) => {
  node.data = {
    name: `${scope}/${faker.hacker.adjective()}-${faker.hacker.noun()}`
      .toLocaleLowerCase()
      .replace(/\s/g, "-"),
    version: faker.system.semver(),
  };
});

// Generate package dependencies
packageGraph.forEachNode((node) => {
  const links = packageGraph.getLinks(node.id);

  if (links) {
    for (const link of links) {
      if (link.fromId === node.id) {
        const depNode = packageGraph.getNode(link.toId)!;
        node.data.dependencies = node.data.dependencies || {};
        node.data.dependencies[depNode.data.name] = `^${depNode.data.version}`;
      }
    }
  }
});

// Generate the monorepo
// 1. the root package.json
// 2. create packages/
// 3. create package directories
const root = path.join(__dirname, "../generated");

if (fs.existsSync(root)) {
  fs.rmdirSync(root, { recursive: true });
}

fs.mkdirSync(root, { recursive: true });
fs.writeFileSync(
  path.join(root, "package.json"),
  JSON.stringify(
    {
      name: "monorepo",
      version: "1.0.0",
      private: true,
      workspaces: ["packages/*"],
    },
    null,
    2
  )
);

fs.mkdirSync(path.join(root, "packages"));

packageGraph.forEachNode((node) => {
  const packageRoot = path.join(
    root,
    "packages",
    node.data.name.replace(/^@[^/]+\//, "")
  );
  fs.mkdirSync(packageRoot, { recursive: true });
  fs.writeFileSync(
    path.join(packageRoot, "package.json"),
    JSON.stringify(
      {
        name: node.data.name,
        version: node.data.version,
        dependencies: node.data.dependencies,
      },
      null,
      2
    )
  );
});
