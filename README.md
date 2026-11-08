# 🌐 SocialApp — Enterprise Social Media Backend API

> **Architecture:** Clean Layered Architecture (`Controller` ➔ `Service` ➔ `DB Service`)  
> **Format:** ECMAScript Modules (`"type": "module"`)  
> **Deployment Target:** Vercel Serverless / Render / Railway  

---

## 📖 Executive Summary

**SocialApp** is a scalable, enterprise-grade RESTful API and real-time messaging engine built with **Node.js**, **Express.js**, **MongoDB (Mongoose)**, and **Socket.IO**. The backend powers a comprehensive social networking platform featuring 24-hour disappearing stories with 40-second audio trimming, live chat messaging, rich newsfeed interactions, threaded comment hierarchies, community groups, event scheduling, and a full administrative moderation suite.

---

## 🛠️ Technology Stack

| Technology | Category | Purpose |
| :--- | :--- | :--- |
| **Node.js (>= 18.0.0)** | Runtime | High-throughput asynchronous JavaScript runtime engine |
| **Express.js (v4.21)** | Web Framework | REST API routing, middleware chaining, and HTTP request pipeline |
| **MongoDB & Mongoose (v8.7)**| Database & ODM | Document database with schema validation, virtuals, and TTL indexes |
| **Socket.IO (v4.8)** | WebSockets | Bidirectional low-latency real-time chat & notifications |
| **JSONWebToken (JWT)** | Security | Stateless access & refresh token authentication |
| **Bcrypt (v5.1)** | Security | Secure password salting and one-way cryptographic hashing |
| **Joi (v17.13)** | Validation | Strict schema validation for request payloads and queries |
| **Cloudinary (v2.5)** | Cloud Storage | Secure cloud media storage, resizing, and CDN streaming |
| **Multer (v1.4)** | File Middleware | Memory buffer file upload streaming and MIME type filtering |
| **Nodemailer (v6.9)** | Email Service | SMTP transport service for OTP email activation and recovery |
| **Google Auth Library (v9.14)**| OAuth2 | Google ID token verification for social sign-in |
| **Helmet & Express-Rate-Limit**| Hardening | HTTP header protection and brute-force rate limiting |

---

## 🗄️ Database Schemas & Data Models

| Model | Collection | Primary Attributes | Relationships & Virtuals | Special Mechanics |
| :--- | :--- | :--- | :--- | :--- |
| **`User`** | `users` | `name`, `email`, `password`, `role`, `isConfirmed`, `avatar`, `cover` | Virtuals: `posts`, `friends` | Pre-save Bcrypt hashing, OTP generation |
| **`Story`** | `stories` | `createdBy`, `content`, `media`, `backgroundColor`, `music`, `stickers`, `textPosition`, `expiresAt` | Ref: `createdBy` ➔ `User` | **TTL Index (`expiresAt` = 24h)**, 40s duration |
| **`StoryView`** | `storyviews` | `storyId`, `userId`, `viewedAt`, `reactions` | Ref: `storyId` ➔ `Story`, Ref: `userId` ➔ `User` | Unique compound index (`storyId` + `userId`) |
| **`Post`** | `posts` | `content`, `attachments`, `createdBy`, `isFrozen`, `reactions`, `feelings`, `location` | Ref: `createdBy` ➔ `User`, Virtual: `comments` | Soft-delete (`isFrozen`), atomic reaction toggles |
| **`Comment`** | `comments` | `content`, `postId`, `createdBy`, `commentId`, `isFrozen` | Ref: `postId` ➔ `Post`, Self-Ref: `commentId` ➔ `Comment`, Virtual: `reply` | Nested self-referencing reply tree |
| **`Conversation`** | `conversations` | `participants`, `lastMessage`, `updatedAt` | Refs: `participants` ➔ `User`, Ref: `lastMessage` ➔ `Message` | Room indexing for instant chat queries |
| **`Message`** | `messages` | `conversationId`, `sender`, `recipient`, `text`, `media`, `seen` | Refs: `sender`, `recipient` ➔ `User` | Real-time Socket delivery & read receipts |
| **`Group`** | `groups` | `name`, `description`, `privacy`, `creator`, `avatar` | Ref: `creator` ➔ `User`, Virtual: `members` | Public / Private community management |
| **`GroupMember`** | `groupmembers` | `groupId`, `userId`, `role` (Admin, Moderator, Member) | Refs: `groupId` ➔ `Group`, `userId` ➔ `User` | Granular group role permissions |
| **`Event`** | `events` | `title`, `description`, `date`, `location`, `creator` | Ref: `creator` ➔ `User`, Virtual: `attendees` | RSVP attendance scheduling |
| **`EventAttendee`**| `eventattendees`| `eventId`, `userId`, `status` (Going, Interested) | Refs: `eventId` ➔ `Event`, `userId` ➔ `User` | Compound unique index (`eventId` + `userId`) |
| **`Notification`** | `notifications` | `recipient`, `sender`, `type`, `title`, `message`, `link`, `isRead` | Refs: `recipient`, `sender` ➔ `User` | Live Socket broadcasts |
| **`SupportTicket`**| `supporttickets`| `userId`, `subject`, `message`, `priority`, `status`, `replies` | Ref: `userId` ➔ `User`, Virtual: `author` | Helpdesk resolution workflow |
| **`Report`** | `reports` | `reportedBy`, `targetType` (Post, User, Comment), `targetId`, `reason`, `status` | Ref: `reportedBy` ➔ `User` | Admin moderation queue |

