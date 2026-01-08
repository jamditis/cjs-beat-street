# Chat Bubbles Feature Design Document

**Feature:** Attendee chat messages displayed above character avatars
**Status:** Proposed
**Created:** January 7, 2026

---

## Overview

Enable attendees to send short chat messages that appear as speech bubbles above their avatars as they move around the conference map. Messages are ephemeral (displayed for ~5 seconds) and zone-scoped, creating a fun social layer without persistent chat history.

### Goals

- **Social engagement:** Quick, lightweight communication between nearby attendees
- **Conference atmosphere:** Visual activity that makes the virtual space feel alive
- **Privacy-respecting:** Zone-based visibility, no persistent history
- **Performance-first:** Smooth animations without impacting map rendering

### Non-Goals

- Direct messaging / private chat (use existing conference tools)
- Message history or search
- Rich media (images, links, reactions)
- Moderation dashboard (Phase 2)

---

## Architecture

### Data Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  React UI       │     │  Firebase        │     │  Phaser Game    │
│  (ChatInput)    │     │  Firestore       │     │  (ChatBubble)   │
└────────┬────────┘     └────────┬─────────┘     └────────┬────────┘
         │                       │                        │
         │ sendMessage()         │                        │
         ├──────────────────────►│                        │
         │                       │                        │
         │                       │ onSnapshot listener    │
         │                       ├───────────────────────►│
         │                       │                        │
         │              eventBus.emit('chat-message')     │
         │◄──────────────────────┼────────────────────────┤
         │                       │                        │
         │                       │     ChatBubbleManager  │
         │                       │     creates bubble     │
         │                       │                        ▼
         │                       │              ┌─────────────────┐
         │                       │              │ ChatBubble      │
         │                       │              │ (5s display)    │
         │                       │              └─────────────────┘
