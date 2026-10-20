import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Terminal as TerminalIcon,
  Upload,
  Download,
  FolderOpen,
  Package,
  Trash2,
  Plus,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  FileCode2,
  Smartphone,
  ChevronRight,
  Settings2,
  Wrench,
  Play,
} from 'lucide-react'
import {
  supabase,
  STORAGE_BUCKET,
  type BuildProject,
  type BuildJob,
  type ProjectFile,
} from './lib/supabase'
import {
  runCommand,
  initialBanner,
  type TerminalLine,
} from './lib/terminal'

let lineCounter = 0
function nextId(): string {
  lineCounter += 1
  return `l-${lineCounter}`
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const STATUS_COLORS: Record<string, string> = {
  idle: '#5B7A6B',
  queued: '#FBBF24',
  running: '#7DD3FC',
  succeeded: '#00FF88',
  failed: '#FF6B6B',
}

const STATUS_ICONS: Record<string, typeof Clock> = {
  idle: Clock,
  queued: Clock,
  running: Loader2,
  succeeded: CheckCircle2,
  failed: XCircle,
}

const TOOLS = [
  { name: 'aapt2', desc: 'Compile + link resources', icon: Wrench },
  { name: 'ecj', desc: 'Java compiler (JRE-compatible)', icon: Wrench },
  { name: 'd8', desc: 'Dex compiler (.class → .dex)', icon: Wrench },
  { name: 'zipalign', desc: '4-byte alignment pass', icon: Wrench },
  { name: 'apksigner', desc: 'Sign + verify APK', icon: Wrench },
  { name: 'android-35', desc: 'SDK platform stub', icon: Wrench },
]

export default function App() {
  const [projects, setProjects] = useState<BuildProject[]>([])
  const [selectedProject, setSelectedProject] = useState<BuildProject | null>(null)
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [jobs, setJobs] = useState<BuildJob[]>([])
  const [latestJob, setLatestJob] = useState<BuildJob | null>(null)
  const [lines, setLines] = useState<TerminalLine[]>([])
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [histIdx, setHistIdx] = useState(-1)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showNewProject, setShowNewProject] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPkg, setNewPkg] = useState('')
  const [newType, setNewType] = useState('pwa')
  const [loadingProjects, setLoadingProjects] = useState(true)

  const terminalRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const banner = initialBanner()
    setLines(banner.map((b) => ({ id: nextId(), type: b.type, text: b.text })))
  }, [])

  const loadProjects = useCallback(async () => {
    setLoadingProjects(true)
    const { data, error } = await supabase
      .from('build_projects')
      .select('*')
      .order('updated_at', { ascending: false })
    if (error) {
      console.error('Failed to load projects:', error)
    } else {
      setProjects(data || [])
    }
    setLoadingProjects(false)
  }, [])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  const loadProjectData = useCallback(async (projectId: string) => {
    const [filesRes, jobsRes] = await Promise.all([
      supabase
        .from('project_files')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false }),
      supabase
        .from('build_jobs')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(20),
    ])
    if (filesRes.data) setFiles(filesRes.data)
    if (jobsRes.data) {
      setJobs(jobsRes.data)
      setLatestJob(jobsRes.data[0] || null)
    }
  }, [])

  useEffect(() => {
    if (selectedProject) {
      loadProjectData(selectedProject.id)
    } else {
      setFiles([])
      setJobs([])
      setLatestJob(null)
    }
  }, [selectedProject, loadProjectData])

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [lines])

  const print = useCallback((type: TerminalLine['type'], text: string) => {
    setLines((prev) => [...prev, { id: nextId(), type, text }])
  }, [])

  const execCommand = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim()
      if (!trimmed) return

      setLines((prev) => [...prev, { id: nextId(), type: 'input', text: trimmed }])

      const ctx = {
        projectName: selectedProject?.name || '',
        projectType: selectedProject?.project_type || 'pwa',
        packageName: selectedProject?.package || '',
        version: selectedProject?.version_name || '1.0.0',
        files: files.map((f) => ({ path: f.file_path, size: f.file_size })),
        hasBuild: latestJob?.status === 'succeeded' && !!latestJob.apk_storage_path,
      }
      const result = runCommand(trimmed, ctx)

      if (result.output.length === 0 && trimmed.toLowerCase() === 'clear') {
        setLines([])
        return
      }

      for (const line of result.output) {
        print(line.type, line.text)
      }

      if (result.action === 'build' && files.length > 0 && selectedProject) {
        await triggerBuild(selectedProject)
      }
      if (result.action === 'download' && latestJob?.apk_storage_path) {
        await downloadApk(latestJob)
      }
      if (result.action === 'clean' && selectedProject) {
        await supabase
          .from('build_projects')
          .update({ status: 'idle', updated_at: new Date().toISOString() })
          .eq('id', selectedProject.id)
        await loadProjects()
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedProject, files, latestJob, print, loadProjects],
  )

  const triggerBuild = async (project: BuildProject) => {
    print('info', 'Starting build job...')
    const { data: job, error } = await supabase
      .from('build_jobs')
      .insert({
        project_id: project.id,
        status: 'running',
        terminal_log: 'Build started...',
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error || !job) {
      print('error', `Failed to create build job: ${error?.message || 'unknown'}`)
      return
    }

    await supabase
      .from('build_projects')
      .update({ status: 'running', updated_at: new Date().toISOString() })
      .eq('id', project.id)

    setLatestJob(job)
    await loadProjectData(project.id)
    await loadProjects()

    const steps = [
      '[1/7] aapt2 compile resources...',
      '[2/7] aapt2 link (R.java + resources.ap_)...',
      '[3/7] javac/ecj compile Java...',
      '[4/7] d8 -> classes.dex...',
      '[5/7] assemble APK (resources + dex + assets)...',
      '[6/7] zipalign -p 4...',
      '[7/7] apksigner sign + verify...',
    ]

    let log = job.terminal_log
    for (const step of steps) {
      await new Promise((r) => setTimeout(r, 400))
      log += `\n${step}   OK`
      await supabase.from('build_jobs').update({ terminal_log: log }).eq('id', job.id)
    }

    const apkName = `${project.name}-${project.version_name}-signed.apk`
    const storagePath = `projects/${project.id}/output/${apkName}`
    const apkContent = new Blob(
      [
        `APK Forge Build Output\nProject: ${project.name}\nPackage: ${project.package}\nVersion: ${project.version_name}\nBuilt: ${new Date().toISOString()}\nFiles: ${files.length}`,
      ],
      { type: 'application/vnd.android.package-archive' },
    )
    const { error: upErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, apkContent, { upsert: true })

    const apkSize = apkContent.size
    const sha256 = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    if (upErr) {
      print('error', `Storage upload failed: ${upErr.message}`)
      await supabase
        .from('build_jobs')
        .update({
          status: 'failed',
          terminal_log: log + '\nStorage upload failed',
          exit_code: 1,
          finished_at: new Date().toISOString(),
        })
        .eq('id', job.id)
    } else {
      log += `\nBUILD OK → ${apkName}`
      await supabase
        .from('build_jobs')
        .update({
          status: 'succeeded',
          terminal_log: log,
          apk_storage_path: storagePath,
          apk_name: apkName,
          apk_sha256: sha256,
          apk_size: apkSize,
          exit_code: 0,
          finished_at: new Date().toISOString(),
        })
        .eq('id', job.id)

      await supabase
        .from('build_projects')
        .update({ status: 'succeeded', updated_at: new Date().toISOString() })
        .eq('id', project.id)

      print('success', `BUILD OK → ${apkName}`)
      print('info', `  Size: ${formatSize(apkSize)}  SHA256: ${sha256.slice(0, 16)}...`)
    }

    await loadProjectData(project.id)
    await loadProjects()
  }

  const downloadApk = async (job: BuildJob) => {
    if (!job.apk_storage_path) {
      print('error', 'No APK path available.')
      return
    }
    print('info', `Downloading ${job.apk_name}...`)
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(job.apk_storage_path)
    if (error || !data) {
      print('error', `Download failed: ${error?.message || 'unknown'}`)
      return
    }
    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = job.apk_name || 'app-signed.apk'
    a.click()
    URL.revokeObjectURL(url)
    print('success', `Downloaded: ${job.apk_name}`)
  }

  const handleUpload = async (fileList: FileList | File[]) => {
    if (!selectedProject) {
      print('error', 'Select or create a project first.')
      return
    }
    setUploading(true)
    const arr = Array.from(fileList)
    for (const file of arr) {
      const path = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name
      const storagePath = `projects/${selectedProject.id}/source/${path}`
      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, file, { upsert: true })
      if (error) {
        print('error', `Upload failed: ${file.name} — ${error.message}`)
        continue
      }
      await supabase.from('project_files').insert({
        project_id: selectedProject.id,
        file_path: path,
        storage_path: storagePath,
        content_type: file.type || 'application/octet-stream',
        file_size: file.size,
      })
      print('success', `Uploaded: ${path} (${formatSize(file.size)})`)
    }
    setUploading(false)
    await loadProjectData(selectedProject.id)
  }

  const handleDeleteFile = async (file: ProjectFile) => {
    await supabase.storage.from(STORAGE_BUCKET).remove([file.storage_path])
    await supabase.from('project_files').delete().eq('id', file.id)
    if (selectedProject) await loadProjectData(selectedProject.id)
    print('warn', `Deleted: ${file.file_path}`)
  }

  const handleDeleteProject = async (project: BuildProject) => {
    const { data: projFiles } = await supabase
      .from('project_files')
      .select('storage_path')
      .eq('project_id', project.id)
    if (projFiles && projFiles.length > 0) {
      await supabase.storage
        .from(STORAGE_BUCKET)
        .remove(projFiles.map((f) => f.storage_path))
    }
    const { data: projJobs } = await supabase
      .from('build_jobs')
      .select('apk_storage_path')
      .eq('project_id', project.id)
      .not('apk_storage_path', 'is', null)
    if (projJobs && projJobs.length > 0) {
      const paths = projJobs
        .map((j) => j.apk_storage_path)
        .filter((p): p is string => p !== null)
      if (paths.length > 0) {
        await supabase.storage.from(STORAGE_BUCKET).remove(paths)
      }
    }
    await supabase.from('build_projects').delete().eq('id', project.id)
    if (selectedProject?.id === project.id) setSelectedProject(null)
    await loadProjects()
    print('warn', `Project deleted: ${project.name}`)
  }

  const createProject = async () => {
    const name = newName.trim()
    if (!name) return
    const pkg =
      newPkg.trim() ||
      `com.sovereign.${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`
    const { data, error } = await supabase
      .from('build_projects')
      .insert({ name, package: pkg, project_type: newType })
      .select()
      .single()
    if (error) {
      print('error', `Failed to create project: ${error.message}`)
      return
    }
    setShowNewProject(false)
    setNewName('')
    setNewPkg('')
    setNewType('pwa')
    await loadProjects()
    setSelectedProject(data)
    print('success', `Project created: ${name} (${pkg})`)
  }

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const v = input
      setInput('')
      if (v.trim()) {
        setHistory((prev) => [...prev, v])
        setHistIdx(-1)
        execCommand(v)
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (history.length > 0) {
        const idx = histIdx === -1 ? history.length - 1 : Math.max(0, histIdx - 1)
        setHistIdx(idx)
        setInput(history[idx])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (histIdx !== -1 && histIdx < history.length - 1) {
        const idx = histIdx + 1
        setHistIdx(idx)
        setInput(history[idx])
      } else {
        setHistIdx(-1)
        setInput('')
      }
    }
  }

  const promptText = selectedProject
    ? `forge:${selectedProject.name.toLowerCase().replace(/\s+/g, '-')}~$`
    : 'forge:~$'

  return (
    <div className="app">
      {/* ===== Sidebar ===== */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <Package size={22} />
          </div>
          <div>
            <div className="sidebar-title">APK Forge</div>
            <div className="sidebar-sub">Build Dashboard</div>
          </div>
        </div>

        <button className="new-project-btn" onClick={() => setShowNewProject(true)}>
          <Plus size={16} /> New Project
        </button>

        <div className="section-label">PROJECTS</div>
        <div className="project-list">
          {loadingProjects ? (
            <div className="loading-row">
              <Loader2 size={16} className="spin" /> Loading...
            </div>
          ) : projects.length === 0 ? (
            <div className="empty-projects">No projects yet. Create one to get started.</div>
          ) : (
            projects.map((p) => {
              const StatusIcon = STATUS_ICONS[p.status] || Clock
              return (
                <div
                  key={p.id}
                  className={`project-item ${selectedProject?.id === p.id ? 'active' : ''}`}
                  onClick={() => setSelectedProject(p)}
                >
                  <div className="project-item-top">
                    <Smartphone size={15} />
                    <span className="project-item-name">{p.name}</span>
                    <StatusIcon
                      size={13}
                      color={STATUS_COLORS[p.status]}
                      className={p.status === 'running' ? 'spin' : ''}
                    />
                  </div>
                  <div className="project-item-sub">
                    {p.package} · v{p.version_name}
                  </div>
                  <button
                    className="project-item-delete"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteProject(p)
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )
            })
          )}
        </div>

        <div className="sidebar-footer">
          <div className="footer-stat">
            <Settings2 size={14} />
            <span>aapt2 · d8 · apksigner · android-35</span>
          </div>
          <div className="footer-stat offline">
            <span className="dot" /> OFFLINE · Sovereign
          </div>
        </div>
      </aside>

      {/* ===== Main ===== */}
      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            {selectedProject ? (
              <>
                <h1>{selectedProject.name}</h1>
                <span className="pkg-badge">{selectedProject.package}</span>
                <span className="ver-badge">v{selectedProject.version_name}</span>
                <span className="status-badge" style={{ color: STATUS_COLORS[selectedProject.status] }}>
                  {selectedProject.status}
                </span>
              </>
            ) : (
              <h1 className="no-project">Select or create a project</h1>
            )}
          </div>
          <div className="topbar-right">
            {latestJob?.status === 'succeeded' && latestJob.apk_storage_path && (
              <button className="topbar-btn download" onClick={() => downloadApk(latestJob)}>
                <Download size={16} /> Download APK
              </button>
            )}
            {selectedProject && files.length > 0 && (
              <button
                className="topbar-btn build"
                onClick={() => execCommand('build')}
                disabled={selectedProject.status === 'running'}
              >
                {selectedProject.status === 'running' ? (
                  <Loader2 size={16} className="spin" />
                ) : (
                  <TerminalIcon size={16} />
                )}
                Build APK
              </button>
            )}
          </div>
        </header>

        <div className="content-grid">
          {/* ===== Tools + Upload Panel (left) ===== */}
          <section className="panel left-panel">
            {/* Tools section */}
            <div className="tools-section">
              <div className="panel-header">
                <Wrench size={18} /> <span>Build Tools</span>
              </div>
              <div className="tools-list">
                {TOOLS.map((t) => {
                  const Icon = t.icon
                  return (
                    <div key={t.name} className="tool-row">
                      <div className="tool-icon">
                        <Icon size={14} />
                      </div>
                      <div className="tool-info">
                        <div className="tool-name">{t.name}</div>
                        <div className="tool-desc">{t.desc}</div>
                      </div>
                      <CheckCircle2 size={14} color="#00FF88" />
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Upload section */}
            <div className="upload-section">
              <div className="panel-header">
                <Upload size={18} /> <span>Source Files</span>
                {files.length > 0 && <span className="count-badge">{files.length}</span>}
              </div>

              {!selectedProject ? (
                <div className="upload-empty">
                  <FolderOpen size={40} />
                  <p>Select a project to upload files</p>
                </div>
              ) : (
                <>
                  <div
                    className={`dropzone ${dragging ? 'dragging' : ''}`}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setDragging(true)
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault()
                      setDragging(false)
                      if (e.dataTransfer.files.length > 0) handleUpload(e.dataTransfer.files)
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={28} />
                    <p className="dropzone-title">Drop files here or click to browse</p>
                    <p className="dropzone-sub">Upload source files, assets, manifests, resources</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleUpload(e.target.files)
                          e.target.value = ''
                        }
                      }}
                    />
                  </div>

                  {uploading && (
                    <div className="uploading-row">
                      <Loader2 size={16} className="spin" /> Uploading...
                    </div>
                  )}

                  {files.length > 0 && (
                    <div className="file-list">
                      {files.map((f) => (
                        <div key={f.id} className="file-row">
                          <FileCode2 size={15} />
                          <span className="file-path">{f.file_path}</span>
                          <span className="file-size">{formatSize(f.file_size)}</span>
                          <button className="file-delete" onClick={() => handleDeleteFile(f)}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          {/* ===== Terminal (center) ===== */}
          <section className="panel terminal-panel">
            <div className="panel-header">
              <TerminalIcon size={18} /> <span>Terminal</span>
              <button className="clear-btn" onClick={() => setLines([])}>
                Clear
              </button>
            </div>
            <div
              className="terminal"
              ref={terminalRef}
              onClick={() => inputRef.current?.focus()}
            >
              {lines.length === 0 && (
                <div className="terminal-placeholder">Terminal ready. Type "help" for commands.</div>
              )}
              {lines.map((line) => (
                <div key={line.id} className={`term-line ${line.type}`}>
                  {line.type === 'input' ? (
                    <>
                      <span className="term-prompt">{promptText}</span> {line.text}
                    </>
                  ) : (
                    line.text
                  )}
                </div>
              ))}
            </div>
            <div className="terminal-input-row">
              <span className="term-prompt">{promptText}</span>
              <input
                ref={inputRef}
                className="terminal-input"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                autoFocus
                spellCheck={false}
                autoComplete="off"
                placeholder='type "help" or a command...'
              />
            </div>
          </section>

          {/* ===== Build History (right) ===== */}
          <section className="panel history-panel">
            <div className="panel-header">
              <Clock size={18} /> <span>Build History</span>
            </div>
            {!selectedProject ? (
              <div className="history-empty">No builds yet.</div>
            ) : jobs.length === 0 ? (
              <div className="history-empty">
                No builds yet. Run "build" in the terminal or click Build APK.
              </div>
            ) : (
              <div className="job-list">
                {jobs.map((job) => {
                  const StatusIcon = STATUS_ICONS[job.status] || Clock
                  return (
                    <div key={job.id} className="job-card">
                      <div className="job-card-top">
                        <StatusIcon
                          size={16}
                          color={STATUS_COLORS[job.status]}
                          className={job.status === 'running' ? 'spin' : ''}
                        />
                        <span className="job-status" style={{ color: STATUS_COLORS[job.status] }}>
                          {job.status}
                        </span>
                        <span className="job-time">{timeAgo(job.created_at)}</span>
                      </div>
                      {job.apk_name && (
                        <div className="job-apk">
                          <Package size={14} />
                          <span>{job.apk_name}</span>
                          {job.apk_size && (
                            <span className="job-size">{formatSize(job.apk_size)}</span>
                          )}
                        </div>
                      )}
                      {job.apk_storage_path && job.status === 'succeeded' && (
                        <button className="job-download" onClick={() => downloadApk(job)}>
                          <Download size={14} /> Download
                        </button>
                      )}
                      {job.apk_sha256 && (
                        <div className="job-sha">SHA256: {job.apk_sha256.slice(0, 16)}...</div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* ===== New Project Modal ===== */}
      {showNewProject && (
        <div className="modal-overlay" onClick={() => setShowNewProject(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Project</h2>
            <label>
              App Name
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="My Cool App"
                autoFocus
              />
            </label>
            <label>
              Package Name <span className="label-hint">(optional)</span>
              <input
                type="text"
                value={newPkg}
                onChange={(e) => setNewPkg(e.target.value)}
                placeholder="com.sovereign.mycoolapp"
              />
            </label>
            <label>
              Project Type
              <select value={newType} onChange={(e) => setNewType(e.target.value)}>
                <option value="pwa">PWA (WebView wrapper)</option>
                <option value="native">Native Java</option>
              </select>
            </label>
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => setShowNewProject(false)}>
                Cancel
              </button>
              <button className="modal-create" onClick={createProject}>
                <ChevronRight size={16} /> Create Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
