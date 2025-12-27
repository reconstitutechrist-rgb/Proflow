/**
 * Code Parser Utilities
 * Extracts structure from code files: functions, classes, imports, exports
 */

// Priority file patterns for analysis (analyze these first)
export const PRIORITY_PATTERNS = [
  'README*',
  'readme*',
  'package.json',
  'composer.json',
  'requirements.txt',
  'Cargo.toml',
  'go.mod',
  '**/index.{js,jsx,ts,tsx}',
  '**/main.{js,ts,py,go,rs}',
  '**/app.{js,jsx,ts,tsx,py}',
  '**/api/**',
  '**/routes/**',
  '**/models/**',
  '**/components/**',
  '**/lib/**',
  '**/utils/**',
  '**/hooks/**',
  '**/services/**',
];

// Skip patterns (don't analyze these)
export const SKIP_PATTERNS = [
  'node_modules/**',
  'vendor/**',
  'dist/**',
  'build/**',
  '.next/**',
  '.git/**',
  '*.min.js',
  '*.min.css',
  '*.lock',
  '*.map',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  '*.test.{js,ts,jsx,tsx}',
  '*.spec.{js,ts,jsx,tsx}',
  '__tests__/**',
  '__mocks__/**',
  'coverage/**',
  '.cache/**',
];

// Max file size to analyze (500KB)
export const MAX_FILE_SIZE_BYTES = 500 * 1024;

/**
 * Parse JavaScript/TypeScript file to extract exports, imports, functions, classes
 */
export function parseJavaScript(content, filePath) {
  const result = {
    imports: [],
    exports: [],
    functions: [],
    classes: [],
    hooks: [],
    components: [],
  };

  // Extract imports
  const importRegex = /^import\s+(?:(?:\{([^}]+)\}|(\w+))\s+from\s+)?['"]([^'"]+)['"]/gm;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const namedImports = match[1]?.split(',').map((s) => s.trim().split(' as ')[0]) || [];
    const defaultImport = match[2];
    const source = match[3];

    result.imports.push({
      source,
      default: defaultImport || null,
      named: namedImports.filter(Boolean),
      isExternal: !source.startsWith('.') && !source.startsWith('@/'),
    });
  }

  // Extract exports
  const exportDefaultRegex = /export\s+default\s+(?:function\s+)?(\w+)/g;
  while ((match = exportDefaultRegex.exec(content)) !== null) {
    result.exports.push({ name: match[1], type: 'default' });
  }

  const exportNamedRegex = /export\s+(?:const|let|var|function|class|async\s+function)\s+(\w+)/g;
  while ((match = exportNamedRegex.exec(content)) !== null) {
    result.exports.push({ name: match[1], type: 'named' });
  }

  const exportBracesRegex = /export\s+\{([^}]+)\}/g;
  while ((match = exportBracesRegex.exec(content)) !== null) {
    const names = match[1].split(',').map((s) => s.trim().split(' as ')[0]);
    names.forEach((name) => {
      if (name) result.exports.push({ name, type: 'named' });
    });
  }

  // Extract functions (including async and arrow functions assigned to const)
  const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g;
  while ((match = functionRegex.exec(content)) !== null) {
    const name = match[1];
    const params = match[2]
      .split(',')
      .map((p) => p.trim().split(':')[0].split('=')[0].trim())
      .filter(Boolean);
    result.functions.push({ name, params, file: filePath });

    // Check if it's a React hook
    if (name.startsWith('use') && name[3]?.toUpperCase() === name[3]) {
      result.hooks.push({ name, params, file: filePath });
    }
  }

  // Arrow functions assigned to const/let/var
  const arrowFuncRegex =
    /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*=>/g;
  while ((match = arrowFuncRegex.exec(content)) !== null) {
    const name = match[1];
    const params = match[2]
      .split(',')
      .map((p) => p.trim().split(':')[0].split('=')[0].trim())
      .filter(Boolean);
    result.functions.push({ name, params, file: filePath });

    if (name.startsWith('use') && name[3]?.toUpperCase() === name[3]) {
      result.hooks.push({ name, params, file: filePath });
    }
  }

  // Extract classes
  const classRegex = /(?:export\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?/g;
  while ((match = classRegex.exec(content)) !== null) {
    result.classes.push({
      name: match[1],
      extends: match[2] || null,
      file: filePath,
    });
  }

  // Detect React components (functions returning JSX)
  const componentRegex =
    /(?:export\s+)?(?:const|function)\s+([A-Z]\w+)\s*(?:=\s*(?:\([^)]*\)|[^=])\s*=>|:\s*React\.FC|\([^)]*\)\s*(?::\s*\w+)?\s*\{)/g;
  while ((match = componentRegex.exec(content)) !== null) {
    const name = match[1];
    // Check if this looks like a component (returns JSX)
    if (
      content.includes(`<${name}`) ||
      content.includes('return (') ||
      content.includes('return <')
    ) {
      result.components.push({ name, file: filePath });
    }
  }

  return result;
}

