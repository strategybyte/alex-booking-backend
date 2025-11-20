# Manual Appointment Creation API

## Endpoint

```
POST /api/appointments
```

## Scope (Who can use this API)

- **COUNSELOR** - Can create appointments for their own clients
- **SUPER_ADMIN** - Can create appointments for any counselor

## Authentication Required

Yes - Bearer token required in Authorization header

## Request Headers

```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

## Request Body (JSON)

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "+1234567890",
  "dateOfBirth": "1990-01-15",
  "gender": "MALE",
  "sessionType": "ONLINE",
  "date": "2025-12-15",
  "timeSlotId": "your-time-slot-uuid-here",
  "notes": "Client needs help with anxiety management"
}
```

## Notes

- This endpoint creates appointments with **CONFIRMED** status immediately
- No payment required - ideal for in-person sessions or pre-paid arrangements
- Sends instant confirmation email to client with meeting details
- For appointments requiring payment, use the `/api/appointments/with-payment` endpoint instead

---

# Manual Appointment Creation with Payment Link API (NEW)

## Endpoint

```
POST /api/appointments/with-payment
```

## Scope (Who can use this API)

- **COUNSELOR** - Can create appointments for their own clients
- **SUPER_ADMIN** - Can create appointments for any counselor

## Authentication Required

Yes - Bearer token required in Authorization header

## Request Headers

```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

## Request Body (JSON)

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "+1234567890",
  "dateOfBirth": "1990-01-15",
  "gender": "MALE",
  "sessionType": "ONLINE",
  "date": "2025-12-15",
  "timeSlotId": "your-time-slot-uuid-here",
  "notes": "Client needs help with anxiety management",
  "amount": 150.00,
  "currency": "AUD"
}
```

## Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| firstName | string | Yes | Client's first name |
| lastName | string | Yes | Client's last name |
| email | string | Yes | Client's email (must be valid email format) |
| phone | string | Yes | Client's phone number |
| dateOfBirth | string | Yes | Client's date of birth (YYYY-MM-DD or ISO format) |
| gender | enum | Yes | One of: MALE, FEMALE, OTHER |
| sessionType | enum | Yes | One of: ONLINE, IN_PERSON |
| date | string | Yes | Appointment date (YYYY-MM-DD) |
| timeSlotId | string | Yes | UUID of available time slot |
| notes | string | No | Optional notes about the appointment |
| **amount** | number | **Yes** | Payment amount (e.g., 150.00) |
| **currency** | string | No | Currency code (default: AUD, must be 3 characters) |

