// Drizzle 테이블 정의와 RLS 정책 정의만 둔다. (decisions.md S2)
// 앱의 데이터 읽기·쓰기는 여기서 하지 않고 src/lib/supabase의 클라이언트로 한다.
// 테이블은 사이클마다 추가한다: trips(v0.3), items(v0.5), share_links·trip_members(v0.9)
// 테이블 권한(GRANT)과 트리거는 drizzle/ 아래 직접 쓴 마이그레이션에 있다. (decisions.md B6)

import { sql } from "drizzle-orm";
import { check, date, index, integer, pgPolicy, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
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