/**
 * Parse Python file
 */
export function parsePython(content, filePath) {
  const result = {
    imports: [],
    functions: [],
    classes: [],
    exports: [],
  };

  // Extract imports
  const importRegex = /^(?:from\s+(\S+)\s+)?import\s+(.+)$/gm;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const source = match[1] || match[2].split(',')[0].trim();
    const items = match[2].split(',').map((s) => s.trim().split(' as ')[0]);
    result.imports.push({
      source,
      items,
      isExternal: !source.startsWith('.'),
    });
  }

  // Extract functions
  const funcRegex = /^(?:async\s+)?def\s+(\w+)\s*\(([^)]*)\)/gm;
  while ((match = funcRegex.exec(content)) !== null) {
    const name = match[1];
    const params = match[2]
      .split(',')
      .map((p) => p.trim().split(':')[0].split('=')[0].trim())
      .filter(Boolean);
    result.functions.push({ name, params, file: filePath });

    // Consider public functions as exports
    if (!name.startsWith('_')) {
      result.exports.push({ name, type: 'function' });
    }
  }

  // Extract classes
  const classRegex = /^class\s+(\w+)(?:\(([^)]+)\))?:/gm;
  while ((match = classRegex.exec(content)) !== null) {
    result.classes.push({
      name: match[1],
      extends: match[2]?.split(',').map((s) => s.trim()) || [],
      file: filePath,
    });

    if (!match[1].startsWith('_')) {
      result.exports.push({ name: match[1], type: 'class' });
    }
  }

  return result;
}

/**
 * Parse Go file
 */
