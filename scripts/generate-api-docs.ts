import path from "node:path";
import { promises as fs } from "node:fs";
import { Node, Project, SyntaxKind, VariableDeclaration, FunctionDeclaration, ArrowFunction, ClassDeclaration } from "ts-morph";

type DocCategory =
  | "React Component"
  | "Hook"
  | "Function"
  | "Class"
  | "Interface"
  | "Type"
  | "Enum"
  | "Value";

interface DocEntry {
  name: string;
  displayName: string;
  filePath: string;
  relativeFilePath: string;
  importPath: string;
  exportType: "named" | "default" | "named and default";
  category: DocCategory;
  signature?: string;
  description?: string;
  example: string;
}

const PROJECT_ROOT = path.resolve(process.cwd());
const SRC_DIR = path.join(PROJECT_ROOT, "src");
const OUTPUT_PATH = path.join(PROJECT_ROOT, "docs", "API_REFERENCE.md");

function toPosix(p: string) {
  return p.split(path.sep).join("/");
}

function computeImportPath(relativeFilePath: string) {
  const withoutExt = relativeFilePath.replace(/\.[mc]?[tj]sx?$/i, "");
  const cleaned = withoutExt.endsWith("/index")
    ? withoutExt.slice(0, -"/index".length)
    : withoutExt;
  return `@/${cleaned}`;
}

function getJsDoc(node: Node) {
  const jsDocable = node as Node & { getJsDocs?: () => { getComment: () => string | undefined }[] };
  if (!jsDocable.getJsDocs) {
    return undefined;
  }
  const docs = jsDocable.getJsDocs();
  const text = docs
    .map((doc) => doc.getComment())
    .filter(Boolean)
    .join("\n\n")
    .trim();
  return text.length > 0 ? text : undefined;
}

function formatType(node: Node) {
  try {
    return node.getType().getText(node);
  } catch {
    const typeNode = (node as { getTypeNode?: () => Node | undefined }).getTypeNode?.();
    return typeNode ? typeNode.getText() : undefined;
  }
}

function formatFunctionSignature(
  name: string,
  fn: FunctionDeclaration | ArrowFunction
): string {
  const typeParams = fn
    .getTypeParameters()
    .map((param) => param.getText())
    .join(", ");
  const params = fn
    .getParameters()
    .map((param) => param.getText())
    .join(", ");
  const returnType = (() => {
    try {
      return fn.getReturnType().getText();
    } catch {
      const typeNode = fn.getReturnTypeNode();
      return typeNode ? typeNode.getText() : undefined;
    }
  })();
  const typeParamPart = typeParams ? `<${typeParams}>` : "";
  const returnPart = returnType ? `: ${returnType}` : "";
  return `function ${name}${typeParamPart}(${params})${returnPart}`;
}

function formatClassSignature(name: string, cls: ClassDeclaration): string {
  const typeParams = cls
    .getTypeParameters()
    .map((param) => param.getText())
    .join(", ");
  const heritage = cls
    .getHeritageClauses()
    .map((clause) => clause.getText())
    .join(" ");
  const typeParamPart = typeParams ? `<${typeParams}>` : "";
  const heritagePart = heritage ? ` ${heritage}` : "";
  return `class ${name}${typeParamPart}${heritagePart}`;
}

function classifyCategory(
  name: string,
  filePath: string,
  node: Node
): DocCategory {
  const posixPath = toPosix(filePath);
  const isTsx = filePath.endsWith(".tsx");
  const isComponentCandidate =
    isTsx && /^[A-Z]/.test(name) && !name.startsWith("use");

  if (Node.isInterfaceDeclaration(node)) {
    return "Interface";
  }

  if (Node.isTypeAliasDeclaration(node)) {
    return "Type";
  }

  if (Node.isEnumDeclaration(node)) {
    return "Enum";
  }

  if (Node.isClassDeclaration(node)) {
    return "Class";
  }

  if (
    posixPath.includes("/hooks/") ||
    name.startsWith("use") ||
    (Node.isVariableDeclaration(node) &&
      node.getInitializer()?.getKind() === SyntaxKind.ArrowFunction &&
      name.startsWith("use"))
  ) {
    return "Hook";
  }

  if (isComponentCandidate || posixPath.includes("/components/")) {
    return "React Component";
  }

  if (
    Node.isFunctionDeclaration(node) ||
    (Node.isVariableDeclaration(node) &&
      node.getInitializer()?.getKind() === SyntaxKind.ArrowFunction)
  ) {
    return "Function";
  }

  return "Value";
}