---

## 📡 Complete REST API Endpoints Matrix

### 1. Authentication & Account Access (`/auth`)
| Method | Endpoint | Description | Payload / Params | Access |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/auth/signup` | Register new user & dispatch 6-digit OTP email | `{ name, email, password, cPassword }` | Public |
| `PATCH` | `/auth/confirm-email` | Confirm account activation via OTP | `{ email, code }` | Public |
| `POST` | `/auth/login` | Authenticate with credentials & receive JWT pair | `{ email, password }` | Public |
| `POST` | `/auth/google-login` | Authenticate with Google OAuth2 ID Token | `{ idToken }` | Public |
| `POST` | `/auth/refresh-token` | Rotate expired Access Token using Refresh Token | `{ refreshToken }` | Public |
| `PATCH` | `/auth/forget-password` | Request password reset code via email | `{ email }` | Public |
| `PATCH` | `/auth/reset-password` | Reset password using verified code | `{ email, code, newPassword }` | Public |

### 2. User Profiles & Social Graph (`/user`, `/friendship`, `/follow`)
| Method | Endpoint | Description | Payload / Params | Access |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/user/profile` | Fetch authenticated user's profile | None | Private |
| `GET` | `/user/search?q=:name` | Search users by name or email | Query: `q` | Private |
| `PATCH` | `/user/profile` | Update profile information | `{ name, phone, DOB, gender }` | Private |
| `PATCH` | `/user/profile-image` | Upload profile avatar to Cloudinary | `multipart/form-data` (`file`) | Private |
| `PATCH` | `/user/cover-image` | Upload cover background to Cloudinary | `multipart/form-data` (`file`) | Private |
| `PATCH` | `/user/update-password` | Change account password securely | `{ oldPassword, newPassword }` | Private |
| `PATCH` | `/user/freeze-account` | Soft-delete / deactivate personal account | None | Private |
| `POST` | `/user/block/:userId` | Block a user from interactions | Param: `userId` | Private |
| `POST` | `/friendship/request/:id` | Send friend request | Param: `id` | Private |
| `PATCH` | `/friendship/accept/:id` | Accept incoming friend request | Param: `id` | Private |
| `DELETE` | `/friendship/:id` | Unfriend or cancel friend request | Param: `id` | Private |
| `POST` | `/follow/:userId` | Follow a user | Param: `userId` | Private |
| `DELETE` | `/follow/:userId` | Unfollow a user | Param: `userId` | Private |