## Response (Success - 201 Created)

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Appointment created successfully. Payment link sent to client via email.",
  "data": {
    "id": "appointment-uuid",
    "client_id": "client-uuid",
    "counselor_id": "counselor-uuid",
    "time_slot_id": "timeslot-uuid",
    "session_type": "ONLINE",
    "date": "2025-12-15T00:00:00.000Z",
    "notes": "Client needs help with anxiety management",
    "status": "PENDING",
    "payment_token": "abc123xyz789...",
    "payment_token_expiry": "2025-12-16T12:00:00.000Z",
    "created_at": "2025-12-15T12:00:00.000Z",
    "updated_at": "2025-12-15T12:00:00.000Z",
    "paymentToken": "abc123xyz789...",
    "paymentLink": "https://yourfrontend.com/pay?token=abc123xyz789..."
  }
}
```

## How It Works

1. **Staff creates appointment** via this endpoint with payment details
2. **System creates appointment** with status `PENDING` (not confirmed yet)
3. **Time slot marked as `PROCESSING`** (reserved but not booked)
4. **Payment token generated** (unique, secure, 24-hour expiry)
5. **Email sent to client** with payment link: `yourfrontend.com/pay?token=xyz123`
6. **Client clicks link** and completes payment
7. **Payment webhook triggers** and updates appointment to `CONFIRMED`
8. **Time slot updated to `BOOKED`**
9. **Confirmation email sent** with meeting details

## Response (Error - 422 Unprocessable Entity)

```json
{
  "success": false,
  "message": "Time slot is not available",
  "errorMessages": [
    {
      "path": "",
      "message": "Time slot is not available"
    }
  ],
  "stack": null
}
```

## Testing Tips

1. Use this endpoint for **online appointments requiring payment**
2. Use regular `/api/appointments` for **instant confirmation** (no payment)
3. Payment link expires in **24 hours**
4. Client receives email with big green "Complete Payment Now" button
5. Frontend should handle `/pay?token=xyz` route
6. Token is single-use and secure

---

# Get Appointment Details by Payment Token API (PUBLIC - NEW)

## Endpoint

```
GET /api/public/appointments/by-token?token=abc123xyz789
```

## Scope (Who can use this API)

- **PUBLIC** - No authentication required
- Anyone with valid payment token can access

## Authentication Required

**No** - This is a public endpoint for payment page

## Request Headers

```
Content-Type: application/json
```

## Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| token | string | Yes | Payment token from email link (min 10 characters) |

## Example Request

```
GET {baseUrl}/api/public/appointments/by-token?token=abc123xyz789defg
```

## Response (Success - 200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Appointment details retrieved successfully",
  "data": {
    "id": "appointment-uuid",
    "client_id": "client-uuid",
    "counselor_id": "counselor-uuid",
    "time_slot_id": "timeslot-uuid",
    "session_type": "ONLINE",
    "date": "2025-12-15T00:00:00.000Z",
    "notes": "Client needs help with anxiety management",
    "status": "PENDING",
    "payment_token": "abc123xyz789...",
    "payment_token_expiry": "2025-12-16T12:00:00.000Z",
    "created_at": "2025-12-15T12:00:00.000Z",
    "updated_at": "2025-12-15T12:00:00.000Z",
    "client": {
      "first_name": "John",
      "last_name": "Doe",
      "email": "john.doe@example.com",
      "phone": "+1234567890"
    },
    "counselor": {
      "name": "Dr. Sarah Smith",
      "email": "sarah.smith@example.com",
      "specialization": "Clinical Psychology"
    },
    "time_slot": {
      "start_time": "10:00 AM",
      "end_time": "11:00 AM"
    },
    "payment": null
  }
}
```

## Response (Error - 404 Not Found)

```json
{
  "success": false,
  "message": "Appointment not found or invalid token",
  "errorMessages": [
    {
      "path": "",
      "message": "Appointment not found or invalid token"
    }
  ],
  "stack": null
}
```

## Response (Error - 400 Bad Request - Expired Token)

```json
{
  "success": false,
  "message": "Payment link has expired. Please contact support.",
  "errorMessages": [
    {
      "path": "",
      "message": "Payment link has expired. Please contact support."
    }
  ],
  "stack": null
}
```

## Response (Error - 400 Bad Request - Already Paid)

```json
{
  "success": false,
  "message": "This appointment has already been paid for.",
  "errorMessages": [
    {
      "path": "",
      "message": "This appointment has already been paid for."
    }
  ],
  "stack": null
}
```

## Frontend Implementation Guide

### Payment Page Flow

```javascript
// 1. Extract token from URL
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

// 2. Fetch appointment details
const response = await fetch(`/api/public/appointments/by-token?token=${token}`);
const data = await response.json();

if (!response.ok) {
  // Handle errors (expired, invalid, already paid)
  showError(data.message);
  return;
}

// 3. Display appointment summary (read-only)
const appointment = data.data;
displayAppointmentSummary({
  counselorName: appointment.counselor.name,
  date: formatDate(appointment.date),
  time: `${appointment.time_slot.start_time} - ${appointment.time_slot.end_time}`,
  sessionType: appointment.session_type,
});

// 4. Create payment intent using existing payment endpoint
const paymentResponse = await fetch('/api/payment/create-intent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    appointment_id: appointment.id,
    amount: 150.00, // Get from somewhere or hardcode
    currency: 'AUD'
  })
});

const { client_secret } = await paymentResponse.json();

// 5. Show Stripe payment form
const stripe = Stripe('your_publishable_key');
const elements = stripe.elements({ clientSecret: client_secret });
const paymentElement = elements.create('payment');
paymentElement.mount('#payment-element');

// 6. Handle payment submission
const handleSubmit = async (e) => {
  e.preventDefault();
  const { error } = await stripe.confirmPayment({
    elements,
    confirmParams: {
      return_url: 'https://yourfrontend.com/payment-success',
    },
  });

  if (error) {
    showError(error.message);
  }
};
```