function buildExample(entry: DocEntry): string {
  const { displayName, importPath, exportType, category } = entry;

  const importStatement =
    category === "Interface" || category === "Type"
      ? `import type { ${displayName} } from '${importPath}';`
      : exportType === "default"
      ? `import ${displayName} from '${importPath}';`
      : exportType === "named"
      ? `import { ${displayName} } from '${importPath}';`
      : `import ${displayName}, { ${displayName} as ${displayName}Named } from '${importPath}';`;

  switch (category) {
    case "React Component":
      return `${importStatement}\n\n<${displayName} {...props} />`;
    case "Hook":
      return `${importStatement}\n\nconst result = ${displayName}(/* params */);`;
    case "Function":
      return `${importStatement}\n\nconst result = ${displayName}(/* args */);`;
    case "Class":
      return `${importStatement}\n\nconst instance = new ${displayName}(/* args */);`;
    case "Interface":
    case "Type":
      return `${importStatement}\n\ntype Example = ${displayName};`;
    case "Enum":
      return `${importStatement}\n\nconst value = ${displayName}.Example;`;
    default:
      return `${importStatement}\n\n// Use ${displayName} as needed.`;
  }
}

function ensureEntry(
  map: Map<string, DocEntry>,
  baseEntry: Omit<DocEntry, "example">
) {
  const key = `${baseEntry.filePath}::${baseEntry.name}`;
  if (!map.has(key)) {
    const entry = {
      ...baseEntry,
      example: "",
    };
    entry.example = buildExample(entry);
    map.set(key, entry);
  } else {
    const existing = map.get(key)!;
    if (
      existing.exportType === "named" &&
      baseEntry.exportType === "default"
    ) {
      existing.exportType = "named and default";
      existing.example = buildExample(existing);
    } else if (
      existing.exportType === "default" &&
      baseEntry.exportType === "named"
    ) {
      existing.exportType = "named and default";
      existing.example = buildExample(existing);
    }
    if (baseEntry.description && !existing.description) {
      existing.description = baseEntry.description;
    }
    if (baseEntry.signature && !existing.signature) {
      existing.signature = baseEntry.signature;
    }
  }
}