export function parseGo(content, filePath) {
  const result = {
    package: null,
    imports: [],
    functions: [],
    structs: [],
    interfaces: [],
    exports: [],
  };

  // Extract package
  const pkgMatch = content.match(/^package\s+(\w+)/m);
  if (pkgMatch) result.package = pkgMatch[1];

  // Extract imports
  const importBlockRegex = /import\s+\(([^)]+)\)/g;
  let match;
  while ((match = importBlockRegex.exec(content)) !== null) {
    const imports = match[1]
      .split('\n')
      .map((line) => line.trim().replace(/"/g, ''))
      .filter((line) => line && !line.startsWith('//'));
    imports.forEach((imp) => {
      const parts = imp.split(' ');
      result.imports.push({
        source: parts[parts.length - 1],
        alias: parts.length > 1 ? parts[0] : null,
      });
    });
  }

  // Single line imports
  const singleImportRegex = /^import\s+"([^"]+)"/gm;
  while ((match = singleImportRegex.exec(content)) !== null) {
    result.imports.push({ source: match[1], alias: null });
  }

  // Extract functions (exported if starts with uppercase)
  const funcRegex = /^func\s+(?:\((\w+)\s+\*?(\w+)\)\s+)?(\w+)\s*\(([^)]*)\)/gm;
  while ((match = funcRegex.exec(content)) !== null) {
    const name = match[3];
    const receiver = match[2] || null;
    const params = match[4]
      .split(',')
      .map((p) => p.trim().split(' ')[0])
      .filter(Boolean);

    result.functions.push({ name, receiver, params, file: filePath });

    // Exported if starts with uppercase
    if (name[0] === name[0].toUpperCase()) {
      result.exports.push({ name, type: receiver ? 'method' : 'function' });
    }
  }

  // Extract structs
  const structRegex = /^type\s+(\w+)\s+struct\s*\{/gm;
  while ((match = structRegex.exec(content)) !== null) {
    result.structs.push({ name: match[1], file: filePath });
    if (match[1][0] === match[1][0].toUpperCase()) {
      result.exports.push({ name: match[1], type: 'struct' });
    }
  }

  // Extract interfaces
  const interfaceRegex = /^type\s+(\w+)\s+interface\s*\{/gm;
  while ((match = interfaceRegex.exec(content)) !== null) {
    result.interfaces.push({ name: match[1], file: filePath });
    if (match[1][0] === match[1][0].toUpperCase()) {
      result.exports.push({ name: match[1], type: 'interface' });
    }
  }

  return result;
}

/**
 * Parse Rust file
 */
export function parseRust(content, filePath) {
  const result = {
    uses: [],
    functions: [],
    structs: [],
    traits: [],
    impls: [],
    exports: [],
  };

  // Extract use statements
  const useRegex = /^(?:pub\s+)?use\s+([^;]+);/gm;
  let match;
  while ((match = useRegex.exec(content)) !== null) {
    result.uses.push({ path: match[1].trim() });
  }

  // Extract functions
  const funcRegex = /^(?:pub\s+)?(?:async\s+)?fn\s+(\w+)(?:<[^>]+>)?\s*\(([^)]*)\)/gm;
  while ((match = funcRegex.exec(content)) !== null) {
    const isPub = match[0].startsWith('pub');
    result.functions.push({
      name: match[1],
      params: match[2]
        .split(',')
        .map((p) => p.trim().split(':')[0].trim())
        .filter(Boolean),
      isPublic: isPub,
      file: filePath,
    });
    if (isPub) {
      result.exports.push({ name: match[1], type: 'function' });
    }
  }

  // Extract structs
  const structRegex = /^(?:pub\s+)?struct\s+(\w+)/gm;
  while ((match = structRegex.exec(content)) !== null) {
    const isPub = match[0].startsWith('pub');
    result.structs.push({ name: match[1], isPublic: isPub, file: filePath });
    if (isPub) {
      result.exports.push({ name: match[1], type: 'struct' });
    }
  }

  // Extract traits
  const traitRegex = /^(?:pub\s+)?trait\s+(\w+)/gm;
  while ((match = traitRegex.exec(content)) !== null) {
    const isPub = match[0].startsWith('pub');
    result.traits.push({ name: match[1], isPublic: isPub, file: filePath });
    if (isPub) {
      result.exports.push({ name: match[1], type: 'trait' });
    }
  }

  return result;
}

/**
 * Detect language from file path
 */
export function detectLanguage(filePath) {
  const ext = filePath.split('.').pop()?.toLowerCase();

  const languageMap = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    mjs: 'javascript',
    cjs: 'javascript',
    py: 'python',
    go: 'go',
    rs: 'rust',
    rb: 'ruby',
    java: 'java',
    kt: 'kotlin',
    swift: 'swift',
    php: 'php',
    cs: 'csharp',
    cpp: 'cpp',
    c: 'c',
    h: 'c',
    hpp: 'cpp',
    vue: 'vue',
    svelte: 'svelte',
  };

  return languageMap[ext] || 'unknown';
}

/**
 * Parse file based on detected language
 */
export function parseFile(content, filePath) {
  const language = detectLanguage(filePath);

  switch (language) {
    case 'javascript':
    case 'typescript':
    case 'vue':
    case 'svelte':
      return { language, ...parseJavaScript(content, filePath) };
    case 'python':
      return { language, ...parsePython(content, filePath) };
    case 'go':
      return { language, ...parseGo(content, filePath) };
    case 'rust':
      return { language, ...parseRust(content, filePath) };
    default:
      return { language, exports: [], imports: [], functions: [], classes: [] };
  }
}

/**
 * Parse package.json to extract dependencies
 */
export function parsePackageJson(content) {
  try {
    const pkg = JSON.parse(content);
    return {
      name: pkg.name,
      version: pkg.version,
      description: pkg.description,
      main: pkg.main,
      scripts: Object.keys(pkg.scripts || {}),
      dependencies: Object.entries(pkg.dependencies || {}).map(([name, version]) => ({
        name,
        version,
        type: 'production',
      })),
      devDependencies: Object.entries(pkg.devDependencies || {}).map(([name, version]) => ({
        name,
        version,
        type: 'development',
      })),
    };
  } catch {
    return null;
  }
}

/**
 * Determine if a file path matches priority patterns
 */