### Payment Page UI Components

1. **Appointment Summary Card** (Read-only)
   - Counselor name & specialization
   - Date & time
   - Session type
   - Client name

2. **Payment Amount Display**
   - Large, prominent amount
   - Currency code

3. **Stripe Payment Element**
   - Card input fields
   - Billing details
   - Submit button

4. **Security Indicators**
   - "Secure payment" badge
   - Stripe logo
   - SSL indicator

### Error Handling

```javascript
const errorMessages = {
  'Payment link has expired': {
    title: 'Link Expired',
    message: 'This payment link has expired. Please contact us to receive a new link.',
    action: 'Contact Support'
  },
  'Appointment not found': {
    title: 'Invalid Link',
    message: 'This payment link is invalid or has been used.',
    action: 'Go Home'
  },
  'already been paid': {
    title: 'Already Paid',
    message: 'This appointment has already been paid for. Check your email for confirmation.',
    action: 'Go Home'
  }
};
```

## Testing Tips

1. **Token Validation**: Test with invalid, expired, and valid tokens
2. **Payment Flow**: Complete end-to-end payment after fetching details
3. **Error States**: Test all error scenarios (expired, already paid, invalid)
4. **UI/UX**: Show loading states, clear error messages
5. **Mobile**: Ensure payment form works on mobile devices
6. **Security**: Never store tokens in localStorage

---

# Set minimum to 10 slots per day

```
PATCH {baseUrl}/api/v1/users/counselors/38ecce2d-3d81-4c18-b2bd-faf6b4da7b0b/settings

Headers:
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

Body (raw JSON):
{
  "minimum_slots_per_day": 10 #input
}
```

## How This Affects Slot Creation/Deletion

### When Creating Slots:

- System validates that counselor provides at least the minimum number of slots per day
- If counselor tries to create 5 slots but minimum is 10, request will fail

### When Deleting Slots:

- System checks if deletion would bring total slots below minimum
- Example: If minimum is 6 and calendar has 6 slots, cannot delete any
- Error message shows current count and minimum requirement

## Testing Tips

1. You must be logged in as SUPER_ADMIN to use this endpoint
2. The counselorId in the URL must be a valid UUID
3. minimum_slots_per_day must be a number between 1 and 50
4. Default value is 6 when counselor is first created
5. Each counselor can have different minimum requirements

# Dashbaord

GET /api/v1/dashboard/?date=2025-11-04
(if prev and next days user wants to dy defulat current date)

### As Super Admin [Response]