```

### Component Responsibilities

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `ChatBubble` | `src/game/entities/` | Phaser visual entity (bubble + text + animations) |
| `ChatBubbleManager` | `src/game/systems/` | Lifecycle management, pooling, clustering |
| `chat.ts` | `src/services/` | Firestore operations, subscriptions |
| `useChat.ts` | `src/hooks/` | React hook for sending messages |
| `ChatInput.tsx` | `src/components/` | Message composition UI |

---

## Phaser Implementation

### ChatBubble Entity

Speech bubble rendered using Phaser Graphics + Text in a Container:

```typescript
// src/game/entities/ChatBubble.ts
export class ChatBubble extends Phaser.GameObjects.Container {
  private bubble: Phaser.GameObjects.Graphics;
  private textObject: Phaser.GameObjects.Text;
  private displayTimer: Phaser.Time.TimerEvent | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    config: ChatBubbleConfig = {}
  ) {
    super(scene, x, y);
    // Build bubble graphics, text, arrow pointer
    // Add fade-in animation
    // Set auto-dismiss timer
  }

  show(duration: number = 300): this {
    this.setAlpha(0);
    this.setScale(0.8);

    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      scale: 1,
      duration,
      ease: 'Back.easeOut'
    });
    return this;
  }

  dismiss(duration: number = 300): Promise<void> {
    return new Promise(resolve => {
      this.scene.tweens.add({
        targets: this,
        alpha: 0,
        y: this.y - 10,
        duration,
        ease: 'Power2',
        onComplete: () => {
          this.destroy();
          resolve();
        }
      });
    });
  }
}
```

### Visual Design

```
    ┌─────────────────────────┐
    │  Hello everyone! 👋    │  ← Cream background (#F5F0E6)
    │                         │    Ink text (#2C3E50)
    └──────────┬──────────────┘    Teal border (#2A9D8F)
               ▼                   12px corner radius
         (arrow pointer)           Max width: 200px
```

**Styling (CJS2026 brand):**
- Background: `#F5F0E6` (cream)
- Border: `#2A9D8F` (teal-600), 2px
- Text: `#2C3E50` (ink), Source Sans 3, 14px
- Padding: 8px horizontal, 6px vertical
- Corner radius: 12px
- Arrow: 10px tall, centered below bubble

### ChatBubbleManager

Manages active bubbles with object pooling for performance:

```typescript
// src/game/systems/ChatBubbleManager.ts
export class ChatBubbleManager {
  private scene: Phaser.Scene;
  private activeBubbles: Map<string, ChatBubble> = new Map();
  private pool: ChatBubble[] = [];
  private eventUnsubscribers: (() => void)[] = [];

  private config = {
    maxActiveBubbles: 15,
    displayDuration: 5000,      // 5 seconds
    fadeOutDuration: 300,
    poolSize: 20,
    baseDepth: 100,             // Above AttendeeMarkers (50)
    maxMessageLength: 100
  };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.initPool();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const unsubscribe = eventBus.on('chat-message-received',
      (data: ChatMessageEvent) => {
        this.showBubble(data);
      }
    );
    this.eventUnsubscribers.push(unsubscribe);
  }

  showBubble(data: ChatMessageEvent): void {
    // Get or create bubble from pool
    // Position above attendee marker
    // Set depth based on y-position (isometric sorting)
    // Start auto-dismiss timer
  }

  update(time: number): void {
    // Update bubble positions if following moving attendees
    // Clean up expired bubbles
  }

  destroy(): void {
    for (const unsubscribe of this.eventUnsubscribers) {
      unsubscribe();
    }
    this.activeBubbles.forEach(bubble => bubble.destroy());
    this.pool.forEach(bubble => bubble.destroy());
  }
}
```

### Depth Management

Bubbles use y-position-based depth for proper isometric layering:

```typescript
// Depth hierarchy
const DEPTH = {
  MAP_TILES: 0,
  POI_MARKERS: 10,
  ATTENDEE_MARKERS: 50,
  CHAT_BUBBLES: 100,      // Base depth for bubbles
  UI_OVERLAY: 200
};

// Dynamic depth within bubble layer
bubble.setDepth(DEPTH.CHAT_BUBBLES + bubble.y);
```

---

## Firebase Schema

### Collection: `chat_messages`

```typescript
interface ChatMessage {
  id: string;                 // Auto-generated document ID
  fromUid: string;            // Author's user ID
  displayName: string;        // Author's display name
  text: string;               // Message content (max 100 chars)
  zone: string;               // Zone identifier
  venueId: VenueId;           // Which venue
  mapId: string;              // 'outdoor' or venue ID
  position: {
    x: number;                // Avatar position when sent
    y: number;
  };
  createdAt: Timestamp;       // Server timestamp
  expiresAt: Timestamp;       // TTL field (createdAt + 2 minutes)
}
```

### TTL (Time-to-Live) Strategy

Firestore TTL policy auto-deletes documents after `expiresAt`:

```bash
# Enable TTL on expiresAt field
gcloud firestore fields ttls update expiresAt \
  --collection-group=chat_messages \
  --enable-ttl
```

**Note:** Firestore TTL deletion happens within 24 hours, not instantly. Client-side filtering handles immediate expiration for display purposes.

### Composite Index

Add to `firestore.indexes.json`:

```json
{
  "collectionGroup": "chat_messages",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "zone", "order": "ASCENDING" },
    { "fieldPath": "venueId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

### Security Rules

Add to `firestore.rules`:

```javascript
// Chat messages - ephemeral zone-based chat
match /chat_messages/{messageId} {
  // Read: Authenticated users can read recent messages
  allow read: if isAuthenticated();

  // Create: Verified attendees with rate limiting
  allow create: if isAuthenticated()
                && isVerifiedAttendee()
                && request.resource.data.fromUid == request.auth.uid
                && request.resource.data.text is string
                && request.resource.data.text.size() >= 1
                && request.resource.data.text.size() <= 100
                && request.resource.data.createdAt == request.time
                && request.resource.data.expiresAt == request.time + duration.value(2, 'm');

  // No updates or deletes from clients
  allow update, delete: if false;
}

// Rate limiting tracker
match /chat_rate_limit/{oderId} {
  allow read, write: if request.auth.uid == userId
                     && request.resource.data.lastMessageAt == request.time;
}
```

---

## React Integration

### useChat Hook

```typescript
// src/hooks/useChat.ts
export interface UseChatOptions {
  zone: string;
  venueId: VenueId;
  mapId: string;
  enabled?: boolean;
}

export function useChat(options: UseChatOptions) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Subscribe to zone messages
  useEffect(() => {
    if (!options.enabled) return;

    const unsubscribe = subscribeToZoneChat({
      zone: options.zone,
      venueId: options.venueId,
      mapId: options.mapId,
      onMessage: (message) => {
        eventBus.emit('chat-message-received', message);
      },
      onError: setError
    });

    return unsubscribe;
  }, [options.zone, options.venueId, options.mapId, options.enabled]);

  const sendMessage = useCallback(async (text: string, position: {x: number, y: number}) => {
    // Validate
    const validation = validateChatMessage(text);
    if (!validation.isValid) {
      setError(validation.error);
      return false;
    }

    setIsSending(true);
    try {
      await sendChatMessage({
        text,
        zone: options.zone,
        venueId: options.venueId,
        mapId: options.mapId,
        position
      });
      return true;
    } catch (err) {
      setError('Failed to send message');
      return false;
    } finally {
      setIsSending(false);
    }
  }, [options]);

  return { sendMessage, isSending, error, isOnline };
}
```

### ChatInput Component

Minimal floating input that appears when user taps chat button:

```typescript
// src/components/ChatInput.tsx
export function ChatInput({ onSend, onClose }: ChatInputProps) {
  const [text, setText] = useState('');
  const maxLength = 100;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSend(text.trim());
      setText('');
      onClose();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="chat-input-container">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, maxLength))}
        placeholder="Say something..."
        maxLength={maxLength}
        autoFocus
      />
      <span className="char-count">{text.length}/{maxLength}</span>
      <button type="submit" disabled={!text.trim()}>Send</button>
    </form>
  );
}
```

---

## EventBus Events

Add to `GameEvents` interface in `src/lib/EventBus.ts`:

```typescript
interface GameEvents {
  // ... existing events ...

