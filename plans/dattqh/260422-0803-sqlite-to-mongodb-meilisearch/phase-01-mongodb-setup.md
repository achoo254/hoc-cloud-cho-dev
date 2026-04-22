# Phase 1: MongoDB Setup

**Priority:** P0 (blocking)  
**Status:** completed  
**Effort:** 2-3 hours

## Overview

Install Mongoose, create connection singleton, define all 4 models with embedded documents.

## Context Links

- [Brainstorm Report](../reports/brainstorm-260422-0803-sqlite-to-mongodb-meilisearch.md)
- Current SQLite client: `server/db/sqlite-client.js`

## Requirements

### Functional
- Mongoose connection with retry logic
- 4 models: Lab, User, Session, Progress
- Indexes for unique constraints and queries

### Non-functional
- Connection pooling (default 100)
- Graceful disconnect on shutdown
- Error logging

## Implementation Steps

### 1. Install dependencies

```bash
npm install mongoose
```

### 2. Create `server/db/mongo-client.js`

```javascript
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hoc_cloud_cho_dev_db';

// [RED TEAM] Removed isConnected flag - use mongoose.connection.readyState instead

export async function connectMongo(retries = 3) {
  if (mongoose.connection.readyState === 1) return;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(MONGODB_URI, {
        maxPoolSize: 100,
        serverSelectionTimeoutMS: 5000,
      });
      console.log('[mongo] Connected to MongoDB');
      return;
    } catch (err) {
      console.error(`[mongo] Connection attempt ${attempt}/${retries} failed:`, err.message);
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 1000 * attempt)); // exponential backoff
    }
  }
}

export async function disconnectMongo() {
  if (mongoose.connection.readyState === 0) return;
  await mongoose.disconnect();
  console.log('[mongo] Disconnected');
}

export function getMongoStatus() {
  return {
    connected: mongoose.connection.readyState === 1,
    host: mongoose.connection.host,
    name: mongoose.connection.name,
  };
}

export default mongoose;
```

### 3. Create `server/db/models/lab-model.js`

```javascript
import mongoose from 'mongoose';

const { Schema } = mongoose;

const tldrItemSchema = new Schema({
  term: { type: String, required: true },
  definition: { type: String, required: true },
}, { _id: false });

const quizItemSchema = new Schema({
  question: { type: String, required: true },
  answers: [String],
  correctIndex: Number,
  explanation: String,
}, { _id: false });

const flashcardSchema = new Schema({
  front: String,
  back: String,
}, { _id: false });

const tryAtHomeSchema = new Schema({
  command: String,
  description: String,
}, { _id: false });

const labSchema = new Schema({
  slug: { type: String, unique: true, required: true, index: true },
  module: { type: String, index: true },
  title: { type: String, required: true },
  filePath: String,
  estimatedMinutes: Number,
  tldr: [tldrItemSchema],
  walkthrough: [Schema.Types.Mixed],
  quiz: [quizItemSchema],
  flashcards: [flashcardSchema],
  tryAtHome: [tryAtHomeSchema],
  contentHash: String,
}, { timestamps: true });

export const Lab = mongoose.model('Lab', labSchema);
```

### 4. Create `server/db/models/user-model.js`

```javascript
import mongoose from 'mongoose';

const { Schema } = mongoose;

const userSchema = new Schema({
  firebaseUid: { type: String, unique: true, sparse: true, index: true },
  email: String,
  displayName: String,
  photoUrl: String,
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } });

export const User = mongoose.model('User', userSchema);
```

### 5. Create `server/db/models/session-model.js`

```javascript
import mongoose from 'mongoose';

const { Schema } = mongoose;

const sessionSchema = new Schema({
  tokenHash: { type: String, unique: true, required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  expiresAt: { type: Date, required: true, index: true },
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } });

// TTL index: auto-delete expired sessions
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Session = mongoose.model('Session', sessionSchema);
```

### 6. Create `server/db/models/progress-model.js`

```javascript
import mongoose from 'mongoose';

const { Schema } = mongoose;

const progressSchema = new Schema({
  userUuid: { type: String, index: true },
  labSlug: { type: String, required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  openedAt: Date,
  completedAt: Date,
  quizScore: { type: Number, min: 0, max: 100 },
}, { timestamps: { createdAt: false, updatedAt: 'lastUpdated' } });

// Compound unique indexes for upsert (sparse to handle null values)
progressSchema.index({ userUuid: 1, labSlug: 1 }, { unique: true, sparse: true });
// [RED TEAM] Added unique index for authenticated users to prevent duplicates
progressSchema.index({ userId: 1, labSlug: 1 }, { unique: true, sparse: true });

export const Progress = mongoose.model('Progress', progressSchema);
```

### 7. Create `server/db/models/index.js`

```javascript
export { Lab } from './lab-model.js';
export { User } from './user-model.js';
export { Session } from './session-model.js';
export { Progress } from './progress-model.js';
```

## Todo List

- [x] `npm install mongoose`
- [x] Create `server/db/mongo-client.js`
- [x] Create `server/db/models/lab-model.js`
- [x] Create `server/db/models/user-model.js`
- [x] Create `server/db/models/session-model.js`
- [x] Create `server/db/models/progress-model.js`
- [x] Create `server/db/models/index.js`
- [x] Test connection locally

## Success Criteria

- `connectMongo()` succeeds with valid URI
- All 4 models can be imported without error
- Indexes created on first connection

## Next Steps

→ Phase 2: Meilisearch Setup
