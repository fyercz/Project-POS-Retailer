/** Endpoint sistem: update GitHub, verifikasi file, pembersihan, unduh .exe. Dipindah dari server.ts tanpa perubahan logika. */
import express from 'express';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import util from 'util';
import { adminOnly } from '../security.ts';
import { cleanAndPruneDatabase as cleanSqliteDatabase } from '../sqliteMasterDb.ts';

const execPromise = util.promisify(exec);

export const systemRouter = express.Router();
const router = systemRouter;

// ==============================================================================
// GITHUB AUTO-UPDATE, FILE VERIFICATION & SYSTEM CLEANUP ENDPOINTS
// ==============================================================================
const OFFICIAL_GITHUB_REPO_URL = 'https://github.com/fyercz/Project-POS-Retailer.git';
const OFFICIAL_GIT_BRANCH = 'main';

interface RemoteCommitInfo {
  commitHash: string; // 7 chars short hash
  fullHash: string;
  commitMessage: string;
  commitDate: string;
  authorName: string;
  htmlUrl: string;
  fetchedAt: string;
}

let cachedRemoteCommit: RemoteCommitInfo | null = null;
let lastRemoteFetchTime = 0;

// Helper to query live GitHub API / ls-remote for actual latest commit
async function fetchLatestGitHubCommitInfo(forceRefresh = false): Promise<RemoteCommitInfo | null> {
  const now = Date.now();
  if (!forceRefresh && cachedRemoteCommit && now - lastRemoteFetchTime < 45000) {
    return cachedRemoteCommit;
  }

  // 1. Primary: Query GitHub REST API directly for accurate commit metadata
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);
    const resp = await fetch('https://api.github.com/repos/fyercz/Project-POS-Retailer/commits/main', {
      headers: {
        'User-Agent': 'Ulilmart-POS-Retailer',
        'Accept': 'application/vnd.github.v3+json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (resp.ok) {
      const data: any = await resp.json();
      const fullHash = data.sha || '';
      const commitHash = fullHash.substring(0, 7);
      const commitMessage = (data.commit?.message || '').split('\n')[0].trim();
      const commitDate = data.commit?.author?.date || '';
      const authorName = data.commit?.author?.name || '';
      const htmlUrl = data.html_url || '';

      cachedRemoteCommit = {
        commitHash,
        fullHash,
        commitMessage,
        commitDate,
        authorName,
        htmlUrl,
        fetchedAt: new Date().toISOString(),
      };
      lastRemoteFetchTime = now;
      return cachedRemoteCommit;
    }
  } catch {}

  // 2. Secondary fallback: Query git ls-remote from local git binary
  try {
    const { stdout: lsOut } = await execPromise(`git ls-remote ${OFFICIAL_GITHUB_REPO_URL} refs/heads/main`, {
      cwd: process.cwd(),
      timeout: 10000,
    });
    if (lsOut) {
      const fullHash = lsOut.split('\t')[0].trim();
      if (fullHash) {
        cachedRemoteCommit = {
          commitHash: fullHash.substring(0, 7),
          fullHash,
          commitMessage: cachedRemoteCommit?.commitMessage || 'Pembaruan terkini dari repositori GitHub',
          commitDate: cachedRemoteCommit?.commitDate || new Date().toISOString(),
          authorName: cachedRemoteCommit?.authorName || 'GitHub',
          htmlUrl: `https://github.com/fyercz/Project-POS-Retailer/commit/${fullHash}`,
          fetchedAt: new Date().toISOString(),
        };
        lastRemoteFetchTime = now;
        return cachedRemoteCommit;
      }
    }
  } catch {}

  return cachedRemoteCommit;
}

interface JunkFileInfo {
  path: string;
  relativePath: string;
  size: number;
  category: string;
  reason: string;
}

