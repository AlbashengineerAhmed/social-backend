# 🌐 SocialApp — Backend API & Real-time Server

A production-ready, feature-rich social media backend built with **Node.js**, **Express.js (ES Modules)**, **MongoDB (Mongoose)**, and **Socket.IO**. Designed for high performance, real-time engagement, and seamless deployment on **Vercel**, **Render**, or **Railway**.

---

## 🚀 Key Highlights & Capabilities

- 🔐 **Authentication & Security**: Email verification via OTP (Nodemailer HTML templates), JWT access & refresh tokens with credential invalidation timestamps, Google OAuth2 integration (`google-auth-library`), Bcrypt hashing, Helmet HTTP security headers, and Express rate limiting.
- 📱 **Facebook & Instagram Stories (24h TTL)**:
  - 40-second smooth story progression with auto-advance to next user/story.
  - Text stories with gradient backgrounds & draggable captions.
  - Media stories with Cloudinary image/video delivery.
  - Draggable overlays: Facebook-style music stickers, user mentions, and location pins.
  - Real-time viewers tracking (`viewStory`), view counts, and emoji quick reactions.
- 🎵 **Integrated Music Engine & 40s Waveform Trimmer**:
  - Curated local soundtracks & online royalty-free library.
  - Interactive audio trimming window (40s clips) with waveform visualization.
  - Draggable music stickers with live equalizer bars.
- 💬 **Real-time Chat (Socket.IO)**:
  - 1-on-1 private messaging and group discussions.
  - Instant socket events for new messages, typing indicators, and read receipts.
- 📰 **Feed, Posts & Threaded Comments**:
  - Paginated newsfeed with customizable visibility (Public, Friends, Private).
  - Multi-reaction engine (Like, Love, Care, Haha, Wow, Sad, Angry).
  - Multi-level nested comments & replies with freeze/unfreeze controls.
  - Post feelings, location tagging, and background cards.
- 👥 **Communities & Groups**:
  - Public & private groups with membership requests and approvals.
  - Role-based permissions (Admin, Moderator, Member) and group post feeds.
- 📅 **Events Scheduling & RSVP**:
  - Event creation, location/date scheduling, and guest tracking (Going, Interested).
- 🔔 **Notification Center**:
  - Automated real-time notifications for likes, comments, mentions, friendships, and replies.
- 🎫 **Support Desk & Moderation**:
  - User support ticketing system with priority escalation (Low, Medium, High, Urgent).
  - Comprehensive Admin portal for user banning, content moderation, and report resolution.
- ☁️ **Cloudinary Media Pipeline**:
  - Multer memory storage and streaming uploads for photos, videos, and avatars.

---

## 📁 System Architecture

```text
social-backend/
├── index.js                               # Application entrypoint & HTTP + Socket.IO server bootstrap
├── package.json                           # Dependencies, engines (>=18.0.0), and start scripts
├── vercel.json                            # Vercel serverless deployment routing config
├── .env.example                           # Template environment variables
├── .gitignore                             # Ignored files (node_modules, .env.dev, uploads)
└── src/
    ├── app.controller.js                  # Middleware chain, route aggregator & global error handlers
    ├── socket.js                          # Socket.IO connection manager & real-time events
    ├── config/
    │   └── .env.dev                       # Development environment variables (git-ignored)
    ├── DB/
    │   ├── connection.js                  # MongoDB Atlas connection manager
    │   ├── db.service.js                  # Generic database query abstraction layer
    │   └── model/                         # Mongoose data models
    │       ├── User.model.js              # Profiles, roles, providers, followers & blocking
    │       ├── Post.model.js              # Posts, attachments, reactions & comment virtuals
    │       ├── Comment.model.js           # Multi-tier comments and nested replies
    │       ├── Story.model.js             # 24h stories with music, stickers, coordinates & TTL
    │       ├── StoryView.model.js         # Story viewers log & reactions
    │       ├── Conversation.model.js      # Chat conversation rooms
    │       ├── Message.model.js           # Real-time chat messages & media
    │       ├── Group.model.js             # Community groups & settings
    │       ├── GroupMember.model.js       # Group members & RBAC
    │       ├── GroupRequest.model.js      # Join group approval queue
    │       ├── Event.model.js             # Scheduled events
    │       ├── EventAttendee.model.js     # Event RSVPs
    │       ├── Notification.model.js      # User notifications
    │       ├── SupportTicket.model.js     # Helpdesk tickets & resolution
    │       └── Report.model.js            # Content reports & moderation flags
    ├── middleware/
    │   ├── auth.middleware.js             # JWT authentication & RBAC guards
    │   └── validation.middleware.js       # Joi request payload & file validation
    ├── modules/                           # Feature domain modules (Controller, Service, Validation)
    │   ├── auth/                          # Signup, OTP verification, Login, Google OAuth
    │   ├── user/                          # User profile, avatar/cover upload, search, block
    │   ├── post/                          # Feed, post CRUD, reactions, feelings, location
    │   ├── comment/                       # Threaded comments, replies, reaction toggle
    │   ├── story/                         # Stories lifecycle, 40s duration, stickers, viewers
    │   ├── music/                         # Music library, metadata, stream proxy
    │   ├── chat/                          # Messaging API, conversations list, message history
    │   ├── group/                         # Group management, membership workflows
    │   ├── event/                         # Event creation, attendee RSVP
    │   ├── notification/                  # Notification fetching & read status
    │   ├── support/                       # Support tickets & admin response flow
    │   └── admin/                         # Admin analytics, user banning, reports management
    └── utils/
        ├── pagination.js                  # Cursor & page/limit pagination helper
        ├── email/                         # Nodemailer SMTP transporter & HTML templates
        ├── events/                        # EventEmitters for async non-blocking operations
        ├── multer/                        # Cloudinary stream uploader & disk storage
        ├── response/                      # Standardized success responses & asyncHandler
        └── security/                      # Bcrypt hashing & JWT encryption utilities
```