  // Chat events
  'chat-message-sent': {
    text: string;
    position: { x: number; y: number };
  };
  'chat-message-received': {
    messageId: string;
    fromUid: string;
    displayName: string;
    text: string;
    position: { x: number; y: number };
    createdAt: number;
  };
  'chat-bubble-dismissed': {
    messageId: string;
  };
  'chat-input-open': void;
  'chat-input-close': void;
}
```

---

## Moderation

### Client-Side Filtering

Use lightweight profanity filter before sending:

```typescript
// src/utils/chatValidation.ts
import { Profanity } from 'no-profanity';

const profanity = new Profanity();

export function validateChatMessage(text: string): {
  isValid: boolean;
  error?: string;
} {
  if (text.length === 0 || text.length > 100) {
    return { isValid: false, error: 'Message must be 1-100 characters' };
  }

  if (profanity.exists(text)) {
    return { isValid: false, error: 'Please keep messages friendly' };
  }

  // Block URLs
  if (/https?:\/\//i.test(text)) {
    return { isValid: false, error: 'Links are not allowed' };
  }

  return { isValid: true };
}
```

### Rate Limiting

- **Client-side:** Disable send button for 3 seconds after sending
- **Server-side:** Security rules check `chat_rate_limit/{uid}` document

### Future: Reporting System (Phase 2)

```typescript
// Cloud Function for user reports
export async function reportMessage(messageId: string, reason: string) {
  await updateDoc(doc(db, 'chat_messages', messageId), {
    'metadata.reportCount': increment(1),
    'metadata.lastReportReason': reason
  });
}

