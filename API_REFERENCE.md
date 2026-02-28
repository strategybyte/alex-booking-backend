# API Reference — Division & Service Feature

Base URL: `https://alex.api.strategybyte.com.au/api/v1`

Auth header (private routes): `Authorization: Bearer <token>`

---

## Enums

| Enum | Values |
|------|--------|
| `DivisionType` | `ALLIED_HEALTH`, `LIFE_COACHING`, `COUNSELLING` |
| `SessionType` | `ONLINE`, `IN_PERSON` |
| `Gender` | `MALE`, `FEMALE`, `OTHER` |

---

## New Endpoints

### Divisions

#### `GET /divisions`
Get all divisions.

**Auth:** Public

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Divisions retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "type": "ALLIED_HEALTH",
      "description": "string | null",
      "is_active": true
    }
  ]
}
```

---

#### `GET /divisions/:divisionId`
Get a single division by ID.

**Auth:** Public

**Params:** `divisionId` — UUID

---

#### `POST /divisions`
Create a new division.

**Auth:** `SUPER_ADMIN`

**Body:**
```json
{
  "type": "ALLIED_HEALTH",        // required — DivisionType enum
  "description": "string",        // optional
  "is_active": true               // optional, default true
}
```

---

#### `PATCH /divisions/:divisionId`
Update a division.

**Auth:** `SUPER_ADMIN`

**Params:** `divisionId` — UUID

**Body:** _(all optional)_
```json
{
  "description": "string",
  "is_active": false
}
```

> Note: `type` cannot be changed after creation.

---

#### `DELETE /divisions/:divisionId`
Delete a division.

**Auth:** `SUPER_ADMIN`

**Params:** `divisionId` — UUID

---

### Services

#### `GET /services`
Get all services. Supports filtering.

**Auth:** Public

**Query params:** _(all optional)_

| Param | Type | Description |
|-------|------|-------------|
| `division_id` | UUID | Filter by division |
| `session_type` | `ONLINE` \| `IN_PERSON` | Filter by session type |
| `min_price` | number | Minimum base amount |
| `max_price` | number | Maximum base amount |
| `is_active` | `true` \| `false` | Filter by active status |

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Services retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "division_id": "uuid",
      "name": "string",
      "description": "string | null",
      "session_type": "ONLINE",
      "base_amount": 150.00,
      "currency": "AUD",
      "is_active": true
    }
  ]
}
```

---

#### `GET /services/:serviceId`
Get a single service by ID.

**Auth:** Public

**Params:** `serviceId` — UUID

---

#### `POST /services`
Create a new service.

**Auth:** `SUPER_ADMIN`

**Body:**
```json
{
  "division_id": "uuid",          // required
  "name": "string",               // required
  "description": "string",        // optional
  "session_type": "ONLINE",       // required — SessionType enum
  "base_amount": 150.00,          // required — positive number
  "currency": "AUD",              // optional — 3-char ISO code
  "is_active": true               // optional, default true
}
```

---

#### `PATCH /services/:serviceId`
Update a service.

**Auth:** `SUPER_ADMIN`

**Params:** `serviceId` — UUID

**Body:** _(all optional)_
```json
{
  "name": "string",
  "description": "string",
  "session_type": "IN_PERSON",
  "base_amount": 200.00,
  "currency": "AUD",
  "is_active": false
}
```

---

#### `DELETE /services/:serviceId`
Delete a service.

**Auth:** `SUPER_ADMIN`

**Params:** `serviceId` — UUID

---

### Counselor Division Management

#### `GET /users/counselors/:counselorId/divisions`
List all divisions assigned to a counselor.

**Auth:** `SUPER_ADMIN`

**Params:** `counselorId` — UUID

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "...",
  "data": [
    {
      "id": "uuid",
      "created_at": "ISO date",
      "division": {
        "id": "uuid",
        "type": "ALLIED_HEALTH",
        "description": "string | null",
        "is_active": true
      }
    }
  ]
}
```

---

#### `POST /users/counselors/:counselorId/divisions`
Assign a division to a counselor.

**Auth:** `SUPER_ADMIN`

**Params:** `counselorId` — UUID

**Body:**
```json
{
  "division_id": "uuid"   // required
}
```

---

#### `DELETE /users/counselors/:counselorId/divisions/:divisionId`
Remove a division from a counselor.

**Auth:** `SUPER_ADMIN`

**Params:** `counselorId` — UUID, `divisionId` — UUID

---

### Counselor Service Management

#### `GET /users/counselors/:counselorId/services`
List all services assigned to a counselor.

**Auth:** `SUPER_ADMIN`

**Params:** `counselorId` — UUID

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "...",
  "data": [
    {
      "id": "uuid",
      "created_at": "ISO date",
      "service": {
        "id": "uuid",
        "name": "string",
        "description": "string | null",
        "session_type": "ONLINE",
        "base_amount": 150.00,
        "currency": "AUD",
        "is_active": true,
        "division": {
          "id": "uuid",
          "type": "ALLIED_HEALTH"
        }
      }
    }
  ]
}
```

---

#### `POST /users/counselors/:counselorId/services`
Assign a service to a counselor.

**Auth:** `SUPER_ADMIN`

**Params:** `counselorId` — UUID

**Body:**
```json
{
  "service_id": "uuid"    // required
}
```

---

#### `DELETE /users/counselors/:counselorId/services/:serviceId`
Remove a service from a counselor.

**Auth:** `SUPER_ADMIN`

**Params:** `counselorId` — UUID, `serviceId` — UUID

---

## Modified Endpoints

