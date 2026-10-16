"use client";

import Image from "next/image";
import { type FormEvent, useState } from "react";
import { macedonianCities } from "./location-data";

type IconName =
  | "arrow"
  | "building"
  | "check"
  | "chevron"
  | "close"
  | "heart"
  | "home"
  | "key"
  | "land"
  | "menu"
  | "pin"
  | "search";

type Listing = {
  id: string;
  label: string;
  publisher: PublisherType;
  title: string;
  location: string;
  details: string;
  price: string;
  priceNote?: string;
  imagePosition: string;
};

type PublisherType = "agency" | "developer" | "owner";
type PublisherFilter = PublisherType | "all";

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

const propertyTypes = ["Стан", "Куќа", "Деловен простор", "Парцела"];

const categoryToType: Record<string, string> = {
  Станови: "Стан",
  Куќи: "Куќа",
  "Деловни простори": "Деловен простор",
  Парцели: "Парцела",
};

const categories: Array<{
  name: string;
  description: string;
  icon: IconName;
}> = [
  { name: "Станови", description: "За секојдневие во градот", icon: "building" },
  { name: "Куќи", description: "Повеќе простор за вас", icon: "home" },
  { name: "Деловни простори", description: "Место за следната идеја", icon: "key" },
  { name: "Парцели", description: "Почеток за вашиот проект", icon: "land" },
];

const listings: Listing[] = [
  {
    id: "aerodrom",
    label: "Проверен оглас",
    publisher: "agency",
    title: "Панорамски стан во Аеродром",
    location: "Аеродром, Скопје",
    details: "92 m²  ·  3 спални  ·  6/8 кат",
    price: "142.000 €",
    imagePosition: "53% center",
  },
  {
    id: "karposh",
    label: "Ново",
    publisher: "developer",
    title: "Мирен дом покрај Градски парк",
    location: "Карпош, Скопје",
    details: "74 m²  ·  2 спални  ·  3/5 кат",
    price: "126.500 €",
    imagePosition: "70% center",
  },
  {
    id: "vodno",
    label: "Издвоено",
    publisher: "owner",
    title: "Современ стан со многу светлина",
    location: "Водно, Скопје",
    details: "108 m²  ·  3 спални  ·  2/4 кат",
    price: "980 €",
    priceNote: "/ месечно",
    imagePosition: "83% center",
  },
];

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

  if (name === "search") {
    return (
      <svg {...shared}>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4 4" />
      </svg>
    );
  }

  if (name === "pin") {
    return (
      <svg {...shared}>
        <path d="M20 10c0 5.2-8 10-8 10s-8-4.8-8-10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.3" />
      </svg>
    );
  }

  if (name === "heart") {
    return (
      <svg {...shared} fill={filled ? "currentColor" : "none"}>
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.9-8.6a5.5 5.5 0 0 0-.1-7.8Z" />
      </svg>
    );
  }

  if (name === "arrow") {
    return (
      <svg {...shared}>
        <path d="M5 12h13" />
        <path d="m13 6 6 6-6 6" />
      </svg>
    );
  }

  if (name === "chevron") {
    return (
      <svg {...shared}>
        <path d="m7 10 5 5 5-5" />
      </svg>
    );
  }

  if (name === "menu") {
    return (
      <svg {...shared}>
        <path d="M4 7h16M4 12h16M4 17h16" />
      </svg>
    );
  }

  if (name === "close") {
    return (
      <svg {...shared}>
        <path d="m6 6 12 12M18 6 6 18" />
      </svg>
    );
  }

  if (name === "check") {
    return (
      <svg {...shared}>
        <path d="m5 12 4.2 4.2L19 6.5" />
      </svg>
    );
  }

  if (name === "building") {
    return (
      <svg {...shared}>
        <path d="M4 21V5.5A1.5 1.5 0 0 1 5.5 4h9A1.5 1.5 0 0 1 16 5.5V21" />
        <path d="M16 10h2.5A1.5 1.5 0 0 1 20 11.5V21M8 8h4M8 12h4M8 16h4M11 21v-2.5" />
      </svg>
    );
  }

  if (name === "home") {
    return (
      <svg {...shared}>
        <path d="m3 11 9-7 9 7v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9Z" />
        <path d="M9 21v-6h6v6" />
      </svg>
    );
  }

  if (name === "key") {
    return (
      <svg {...shared}>
        <circle cx="8.5" cy="15.5" r="3.5" />
        <path d="m11 13 8-8M16 8l2 2M14 10l2 2" />
      </svg>
    );
  }

  return (
    <svg {...shared}>
      <path d="M4 20.5h16M6.5 20.5V9.2l5.5-4.5 5.5 4.5v11.3M9 20.5v-6h6v6" />
      <path d="M4.5 9.2 12 3l7.5 6.2" />
    </svg>
  );
}