function determineDisplayName(name: string, filePath: string) {
  if (name && name !== "default") {
    return name;
  }
  const base = path.basename(filePath, path.extname(filePath));
  if (base === "index") {
    return path.basename(path.dirname(filePath));
  }
  const camel = base.replace(/[-_](\w)/g, (_, char: string) =>
    char.toUpperCase()
  );
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

function handleFunctionLike(
  entryMap: Map<string, DocEntry>,
  fn: FunctionDeclaration | ArrowFunction | VariableDeclaration,
  opts: {
    name: string;
    filePath: string;
    relativeFilePath: string;
    importPath: string;
    exportType: "named" | "default";
  }
) {
  const node =
    Node.isVariableDeclaration(fn) && fn.getInitializer()?.isKind(SyntaxKind.ArrowFunction)
      ? fn.getInitializer()!
      : fn;
  const signature = formatFunctionSignature(opts.name, node as FunctionDeclaration | ArrowFunction);
  const description = getJsDoc(fn);
  const category = classifyCategory(opts.name, opts.filePath, fn);

  ensureEntry(entryMap, {
    name: opts.name,
    displayName: opts.name,
    filePath: opts.filePath,
    relativeFilePath: opts.relativeFilePath,
    importPath: opts.importPath,
    exportType: opts.exportType,
    category,
    signature,
    description,
  });
}

async function generate() {
  const project = new Project({
    tsConfigFilePath: path.join(PROJECT_ROOT, "tsconfig.app.json"),
    skipAddingFilesFromTsConfig: false,
  });

  const entryMap = new Map<string, DocEntry>();

  const sourceFiles = project
    .getSourceFiles(["src/**/*.ts", "src/**/*.tsx"])
    .filter(
      (file) =>
        !file.isDeclarationFile() &&
        !/\.d\.[tj]sx?$/.test(file.getBaseName()) &&
        !/\.test\.[tj]sx?$/.test(file.getBaseName()) &&
        !/\.spec\.[tj]sx?$/.test(file.getBaseName()) &&
        !toPosix(file.getFilePath()).includes("/__tests__/")
    );

  for (const sourceFile of sourceFiles) {
    const filePath = sourceFile.getFilePath();
    const relativeFilePath = toPosix(path.relative(SRC_DIR, filePath));
    const importPath = computeImportPath(relativeFilePath);

    for (const fn of sourceFile.getFunctions()) {
      if (!fn.isExported()) continue;
      const name = fn.getName() || determineDisplayName("default", filePath);
      handleFunctionLike(entryMap, fn, {
        name,
        filePath,
        relativeFilePath,
        importPath,
        exportType: fn.isDefaultExport() ? "default" : "named",
      });
    }

    for (const cls of sourceFile.getClasses()) {
      if (!cls.isExported()) continue;
      const name = cls.getName() || determineDisplayName("default", filePath);
      const signature = formatClassSignature(name, cls);
      const description = getJsDoc(cls);
      const category = classifyCategory(name, filePath, cls);
      ensureEntry(entryMap, {
        name,
        displayName: name,
        filePath,
        relativeFilePath,
        importPath,
        exportType: cls.isDefaultExport() ? "default" : "named",
        category,
        signature,
        description,
      });
    }

    for (const iface of sourceFile.getInterfaces()) {
      if (!iface.isExported()) continue;
      const name = iface.getName();
      const description = getJsDoc(iface);
      ensureEntry(entryMap, {
        name,
        displayName: name,
        filePath,
        relativeFilePath,
        importPath,
        exportType: "named",
        category: classifyCategory(name, filePath, iface),
        signature: `interface ${name}`,
        description,
      });
    }

    for (const alias of sourceFile.getTypeAliases()) {
      if (!alias.isExported()) continue;
      const name = alias.getName();
      const type = alias.getTypeNode()?.getText();
      const description = getJsDoc(alias);
      ensureEntry(entryMap, {
        name,
        displayName: name,
        filePath,
        relativeFilePath,
        importPath,
        exportType: "named",
        category: classifyCategory(name, filePath, alias),
        signature: `type ${name} = ${type ?? "unknown"}`,
        description,
      });
    }

    for (const enm of sourceFile.getEnums()) {
      if (!enm.isExported()) continue;
      const name = enm.getName();
      const members = enm
        .getMembers()
        .map((member) => member.getName())
        .join(" | ");
      const description = getJsDoc(enm);
      ensureEntry(entryMap, {
        name,
        displayName: name,
        filePath,
        relativeFilePath,
        importPath,
        exportType: enm.isDefaultExport() ? "default" : "named",
        category: classifyCategory(name, filePath, enm),
        signature: members ? `enum ${name} = ${members}` : `enum ${name}`,
        description,
      });
    }

    for (const statement of sourceFile.getVariableStatements()) {
      if (!statement.isExported()) continue;
      for (const decl of statement.getDeclarations()) {
        const name = decl.getName();
        const initializer = decl.getInitializer();
        const isDefault = statement.isDefaultExport();
        const description = getJsDoc(decl);

        if (
          initializer &&
          (Node.isArrowFunction(initializer) ||
            initializer.getKind() === SyntaxKind.FunctionExpression)
        ) {
          handleFunctionLike(entryMap, decl, {
            name,
            filePath,
            relativeFilePath,
            importPath,
            exportType: isDefault ? "default" : "named",
          });
          continue;
        }

        const category = classifyCategory(name, filePath, decl);
        const signature = formatType(decl);

        ensureEntry(entryMap, {
          name,
          displayName: name,
          filePath,
          relativeFilePath,
          importPath,
          exportType: isDefault ? "default" : "named",
          category,
          signature,
          description,
        });
      }
    }

    for (const assignment of sourceFile.getExportAssignments()) {
      const expression = assignment.getExpression();
      if (!expression) continue;

      if (Node.isIdentifier(expression)) {
        const name = expression.getText();
        const key = `${filePath}::${name}`;
        if (entryMap.has(key)) {
          const existing = entryMap.get(key)!;
          if (existing.exportType === "named") {
            existing.exportType = "named and default";
            existing.example = buildExample(existing);
          } else {
            existing.exportType = "default";
            existing.example = buildExample(existing);
          }
        } else {
          const displayName = determineDisplayName(name, filePath);
          ensureEntry(entryMap, {
            name,
            displayName,
            filePath,
            relativeFilePath,
            importPath,
            exportType: "default",
            category: classifyCategory(displayName, filePath, assignment),
            signature: undefined,
            description: getJsDoc(assignment),
          });
        }
      } else {
        const fallbackName = determineDisplayName("default", filePath);
        ensureEntry(entryMap, {
          name: fallbackName,
          displayName: fallbackName,
          filePath,
          relativeFilePath,
          importPath,
          exportType: "default",
          category: classifyCategory(fallbackName, filePath, assignment),
          signature: undefined,
          description: getJsDoc(assignment),
        });
      }
    }
  }

  const entries = Array.from(entryMap.values()).sort((a, b) => {
    if (a.category === b.category) {
      return a.displayName.localeCompare(b.displayName);
    }
    return a.category.localeCompare(b.category);
  });

  const categoryGroups = new Map<DocCategory, DocEntry[]>();
  for (const entry of entries) {
    if (!categoryGroups.has(entry.category)) {
      categoryGroups.set(entry.category, []);
    }
    categoryGroups.get(entry.category)!.push(entry);
  }

  const lines: string[] = [];
  lines.push("# API Reference");
  lines.push("");
  lines.push(
    `> Generated on ${new Date().toISOString()} by \`scripts/generate-api-docs.ts\`.`
  );
  lines.push("");
  lines.push(
    `This reference enumerates all exported components, hooks, functions, classes, types, enums, and values exposed under \`src/\`. Each entry includes import examples and usage guidance.`
  );
  lines.push("");

  const orderedCategories: DocCategory[] = ["React Component", "Hook", "Function", "Class", "Interface", "Type", "Enum", "Value"];
  const categoryTitles: Record<DocCategory, string> = {
    "React Component": "React Components",
    Hook: "Hooks",
    Function: "Functions",
    Class: "Classes",
    Interface: "Interfaces",
    Type: "Types",
    Enum: "Enums",
    Value: "Values",
  };

  for (const category of orderedCategories) {
    const group = categoryGroups.get(category);
    if (!group || group.length === 0) continue;

    lines.push(`## ${categoryTitles[category]}`);
    lines.push("");
    lines.push(`Total: ${group.length}`);
    lines.push("");

    for (const entry of group) {
      lines.push(`### ${entry.displayName}`);
      lines.push("");
      lines.push(`**Import:** \`${entry.importPath}\``);
      lines.push(``);
      lines.push(
        `- Defined in: \`${entry.relativeFilePath}\`\n- Export type: ${entry.exportType}`
      );
      if (entry.signature) {
        lines.push("");
        lines.push("```ts");
        lines.push(entry.signature);
        lines.push("```");
      }
      if (entry.description) {
        lines.push("");
        lines.push(entry.description);
      } else {
        lines.push("");
        lines.push("_No inline documentation provided._");
      }
      lines.push("");
      lines.push("**Example**");
      lines.push("");
      const exampleLanguage =
        entry.category === "React Component" ? "tsx" : "ts";
      lines.push("```" + exampleLanguage);
      lines.push(entry.example);
      lines.push("```");
      lines.push("");
    }
  }

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, lines.join("\n"), "utf8");

  // eslint-disable-next-line no-console
  console.log(`API reference generated at ${toPosix(path.relative(PROJECT_ROOT, OUTPUT_PATH))}`);
}

generate().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Failed to generate API reference:", error);
  process.exitCode = 1;
});