```
{
    "statusCode": 200,
    "success": true,
    "message": "Dashboard data retrieved successfully",
    "data": {
        "date": "2025-11-04",
        "counselors": [
            {
                "counselor": {
                    "id": "4bd6f388-3de8-40fc-a0b4-10af98947bc5",
                    "name": "Dr. Tausif Mahmud",
                    "email": "tausif.mahmud@example.com",
                    "specialization": "Clinical Psychology",
                    "profilePicture": null
                },
                "bookingCount": 0,
                "appointments": []
            },
            {
                "counselor": {
                    "id": "e9377906-33dc-440c-8890-8d0d5ccef61c",
                    "name": "Md Sakibul Islam ",
                    "email": "sakibxrz21@gmail.com",
                    "specialization": null,
                    "profilePicture": null
                },
                "bookingCount": 0,
                "appointments": []
            },
            {
                "counselor": {
                    "id": "6fd7d4e9-440d-45c5-bd39-c9fc251d60d9",
                    "name": "Tanvirul Hasan",
                    "email": "tanvirulaml@gmail.com",
                    "specialization": "Mental Health Specialist",
                    "profilePicture": "https://syd1.digitaloceanspaces.com/alexrodriguez/profile-pictures/79f4f54d-b13c-40f4-8875-d12064eeaf3d.jpg"
                },
                "bookingCount": 0,
                "appointments": []
            },
            {
                "counselor": {
                    "id": "38ecce2d-3d81-4c18-b2bd-faf6b4da7b0b",
                    "name": "Tanvirul Hasan Arafat",
                    "email": "tanvirul.hasan342@gmail.com",
                    "specialization": "Mental Health Specialist\n",
                    "profilePicture": null
                },
                "bookingCount": 0,
                "appointments": []
            },
            {
                "counselor": {
                    "id": "f671bcbe-a45b-4b3e-b363-1f333bdecb91",
                    "name": "Tausif  Daam Cool",
                    "email": "tmahmud44@gmail.com",
                    "specialization": "Clinical Psychology",
                    "profilePicture": null
                },
                "bookingCount": 0,
                "appointments": []
            }
        ],
        "topCounselor": null,
        "statistics": {
            "totalAppointments": 0,
            "totalCounselors": 5,
            "counselorsWithBookings": 0,
            "byStatus": {
                "pending": 0,
                "confirmed": 0,
                "completed": 0,
                "cancelled": 0
            },
            "bySessionType": {
                "online": 0,
                "inPerson": 0
            }
        }
    }
}

```

# As Counselor

```

{
    "statusCode": 200,
    "success": true,
    "message": "Dashboard data retrieved successfully",
    "data": {
        "date": "2025-11-04",
        "appointments": [],
        "statistics": {
            "totalAppointments": 0,
            "byStatus": {
                "pending": 0,
                "confirmed": 0,
                "completed": 0,
                "cancelled": 0
            },
            "bySessionType": {
                "online": 0,
                "inPerson": 0
            }
        }
    }
}

```

# Get All Users API

## Endpoint

```
GET /api/v1/users/all-users
```

## Scope (Who can use this API)

- **SUPER_ADMIN** - Only super admin can access this endpoint

## Authentication Required

Yes - Bearer token required in Authorization header

## Request Headers

```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

## Query Parameters (Optional)

- `search` - Search by name or email (string)
- `page` - Page number for pagination (number, default: 1)
- `limit` - Number of items per page (number, default: 10)
- `sort_by` - Sort field: name, email, or created_at (string, default: created_at)
- `sort_order` - Sort order: asc or desc (string, default: desc)

## Example Request

```
GET {baseUrl}/api/v1/users/all-users?page=1&limit=10&search=john&sort_by=name&sort_order=asc