### 3. Stories Lifecycle & Stickers (`/story`)
| Method | Endpoint | Description | Payload / Params | Access |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/story` | Publish text or media story with music details | `multipart/form-data` (media, music, stickers, textPos) | Private |
| `GET` | `/story/feed` | Retrieve grouped stories (own + followed users) | None | Private |
| `POST` | `/story/:storyId/view` | Mark story as viewed with timestamp | Param: `storyId` | Private |
| `GET` | `/story/:storyId/viewers` | View story viewers list with reactions | Param: `storyId` | Story Owner |
| `POST` | `/story/:storyId/react` | Send quick emoji reaction (`❤️`, `🔥`, etc.) | `{ emoji: "❤️" }` | Private |
| `DELETE` | `/story/:storyId` | Permanently delete a story | Param: `storyId` | Story Owner |

### 4. Music Library & Audio Trimming (`/music`)
| Method | Endpoint | Description | Payload / Params | Access |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/music` | List local Egyptian hits & royalty-free tracks | Query: `tab`, `search` | Private |
| `GET` | `/music/stream/:id` | Stream audio buffer for preview / trimming | Param: `id` | Private |

### 5. Newsfeed Posts & Reactions (`/post`, `/reaction`)
| Method | Endpoint | Description | Payload / Params | Access |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/post?page=1&limit=10`| Paginated newsfeed with deep-populated comments | Query: `page`, `limit` | Private |
| `POST` | `/post` | Create post with images/video, feelings & location | `multipart/form-data` (`attachments`, `content`) | Private |
| `PATCH` | `/post/:postId` | Update post content or attachments | `{ content, removedAttachments }` | Author |
| `PATCH` | `/post/:postId/freeze` | Soft-delete post | Param: `postId` | Author, Admin |
| `PATCH` | `/post/:postId/unfreeze`| Restore frozen post | Param: `postId` | Author, Admin |
| `POST` | `/reaction/:postId` | Add or toggle reaction (Like, Love, Haha...) | `{ emoji: "love" }` | Private |
| `DELETE` | `/reaction/:postId` | Remove reaction from post | Param: `postId` | Private |

### 6. Threaded Comments & Replies (`/post/:postId/comment`)
| Method | Endpoint | Description | Payload / Params | Access |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/post/:postId/comment` | Add top-level comment to post | `{ content }` | Private |
| `POST` | `/post/:postId/comment/:commentId/reply` | Add nested reply to existing comment | `{ content }` | Private |
| `PATCH` | `/post/:postId/comment/:commentId` | Update comment or reply content | `{ content }` | Author |
| `PATCH` | `/post/:postId/comment/:commentId/freeze` | Freeze comment/reply | Author, Post Owner, Admin |
| `PATCH` | `/post/:postId/comment/:commentId/unfreeze` | Restore frozen comment/reply | Author, Post Owner, Admin |

### 7. Real-Time Chat Messaging (`/chat`)
| Method | Endpoint | Description | Payload / Params | Access |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/chat/conversations` | Fetch active conversations list with unread counts | None | Private |
| `GET` | `/chat/messages/:recipientId` | Get message history with a specific user | Query: `page`, `limit` | Private |
| `POST` | `/chat/messages` | Send message with optional media attachment | `multipart/form-data` (`recipient`, `text`, `file`)| Private |
| `PATCH` | `/chat/messages/seen/:recipientId` | Mark conversation messages as seen | Param: `recipientId` | Private |

### 8. Communities & Groups (`/group`)
| Method | Endpoint | Description | Payload / Params | Access |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/group` | List discoverable groups | Query: `search` | Private |
| `POST` | `/group` | Create new community group | `{ name, description, privacy }` | Private |
| `GET` | `/group/:groupId` | Get group details, feeds & member list | Param: `groupId` | Group Members |
| `POST` | `/group/:groupId/join` | Request to join or join public group | Param: `groupId` | Private |
| `PATCH` | `/group/:groupId/request/:requestId` | Approve or reject join request | `{ action: "accept" / "reject" }` | Group Admin |

### 9. Scheduled Events (`/event`)
| Method | Endpoint | Description | Payload / Params | Access |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/event` | List upcoming events | Query: `filter` | Private |
| `POST` | `/event` | Create new scheduled event | `{ title, description, date, location }` | Private |
| `POST` | `/event/:eventId/rsvp` | Submit RSVP attendance | `{ status: "going" / "interested" }` | Private |

### 10. Help Desk & Support Tickets (`/support`)
| Method | Endpoint | Description | Payload / Params | Access |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/support/tickets` | List user's submitted support tickets | None | Private |
| `POST` | `/support/tickets` | Open new support ticket | `{ subject, message, priority }` | Private |
| `POST` | `/support/tickets/:ticketId/reply` | Reply to support ticket thread | `{ message }` | Ticket Owner, Admin |

