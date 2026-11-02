// Drizzle 테이블 정의와 RLS 정책 정의만 둔다. (decisions.md S2)
// 앱의 데이터 읽기·쓰기는 여기서 하지 않고 src/lib/supabase의 클라이언트로 한다.
// 테이블은 사이클마다 추가한다: trips(v0.3), items(v0.5), share_links·trip_members(v0.9), trips 대표 이미지 칸(F08)
// 대표 이미지 Storage 버킷과 정책은 drizzle/ 아래 직접 쓴 마이그레이션에 있다. (F08)
// 테이블 권한(GRANT)과 트리거는 drizzle/ 아래 직접 쓴 마이그레이션에 있다. (decisions.md B6)

import { sql } from "drizzle-orm";
import {
  check,
  date,
  doublePrecision,
  index,
  integer,
  numeric,
  pgEnum,
  pgPolicy,
  pgTable,
  primaryKey,
  text,
  time,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { authenticatedRole, authUid, authUsers } from "drizzle-orm/supabase";

// 로그인한 사용자가 그 여행을 공유받은 사람인지 (v0.9, R-08)
// trip_members의 보기 정책은 본인 행만 보여 주므로 trips 정책과 서로 물고 들어가지 않는다.
const isMember = (tripId: unknown) =>
  sql`exists (select 1 from "public"."trip_members" m where m.trip_id = ${tripId} and m.user_id = ${authUid})`;

export const trips = pgTable(
  "trips",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .default(sql`auth.uid()`)
      .references(() => authUsers.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    destination: text("destination").notNull().default(""),
    startDate: date("start_date"),
    endDate: date("end_date"),
    companions: integer("companions").notNull().default(1),
    // 대표 이미지 (F08). 자동(Unsplash)은 주소·대표 색·작가만, 올린 사진은 Storage 주소만 둔다.
    coverUrl: text("cover_url"),
    coverColor: text("cover_color"),
    coverSource: text("cover_source"),
    coverAuthorName: text("cover_author_name"),
    coverAuthorUrl: text("cover_author_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("trips_owner_id_idx").on(t.ownerId),
    check("trips_cover_url", sql`${t.coverUrl} is null or (${t.coverUrl} ~ '^https://' and char_length(${t.coverUrl}) <= 2000)`),
    check("trips_cover_color", sql`${t.coverColor} is null or ${t.coverColor} ~ '^#[0-9A-Fa-f]{6}$'`),
    check("trips_cover_source", sql`${t.coverSource} is null or ${t.coverSource} in ('unsplash', 'upload')`),
    check("trips_cover_author_name", sql`${t.coverAuthorName} is null or char_length(${t.coverAuthorName}) <= 200`),
    check(
      "trips_cover_author_url",
      sql`${t.coverAuthorUrl} is null or (${t.coverAuthorUrl} ~ '^https://' and char_length(${t.coverAuthorUrl}) <= 2000)`,
    ),
    check("trips_title_length", sql`char_length(${t.title}) between 1 and 100`),
    check("trips_destination_length", sql`char_length(${t.destination}) <= 100`),
    check("trips_companions_range", sql`${t.companions} between 1 and 99`),
    check("trips_date_order", sql`${t.endDate} is null or ${t.startDate} is null or ${t.endDate} >= ${t.startDate}`),
    // 보기: 소유자와 공유받은 사람(v0.9). 고치기·넣기·지우기는 소유자만.
    pgPolicy("trips_select_owner", {
      for: "select",
      to: authenticatedRole,
      using: sql`${t.ownerId} = ${authUid} or ${isMember(t.id)}`,
    }),
    pgPolicy("trips_insert_owner", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${t.ownerId} = ${authUid}`,
    }),
    pgPolicy("trips_update_owner", {
      for: "update",
      to: authenticatedRole,
      using: sql`${t.ownerId} = ${authUid}`,
      withCheck: sql`${t.ownerId} = ${authUid}`,
    }),
    pgPolicy("trips_delete_owner", {
      for: "delete",
      to: authenticatedRole,
      using: sql`${t.ownerId} = ${authUid}`,
    }),
  ],
);

// 항목 종류 5종: 교통·숙소·관광지·식당·메모 (decisions.md D4)
export const itemKind = pgEnum("item_kind", ["transport", "lodging", "sight", "food", "memo"]);
export const itemSource = pgEnum("item_source", ["manual", "ai"]);

// 항목이 속한 여행의 소유자인지. 보기는 공유받은 사람도 된다(v0.9).
const ownsTrip = (tripId: unknown) =>
  sql`exists (select 1 from ${trips} where ${trips.id} = ${tripId} and ${trips.ownerId} = ${authUid})`;

export const items = pgTable(
  "items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    day: integer("day").notNull(),
    time: time("time"),
    position: integer("position").notNull().default(0),
    kind: itemKind("kind").notNull(),
    name: text("name").notNull(),
    address: text("address").notNull().default(""),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    memo: text("memo").notNull().default(""),
    link: text("link").notNull().default(""),
    costAmount: numeric("cost_amount", { precision: 14, scale: 2 }),
    costCurrency: text("cost_currency"),
    source: itemSource("source").notNull().default("manual"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("items_trip_order_idx").on(t.tripId, t.day, t.time, t.position),
    check("items_day_range", sql`${t.day} between 1 and 60`),
    check("items_name_length", sql`char_length(${t.name}) between 1 and 200`),
    check("items_address_length", sql`char_length(${t.address}) <= 300`),
    check("items_memo_length", sql`char_length(${t.memo}) <= 2000`),
    check("items_link_length", sql`char_length(${t.link}) <= 2000`),
    check("items_coords_pair", sql`(${t.lat} is null) = (${t.lng} is null)`),
    check(
      "items_cost_pair",
      sql`(${t.costAmount} is null and ${t.costCurrency} is null) or (${t.costAmount} >= 0 and ${t.costCurrency} ~ '^[A-Z]{3}$')`,
    ),
    pgPolicy("items_select_owner", {
      for: "select",
      to: authenticatedRole,
      using: sql`${ownsTrip(t.tripId)} or ${isMember(t.tripId)}`,
    }),
    pgPolicy("items_insert_owner", { for: "insert", to: authenticatedRole, withCheck: ownsTrip(t.tripId) }),
    pgPolicy("items_update_owner", {
      for: "update",
      to: authenticatedRole,
      using: ownsTrip(t.tripId),
      withCheck: ownsTrip(t.tripId),
    }),
    pgPolicy("items_delete_owner", { for: "delete", to: authenticatedRole, using: ownsTrip(t.tripId) }),
  ],
);

// 공유 링크 (v0.9, R-08). 여행마다 하나. 식별값은 앱에서 만든 무작위 32바이트(base64url 43자). (B26)
// 소유자만 보고, 만들고, 지운다. 링크로 들어온 사람의 등록은 accept_share 함수가 한다. (B25)
export const shareLinks = pgTable(
  "share_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tripId: uuid("trip_id")
      .notNull()
      .unique("share_links_trip_id_key")
      .references(() => trips.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique("share_links_token_key"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("share_links_token_format", sql`${t.token} ~ '^[A-Za-z0-9_-]{43}$'`),
    pgPolicy("share_links_select_owner", { for: "select", to: authenticatedRole, using: ownsTrip(t.tripId) }),
    pgPolicy("share_links_insert_owner", { for: "insert", to: authenticatedRole, withCheck: ownsTrip(t.tripId) }),
    pgPolicy("share_links_delete_owner", { for: "delete", to: authenticatedRole, using: ownsTrip(t.tripId) }),
  ],
);

// 공유받은 사람 (v0.9). v1.0의 권한은 보기 전용(viewer) 하나다.
// 본인 행만 볼 수 있고, 넣기는 accept_share 함수로만 한다(직접 넣기·고치기·지우기 정책 없음).
export const tripMembers = pgTable(
  "trip_members",
  {
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("viewer"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: "trip_members_pkey", columns: [t.tripId, t.userId] }),
    index("trip_members_user_id_idx").on(t.userId),
    check("trip_members_role", sql`${t.role} = 'viewer'`),
    pgPolicy("trip_members_select_self", { for: "select", to: authenticatedRole, using: sql`${t.userId} = ${authUid}` }),
  ],
);