Headers:
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Response (Success - 200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Users retrieved successfully",
  "data": [
    {
      "id": "38ecce2d-3d81-4c18-b2bd-faf6b4da7b0b",
      "name": "Tanvirul Hasan Arafat",
      "email": "tanvirul.hasan342@gmail.com",
      "specialization": "Mental Health Specialist",
      "profile_picture": null,
      "role": "COUNSELOR",
      "created_at": "2025-11-01T10:30:00.000Z",
      "updated_at": "2025-11-01T10:30:00.000Z"
    },
    {
      "id": "f671bcbe-a45b-4b3e-b363-1f333bdecb91",
      "name": "Admin User",
      "email": "admin@example.com",
      "specialization": null,
      "profile_picture": null,
      "role": "SUPER_ADMIN",
      "created_at": "2025-11-01T09:00:00.000Z",
      "updated_at": "2025-11-01T09:00:00.000Z"
    }
  ],
  "meta": {
    "total": 15,
    "page": 1,
    "limit": 10
  }
}
```

## Response (Error - 403 Forbidden)

If user is not SUPER_ADMIN:

```json
{
  "success": false,
  "message": "You don't have permission to access this route",
  "errorMessages": [
    {
      "path": "",
      "message": "You don't have permission to access this route"
    }
  ],
  "stack": null
}
```

## Response (Error - 401 Unauthorized)

If token is invalid or missing:

```json
{
  "success": false,
  "message": "You're not authorized to access this route",
  "errorMessages": [
    {
      "path": "",
      "message": "You're not authorized to access this route"
    }
  ],
  "stack": null
}
```

## Testing Tips

1. You must be logged in as SUPER_ADMIN to use this endpoint
2. Returns both SUPER_ADMIN and COUNSELOR role users
3. Only returns users where `is_deleted: false`
4. Includes profile picture URL if available
5. Search is case-insensitive and searches in both name and email fields
6. Default pagination: page=1, limit=10
7. Default sorting: by created_at in descending order (newest first)

# Update Counselor API

## Endpoint

```
PATCH /api/v1/users/counselors/:counselorId
```

## Scope (Who can use this API)

- **SUPER_ADMIN** - Only super admin can update counselor information

## Authentication Required

Yes - Bearer token required in Authorization header

## Request Headers

```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

## URL Parameters

- `counselorId` - UUID of the counselor to update (required)

## Request Body (JSON)

You can pass one or both fields:

### Update only name:
```json
{
  "name": "Dr. John Smith"
}
```

### Update only specialization:
```json
{
  "specialization": "Clinical Psychology & Trauma Therapy"
}
```

### Update both fields:
```json
{
  "name": "Dr. John Smith",
  "specialization": "Clinical Psychology & Trauma Therapy"
}
```

## Field Validation

- `name` (optional) - Must be a non-empty string
- `specialization` (optional) - Must be a non-empty string
- **At least one field must be provided** in the request body

## Example Request

```
PATCH {baseUrl}/api/v1/users/counselors/38ecce2d-3d81-4c18-b2bd-faf6b4da7b0b

Headers:
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

Body (raw JSON):
{
  "name": "Dr. Jane Anderson",
  "specialization": "Child Psychology & Behavioral Therapy"
}
```

## Response (Success - 200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Counselor updated successfully",
  "data": {
    "id": "38ecce2d-3d81-4c18-b2bd-faf6b4da7b0b",
    "name": "Dr. Jane Anderson",
    "email": "tanvirul.hasan342@gmail.com",
    "specialization": "Child Psychology & Behavioral Therapy",
    "profile_picture": null,
    "role": "COUNSELOR",
    "created_at": "2025-11-01T10:30:00.000Z",
    "updated_at": "2025-11-19T14:25:00.000Z"
  }
}
```

## Response (Error - 404 Not Found)

If counselor doesn't exist:

```json
{
  "success": false,
  "message": "Counselor not found",
  "errorMessages": [
    {
      "path": "",
      "message": "Counselor not found"
    }
  ],
  "stack": null
}
```

## Response (Error - 400 Bad Request)

If user is not a counselor:

```json
{
  "success": false,
  "message": "User is not a counselor",
  "errorMessages": [
    {
      "path": "",
      "message": "User is not a counselor"
    }
  ],
  "stack": null
}
```

## Response (Error - 400 Bad Request)

If no fields are provided:

```json
{
  "success": false,
  "message": "Validation Error",
  "errorMessages": [
    {
      "path": "body",
      "message": "At least one field (name or specialization) must be provided"
    }
  ],
  "stack": null
}
```

## Response (Error - 403 Forbidden)

If user is not SUPER_ADMIN:

```json
{
  "success": false,
  "message": "You don't have permission to access this route",
  "errorMessages": [
    {
      "path": "",
      "message": "You don't have permission to access this route"
    }
  ],
  "stack": null
}
```

## Response (Error - 401 Unauthorized)

If token is invalid or missing:

```json
{
  "success": false,
  "message": "You're not authorized to access this route",
  "errorMessages": [
    {
      "path": "",
      "message": "You're not authorized to access this route"
    }
  ],
  "stack": null
}
```

## Testing Tips

1. You must be logged in as SUPER_ADMIN to use this endpoint
2. The counselorId in the URL must be a valid UUID of an existing counselor
3. You can update just the name, just the specialization, or both at the same time
4. At least one field (name or specialization) must be provided
5. The endpoint only works for users with COUNSELOR role
6. Empty strings are not allowed for name or specialization
7. The updated_at timestamp will be automatically updated

# Get Single Counselor API

## Endpoint

```
GET /api/v1/users/counselors/:counselorId
```

## Scope (Who can use this API)

- **SUPER_ADMIN** - Only super admin can get counselor information

## Authentication Required

Yes - Bearer token required in Authorization header

## Request Headers

```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

