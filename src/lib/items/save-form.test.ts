import { describe, expect, it } from "vitest";
import { itemsForm } from "./save-form";
import { parseItemForm, type ItemInput } from "./validation";

const base: ItemInput = {
  kind: "sight",
  day: 2,
  time: "14:30",
  name: "홍콩 역사박물관",
  address: "",
  memo: "",
  link: "",
  costAmount: null,
  costCurrency: null,
};

describe("itemsForm", () => {
  it("항목 여러 개를 items.N.* 칸으로, 모두 넣기", () => {
    const form = itemsForm([base, { ...base, kind: "food", name: "미도 카페", time: null, costAmount: 120, costCurrency: "HKD" }]);
    expect(form.get("count")).toBe("2");
    expect(form.get("items.0.include")).toBe("on");
    expect(form.get("items.1.include")).toBe("on");
    expect(form.get("items.1.time")).toBe("");
    expect(form.get("items.1.costAmount")).toBe("120");
  });

  it("저장 액션의 검사(parseItemForm)로 다시 읽으면 같은 값", () => {
    const item: ItemInput = { ...base, kind: "transport", name: "KE608 홍콩 → 인천", costAmount: 420000, costCurrency: "KRW" };
    const parsed = parseItemForm(itemsForm([item]), "items.0.");
    expect(parsed).toEqual({ ok: true, value: item });
  });

  it("예약 정보(F20)가 있으면 함께 보낸다", () => {
    const item: ItemInput = { ...base, kind: "lodging", name: "아일랜드 샹그릴라", booking: { no: "AB12345", link: "https://example.com/r", level: "owner" } };
    const form = itemsForm([item]);
    expect(form.get("items.0.booking")).toBe("1");
    expect(form.get("items.0.bookingNo")).toBe("AB12345");
    expect(form.get("items.0.linkLevel")).toBe("owner");
  });

  it("예약 정보가 없으면 예약 칸을 보내지 않는다", () => {
    expect(itemsForm([base]).has("items.0.booking")).toBe(false);
  });
});
