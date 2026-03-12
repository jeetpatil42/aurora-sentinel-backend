# Aurora Sentinel Backend

Node.js + Express backend API with WebSocket support.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Set up database:
- Use Supabase or PostgreSQL
- Run the SQL schema from `src/db/schema.sql`
- Run the beacon migration from `src/db/migrations/add_beacons.sql`

4. Run migrations:
```bash
npm run migrate
```

5. Start development server:
```bash
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/verify` - Verify OTP
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### SOS
- `POST /api/sos` - Create SOS event
- `GET /api/sos` - Get SOS events
- `GET /api/sos/:id` - Get SOS event by ID
- `PATCH /api/sos/:id/status` - Update SOS status

### Beacon Devices
- `POST /api/beacon/sos` - Create SOS event from an ESP32 beacon using `x-device-id` and `x-device-key`

### Presentation Mode
- `GET /api/presentation` - Get presentation mode status
- `POST /api/presentation/toggle` - Toggle presentation mode

## WebSocket Events

### Client -> Server
- `join_sos` - Join SOS room
- `leave_sos` - Leave SOS room
- `live_feed` - Send live feed data

### Server -> Client
- `new_sos_alert` - New SOS alert
- `sos_status_update` - SOS status update
- `live_feed` - Live feed data

## ESP32 Beacon Integration

Use a dedicated device route instead of the JWT-protected `/api/sos` user route.

Request:

```http
POST /api/beacon/sos
Content-Type: application/json
x-device-id: ESP32_BEACON_1
x-device-key: your-device-secret
```

```json
{
  "source": "beacon",
  "type": "manual_sos",
  "pressed_at": "2026-03-12T10:30:12Z",
  "battery_level": 87,
  "rssi": -64,
  "firmware_version": "1.0.0"
}
```

Before using the route, create a `beacons` row and store a bcrypt-hashed device key in `device_key_hash`. The beacon should also be assigned to a `users.id` value so the SOS event can be linked into the existing incident pipeline.
"# aurora-sentinel-backend" 
