"use client";

// 1화면 공용 조각. 쓴 돈 영역에 항목별 금액과 통화별 합계를 둔다(R-09).
// 1인당 금액은 C9 F27부터 쓴 돈 안의 "정산"(cost-section.tsx Settle)에서 인원을 넣어 본다.

import { useId, useState } from "react";
import { formatAmount, summarizeCosts } from "@/lib/cost/summary";
import { formatCost, type Item } from "@/lib/items/types";

const VISIBLE = 7; // 쓴 돈은 이만큼까지 보이고 나머지는 서랍에 둔다 (C10 F32)

function CostItem({ item }: { item: Item }) {
  return (
    <li className="flex justify-between gap-2">
      <span className="truncate">{item.name}</span>
      <span className="shrink-0 tabular-nums">{formatCost(item.cost_amount, item.cost_currency)}</span>
    </li>
  );
}

// 쓴 돈: 항목별 금액과 통화별 합계 (R-09). 글자색은 바깥을 따른다(매거진 사진 위 유리 카드, F10).
// 7개까지 보이고 나머지는 닫힌 서랍. 합계 경계선 위 가운데 화살표로 열고 닫는다. 합계는 항상 보인다 (F32).
export function CostList({ items }: { items: Item[] }) {
  const [open, setOpen] = useState(false);
  const drawerId = useId();
  if (items.length === 0) return <p className="text-sm opacity-60">비용이 있는 항목이 없습니다.</p>;
  const totals = summarizeCosts(items, 1);
  const rest = items.slice(VISIBLE);
  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex flex-col gap-1">
        <ul className="flex flex-col gap-1">
          {items.slice(0, VISIBLE).map((item) => (
            <CostItem key={item.id} item={item} />
          ))}
        </ul>
        {rest.length > 0 && (
          // 닫혀 있으면 높이 0. 안쪽 목록은 inert로 두어 키보드·스크린리더가 닿지 않게 한다
          <div className={`grid transition-[grid-template-rows] duration-200 motion-reduce:transition-none ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
            <ul id={drawerId} inert={!open} className="flex min-h-0 flex-col gap-1 overflow-hidden">
              {rest.map((item) => (
                <CostItem key={item.id} item={item} />
              ))}
            </ul>
          </div>
        )}
      </div>
      {rest.length > 0 && (
        <div className="-mb-1 flex justify-center">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={drawerId}
            aria-label={open ? `나머지 쓴 돈 ${rest.length}개 접기` : `나머지 쓴 돈 ${rest.length}개 펼치기`}
            title={open ? "접기" : `나머지 ${rest.length}개 펼치기`}
            className="flex size-7 items-center justify-center rounded-full opacity-70 transition hover:bg-current/10 hover:opacity-100 active:scale-95"
          >
            <svg aria-hidden viewBox="0 0 12 12" className={`size-3.5 transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2.5 4.5L6 8l3.5-3.5" />
            </svg>
          </button>
        </div>
      )}
      <table aria-label="통화별 합계" className="w-full border-t border-current/20 pt-2">
        <thead>
          <tr className="text-xs opacity-60">
            <th className="pt-2 text-left font-normal">통화</th>
            <th className="pt-2 text-right font-normal">합계</th>
          </tr>
        </thead>
        <tbody>
          {totals.map((t) => (
            <tr key={t.currency} className="font-medium">
              <td className="py-0.5">{t.currency}</td>
              <td className="py-0.5 text-right tabular-nums">{formatAmount(t.total, t.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {totals.length > 1 && <p className="text-xs opacity-60">통화가 달라 따로 합계를 냈습니다. 환율 계산은 하지 않습니다.</p>}
    </div>
  );
}
