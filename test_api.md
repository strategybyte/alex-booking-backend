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


