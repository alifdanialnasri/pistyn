# Security Specification for Pistyn

## Data Invariants
1. **User Profiles**: Only the authenticated user can create or update their own profile.
2. **Vehicles**: Must be owned by the creator. Ownership and `createdAt` are immutable. Plate number and Name are required.
3. **Services**: Must reference a vehicle owned by the user. A service may be moved to another vehicle only if the user owns that vehicle. `ownerId` is immutable.
4. **Parts**: Must be owned by the creator. `ownerId` is immutable.
5. **Schedules and Issues**: Must reference a vehicle owned by the user. `vehicleId` and `ownerId` are immutable.
6. Every create allows only known fields; every update may only change editable fields and is validated with the same type and size limits as a create.
7. **Admin**: only the verified account `alifdanialnasrii@gmail.com` is admin. The admin can list and count every collection, read all user profiles, record payments and change a user's plan, expiry and admin notes. The admin cannot edit or delete other users' vehicles, services, parts, schedules or issues.
8. **Plans and payments**: a user's profile is created on the Free plan; users can only change their own name and last-active date, never their plan. Payments are created, edited and deleted only by the admin; a user can read their own payments.
9. Receipts in Storage live under `receipts/{uid}/` and only that user can upload (max 10 MB), view or delete them.

## The "Dirty Dozen" Payloads (Denial Tests)
1. Creating a vehicle with another user's `ownerId`.
2. Updating a vehicle's `ownerId` to hijack it.
3. Creating a service for a vehicle owned by someone else.
4. Listing all vehicles without an `ownerId` filter.
5. Updating a user profile that doesn't belong to the requester.
6. Injecting a 2MB string into the `notes` field (on create or update).
7. Deleting a vehicle owned by a different user.
8. Creating or updating a service with a negative mileage.
9. Modifying the `createdAt` timestamp of a record.
10. Creating a part with a non-standard `status` string.
11. Adding a `ghostField: true` to any create or update.
12. Creating a vehicle with a 500-character name.
13. Moving a service, schedule item or issue onto another user's vehicle.
