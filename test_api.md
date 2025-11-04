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

## Field Details

| Field | Type | Required | Enum Values | Description |
|-------|------|----------|-------------|-------------|
| firstName | string | Yes | - | Client's first name |
| lastName | string | Yes | - | Client's last name |
| email | string | Yes | - | Client's email (must be valid email format) |
| phone | string | Yes | - | Client's phone number |
| dateOfBirth | string | Yes | - | Client's date of birth (YYYY-MM-DD format) |
| gender | string | Yes | MALE, FEMALE, OTHER | Client's gender |
| sessionType | string | Yes | ONLINE, IN_PERSON | Type of counseling session |
| date | string | Yes | - | Appointment date (YYYY-MM-DD format) |
| timeSlotId | string | Yes | - | UUID of the available time slot |
| notes | string | No | - | Optional notes about the appointment |

## Success Response (201 Created)
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Appointment created successfully. Confirmation email sent to client.",
  "data": {
    "id": "appointment-uuid",
    "client_id": "client-uuid",
    "counselor_id": "counselor-uuid",
    "time_slot_id": "timeslot-uuid",
    "session_type": "ONLINE",
    "date": "2025-12-15T00:00:00.000Z",
    "notes": "Client needs help with anxiety management",
    "status": "CONFIRMED",
    "is_rescheduled": false,
    "event_id": null,
    "created_at": "2025-11-04T10:30:00.000Z",
    "updated_at": "2025-11-04T10:30:00.000Z",
    "client": {
      "first_name": "John",
      "last_name": "Doe",
      "email": "john.doe@example.com"
    },
    "counselor": {
      "id": "counselor-uuid",
      "name": "Dr. Smith",
      "email": "smith@example.com"
    },
    "time_slot": {
      "start_time": "10:00 AM",
      "end_time": "11:00 AM"
    }
  }
}
```

## What Happens After Creation
1. **Appointment is created** with CONFIRMED status (no payment required)
2. **Time slot is marked as BOOKED** immediately
3. **Google Calendar event is created** automatically (if counselor has Google Calendar connected)
4. **Client receives confirmation email** with:
   - Appointment details (date, time, counselor)
   - Meeting link (for online sessions)
   - Booking link to schedule future appointments

## Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "statusCode": 403,
  "message": "You don't have permission to access this route"
}
```

### 422 Unprocessable Entity (Time slot not available)
```json
{
  "success": false,
  "statusCode": 422,
  "message": "Time slot is not available"
}
```

### 400 Bad Request (Validation errors)
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation error",
  "errorMessages": [
    {
      "path": "email",
      "message": "Invalid email format"
    }
  ]
}
```

## Testing Tips
1. Make sure the time slot ID belongs to your counselor account
2. The time slot must have status "AVAILABLE"
3. Session type must match the time slot type
4. Email will be sent to the client's email address
5. If client email already exists, their information will be updated
