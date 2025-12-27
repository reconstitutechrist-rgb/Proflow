/**
 * Repository Analyzer Service
 * Performs deep analysis of GitHub repositories when they are linked
 * Extracts code structure, dependencies, patterns, and generates AI insights
 */

import { db } from './db';
import { github } from './github';
import codeParser from './codeParser';

// Configuration for analysis
const ANALYSIS_CONFIG = {
  maxFilesToAnalyze: 100,
  maxFileSizeKb: 500,
  delayBetweenFiles: 50, // ms
  maxContextLength: 15000,
};

/**
 * Start background analysis for a repository
 * Called when a repository is linked to a workspace
 */
export async function startAnalysis(repositoryId, workspaceId, repoFullName) {
  const [owner, repo] = repoFullName.split('/');

  try {
    // Check if memory already exists
    const existingMemories = await db.entities.RepositoryMemory.list({
      repository_id: repositoryId,
    });

    let memoryId;
    if (existingMemories.length > 0) {
      // Update existing memory to analyzing status
      memoryId = existingMemories[0].id;
      await db.entities.RepositoryMemory.update(memoryId, {
        analysis_status: 'analyzing',
        analysis_started_at: new Date().toISOString(),
        analysis_error: null,
      });
    } else {
      // Create new memory record
      const newMemory = await db.entities.RepositoryMemory.create({
        workspace_id: workspaceId,
        repository_id: repositoryId,
        analysis_status: 'analyzing',
        analysis_started_at: new Date().toISOString(),
      });
      memoryId = newMemory.id;
    }

    // Run analysis in background (don't await)
    runAnalysis(memoryId, owner, repo).catch((error) => {
      console.error('Background analysis failed:', error);
      // Update status to failed
      db.entities.RepositoryMemory.update(memoryId, {
        analysis_status: 'failed',
        analysis_error: error.message,
      }).catch(console.error);
    });

    return { memoryId, status: 'analyzing' };
  } catch (error) {
    console.error('Failed to start analysis:', error);
    throw error;
  }
}

/**
 * Run the full analysis pipeline
 */
async function runAnalysis(memoryId, owner, repo) {
  console.log(`Starting analysis for ${owner}/${repo}`);

  try {
    // Phase 1: Fetch repository structure
    const structureData = await analyzeStructure(owner, repo);

    // Update with partial progress
    await db.entities.RepositoryMemory.update(memoryId, {
      file_structure: JSON.stringify(structureData.folderStructure),
      total_files: structureData.totalFiles,
      languages_breakdown: JSON.stringify(structureData.languages),
      readme_content: structureData.readme,
      last_commit_sha: structureData.lastCommitSha,
    });

    // Phase 2: Deep file analysis
    const analysisData = await analyzeKeyFiles(owner, repo, structureData.priorityFiles);

    // Update with analysis results
    await db.entities.RepositoryMemory.update(memoryId, {
      exported_apis: JSON.stringify(analysisData.exportedApis),
      key_classes: JSON.stringify(analysisData.keyClasses),
      entry_points: JSON.stringify(analysisData.entryPoints),
      internal_dependencies: JSON.stringify(analysisData.internalDependencies),
      external_packages: JSON.stringify(analysisData.externalPackages),
      coding_patterns: JSON.stringify(analysisData.codingPatterns),
      files_analyzed: analysisData.filesAnalyzed,
    });

    // Phase 3: Generate insights (LLM summarization)
    const insights = await generateInsights(structureData, analysisData);

    // Final update
    await db.entities.RepositoryMemory.update(memoryId, {
      architecture_summary: insights.architectureSummary,
      documentation_summary: insights.documentationSummary,
      key_insights: JSON.stringify(insights.keyInsights),
      accumulated_context: insights.accumulatedContext,
      analysis_status: 'completed',
      analysis_completed_at: new Date().toISOString(),
    });

    console.log(`Analysis completed for ${owner}/${repo}`);
    return { success: true };
  } catch (error) {
    console.error(`Analysis failed for ${owner}/${repo}:`, error);
    await db.entities.RepositoryMemory.update(memoryId, {
      analysis_status: 'failed',
      analysis_error: error.message,
    });
    throw error;
  }
}

