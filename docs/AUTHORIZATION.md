# Authorization Model

## Roles

### Student

Can access the student's own profile, valid enrollments, released content, assigned tests, attempts/results and permitted materials.

### Teacher

Can manage teaching resources only for explicitly assigned batches/subjects unless granted a broader staff role.

### Content manager

Can manage selected academic/public content but does not automatically gain payment, owner or staff-permission authority.

### Admin

Can perform normal platform administration subject to owner-reserved operations.

### Owner

Controls platform-wide settings, staff permissions and other high-impact operations.

## Enforcement

The frontend may hide unavailable actions for usability, but every protected read/write must be authorized by the backend/database layer.

Example lecture check:

```text
request → authenticated? → enrolled? → batch/course active? → content released? → allow/deny
```
