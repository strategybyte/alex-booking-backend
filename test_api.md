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
