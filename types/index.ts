export type UserRole = 'agency_admin' | 'agency_member' | 'client'

export interface Agency {
  id: string
  name: string
  subdomain: string
  logo_url: string | null
  primary_color: string
  plan: 'free' | 'pro' | 'white_label'
  created_at: string
}

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  agency_id: string | null
  client_id: string | null
  is_active: boolean
  agency?: Agency
}

export interface Client {
  id: string
  agency_id: string
  company_name: string
  logo_url: string | null
  buffer_token: string | null
  social_channels: string[]
  created_at: string
}

export interface ContentPost {
  id: string
  agency_id: string
  client_id: string
  title: string
  caption: string | null
  media_url: string | null
  status: 'draft' | 'review' | 'approved' | 'rejected' | 'published'
  platform: string
  publish_date: string | null
  published_at: string | null
  created_at: string
}

export interface Comment {
  id: string
  content_post_id: string | null
  task_id: string | null
  author_id: string
  text: string
  created_at: string
  author?: { full_name: string | null; email: string }
}

export interface Project {
  id: string
  agency_id: string
  client_id: string | null
  name: string
  description: string | null
  color: string
  status: 'active' | 'archived'
  due_date: string | null
  created_by: string | null
  created_at: string
  client?: Pick<Client, 'id' | 'company_name'>
}

export interface Task {
  id: string
  agency_id: string
  client_id: string | null
  project_id: string | null
  title: string
  description: string | null
  status: 'backlog' | 'in_progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high'
  due_date: string | null
  assigned_to: string | null
  type: 'agency_task' | 'client_request'
  created_by: string
  created_at: string
  project?: Pick<Project, 'id' | 'name' | 'color'>
  client?: Pick<Client, 'id' | 'company_name'>
  assignee?: Pick<Profile, 'id' | 'full_name' | 'email'>
}

export interface FileRecord {
  id: string
  agency_id: string
  client_id: string
  file_name: string
  file_url: string
  file_type: 'video' | 'photo' | 'doc' | 'brand'
  folder: string | null
  uploaded_by: string
  uploaded_date: string
}

export interface Goal {
  id: string
  agency_id: string
  client_id: string
  title: string
  target_value: number
  current_value: number
  unit: string
  deadline: string | null
  linked_metric: string | null
  created_at: string
}
