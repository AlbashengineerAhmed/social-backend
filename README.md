# SocialApp — Enterprise Social Media Backend API

> **Course:** Node.js Backend Route — Cycle 43 (Weeks 12 to 14: Social App)  
> **Instructor:** Eng. Mahmoud Elwan  
> **Architecture:** Clean Layered Architecture (Controller -> Service -> DB Service)  
> **Module Format:** ECMAScript Modules (`"type": "module"`)

---

## 📖 Overview

**SocialApp** is a scalable, enterprise-grade RESTful API built with **Node.js**, **Express.js**, and **MongoDB (Mongoose)**. The application implements core social networking capabilities including secure user authentication (email OTP verification and Google OAuth2), user profile management, paginated posts with Cloudinary multi-asset uploads, threaded comments and replies, atomic post likes, and soft-delete/restore mechanics.

Every file in the codebase is fully documented with strict **JSDoc** standards and validated with schema-driven validation (**Joi**) and centralized error handling.

---

## 📁 Project Structure

```text
SocialApp/
├── index.js                               # Application entrypoint & HTTP server bootstrap
├── package.json                           # Project dependencies, scripts & ES module configuration
├── package-lock.json                      # Locked dependency tree
├── README.md                              # Comprehensive project documentation
└── src/
    ├── app.controller.js                  # Express middleware pipeline, route aggregator & error handlers
    ├── config/
    │   └── .env.dev                       # Development environment variables
    ├── DB/
    │   ├── connection.js                  # MongoDB Mongoose connection manager
    │   ├── db.service.js                  # Generic database query abstraction layer
    │   └── model/
    │       ├── User.model.js              # User schema, enums (roles, providers), indexes & hooks
    │       ├── Post.model.js              # Post schema with virtual 'comments' populate
    │       └── Comment.model.js           # Comment & reply schema with virtual 'reply' populate
    ├── middleware/
    │   ├── auth.middleware.js             # JWT authentication & role-based authorization guards
    │   └── validation.middleware.js       # Joi request payload & file validation middleware
    ├── modules/
    │   ├── auth/                          # Authentication Module
    │   │   ├── auth.controller.js         # Auth routing endpoints
    │   │   ├── auth.validation.js         # Joi validation schemas (signup, login, verify OTP)
    │   │   └── service/
    │   │       ├── registration.service.js# Signup, OTP generation & email dispatch
    │   │       └── login.service.js       # Credential login & Google OAuth2 integration
    │   ├── user/                          # User Profile Module
    │   │   ├── user.controller.js         # User profile & credentials routes
    │   │   ├── user.authorization.js      # Role-based access rules for user operations
    │   │   ├── user.validation.js         # Joi validation schemas (profile update, password)
    │   │   └── service/
    │   │       └── user.service.js        # User retrieval, profile update, avatar upload & deletion
    │   ├── post/                          # Post & Feed Module
    │   │   ├── post.controller.js         # Post CRUD, like toggle & nested comment router mounting
    │   │   ├── post.authorization.js      # Role permissions for post actions
    │   │   ├── post.validation.js         # Joi validation schemas for posts
    │   │   └── service/
    │   │       └── post.service.js        # Feed pagination, Cloudinary upload, edit, like/unlike
    │   └── comment/                       # Comment & Reply Module
    │       ├── comment.controller.js      # Nested comment/reply routes (mergeParams: true)
    │       ├── comment.authorization.js   # Multi-tier access control (author, post owner, admin)
    │       ├── comment.validation.js      # Joi validation schemas for comments
    │       └── service/
    │           └── comment.service.js     # Comment creation, reply nesting, multi-role freeze
    └── utils/
        ├── pagination.js                  # Generic pagination helper with skip/limit calculation
        ├── email/
        │   ├── send.email.js              # Nodemailer SMTP transport service
        │   └── template/
        │       └── verifyAccount.template.js # Responsive HTML email template for OTP confirmation
        ├── events/
        │   └── email.event.js             # Node.js EventEmitter for non-blocking email processing
        ├── multer/
        │   ├── cloud.multer.js            # Multer memory storage & file type validation filters
        │   ├── cloudinary.multer.js       # Cloudinary v2 SDK configuration & client instance
        │   └── local.multer.js            # Disk storage fallback configuration
        ├── response/
        │   ├── error.response.js          # Centralized asyncHandler & custom GlobalErrorHandler
        │   └── success.response.js        # Standardized JSON success response utility
        └── security/
            ├── hash.security.js           # Bcrypt password hashing & comparison helpers
            └── token.security.js          # JWT sign, verify, token generation & encryption
```

