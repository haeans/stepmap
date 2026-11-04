// 1화면 공용 조각. 쓴 돈 영역에 항목별 금액과 통화별 합계를 둔다(R-09).
// 1인당 금액은 C9 F27부터 쓴 돈 안의 "정산"(cost-section.tsx Settle)에서 인원을 넣어 본다.

import { formatAmount, summarizeCosts } from "@/lib/cost/summary";
import { formatCost, type Item } from "@/lib/items/types";

// 쓴 돈: 항목별 금액과 통화별 합계 (R-09). 글자색은 바깥을 따른다(매거진 사진 위 유리 카드, F10).
export function CostList({ items }: { items: Item[] }) {
  if (items.length === 0) return <p className="text-sm opacity-60">비용이 있는 항목이 없습니다.</p>;
  const totals = summarizeCosts(items, 1);
  return (
    <div className="flex flex-col gap-3 text-sm">
      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li key={item.id} className="flex justify-between gap-2">
            <span className="truncate">{item.name}</span>
            <span className="shrink-0 tabular-nums">{formatCost(item.cost_amount, item.cost_currency)}</span>
          </li>
        ))}
      </ul>
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