## URL Parameters

- `counselorId` - UUID of the counselor to retrieve (required)

## Example Request

```
GET {baseUrl}/api/v1/users/counselors/38ecce2d-3d81-4c18-b2bd-faf6b4da7b0b

Headers:
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Response (Success - 200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Counselor retrieved successfully",
  "data": {
    "id": "38ecce2d-3d81-4c18-b2bd-faf6b4da7b0b",
    "name": "Dr. Jane Anderson",
    "email": "tanvirul.hasan342@gmail.com",
    "specialization": "Child Psychology & Behavioral Therapy",
    "profile_picture": "https://syd1.digitaloceanspaces.com/alexrodriguez/profile-pictures/profile.jpg",
    "role": "COUNSELOR",
    "created_at": "2025-11-01T10:30:00.000Z",
    "updated_at": "2025-11-19T14:25:00.000Z",
    "counselor_settings": {
      "minimum_slots_per_day": 10,
      "approved_by_admin": true
    }
  }
}
```

## Response (Error - 404 Not Found)

If counselor doesn't exist:

```json
{
  "success": false,
  "message": "Counselor not found",
  "errorMessages": [
    {
      "path": "",
      "message": "Counselor not found"
    }
  ],
  "stack": null
}
```

## Response (Error - 400 Bad Request)

If user is not a counselor:

```json
{
  "success": false,
  "message": "User is not a counselor",
  "errorMessages": [
    {
      "path": "",
      "message": "User is not a counselor"
    }
  ],
  "stack": null
}
```

## Response (Error - 403 Forbidden)

If user is not SUPER_ADMIN:

```json
{
  "success": false,
  "message": "You don't have permission to access this route",
  "errorMessages": [
    {
      "path": "",
      "message": "You don't have permission to access this route"
    }
  ],
  "stack": null
}
```

## Response (Error - 401 Unauthorized)

If token is invalid or missing:

```json
{
  "success": false,
  "message": "You're not authorized to access this route",
  "errorMessages": [
    {
      "path": "",
      "message": "You're not authorized to access this route"
    }
  ],
  "stack": null
}
```

## Testing Tips

1. You must be logged in as SUPER_ADMIN to use this endpoint
2. The counselorId in the URL must be a valid UUID of an existing counselor
3. Returns complete counselor information including settings
4. Only returns counselors where `is_deleted: false`
5. Includes profile picture URL if available
6. Includes counselor_settings with minimum_slots_per_day and approved_by_admin
7. The endpoint only works for users with COUNSELOR role

# Update Client API

## Endpoint

```
PATCH /api/v1/clients/:clientId
```

## Scope (Who can use this API)

- **COUNSELOR** - Can update their own client's information (clients who have appointments with them)
- **SUPER_ADMIN** - Can update any client's information

## Authentication Required

Yes - Bearer token required in Authorization header

## Request Headers

```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

## URL Parameters

- `clientId` - UUID of the client to update (required)

## Request Body (JSON)

You can pass one or more fields. At least one field is required:

### Update only first name:
```json
{
  "first_name": "John"
}
```

### Update only phone:
```json
{
  "phone": "+61412345678"
}
```

### Update multiple fields:
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+61412345678",
  "date_of_birth": "1990-01-15T00:00:00.000Z",
  "gender": "MALE"
}
```