/**
 * Phase 1: Analyze repository structure
 */
async function analyzeStructure(owner, repo) {
  // Fetch multiple resources in parallel
  const [repoData, tree, readme, languages, commits] = await Promise.all([
    github.getRepo(owner, repo),
    github.getTree(owner, repo, 'HEAD', true).catch(() => ({ tree: [] })),
    github.getReadme(owner, repo).catch(() => null),
    github.getLanguages(owner, repo).catch(() => ({})),
    github.listCommits(owner, repo, { perPage: 1 }).catch(() => []),
  ]);

  // Filter to files only (not directories)
  const files = tree.tree?.filter((item) => item.type === 'blob') || [];

  // Separate priority files from regular files
  const priorityFiles = [];
  const regularFiles = [];

  files.forEach((file) => {
    if (!codeParser.shouldSkipFile(file.path)) {
      if (codeParser.isPriorityFile(file.path)) {
        priorityFiles.push(file);
      } else {
        regularFiles.push(file);
      }
    }
  });

  // Sort priority files by importance
  priorityFiles.sort((a, b) => {
    // README first, then package.json, then index files
    if (a.path.toLowerCase().includes('readme')) return -1;
    if (b.path.toLowerCase().includes('readme')) return 1;
    if (a.path.includes('package.json')) return -1;
    if (b.path.includes('package.json')) return 1;
    if (a.path.includes('index.')) return -1;
    if (b.path.includes('index.')) return 1;
    return 0;
  });

  // Limit total files to analyze
  const filesToAnalyze = [
    ...priorityFiles.slice(0, Math.floor(ANALYSIS_CONFIG.maxFilesToAnalyze * 0.7)),
    ...regularFiles.slice(0, Math.floor(ANALYSIS_CONFIG.maxFilesToAnalyze * 0.3)),
  ];

  // Extract folder structure
  const folderStructure = codeParser.extractFolderStructure(files.map((f) => f.path));

  return {
    repoData,
    folderStructure,
    totalFiles: files.length,
    priorityFiles: filesToAnalyze,
    languages,
    readme: readme?.decodedContent || null,
    lastCommitSha: commits[0]?.sha || null,
  };
}

/**
 * Phase 2: Analyze key files for code structure
 */
