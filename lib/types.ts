export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          role: 'admin' | 'partner'
          topics: string[]
          approved: boolean
          bio: string | null
          experience: string | null
          rating: number | null
          availability: 'available' | 'busy' | 'unavailable' | null
          hourly_rate: number | null
          created_at: string
        }
        Insert: {
          id: string
          name: string
          role: 'admin' | 'partner'
          topics?: string[]
          approved?: boolean
          bio?: string | null
          experience?: string | null
          rating?: number | null
          availability?: 'available' | 'busy' | 'unavailable' | null
          hourly_rate?: number | null
          created_at?: string
        }
        Update: {
          name?: string
          role?: 'admin' | 'partner'
          topics?: string[]
          approved?: boolean
          bio?: string | null
          experience?: string | null
          rating?: number | null
          availability?: 'available' | 'busy' | 'unavailable' | null
          hourly_rate?: number | null
        }
        Relationships: []
      }
      topics: {
        Row: { id: string; name: string }
        Insert: { id?: string; name: string }
        Update: { name?: string }
        Relationships: []
      }
      tasks: {
        Row: {
          id: string
          title: string
          description: string
          amount: number
          categories: string[]
          created_by: string | null
          assigned_to: string | null
          status: 'draft' | 'sent' | 'assigned'
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string
          amount?: number
          categories?: string[]
          created_by?: string
          assigned_to?: string | null
          status?: 'draft' | 'sent' | 'assigned'
          created_at?: string
        }
        Update: {
          title?: string
          description?: string
          amount?: number
          categories?: string[]
          assigned_to?: string | null
          status?: 'draft' | 'sent' | 'assigned'
        }
        Relationships: [
          { foreignKeyName: 'tasks_created_by_fkey'; columns: ['created_by']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] },
          { foreignKeyName: 'tasks_assigned_to_fkey'; columns: ['assigned_to']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }
        ]
      }
      task_recipients: {
        Row: {
          id: string
          task_id: string
          partner_id: string
          opened_at: string | null
          replied_at: string | null
        }
        Insert: {
          id?: string
          task_id: string
          partner_id: string
          opened_at?: string | null
          replied_at?: string | null
        }
        Update: {
          opened_at?: string | null
          replied_at?: string | null
        }
        Relationships: [
          { foreignKeyName: 'task_recipients_task_id_fkey'; columns: ['task_id']; isOneToOne: false; referencedRelation: 'tasks'; referencedColumns: ['id'] },
          { foreignKeyName: 'task_recipients_partner_id_fkey'; columns: ['partner_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }
        ]
      }
      messages: {
        Row: {
          id: string
          task_id: string
          sender_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          sender_id: string
          content: string
          created_at?: string
        }
        Update: {
          content?: string
        }
        Relationships: [
          { foreignKeyName: 'messages_task_id_fkey'; columns: ['task_id']; isOneToOne: false; referencedRelation: 'tasks'; referencedColumns: ['id'] },
          { foreignKeyName: 'messages_sender_id_fkey'; columns: ['sender_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }
        ]
      }
      proposals: {
        Row: {
          id: string
          task_id: string
          partner_id: string
          amount: number
          message: string
          status: 'pending' | 'accepted' | 'rejected'
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          partner_id: string
          amount: number
          message?: string
          status?: 'pending' | 'accepted' | 'rejected'
          created_at?: string
        }
        Update: {
          amount?: number
          message?: string
          status?: 'pending' | 'accepted' | 'rejected'
        }
        Relationships: [
          { foreignKeyName: 'proposals_task_id_fkey'; columns: ['task_id']; isOneToOne: false; referencedRelation: 'tasks'; referencedColumns: ['id'] },
          { foreignKeyName: 'proposals_partner_id_fkey'; columns: ['partner_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Topic = Database['public']['Tables']['topics']['Row']
export type Task = Database['public']['Tables']['tasks']['Row']
export type TaskRecipient = Database['public']['Tables']['task_recipients']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type Proposal = Database['public']['Tables']['proposals']['Row']

export type TaskWithRecipients = Task & {
  task_recipients: (TaskRecipient & { profiles: Profile })[]
}

export type MessageWithSender = Message & {
  profiles: Profile
}

export type ProposalWithPartner = Proposal & {
  profiles: Profile
}