---

## 🧩 Reconstructed Modules Breakdown

### 1. Database Layer (`src/DB/`)
- **`connection.js`**: Robust Mongoose connection wrapper connecting to MongoDB with connection event listeners.
- **`db.service.js`**: Reusable generic database adapter encapsulating operations (`find`, `findOne`, `create`, `findOneAndUpdate`, `findByIdAndUpdate`, `deleteOne`, etc.) to isolate Mongoose specifics from service business logic.
- **`model/User.model.js`**: Defines the user schema with pre-save password hashing, custom role types (`User`, `Admin`), provider types (`System`, `Google`), and indexes.
- **`model/Post.model.js`**: Schema for user posts with attachments array, likes array, and a virtual populate (`comments`) linking top-level comments to the post.
- **`model/Comment.model.js`**: Threaded comment schema supporting parent-child self-referential relations via `commentId` and virtual populate (`reply`).

### 2. Authentication & Authorization (`src/middleware/`, `src/modules/auth/`)
- **`auth.middleware.js`**:
  - `authentication()`: Validates incoming Bearer JWT tokens, verifies user existence, checks password update timestamps against token issuance (`changeCredentialsTime`), and injects `req.user`.
  - `authorization(roles)`: Role-based access control (RBAC) ensuring only authorized user roles access restricted routes.
- **`registration.service.js`**:
  - Validates duplicate emails.
  - Generates numerical confirmation OTP codes.
  - Fires an asynchronous `sendEmail` event via `email.event.js` to dispatch responsive verification emails non-blockingly.
  - Confirms email OTP to activate accounts.
- **`login.service.js`**:
  - Validates user credentials with Bcrypt.
  - Generates access & refresh tokens via `token.security.js`.
  - Native Google OAuth2 token verification (`google-auth-library`) for seamless social sign-in.

### 3. User Management (`src/modules/user/`)
- **`user.service.js`**:
  - `getProfile`: Retrieves the authenticated user's profile with populated fields.
  - `updateProfile`: Updates personal details with validation.
  - `updatePassword`: Verifies old password and securely hashes the new one.
  - `updateProfileImage`: Streams avatar image to Cloudinary and stores secure CDN URLs.
  - `freezeAccount` / `unfreezeAccount`: Soft deletion and reactivation mechanics.

### 4. Post & Feed Management (`src/modules/post/`)
- **`post.service.js`**:
  - `getPosts`: Newsfeed retrieval with customized pagination (`paginate` helper), deep population of author info, top-level comments, and nested replies.
  - `createPost`: Publishes posts with optional multi-file image attachments uploaded to Cloudinary.
  - `updatePost`: Enables post authors to modify text and update attachments.
  - `freezePost` / `unfreezePost`: Allows post owners to soft-delete and restore posts.
  - `likePost`: Handles like/unlike reactions using atomic MongoDB `$addToSet` and `$pull` operators.

### 5. Nested Comments & Replies (`src/modules/comment/`)
- **`comment.controller.js`**: Configured with `mergeParams: true` and mounted under `/post/:postId/comment` to handle nested URL hierarchies seamlessly.
- **`comment.service.js`**:
  - `createComment`: Supports creating both direct post comments and nested replies to existing comments (`/:commentId/reply`).
  - `updateComment`: Ownership-protected editing of comment content and attachments.
  - `freezeComment` / `unFreezeComment`: Multi-tier authorization logic allowing:
    1. The comment's author.
    2. The original post's author.
    3. System administrators (`role: Admin`).

