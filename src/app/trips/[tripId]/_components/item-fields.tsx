"use client";

import { useEffect, useRef, useState } from "react";
import type { TripDay } from "@/lib/trips/days";
import { CURRENCIES, ITEM_KIND_LABELS, ITEM_KINDS, type ItemKind } from "@/lib/items/types";
import type { ItemInput } from "@/lib/items/validation";
import { joinRoute, splitRoute } from "@/lib/items/route-name";

import { CHIP, FIELD as INPUT, LABEL } from "./form-styles";

type Props = {
  days: TripDay[];
  values?: ItemInput;
  // 한 폼에 항목이 여러 개일 때 칸 이름 앞에 붙인다(자동 추출 미리보기). 예: "items.0."
  prefix?: string;
};

// F17: 종류마다 받는 칸이 다르다. DB 칸(이름·주소·일차·시각·메모·링크·비용)은 그대로이고,
// 그 종류에 없는 칸은 원래 값을 숨은 칸으로 그대로 보낸다(수정할 때 값이 지워지지 않게).
type Spec = {
  name: { label: string; placeholder: string };
  day: string;
  time?: string;
  address?: { label: string; placeholder: string };
  cost?: string;
  link?: string;
  memo: { label: string; placeholder: string; rows: number };
  note?: string;
};

const SPECS: Record<ItemKind, Spec> = {
  transport: {
    name: { label: "편명·교통편", placeholder: "예: KE123, 공항철도, JR 패스" },
    day: "일차",
    time: "출발 시각",
    address: { label: "타는 곳 주소", placeholder: "비워 두면 이름으로 찾습니다" },
    cost: "요금",
    link: "예약 링크",
    memo: { label: "메모", placeholder: "좌석, 탑승구. 패스면 탈 수 있는 노선을 쉼표로", rows: 2 },
  },
  lodging: {
    name: { label: "숙소 이름", placeholder: "예: 호텔 이름" },
    day: "체크인 일차",
    time: "체크인 시각",
    address: { label: "주소", placeholder: "비워 두면 이름으로 찾습니다" },
    cost: "숙박비",
    link: "예약 링크",
    memo: { label: "메모", placeholder: "객실, 조식 등", rows: 2 },
    note: "체크아웃은 다음 숙소의 체크인 일차(없으면 여행 마지막 날)로 계산합니다.",
  },
  sight: {
    name: { label: "장소 이름", placeholder: "예: 빅토리아 피크" },
    day: "일차",
    time: "방문 시각",
    address: { label: "주소", placeholder: "비워 두면 이름으로 찾습니다" },
    cost: "입장료",
    link: "링크",
    memo: { label: "메모", placeholder: "운영 시간, 볼거리 등", rows: 2 },
  },
  food: {
    name: { label: "식당 이름", placeholder: "예: 팀호완 삼수이포" },
    day: "일차",
    time: "예약·방문 시각",
    address: { label: "주소", placeholder: "비워 두면 이름으로 찾습니다" },
    cost: "식비",
    link: "예약 링크",
    memo: { label: "메뉴·메모", placeholder: "먹을 메뉴, 웨이팅 등", rows: 2 },
  },
  memo: {
    name: { label: "제목", placeholder: "예: 환전하기" },
    day: "일차",
    memo: { label: "내용", placeholder: "적어 둘 내용", rows: 4 },
  },
};

const DEFAULT_KIND: ItemKind = "sight";

