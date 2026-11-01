// Drizzle 테이블 정의와 RLS 정책 정의만 둔다. (decisions.md S2)
// 앱의 데이터 읽기·쓰기는 여기서 하지 않고 src/lib/supabase의 클라이언트로 한다.
// 테이블은 사이클마다 추가한다: trips(v0.3), items(v0.5), share_links·trip_members(v0.9)
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
  text,
  time,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { authenticatedRole, authUid, authUsers } from "drizzle-orm/supabase";

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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("trips_owner_id_idx").on(t.ownerId),
    check("trips_title_length", sql`char_length(${t.title}) between 1 and 100`),
    check("trips_destination_length", sql`char_length(${t.destination}) <= 100`),
    check("trips_companions_range", sql`${t.companions} between 1 and 99`),
    check("trips_date_order", sql`${t.endDate} is null or ${t.startDate} is null or ${t.endDate} >= ${t.startDate}`),
    // 보기: v0.3은 소유자만. v0.9에서 공유받은 사람을 더한다.
    pgPolicy("trips_select_owner", {
      for: "select",
      to: authenticatedRole,
      using: sql`${t.ownerId} = ${authUid}`,
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

// 항목이 속한 여행의 소유자인지. 보기는 v0.9에서 공유받은 사람을 더한다.
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
    pgPolicy("items_select_owner", { for: "select", to: authenticatedRole, using: ownsTrip(t.tripId) }),
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
