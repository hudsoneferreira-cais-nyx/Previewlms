export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      assignments: {
        Row: {
          assigned_by: string | null
          company_id: string
          content_id: string | null
          created_at: string
          due_date: string | null
          id: string
          mandatory: boolean
          message: string | null
          target_id: string | null
          target_type: Database["public"]["Enums"]["assignment_target"]
          track_id: string | null
        }
        Insert: {
          assigned_by?: string | null
          company_id: string
          content_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          mandatory?: boolean
          message?: string | null
          target_id?: string | null
          target_type: Database["public"]["Enums"]["assignment_target"]
          track_id?: string | null
        }
        Update: {
          assigned_by?: string | null
          company_id?: string
          content_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          mandatory?: boolean
          message?: string | null
          target_id?: string | null
          target_type?: Database["public"]["Enums"]["assignment_target"]
          track_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "report_compliance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "report_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "report_learner_progress"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "report_company_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "assignments_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "report_content_stats"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "assignments_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "report_company_overview"
            referencedColumns: ["company_id"]
          },
        ]
      }
      certificates: {
        Row: {
          code: string
          company_id: string | null
          content_id: string | null
          id: string
          issued_at: string
          pdf_path: string | null
          recipient_name: string
          title: string
          track_id: string | null
          user_id: string
          workload_minutes: number | null
        }
        Insert: {
          code?: string
          company_id?: string | null
          content_id?: string | null
          id?: string
          issued_at?: string
          pdf_path?: string | null
          recipient_name: string
          title: string
          track_id?: string | null
          user_id: string
          workload_minutes?: number | null
        }
        Update: {
          code?: string
          company_id?: string | null
          content_id?: string | null
          id?: string
          issued_at?: string
          pdf_path?: string | null
          recipient_name?: string
          title?: string
          track_id?: string | null
          user_id?: string
          workload_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "certificates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "report_company_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "certificates_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "report_content_stats"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "certificates_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "report_compliance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "report_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "report_learner_progress"
            referencedColumns: ["user_id"]
          },
        ]
      }
      companies: {
        Row: {
          active_user_limit: number | null
          created_at: string
          custom_domain: string | null
          favicon_url: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          primary_color: string | null
          privacy_policy_url: string | null
          privacy_policy_version: string
          secondary_color: string | null
          settings: Json
          slug: string
          updated_at: string
        }
        Insert: {
          active_user_limit?: number | null
          created_at?: string
          custom_domain?: string | null
          favicon_url?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          primary_color?: string | null
          privacy_policy_url?: string | null
          privacy_policy_version?: string
          secondary_color?: string | null
          settings?: Json
          slug: string
          updated_at?: string
        }
        Update: {
          active_user_limit?: number | null
          created_at?: string
          custom_domain?: string | null
          favicon_url?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          privacy_policy_url?: string | null
          privacy_policy_version?: string
          secondary_color?: string | null
          settings?: Json
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      content_progress: {
        Row: {
          company_id: string | null
          completed_at: string | null
          content_id: string
          last_position: string | null
          progress_pct: number
          score: number | null
          scorm_data: Json
          started_at: string
          status: Database["public"]["Enums"]["progress_status"]
          time_spent_seconds: number
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          completed_at?: string | null
          content_id: string
          last_position?: string | null
          progress_pct?: number
          score?: number | null
          scorm_data?: Json
          started_at?: string
          status?: Database["public"]["Enums"]["progress_status"]
          time_spent_seconds?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          completed_at?: string | null
          content_id?: string
          last_position?: string | null
          progress_pct?: number
          score?: number | null
          scorm_data?: Json
          started_at?: string
          status?: Database["public"]["Enums"]["progress_status"]
          time_spent_seconds?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_progress_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_progress_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "report_company_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "content_progress_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_progress_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "report_content_stats"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "content_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "report_compliance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "content_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "report_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "content_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "report_learner_progress"
            referencedColumns: ["user_id"]
          },
        ]
      }
      contents: {
        Row: {
          audience: Database["public"]["Enums"]["audience"]
          body: string | null
          category_id: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          duration_minutes: number | null
          external_url: string | null
          file_path: string | null
          id: string
          pass_score: number
          scorm_entry_path: string | null
          status: Database["public"]["Enums"]["publish_status"]
          tags: string[]
          thumbnail_url: string | null
          title: string
          type: Database["public"]["Enums"]["content_type"]
          updated_at: string
        }
        Insert: {
          audience?: Database["public"]["Enums"]["audience"]
          body?: string | null
          category_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          external_url?: string | null
          file_path?: string | null
          id?: string
          pass_score?: number
          scorm_entry_path?: string | null
          status?: Database["public"]["Enums"]["publish_status"]
          tags?: string[]
          thumbnail_url?: string | null
          title: string
          type: Database["public"]["Enums"]["content_type"]
          updated_at?: string
        }
        Update: {
          audience?: Database["public"]["Enums"]["audience"]
          body?: string | null
          category_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          external_url?: string | null
          file_path?: string | null
          id?: string
          pass_score?: number
          scorm_entry_path?: string | null
          status?: Database["public"]["Enums"]["publish_status"]
          tags?: string[]
          thumbnail_url?: string | null
          title?: string
          type?: Database["public"]["Enums"]["content_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contents_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "report_company_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "contents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "report_compliance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "contents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "report_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "contents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "report_learner_progress"
            referencedColumns: ["user_id"]
          },
        ]
      }
      departments: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string
          parent_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "report_company_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "departments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          assignment_id: string | null
          company_id: string
          completed_at: string | null
          content_id: string | null
          created_at: string
          due_date: string | null
          id: string
          mandatory: boolean
          progress_pct: number
          started_at: string | null
          status: Database["public"]["Enums"]["progress_status"]
          track_id: string | null
          user_id: string
        }
        Insert: {
          assignment_id?: string | null
          company_id: string
          completed_at?: string | null
          content_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          mandatory?: boolean
          progress_pct?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["progress_status"]
          track_id?: string | null
          user_id: string
        }
        Update: {
          assignment_id?: string | null
          company_id?: string
          completed_at?: string | null
          content_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          mandatory?: boolean
          progress_pct?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["progress_status"]
          track_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "report_company_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "enrollments_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "report_content_stats"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "enrollments_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "report_compliance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "report_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "report_learner_progress"
            referencedColumns: ["user_id"]
          },
        ]
      }
      favorites: {
        Row: {
          content_id: string | null
          created_at: string
          track_id: string | null
          user_id: string
        }
        Insert: {
          content_id?: string | null
          created_at?: string
          track_id?: string | null
          user_id: string
        }
        Update: {
          content_id?: string | null
          created_at?: string
          track_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "report_content_stats"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "favorites_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "report_compliance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "report_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "report_learner_progress"
            referencedColumns: ["user_id"]
          },
        ]
      }
      group_members: {
        Row: {
          added_at: string
          group_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          group_id: string
          user_id: string
        }
        Update: {
          added_at?: string
          group_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "report_compliance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "report_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "report_learner_progress"
            referencedColumns: ["user_id"]
          },
        ]
      }
      groups: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "report_company_overview"
            referencedColumns: ["company_id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          company_id: string
          created_at: string
          department_id: string | null
          email: string
          full_name: string | null
          id: string
          invited_by: string | null
          job_title: string | null
          manager_id: string | null
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          accepted_at?: string | null
          company_id: string
          created_at?: string
          department_id?: string | null
          email: string
          full_name?: string | null
          id?: string
          invited_by?: string | null
          job_title?: string | null
          manager_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          accepted_at?: string | null
          company_id?: string
          created_at?: string
          department_id?: string | null
          email?: string
          full_name?: string | null
          id?: string
          invited_by?: string | null
          job_title?: string | null
          manager_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "report_company_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "invitations_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "report_compliance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "report_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "report_learner_progress"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "invitations_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "report_compliance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "invitations_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "report_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "invitations_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "report_learner_progress"
            referencedColumns: ["user_id"]
          },
        ]
      }
      library_licenses: {
        Row: {
          company_id: string
          content_id: string | null
          created_at: string
          id: string
          track_id: string | null
        }
        Insert: {
          company_id: string
          content_id?: string | null
          created_at?: string
          id?: string
          track_id?: string | null
        }
        Update: {
          company_id?: string
          content_id?: string | null
          created_at?: string
          id?: string
          track_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "library_licenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_licenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "report_company_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "library_licenses_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_licenses_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "report_content_stats"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "library_licenses_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          company_id: string | null
          created_at: string
          emailed_at: string | null
          id: string
          kind: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          company_id?: string | null
          created_at?: string
          emailed_at?: string | null
          id?: string
          kind: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          company_id?: string | null
          created_at?: string
          emailed_at?: string | null
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "report_company_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "report_compliance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "report_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "report_learner_progress"
            referencedColumns: ["user_id"]
          },
        ]
      }
      privacy_consents: {
        Row: {
          company_id: string | null
          consented_at: string
          id: string
          policy_version: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          company_id?: string | null
          consented_at?: string
          id?: string
          policy_version: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          company_id?: string | null
          consented_at?: string
          id?: string
          policy_version?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "privacy_consents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "privacy_consents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "report_company_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "privacy_consents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "privacy_consents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "report_compliance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "privacy_consents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "report_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "privacy_consents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "report_learner_progress"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string
          department_id: string | null
          email: string
          full_name: string
          id: string
          job_title: string | null
          last_active_at: string | null
          manager_id: string | null
          privacy_consented_at: string | null
          privacy_policy_version: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["user_status"]
          unit: string | null
          updated_at: string
          xp: number
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          department_id?: string | null
          email: string
          full_name?: string
          id: string
          job_title?: string | null
          last_active_at?: string | null
          manager_id?: string | null
          privacy_consented_at?: string | null
          privacy_policy_version?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["user_status"]
          unit?: string | null
          updated_at?: string
          xp?: number
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          department_id?: string | null
          email?: string
          full_name?: string
          id?: string
          job_title?: string | null
          last_active_at?: string | null
          manager_id?: string | null
          privacy_consented_at?: string | null
          privacy_policy_version?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["user_status"]
          unit?: string | null
          updated_at?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "report_company_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "report_compliance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "profiles_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "report_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "profiles_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "report_learner_progress"
            referencedColumns: ["user_id"]
          },
        ]
      }
      quiz_answer_keys: {
        Row: {
          is_correct: boolean
          option_id: string
        }
        Insert: {
          is_correct?: boolean
          option_id: string
        }
        Update: {
          is_correct?: boolean
          option_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_answer_keys_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: true
            referencedRelation: "quiz_options"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          answers: Json
          company_id: string | null
          content_id: string
          created_at: string
          id: string
          max_points: number
          passed: boolean
          points: number
          score: number
          user_id: string
        }
        Insert: {
          answers: Json
          company_id?: string | null
          content_id: string
          created_at?: string
          id?: string
          max_points: number
          passed: boolean
          points: number
          score: number
          user_id: string
        }
        Update: {
          answers?: Json
          company_id?: string | null
          content_id?: string
          created_at?: string
          id?: string
          max_points?: number
          passed?: boolean
          points?: number
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "report_company_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "quiz_attempts_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "report_content_stats"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "quiz_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "report_compliance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "quiz_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "report_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "quiz_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "report_learner_progress"
            referencedColumns: ["user_id"]
          },
        ]
      }
      quiz_options: {
        Row: {
          id: string
          label: string
          position: number
          question_id: string
        }
        Insert: {
          id?: string
          label: string
          position?: number
          question_id: string
        }
        Update: {
          id?: string
          label?: string
          position?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          allow_multiple: boolean
          content_id: string
          id: string
          points: number
          position: number
          prompt: string
        }
        Insert: {
          allow_multiple?: boolean
          content_id: string
          id?: string
          points?: number
          position?: number
          prompt: string
        }
        Update: {
          allow_multiple?: boolean
          content_id?: string
          id?: string
          points?: number
          position?: number
          prompt?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_questions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "report_content_stats"
            referencedColumns: ["content_id"]
          },
        ]
      }
      support_requests: {
        Row: {
          answer: string | null
          answered_by: string | null
          company_id: string | null
          created_at: string
          id: string
          message: string
          status: Database["public"]["Enums"]["support_status"]
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answer?: string | null
          answered_by?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          message: string
          status?: Database["public"]["Enums"]["support_status"]
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answer?: string | null
          answered_by?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          message?: string
          status?: Database["public"]["Enums"]["support_status"]
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_requests_answered_by_fkey"
            columns: ["answered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_requests_answered_by_fkey"
            columns: ["answered_by"]
            isOneToOne: false
            referencedRelation: "report_compliance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "support_requests_answered_by_fkey"
            columns: ["answered_by"]
            isOneToOne: false
            referencedRelation: "report_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "support_requests_answered_by_fkey"
            columns: ["answered_by"]
            isOneToOne: false
            referencedRelation: "report_learner_progress"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "support_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "report_company_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "support_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "report_compliance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "support_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "report_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "support_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "report_learner_progress"
            referencedColumns: ["user_id"]
          },
        ]
      }
      track_items: {
        Row: {
          content_id: string
          id: string
          module_id: string
          position: number
          required: boolean
        }
        Insert: {
          content_id: string
          id?: string
          module_id: string
          position?: number
          required?: boolean
        }
        Update: {
          content_id?: string
          id?: string
          module_id?: string
          position?: number
          required?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "track_items_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_items_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "report_content_stats"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "track_items_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "track_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      track_modules: {
        Row: {
          description: string | null
          id: string
          position: number
          title: string
          track_id: string
        }
        Insert: {
          description?: string | null
          id?: string
          position?: number
          title: string
          track_id: string
        }
        Update: {
          description?: string | null
          id?: string
          position?: number
          title?: string
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_modules_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      tracks: {
        Row: {
          audience: Database["public"]["Enums"]["audience"]
          category_id: string | null
          certificate_enabled: boolean
          company_id: string | null
          cover_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          sequential: boolean
          status: Database["public"]["Enums"]["publish_status"]
          title: string
          updated_at: string
        }
        Insert: {
          audience?: Database["public"]["Enums"]["audience"]
          category_id?: string | null
          certificate_enabled?: boolean
          company_id?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          sequential?: boolean
          status?: Database["public"]["Enums"]["publish_status"]
          title: string
          updated_at?: string
        }
        Update: {
          audience?: Database["public"]["Enums"]["audience"]
          category_id?: string | null
          certificate_enabled?: boolean
          company_id?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          sequential?: boolean
          status?: Database["public"]["Enums"]["publish_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "report_company_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "tracks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "report_compliance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tracks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "report_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tracks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "report_learner_progress"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_activity_days: {
        Row: {
          company_id: string | null
          day: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          day?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          day?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_days_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_activity_days_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "report_company_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "user_activity_days_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_activity_days_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "report_compliance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_activity_days_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "report_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_activity_days_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "report_learner_progress"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      report_company_overview: {
        Row: {
          active_people: number | null
          active_users_this_month: number | null
          avg_progress_pct: number | null
          certificates: number | null
          company_id: string | null
          company_name: string | null
          completed: number | null
          enrollments: number | null
          overdue: number | null
        }
        Insert: {
          active_people?: never
          active_users_this_month?: never
          avg_progress_pct?: never
          certificates?: never
          company_id?: string | null
          company_name?: string | null
          completed?: never
          enrollments?: never
          overdue?: never
        }
        Update: {
          active_people?: never
          active_users_this_month?: never
          avg_progress_pct?: never
          certificates?: never
          company_id?: string | null
          company_name?: string | null
          completed?: never
          enrollments?: never
          overdue?: never
        }
        Relationships: []
      }
      report_compliance: {
        Row: {
          company_id: string | null
          completed_at: string | null
          department: string | null
          due_date: string | null
          email: string | null
          enrollment_id: string | null
          full_name: string | null
          item_kind: string | null
          item_title: string | null
          job_title: string | null
          manager_name: string | null
          mandatory: boolean | null
          progress_pct: number | null
          situation: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["progress_status"] | null
          unit: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "report_company_overview"
            referencedColumns: ["company_id"]
          },
        ]
      }
      report_content_stats: {
        Row: {
          avg_score: number | null
          company_id: string | null
          completed: number | null
          content_id: string | null
          hours_spent: number | null
          started: number | null
          title: string | null
          type: Database["public"]["Enums"]["content_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "contents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "report_company_overview"
            referencedColumns: ["company_id"]
          },
        ]
      }
      report_leaderboard: {
        Row: {
          company_id: string | null
          department: string | null
          full_name: string | null
          position: number | null
          user_id: string | null
          xp: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "report_company_overview"
            referencedColumns: ["company_id"]
          },
        ]
      }
      report_learner_progress: {
        Row: {
          company_id: string | null
          completed_at: string | null
          department: string | null
          due_date: string | null
          email: string | null
          enrollment_id: string | null
          full_name: string | null
          item_kind: string | null
          item_title: string | null
          job_title: string | null
          manager_name: string | null
          mandatory: boolean | null
          progress_pct: number | null
          situation: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["progress_status"] | null
          unit: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "report_company_overview"
            referencedColumns: ["company_id"]
          },
        ]
      }
      report_monthly_active_users: {
        Row: {
          active_users: number | null
          company_id: string | null
          month: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_days_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_activity_days_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "report_company_overview"
            referencedColumns: ["company_id"]
          },
        ]
      }
    }
    Functions: {
      record_privacy_consent: {
        Args: { p_user_agent?: string }
        Returns: undefined
      }
      send_reminder: {
        Args: { p_message?: string; p_user_ids: string[] }
        Returns: number
      }
      submit_quiz: {
        Args: { p_answers: Json; p_content_id: string }
        Returns: Json
      }
      touch_activity: { Args: never; Returns: undefined }
      verify_certificate: {
        Args: { p_code: string }
        Returns: {
          company_name: string
          issued_at: string
          recipient_name: string
          title: string
          workload_minutes: number
        }[]
      }
    }
    Enums: {
      app_role: "platform_admin" | "company_admin" | "manager" | "learner"
      assignment_target: "user" | "group" | "department" | "company"
      audience: "all" | "learner" | "manager"
      content_type:
        | "video"
        | "pdf"
        | "text"
        | "scorm"
        | "quiz"
        | "link"
        | "assignment"
      progress_status: "not_started" | "in_progress" | "completed"
      publish_status: "draft" | "published" | "archived"
      support_status: "open" | "answered" | "closed"
      user_status: "invited" | "active" | "inactive"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["platform_admin", "company_admin", "manager", "learner"],
      assignment_target: ["user", "group", "department", "company"],
      audience: ["all", "learner", "manager"],
      content_type: [
        "video",
        "pdf",
        "text",
        "scorm",
        "quiz",
        "link",
        "assignment",
      ],
      progress_status: ["not_started", "in_progress", "completed"],
      publish_status: ["draft", "published", "archived"],
      support_status: ["open", "answered", "closed"],
      user_status: ["invited", "active", "inactive"],
    },
  },
} as const
