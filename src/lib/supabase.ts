import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const STORAGE_BUCKET = 'apk-forge'

export type BuildProject = {
  id: string
  name: string
  package: string
  version_name: string
  version_code: number
  project_type: string
  min_sdk: number
  target_sdk: number
  status: string
  created_at: string
  updated_at: string
}

export type BuildJob = {
  id: string
  project_id: string
  status: string
  terminal_log: string
  apk_storage_path: string | null
  apk_name: string | null
  apk_sha256: string | null
  apk_size: number | null
  exit_code: number | null
  started_at: string | null
  finished_at: string | null
  created_at: string
}

export type ProjectFile = {
  id: string
  project_id: string
  file_path: string
  storage_path: string
  content_type: string | null
  file_size: number
  created_at: string
}