### 11. SuperAdmin Portal & Moderation (`/admin`)
| Method | Endpoint | Description | Payload / Params | Access |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/admin/stats` | Platform analytics (total users, posts, stories, tickets) | None | Admin Only |
| `GET` | `/admin/users` | Paginated user management table | Query: `page`, `role`, `status` | Admin Only |
| `PATCH` | `/admin/users/:userId/role`| Elevate or demote user role (`Admin` / `User`) | `{ role: "Admin" }` | Admin Only |
| `PATCH` | `/admin/users/:userId/ban` | Ban or unban user account | `{ isBanned: true }` | Admin Only |
| `GET` | `/admin/reports` | Moderation queue of reported content | Query: `status` | Admin Only |
| `PATCH` | `/admin/reports/:reportId` | Resolve report & take action (delete content, warn user) | `{ action: "resolve" }` | Admin Only |

---

## ⚡ Socket.IO Real-Time Event Architecture

| Event Name | Direction | Emitter / Receiver | Payload | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `connection` | Client ➔ Server | Socket Client | Handshake Auth: `{ token }` | Authenticates socket & joins user room `user:<userId>` |
| `sendMessage` | Client ➔ Server | Sender Client | `{ recipientId, text, media }` | Dispatches real-time message to recipient |
| `newMessage` | Server ➔ Client | Receiver Socket | `{ message, conversationId }` | Delivers incoming message bubble instantly |
| `typing` | Client ➔ Server | Sender Client | `{ conversationId, isTyping: true }` | Broadcasts typing indicator to partner |
| `userTyping` | Server ➔ Client | Receiver Socket | `{ userId, conversationId }` | Displays "Typing..." in chat window |
| `newNotification` | Server ➔ Client | Receiver Socket | `{ notification }` | Increments notification badge & displays toast |
| `storyReaction`| Server ➔ Client | Story Creator | `{ storyId, emoji, user }` | Live toast reaction alert on active story |

---

## ⚙️ Environment Variables Reference

| Variable | Type | Example / Default | Required | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `PORT` | Number | `3001` | Yes | HTTP & WebSocket server port |
| `DB_URI` | String | `mongodb+srv://...` | Yes | MongoDB Atlas connection string |
| `SALT` | Number | `10` | Yes | Bcrypt password hashing cost factor |
| `ENCRYPTION_KEY` | String | `socialmediaapplication` | Yes | AES symmetric token payload encryption key |
| `USER_ACCESS_TOKEN` | String | `SocialAppUserSecret` | Yes | JWT Access Token signing key |
| `USER_REFRESH_TOKEN`| String | `SocialAppRefreshSecret` | Yes | JWT Refresh Token signing key |
| `EXPIRESIN` | Number | `1800` (30 min) | Yes | Access token lifespan in seconds |
| `EMAIL` | String | `admin@gmail.com` | Yes | SMTP Nodemailer account email |
| `EMAIL_PASSWORD` | String | `app-specific-password` | Yes | SMTP app password for OTP delivery |
| `FE_URL` | String | `http://localhost:5173` | Yes | Allowed CORS origin & client URL |
| `cloud_name` | String | `qxyupdvj` | Yes | Cloudinary CDN cloud identifier |
| `api_key` | String | `462267984881375` | Yes | Cloudinary API access key |
| `api_secret` | String | `qrLrYCKbwdFvsk7...` | Yes | Cloudinary API access secret |

---

## 🚀 Deployment & Vercel Configuration

The backend is configured with [`vercel.json`](./vercel.json) using the `@vercel/node` builder:

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

### Deployment Step-by-Step Matrix:
| Step | Action | Platform | Command / Details |
| :---: | :--- | :--- | :--- |
| **1** | Import Repository | Vercel Dashboard | Select `AlbashengineerAhmed/social-backend` |
| **2** | Environment Variables | Vercel Project Settings | Add all variables from `.env.example` (`DB_URI`, `JWT`, `Cloudinary`) |
| **3** | Deploy | Vercel CLI / Web | Click **Deploy** ➔ Generates live serverless API URL |
| **4** | Real-time WebSockets (Optional) | Render / Railway | Deploy alongside for persistent 24/7 Socket.IO connections |