// Auto-hide after 3 reports (Cloud Function trigger)
```

---

## Performance Considerations

### Object Pooling

Pre-create 20 bubble containers to avoid runtime allocation:

```typescript
private initPool(): void {
  for (let i = 0; i < this.config.poolSize; i++) {
    const bubble = new ChatBubble(this.scene, 0, 0, '');
    bubble.setActive(false);
    bubble.setVisible(false);
    this.pool.push(bubble);
  }
}

private getBubbleFromPool(): ChatBubble {
  const bubble = this.pool.find(b => !b.active);
  if (bubble) return bubble;

  // Pool exhausted, create new (rare)
  const newBubble = new ChatBubble(this.scene, 0, 0, '');
  this.pool.push(newBubble);
  return newBubble;
}
```

### Query Optimization

- Query only messages from last 60 seconds
- Limit to 50 messages per query
- Filter by current zone + venue
- Use composite index for efficient queries

### Memory Management

- Max 15 active bubbles on screen
- Older bubbles dismissed when limit reached
- Proper cleanup in `destroy()` method

---

## Implementation Checklist

### Phase 1: Core Implementation

- [ ] Create `src/types/chat.ts` with TypeScript interfaces
- [ ] Add chat events to `src/lib/EventBus.ts`
- [ ] Implement `src/game/entities/ChatBubble.ts`
- [ ] Implement `src/game/systems/ChatBubbleManager.ts`
- [ ] Create `src/services/chat.ts` for Firestore operations
- [ ] Add security rules to `firestore.rules`
- [ ] Add composite index to `firestore.indexes.json`
- [ ] Create `src/hooks/useChat.ts`
- [ ] Create `src/components/ChatInput.tsx`
- [ ] Integrate ChatBubbleManager into game scenes
- [ ] Add chat button to UI controls
- [ ] Deploy Firestore rules and indexes

### Phase 2: Polish & Moderation

- [ ] Add profanity filter (`no-profanity` package)
- [ ] Implement rate limiting
- [ ] Add user reporting Cloud Function
- [ ] Auto-moderate reported messages
- [ ] Add "mute user" feature
- [ ] Accessibility: screen reader announcements

### Phase 3: Enhancements

- [ ] Emoji picker
- [ ] Quick reactions (thumbs up, wave, etc.)
- [ ] Proximity-based visibility (only see nearby)
- [ ] Message history panel (last 5 minutes)

---

## Cost Estimate

Based on 500 concurrent attendees during peak conference hours:

| Operation | Daily Volume | Cost |
|-----------|-------------|------|
| Writes (messages) | ~5,000 | $0.07 |
| Reads (listeners) | ~25,000 | $0.09 |
| Deletes (TTL) | ~5,000 | $0.03 |
| **Total** | | **~$0.19/day** |

**Conference total (2 days):** ~$0.40

---

## Open Questions

1. **Should bubbles follow moving avatars?** Current design: fixed position where sent. Alternative: bubble follows avatar for duration.

2. **Zone vs proximity visibility?** Current design: all messages in zone visible. Alternative: only show messages from attendees within X pixels.

3. **Anonymous mode?** Allow sending without showing name? (Privacy vs accountability tradeoff)

4. **Persistence for late joiners?** Show messages from last 30 seconds when entering a zone?

---

## References

- [Phaser Speech Bubble Example](https://phaser.io/examples/v3.85.0/game-objects/text/view/speech-bubble)
- [Firestore TTL Documentation](https://firebase.google.com/docs/firestore/ttl)
- [Firestore Rate Limiting](https://fireship.io/lessons/how-to-rate-limit-writes-firestore/)
- [Phaser Object Pooling](https://blog.ourcade.co/posts/2020/phaser-3-optimization-object-pool-basic/)