### 6. Utilities & Cross-Cutting Concerns (`src/utils/`)
- **Centralized Error Handling**: `asyncHandler` wraps asynchronous controllers to catch rejections, forwarding them to `globalErrorHandling` in `app.controller.js`.
- **Standardized Responses**: `successResponse` formats all successful payloads uniformly (`{ message, status, data }`).
- **File Uploads**: `cloud.multer.js` filters permitted MIME types (e.g., images, PDFs) with memory buffering; `cloudinary.multer.js` handles cloud asset storage.
- **Pagination Utility**: `pagination.js` computes offsets, limits, and total pages dynamically.
- **Event-Driven Emails**: `email.event.js` decouples email sending from the request-response lifecycle for instant response times.

---

## 📡 API Endpoints Reference

### Authentication (`/auth`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/signup` | Register a new user and send verification OTP | Public |
| `PATCH` | `/auth/verify-account` | Verify email OTP code to activate account | Public |
| `POST` | `/auth/login` | Authenticate with email & password | Public |
| `POST` | `/auth/login-with-google` | Authenticate using Google OAuth token | Public |

### User Profile (`/user`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/user/profile` | Retrieve authenticated user's profile | Private (User, Admin) |
| `PATCH` | `/user/profile` | Update profile details | Private (User, Admin) |
| `PATCH` | `/user/update-password` | Change account password | Private (User, Admin) |
| `PATCH` | `/user/profile-image` | Upload/update profile image via Cloudinary | Private (User, Admin) |
| `PATCH` | `/user/freeze-account` | Soft-delete / deactivate account | Private (User, Admin) |

### Posts (`/post`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/post?page=1&size=5` | Get paginated posts with comments & replies | Public |
| `POST` | `/post` | Create a new post (text and/or attachments) | Private (User, Admin) |
| `PATCH` | `/post/:postId` | Update post content/attachments | Private (Author) |
| `PATCH` | `/post/:postId/freeze` | Soft-delete post | Private (Author) |
| `PATCH` | `/post/:postId/un-freeze`| Restore soft-deleted post | Private (Author) |
| `PATCH` | `/post/:postId/like?action=like` | Toggle like/unlike on a post | Private (User, Admin) |

### Comments & Replies (`/post/:postId/comment`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/post/:postId/comment` | Add top-level comment to post | Private (User, Admin) |
| `POST` | `/post/:postId/comment/:commentId/reply` | Reply to an existing comment | Private (User, Admin) |
| `PATCH` | `/post/:postId/comment/:commentId` | Update comment text/attachments | Private (Author) |
| `PATCH` | `/post/:postId/comment/:commentId/freeze` | Soft-delete comment | Author, Post Owner, Admin |
| `PATCH` | `/post/:postId/comment/:commentId/un-freeze` | Restore frozen comment | Author, Post Owner, Admin |

---

## ⚙️ Environment Configuration

Create a `.env.dev` configuration file in `SocialApp/src/config/`:

```env
# Application Settings
PORT=3000
APP_NAME=SocialApp
MODE=DEV

# Database
DB_URI=mongodb://127.0.0.1:27017/social_app

# Security & JWT Secrets
SALT_ROUND=10
USER_TOKEN_SIGNATURE=customUserSecretKey
ADMIN_TOKEN_SIGNATURE=customAdminSecretKey
USER_REFRESH_TOKEN_SIGNATURE=customUserRefreshSecretKey
ADMIN_REFRESH_TOKEN_SIGNATURE=customAdminRefreshSecretKey
BEARER_KEY=Bearer

# Cloudinary CDN
CLOUD_NAME=your_cloudinary_name
API_KEY=your_cloudinary_api_key
API_SECRET=your_cloudinary_api_secret

# Nodemailer / SMTP
EMAIL=your_email@gmail.com
EMAIL_PASSWORD=your_email_app_password

# Google OAuth
CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

---

## 🛠️ Verification & Build Check

To verify all modules syntax without starting the server, run:

```powershell
Get-ChildItem -Path "./SocialApp" -Filter "*.js" -Recurse | Where-Object { $_.FullName -notmatch "node_modules" } | ForEach-Object {
    node -c $_.FullName
}
```
*All 36 files pass with 0 syntax errors.*
