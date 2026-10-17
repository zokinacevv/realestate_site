"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { macedonianCities } from "./location-data";
import {
  agencyPartners,
  developerPartners,
  initialListings,
  propertyTypes,
  skopjeMunicipalities,
  type ConstructionState,
  type Listing,
  type ListingIntent,
  type ListingStatus,
  type PropertyType,
  type PublisherType,
} from "./market-data";

type IconName =
  | "arrow"
  | "building"
  | "check"
  | "chevron"
  | "close"
  | "eye"
  | "filter"
  | "heart"
  | "home"
  | "key"
  | "land"
  | "map"
  | "menu"
  | "pin"
  | "search"
  | "trash"
  | "user";

type PublisherFilter = PublisherType | "all";
type PropertyFilter = PropertyType | "all";
type MapTool = "radius" | "polygon";

type MapPoint = { x: number; y: number };

type MapFilter = {
  tool: MapTool;
  center: MapPoint | null;
  radius: number;
  polygon: MapPoint[];
};

type AdvancedFilters = {
  municipality: string;
  neighborhood: string;
  construction: "all" | ConstructionState;
  minArea: string;
  maxArea: string;
  floor: "all" | "lower" | "upper";
  elevator: "all" | "yes" | "no";
  parking: "all" | "yes";
  heating: string;
  cooling: string;
};

type SearchSnapshot = {
  city: string;
  propertyType: PropertyFilter;
  publisherType: PublisherFilter;
  intent: ListingIntent;
  advanced: AdvancedFilters;
  map: MapFilter;
};

type PublishForm = {
  title: string;
  propertyType: PropertyType;
  intent: ListingIntent;
  publisherType: PublisherType;
  price: string;
  areaM2: string;
  address: string;
  municipality: string;
  neighborhood: string;
  construction: ConstructionState;
  year: string;
  latitude: string;
  longitude: string;
  photoUrls: string;
};

type OfferForm = {
  kind: "inquiry" | "offer";
  amount: string;
  message: string;
};

type ApiListing = {
  id: string;
  title: string;
  description: string;
  intent: ListingIntent;
  propertyType: string;
  publisherType: PublisherType;
  priceAmountCents: number;
  currency: string;
  pricePeriod: "total" | "monthly";
  city: string;
  municipality: string | null;
  neighborhood: string | null;
  addressLine: string | null;
  locationPrecision?: string | null;
  latitudeE6: number | null;
  longitudeE6: number | null;
  areaM2: number;
  rooms: number | null;
  floorNumber: number | null;
  floorTotal: number | null;
  elevator: boolean | null;
  parking: string | null;
  heating: string | null;
  cooling: string | null;
  constructionState: ConstructionState;
  builtYear: number | null;
  completionDate: string | null;
  features: string[];
  photoUrls?: string[];
  publishedAt?: string | null;
};

type OwnerApiListing = ApiListing & {
  addressLine: string;
  exactLocationPublic: boolean;
  status: "pending" | "approved" | "rejected" | "archived";
  moderationNote: string | null;
  submittedAt: string | null;
  updatedAt: string;
};

type AccountProfile = {
  id: string;
  email: string | null;
  displayName: string | null;
  fullName: string | null;
  createdAt: string | null;
};

type CurrentUserPayload = {
  profile: AccountProfile;
  permissions?: {
    canModerateListings?: boolean;
  };
};

type AdminStatus = OwnerApiListing["status"];
type AdminAccess = "checking" | "granted" | "denied" | "error";
type OrganizationStatus = "pending" | "verified" | "suspended";
type AdminOrganization = { id: string; kind: "agency" | "developer"; displayName: string; legalName: string | null; status: OrganizationStatus; createdAt: string; updatedAt: string };

type DashboardData = {
  listings: { total: number; pending: number; approved: number; rejected: number; archived: number };
  favorites: number;
  offers: { incoming: number; outgoing: number };
  views: { total: number; last30Days: number };
  activity: { listingId: string; title: string; views: number; incomingOffers: number }[];
};

type MarketAverage = {
  municipality: string | null;
  neighborhood?: string | null;
  sampleCount: number;
  averagePriceCents: number;
  averagePricePerM2Cents: number;
};

type MarketAveragesPayload = {
  byMunicipality?: MarketAverage[];
  byNeighborhood?: MarketAverage[];
};

type AccountOffer = {
  id: string;
  listingId: string;
  listingTitle: string;
  direction: "incoming" | "outgoing";
  kind: "inquiry" | "offer";
  amountCents: number | null;
  currency: string;
  message: string;
  status: "sent" | "accepted" | "declined" | "withdrawn";
  createdAt: string;
};

const publisherLabels: Record<PublisherFilter, string> = {
  all: "Сите огласувачи",
  agency: "Агенција за недвижности",
  developer: "Инвеститор / градежна фирма",
  owner: "Приватен сопственик",
};

const publisherOptions: Array<{ value: PublisherFilter; label: string }> = [
  { value: "all", label: publisherLabels.all },
  { value: "agency", label: publisherLabels.agency },
  { value: "developer", label: publisherLabels.developer },
  { value: "owner", label: publisherLabels.owner },
];

const propertyOptions: Array<{ value: PropertyFilter; label: string }> = [
  { value: "all", label: "Сите типови" },
  ...propertyTypes.map((type) => ({ value: type, label: type })),
];

const categories: Array<{
  name: string;
  description: string;
  type: PropertyFilter;
  icon: IconName;
}> = [
  { name: "Станови", description: "За секојдневие во градот", type: "Стан", icon: "building" },
  { name: "Куќи", description: "Повеќе простор за вас", type: "Куќа", icon: "home" },
  { name: "Соби", description: "Практично за студенти", type: "Соба", icon: "key" },
  { name: "Гаражи", description: "Сигурно место за возило", type: "Гаража", icon: "land" },
];

function createEmptyAdvancedFilters(): AdvancedFilters {
  return {
    municipality: "",
    neighborhood: "",
    construction: "all",
    minArea: "",
    maxArea: "",
    floor: "all",
    elevator: "all",
    parking: "all",
    heating: "all",
    cooling: "all",
  };
}

function createEmptyMapFilter(): MapFilter {
  return { tool: "radius", center: null, radius: 18, polygon: [] };
}

function createEmptyPublishForm(): PublishForm {
  return {
    title: "",
    propertyType: "Стан",
    intent: "sale",
    publisherType: "owner",
    price: "",
    areaM2: "",
    address: "",
    municipality: "Аеродром",
    neighborhood: "Јане Сандански",
    construction: "built",
    year: "",
    latitude: "",
    longitude: "",
    photoUrls: "",
  };
}

function createEmptyOfferForm(): OfferForm {
  return { kind: "inquiry", amount: "", message: "" };
}

function formatEuro(value: number) {
  return value.toLocaleString("mk-MK") + " €";
}

function pricePerSquareMeter(listing: Listing) {
  return Math.round(listing.priceEur / listing.areaM2);
}

function constructionLabel(listing: Listing) {
  if (listing.construction === "in_progress") return "ВО ТЕК НА ГРАДБА";
  return "Изграден " + (listing.builtYear ?? "");
}

function statusLabel(status: ListingStatus) {
  if (status === "approved") return "Одобрен";
  if (status === "pending") return "Чека проверка";
  return "Одбиен";
}

function ownerStatusLabel(status: OwnerApiListing["status"]) {
  if (status === "archived") return "Архивиран";
  return statusLabel(status);
}

function toUiListing(listing: ApiListing): Listing {
  const propertyType = propertyTypes.includes(listing.propertyType as PropertyType)
    ? (listing.propertyType as PropertyType)
    : "Деловен простор";

  return {
    id: listing.id,
    title: listing.title,
    intent: listing.intent,
    propertyType,
    publisherType: listing.publisherType,
    publisherName: "Регистриран огласувач",
    city: listing.city,
    municipality: listing.municipality ?? "Неодредена општина",
    neighborhood: listing.neighborhood ?? "Неодредена населба",
    address: listing.addressLine ?? "Прецизната адреса е достапна по контакт.",
    priceEur: listing.priceAmountCents / 100,
    areaM2: listing.areaM2,
    rooms: listing.rooms ?? undefined,
    floor: listing.floorNumber == null ? undefined : String(listing.floorNumber),
    elevator: listing.elevator ?? undefined,
    parking: listing.parking ?? "Не е наведено",
    heating: listing.heating ?? "Не е наведено",
    cooling: listing.cooling ?? "Не е наведено",
    construction: listing.constructionState,
    builtYear: listing.builtYear ?? undefined,
    completionText: listing.completionDate ? "Планирано завршување: " + listing.completionDate : undefined,
    views: 0,
    status: "approved",
    photoPosition: "50% center",
    map: coordinatesToMapPoint(listing.latitudeE6, listing.longitudeE6),
    features: listing.features,
    photoUrls: listing.photoUrls,
    badge: listing.constructionState === "in_progress" ? "ВО ТЕК НА ГРАДБА" : "ОДОБРЕН ОГЛАС",
  };
}

function coordinatesToMapPoint(latitudeE6: number | null, longitudeE6: number | null): MapPoint {
  if (latitudeE6 == null || longitudeE6 == null) return { x: 50, y: 45 };
  const latitude = latitudeE6 / 1_000_000;
  const longitude = longitudeE6 / 1_000_000;
  // Skopje map viewport: 42.00–42.08 N and 21.31–21.52 E.
  return {
    x: Math.max(2, Math.min(98, ((longitude - 21.31) / 0.21) * 100)),
    y: Math.max(2, Math.min(68, ((42.08 - latitude) / 0.08) * 70)),
  };
}

async function errorMessage(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => null)) as { error?: unknown } | null;
  return typeof payload?.error === "string" ? payload.error : fallback;
}

function pointInsidePolygon(point: MapPoint, polygon: MapPoint[]) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const currentPoint = polygon[index];
    const previousPoint = polygon[previous];
    const intersects =
      currentPoint.y > point.y !== previousPoint.y > point.y &&
      point.x <
        ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) /
          (previousPoint.y - currentPoint.y) +
          currentPoint.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

function matchesMap(listing: Listing, map: MapFilter) {
  if (map.tool === "radius" && map.center) {
    const distance = Math.hypot(listing.map.x - map.center.x, listing.map.y - map.center.y);
    return distance <= map.radius;
  }
  if (map.tool === "polygon" && map.polygon.length >= 3) {
    return pointInsidePolygon(listing.map, map.polygon);
  }
  return true;
}

