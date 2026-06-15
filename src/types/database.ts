export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          display_name?: string;
          avatar_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      rooms: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          cover_url: string | null;
          owner_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          cover_url?: string | null;
          owner_id: string;
          created_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          cover_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "rooms_owner_id_fkey";
            columns: ["owner_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      room_members: {
        Row: {
          room_id: string;
          user_id: string;
          role: string;
          joined_at: string;
        };
        Insert: {
          room_id: string;
          user_id: string;
          role?: string;
          joined_at?: string;
        };
        Update: {
          role?: string;
        };
        Relationships: [
          {
            foreignKeyName: "room_members_room_id_fkey";
            columns: ["room_id"];
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "room_members_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      room_invites: {
        Row: {
          id: string;
          room_id: string;
          code: string;
          password_hash: string | null;
          expires_at: string | null;
          max_uses: number | null;
          use_count: number;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          code?: string;
          password_hash?: string | null;
          expires_at?: string | null;
          max_uses?: number | null;
          use_count?: number;
          created_by: string;
          created_at?: string;
        };
        Update: {
          use_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "room_invites_room_id_fkey";
            columns: ["room_id"];
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          }
        ];
      };
      media: {
        Row: {
          id: string;
          room_id: string;
          uploader_id: string;
          r2_key: string;
          r2_url: string;
          media_type: string;
          width: number | null;
          height: number | null;
          duration_sec: number | null;
          taken_at: string | null;
          uploaded_at: string;
          ai_processed: boolean;
        };
        Insert: {
          id?: string;
          room_id: string;
          uploader_id: string;
          r2_key: string;
          r2_url: string;
          media_type: string;
          width?: number | null;
          height?: number | null;
          duration_sec?: number | null;
          taken_at?: string | null;
          uploaded_at?: string;
          ai_processed?: boolean;
        };
        Update: {
          ai_processed?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "media_room_id_fkey";
            columns: ["room_id"];
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          }
        ];
      };
      tags: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      media_tags: {
        Row: {
          media_id: string;
          tag_id: string;
          source: string;
          confidence: number | null;
        };
        Insert: {
          media_id: string;
          tag_id: string;
          source: string;
          confidence?: number | null;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "media_tags_media_id_fkey";
            columns: ["media_id"];
            referencedRelation: "media";
            referencedColumns: ["id"];
          }
        ];
      };
      reactions: {
        Row: {
          id: string;
          media_id: string;
          user_id: string;
          emoji: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          media_id: string;
          user_id: string;
          emoji: string;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "reactions_media_id_fkey";
            columns: ["media_id"];
            referencedRelation: "media";
            referencedColumns: ["id"];
          }
        ];
      };
      comments: {
        Row: {
          id: string;
          media_id: string;
          user_id: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          media_id: string;
          user_id: string;
          body: string;
          created_at?: string;
        };
        Update: {
          body?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comments_media_id_fkey";
            columns: ["media_id"];
            referencedRelation: "media";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      memory_history: {
        Row: {
          id: string;
          user_id: string;
          room_id: string;
          media_id: string;
          shown_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          room_id: string;
          media_id: string;
          shown_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
