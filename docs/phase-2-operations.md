# DOMA — phase 2 operations

## What is persistent

- ChatGPT sign-in creates a durable local profile from the host-provided identity.
- Submitted listings require a precise price, address and area, then enter `pending` review.
- Only approved listings are returned by the public API.
- Favorites, offers and account dashboard counts are scoped to the signed-in user.
- Moderation is recorded in an immutable listing-moderation history.
- Property statistics use aggregate unique daily views. The browser receives a random HTTP-only identifier; the database stores only its one-way digest together with the listing and date, never a raw IP address.

## Admin bootstrap

No visitor becomes an administrator automatically. After the first sign-in, add the site owner's stable ChatGPT user ID to the `user_roles` table with the `admin` role through an owner-controlled database operation:

```sql
INSERT INTO user_roles (user_id, role)
VALUES ('<stable-chatgpt-user-id>', 'admin')
ON CONFLICT(user_id, role) DO NOTHING;
```

The public web application intentionally has no endpoint for assigning this role. An assigned administrator can open **Админ** and approve, reject, or archive listings; every status change is server-authorized and audited.

## Partner accounts

Agency and developer listings require a verified organization and an owner/editor membership. Organization approval and partner onboarding remain a controlled admin operation for the next phase.

## Data quality

The existing screen cards and market figures marked as demo remain illustrative fixtures. The `/api/market/averages` endpoint deliberately computes only from approved D1 records, returning an empty result until verified inventory is available.