async function analyzeKeyFiles(owner, repo, files) {
  const result = {
    exportedApis: [],
    keyClasses: [],
    entryPoints: [],
    internalDependencies: [],
    externalPackages: [],
    codingPatterns: [],
    filesAnalyzed: 0,
    hooks: [],
    components: [],
  };

  // Track dependencies
  const internalDeps = new Map();
  const externalDeps = new Map();

  for (const file of files) {
    try {
      // Skip files that are too large
      if (file.size > ANALYSIS_CONFIG.maxFileSizeKb * 1024) {
        continue;
      }

      // Fetch file content
      const content = await github.getFileContent(owner, repo, file.path);

      if (!content.decodedContent) {
        continue;
      }

      // Special handling for package.json
      if (file.path.endsWith('package.json')) {
        const pkgData = codeParser.parsePackageJson(content.decodedContent);
        if (pkgData) {
          pkgData.dependencies.forEach((dep) => {
            externalDeps.set(dep.name, { ...dep, source: file.path });
          });
          pkgData.devDependencies.forEach((dep) => {
            externalDeps.set(dep.name, { ...dep, source: file.path });
          });
        }
        result.filesAnalyzed++;
        continue;
      }

      // Parse the file
      const parsed = codeParser.parseFile(content.decodedContent, file.path);

      // Collect exports
      if (parsed.exports?.length > 0) {
        parsed.exports.forEach((exp) => {
          result.exportedApis.push({
            name: exp.name,
            type: exp.type,
            file: file.path,
          });
        });
      }

      // Collect functions (looking for entry points and hooks)
      if (parsed.functions?.length > 0) {
        parsed.functions.forEach((func) => {
          // Check for entry point patterns
          if (['main', 'init', 'start', 'run', 'bootstrap', 'setup'].includes(func.name)) {
            result.entryPoints.push({
              name: func.name,
              file: file.path,
              params: func.params,
            });
          }
        });
      }

      // Collect hooks
      if (parsed.hooks?.length > 0) {
        result.hooks.push(...parsed.hooks);
      }

      // Collect components
      if (parsed.components?.length > 0) {
        result.components.push(...parsed.components);
      }

      // Collect classes
      if (parsed.classes?.length > 0) {
        parsed.classes.forEach((cls) => {
          result.keyClasses.push({
            name: cls.name,
            extends: cls.extends,
            file: file.path,
          });
        });
      }

      // Track imports
      if (parsed.imports?.length > 0) {
        parsed.imports.forEach((imp) => {
          if (imp.isExternal) {
            externalDeps.set(imp.source, {
              name: imp.source,
              usedIn: file.path,
            });
          } else {
            const key = `${file.path} -> ${imp.source}`;
            internalDeps.set(key, {
              from: file.path,
              to: imp.source,
              imports: [...(imp.named || []), imp.default].filter(Boolean),
            });
          }
        });
      }

      result.filesAnalyzed++;

      // Rate limiting delay
      await new Promise((resolve) => setTimeout(resolve, ANALYSIS_CONFIG.delayBetweenFiles));
    } catch (error) {
      console.warn(`Failed to analyze ${file.path}:`, error.message);
      // Continue with other files
    }
  }

  // Convert maps to arrays
  result.internalDependencies = Array.from(internalDeps.values()).slice(0, 50);
  result.externalPackages = Array.from(externalDeps.values()).slice(0, 50);

  // Detect patterns
  result.codingPatterns = detectPatterns(result);

  return result;
}

/**
 * Detect coding patterns from analysis results
 */
function detectPatterns(analysisData) {
  const patterns = [];

  // Check for React patterns
  if (analysisData.hooks.length > 0) {
    patterns.push({
      name: 'Custom React Hooks',
      description: `Uses ${analysisData.hooks.length} custom hooks for reusable logic`,
      examples: analysisData.hooks.slice(0, 3).map((h) => h.name),
    });
  }

  if (analysisData.components.length > 0) {
    patterns.push({
      name: 'React Components',
      description: `Contains ${analysisData.components.length} React components`,
      examples: analysisData.components.slice(0, 3).map((c) => c.name),
    });
  }

  // Check for class-based patterns
  if (analysisData.keyClasses.length > 0) {
    const managers = analysisData.keyClasses.filter((c) => c.name.includes('Manager'));
    const services = analysisData.keyClasses.filter((c) => c.name.includes('Service'));
    const controllers = analysisData.keyClasses.filter((c) => c.name.includes('Controller'));

    if (managers.length > 0) {
      patterns.push({
        name: 'Manager Pattern',
        description: 'Uses Manager classes for orchestration',
        examples: managers.slice(0, 3).map((m) => m.name),
      });
    }

    if (services.length > 0) {
      patterns.push({
        name: 'Service Layer',
        description: 'Implements service layer for business logic',
        examples: services.slice(0, 3).map((s) => s.name),
      });
    }

    if (controllers.length > 0) {
      patterns.push({
        name: 'MVC Controllers',
        description: 'Uses controller pattern for request handling',
        examples: controllers.slice(0, 3).map((c) => c.name),
      });
    }
  }

  // Check for API patterns
  const apiExports = analysisData.exportedApis.filter(
    (e) => e.file.includes('/api/') || e.file.includes('/routes/')
  );
  if (apiExports.length > 0) {
    patterns.push({
      name: 'API Layer',
      description: `Has ${apiExports.length} API exports for data access`,
      examples: apiExports.slice(0, 3).map((e) => e.name),
    });
  }

  return patterns;
}