export function isPriorityFile(filePath) {
  const path = filePath.toLowerCase();

  // Check explicit priority patterns
  if (path.includes('readme')) return true;
  if (path.endsWith('package.json')) return true;
  if (path.endsWith('requirements.txt')) return true;
  if (path.includes('/api/')) return true;
  if (path.includes('/routes/')) return true;
  if (path.includes('/models/')) return true;
  if (path.includes('/hooks/')) return true;
  if (path.includes('/services/')) return true;
  if (path.includes('/lib/')) return true;
  if (path.includes('/utils/')) return true;
  if (path.match(/index\.(js|jsx|ts|tsx)$/)) return true;
  if (path.match(/main\.(js|ts|py|go|rs)$/)) return true;
  if (path.match(/app\.(js|jsx|ts|tsx|py)$/)) return true;

  return false;
}

/**
 * Determine if a file path should be skipped
 */
export function shouldSkipFile(filePath) {
  const path = filePath.toLowerCase();

  if (path.includes('node_modules/')) return true;
  if (path.includes('vendor/')) return true;
  if (path.includes('dist/')) return true;
  if (path.includes('build/')) return true;
  if (path.includes('.next/')) return true;
  if (path.includes('.git/')) return true;
  if (path.includes('__tests__/')) return true;
  if (path.includes('__mocks__/')) return true;
  if (path.includes('coverage/')) return true;
  if (path.includes('.cache/')) return true;
  if (path.endsWith('.min.js')) return true;
  if (path.endsWith('.min.css')) return true;
  if (path.endsWith('.map')) return true;
  if (path.endsWith('.lock')) return true;
  if (path.endsWith('package-lock.json')) return true;
  if (path.match(/\.(test|spec)\.(js|ts|jsx|tsx)$/)) return true;

  return false;
}

/**
 * Extract folder structure summary from file paths
 */
export function extractFolderStructure(filePaths) {
  const folders = new Map();

  filePaths.forEach((path) => {
    const parts = path.split('/');
    if (parts.length > 1) {
      const folder = parts[0];
      if (!folders.has(folder)) {
        folders.set(folder, { count: 0, subfolders: new Set(), files: [] });
      }
      const folderData = folders.get(folder);
      folderData.count++;
      if (parts.length > 2) {
        folderData.subfolders.add(parts[1]);
      }
      if (parts.length === 2) {
        folderData.files.push(parts[1]);
      }
    }
  });

  // Infer folder purposes based on common patterns
  const folderPurposes = {
    src: 'Source code directory',
    lib: 'Library/utility code',
    api: 'API routes and handlers',
    app: 'Application entry/routes (Next.js app router)',
    pages: 'Page components (React Router/Next.js)',
    components: 'React/UI components',
    hooks: 'Custom React hooks',
    utils: 'Utility functions',
    helpers: 'Helper functions',
    services: 'Service layer/business logic',
    models: 'Data models/types',
    types: 'TypeScript type definitions',
    interfaces: 'Interface definitions',
    config: 'Configuration files',
    constants: 'Constant values',
    features: 'Feature modules',
    modules: 'Application modules',
    routes: 'Route definitions',
    controllers: 'Request controllers',
    middleware: 'Middleware functions',
    store: 'State management (Redux/Zustand)',
    context: 'React context providers',
    assets: 'Static assets',
    public: 'Public/static files',
    styles: 'CSS/styling files',
    tests: 'Test files',
    __tests__: 'Jest test files',
    docs: 'Documentation',
    scripts: 'Build/utility scripts',
    database: 'Database related code',
    migrations: 'Database migrations',
    supabase: 'Supabase configuration',
  };

  const result = [];
  folders.forEach((data, name) => {
    result.push({
      name,
      purpose: folderPurposes[name.toLowerCase()] || 'Unknown',
      fileCount: data.count,
      subfolders: Array.from(data.subfolders),
    });
  });

  return result.sort((a, b) => b.fileCount - a.fileCount);
}

export default {
  parseFile,
  parseJavaScript,
  parsePython,
  parseGo,
  parseRust,
  parsePackageJson,
  detectLanguage,
  isPriorityFile,
  shouldSkipFile,
  extractFolderStructure,
  PRIORITY_PATTERNS,
  SKIP_PATTERNS,
  MAX_FILE_SIZE_BYTES,
};