function matchesSearch(listing: Listing, search: SearchSnapshot) {
  const minArea = Number(search.advanced.minArea);
  const maxArea = Number(search.advanced.maxArea);
  const floorNumber = Number.parseInt(listing.floor ?? "", 10);

  if (listing.status !== "approved") return false;
  if (listing.city !== search.city) return false;
  if (listing.intent !== search.intent) return false;
  if (search.propertyType !== "all" && listing.propertyType !== search.propertyType) return false;
  if (search.publisherType !== "all" && listing.publisherType !== search.publisherType) return false;
  if (search.advanced.municipality && listing.municipality !== search.advanced.municipality) return false;
  if (search.advanced.neighborhood && listing.neighborhood !== search.advanced.neighborhood) return false;
  if (search.advanced.construction !== "all" && listing.construction !== search.advanced.construction) return false;
  if (Number.isFinite(minArea) && minArea > 0 && listing.areaM2 < minArea) return false;
  if (Number.isFinite(maxArea) && maxArea > 0 && listing.areaM2 > maxArea) return false;
  if (search.advanced.elevator === "yes" && !listing.elevator) return false;
  if (search.advanced.elevator === "no" && listing.elevator) return false;
  if (search.advanced.parking === "yes" && listing.parking === "Не е достапно") return false;
  if (search.advanced.heating !== "all" && listing.heating !== search.advanced.heating) return false;
  if (search.advanced.cooling !== "all" && listing.cooling !== search.advanced.cooling) return false;
  if (search.advanced.floor === "lower" && (!Number.isFinite(floorNumber) || floorNumber > 3)) return false;
  if (search.advanced.floor === "upper" && (!Number.isFinite(floorNumber) || floorNumber < 4)) return false;
  return matchesMap(listing, search.map);
}

function Icon({
  name,
  size = 20,
  filled = false,
}: {
  name: IconName;
  size?: number;
  filled?: boolean;
}) {
  const shared = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "search") return <svg {...shared}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>;
  if (name === "pin") return <svg {...shared}><path d="M20 10c0 5.2-8 10-8 10s-8-4.8-8-10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.3" /></svg>;
  if (name === "heart") return <svg {...shared} fill={filled ? "currentColor" : "none"}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.9-8.6a5.5 5.5 0 0 0-.1-7.8Z" /></svg>;
  if (name === "arrow") return <svg {...shared}><path d="M5 12h13" /><path d="m13 6 6 6-6 6" /></svg>;
  if (name === "chevron") return <svg {...shared}><path d="m7 10 5 5 5-5" /></svg>;
  if (name === "menu") return <svg {...shared}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
  if (name === "close") return <svg {...shared}><path d="m6 6 12 12M18 6 6 18" /></svg>;
  if (name === "check") return <svg {...shared}><path d="m5 12 4.2 4.2L19 6.5" /></svg>;
  if (name === "eye") return <svg {...shared}><path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.6" /></svg>;
  if (name === "filter") return <svg {...shared}><path d="M4 5h16M7 12h10M10 19h4" /></svg>;
  if (name === "map") return <svg {...shared}><path d="m3.5 5.5 5-2 7 2.5 5-2v14l-5 2-7-2.5-5 2v-14Z" /><path d="M8.5 3.5v14M15.5 6v14" /></svg>;
  if (name === "trash") return <svg {...shared}><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" /></svg>;
  if (name === "user") return <svg {...shared}><circle cx="12" cy="8" r="3.5" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></svg>;
  if (name === "building") return <svg {...shared}><path d="M4 21V5.5A1.5 1.5 0 0 1 5.5 4h9A1.5 1.5 0 0 1 16 5.5V21" /><path d="M16 10h2.5A1.5 1.5 0 0 1 20 11.5V21M8 8h4M8 12h4M8 16h4M11 21v-2.5" /></svg>;
  if (name === "home") return <svg {...shared}><path d="m3 11 9-7 9 7v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1v-9Z" /><path d="M9 21v-6h6v6" /></svg>;
  if (name === "key") return <svg {...shared}><circle cx="8.5" cy="15.5" r="3.5" /><path d="m11 13 8-8M16 8l2 2M14 10l2 2" /></svg>;
  return <svg {...shared}><path d="M4 20.5h16M6.5 20.5V9.2l5.5-4.5 5.5 4.5v11.3M9 20.5v-6h6v6" /><path d="M4.5 9.2 12 3l7.5 6.2" /></svg>;
}

function ListingCard({
  listing,
  favorite,
  onFavorite,
  onOpen,
}: {
  listing: Listing;
  favorite: boolean;
  onFavorite: () => void;
  onOpen: () => void;
}) {
  return (
    <article className="listing-card listing-card--rich">
      <div className="listing-card__media">
        <Image src="/images/doma-hero.png" alt="" fill sizes="(max-width: 720px) 100vw, (max-width: 960px) 50vw, 33vw" className="listing-card__photo" style={{ objectPosition: listing.photoPosition }} />
        <div className="listing-card__shade" />
        <span className={listing.construction === "in_progress" ? "listing-card__badge listing-card__badge--build" : "listing-card__badge"}>{listing.badge ?? "ДЕМО ОГЛАС"}</span>
        <button className={favorite ? "heart-button is-favorite" : "heart-button"} type="button" aria-label={favorite ? "Отстрани од омилени" : "Додај во омилени"} aria-pressed={favorite} onClick={onFavorite}><Icon name="heart" size={18} filled={favorite} /></button>
      </div>
      <div className="listing-card__body">
        <div className="listing-card__card-topline"><p className="listing-card__location"><Icon name="pin" size={15} />{listing.municipality + " · " + listing.neighborhood}</p><span className="listing-card__type">{listing.propertyType}</span></div>
        <h3>{listing.title}</h3>
        <p className="listing-card__address"><Icon name="pin" size={14} />Адреса: {listing.address}</p>
        <p className="listing-card__details">{listing.areaM2 + " m²"}{listing.rooms ? " · " + listing.rooms + " соби" : ""}{listing.floor ? " · " + listing.floor + " кат" : ""}</p>
        <div className="listing-card__property-row"><span>{constructionLabel(listing)}</span><span>{listing.elevator ? "Лифт" : "Без лифт"}</span></div>
        <p className="listing-card__publisher"><span>{publisherLabels[listing.publisherType]}</span>{listing.publisherName}</p>
        <div className="listing-card__footer"><p><strong>{formatEuro(listing.priceEur)}</strong><span>{listing.intent === "rent" ? "/ месечно" : ""}</span><small>{pricePerSquareMeter(listing) + " €/m²" + (listing.intent === "rent" ? " месечно" : "")}</small></p><button className="listing-card__view" type="button" aria-label="Отвори детали за огласот" onClick={onOpen}><Icon name="arrow" size={18} /></button></div>
      </div>
    </article>
  );
}

