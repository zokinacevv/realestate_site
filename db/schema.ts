import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export type PublisherType = "owner" | "agency" | "developer";
export type AccountType = "individual" | "agency" | "company";
export type ListingLifecycle =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "archived";
export type ListingIntent = "sale" | "rent";
export type ConstructionState = "built" | "in_progress";
export type OrganizationKind = "agency" | "developer";
export type OrganizationStatus = "pending" | "verified" | "suspended";
export type MembershipRole = "owner" | "editor" | "viewer";
export type UserRole = "admin" | "moderator";

const now = sql.raw("CURRENT_TIMESTAMP");

/** A durable profile is created from the authenticated ChatGPT identity. */
export const profiles = sqliteTable(
  "profiles",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    fullName: text("full_name"),
    /** Chosen during the first account setup; host identity remains server-owned. */
    accountType: text("account_type").$type<AccountType>(),
    phone: text("phone"),
    onboardingCompletedAt: text("onboarding_completed_at"),
    createdAt: text("created_at").notNull().default(now),
    updatedAt: text("updated_at").notNull().default(now),
  },
);

/** Admin grants are deliberately server-managed; no browser can assign one. */
export const userRoles = sqliteTable(
  "user_roles",
  {
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id),
    role: text("role").$type<UserRole>().notNull(),
    createdAt: text("created_at").notNull().default(now),
  },
  (table) => [primaryKey({ columns: [table.userId, table.role] })],
);

export const organizations = sqliteTable(
  "organizations",
  {
    id: text("id").primaryKey(),
    kind: text("kind").$type<OrganizationKind>().notNull(),
    displayName: text("display_name").notNull(),
    legalName: text("legal_name"),
    registrationNumber: text("registration_number"),
    status: text("status").$type<OrganizationStatus>().notNull().default("pending"),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => profiles.id),
    createdAt: text("created_at").notNull().default(now),
    updatedAt: text("updated_at").notNull().default(now),
  },
  (table) => [
    index("organizations_kind_status_idx").on(table.kind, table.status),
    uniqueIndex("organizations_registration_number_unique").on(table.registrationNumber),
  ],
);

export const organizationMembers = sqliteTable(
  "organization_members",
  {
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id),
    role: text("role").$type<MembershipRole>().notNull().default("viewer"),
    createdAt: text("created_at").notNull().default(now),
  },
  (table) => [
    primaryKey({ columns: [table.organizationId, table.userId] }),
    index("organization_members_user_idx").on(table.userId, table.organizationId),
  ],
);

export const listings = sqliteTable(
  "listings",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => profiles.id),
    contactUserId: text("contact_user_id")
      .notNull()
      .references(() => profiles.id),
    organizationId: text("organization_id").references(() => organizations.id),
    publisherType: text("publisher_type").$type<PublisherType>().notNull(),
    status: text("status").$type<ListingLifecycle>().notNull().default("draft"),
    intent: text("intent").$type<ListingIntent>().notNull(),
    propertyType: text("property_type").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    priceAmountCents: integer("price_amount_cents").notNull(),
    currency: text("currency").notNull().default("EUR"),
    pricePeriod: text("price_period").notNull().default("total"),
    city: text("city").notNull(),
    municipality: text("municipality"),
    neighborhood: text("neighborhood"),
    addressLine: text("address_line").notNull(),
    locationPrecision: text("location_precision").notNull().default("approximate"),
    exactLocationPublic: integer("exact_location_public", { mode: "boolean" })
      .notNull()
      .default(false),
    latitudeE6: integer("latitude_e6"),
    longitudeE6: integer("longitude_e6"),
    areaM2: integer("area_m2").notNull(),
    rooms: integer("rooms"),
    floorNumber: integer("floor_number"),
    floorTotal: integer("floor_total"),
    elevator: integer("elevator", { mode: "boolean" }),
    parking: text("parking"),
    heating: text("heating"),
    cooling: text("cooling"),
    constructionState: text("construction_state")
      .$type<ConstructionState>()
      .notNull()
      .default("built"),
    builtYear: integer("built_year"),
    completionDate: text("completion_date"),
    featuresJson: text("features_json").notNull().default("[]"),
    submittedAt: text("submitted_at"),
    publishedAt: text("published_at"),
    moderatedByUserId: text("moderated_by_user_id").references(() => profiles.id),
    moderatedAt: text("moderated_at"),
    moderationNote: text("moderation_note"),
    createdAt: text("created_at").notNull().default(now),
    updatedAt: text("updated_at").notNull().default(now),
  },
  (table) => [
    index("listings_public_search_idx").on(
      table.status,
      table.city,
      table.intent,
      table.publishedAt,
    ),
    index("listings_location_type_idx").on(
      table.status,
      table.municipality,
      table.neighborhood,
      table.propertyType,
    ),
    index("listings_owner_status_idx").on(table.ownerUserId, table.status, table.updatedAt),
    index("listings_organization_status_idx").on(table.organizationId, table.status),
  ],
);

export const listingFavorites = sqliteTable(
  "listing_favorites",
  {
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id),
    listingId: text("listing_id")
      .notNull()
      .references(() => listings.id),
    createdAt: text("created_at").notNull().default(now),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.listingId] }),
    index("listing_favorites_user_idx").on(table.userId, table.createdAt),
  ],
);

export const offers = sqliteTable(
  "offers",
  {
    id: text("id").primaryKey(),
    listingId: text("listing_id")
      .notNull()
      .references(() => listings.id),
    senderUserId: text("sender_user_id")
      .notNull()
      .references(() => profiles.id),
    recipientUserId: text("recipient_user_id")
      .notNull()
      .references(() => profiles.id),
    kind: text("kind").$type<"inquiry" | "offer">().notNull(),
    amountCents: integer("amount_cents"),
    currency: text("currency").notNull().default("EUR"),
    message: text("message").notNull(),
    status: text("status")
      .$type<"sent" | "accepted" | "declined" | "withdrawn">()
      .notNull()
      .default("sent"),
    createdAt: text("created_at").notNull().default(now),
    updatedAt: text("updated_at").notNull().default(now),
  },
  (table) => [
    index("offers_recipient_status_idx").on(table.recipientUserId, table.status, table.createdAt),
    index("offers_sender_idx").on(table.senderUserId, table.createdAt),
  ],
);

export const listingModerationEvents = sqliteTable(
  "listing_moderation_events",
  {
    id: text("id").primaryKey(),
    listingId: text("listing_id")
      .notNull()
      .references(() => listings.id),
    actorUserId: text("actor_user_id")
      .notNull()
      .references(() => profiles.id),
    previousStatus: text("previous_status").$type<ListingLifecycle>(),
    nextStatus: text("next_status").$type<ListingLifecycle>().notNull(),
    note: text("note"),
    createdAt: text("created_at").notNull().default(now),
  },
  (table) => [index("moderation_events_listing_idx").on(table.listingId, table.createdAt)],
);

/** Aggregates only: no raw IP or visitor identity is stored. */
export const listingViewEvents = sqliteTable(
  "listing_view_events",
  {
    id: text("id").primaryKey(),
    listingId: text("listing_id")
      .notNull()
      .references(() => listings.id),
    visitorKeyHash: text("visitor_key_hash").notNull(),
    viewedOn: text("viewed_on").notNull(),
    createdAt: text("created_at").notNull().default(now),
  },
  (table) => [
    uniqueIndex("listing_views_daily_unique").on(
      table.listingId,
      table.visitorKeyHash,
      table.viewedOn,
    ),
    index("listing_views_listing_day_idx").on(table.listingId, table.viewedOn),
  ],
);