// Helper to scan for unnecessary junk files (logs, temporary files, OS junk, caches)
function scanUnnecessaryFiles(rootDir: string): JunkFileInfo[] {
  const junkList: JunkFileInfo[] = [];
  const junkPatterns = [
    { pattern: /\.DS_Store$/i, category: 'OS System Junk', reason: 'File metadata macOS Finder tidak diperlukan' },
    { pattern: /^Thumbs\.db$/i, category: 'OS System Junk', reason: 'Cache thumbnail Windows Explorer' },
    { pattern: /^ehthumbs\.db$/i, category: 'OS System Junk', reason: 'Cache thumbnail media Windows' },
    { pattern: /^desktop\.ini$/i, category: 'OS System Junk', reason: 'Konfigurasi folder Windows Explorer' },
    { pattern: /\.(log)$/i, category: 'Logs & Debug Files', reason: 'File catatan log sistem/server' },
    { pattern: /(npm-debug|yarn-error|yarn-debug|pnpm-debug)\.log.*/i, category: 'Logs & Debug Files', reason: 'Log error package manager' },
    { pattern: /\.(tmp|temp|swp|bak|old)$/i, category: 'Temporary & Backup Files', reason: 'File sementara / backup editor' },
    { pattern: /~$/i, category: 'Temporary & Backup Files', reason: 'File cadangan sementara teks editor' },
    { pattern: /^tsconfig\.tsbuildinfo$/i, category: 'Build Cache & Temp Bundles', reason: 'Cache kompilasi incremental TypeScript' },
    { pattern: /^\.eslintcache$/i, category: 'Build Cache & Temp Bundles', reason: 'Cache validasi ESLint' },
  ];

  function traverse(dir: string, depth = 0) {
    if (depth > 6) return;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = path.relative(rootDir, fullPath);

        // Never scan into .git or core protected folders
        if (entry.isDirectory()) {
          if (entry.name === '.git') continue;
          if (entry.name === 'node_modules') {
            // Check for stale vite cache inside node_modules/.vite
            const viteCachePath = path.join(fullPath, '.vite');
            if (fs.existsSync(viteCachePath)) {
              try {
                const viteCacheStat = fs.statSync(viteCachePath);
                junkList.push({
                  path: viteCachePath,
                  relativePath: path.join(relPath, '.vite'),
                  size: viteCacheStat.size || 4096,
                  category: 'Build Cache & Temp Bundles',
                  reason: 'Cache kompilasi pre-bundle Vite lokal',
                });
              } catch {}
            }

            const nmCachePath = path.join(fullPath, '.cache');
            if (fs.existsSync(nmCachePath)) {
              try {
                const nmCacheStat = fs.statSync(nmCachePath);
                junkList.push({
                  path: nmCachePath,
                  relativePath: path.join(relPath, '.cache'),
                  size: nmCacheStat.size || 4096,
                  category: 'Build Cache & Temp Bundles',
                  reason: 'Cache kompilasi package dependensi',
                });
              } catch {}
            }
            continue;
          }
          traverse(fullPath, depth + 1);
        } else if (entry.isFile()) {
          for (const rule of junkPatterns) {
            if (rule.pattern.test(entry.name)) {
              try {
                const stat = fs.statSync(fullPath);
                junkList.push({
                  path: fullPath,
                  relativePath: relPath,
                  size: stat.size,
                  category: rule.category,
                  reason: rule.reason,
                });
              } catch {}
              break;
            }
          }
        }
      }
    } catch {}
  }

  traverse(rootDir, 0);
  return junkList;
}

// Safe internal file cleaner
function cleanUnnecessaryFilesInternal(rootDir: string): { count: number; bytesFreed: number; deleted: string[] } {
  const junkFiles = scanUnnecessaryFiles(rootDir);
  let count = 0;
  let bytesFreed = 0;
  const deleted: string[] = [];

  for (const item of junkFiles) {
    try {
      const normalized = item.relativePath.replace(/\\/g, '/');
      if (
        normalized.startsWith('.git') ||
        normalized === 'package.json' ||
        normalized === 'server.ts' ||
        normalized.startsWith('src/') ||
        normalized.startsWith('public/') ||
        normalized.startsWith('data/')
      ) {
        continue;
      }

      if (fs.existsSync(item.path)) {
        const stat = fs.statSync(item.path);
        if (stat.isDirectory()) {
          fs.rmSync(item.path, { recursive: true, force: true });
        } else {
          fs.unlinkSync(item.path);
        }
        count++;
        bytesFreed += item.size;
        deleted.push(item.relativePath);
      }
    } catch {}
  }

  return { count, bytesFreed, deleted };
}