/**
 * Phase 3: Generate AI insights and accumulated context
 */
async function generateInsights(structureData, analysisData) {
  // Build architecture summary from collected data
  const architectureSummary = buildArchitectureSummary(structureData, analysisData);

  // Build documentation summary
  const documentationSummary = buildDocumentationSummary(structureData);

  // Extract key insights
  const keyInsights = extractKeyInsights(structureData, analysisData);

  // Build accumulated context for AI prompts
  const accumulatedContext = buildAccumulatedContext(
    structureData,
    analysisData,
    architectureSummary,
    keyInsights
  );

  return {
    architectureSummary,
    documentationSummary,
    keyInsights,
    accumulatedContext,
  };
}

/**
 * Build architecture summary from analysis data
 */
function buildArchitectureSummary(structureData, analysisData) {
  const parts = [];

  // Language breakdown
  const languageEntries = Object.entries(structureData.languages);
  if (languageEntries.length > 0) {
    const total = languageEntries.reduce((sum, [_, bytes]) => sum + bytes, 0);
    const breakdown = languageEntries
      .slice(0, 5)
      .map(([lang, bytes]) => `${lang} (${Math.round((bytes / total) * 100)}%)`)
      .join(', ');
    parts.push(`**Languages**: ${breakdown}`);
  }

  // Folder structure
  if (structureData.folderStructure.length > 0) {
    const topFolders = structureData.folderStructure
      .slice(0, 6)
      .map((f) => `- \`${f.name}/\`: ${f.purpose} (${f.fileCount} files)`)
      .join('\n');
    parts.push(`**Project Structure**:\n${topFolders}`);
  }

  // Detected patterns
  if (analysisData.codingPatterns.length > 0) {
    const patterns = analysisData.codingPatterns
      .map((p) => `- **${p.name}**: ${p.description}`)
      .join('\n');
    parts.push(`**Coding Patterns**:\n${patterns}`);
  }

  // Key exports
  if (analysisData.exportedApis.length > 0) {
    const exports = analysisData.exportedApis
      .slice(0, 10)
      .map((e) => `- \`${e.name}\` (${e.type}) in \`${e.file}\``)
      .join('\n');
    parts.push(`**Key Exports**:\n${exports}`);
  }

  // Entry points
  if (analysisData.entryPoints.length > 0) {
    const entries = analysisData.entryPoints
      .slice(0, 5)
      .map((e) => `- \`${e.name}()\` in \`${e.file}\``)
      .join('\n');
    parts.push(`**Entry Points**:\n${entries}`);
  }

  return parts.join('\n\n');
}

/**
 * Build documentation summary from README
 */