### `GET /users/counselors/:counselorId`
Get full details of a single counselor.

**Auth:** `SUPER_ADMIN`

**Params:** `counselorId` — UUID

**Changes:** Response now includes `user_divisions` and `user_services` arrays.

**Response (additions highlighted):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Counselor retrieved successfully",
  "data": {
    "id": "uuid",
    "name": "string",
    "email": "string",
    "specialization": "string | null",
    "profile_picture": "string | null",
    "role": "COUNSELOR",
    "is_calendar_connected": false,
    "is_stripe_connected": false,
    "stripe_onboarding_complete": false,
    "stripe_charges_enabled": false,
    "stripe_payouts_enabled": false,
    "created_at": "ISO date",
    "updated_at": "ISO date",
    "counselor_settings": {
      "minimum_slots_per_day": 6,
      "approved_by_admin": false
    },
    "counsellor_balance": {
      "current_balance": "0.00",
      "total_earned": "0.00",
      "total_withdrawn": "0.00",
      "updated_at": "ISO date"
    },
    "user_divisions": [
      {
        "id": "uuid",
        "created_at": "ISO date",
        "division": {
          "id": "uuid",
          "type": "ALLIED_HEALTH",
          "description": "string | null",
          "is_active": true
        }
      }
    ],
    "user_services": [
      {
        "id": "uuid",
        "created_at": "ISO date",
        "service": {
          "id": "uuid",
          "name": "string",
          "description": "string | null",
          "session_type": "ONLINE",
          "base_amount": "150.00",
          "currency": "AUD",
          "is_active": true,
          "division": {
            "id": "uuid",
            "type": "ALLIED_HEALTH"
          }
        }
      }
    ],
    "appointments": [ "..." ],
    "payout_requests": [ "..." ],
    "balance_transactions": [ "..." ],
    "clients": [ "..." ],
    "appointment_stats": {
      "total": 0,
      "pending": 0,
      "confirmed": 0,
      "completed": 0,
      "cancelled": 0
    }
  }
}
```

---

### `GET /public-users/counselors`
Get public list of counselors.

**Auth:** Public

**New query params:**

| Param | Type | Description |
|-------|------|-------------|
| `service_id` | UUID | Filter counselors by assigned service |
| `division_id` | UUID | Filter counselors by assigned division |

---

### `POST /appointments`
Create a manual appointment (counselor/admin side).

**Auth:** `SUPER_ADMIN` or `COUNSELOR`

**New optional field in body:**
```json
{
  "firstName": "string",        // required
  "lastName": "string",         // required
  "email": "string",            // required
  "phone": "string",            // required
  "dateOfBirth": "string",      // required
  "gender": "MALE",             // required — Gender enum
  "sessionType": "ONLINE",      // required — SessionType enum
  "date": "string",             // required
  "timeSlotId": "uuid",         // required
  "notes": "string",            // optional
  "serviceId": "uuid"           // optional (NEW) — links appointment to a service
}
```

---

### `POST /appointments/with-payment`
Create a manual appointment with payment.

**Auth:** `SUPER_ADMIN` or `COUNSELOR`

**New optional field in body:**
```json
{
  "firstName": "string",        // required
  "lastName": "string",         // required
  "email": "string",            // required
  "phone": "string",            // required
  "dateOfBirth": "string",      // required
  "gender": "MALE",             // required
  "sessionType": "ONLINE",      // required
  "date": "string",             // required
  "timeSlotId": "uuid",         // required
  "amount": 150.00,             // required — payment amount
  "currency": "AUD",            // optional — 3-char ISO code
  "notes": "string",            // optional
  "serviceId": "uuid"           // optional (NEW) — links appointment to a service
}
```

---

### `POST /public-appointments`
Create an appointment from the public booking flow.

**Auth:** Public

**New optional field in body:**
```json
{
  "firstName": "string",        // required
  "lastName": "string",         // required
  "email": "string",            // required
  "phone": "string",            // required
  "dateOfBirth": "string",      // required
  "gender": "MALE",             // optional
  "sessionType": "ONLINE",      // required
  "date": "string",             // required
  "timeSlotId": "uuid",         // required
  "counselorId": "uuid",        // required
  "notes": "string",            // optional
  "serviceId": "uuid"           // optional (NEW) — links appointment to a service
}
```

---

### `POST /payments/create-intent`
Create a Stripe payment intent for an appointment.

**Auth:** Public (or as required by the booking flow)

**Body:**
```json
{
  "appointment_id": "uuid",     // required
  "amount": 150.00,             // optional — required only if appointment has no linked service
  "currency": "AUD"             // optional — 3-char ISO code, default AUD
}
```

**Changes:**
- `amount` is now **optional** when the appointment has a `serviceId` linked — the amount is derived automatically from the service's `base_amount`
- Stripe processing fee (2.9% + $0.30) is added on top of the service `base_amount` to calculate the total charge
- Payment record now stores `base_amount` and `stripe_fee_amount` when a service is linked

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Payment intent created successfully",
  "data": {
    "client_secret": "pi_xxx_secret_xxx",
    "payment_id": "uuid"
  }
}
```

---

## Payment Behaviour Changes

When a `serviceId` is provided on an appointment, the payment record will now store:

- `base_amount` — the service's configured base amount
- `stripe_fee_amount` — the calculated Stripe processing fee (2.9% + $0.30)

The total charged to the customer = `base_amount` + `stripe_fee_amount`.

These are populated automatically when `POST /payments/create-intent` is called for the appointment. If no service is linked, a manual `amount` must be passed in the request body.