router.get('/api/system/git-status', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true' || req.query.refresh === '1';
    const remoteInfo = await fetchLatestGitHubCommitInfo(forceRefresh);

    const gitDir = path.join(process.cwd(), '.git');
    const isGitRepo = fs.existsSync(gitDir);

    let branch = 'main';
    let currentCommit = '';
    let commitMessage = '';
    let commitDate = '';
    let remoteUrl = OFFICIAL_GITHUB_REPO_URL;
    let uncommittedCount = 0;

    if (isGitRepo) {
      try {
        const { stdout: branchOut } = await execPromise('git branch --show-current', { cwd: process.cwd() });
        branch = branchOut.trim() || 'main';
      } catch {}

      try {
        const { stdout: commitOut } = await execPromise('git rev-parse --short HEAD', { cwd: process.cwd() });
        currentCommit = commitOut.trim();
      } catch {}

      try {
        const { stdout: logOut } = await execPromise('git log -1 --pretty=format:"%s"', { cwd: process.cwd() });
        commitMessage = logOut.trim();
      } catch {}

      try {
        const { stdout: dateOut } = await execPromise('git log -1 --pretty=format:"%cd" --date=relative', { cwd: process.cwd() });
        commitDate = dateOut.trim();
      } catch {}

      try {
        const { stdout: remoteOut } = await execPromise('git remote get-url origin', { cwd: process.cwd() });
        remoteUrl = remoteOut.trim() || OFFICIAL_GITHUB_REPO_URL;
      } catch {}

      try {
        const { stdout: stOut } = await execPromise('git status --porcelain', { cwd: process.cwd() });
        uncommittedCount = stOut.split('\n').filter((l) => l.trim()).length;
      } catch {}
    }

    const remoteLatestCommit = remoteInfo?.commitHash || '';
    const hasUpdate = (currentCommit && remoteLatestCommit)
      ? currentCommit.toLowerCase() !== remoteLatestCommit.toLowerCase()
      : !isGitRepo && Boolean(remoteLatestCommit);

    const isUpToDate = (currentCommit && remoteLatestCommit)
      ? currentCommit.toLowerCase() === remoteLatestCommit.toLowerCase()
      : false;

    res.json({
      isGitRepo,
      branch: branch || 'main',
      currentCommit: currentCommit || (isGitRepo ? '-' : 'Non-Git (Lokal)'),
      commitMessage: commitMessage || (isGitRepo ? '' : 'Versi build lokal mandiri'),
      commitDate: commitDate || '',
      remoteUrl,
      officialRepoUrl: OFFICIAL_GITHUB_REPO_URL,
      remoteLatestCommit: remoteLatestCommit || currentCommit || '',
      remoteCommitMessage: remoteInfo?.commitMessage || '',
      remoteCommitDate: remoteInfo?.commitDate || '',
      remoteCommitAuthor: remoteInfo?.authorName || '',
      remoteHtmlUrl: remoteInfo?.htmlUrl || '',
      lastCheckedAt: remoteInfo?.fetchedAt || new Date().toISOString(),
      hasUpdate,
      isUpToDate,
      uncommittedCount,
      nodeVersion: process.version,
      platform: process.platform,
    });
  } catch (err: any) {
    res.status(500).json({ isGitRepo: false, error: err.message });
  }
});

/**
 * Lindungi data toko (folder data/) sebelum `git reset --hard`.
 * 1) Salin data/ ke data-backup/<waktu>/ (simpan 5 cadangan terakhir).
 * 2) Lepas data/ dari index Git supaya reset tidak menghapus/menimpa database yang sedang dipakai
 *    pada instalasi lama yang masih melacak data/ di Git.
 */