// 항목 입력 칸 묶음. 직접 입력·수정 폼(R-05)과 자동 추출 미리보기(R-04)가 같이 쓴다.
export function ItemFields({ days, values, prefix = "" }: Props) {
  const n = (name: string) => prefix + name;
  const initialKind = values?.kind ?? DEFAULT_KIND;
  const [kind, setKind] = useState<ItemKind>(initialKind);
  // 폼을 비울 때마다 올려서 교통 칸(직접 관리하는 값)을 새로 그린다.
  const [resets, setResets] = useState(0);
  const rootRef = useRef<HTMLFieldSetElement>(null);
  const spec = SPECS[kind];

  // 저장 후 폼을 비우면(form.reset) 종류도 처음 것으로 돌린다.
  useEffect(() => {
    const form = rootRef.current?.form;
    const onReset = () => {
      setKind(initialKind);
      setResets((r) => r + 1);
    };
    form?.addEventListener("reset", onReset);
    return () => form?.removeEventListener("reset", onReset);
  }, [initialKind]);

  const costValue = values?.costAmount === null || values?.costAmount === undefined ? "" : String(values.costAmount);

  return (
    <>
      {/* 종류는 고른 것이 늘 보이도록 버튼 모양 라디오로 둔다. */}
      <fieldset ref={rootRef} className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-xs font-medium tracking-wide opacity-90">종류</legend>
        <div className="flex flex-wrap gap-1.5">
          {ITEM_KINDS.map((k) => (
            <label key={k} className={CHIP}>
              <input type="radio" name={n("kind")} value={k} defaultChecked={initialKind === k} onChange={() => setKind(k)} className="sr-only" />
              {ITEM_KIND_LABELS[k]}
            </label>
          ))}
        </div>
      </fieldset>

      {kind === "transport" ? (
        <TransportName key={`transport-name-${resets}`} n={n} label={spec.name.label} placeholder={spec.name.placeholder} initial={values?.name ?? ""} />
      ) : (
        <label key="name" className={LABEL}>
          {spec.name.label}
          <input name={n("name")} required maxLength={200} defaultValue={values?.name} placeholder={spec.name.placeholder} className={INPUT} />
        </label>
      )}

      <div className={spec.time ? "grid grid-cols-2 gap-3" : ""}>
        <label className={LABEL}>
          {spec.day}
          <select name={n("day")} defaultValue={values?.day ?? 1} className={INPUT}>
            {days.map((d) => (
              <option key={d.day} value={d.day}>
                DAY {d.day}
                {d.date ? ` (${d.date.slice(5)})` : ""}
              </option>
            ))}
          </select>
        </label>
        {spec.time ? (
          <label className={LABEL}>
            {spec.time}
            <input type="time" name={n("time")} defaultValue={values?.time ?? ""} className={INPUT} />
          </label>
        ) : (
          <input type="hidden" name={n("time")} value={values?.time ?? ""} />
        )}
      </div>
      {spec.note && <p className="-mt-2 text-xs leading-relaxed opacity-60">{spec.note}</p>}

      {spec.address ? (
        <label className={LABEL}>
          {spec.address.label}
          <input name={n("address")} maxLength={300} defaultValue={values?.address} placeholder={spec.address.placeholder} className={INPUT} />
        </label>
      ) : (
        <input type="hidden" name={n("address")} value={values?.address ?? ""} />
      )}

      {spec.cost ? (
        <div className="grid grid-cols-[1fr_7rem] gap-3">
          <label className={LABEL}>
            {spec.cost}
            <input name={n("costAmount")} inputMode="decimal" defaultValue={costValue} placeholder="금액" className={INPUT} />
          </label>
          <label className={LABEL}>
            통화
            <select name={n("costCurrency")} defaultValue={values?.costCurrency ?? ""} className={INPUT}>
              <option value="">선택</option>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : (
        <>
          <input type="hidden" name={n("costAmount")} value={costValue} />
          <input type="hidden" name={n("costCurrency")} value={values?.costCurrency ?? ""} />
        </>
      )}

      {spec.link ? (
        <label className={LABEL}>
          {spec.link}
          <input type="url" name={n("link")} maxLength={2000} defaultValue={values?.link} placeholder="https://" className={INPUT} />
        </label>
      ) : (
        <input type="hidden" name={n("link")} value={values?.link ?? ""} />
      )}

      <label className={LABEL}>
        {spec.memo.label}
        <textarea name={n("memo")} rows={spec.memo.rows} maxLength={2000} defaultValue={values?.memo} placeholder={spec.memo.placeholder} className={`${INPUT} resize-none`} />
      </label>
    </>
  );
}

// 교통: 편명·출발지·도착지를 따로 받고 "KE123 ICN → KIX"처럼 이름 하나로 합쳐 보낸다.
// GO 패널의 항공권 카드(go-info.ts parseFlight)가 이 형식에서 공항 코드를 읽는다.
function TransportName({ n, label, placeholder, initial }: { n: (name: string) => string; label: string; placeholder: string; initial: string }) {
  const start = splitRoute(initial);
  const [carrier, setCarrier] = useState(start.carrier);
  const [from, setFrom] = useState(start.from);
  const [to, setTo] = useState(start.to);
  const name = joinRoute({ carrier, from, to });
  const carrierRef = useRef<HTMLInputElement>(null);

  // 세 칸이 모두 비면 편명 칸에서 막는다(이름은 꼭 있어야 한다).
  useEffect(() => {
    carrierRef.current?.setCustomValidity(name ? "" : "편명·교통편이나 출발지·도착지를 입력해 주세요.");
  }, [name]);

  return (
    <>
      <input type="hidden" name={n("name")} value={name} />
      <label className={LABEL}>
        {label}
        <input ref={carrierRef} maxLength={80} value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder={placeholder} className={INPUT} />
      </label>
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <label className={LABEL}>
          출발지
          <input maxLength={50} value={from} onChange={(e) => setFrom(e.target.value)} placeholder="예: ICN, 인천" className={INPUT} />
        </label>
        <span aria-hidden className="pb-2.5 opacity-50">
          →
        </span>
        <label className={LABEL}>
          도착지
          <input maxLength={50} value={to} onChange={(e) => setTo(e.target.value)} placeholder="예: KIX, 간사이" className={INPUT} />
        </label>
      </div>
    </>
  );
}