---

## 🔄 Core Application Flows & API Endpoints

### 1. Authentication Flow
```text
[User Signup] ──> [Hash Password] ──> [Save User (Unconfirmed)] ──> [Emit Email Event] ──> [Send 6-Digit OTP]
[Submit OTP]  ──> [Verify OTP & Expiration] ──> [Activate Account] ──> [Issue Access & Refresh Tokens]
```
- `POST /auth/signup` — Register a new account & receive OTP.
- `PATCH /auth/confirm-email` — Confirm email with 6-digit OTP code.
- `POST /auth/login` — Sign in with email & password.
- `POST /auth/google-login` — Sign in with Google ID token credential.
- `POST /auth/refresh-token` — Rotate access token using valid refresh token.
- `PATCH /auth/forget-password` & `PATCH /auth/reset-password` — Password recovery flow.

### 2. Story Flow (Facebook / Instagram Style)
```text
[Create Story] ──> [Upload Media or Select Gradient] ──> [Pick Music & Trim 40s] ──> [Place Draggable Overlays] ──> [Publish (24h TTL)]
[Viewer Opens] ──> [Track View & Timestamp] ──> [Progress Bar 0-100% over 40s] ──> [Send Quick Emoji Reaction] ──> [Auto-Advance Next Story]
```
- `POST /story` — Publish text or media story with music details (`x`, `y`, `startTime`, `duration: 40`), stickers, and text position.
- `GET /story/feed` — Grouped active stories by followed users and own profile.
- `POST /story/:storyId/view` — Record viewer presence & timestamp.
- `GET /story/:storyId/viewers` — Fetch viewers list with reactions (Story creator only).
- `POST /story/:storyId/react` — Send quick emoji reaction (`❤️`, `🔥`, `👏`, `😂`, `😮`, `😢`).
- `DELETE /story/:storyId` — Delete story permanently.

### 3. Posts & Feed Flow
```text
[Author Posts] ──> [Upload Media to Cloudinary] ──> [Attach Feelings/Location] ──> [Broadcast to Followers]
[Users Interact] ──> [Toggle Reaction (Like, Love...)] ──> [Add Threaded Comment/Reply] ──> [Notify Author]
```
- `GET /post` — Paginated home feed.
- `POST /post` — Create post with text, images/videos, gradient card, location, or feelings.
- `PATCH /post/:postId` — Edit existing post.
- `PATCH /post/:postId/reaction` — Toggle reaction emoji.
- `POST /post/:postId/comment` — Add top-level comment.
- `POST /post/:postId/comment/:commentId/reply` — Post nested reply.

### 4. Real-time Messaging Flow
```text
[Client Connects (Socket.IO)] ──> [Authenticate JWT Handshake] ──> [Join Personal Room (userId)]
[Send Message] ──> [Save to MongoDB] ──> [io.to(receiverId).emit('newMessage')] ──> [Live UI Bubble Update]
```
- `GET /chat/conversations` — Fetch user's conversation threads with last message & unread badge.
- `GET /chat/messages/:recipientId` — Fetch chat message history.
- `POST /chat/messages` — Send message with optional media attachment.

---

## ⚙️ Environment Configuration

Create a `.env` or use `src/config/.env.dev` with the following variables:

```env
PORT=3001
DB_URI="mongodb+srv://<username>:<password>@cluster0.mongodb.net/SocialMediaApp"
SALT=10
ENCRYPTION_KEY="socialmediaapplication"

# JWT Signatures
TOKEN_SIGNATURE="SocialAppUserTokenSignature"
TOKEN_SIGNATURE_ADMIN="SocialAppAdminTokenSignature"
EMAIL_TOKEN_SIGNATURE="SocialAppEmailTokenSignature"

USER_ACCESS_TOKEN="SocialAppUserTokenSignature"
ADMIN_ACCESS_TOKEN="SocialAppAdminTokenSignature"
USER_REFRESH_TOKEN="SocialAppUserRefreshTokenSignature"
ADMIN_REFRESH_TOKEN="SocialAppAdminRefreshTokenSignature"
EXPIRESIN=1800

# Email SMTP
EMAIL="your-email@gmail.com"
EMAIL_PASSWORD="your-app-password"

# Frontend Host & Metadata
FE_URL="http://localhost:5173"
APP_NAME="Social Media App"
MOOD="DEV"

# Cloudinary Storage
cloud_name="your_cloud_name"
api_key="your_api_key"
api_secret="your_api_secret"
```

---

## 🛠️ Local Development Setup

1. **Install dependencies**:
   ```bash
   cd social-backend
   npm install
   ```

2. **Start the development server with file watch**:
   ```bash
   npm run dev
   ```

3. **Start the production server**:
   ```bash
   npm start
   ```

4. **Seed initial SuperAdmin**:
   ```bash
   npm run create:admin
   ```

---

## 🚀 Deployment (Vercel / Cloud Platforms)

The repository includes a ready-to-use [`vercel.json`](./vercel.json) configured with the `@vercel/node` builder:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "./index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/"
    }
  ]
}
```

- When deploying to **Vercel**, import the `social-backend` repository and set the environment variables in the Vercel Project Settings.
- For persistent real-time WebSockets (Socket.IO), platforms like **Render**, **Railway**, or **VPS** will keep persistent connections active via `server.listen(process.env.PORT)`.
