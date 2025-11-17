# SERVER-SIDE CRASH LOGGING - Applied

## Problem
- Crashes that bypass JavaScript error handlers (browser tab crashes, memory exhaustion) weren't being logged
- No way to track progress if browser crashes during long-running operations (hours)
- localStorage can fill up or be cleared

## Solution
1. **Server-side crash log endpoint** - `/api/crash-logs` saves logs to server
2. **Progress checkpoint endpoint** - `/api/progress-checkpoint` saves progress every 10%
3. **Batched logging** - Reduces server load, batches ERROR/CRITICAL logs
4. **Session tracking** - Each run has a unique session ID

## What's Added

### Backend (`server.js`)
- `POST /api/crash-logs` - Receives and logs crash logs server-side
- `POST /api/progress-checkpoint` - Receives progress updates

### Frontend (`index.js`)
- `window.saveProgressCheckpoint()` - Saves progress to server
- Batched server logging for ERROR/CRITICAL logs
- Session ID tracking

### Pipeline (`PipelineOrchestrator.js`)
- Progress checkpoints saved every 10%
- Final checkpoint on completion

## How It Works

1. **Crash Logs**: ERROR and CRITICAL logs are batched and sent to server every 5 seconds or when batch size (10) is reached
2. **Progress Checkpoints**: Saved every 10% progress increment
3. **Session ID**: Unique ID per browser session for tracking

## Viewing Logs

### Server Console
Check backend terminal - you'll see:
```
[CRASH LOG] Received X logs from session session-1234567890-abc123
[PROGRESS] cost: 50% - running (session: session-1234567890-abc123)
```

### Browser Console
```javascript
// View session ID
window.sessionId

// View local logs
JSON.parse(localStorage.getItem('crashLogs'))
```

## Benefits

1. **Survives browser crashes** - Logs saved to server before crash
2. **Progress tracking** - Know where it failed even if browser dies
3. **Session tracking** - Track multiple runs
4. **Reduced load** - Only ERROR/CRITICAL sent to server, batched

## Next Steps (Production)

For production, you should:
1. Save logs to file or database instead of console
2. Add log rotation
3. Add authentication for log endpoints
4. Add log retention policy

## Testing

After refresh, check backend console - you should see progress updates as pipeline runs.