export default function HomeClient() {
  const [mode, setMode] = useState<"buy" | "rent">("buy");
  const [selectedCity, setSelectedCity] = useState("Скопје");
  const [propertyType, setPropertyType] = useState("Стан");
  const [budget, setBudget] = useState("До 150.000 €");
  const [publisherType, setPublisherType] = useState<PublisherFilter>("all");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const searchLabel = mode === "buy" ? "Купување" : "Изнајмување";
  const visibleListings = listings.filter(
    (listing) => publisherType === "all" || listing.publisher === publisherType,
  );

  function scrollToListings() {
    document.getElementById("oglasi")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setNotice(
      `Демо пребарување: ${searchLabel.toLowerCase()} на ${propertyType.toLowerCase()} во ${selectedCity}, со буџет ${budget}${publisherType === "all" ? "" : `. Огласувач: ${publisherLabels[publisherType]}`}.`,
    );
    scrollToListings();
  }

  function selectCategory(category: string) {
    setPropertyType(categoryToType[category] ?? "Стан");
    setNotice(`Подготвивме демо избор за: ${category.toLowerCase()}.`);
    scrollToListings();
  }

  function toggleFavorite(id: string) {
    setFavorites((current) =>
      current.includes(id)
        ? current.filter((favoriteId) => favoriteId !== id)
        : [...current, id],
    );
  }

  function showPublishMessage() {
    setNotice(
      "Следниот чекор е форма за објавување оглас, профил за агенција и верификација на содржината.",
    );
  }

  return (
    <div className="doma-app">
      <header className="doma-header">
        <div className="doma-shell doma-header__inner">
          <a className="doma-logo" href="#pocetna" aria-label="DOMA, почетна">
            <span className="doma-logo__mark" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            DOMA
          </a>

          <nav className="doma-nav" aria-label="Главна навигација">
            <a href="#oglasi" onClick={() => setMode("buy")}>Купи</a>
            <a href="#oglasi" onClick={() => setMode("rent")}>Изнајми</a>
            <a href="#kategorii">Новоградба</a>
            <a href="#za-agencii">За агенции</a>
          </nav>

          <div className="doma-header__actions">
            <button className="button button--quiet" type="button" onClick={showPublishMessage}>
              Објави оглас
            </button>
            <button
              className="button button--header"
              type="button"
              onClick={() => setNotice("Најавувањето ќе биде додадено со профили и зачувани пребарувања.")}
            >
              Најави се
            </button>
          </div>

          <button
            className="doma-menu-button"
            type="button"
            aria-label={menuOpen ? "Затвори мени" : "Отвори мени"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Icon name={menuOpen ? "close" : "menu"} size={22} />
          </button>
        </div>

        {menuOpen && (
          <nav className="doma-mobile-nav" aria-label="Мобилна навигација">
            <a href="#oglasi" onClick={() => { setMode("buy"); setMenuOpen(false); }}>Купи</a>
            <a href="#oglasi" onClick={() => { setMode("rent"); setMenuOpen(false); }}>Изнајми</a>
            <a href="#kategorii" onClick={() => setMenuOpen(false)}>Новоградба</a>
            <a href="#za-agencii" onClick={() => setMenuOpen(false)}>За агенции</a>
            <button className="button button--primary" type="button" onClick={() => { showPublishMessage(); setMenuOpen(false); }}>
              Објави оглас
            </button>
          </nav>
        )}
      </header>

      <main id="pocetna">
        <section className="doma-hero" aria-labelledby="hero-title">
          <div className="doma-hero__image" aria-hidden="true">
            <Image
              src="/images/doma-hero.png"
              alt=""
              fill
              priority
              sizes="100vw"
              className="doma-hero__photo"
            />
          </div>
          <div className="doma-shell doma-hero__content">
            <p className="eyebrow eyebrow--light">НЕДВИЖНОСТИ ВО МАКЕДОНИЈА</p>
            <h1 id="hero-title">Местото каде што почнува вашиот следен дом.</h1>
            <p className="doma-hero__intro">
              Откријте внимателно избрани имоти за купување и изнајмување —
              јасно, мирно и на едно место.
            </p>

            <form className="search-panel" onSubmit={handleSearch}>
              <div className="search-panel__top">
                <div className="mode-switch" role="group" aria-label="Тип на пребарување">
                  <button
                    className={mode === "buy" ? "mode-switch__button is-active" : "mode-switch__button"}
                    type="button"
                    aria-pressed={mode === "buy"}
                    onClick={() => setMode("buy")}
                  >
                    Купување
                  </button>
                  <button
                    className={mode === "rent" ? "mode-switch__button is-active" : "mode-switch__button"}
                    type="button"
                    aria-pressed={mode === "rent"}
                    onClick={() => setMode("rent")}
                  >
                    Изнајмување
                  </button>
                </div>
                <span className="search-panel__mode-label">{searchLabel}</span>
              </div>

              <div className="search-panel__fields">
                <label className="search-field search-field--location">
                  <span>Град</span>
                  <span className="search-field__control">
                    <Icon name="pin" size={18} />
                    <select value={selectedCity} onChange={(event) => setSelectedCity(event.target.value)} aria-label="Град">
                      {macedonianCities.map((city) => <option key={city}>{city}</option>)}
                    </select>
                    <Icon name="chevron" size={16} />
                  </span>
                </label>

                <label className="search-field">
                  <span>Тип на имот</span>
                  <span className="search-field__control">
                    <select value={propertyType} onChange={(event) => setPropertyType(event.target.value)} aria-label="Тип на имот">
                      {propertyTypes.map((type) => <option key={type}>{type}</option>)}
                    </select>
                    <Icon name="chevron" size={16} />
                  </span>
                </label>

                <label className="search-field">
                  <span>Буџет</span>
                  <span className="search-field__control">
                    <select value={budget} onChange={(event) => setBudget(event.target.value)} aria-label="Буџет">
                      <option>До 100.000 €</option>
                      <option>До 150.000 €</option>
                      <option>До 250.000 €</option>
                      <option>По договор</option>
                    </select>
                    <Icon name="chevron" size={16} />
                  </span>
                </label>

                <label className="search-field search-field--publisher">
                  <span>Објавувач</span>
                  <span className="search-field__control">
                    <select
                      value={publisherType}
                      onChange={(event) => setPublisherType(event.target.value as PublisherFilter)}
                      aria-label="Кој го објавува огласот"
                    >
                      {publisherOptions.map((publisher) => (
                        <option key={publisher.value} value={publisher.value}>{publisher.label}</option>
                      ))}
                    </select>
                    <Icon name="chevron" size={16} />
                  </span>
                </label>

                <button className="button button--search" type="submit">
                  <Icon name="search" size={19} />
                  Пребарај
                </button>
              </div>
            </form>
          </div>
          <div className="doma-hero__bottom-note">ДЕМО ПЛАТФОРМА · СОЗДАДЕНА ЗА ЛОКАЛЕН ПАЗАР</div>
        </section>

        {/* The detailed location flow was intentionally removed in favor of city-only search.
        {false && (
          <div
            className="location-dialog-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setLocationPickerOpen(false);
            }}
          >
            <section className="location-dialog" role="dialog" aria-modal="true" aria-labelledby="location-dialog-title">
              <header className="location-dialog__header">
                <div>
                  <p>ЛОКАЦИЈА</p>
                  <h2 id="location-dialog-title">Каде барате?</h2>
                </div>
                <div className="location-dialog__header-actions">
                  {(selectedCity !== "Скопје" || selectedMunicipality || selectedSettlement) && (
                    <button className="location-dialog__reset" type="button" onClick={resetLocation}>
                      Ресетирај
                    </button>
                  )}
                  <button
                    ref={locationCloseButtonRef}
                    className="location-dialog__close"
                    type="button"
                    aria-label="Затвори избор на локација"
                    onClick={() => setLocationPickerOpen(false)}
                  >
                    <Icon name="close" size={19} />
                  </button>
                </div>
              </header>

              <nav className="location-dialog__breadcrumbs" aria-label="Тек на избор на локација">
                <button
                  className={locationStep === "city" ? "is-current" : ""}
                  type="button"
                  onClick={() => setLocationStep("city")}
                >
                  1. {selectedCity}
                </button>
                {selectedCity === "Скопје" && (
                  <>
                    <span aria-hidden="true">›</span>
                    <button
                      className={locationStep === "municipality" ? "is-current" : ""}
                      type="button"
                      onClick={() => setLocationStep("municipality")}
                    >
                      2. {selectedMunicipality || "Општина"}
                    </button>
                    {selectedMunicipality && (
                      <>
                        <span aria-hidden="true">›</span>
                        <button
                          className={locationStep === "settlement" ? "is-current" : ""}
                          type="button"
                          onClick={() => setLocationStep("settlement")}
                        >
                          3. {selectedSettlement || "Населба"}
                        </button>
                      </>
                    )}
                  </>
                )}
              </nav>

              <div className="location-dialog__body">
                {locationStep === "city" && (
                  <section aria-labelledby="city-step-title">
                    <div className="location-dialog__step-heading">
                      <span>ЧЕКОР 1</span>
                      <h3 id="city-step-title">Изберете град</h3>
                      <p>Скопје е издвоен прв; по него следи избор на општина.</p>
                    </div>

                    <button
                      className={selectedCity === "Скопје" ? "skopje-choice is-active" : "skopje-choice"}
                      type="button"
                      onClick={() => chooseCity("Скопје")}
                    >
                      <span><Icon name="pin" size={20} /></span>
                      <strong>Скопје</strong>
                      <small>Главен град · 10 општини</small>
                      <Icon name="arrow" size={18} />
                    </button>

                    <p className="location-dialog__list-label">Сите други градови</p>
                    <div className="city-choice-grid">
                      {macedonianCities.filter((city) => city !== "Скопје").map((city) => (
                        <button
                          className={selectedCity === city ? "location-choice is-active" : "location-choice"}
                          type="button"
                          key={city}
                          onClick={() => chooseCity(city)}
                        >
                          {city}
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {locationStep === "municipality" && selectedCity === "Скопје" && (
                  <section aria-labelledby="municipality-step-title">
                    <div className="location-dialog__step-heading">
                      <span>ЧЕКОР 2</span>
                      <h3 id="municipality-step-title">Изберете општина во Скопје</h3>
                      <p>Потоа ќе ги прикажеме само населбите од избраната општина.</p>
                    </div>

                    <div className="municipality-choice-grid">
                      {availableMunicipalities.map((municipality) => (
                        <button
                          className={selectedMunicipality === municipality.name ? "location-choice is-active" : "location-choice"}
                          type="button"
                          key={municipality.name}
                          onClick={() => chooseMunicipality(municipality.name)}
                        >
                          {municipality.name}
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {locationStep === "settlement" && selectedMunicipalityData && (
                  <section aria-labelledby="settlement-step-title">
                    <div className="location-dialog__step-heading">
                      <span>ЧЕКОР 3</span>
                      <h3 id="settlement-step-title">Изберете населба во {selectedMunicipalityData.name}</h3>
                      <p>Населбата е опционална — може да пребарувате во целата општина.</p>
                    </div>

                    <div className="location-option-group">
                      <div><strong>Градски населби</strong><span>{selectedMunicipalityData.neighborhoods.length}</span></div>
                      <div className="settlement-choice-grid">
                        {selectedMunicipalityData.neighborhoods.map((neighborhood) => (
                          <button
                            className={selectedSettlement === neighborhood ? "location-choice is-active" : "location-choice"}
                            type="button"
                            key={neighborhood}
                            onClick={() => chooseSettlement(neighborhood)}
                          >
                            {neighborhood}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="location-option-group">
                      <div><strong>Службени населени места</strong><span>{selectedMunicipalityData.administrativeSettlements.length}</span></div>
                      <div className="settlement-choice-grid">
                        {selectedMunicipalityData.administrativeSettlements
                          .filter((settlement) => !selectedMunicipalityData.neighborhoods.includes(settlement))
                          .map((settlement) => (
                            <button
                              className={selectedSettlement === settlement ? "location-choice is-active" : "location-choice"}
                              type="button"
                              key={settlement}
                              onClick={() => chooseSettlement(settlement)}
                            >
                              {settlement}
                            </button>
                          ))}
                      </div>
                    </div>
                  </section>
                )}
              </div>

              <footer className="location-dialog__footer">
                <span>{selectedLocation}</span>
                <button className="button button--primary" type="button" onClick={() => setLocationPickerOpen(false)}>
                  Готово
                </button>
              </footer>
            </section>
          </div>
        )} */}

        <div className="doma-notice-wrap" aria-live="polite" aria-atomic="true">
          {notice && (
            <div className="doma-notice">
              <Icon name="check" size={17} />
              <span>{notice}</span>
              <button type="button" aria-label="Затвори известување" onClick={() => setNotice("")}>
                <Icon name="close" size={16} />
              </button>
            </div>
          )}
        </div>

        <section className="doma-section doma-section--categories" id="kategorii" aria-labelledby="categories-title">
          <div className="doma-shell">
            <div className="section-heading section-heading--split">
              <div>
                <p className="eyebrow">НАЈДЕТЕ ГО ТОЧНОТО МЕСТО</p>
                <h2 id="categories-title">Започнете со она што ви е важно.</h2>
              </div>
              <button className="text-link" type="button" onClick={scrollToListings}>
                Истражи огласи <Icon name="arrow" size={18} />
              </button>
            </div>

            <div className="category-grid">
              {categories.map((category) => (
                <button
                  key={category.name}
                  className="category-card"
                  type="button"
                  onClick={() => selectCategory(category.name)}
                >
                  <span className="category-card__icon"><Icon name={category.icon} size={25} /></span>
                  <span className="category-card__text">
                    <strong>{category.name}</strong>
                    <small>{category.description}</small>
                  </span>
                  <span className="category-card__arrow"><Icon name="arrow" size={18} /></span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="doma-section doma-section--listings" id="oglasi" aria-labelledby="listings-title">
          <div className="doma-shell">
            <div className="section-heading section-heading--split">
              <div>
                <p className="eyebrow">ИЗБРАНИ ИМОТИ</p>
                <h2 id="listings-title">Домови што вреди да ги погледнете.</h2>
                <p className="listing-filter-summary">
                  {publisherType === "all"
                    ? "Огласи од агенции, фирми / инвеститори и приватни сопственици."
                    : `Прикажани се огласи од: ${publisherLabels[publisherType]}.`}
                </p>
              </div>
              <button
                className="text-link text-link--desktop"
                type="button"
                onClick={() => setNotice("Страницата со сите огласи е следната функција што ќе ја поврземе со база на податоци.")}
              >
                Погледни ги сите <Icon name="arrow" size={18} />
              </button>
            </div>

            <div className="listing-grid">
              {visibleListings.map((listing, index) => {
                const isFavorite = favorites.includes(listing.id);

                return (
                  <article className="listing-card" key={listing.id}>
                    <div className={`listing-card__media listing-card__media--${index + 1}`}>
                      <Image
                        src="/images/doma-hero.png"
                        alt={`Илустративен приказ за ${listing.title}`}
                        fill
                        sizes="(max-width: 720px) 100vw, (max-width: 1050px) 50vw, 33vw"
                        className="listing-card__photo"
                        style={{ objectPosition: listing.imagePosition }}
                      />
                      <div className="listing-card__shade" />
                      <span className="listing-card__badge">{listing.label}</span>
                      <button
                        className={isFavorite ? "heart-button is-favorite" : "heart-button"}
                        type="button"
                        aria-label={isFavorite ? `Отстрани ${listing.title} од омилени` : `Додај ${listing.title} во омилени`}
                        aria-pressed={isFavorite}
                        onClick={() => toggleFavorite(listing.id)}
                      >
                        <Icon name="heart" size={20} filled={isFavorite} />
                      </button>
                    </div>
                    <div className="listing-card__body">
                      <p className="listing-card__location"><Icon name="pin" size={16} /> {listing.location}</p>
                      <p className="listing-card__publisher">
                        <span>Огласувач</span>
                        {publisherLabels[listing.publisher]}
                      </p>
                      <h3>{listing.title}</h3>
                      <p className="listing-card__details">{listing.details}</p>
                      <div className="listing-card__footer">
                        <p><strong>{listing.price}</strong>{listing.priceNote && <span>{listing.priceNote}</span>}</p>
                        <button
                          className="listing-card__view"
                          type="button"
                          onClick={() => setNotice(`${listing.title} е демо-оглас. Деталниот приказ ќе биде поврзан во следниот екран.`)}
                          aria-label={`Отвори ${listing.title}`}
                        >
                          <Icon name="arrow" size={19} />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}

              {visibleListings.length === 0 && (
                <div className="listing-empty" role="status">
                  Нема демо-огласи за избраниот тип објавувач. Изберете „Сите објавувачи“ за целосен преглед.
                </div>
              )}
            </div>

            <p className="demo-note">Прикажаните огласи и цени се демонстративни; следната фаза ги поврзува со вистински податоци.</p>
          </div>
        </section>

        <section className="doma-section doma-section--principles" aria-label="Предности на DOMA">
          <div className="doma-shell principles-grid">
            <div className="principles-intro">
              <p className="eyebrow">ПОЈАСЕН НАЧИН НА БАРАЊЕ</p>
              <h2>Помалку бучава. Повеќе чувство дека сте на вистинското место.</h2>
            </div>
            <div className="principle-list">
              <article>
                <span>01</span>
                <div><h3>Јасни информации</h3><p>На едно место ќе ги собереме клучните детали што ви помагаат да одлучите побрзо.</p></div>
              </article>
              <article>
                <span>02</span>
                <div><h3>Локален контекст</h3><p>Барањето почнува од соседството, вашиот ритам и тоа што ви е навистина блиску.</p></div>
              </article>
              <article>
                <span>03</span>
                <div><h3>Простор за сигурност</h3><p>Веродостојноста на огласите и агенциите е планирана како основна, а не дополнителна функција.</p></div>
              </article>
            </div>
          </div>
        </section>

        <section className="doma-cta" id="za-agencii" aria-labelledby="cta-title">
          <div className="doma-shell doma-cta__inner">
            <div>
              <p className="eyebrow eyebrow--light">ИМАТЕ ИМОТ?</p>
              <h2 id="cta-title">Дајте му простор да биде забележан.</h2>
              <p>Подгответе ги првите огласи и поставете стандарден, сигурен начин на комуникација со заинтересираните купувачи.</p>
            </div>
            <div className="doma-cta__actions">
              <button className="button button--light" type="button" onClick={showPublishMessage}>Објавете оглас <Icon name="arrow" size={18} /></button>
              <button className="button button--ghost-light" type="button" onClick={() => setNotice("Во следната фаза ќе додадеме контакт-форма за агенции и сопственици.")}>За агенции</button>
            </div>
          </div>
        </section>
      </main>

      <footer className="doma-footer">
        <div className="doma-shell doma-footer__inner">
          <a className="doma-logo doma-logo--footer" href="#pocetna" aria-label="DOMA, почетна">
            <span className="doma-logo__mark" aria-hidden="true"><span /><span /><span /></span>
            DOMA
          </a>
          <p>Прва основа за појасно пребарување недвижности во Македонија.</p>
          <span>© 2026 DOMA</span>
        </div>
      </footer>
    </div>
  );
}