async function protectStoreDataBeforeReset(): Promise<string | null> {
  const root = process.cwd();
  const dataDir = path.join(root, 'data');
  let backupPath: string | null = null;
  try {
    if (fs.existsSync(dataDir)) {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupRoot = path.join(root, 'data-backup');
      backupPath = path.join(backupRoot, stamp);
      fs.mkdirSync(backupRoot, { recursive: true });
      fs.cpSync(dataDir, backupPath, { recursive: true });
      const old = fs.readdirSync(backupRoot).sort();
      for (const name of old.slice(0, Math.max(0, old.length - 5))) {
        fs.rmSync(path.join(backupRoot, name), { recursive: true, force: true });
      }
    }
  } catch (e: any) {
    // Jika cadangan gagal, jangan lanjutkan operasi yang bisa menimpa data.
    throw new Error('Gagal membuat cadangan data toko sebelum update: ' + (e?.message || e));
  }
  await execPromise('git rm -r --cached --ignore-unmatch -q data', { cwd: root }).catch(() => {});
  return backupPath;
}

// Explicitly configure or re-initialize git remote to official repository
router.post('/api/system/git-configure', adminOnly, async (req, res) => {
  try {
    const gitDir = path.join(process.cwd(), '.git');
    const isGitRepo = fs.existsSync(gitDir);

    if (!isGitRepo) {
      await protectStoreDataBeforeReset();
      await execPromise(`git init && git remote add origin ${OFFICIAL_GITHUB_REPO_URL} && git fetch origin main --depth=10 && git branch -M main && git reset --hard origin/main`, {
        cwd: process.cwd(),
        timeout: 35000,
      });
    } else {
      try {
        await execPromise(`git remote set-url origin ${OFFICIAL_GITHUB_REPO_URL}`, { cwd: process.cwd() });
      } catch {
        await execPromise(`git remote add origin ${OFFICIAL_GITHUB_REPO_URL}`, { cwd: process.cwd() });
      }
    }

    // Refresh cache
    cachedRemoteCommit = null;
    lastRemoteFetchTime = 0;

    res.json({
      success: true,
      message: `Repositori Git berhasil dikonfigurasi ke ${OFFICIAL_GITHUB_REPO_URL}`,
      officialRepoUrl: OFFICIAL_GITHUB_REPO_URL,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api/system/git-pull', adminOnly, async (req, res) => {
  try {
    const gitDir = path.join(process.cwd(), '.git');
    if (!fs.existsSync(gitDir)) {
      try {
        await execPromise(`git init && git remote add origin ${OFFICIAL_GITHUB_REPO_URL}`, {
          cwd: process.cwd(),
          timeout: 15000,
        });
      } catch (initErr: any) {
        console.warn('Git init warning:', initErr.message);
      }
    }

    // 1. Auto cleanup unnecessary files prior to update
    const cleanupResult = cleanUnnecessaryFilesInternal(process.cwd());

    // 2. Ensure remote points to official GitHub repo
    try {
      await execPromise(`git remote set-url origin ${OFFICIAL_GITHUB_REPO_URL}`, { cwd: process.cwd() });
    } catch {
      try {
        await execPromise(`git remote add origin ${OFFICIAL_GITHUB_REPO_URL}`, { cwd: process.cwd() });
      } catch {}
    }

    // 3. Bulletproof update: fetch & hard reset to origin/main (prevents untracked merge conflict aborts)
    //    Data toko (data/) dicadangkan dan dilepas dari Git dulu agar tidak tertimpa.
    let dataBackupPath: string | null = null;
    try {
      dataBackupPath = await protectStoreDataBeforeReset();
    } catch (backupErr: any) {
      return res.status(500).json({
        success: false,
        step: 'backup data',
        message: 'Update dibatalkan: ' + backupErr.message,
      });
    }
    let pullOutput = '';
    try {
      const { stdout: fetchOut, stderr: fetchErr } = await execPromise('git fetch origin main --depth=10 || git fetch origin main', {
        cwd: process.cwd(),
        timeout: 45000,
      });
      await execPromise('git branch -M main', { cwd: process.cwd(), timeout: 10000 }).catch(() => {});
      // Jika commit tujuan MASIH melacak data/ (versi lama), reset akan menimpa database toko.
      const { stdout: trackedData } = await execPromise('git ls-tree -r origin/main --name-only -- data', {
        cwd: process.cwd(),
      }).catch(() => ({ stdout: '' }));
      const { stdout: resetOut, stderr: resetErr } = await execPromise('git reset --hard origin/main', {
        cwd: process.cwd(),
        timeout: 30000,
      });
      if (trackedData.trim() && dataBackupPath) {
        fs.cpSync(dataBackupPath, path.join(process.cwd(), 'data'), { recursive: true, force: true });
        console.warn('[Update] Commit tujuan melacak data/; database toko dipulihkan dari cadangan:', dataBackupPath);
      }
      pullOutput = [fetchOut, fetchErr, resetOut, resetErr].filter(Boolean).join('\n').trim();
    } catch (pullErr: any) {
      try {
        await execPromise('git fetch origin master && git branch -M master && git reset --hard origin/master', {
          cwd: process.cwd(),
          timeout: 45000,
        });
        pullOutput = 'Berhasil disinkronkan ke cabang master.';
      } catch (fallbackErr: any) {
        return res.status(500).json({
          success: false,
          step: 'git fetch & reset',
          message: 'Gagal memperbarui kode dari GitHub. Periksa koneksi internet Anda.',
          details: pullErr.message || fallbackErr.message,
        });
      }
    }

    // Invalidate remote cache
    cachedRemoteCommit = null;
    lastRemoteFetchTime = 0;

    // 4. Pasang dependensi baru (bila package.json berubah) lalu build ulang
    let buildOutput = '';
    let buildOk = true;
    try {
      await execPromise('npm install --no-audit --no-fund', { cwd: process.cwd(), timeout: 300000 });
    } catch (installErr: any) {
      console.warn('npm install warning after pull:', installErr?.message);
    }
    try {
      const { stdout, stderr } = await execPromise('npm run build', {
        cwd: process.cwd(),
        timeout: 180000,
      });
      buildOutput = (stdout || stderr || '').trim();
    } catch (buildErr: any) {
      buildOk = false;
      console.warn('Build gagal setelah update:', buildErr?.message);
      buildOutput = 'Build gagal: ' + buildErr?.message;
    }

    // Read new commit
    let newCommit = '';
    try {
      const { stdout } = await execPromise('git rev-parse --short HEAD', { cwd: process.cwd() });
      newCommit = stdout.trim();
    } catch {}

    res.status(buildOk ? 200 : 500).json({
      success: buildOk,
      restartRequired: buildOk,
      message: buildOk
        ? `Kode diperbarui ke commit ${newCommit || 'terbaru'}. Tutup aplikasi (BERHENTI-KASIR.bat) lalu jalankan lagi (MULAI-KASIR.bat) agar versi baru aktif.`
        : 'Kode sudah diunduh, tetapi build gagal. Jalankan update.bat di komputer server untuk melihat detail error.',
      officialRepoUrl: OFFICIAL_GITHUB_REPO_URL,
      newCommit,
      pullOutput,
      buildOutput,
      dataBackupPath,
      cleanedFilesCount: cleanupResult.count,
      cleanedBytesFreed: cleanupResult.bytesFreed,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Comprehensive system file integrity verification endpoint
router.get('/api/system/verify-files', adminOnly, async (req, res) => {
  try {
    const rootDir = process.cwd();

    // Critical system checklist items
    const checklist = [
      // Core Runtime
      { path: 'package.json', category: 'Core Runtime', critical: true, description: 'Konfigurasi dependensi dan skrip proyek' },
      { path: 'server.ts', category: 'Core Runtime', critical: true, description: 'Server backend Express & router API' },
      { path: 'index.html', category: 'Core Runtime', critical: true, description: 'Template HTML utama aplikasi SPA' },
      { path: 'vite.config.ts', category: 'Core Runtime', critical: true, description: 'Konfigurasi bundler Vite' },
      { path: 'tsconfig.json', category: 'Core Runtime', critical: false, description: 'Konfigurasi compiler TypeScript' },
      { path: 'metadata.json', category: 'Core Runtime', critical: false, description: 'Metadata identitas aplikasi POS' },

      // App & UI Source
      { path: 'src/main.tsx', category: 'Source Code', critical: true, description: 'Entry point React DOM' },
      { path: 'src/App.tsx', category: 'Source Code', critical: true, description: 'Komponen induk aplikasi' },
      { path: 'src/context/POSContext.tsx', category: 'Source Code', critical: true, description: 'Manajer state POS, kasir & transaksi' },
      { path: 'src/types.ts', category: 'Source Code', critical: true, description: 'Definisi tipe data TypeScript' },
      { path: 'src/index.css', category: 'Source Code', critical: false, description: 'Styling utama Tailwind CSS' },
      { path: 'src/components/Header.tsx', category: 'Source Code', critical: false, description: 'Header navigasi kasir & profil' },
      { path: 'src/components/ProductCatalog.tsx', category: 'Source Code', critical: false, description: 'Katalog produk & kasir POS' },
      { path: 'src/components/SettingsModal.tsx', category: 'Source Code', critical: false, description: 'Pengaturan toko, struk & peluncuran' },
      { path: 'src/components/DesktopAppModal.tsx', category: 'Source Code', critical: false, description: 'Pusat desktop, auto-update & hardware' },

      // PWA & Assets
      { path: 'public/manifest.json', category: 'PWA & Aset', critical: false, description: 'Web App Manifest PWA' },
      { path: 'public/icon.svg', category: 'PWA & Aset', critical: false, description: 'Ikon logo aplikasi kasir' },
      { path: 'public/sw.js', category: 'PWA & Aset', critical: false, description: 'Service Worker offline-first PWA' },

      // Desktop Scripts & Auto-Update
      { path: 'update.bat', category: 'Skrip Desktop & Auto-Update', critical: true, description: 'Script auto-update GitHub untuk Windows' },
      { path: 'update.sh', category: 'Skrip Desktop & Auto-Update', critical: false, description: 'Script auto-update GitHub untuk Linux/macOS' },
      { path: 'MULAI-KASIR.bat', category: 'Skrip Desktop & Auto-Update', critical: false, description: 'Peluncur kasir Windows' },
      { path: 'BERHENTI-KASIR.bat', category: 'Skrip Desktop & Auto-Update', critical: false, description: 'Mematikan server kasir Windows' },
      { path: 'run.sh', category: 'Skrip Desktop & Auto-Update', critical: false, description: 'Script start server Linux/macOS' },
      { path: 'install.bat', category: 'Skrip Desktop & Auto-Update', critical: false, description: 'Wizard instalasi Windows' },
      { path: 'install.sh', category: 'Skrip Desktop & Auto-Update', critical: false, description: 'Wizard instalasi Linux/macOS' },

      // Database & State
      { path: 'data/lan-database.json', category: 'Database & Data Toko', critical: false, description: 'Database persisten server LAN' },

      // Production Build Bundle
      { path: 'dist/index.html', category: 'Production Build Bundle', critical: false, description: 'Kompilasi paket produksi web' },
    ];

    // Check git modified/untracked files
    let gitStatusMap: Record<string, string> = {};
    try {
      const { stdout } = await execPromise('git status --porcelain', { cwd: rootDir });
      const lines = stdout.split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        const statusCode = line.substring(0, 2).trim();
        const filePath = line.substring(3).trim().replace(/^"|"$/g, '');
        gitStatusMap[filePath] = statusCode;
      }
    } catch {}

    const results = checklist.map((item) => {
      const fullPath = path.join(rootDir, item.path);
      const exists = fs.existsSync(fullPath);
      let size = 0;
      let lastModified: string | null = null;
      let status: 'ok' | 'modified' | 'missing' | 'untracked' = exists ? 'ok' : 'missing';

      if (exists) {
        try {
          const stat = fs.statSync(fullPath);
          size = stat.size;
          lastModified = stat.mtime.toISOString();
        } catch {}

        const gitStatus = gitStatusMap[item.path];
        if (gitStatus) {
          if (gitStatus.includes('M')) status = 'modified';
          else if (gitStatus.includes('?')) status = 'untracked';
          else if (gitStatus.includes('D')) status = 'missing';
        }
      }

      return {
        ...item,
        exists,
        size,
        lastModified,
        status,
      };
    });

    const missingCritical = results.filter((r) => r.critical && !r.exists);
    const missingOptional = results.filter((r) => !r.critical && !r.exists);
    const modifiedCount = results.filter((r) => r.status === 'modified').length;

    let overallHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (missingCritical.length > 0) {
      overallHealth = 'critical';
    } else if (missingOptional.length > 0) {
      overallHealth = 'warning';
    }

    // Check environment prerequisites
    const envPrerequisites = {
      nodeVersion: process.version,
      platform: process.platform,
      gitInstalled: false,
      distBuilt: fs.existsSync(path.join(rootDir, 'dist', 'index.html')),
      nodeModulesInstalled: fs.existsSync(path.join(rootDir, 'node_modules')),
      databaseAccessible: fs.existsSync(path.join(rootDir, 'data')),
    };

    try {
      await execPromise('git --version');
      envPrerequisites.gitInstalled = true;
    } catch {}

    res.json({
      success: true,
      overallHealth,
      checkedAt: new Date().toISOString(),
      officialRepoUrl: OFFICIAL_GITHUB_REPO_URL,
      stats: {
        total: results.length,
        intact: results.filter((r) => r.status === 'ok').length,
        modified: modifiedCount,
        missing: results.filter((r) => !r.exists).length,
        missingCritical: missingCritical.length,
      },
      envPrerequisites,
      files: results,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Scan for unnecessary files (temp, logs, OS junk, caches)
router.get('/api/system/cleanup-scan', adminOnly, async (req, res) => {
  try {
    const items = scanUnnecessaryFiles(process.cwd());
    const totalBytes = items.reduce((acc, curr) => acc + curr.size, 0);

    res.json({
      success: true,
      totalFiles: items.length,
      totalBytes,
      items,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Safely execute cleanup of unnecessary files and prune database
router.post('/api/system/cleanup-execute', adminOnly, async (req, res) => {
  try {
    const cleanup = cleanUnnecessaryFilesInternal(process.cwd());
    let dbCleanup: any = null;
    try {
      dbCleanup = await cleanSqliteDatabase();
    } catch (e: any) {
      console.warn('DB cleanup warning in system cleanup:', e?.message);
    }

    const totalFreed = cleanup.bytesFreed + (dbCleanup?.freedBytes || 0);
    const dbMsg = dbCleanup ? ` Database SQLite dipangkas (${dbCleanup.deletedSyncLogs} log lama dihapus, VACUUM berhasil).` : '';

    res.json({
      success: true,
      deletedCount: cleanup.count,
      bytesFreed: totalFreed,
      deletedList: cleanup.deleted,
      dbCleanup,
      message: `Pembersihan selesai! ${cleanup.count} file usang dihapus (${(cleanup.bytesFreed / 1024).toFixed(1)} KB dibebaskan).${dbMsg}`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Direct download endpoints for Windows .EXE Binaries
router.get('/download/UlilmartPOS.exe', (req, res) => {
  const exePath = path.join(process.cwd(), 'UlilmartPOS.exe');
  if (fs.existsSync(exePath)) {
    res.setHeader('Content-Disposition', 'attachment; filename="UlilmartPOS.exe"');
    res.setHeader('Content-Type', 'application/vnd.microsoft.portable-executable');
    res.sendFile(exePath);
  } else {
    res.status(404).json({ success: false, error: 'UlilmartPOS.exe belum dikompilasi.' });
  }
});

router.get('/download/UlilmartPOS-Kiosk.exe', (req, res) => {
  const exePath = path.join(process.cwd(), 'UlilmartPOS-Kiosk.exe');
  if (fs.existsSync(exePath)) {
    res.setHeader('Content-Disposition', 'attachment; filename="UlilmartPOS-Kiosk.exe"');
    res.setHeader('Content-Type', 'application/vnd.microsoft.portable-executable');
    res.sendFile(exePath);
  } else {
    res.status(404).json({ success: false, error: 'UlilmartPOS-Kiosk.exe belum dikompilasi.' });
  }
});