function buildDocumentationSummary(structureData) {
  if (!structureData.readme) {
    return 'No README documentation found.';
  }

  // Extract key sections from README
  const readme = structureData.readme;
  const lines = readme.split('\n');

  // Find headers and their content
  const sections = [];
  let currentSection = null;
  let currentContent = [];

  lines.forEach((line) => {
    if (line.startsWith('#')) {
      if (currentSection) {
        sections.push({
          title: currentSection,
          content: currentContent.join('\n').trim().substring(0, 300),
        });
      }
      currentSection = line.replace(/^#+\s*/, '');
      currentContent = [];
    } else if (currentSection) {
      currentContent.push(line);
    }
  });

  // Add last section
  if (currentSection) {
    sections.push({
      title: currentSection,
      content: currentContent.join('\n').trim().substring(0, 300),
    });
  }

  // Format summary
  const summary = sections
    .slice(0, 5)
    .map((s) => `**${s.title}**: ${s.content.substring(0, 150)}...`)
    .join('\n\n');

  return summary || 'README exists but could not be parsed.';
}

/**
 * Extract key insights from analysis
 */
function extractKeyInsights(structureData, analysisData) {
  const insights = [];

  // Size insight
  insights.push({
    category: 'scale',
    insight: `Repository contains ${structureData.totalFiles} files with ${analysisData.filesAnalyzed} key files analyzed.`,
    importance: 'medium',
  });

  // Architecture insight
  if (analysisData.codingPatterns.length > 0) {
    insights.push({
      category: 'architecture',
      insight: `Uses ${analysisData.codingPatterns.map((p) => p.name).join(', ')} patterns.`,
      importance: 'high',
    });
  }

  // React-specific insights
  if (analysisData.hooks.length > 0) {
    insights.push({
      category: 'react',
      insight: `Custom hooks: ${analysisData.hooks
        .slice(0, 5)
        .map((h) => h.name)
        .join(', ')}`,
      importance: 'high',
    });
  }

  if (analysisData.components.length > 0) {
    insights.push({
      category: 'react',
      insight: `Key components: ${analysisData.components
        .slice(0, 5)
        .map((c) => c.name)
        .join(', ')}`,
      importance: 'medium',
    });
  }

  // Dependencies insight
  if (analysisData.externalPackages.length > 0) {
    const keyDeps = analysisData.externalPackages
      .slice(0, 10)
      .map((p) => p.name)
      .join(', ');
    insights.push({
      category: 'dependencies',
      insight: `Key dependencies: ${keyDeps}`,
      importance: 'medium',
    });
  }

  return insights;
}

/**
 * Build accumulated context for AI prompts
 */
function buildAccumulatedContext(structureData, analysisData, architectureSummary, keyInsights) {
  const parts = [];

  parts.push('# Repository Knowledge Base');
  parts.push('');
  parts.push(
    'This is VERIFIED information from static code analysis. Use this to provide accurate answers.'
  );
  parts.push('');

  // Architecture
  parts.push('## Architecture');
  parts.push(architectureSummary);
  parts.push('');

  // Key files and exports
  parts.push('## Key APIs and Exports');
  if (analysisData.exportedApis.length > 0) {
    analysisData.exportedApis.slice(0, 20).forEach((api) => {
      parts.push(`- \`${api.name}\` (${api.type}) - ${api.file}`);
    });
  }
  parts.push('');

  // Hooks (for React projects)
  if (analysisData.hooks.length > 0) {
    parts.push('## Custom Hooks');
    analysisData.hooks.slice(0, 10).forEach((hook) => {
      parts.push(`- \`${hook.name}(${hook.params.join(', ')})\` - ${hook.file}`);
    });
    parts.push('');
  }

  // Classes
  if (analysisData.keyClasses.length > 0) {
    parts.push('## Key Classes');
    analysisData.keyClasses.slice(0, 10).forEach((cls) => {
      const ext = cls.extends ? ` extends ${cls.extends}` : '';
      parts.push(`- \`class ${cls.name}${ext}\` - ${cls.file}`);
    });
    parts.push('');
  }

  // Dependencies
  if (analysisData.externalPackages.length > 0) {
    parts.push('## External Dependencies');
    analysisData.externalPackages.slice(0, 15).forEach((pkg) => {
      parts.push(`- ${pkg.name}${pkg.version ? ` (${pkg.version})` : ''}`);
    });
    parts.push('');
  }

  // Insights
  parts.push('## Key Insights');
  keyInsights.forEach((insight) => {
    parts.push(`- [${insight.category}] ${insight.insight}`);
  });

  // Truncate to max length
  let context = parts.join('\n');
  if (context.length > ANALYSIS_CONFIG.maxContextLength) {
    context = context.substring(0, ANALYSIS_CONFIG.maxContextLength) + '\n\n[Truncated for length]';
  }

  return context;
}

/**
 * Check if analysis needs refresh (stale check)
 */
export async function checkAnalysisFreshness(repositoryId, owner, repo) {
  try {
    const memories = await db.entities.RepositoryMemory.list({
      repository_id: repositoryId,
    });

    if (memories.length === 0) {
      return { needsRefresh: true, reason: 'no_memory' };
    }

    const memory = memories[0];

    // Check if analysis failed
    if (memory.analysis_status === 'failed') {
      return { needsRefresh: true, reason: 'previous_failure' };
    }

    // Check if still analyzing
    if (memory.analysis_status === 'analyzing') {
      return { needsRefresh: false, reason: 'in_progress' };
    }

    // Check for new commits
    if (memory.last_commit_sha) {
      const commits = await github.listCommits(owner, repo, { perPage: 1 });
      if (commits[0]?.sha !== memory.last_commit_sha) {
        // Mark as stale
        await db.entities.RepositoryMemory.update(memory.id, {
          analysis_status: 'stale',
        });
        return { needsRefresh: true, reason: 'new_commits' };
      }
    }

    return { needsRefresh: false, reason: 'up_to_date' };
  } catch (error) {
    console.error('Error checking analysis freshness:', error);
    return { needsRefresh: true, reason: 'error' };
  }
}

/**
 * Get repository memory for use in AI context
 */
export async function getRepositoryMemory(repositoryId) {
  try {
    const memories = await db.entities.RepositoryMemory.list({
      repository_id: repositoryId,
    });

    if (memories.length === 0) {
      return null;
    }

    const memory = memories[0];

    // Parse JSON fields
    return {
      ...memory,
      file_structure: safeJsonParse(memory.file_structure),
      exported_apis: safeJsonParse(memory.exported_apis),
      key_classes: safeJsonParse(memory.key_classes),
      entry_points: safeJsonParse(memory.entry_points),
      internal_dependencies: safeJsonParse(memory.internal_dependencies),
      external_packages: safeJsonParse(memory.external_packages),
      coding_patterns: safeJsonParse(memory.coding_patterns),
      key_insights: safeJsonParse(memory.key_insights),
      languages_breakdown: safeJsonParse(memory.languages_breakdown),
    };
  } catch (error) {
    console.error('Error getting repository memory:', error);
    return null;
  }
}

/**
 * Safe JSON parse helper
 */
function safeJsonParse(str) {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

/**
 * Perform incremental analysis on changed files
 * More efficient than full re-analysis when only a few files changed
 *
 * @param {string} repositoryId - The repository ID
 * @param {string} workspaceId - The workspace ID
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Object>} Analysis result
 */
export async function incrementalAnalysis(repositoryId, workspaceId, owner, repo) {
  const memory = await getRepositoryMemory(repositoryId);

  // If no existing memory or no last commit, do full analysis
  if (!memory || !memory.last_commit_sha) {
    console.log('No existing memory, starting full analysis');
    return startAnalysis(repositoryId, workspaceId, `${owner}/${repo}`);
  }

  try {
    // Get commits since last analysis
    const commits = await github.listCommits(owner, repo, {
      since: memory.analysis_completed_at || undefined,
      perPage: 50,
    });

    if (!commits || commits.length === 0) {
      console.log('No new commits since last analysis');
      return { status: 'up_to_date', filesUpdated: 0 };
    }

    // If too many commits, suggest full re-analysis
    if (commits.length > 30) {
      console.log('Too many commits for incremental analysis, triggering full re-analysis');
      return startAnalysis(repositoryId, workspaceId, `${owner}/${repo}`);
    }

    console.log(`Found ${commits.length} commits since last analysis`);

    // Get changed files from recent commits
    const changedFiles = new Set();
    for (const commit of commits.slice(0, 10)) {
      try {
        const details = await github.getCommit(owner, repo, commit.sha);
        details.files?.forEach((f) => {
          if (f.filename && !codeParser.shouldSkipFile(f.filename)) {
            changedFiles.add(f.filename);
          }
        });
      } catch (e) {
        console.warn(`Could not get details for commit ${commit.sha}:`, e.message);
      }
    }

    if (changedFiles.size === 0) {
      console.log('No relevant file changes found');
      // Update commit sha anyway
      await db.entities.RepositoryMemory.update(memory.id, {
        last_commit_sha: commits[0].sha,
        last_incremental_at: new Date().toISOString(),
      });
      return { status: 'up_to_date', filesUpdated: 0 };
    }

    console.log(`Analyzing ${changedFiles.size} changed files`);

    // Analyze only changed files (limit to 20)
    const filesToAnalyze = Array.from(changedFiles)
      .slice(0, 20)
      .map((path) => ({ path, size: 0 }));

    const deltaAnalysis = await analyzeKeyFiles(owner, repo, filesToAnalyze);

    // Build delta context
    const deltaContext = buildDeltaContext(deltaAnalysis, commits);

    // Update memory with delta
    await db.entities.RepositoryMemory.update(memory.id, {
      delta_context: deltaContext,
      last_incremental_at: new Date().toISOString(),
      commits_since_full_analysis: (memory.commits_since_full_analysis || 0) + commits.length,
      last_commit_sha: commits[0].sha,
    });

    console.log(`Incremental analysis complete: ${filesToAnalyze.length} files updated`);

    return {
      status: 'incremental_update',
      filesUpdated: filesToAnalyze.length,
      commitsProcessed: commits.length,
    };
  } catch (error) {
    console.error('Incremental analysis failed:', error);
    throw error;
  }
}

/**
 * Build delta context from incremental analysis
 */
function buildDeltaContext(analysis, commits) {
  const parts = ['## Recent Changes'];

  // Commit summary
  parts.push(`\n${commits.length} commits since last full analysis.`);

  if (commits.length > 0) {
    parts.push('\n### Recent Commit Messages:');
    commits.slice(0, 5).forEach((c) => {
      const message = c.commit?.message?.split('\n')[0] || 'No message';
      parts.push(`- ${message.substring(0, 80)}`);
    });
  }

  // New/modified APIs
  if (analysis.exportedApis?.length > 0) {
    parts.push('\n### New/Modified APIs:');
    analysis.exportedApis.forEach((api) => {
      parts.push(`- \`${api.name}\` (${api.type}) in \`${api.file}\``);
    });
  }

  // New/modified classes
  if (analysis.keyClasses?.length > 0) {
    parts.push('\n### New/Modified Classes:');
    analysis.keyClasses.forEach((cls) => {
      const ext = cls.extends ? ` extends ${cls.extends}` : '';
      parts.push(`- \`class ${cls.name}${ext}\` in \`${cls.file}\``);
    });
  }

  // New hooks (React)
  if (analysis.hooks?.length > 0) {
    parts.push('\n### New/Modified Hooks:');
    analysis.hooks.forEach((hook) => {
      parts.push(`- \`${hook.name}\` in \`${hook.file}\``);
    });
  }

  // New dependencies
  if (analysis.externalPackages?.length > 0) {
    parts.push('\n### New Dependencies:');
    analysis.externalPackages.slice(0, 10).forEach((pkg) => {
      parts.push(`- ${pkg.name}${pkg.version ? ` (${pkg.version})` : ''}`);
    });
  }

  return parts.join('\n');
}

/**
 * Trigger refresh if needed based on staleness
 * Convenience method that checks freshness and triggers appropriate analysis
 */
export async function refreshIfNeeded(repositoryId, workspaceId, owner, repo) {
  const freshness = await checkAnalysisFreshness(repositoryId, owner, repo);

  if (!freshness.needsRefresh) {
    return { status: 'fresh', reason: freshness.reason };
  }

  // Decide between incremental and full analysis
  if (freshness.reason === 'new_commits') {
    return incrementalAnalysis(repositoryId, workspaceId, owner, repo);
  } else {
    return startAnalysis(repositoryId, workspaceId, `${owner}/${repo}`);
  }
}

export default {
  startAnalysis,
  checkAnalysisFreshness,
  getRepositoryMemory,
  incrementalAnalysis,
  refreshIfNeeded,
};