export default function HomeClient() {
  const router = useRouter();
  const [mode, setMode] = useState<ListingIntent>("sale");
  const [selectedCity, setSelectedCity] = useState("Скопје");
  const [propertyType, setPropertyType] = useState<PropertyFilter>("Стан");
  const [publisherType, setPublisherType] = useState<PublisherFilter>("all");
  const [advanced, setAdvanced] = useState<AdvancedFilters>(createEmptyAdvancedFilters);
  const [mapFilter, setMapFilter] = useState<MapFilter>(createEmptyMapFilter);
  const [appliedSearch, setAppliedSearch] = useState<SearchSnapshot | null>(null);
  const [listingInventory, setListingInventory] = useState<Listing[]>(initialListings);
  const [marketAverages, setMarketAverages] = useState<MarketAveragesPayload | null>(null);
  const [marketAveragesLoading, setMarketAveragesLoading] = useState(false);
  const [fixtureFavoriteIds, setFixtureFavoriteIds] = useState<string[]>([]);
  const [serverFavoriteIds, setServerFavoriteIds] = useState<string[]>([]);
  const [persistedListingIds, setPersistedListingIds] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountProfile, setAccountProfile] = useState<AccountProfile | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [ownedListings, setOwnedListings] = useState<OwnerApiListing[]>([]);
  const [favoriteListings, setFavoriteListings] = useState<ApiListing[]>([]);
  const [accountOffers, setAccountOffers] = useState<AccountOffer[]>([]);
  const [offerMutatingId, setOfferMutatingId] = useState<string | null>(null);
  const [accountTab, setAccountTab] = useState<"overview" | "listings" | "offers" | "saved">("overview");
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishForm, setPublishForm] = useState<PublishForm>(createEmptyPublishForm);
  const [editingListingId, setEditingListingId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerForm, setOfferForm] = useState<OfferForm>(createEmptyOfferForm);
  const [offerSubmitting, setOfferSubmitting] = useState(false);
  const [offerFeedback, setOfferFeedback] = useState("");
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminFilter, setAdminFilter] = useState<AdminStatus>("pending");
  const [adminListings, setAdminListings] = useState<OwnerApiListing[]>([]);
  const [adminAccess, setAdminAccess] = useState<AdminAccess>("checking");
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [adminActionMessage, setAdminActionMessage] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [adminMutatingListingId, setAdminMutatingListingId] = useState<string | null>(null);
  const [adminSection, setAdminSection] = useState<"listings" | "organizations">("listings");
  const [organizationFilter, setOrganizationFilter] = useState<OrganizationStatus>("pending");
  const [adminOrganizations, setAdminOrganizations] = useState<AdminOrganization[]>([]);
  const [adminMutatingOrganizationId, setAdminMutatingOrganizationId] = useState<string | null>(null);
  const [detailListingId, setDetailListingId] = useState<string | null>(null);
  const [mapFocusId, setMapFocusId] = useState<string | null>(null);
  const [isDrawingMap, setIsDrawingMap] = useState(false);
  const mapRef = useRef<SVGSVGElement>(null);
  const adminRequestIdRef = useRef(0);
  const favoriteIds = useMemo(
    () => Array.from(new Set([...fixtureFavoriteIds, ...serverFavoriteIds])),
    [fixtureFavoriteIds, serverFavoriteIds],
  );

  useEffect(() => {
    let active = true;

    async function loadPublicListings() {
      try {
        const response = await fetch("/api/listings?limit=80");
        if (!response.ok) return;
        const payload = (await response.json()) as { listings?: ApiListing[] };
        const databaseListings = Array.isArray(payload.listings)
          ? payload.listings.map(toUiListing)
          : [];
        if (!active) return;

        const databaseIds = new Set(databaseListings.map((listing) => listing.id));
        const fixtureIds = new Set(initialListings.map((listing) => listing.id));
        setPersistedListingIds(databaseListings.map((listing) => listing.id));
        setListingInventory((current) => {
          const localListings = current.filter(
            (listing) => !databaseIds.has(listing.id) && !fixtureIds.has(listing.id),
          );
          return [...databaseListings, ...localListings, ...initialListings];
        });
      } catch {
        // The fixture inventory remains available if the database is unavailable.
      }
    }

    void loadPublicListings();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadMarketAverages() {
      setMarketAveragesLoading(true);
      try {
        const query = new URLSearchParams({ city: selectedCity, intent: mode });
        const response = await fetch("/api/market/averages?" + query.toString(), {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("MARKET_AVERAGES_UNAVAILABLE");
        const payload = (await response.json()) as MarketAveragesPayload;
        if (active) setMarketAverages(payload);
      } catch {
        if (active) setMarketAverages(null);
      } finally {
        if (active) setMarketAveragesLoading(false);
      }
    }

    void loadMarketAverages();
    return () => {
      active = false;
      controller.abort();
    };
  }, [selectedCity, mode]);

  const searchLabel = mode === "sale" ? "Купување" : "Изнајмување";
  const selectedMunicipality = skopjeMunicipalities.find((item) => item.name === advanced.municipality);
  const visibleNeighborhoods = selectedMunicipality?.neighborhoods ?? [];
  const selectedDetail = listingInventory.find((listing) => listing.id === detailListingId) ?? null;
  const offerListing = selectedDetail && persistedListingIds.includes(selectedDetail.id)
    ? selectedDetail
    : null;
  const draftSearch = useMemo<SearchSnapshot>(
    () => ({ city: selectedCity, propertyType, publisherType, intent: mode, advanced, map: mapFilter }),
    [selectedCity, propertyType, publisherType, mode, advanced, mapFilter],
  );

  const previewListings = useMemo(
    () => listingInventory.filter((listing) => matchesSearch(listing, draftSearch)),
    [listingInventory, draftSearch],
  );
  const filteredListings = useMemo(() => {
    if (!appliedSearch) return listingInventory.filter((listing) => listing.status === "approved");
    return listingInventory.filter((listing) => matchesSearch(listing, appliedSearch));
  }, [listingInventory, appliedSearch]);
  const marketAverage = useMemo(() => {
    if (!advanced.municipality) return null;
    const rows = advanced.neighborhood
      ? marketAverages?.byNeighborhood
      : marketAverages?.byMunicipality;
    return rows?.find((row) =>
      row.municipality === advanced.municipality &&
      (!advanced.neighborhood || row.neighborhood === advanced.neighborhood),
    ) ?? null;
  }, [marketAverages, advanced.municipality, advanced.neighborhood]);
  const mapBaseSearch = useMemo<SearchSnapshot>(
    () => ({ ...draftSearch, map: createEmptyMapFilter() }),
    [draftSearch],
  );
  const mapPins = useMemo(
    () => listingInventory.filter((listing) => listing.city === "Скопје" && matchesSearch(listing, mapBaseSearch)),
    [listingInventory, mapBaseSearch],
  );
  const focusedMapListing = mapPins.find((listing) => listing.id === mapFocusId) ?? null;

  function scrollToListings() {
    document.getElementById("oglasi")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    setAdvancedOpen(true);
  }
  function applyAdvancedFilters() {
    const snapshot: SearchSnapshot = {
      city: selectedCity,
      propertyType,
      publisherType,
      intent: mode,
      advanced: { ...advanced },
      map: { tool: mapFilter.tool, center: mapFilter.center ? { ...mapFilter.center } : null, radius: mapFilter.radius, polygon: mapFilter.polygon.map((point) => ({ ...point })) },
    };
    setAppliedSearch(snapshot);
    setAdvancedOpen(false);
    setNotice("Прикажуваме " + previewListings.length + " демо огласи според избраните критериуми.");
    window.setTimeout(scrollToListings, 80);
  }
  function resetAdvancedFilters() {
    setAdvanced(createEmptyAdvancedFilters());
    setMapFilter(createEmptyMapFilter());
    setMapFocusId(null);
  }
  function selectCategory(type: PropertyFilter) {
    setPropertyType(type);
    setAppliedSearch(null);
    setNotice("Избран е типот: " + (type === "all" ? "сите типови" : type.toLowerCase()) + ". Додадете детали со „Продолжи“.");
    window.setTimeout(scrollToListings, 50);
  }
  function redirectToSignIn() {
    router.push("/signin-with-chatgpt?return_to=/");
  }
  async function refreshFavorites() {
    const response = await fetch("/api/me/favorites");
    if (response.status === 401) {
      redirectToSignIn();
      return false;
    }
    if (!response.ok) return false;
    const payload = (await response.json()) as { listings?: ApiListing[] };
    const listings = Array.isArray(payload.listings) ? payload.listings : [];
    setFavoriteListings(listings);
    setServerFavoriteIds(listings.map((listing) => listing.id));
    return true;
  }
  async function loadAccount() {
    setAccountLoading(true);
    try {
      const profileResponse = await fetch("/api/me");
      if (profileResponse.status === 401) {
        redirectToSignIn();
        return;
      }
      if (!profileResponse.ok) {
        setNotice(await errorMessage(profileResponse, "Профилот не може да се вчита во моментов."));
        return;
      }

      const profilePayload = (await profileResponse.json()) as { profile: AccountProfile };
      setAccountProfile(profilePayload.profile);
      setAccountCreated(true);

      const [listingsResponse, dashboardResponse, favoritesResponse, offersResponse] = await Promise.all([
        fetch("/api/me/listings"),
        fetch("/api/me/dashboard"),
        fetch("/api/me/favorites"),
        fetch("/api/offers"),
      ]);
      if ([listingsResponse, dashboardResponse, favoritesResponse, offersResponse].some((response) => response.status === 401)) {
        redirectToSignIn();
        return;
      }

      if (listingsResponse.ok) {
        const payload = (await listingsResponse.json()) as { listings?: OwnerApiListing[] };
        setOwnedListings(Array.isArray(payload.listings) ? payload.listings : []);
      }
      if (dashboardResponse.ok) {
        const payload = (await dashboardResponse.json()) as DashboardData;
        setDashboard(payload);
      }
      if (favoritesResponse.ok) {
        const payload = (await favoritesResponse.json()) as { listings?: ApiListing[] };
        const listings = Array.isArray(payload.listings) ? payload.listings : [];
        setFavoriteListings(listings);
        setServerFavoriteIds(listings.map((listing) => listing.id));
      }
      if (offersResponse.ok) {
        const payload = (await offersResponse.json()) as { offers?: AccountOffer[] };
        setAccountOffers(Array.isArray(payload.offers) ? payload.offers : []);
      }
    } catch {
      setNotice("Профилот не може да се вчита. Обидете се повторно.");
    } finally {
      setAccountLoading(false);
    }
  }
  function openAccount() {
    setAccountOpen(true);
    void loadAccount();
  }
  function closeAdmin() {
    adminRequestIdRef.current += 1;
    setAdminOpen(false);
    setAdminLoading(false);
    setAdminMutatingListingId(null);
  }
  async function loadAdminListings(status: AdminStatus, requestId?: number) {
    const activeRequestId = requestId ?? adminRequestIdRef.current + 1;
    if (requestId === undefined) adminRequestIdRef.current = activeRequestId;
    setAdminFilter(status);
    setAdminLoading(true);
    setAdminError("");
    try {
      const response = await fetch("/api/admin/listings?status=" + encodeURIComponent(status));
      if (response.status === 401) {
        if (activeRequestId === adminRequestIdRef.current) closeAdmin();
        redirectToSignIn();
        return;
      }
      if (response.status === 403) {
        if (activeRequestId === adminRequestIdRef.current) {
          setAdminAccess("denied");
          setAdminListings([]);
        }
        return;
      }
      if (!response.ok) {
        if (activeRequestId === adminRequestIdRef.current) {
          setAdminError(await errorMessage(response, "Огласите не може да се вчитаат."));
        }
        return;
      }

      const payload = (await response.json()) as { listings?: OwnerApiListing[] };
      if (activeRequestId === adminRequestIdRef.current) {
        setAdminListings(Array.isArray(payload.listings) ? payload.listings : []);
        setAdminAccess("granted");
      }
    } catch {
      if (activeRequestId === adminRequestIdRef.current) {
        setAdminError("Огласите не може да се вчитаат. Обидете се повторно.");
      }
    } finally {
      if (activeRequestId === adminRequestIdRef.current) setAdminLoading(false);
    }
  }
  async function openAdmin() {
    const requestId = adminRequestIdRef.current + 1;
    adminRequestIdRef.current = requestId;
    setAdminOpen(true);
    setAdminFilter("pending");
    setAdminAccess("checking");
    setAdminLoading(true);
    setAdminError("");
    setAdminActionMessage("");
    setAdminListings([]);
    setAdminSection("listings");
    try {
      const response = await fetch("/api/me");
      if (response.status === 401) {
        if (requestId === adminRequestIdRef.current) closeAdmin();
        redirectToSignIn();
        return;
      }
      if (!response.ok) {
        if (requestId === adminRequestIdRef.current) {
          setAdminAccess("error");
          setAdminError(await errorMessage(response, "Администраторскиот пристап не може да се провери."));
        }
        return;
      }

      const payload = (await response.json()) as CurrentUserPayload;
      if (requestId !== adminRequestIdRef.current) return;
      if (!payload.permissions?.canModerateListings) {
        setAdminAccess("denied");
        return;
      }

      setAdminAccess("granted");
      await loadAdminListings("pending", requestId);
    } catch {
      if (requestId === adminRequestIdRef.current) {
        setAdminAccess("error");
        setAdminError("Администраторскиот пристап не може да се провери. Обидете се повторно.");
      }
    } finally {
      if (requestId === adminRequestIdRef.current) setAdminLoading(false);
    }
  }
  async function moderateListing(id: string, status: "approved" | "rejected" | "archived") {
    const requestId = adminRequestIdRef.current;
    const note = adminNote.trim() || null;
    setAdminMutatingListingId(id);
    setAdminError("");
    setAdminActionMessage("");
    try {
      const response = await fetch("/api/admin/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: id,
          status,
          note,
        }),
      });
      if (response.status === 401) {
        if (requestId === adminRequestIdRef.current) closeAdmin();
        redirectToSignIn();
        return;
      }
      if (response.status === 403) {
        if (requestId === adminRequestIdRef.current) setAdminAccess("denied");
        return;
      }
      if (!response.ok) {
        if (requestId === adminRequestIdRef.current) {
          setAdminError(await errorMessage(response, "Промената не може да се зачува."));
        }
        return;
      }
      if (requestId !== adminRequestIdRef.current) return;

      setAdminNote("");
      setAdminActionMessage(
        status === "approved"
          ? "Огласот е одобрен и е достапен во јавното пребарување."
          : status === "rejected"
            ? note
              ? "Огласот е одбиен со забелешката што ја внесовте."
              : "Огласот е одбиен."
            : "Огласот е архивиран и веќе не е јавен.",
      );
      setAdminMutatingListingId(null);
      await loadAdminListings(adminFilter);
    } catch {
      if (requestId === adminRequestIdRef.current) {
        setAdminError("Промената не може да се зачува. Обидете се повторно.");
      }
    } finally {
      if (requestId === adminRequestIdRef.current) setAdminMutatingListingId(null);
    }
  }
  async function loadAdminOrganizations(status: OrganizationStatus) {
    setOrganizationFilter(status);
    setAdminLoading(true);
    setAdminError("");
    try {
      const response = await fetch("/api/admin/organizations?status=" + encodeURIComponent(status));
      if (!response.ok) { setAdminError(await errorMessage(response, "Организациите не може да се вчитаат.")); return; }
      const payload = (await response.json()) as { organizations?: AdminOrganization[] };
      setAdminOrganizations(Array.isArray(payload.organizations) ? payload.organizations : []);
    } catch { setAdminError("Организациите не може да се вчитаат. Обидете се повторно."); }
    finally { setAdminLoading(false); }
  }
  async function moderateOrganization(id: string, status: "verified" | "suspended") {
    setAdminMutatingOrganizationId(id);
    setAdminError("");
    try {
      const response = await fetch("/api/admin/organizations", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ organizationId: id, status }) });
      if (!response.ok) { setAdminError(await errorMessage(response, "Промената не може да се зачува.")); return; }
      setAdminActionMessage(status === "verified" ? "Организацијата е потврдена." : "Организацијата е суспендирана.");
      await loadAdminOrganizations(organizationFilter);
    } catch { setAdminError("Промената не може да се зачува. Обидете се повторно."); }
    finally { setAdminMutatingOrganizationId(null); }
  }
  function openListingDetails(id: string) {
    setDetailListingId(id);
    if (persistedListingIds.includes(id)) {
      void fetch("/api/listings/" + encodeURIComponent(id) + "/view", { method: "POST" });
    }
  }
  function openOfferForm() {
    if (!offerListing) return;
    setOfferForm(createEmptyOfferForm());
    setOfferFeedback("");
    setOfferOpen(true);
  }
  async function handleOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!offerListing) {
      setOfferOpen(false);
      return;
    }

    const amount = Number(offerForm.amount);
    if (offerForm.kind === "offer" && (!Number.isFinite(amount) || amount <= 0 || !Number.isSafeInteger(Math.round(amount * 100)))) {
      setOfferFeedback("Внесете точен износ на понудата во евра.");
      return;
    }

    setOfferSubmitting(true);
    setOfferFeedback("");
    try {
      const response = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: offerListing.id,
          kind: offerForm.kind,
          amountCents: offerForm.kind === "offer" ? Math.round(amount * 100) : null,
          message: offerForm.message.trim(),
        }),
      });
      if (response.status === 401) {
        setOfferOpen(false);
        redirectToSignIn();
        return;
      }
      if (!response.ok) {
        setOfferFeedback(await errorMessage(response, "Пораката не може да се испрати."));
        return;
      }

      setOfferFeedback(offerForm.kind === "offer" ? "Понудата е испратена до огласувачот." : "Пораката е испратена до огласувачот.");
      setOfferForm(createEmptyOfferForm());
      if (accountCreated) void loadAccount();
    } catch {
      setOfferFeedback("Пораката не може да се испрати. Обидете се повторно.");
    } finally {
      setOfferSubmitting(false);
    }
  }

  async function updateOfferStatus(
    offerId: string,
    status: "accepted" | "declined" | "withdrawn",
  ) {
    setOfferMutatingId(offerId);
    try {
      const response = await fetch(`/api/offers/${offerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (response.status === 401) {
        redirectToSignIn();
        return;
      }
      if (!response.ok) {
        setNotice(await errorMessage(response, "Статусот на понудата не е променет."));
        return;
      }
      setAccountOffers((current) => current.map((offer) => (
        offer.id === offerId ? { ...offer, status } : offer
      )));
      setNotice(
        status === "accepted"
          ? "Понудата е прифатена."
          : status === "declined"
            ? "Понудата е одбиена."
            : "Понудата е повлечена.",
      );
    } catch {
      setNotice("Статусот на понудата не е променет. Обидете се повторно.");
    } finally {
      setOfferMutatingId(null);
    }
  }
  async function toggleFavorite(id: string) {
    if (!persistedListingIds.includes(id)) {
      setFixtureFavoriteIds((current) => current.includes(id) ? current.filter((favoriteId) => favoriteId !== id) : [...current, id]);
      setNotice("Демо огласот е зачуван само во оваа сесија.");
      return;
    }

    const saved = serverFavoriteIds.includes(id);
    try {
      const response = saved
        ? await fetch("/api/me/favorites?listingId=" + encodeURIComponent(id), { method: "DELETE" })
        : await fetch("/api/me/favorites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ listingId: id }),
          });
      if (response.status === 401) {
        redirectToSignIn();
        return;
      }
      if (!response.ok) {
        setNotice(await errorMessage(response, "Омилениот оглас не може да се зачува."));
        return;
      }
      setServerFavoriteIds((current) => saved ? current.filter((favoriteId) => favoriteId !== id) : [...new Set([...current, id])]);
      void refreshFavorites();
    } catch {
      setNotice("Омилениот оглас не може да се зачува. Обидете се повторно.");
    }
  }
  function updateAdvanced<K extends keyof AdvancedFilters>(key: K, value: AdvancedFilters[K]) {
    setAdvanced((current) => ({ ...current, [key]: value }));
  }
  function chooseMunicipality(value: string) {
    setAdvanced((current) => ({ ...current, municipality: value, neighborhood: "" }));
  }
  function setMapTool(tool: MapTool) {
    setMapFilter((current) => ({ ...current, tool, center: tool === "radius" ? current.center : null, polygon: tool === "polygon" ? current.polygon : [] }));
    setMapFocusId(null);
  }
  function getMapPoint(event: ReactPointerEvent<SVGSVGElement>): MapPoint {
    const bounds = mapRef.current?.getBoundingClientRect();
    if (!bounds) return { x: 50, y: 35 };
    return { x: Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100)), y: Math.max(0, Math.min(70, ((event.clientY - bounds.top) / bounds.height) * 70)) };
  }
  function handleMapPointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (selectedCity !== "Скопје") return;
    const point = getMapPoint(event);
    if (mapFilter.tool === "radius") {
      setMapFilter((current) => ({ ...current, center: point }));
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    setMapFocusId(null);
    setMapFilter((current) => ({ ...current, polygon: [point] }));
    setIsDrawingMap(true);
  }
  function handleMapPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (!isDrawingMap || mapFilter.tool !== "polygon") return;
    const point = getMapPoint(event);
    setMapFilter((current) => {
      const lastPoint = current.polygon[current.polygon.length - 1];
      if (lastPoint && Math.hypot(lastPoint.x - point.x, lastPoint.y - point.y) < 1.4) return current;
      return { ...current, polygon: [...current.polygon, point] };
    });
  }
  function handleMapPointerUp(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setIsDrawingMap(false);
  }
  async function handlePublish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const price = Number(publishForm.price);
    const areaM2 = Number(publishForm.areaM2);
    if (!Number.isFinite(price) || price <= 0 || !Number.isSafeInteger(Math.round(price * 100))) {
      setNotice("Внесете валидна точна цена за огласот.");
      return;
    }
    if (!Number.isInteger(areaM2) || areaM2 <= 0) {
      setNotice("Внесете точна квадратура во цели m².");
      return;
    }

    const builtYear = Number(publishForm.year);
    if (publishForm.construction === "built" && (!Number.isInteger(builtYear) || builtYear < 1800 || builtYear > 2100)) {
      setNotice("Внесете валидна година на градба.");
      return;
    }
    const latitude = publishForm.latitude.trim() ? Number(publishForm.latitude) : null;
    const longitude = publishForm.longitude.trim() ? Number(publishForm.longitude) : null;
    if ((latitude == null) !== (longitude == null) || (latitude != null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180))) {
      setNotice("Внесете точни координати заедно, или оставете ги двете полиња празни.");
      return;
    }
    const photoUrls = publishForm.photoUrls.split(/\n|,/).map((value) => value.trim()).filter(Boolean);
    if (photoUrls.length > 6 || photoUrls.some((value) => !/^https:\/\//.test(value))) {
      setNotice("Внесете до 6 безбедни HTTPS линкови за фотографии.");
      return;
    }

    setPublishing(true);
    try {
      const response = await fetch(editingListingId ? "/api/me/listings/" + encodeURIComponent(editingListingId) : "/api/listings", {
        method: editingListingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: publishForm.title.trim(),
          intent: publishForm.intent,
          propertyType: publishForm.propertyType,
          publisherType: publishForm.publisherType,
          priceAmountCents: Math.round(price * 100),
          currency: "EUR",
          pricePeriod: publishForm.intent === "rent" ? "monthly" : "total",
          city: selectedCity,
          municipality: publishForm.municipality || null,
          neighborhood: publishForm.neighborhood || null,
          addressLine: publishForm.address.trim(),
          exactLocationPublic: false,
          latitudeE6: latitude == null ? null : Math.round(latitude * 1_000_000),
          longitudeE6: longitude == null ? null : Math.round(longitude * 1_000_000),
          areaM2,
          constructionState: publishForm.construction,
          builtYear: publishForm.construction === "built" ? builtYear : null,
          features: [],
          photoUrls,
        }),
      });
      if (response.status === 401) {
        redirectToSignIn();
        return;
      }
      if (!response.ok) {
        setNotice(await errorMessage(response, "Огласот не може да се испрати на проверка."));
        return;
      }

      const payload = (await response.json()) as { listing?: OwnerApiListing };
      const createdListing = payload.listing;
      if (createdListing) {
        setOwnedListings((current) => [createdListing, ...current.filter((listing) => listing.id !== createdListing.id)]);
      }
      setPublishOpen(false);
      setEditingListingId(null);
      setPublishForm(createEmptyPublishForm());
      setNotice(editingListingId ? "Измените се зачувани и огласот повторно чека админ-проверка." : "Огласот е зачуван со точна цена, адреса и квадратура и сега чека админ-проверка.");
    } catch {
      setNotice("Огласот не може да се испрати. Обидете се повторно.");
    } finally {
      setPublishing(false);
    }
  }
  function openEditListing(listing: OwnerApiListing) {
    setEditingListingId(listing.id);
    setPublishForm({
      title: listing.title, propertyType: listing.propertyType as PropertyType, intent: listing.intent,
      publisherType: listing.publisherType, price: String(listing.priceAmountCents / 100),
      areaM2: String(listing.areaM2), address: listing.addressLine,
      municipality: listing.municipality ?? "", neighborhood: listing.neighborhood ?? "",
      construction: listing.constructionState, year: listing.builtYear == null ? "" : String(listing.builtYear),
      latitude: listing.latitudeE6 == null ? "" : String(listing.latitudeE6 / 1_000_000),
      longitude: listing.longitudeE6 == null ? "" : String(listing.longitudeE6 / 1_000_000),
      photoUrls: (listing.photoUrls ?? []).join("\n"),
    });
    setAccountOpen(false);
    setPublishOpen(true);
  }
  function filterByPartner(type: PublisherType) {
    setPublisherType(type);
    setAppliedSearch({ city: selectedCity, propertyType: "all", publisherType: type, intent: mode, advanced: createEmptyAdvancedFilters(), map: createEmptyMapFilter() });
    setNotice("Ги прикажуваме демо огласите од избраниот тип огласувач.");
    window.setTimeout(scrollToListings, 70);
  }

  return (
    <div className="doma-app">
      <header className="doma-header">
        <div className="doma-shell doma-header__inner">
          <a className="doma-logo" href="#pocetna" aria-label="DOMA, почетна"><span className="doma-logo__mark" aria-hidden="true"><span /><span /><span /></span>DOMA</a>
          <nav className="doma-nav" aria-label="Главна навигација">
            <a href="#oglasi" onClick={() => setMode("sale")}>Купи</a>
            <a href="#oglasi" onClick={() => setMode("rent")}>Изнајми</a>
            <a href="#partneri">Партнери</a>
            <button type="button" className="doma-nav__button" onClick={() => void openAdmin()}>Админ</button>
          </nav>
          <div className="doma-header__actions">
            <button className="button button--quiet" type="button" onClick={() => setPublishOpen(true)}>Објави оглас</button>
            <button className="button button--header" type="button" onClick={openAccount}>{accountCreated ? "Мој профил" : "Најави се"}</button>
          </div>
          <button className="doma-menu-button" type="button" aria-label={menuOpen ? "Затвори мени" : "Отвори мени"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}><Icon name={menuOpen ? "close" : "menu"} size={22} /></button>
        </div>
        {menuOpen && (
          <nav className="doma-mobile-nav" aria-label="Мобилна навигација">
            <a href="#oglasi" onClick={() => { setMode("sale"); setMenuOpen(false); }}>Купи</a>
            <a href="#oglasi" onClick={() => { setMode("rent"); setMenuOpen(false); }}>Изнајми</a>
            <a href="#partneri" onClick={() => setMenuOpen(false)}>Партнери</a>
            <button className="button button--primary" type="button" onClick={() => { setPublishOpen(true); setMenuOpen(false); }}>Објави оглас</button>
            <button className="button button--ghost-light" type="button" onClick={() => { void openAdmin(); setMenuOpen(false); }}>Админ</button>
          </nav>
        )}
      </header>

      <main id="pocetna">
        <section className="doma-hero" aria-labelledby="hero-title">
          <div className="doma-hero__image" aria-hidden="true"><Image src="/images/doma-hero.png" alt="" fill priority sizes="100vw" className="doma-hero__photo" /></div>
          <div className="doma-shell doma-hero__content">
            <p className="eyebrow eyebrow--light">НЕДВИЖНОСТИ ВО МАКЕДОНИЈА</p>
            <h1 id="hero-title">Почнете едноставно. Пребарајте прецизно.</h1>
            <p className="doma-hero__intro">Прво изберете град, тип на имот и огласувач. Во вториот чекор добивате локација, детали и мапа — без филтер за буџет.</p>
            <form className="search-panel" onSubmit={handleSearch}>
              <div className="search-panel__top">
                <div className="mode-switch" role="group" aria-label="Тип на пребарување">
                  <button className={mode === "sale" ? "mode-switch__button is-active" : "mode-switch__button"} type="button" aria-pressed={mode === "sale"} onClick={() => setMode("sale")}>Купување</button>
                  <button className={mode === "rent" ? "mode-switch__button is-active" : "mode-switch__button"} type="button" aria-pressed={mode === "rent"} onClick={() => setMode("rent")}>Изнајмување</button>
                </div>
                <span className="search-panel__mode-label">Чекор 1 од 2 · {searchLabel}</span>
              </div>
              <div className="search-panel__fields">
                <label className="search-field search-field--location"><span>Град</span><span className="search-field__control"><Icon name="pin" size={18} /><select value={selectedCity} onChange={(event) => setSelectedCity(event.target.value)} aria-label="Град">{macedonianCities.map((city) => <option key={city}>{city}</option>)}</select><Icon name="chevron" size={16} /></span></label>
                <label className="search-field"><span>Тип на имот</span><span className="search-field__control"><select value={propertyType} onChange={(event) => setPropertyType(event.target.value as PropertyFilter)} aria-label="Тип на имот">{propertyOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><Icon name="chevron" size={16} /></span></label>
                <label className="search-field search-field--publisher"><span>Објавувач</span><span className="search-field__control"><select value={publisherType} onChange={(event) => setPublisherType(event.target.value as PublisherFilter)} aria-label="Кој го објавува огласот">{publisherOptions.map((publisher) => <option key={publisher.value} value={publisher.value}>{publisher.label}</option>)}</select><Icon name="chevron" size={16} /></span></label>
                <button className="button button--search" type="submit">Продолжи <Icon name="arrow" size={18} /></button>
              </div>
            </form>
          </div>
          <div className="doma-hero__bottom-note">ДЕМО ПЛАТФОРМА · БЕЗ БУЏЕТ ВО ПОЧЕТНИОТ ИЗБОР</div>
        </section>

        {notice && <div className="doma-notice-wrap" aria-live="polite"><div className="doma-notice"><Icon name="check" size={18} /><span>{notice}</span><button type="button" aria-label="Затвори известување" onClick={() => setNotice("")}><Icon name="close" size={15} /></button></div></div>}

        <section id="kategorii" className="doma-section doma-section--categories">
          <div className="doma-shell">
            <div className="section-heading section-heading--split"><div><p className="eyebrow">ПОБРЗ ПОЧЕТОК</p><h2>Изберете го видот што го барате.</h2></div><button className="text-link text-link--desktop" type="button" onClick={() => setAdvancedOpen(true)}>Сите филтри <Icon name="arrow" size={17} /></button></div>
            <div className="category-grid">{categories.map((category) => <button className="category-card" type="button" key={category.name} onClick={() => selectCategory(category.type)}><span className="category-card__icon"><Icon name={category.icon} size={23} /></span><span className="category-card__text"><strong>{category.name}</strong><small>{category.description}</small></span><span className="category-card__arrow"><Icon name="arrow" size={18} /></span></button>)}</div>
          </div>
        </section>

        <section id="oglasi" className="doma-section doma-section--listings">
          <div className="doma-shell">
            <div className="section-heading section-heading--split">
              <div><p className="eyebrow">ПОНУДА ВО СКОПЈЕ</p><h2>{appliedSearch ? "Резултати според вашиот избор." : "Повеќе различни демо огласи на едно место."}</h2><p className="listing-filter-summary">{appliedSearch ? searchLabel + " · " + selectedCity + " · " + (propertyType === "all" ? "сите типови" : propertyType) + " · " + publisherLabels[publisherType] : "Примерни станови, куќи, соба, гаража и деловен простор од различни делови на Скопје."}</p></div>
              <button className="button button--outline" type="button" onClick={() => setAdvancedOpen(true)}><Icon name="filter" size={18} /> Промени филтри</button>
            </div>
            {appliedSearch && <div className="result-toolbar"><span><strong>{filteredListings.length}</strong> огласи</span><button type="button" onClick={() => { setAppliedSearch(null); resetAdvancedFilters(); }}>Исчисти пребарување</button></div>}
            <div className="listing-grid">{filteredListings.length > 0 ? filteredListings.map((listing) => <ListingCard key={listing.id} listing={listing} favorite={favoriteIds.includes(listing.id)} onFavorite={() => void toggleFavorite(listing.id)} onOpen={() => openListingDetails(listing.id)} />) : <div className="listing-empty">Нема одобрени огласи со оваа комбинација. Пробајте друга општина, тип или исчистете ја нацртаната зона на мапата.</div>}</div>
            <p className="demo-note">Примерните демо огласи остануваат за проверка на искуството; новите одобрени огласи се вчитуваат од базата.</p>
          </div>
        </section>

        <section id="partneri" className="doma-section doma-section--partners">
          <div className="doma-shell">
            <div className="section-heading"><p className="eyebrow">ПАРТНЕРИ · ДЕМО ПОДАТОЦИ</p><h2>Агенции и градежни компании на почетната.</h2><p className="listing-filter-summary">Првите три се нагласени според примерен број отворања на нивните огласи во последни 30 дена.</p></div>
            <div className="partner-section">
              <div className="partner-section__heading"><div><span className="partner-section__icon"><Icon name="building" size={18} /></span><h3>Активни агенции</h3></div><button type="button" onClick={() => filterByPartner("agency")}>Види ги огласите <Icon name="arrow" size={16} /></button></div>
              <div className="partner-rail">{agencyPartners.map((partner, index) => <article className={index < 3 ? "partner-card is-featured" : "partner-card"} key={partner.name}>{index < 3 && <span className="partner-card__top">Најпосетувана</span>}<span className="partner-card__logo">{partner.initial}</span><strong>{partner.name}</strong><small>{partner.listings + " активни демо огласи"}</small><span className="partner-card__views"><Icon name="eye" size={14} />{partner.views.toLocaleString("mk-MK") + " прегледи"}</span></article>)}</div>
            </div>
            <div className="partner-section">
              <div className="partner-section__heading"><div><span className="partner-section__icon partner-section__icon--warm"><Icon name="home" size={18} /></span><h3>Градежни компании</h3></div><button type="button" onClick={() => filterByPartner("developer")}>Види ги огласите <Icon name="arrow" size={16} /></button></div>
              <div className="partner-rail">{developerPartners.map((partner, index) => <article className={index < 3 ? "partner-card is-featured partner-card--developer" : "partner-card partner-card--developer"} key={partner.name}>{index < 3 && <span className="partner-card__top">Најпосетувана</span>}<span className="partner-card__logo">{partner.initial}</span><strong>{partner.name}</strong><small>{partner.listings + " активни демо огласи"}</small><span className="partner-card__views"><Icon name="eye" size={14} />{partner.views.toLocaleString("mk-MK") + " прегледи"}</span></article>)}</div>
            </div>
          </div>
        </section>

        <section className="doma-section doma-section--principles">
          <div className="doma-shell principles-grid">
            <div className="principles-intro"><p className="eyebrow">КАКО РАБОТИ</p><h2>Податоците треба да помагаат при одлука, не да пречат.</h2></div>
            <div className="principle-list">
              <article><span>01</span><div><h3>Прво едноставен избор</h3><p>Град, вид на имот и огласувач. Нема буџет во почетниот екран.</p></div></article>
              <article><span>02</span><div><h3>Потоа прецизни детали</h3><p>Општина, населба, градба, квадратура, кат, лифт, паркинг, греење, ладење и мапа.</p></div></article>
              <article><span>03</span><div><h3>Јасна проверка</h3><p>Секој нов демо оглас бара цена и точна адреса пред да влезе во админ-проверка.</p></div></article>
            </div>
          </div>
        </section>

        <section className="doma-cta">
          <div className="doma-shell doma-cta__inner"><div><p className="eyebrow eyebrow--light">ЗА СОПСТВЕНИЦИ, АГЕНЦИИ И ИНВЕСТИТОРИ</p><h2>Објавете имот со податоци што се навистина корисни.</h2><p>За нов оглас се задолжителни точна цена, адреса, квадратура и статус на градба. Профилот безбедно се врзува со вашата најава.</p></div><div className="doma-cta__actions"><button className="button button--light" type="button" onClick={() => setPublishOpen(true)}>Објавете оглас <Icon name="arrow" size={18} /></button><button className="button button--ghost-light" type="button" onClick={openAccount}>Мој профил</button></div></div>
        </section>
      </main>

      <footer className="doma-footer"><div className="doma-shell doma-footer__inner"><a className="doma-logo doma-logo--footer" href="#pocetna" aria-label="DOMA, почетна"><span className="doma-logo__mark" aria-hidden="true"><span /><span /><span /></span>DOMA</a><p>Платформа за појасно пребарување недвижности во Македонија.</p><nav className="footer-links" aria-label="Правни информации"><a href="/privacy">Приватност</a><a href="/terms">Услови</a></nav><button className="footer-admin-link" type="button" onClick={() => void openAdmin()}>Отвори админ</button><span>© 2026 DOMA</span></div></footer>

      {advancedOpen && (
        <div className="workflow-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setAdvancedOpen(false); }}>
          <section className="workflow-dialog" role="dialog" aria-modal="true" aria-labelledby="advanced-title">
            <header className="workflow-dialog__header"><div><p>ЧЕКОР 2 ОД 2</p><h2 id="advanced-title">Детали за вашето пребарување</h2><div className="selection-chips" aria-label="Основен избор"><span>{selectedCity}</span><span>{propertyType === "all" ? "Сите типови" : propertyType}</span><span>{publisherLabels[publisherType]}</span><span>{searchLabel}</span></div></div><button className="dialog-close" type="button" aria-label="Затвори напредни филтри" onClick={() => setAdvancedOpen(false)}><Icon name="close" size={19} /></button></header>
            <div className="workflow-dialog__content">
              <div className="advanced-layout">
                <section className="advanced-filters" aria-labelledby="location-filter-title">
                  <div className="advanced-section-heading"><span><Icon name="filter" size={18} /></span><div><h3 id="location-filter-title">Локација и карактеристики</h3><p>Изберете само што ви е важно.</p></div></div>
                  <div className="advanced-filter-grid">
                    <label className="field-block"><span>Општина</span><select value={advanced.municipality} onChange={(event) => chooseMunicipality(event.target.value)} disabled={selectedCity !== "Скопје"}><option value="">Сите општини</option>{skopjeMunicipalities.map((item) => <option key={item.name}>{item.name}</option>)}</select></label>
                    <label className="field-block"><span>Населба</span><select value={advanced.neighborhood} onChange={(event) => updateAdvanced("neighborhood", event.target.value)} disabled={!advanced.municipality || selectedCity !== "Скопје"}><option value="">Сите населби</option>{visibleNeighborhoods.map((neighborhood) => <option key={neighborhood}>{neighborhood}</option>)}</select></label>
                    <label className="field-block"><span>Состојба на градба</span><select value={advanced.construction} onChange={(event) => updateAdvanced("construction", event.target.value as AdvancedFilters["construction"])}><option value="all">Сеедно</option><option value="built">Изградено</option><option value="in_progress">Во тек на градба</option></select></label>
                    <label className="field-block"><span>Кат</span><select value={advanced.floor} onChange={(event) => updateAdvanced("floor", event.target.value as AdvancedFilters["floor"])}><option value="all">Сите катови</option><option value="lower">Приземје до 3 кат</option><option value="upper">4 кат и погоре</option></select></label>
                    <label className="field-block"><span>Минимална квадратура</span><input type="number" min="0" inputMode="numeric" placeholder="на пр. 60" value={advanced.minArea} onChange={(event) => updateAdvanced("minArea", event.target.value)} /></label>
                    <label className="field-block"><span>Максимална квадратура</span><input type="number" min="0" inputMode="numeric" placeholder="на пр. 120" value={advanced.maxArea} onChange={(event) => updateAdvanced("maxArea", event.target.value)} /></label>
                    <label className="field-block"><span>Лифт</span><select value={advanced.elevator} onChange={(event) => updateAdvanced("elevator", event.target.value as AdvancedFilters["elevator"])}><option value="all">Сеедно</option><option value="yes">Со лифт</option><option value="no">Без лифт</option></select></label>
                    <label className="field-block"><span>Паркинг</span><select value={advanced.parking} onChange={(event) => updateAdvanced("parking", event.target.value as AdvancedFilters["parking"])}><option value="all">Сеедно</option><option value="yes">Со паркинг</option></select></label>
                    <label className="field-block"><span>Греење</span><select value={advanced.heating} onChange={(event) => updateAdvanced("heating", event.target.value)}><option value="all">Сите видови</option><option>Централно</option><option>Подно греење</option><option>Гасно греење</option><option>Електрично</option><option>Печка на пелети</option><option>Топлотна пумпа</option></select></label>
                    <label className="field-block"><span>Ладење</span><select value={advanced.cooling} onChange={(event) => updateAdvanced("cooling", event.target.value)}><option value="all">Сите видови</option><option>Инвертер клима</option><option>Мулти-сплит систем</option><option>Топлотна пумпа</option></select></label>
                  </div>
                  {advanced.municipality && <aside className="market-insight" aria-live="polite"><span className="market-insight__label">{advanced.neighborhood ? "Населба " + advanced.neighborhood : "Општина " + advanced.municipality}</span>{marketAveragesLoading ? <strong>Се пресметува просекот од одобрени огласи…</strong> : marketAverage && marketAverage.sampleCount > 0 ? <strong>Просек: {formatEuro(marketAverage.averagePricePerM2Cents / 100).replace(" €", "")} €/m²{mode === "rent" ? " месечно" : ""}</strong> : <strong>Сè уште нема одобрени огласи во базата за овој избор.</strong>}<small>{marketAverage?.sampleCount ?? 0} одобрени огласи во базата · {searchLabel.toLowerCase()}</small></aside>}
                </section>
                <aside className="map-teaser"><span className="map-teaser__icon"><Icon name="map" size={21} /></span><p className="eyebrow">ПРЕБАРУВАЊЕ НА МАПА</p><h3>Нацртајте област или поставете радиус.</h3><p>Изберете дел од градот со слободно повлекување линија или со круг околу точка.</p><ul><li>{mapFilter.tool === "radius" && mapFilter.center ? "Радиус е поставен" : mapFilter.tool === "polygon" && mapFilter.polygon.length >= 3 ? "Област е нацртана" : "Нема избрана зона"}</li><li>{previewListings.length + " огласи во тековниот избор"}</li></ul><button className="button button--primary" type="button" onClick={() => setMapOpen(true)}><Icon name="map" size={18} /> Отвори мапа</button><small>Координатите од огласите се прикажуваат во зоната на Скопје.</small></aside>
              </div>
            </div>
            <footer className="workflow-dialog__footer"><button className="dialog-reset" type="button" onClick={resetAdvancedFilters}>Ресетирај детали</button><div><span>{previewListings.length + " огласи подготвени за приказ"}</span><button className="button button--primary" type="button" onClick={applyAdvancedFilters}>Прикажи огласи <Icon name="arrow" size={18} /></button></div></footer>
          </section>
        </div>
      )}

      {mapOpen && (
        <div className="workflow-backdrop map-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setMapOpen(false); }}>
          <section className="map-dialog" role="dialog" aria-modal="true" aria-labelledby="map-title">
            <header className="map-dialog__header"><div><p>ЗОНА НА ПРЕБАРУВАЊЕ · СКОПЈЕ</p><h2 id="map-title">Изберете дел од {selectedCity}</h2></div><button className="dialog-close" type="button" aria-label="Затвори мапа" onClick={() => setMapOpen(false)}><Icon name="close" size={19} /></button></header>
            <div className="map-dialog__toolbar"><div className="map-tool-toggle" role="group" aria-label="Алатка за мапа"><button className={mapFilter.tool === "radius" ? "is-active" : ""} type="button" onClick={() => setMapTool("radius")}>Радиус</button><button className={mapFilter.tool === "polygon" ? "is-active" : ""} type="button" onClick={() => setMapTool("polygon")}>Нацртај зона</button></div>{mapFilter.tool === "radius" && <label className="map-radius-control"><span>Приближен радиус</span><input type="range" min="8" max="36" value={mapFilter.radius} onChange={(event) => setMapFilter((current) => ({ ...current, radius: Number(event.target.value) }))} /><strong>{(Math.round((mapFilter.radius / 5.7) * 10) / 10).toLocaleString("mk-MK") + " km"}</strong></label>}<button className="map-clear-button" type="button" onClick={() => { setMapFilter(createEmptyMapFilter()); setMapFocusId(null); }}>Избриши зона</button></div>
            <div className="map-stage">
              {selectedCity === "Скопје" ? <><svg ref={mapRef} className="skopje-map" viewBox="0 0 100 70" role="img" aria-label="Интерактивна мапа на Скопје" onPointerDown={handleMapPointerDown} onPointerMove={handleMapPointerMove} onPointerUp={handleMapPointerUp} onPointerCancel={handleMapPointerUp}><rect width="100" height="70" fill="#e8eee8" /><path d="M-3 42 C15 35 24 42 36 36 S61 39 78 31 S92 31 104 24" fill="none" stroke="#8db6c6" strokeWidth="2.7" /><path d="M8 13 C25 24 37 15 51 25 S72 21 92 15" fill="none" stroke="#c7d3c8" strokeWidth="1.5" strokeDasharray="2 2" /><path d="M14 64 C30 51 42 58 53 49 S79 55 95 45" fill="none" stroke="#cad3c8" strokeWidth="1.5" strokeDasharray="2 2" /><path d="M19 2 L30 68M46 0 L42 69M72 1 L63 69M2 24 L98 36M3 55 L98 47" fill="none" stroke="#f8fbf8" strokeWidth="1.3" opacity=".9" /><text x="18" y="20" className="skopje-map__label">ЃОРЧЕ</text><text x="34" y="28" className="skopje-map__label">КАРПОШ</text><text x="46" y="36" className="skopje-map__label">ЦЕНТАР</text><text x="68" y="42" className="skopje-map__label">АЕРОДРОМ</text><text x="54" y="15" className="skopje-map__label">БУТЕЛ</text>{mapFilter.tool === "radius" && mapFilter.center && <circle cx={mapFilter.center.x} cy={mapFilter.center.y} r={mapFilter.radius} className="skopje-map__radius" />}{mapFilter.tool === "polygon" && mapFilter.polygon.length > 1 && <polyline points={mapFilter.polygon.map((point) => point.x + "," + point.y).join(" ")} className="skopje-map__polygon" />}{mapFilter.tool === "polygon" && mapFilter.polygon.length > 2 && <polygon points={mapFilter.polygon.map((point) => point.x + "," + point.y).join(" ")} className="skopje-map__polygon-fill" />}</svg><div className="map-pin-layer" aria-label="Огласи на мапата">{mapPins.map((listing) => <button type="button" key={listing.id} className={mapFocusId === listing.id ? "map-pin is-active" : "map-pin"} style={{ left: listing.map.x + "%", top: (listing.map.y / 70) * 100 + "%" }} aria-label={listing.title + ", " + formatEuro(listing.priceEur)} onPointerDown={(event) => event.stopPropagation()} onClick={() => setMapFocusId(listing.id)}>{formatEuro(listing.priceEur).replace(" €", "€")}</button>)}</div>{focusedMapListing && <div className="map-preview-card"><button type="button" aria-label="Затвори преглед на мапа" onClick={() => setMapFocusId(null)}><Icon name="close" size={14} /></button><span>{focusedMapListing.municipality + " · " + focusedMapListing.neighborhood}</span><strong>{focusedMapListing.title}</strong><small>{formatEuro(focusedMapListing.priceEur) + " · " + focusedMapListing.areaM2 + " m²"}</small></div>}</> : <div className="map-not-ready"><Icon name="map" size={32} /><strong>Интерактивната зона моментално е достапна за Скопје.</strong><span>Основниот избор на град останува достапен за цела Македонија.</span></div>}
            </div>
            <footer className="map-dialog__footer"><span>{mapFilter.tool === "radius" ? "Кликнете на мапата за центар на радиус." : "Повлечете по мапата за да нацртате област."}</span><button className="button button--primary" type="button" onClick={() => setMapOpen(false)}>Потврди зона <Icon name="check" size={18} /></button></footer>
          </section>
        </div>
      )}

      {publishOpen && (
        <div className="workflow-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPublishOpen(false); }}>
          <section className="compact-dialog" role="dialog" aria-modal="true" aria-labelledby="publish-title">
            <header className="compact-dialog__header"><div><p>{editingListingId ? "УРЕДИ ОГЛАС" : "ОБЈАВИ ОГЛАС"}</p><h2 id="publish-title">{editingListingId ? "Изменете ги податоците и испратете на нова проверка." : "Внесете ги основните точни податоци."}</h2></div><button className="dialog-close" type="button" aria-label="Затвори форма за оглас" onClick={() => { setPublishOpen(false); setEditingListingId(null); }}><Icon name="close" size={19} /></button></header>
            <form className="publish-form" onSubmit={handlePublish}>
              <label className="field-block field-block--wide"><span>Наслов на оглас</span><input required placeholder="на пр. Трособен стан во Аеродром" value={publishForm.title} onChange={(event) => setPublishForm((current) => ({ ...current, title: event.target.value }))} /></label>
              <label className="field-block"><span>Тип</span><select value={publishForm.propertyType} onChange={(event) => setPublishForm((current) => ({ ...current, propertyType: event.target.value as PropertyType }))}>{propertyTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
              <label className="field-block"><span>Намена</span><select value={publishForm.intent} onChange={(event) => setPublishForm((current) => ({ ...current, intent: event.target.value as ListingIntent }))}><option value="sale">Продажба</option><option value="rent">Изнајмување</option></select></label>
              <label className="field-block"><span>Кој објавува</span><select value={publishForm.publisherType} onChange={(event) => setPublishForm((current) => ({ ...current, publisherType: event.target.value as PublisherType }))}><option value="owner">Приватен сопственик</option><option value="agency">Агенција</option><option value="developer">Инвеститор / фирма</option></select></label>
              <label className="field-block"><span>Точна цена во €</span><input required min="1" type="number" inputMode="decimal" placeholder="на пр. 142000" value={publishForm.price} onChange={(event) => setPublishForm((current) => ({ ...current, price: event.target.value }))} /></label>
              <label className="field-block"><span>Квадратура во m²</span><input required min="1" step="1" type="number" inputMode="numeric" placeholder="на пр. 74" value={publishForm.areaM2} onChange={(event) => setPublishForm((current) => ({ ...current, areaM2: event.target.value }))} /></label>
              <label className="field-block field-block--wide"><span>Точна адреса</span><input required placeholder="улица, број, општина, град" value={publishForm.address} onChange={(event) => setPublishForm((current) => ({ ...current, address: event.target.value }))} /></label>
              <label className="field-block"><span>Општина</span><select value={publishForm.municipality} onChange={(event) => setPublishForm((current) => ({ ...current, municipality: event.target.value, neighborhood: "" }))}>{skopjeMunicipalities.map((item) => <option key={item.name}>{item.name}</option>)}</select></label>
              <label className="field-block"><span>Населба</span><select value={publishForm.neighborhood} onChange={(event) => setPublishForm((current) => ({ ...current, neighborhood: event.target.value }))}>{(skopjeMunicipalities.find((item) => item.name === publishForm.municipality)?.neighborhoods ?? []).map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="field-block"><span>Состојба</span><select value={publishForm.construction} onChange={(event) => setPublishForm((current) => ({ ...current, construction: event.target.value as ConstructionState }))}><option value="built">Изградено</option><option value="in_progress">ВО ТЕК НА ГРАДБА</option></select></label>
              {publishForm.construction === "built" && <label className="field-block"><span>Година на градба</span><input required min="1800" max="2030" type="number" placeholder="на пр. 2018" value={publishForm.year} onChange={(event) => setPublishForm((current) => ({ ...current, year: event.target.value }))} /></label>}
              <label className="field-block"><span>Географска ширина (по избор)</span><input inputMode="decimal" placeholder="на пр. 41.9981" value={publishForm.latitude} onChange={(event) => setPublishForm((current) => ({ ...current, latitude: event.target.value }))} /></label>
              <label className="field-block"><span>Географска должина (по избор)</span><input inputMode="decimal" placeholder="на пр. 21.4254" value={publishForm.longitude} onChange={(event) => setPublishForm((current) => ({ ...current, longitude: event.target.value }))} /></label>
              <label className="field-block field-block--wide"><span>Линкови до фотографии (по еден HTTPS линк во ред, до 6)</span><textarea rows={4} placeholder="https://…/stan-1.jpg" value={publishForm.photoUrls} onChange={(event) => setPublishForm((current) => ({ ...current, photoUrls: event.target.value }))} /></label>
              <p className="form-helper">Фотографиите се прикажуваат во галеријата на огласот. Огласот се зачувува како „чека проверка“. За агенција или инвеститор е потребна претходно одобрена организација.</p>
              <div className="compact-dialog__actions"><button className="button button--outline" type="button" onClick={() => { setPublishOpen(false); setEditingListingId(null); }} disabled={publishing}>Откажи</button><button className="button button--primary" type="submit" disabled={publishing}>{publishing ? "Се испраќа…" : editingListingId ? "Испрати измени" : "Испрати на проверка"} <Icon name="arrow" size={18} /></button></div>
            </form>
          </section>
        </div>
      )}

      {offerOpen && offerListing && (
        <div className="workflow-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOfferOpen(false); }}>
          <section className="compact-dialog" role="dialog" aria-modal="true" aria-labelledby="offer-title">
            <header className="compact-dialog__header"><div><p>КОНТАКТИРАЈ ОГЛАСУВАЧ</p><h2 id="offer-title">{offerListing.title}</h2></div><button className="dialog-close" type="button" aria-label="Затвори форма за понуда" onClick={() => setOfferOpen(false)}><Icon name="close" size={19} /></button></header>
            <form className="offer-form" onSubmit={handleOffer}>
              <label className="field-block"><span>Што испраќате?</span><select value={offerForm.kind} onChange={(event) => setOfferForm((current) => ({ ...current, kind: event.target.value as OfferForm["kind"], amount: "" }))}><option value="inquiry">Порака / прашање</option><option value="offer">Конкретна понуда</option></select></label>
              {offerForm.kind === "offer" && <label className="field-block"><span>Вашата понуда во €</span><input required min="1" type="number" inputMode="decimal" placeholder="на пр. 145000" value={offerForm.amount} onChange={(event) => setOfferForm((current) => ({ ...current, amount: event.target.value }))} /></label>}
              <label className="field-block field-block--wide"><span>{offerForm.kind === "offer" ? "Порака со понудата" : "Порака"}</span><textarea required minLength={2} maxLength={2000} rows={5} placeholder="на пр. Здраво, заинтересиран/а сум за огласот. Дали е сè уште достапен?" value={offerForm.message} onChange={(event) => setOfferForm((current) => ({ ...current, message: event.target.value }))} /></label>
              <p className="form-helper">Огласувачот ќе ја види пораката во својот профил. Контакт-податоците не се прикажуваат јавно.</p>
              {offerFeedback && <p className={offerFeedback.includes("испрат") ? "offer-feedback offer-feedback--success" : "offer-feedback"}>{offerFeedback}</p>}
              <div className="compact-dialog__actions"><button className="button button--outline" type="button" onClick={() => setOfferOpen(false)} disabled={offerSubmitting}>Откажи</button><button className="button button--primary" type="submit" disabled={offerSubmitting}>{offerSubmitting ? "Се испраќа…" : offerForm.kind === "offer" ? "Испрати понуда" : "Испрати порака"} <Icon name="arrow" size={18} /></button></div>
            </form>
          </section>
        </div>
      )}

      {accountOpen && (
        <div className="workflow-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setAccountOpen(false); }}>
          <section className="account-dialog" role="dialog" aria-modal="true" aria-labelledby="account-title">
            <header className="compact-dialog__header">
              <div>
                <p>МОЈА DOMA</p>
                <h2 id="account-title">{accountLoading ? "Го вчитуваме вашиот профил." : accountCreated ? "Вашиот работен преглед" : "Најавете се за да продолжите."}</h2>
                {accountCreated && accountProfile && <span>{accountProfile.displayName ?? accountProfile.fullName ?? "Ваш профил"}</span>}
              </div>
              <button className="dialog-close" type="button" aria-label="Затвори профил" onClick={() => setAccountOpen(false)}><Icon name="close" size={19} /></button>
            </header>
            {accountLoading ? (
              <div className="account-create"><span className="account-create__icon"><Icon name="user" size={28} /></span><p>Ги вчитуваме вашите огласи, понуди и омилени.</p></div>
            ) : !accountCreated ? (
              <div className="account-create"><span className="account-create__icon"><Icon name="user" size={28} /></span><p>Вашиот профил безбедно се поврзува со ChatGPT најава. Не внесуваме име или е-пошта во формата.</p><button className="button button--primary" type="button" onClick={() => void loadAccount()}>Продолжи со најава <Icon name="arrow" size={18} /></button></div>
            ) : (
              <div className="account-workspace">
                <nav className="workspace-tabs" aria-label="Делови од профилот">
                  <button className={accountTab === "overview" ? "is-active" : ""} type="button" onClick={() => setAccountTab("overview")}>Преглед</button>
                  <button className={accountTab === "listings" ? "is-active" : ""} type="button" onClick={() => setAccountTab("listings")}>Мои огласи</button>
                  <button className={accountTab === "offers" ? "is-active" : ""} type="button" onClick={() => setAccountTab("offers")}>Понуди</button>
                  <button className={accountTab === "saved" ? "is-active" : ""} type="button" onClick={() => setAccountTab("saved")}>Омилени</button>
                </nav>
                {accountTab === "overview" && <div className="workspace-overview"><div className="metric-grid"><article><span>Мои огласи</span><strong>{dashboard?.listings.total ?? ownedListings.length}</strong><small>во вашиот профил</small></article><article><span>Прегледи</span><strong>{dashboard?.views.total ?? 0}</strong><small>единствени дневни посети</small></article><article><span>Нови понуди</span><strong>{dashboard?.offers.incoming ?? accountOffers.filter((offer) => offer.direction === "incoming").length}</strong><small>примени понуди</small></article><article><span>Зачувани</span><strong>{dashboard?.favorites ?? serverFavoriteIds.length}</strong><small>омилени огласи</small></article></div><div className="analytics-card"><div><span>Активност во последни 30 дена</span><strong>{dashboard?.views.last30Days ?? 0} единствени прегледи</strong><small>Се бројат само одобрени огласи и најмногу една посета по оглас дневно.</small></div>{dashboard?.activity.length ? <div className="bar-chart bar-chart--live" aria-label="Прегледи на најгледаните ваши огласи">{dashboard.activity.map((item) => <i key={item.listingId} title={item.title + ": " + item.views + " прегледи"} style={{ height: Math.max(18, Math.round((item.views / Math.max(...dashboard.activity.map((row) => row.views), 1)) * 100)) + "%" }} />)}</div> : <p className="analytics-card__empty">Кога ќе има прегледи на ваши огласи, ќе се појават тука.</p>}</div>{dashboard?.activity.length ? <div className="activity-list">{dashboard.activity.slice(0, 3).map((item) => <p key={item.listingId}><span>{item.title}</span><strong>{item.views} прегледи · {item.incomingOffers} понуди</strong></p>)}</div> : null}</div>}
                {accountTab === "listings" && <div className="workspace-list"><strong>Мои огласи</strong>{ownedListings.length ? ownedListings.map((listing) => <p key={listing.id}>{listing.title}<span>{ownerStatusLabel(listing.status)} · <button type="button" onClick={() => openEditListing(listing)}>Уреди</button></span></p>) : <p>Сè уште немате објавен оглас. <button type="button" onClick={() => { setAccountOpen(false); setPublishOpen(true); }}>Објавете еден</button>.</p>}</div>}
                {accountTab === "offers" && <div className="workspace-list"><strong>Понуди и пораки</strong>{accountOffers.length ? accountOffers.map((offer) => <article className="offer-row" key={offer.id}><div><span>{offer.direction === "incoming" ? "Примена" : "Испратена"} {offer.kind === "offer" ? "понуда" : "порака"}</span><p>{offer.message}</p><small>{offer.listingTitle}{offer.amountCents ? " · " + formatEuro(offer.amountCents / 100) : ""}</small></div><div className="offer-row__side"><em className={`offer-status offer-status--${offer.status}`}>{offer.status === "sent" ? "Во очекување" : offer.status === "accepted" ? "Прифатена" : offer.status === "declined" ? "Одбиена" : "Повлечена"}</em>{offer.status === "sent" && (offer.direction === "incoming" ? <div className="offer-row__actions"><button type="button" disabled={offerMutatingId === offer.id} onClick={() => void updateOfferStatus(offer.id, "accepted")}>Прифати</button><button className="offer-row__decline" type="button" disabled={offerMutatingId === offer.id} onClick={() => void updateOfferStatus(offer.id, "declined")}>Одбиј</button></div> : <button type="button" disabled={offerMutatingId === offer.id} onClick={() => void updateOfferStatus(offer.id, "withdrawn")}>{offerMutatingId === offer.id ? "Се зачувува…" : "Повлечи"}</button>)}</div></article>) : <p>Сè уште нема понуди или пораки.</p>}</div>}
                {accountTab === "saved" && <div className="workspace-list"><strong>Омилени огласи</strong>{favoriteListings.length ? favoriteListings.map((listing) => <p key={listing.id}>{listing.title}<span>{listing.city}</span></p>) : <p>{fixtureFavoriteIds.length ? fixtureFavoriteIds.length + " демо огласи се зачувани само во оваа сесија." : "Зачувајте оглас со срцето за да се појави тука."}</p>}</div>}
              </div>
            )}
          </section>
        </div>
      )}

      {adminOpen && (
        <div className="workflow-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeAdmin(); }}>
          <section className="admin-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-title">
            <header className="compact-dialog__header">
              <div>
                <p>АДМИН ПАНЕЛ</p>
                <h2 id="admin-title">Модерација на огласи</h2>
                <span className="admin-disclaimer">Пристапот и секоја промена се проверуваат на серверот. Неодобрениот оглас не е јавно видлив.</span>
              </div>
              <button className="dialog-close" type="button" aria-label="Затвори админ" onClick={closeAdmin}><Icon name="close" size={19} /></button>
            </header>
            {adminAccess === "checking" && <div className="admin-state"><strong>Се проверува администраторскиот пристап…</strong></div>}
            {adminAccess === "denied" && <div className="admin-state"><strong>Немате администраторски пристап.</strong><p>Админ-улогите се доделуваат безбедно надвор од јавната страница. Најавете се со одобрениот профил или контактирајте го сопственикот на платформата.</p></div>}
            {adminAccess === "error" && <div className="admin-state"><strong>Не успеавме да го провериме пристапот.</strong><p>{adminError || "Обидете се повторно."}</p><button className="button button--primary" type="button" onClick={() => void openAdmin()}>Обиди се повторно</button></div>}
            {adminAccess === "granted" && <>
              <div className="admin-section-tabs" role="group" aria-label="Администраторски дел"><button className={adminSection === "listings" ? "is-active" : ""} type="button" onClick={() => setAdminSection("listings")}>Огласи</button><button className={adminSection === "organizations" ? "is-active" : ""} type="button" onClick={() => { setAdminSection("organizations"); void loadAdminOrganizations(organizationFilter); }}>Агенции и фирми</button></div>
              {adminSection === "listings" && <><div className="admin-filter-bar" role="group" aria-label="Статус на огласи">
                {(["pending", "approved", "rejected", "archived"] as const).map((status) => <button key={status} className={adminFilter === status ? "is-active" : ""} type="button" disabled={adminLoading || adminMutatingListingId !== null} onClick={() => void loadAdminListings(status)}>{ownerStatusLabel(status)}</button>)}
              </div>
              <div className="admin-note">
                <label><span>Забелешка за следната одлука (по избор)</span><input value={adminNote} maxLength={1000} placeholder="на пр. Потребна е проверка на документите" onChange={(event) => setAdminNote(event.target.value)} /></label>
                {adminActionMessage && <p className="admin-feedback admin-feedback--success">{adminActionMessage}</p>}
                {adminError && <p className="admin-feedback">{adminError}</p>}
              </div>
              <div className="admin-list">
                {adminLoading ? <p className="admin-empty">Се вчитуваат огласите…</p> : adminListings.length ? adminListings.map((listing) => <article className="admin-row" key={listing.id}><div className="admin-row__meta"><span className={"status-pill status-pill--" + listing.status}>{ownerStatusLabel(listing.status)}</span><strong>{listing.title}</strong><small>{formatEuro(listing.priceAmountCents / 100) + " · " + listing.addressLine}</small></div><div className="admin-row__actions">{listing.status === "pending" && <button type="button" disabled={adminMutatingListingId !== null} onClick={() => void moderateListing(listing.id, "approved")}>{adminMutatingListingId === listing.id ? "Се зачувува…" : "Одобри"}</button>}{listing.status === "pending" && <button type="button" className="admin-row__reject" disabled={adminMutatingListingId !== null} onClick={() => void moderateListing(listing.id, "rejected")}>Одбиј</button>}{listing.status !== "archived" && <button type="button" className="admin-row__delete" disabled={adminMutatingListingId !== null} aria-label="Архивирај оглас" onClick={() => void moderateListing(listing.id, "archived")}><Icon name="trash" size={16} /></button>}</div></article>) : <p className="admin-empty">Нема огласи со овој статус.</p>}
              </div>
              </>}
              {adminSection === "organizations" && <><div className="admin-filter-bar" role="group" aria-label="Статус на организации">{(["pending", "verified", "suspended"] as const).map((status) => <button key={status} className={organizationFilter === status ? "is-active" : ""} type="button" disabled={adminLoading || adminMutatingOrganizationId !== null} onClick={() => void loadAdminOrganizations(status)}>{status === "pending" ? "Чека проверка" : status === "verified" ? "Потврдени" : "Суспендирани"}</button>)}</div><div className="admin-list">{adminLoading ? <p className="admin-empty">Се вчитуваат организациите…</p> : adminOrganizations.length ? adminOrganizations.map((organization) => <article className="admin-row" key={organization.id}><div className="admin-row__meta"><span className={"status-pill status-pill--" + organization.status}>{organization.status === "pending" ? "Чека проверка" : organization.status === "verified" ? "Потврдена" : "Суспендирана"}</span><strong>{organization.displayName}</strong><small>{organization.kind === "agency" ? "Агенција за недвижности" : "Инвеститор / градежна фирма"}{organization.legalName ? " · " + organization.legalName : ""}</small></div><div className="admin-row__actions">{organization.status !== "verified" && <button type="button" disabled={adminMutatingOrganizationId !== null} onClick={() => void moderateOrganization(organization.id, "verified")}>{adminMutatingOrganizationId === organization.id ? "Се зачувува…" : "Потврди"}</button>}{organization.status !== "suspended" && <button className="admin-row__reject" type="button" disabled={adminMutatingOrganizationId !== null} onClick={() => void moderateOrganization(organization.id, "suspended")}>Суспендирај</button>}</div></article>) : <p className="admin-empty">Нема организации со овој статус.</p>}</div></>}
            </>}
            {adminAccess === "checking" && adminError && <p className="admin-feedback">{adminError}</p>}
          </section>
        </div>
      )}

      {selectedDetail && (
        <div className="workflow-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetailListingId(null); }}>
          <section className="detail-dialog" role="dialog" aria-modal="true" aria-labelledby="detail-title">
            <div className="detail-dialog__image"><Image src="/images/doma-hero.png" alt="" fill sizes="(max-width: 720px) 100vw, 700px" style={{ objectFit: "cover", objectPosition: selectedDetail.photoPosition }} /><div /><button className="dialog-close detail-dialog__close" type="button" aria-label="Затвори детали" onClick={() => setDetailListingId(null)}><Icon name="close" size={19} /></button><span>{selectedDetail.badge ?? "ДЕМО ОГЛАС"}</span></div>
            <div className="detail-dialog__body"><p className="eyebrow">{selectedDetail.propertyType + " · " + selectedDetail.municipality + " · " + selectedDetail.neighborhood}</p><h2 id="detail-title">{selectedDetail.title}</h2>{selectedDetail.photoUrls?.length ? <div className="listing-gallery" aria-label="Фотографии од огласот">{selectedDetail.photoUrls.map((url, index) => <img /* eslint-disable-line @next/next/no-img-element -- user-provided HTTPS galleries are rendered without server image proxying */ src={url} alt={selectedDetail.title + " – фотографија " + (index + 1)} key={url} loading="lazy" />)}</div> : null}<p className="detail-address"><Icon name="pin" size={17} />Адреса: {selectedDetail.address}</p><div className="detail-price"><strong>{formatEuro(selectedDetail.priceEur)}</strong><span>{selectedDetail.intent === "rent" ? "/ месечно" : ""}<small>{pricePerSquareMeter(selectedDetail) + " €/m²" + (selectedDetail.intent === "rent" ? " месечно" : "")}</small></span></div><div className="detail-specs"><span>{selectedDetail.areaM2 + " m²"}</span><span>{selectedDetail.rooms ? selectedDetail.rooms + " соби" : "Специјален имот"}</span><span>{selectedDetail.floor ?? "Кат не е внесен"}</span><span>{selectedDetail.elevator ? "Со лифт" : "Без лифт"}</span><span>{selectedDetail.parking}</span><span>{selectedDetail.heating}</span><span>{selectedDetail.cooling}</span><span>{constructionLabel(selectedDetail)}</span></div><div className="detail-features"><strong>Дополнителни информации</strong><ul>{selectedDetail.features.map((feature) => <li key={feature}><Icon name="check" size={15} />{feature}</li>)}</ul>{selectedDetail.completionText && <p>{selectedDetail.completionText}</p>}</div><div className="detail-dialog__footer"><span>{publisherLabels[selectedDetail.publisherType] + " · " + selectedDetail.publisherName}</span><div className="detail-dialog__actions">{offerListing ? <button className="button button--outline" type="button" onClick={openOfferForm}>Прати порака / понуда</button> : <small>За демо огласите не се испраќаат пораки или понуди.</small>}<button className="button button--primary" type="button" onClick={() => { void toggleFavorite(selectedDetail.id); }}>Зачувај оглас <Icon name="heart" size={17} filled={favoriteIds.includes(selectedDetail.id)} /></button></div></div></div>
          </section>
        </div>
      )}
    </div>
  );
}
