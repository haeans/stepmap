import type { TripDay } from "@/lib/trips/days";
import { CURRENCIES, ITEM_KIND_LABELS, ITEM_KINDS } from "@/lib/items/types";
import type { ItemInput } from "@/lib/items/validation";

import { CHIP, FIELD as INPUT, LABEL } from "./form-styles";

type Props = {
  days: TripDay[];
  values?: ItemInput;
  // 한 폼에 항목이 여러 개일 때 칸 이름 앞에 붙인다(자동 추출 미리보기). 예: "items.0."
  prefix?: string;
};

// 항목 입력 칸 묶음. 직접 입력·수정 폼(R-05)과 자동 추출 미리보기(R-04)가 같이 쓴다.
export function ItemFields({ days, values, prefix = "" }: Props) {
  const n = (name: string) => prefix + name;
  return (
    <>
      {/* 종류는 고른 것이 늘 보이도록 버튼 모양 라디오로 둔다. */}
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-xs font-medium tracking-wide opacity-90">종류</legend>
        <div className="flex flex-wrap gap-1.5">
          {ITEM_KINDS.map((k) => (
            <label
              key={k}
              className={CHIP}
            >
              <input type="radio" name={n("kind")} value={k} defaultChecked={(values?.kind ?? "sight") === k} className="sr-only" />
              {ITEM_KIND_LABELS[k]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <label className={LABEL}>
          일차
          <select name={n("day")} defaultValue={values?.day ?? 1} className={INPUT}>
            {days.map((d) => (
              <option key={d.day} value={d.day}>
                DAY {d.day}
                {d.date ? ` (${d.date.slice(5)})` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className={LABEL}>
          시각
          <input type="time" name={n("time")} defaultValue={values?.time ?? ""} className={INPUT} />
        </label>
      </div>
      <label className={LABEL}>
        이름
        <input name={n("name")} required maxLength={200} defaultValue={values?.name} placeholder="예: 빅토리아 피크, KE123 인천→홍콩" className={INPUT} />
      </label>
      <label className={LABEL}>
        주소
        <input name={n("address")} maxLength={300} defaultValue={values?.address} placeholder="비워 두면 이름으로 찾습니다" className={INPUT} />
      </label>
      <label className={LABEL}>
        메모
        <textarea name={n("memo")} rows={2} maxLength={2000} defaultValue={values?.memo} className={`${INPUT} resize-none`} />
      </label>
      <label className={LABEL}>
        링크
        <input type="url" name={n("link")} maxLength={2000} defaultValue={values?.link} placeholder="https://" className={INPUT} />
      </label>
      <div className="grid grid-cols-[1fr_7rem] gap-3">
        <label className={LABEL}>
          비용
          <input
            name={n("costAmount")}
            inputMode="decimal"
            defaultValue={values?.costAmount === null || values?.costAmount === undefined ? "" : String(values.costAmount)}
            placeholder="금액"
            className={INPUT}
          />
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
    </>
  );
}