## Field Validation

- `first_name` (optional) - Must be a non-empty string
- `last_name` (optional) - Must be a non-empty string
- `phone` (optional) - Must be a non-empty string
- `date_of_birth` (optional) - Must be a valid ISO 8601 datetime string or Date object
- `gender` (optional) - Must be one of: `MALE`, `FEMALE`, `OTHER`
- **At least one field must be provided** in the request body

## Example Request

```
PATCH {baseUrl}/api/v1/clients/a1b2c3d4-e5f6-7890-abcd-ef1234567890

Headers:
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

Body (raw JSON):
{
  "first_name": "Jane",
  "last_name": "Smith",
  "phone": "+61498765432"
}
```

## Response (Success - 200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Client updated successfully",
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane.smith@example.com",
    "phone": "+61498765432",
    "dateOfBirth": "1990-01-15T00:00:00.000Z",
    "gender": "FEMALE",
    "isVerified": true,
    "createdAt": "2025-10-01T10:30:00.000Z",
    "updatedAt": "2025-11-19T15:45:00.000Z"
  }
}
```

## Response (Error - 404 Not Found)

If client doesn't exist:

```json
{
  "success": false,
  "message": "Client not found",
  "errorMessages": [
    {
      "path": "",
      "message": "Client not found"
    }
  ],
  "stack": null
}
```

## Response (Error - 403 Forbidden)

If counselor tries to update a client they don't have appointments with:

```json
{
  "success": false,
  "message": "You do not have permission to update this client",
  "errorMessages": [
    {
      "path": "",
      "message": "You do not have permission to update this client"
    }
  ],
  "stack": null
}
```

## Response (Error - 400 Bad Request)

If no fields are provided:

```json
{
  "success": false,
  "message": "Validation Error",
  "errorMessages": [
    {
      "path": "body",
      "message": "At least one field must be provided"
    }
  ],
  "stack": null
}
```

## Response (Error - 400 Bad Request)

If gender value is invalid:

```json
{
  "success": false,
  "message": "Validation Error",
  "errorMessages": [
    {
      "path": "body.gender",
      "message": "Gender must be MALE, FEMALE, or OTHER"
    }
  ],
  "stack": null
}
```

## Response (Error - 403 Forbidden)

If user is not SUPER_ADMIN or COUNSELOR:

```json
{
  "success": false,
  "message": "You don't have permission to access this route",
  "errorMessages": [
    {
      "path": "",
      "message": "You don't have permission to access this route"
    }
  ],
  "stack": null
}
```

## Response (Error - 401 Unauthorized)

If token is invalid or missing:

```json
{
  "success": false,
  "message": "You're not authorized to access this route",
  "errorMessages": [
    {
      "path": "",
      "message": "You're not authorized to access this route"
    }
  ],
  "stack": null
}
```

## Access Control Rules

### For COUNSELOR:
- Can only update clients who have **confirmed, completed, or cancelled** appointments with them
- Cannot update clients with only **PENDING** appointments
- Receives 403 Forbidden if trying to update unrelated clients

### For SUPER_ADMIN:
- Can update any client without restrictions
- No appointment relationship check required

## Testing Tips

1. Both COUNSELOR and SUPER_ADMIN can use this endpoint
2. The clientId in the URL must be a valid UUID of an existing client
3. You can update one field or multiple fields at the same time
4. At least one field must be provided in the request body
5. Counselors can only update clients they have appointments with (excluding PENDING status)
6. Super admins can update any client
7. Empty strings are not allowed for first_name, last_name, or phone
8. The date_of_birth must be in ISO 8601 format (e.g., "1990-01-15T00:00:00.000Z")
9. The updated_at timestamp will be automatically updated
10. Email cannot be updated (not included in updateable fields)
