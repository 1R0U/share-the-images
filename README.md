# Share the Images

大切な人と、大切な瞬間を共有するクローズドな画像共有アプリ。

**[ロードマップ（issue 一覧）](https://1r0u.github.io/share-the-images/document/roadmap.html)**

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| モバイル | React Native (Expo SDK 56) |
| ルーティング | Expo Router v4 (ファイルベース) |
| バックエンド / DB | Supabase (PostgreSQL + Auth + Edge Functions) |
| ストレージ | Cloudflare R2 |
| 状態管理 | Zustand |
| AI タグ付け | Gemini API (Supabase Edge Function 経由) |

## 主な機能

- **ルーム** — DiscordライクなグループでURLまたは招待コードで招待
- **タイムライン** — ルームごとの写真・動画グリッド表示
- **カメラ投稿** — カメラ撮影またはライブラリから複数選択アップロード
- **月別アルバム** — 投稿を月ごとにまとめて閲覧
- **タグ検索** — AI自動タグ・手動タグでメディアを検索
- **リアクション・コメント** — 写真に絵文字リアクションとコメントを追加
- **Googleログイン** — Supabase Auth 経由の OAuth 認証

## セットアップ

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. Supabase プロジェクトの作成

1. [supabase.com](https://supabase.com) でプロジェクトを作成
2. Project Settings → API から URL と anon key を取得

### 3. 環境変数の設定

`.env.example` をコピーして `.env` を作成:

```bash
cp .env.example .env
```

`.env` を編集:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. データベースのセットアップ

Supabase ダッシュボードの SQL Editor で `supabase/migrations/0001_initial.sql` を実行する。

または Supabase CLI を使う場合:

```bash
npx supabase db push
```

### 5. Google OAuth の設定

Supabase ダッシュボード → Authentication → Providers → Google を有効化し、Google Cloud Console で取得した Client ID / Secret を設定する。

Redirect URL には以下を追加:

```
sharetheimages://auth/callback
```

### 6. アプリの起動

```bash
# Expo Go アプリで確認 (開発)
npm start

# Android
npm run android

# iOS (macOS のみ)
npm run ios
```

## フォルダ構成

```
app/
├── (auth)/
│   └── login.tsx          # ログイン画面
└── (main)/
    ├── index.tsx          # タイムライン (ホーム)
    ├── camera.tsx         # 写真・動画の投稿
    ├── search.tsx         # タグ検索
    ├── albums.tsx         # 月別アルバム一覧
    ├── profile.tsx        # プロフィール・ログアウト
    └── room/
        ├── list.tsx       # ルーム切り替え
        ├── create.tsx     # ルーム作成
        ├── invite.tsx     # 招待リンク発行
        ├── join.tsx       # 招待コードで参加
        ├── media.tsx      # 写真詳細・リアクション
        └── album.tsx      # 月別グリッド

src/
├── lib/supabase.ts        # Supabase クライアント
├── stores/
│   ├── authStore.ts       # 認証状態 (Zustand)
│   └── roomStore.ts       # ルーム状態 (Zustand)
└── types/
    └── database.ts        # Supabase 型定義

supabase/
└── migrations/
    └── 0001_initial.sql   # スキーマ + RLS ポリシー
```
