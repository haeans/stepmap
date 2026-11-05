import type { ItemInput } from "./validation";

// 저장 전 항목(F18 추천, F28 미리보기)을 자동 추출 저장 액션(saveExtractedItems)이 읽는 폼 모양(items.N.*)으로 바꾼다.
// 넣은 항목만 보내므로 모두 include=on이다. 예약 칸(F20)이 있으면 함께 보낸다(소유자만 보는 곳에 저장).
export function itemsForm(items: ItemInput[]): FormData {
  const form = new FormData();
  form.set("count", String(items.length));
  items.forEach((item, i) => {
    const p = `items.${i}.`;
    form.set(`${p}include`, "on");
    form.set(`${p}kind`, item.kind);
    form.set(`${p}day`, String(item.day));
    form.set(`${p}time`, item.time ?? "");
    form.set(`${p}name`, item.name);
    form.set(`${p}address`, item.address);
    form.set(`${p}memo`, item.memo);
    form.set(`${p}link`, item.link);
    form.set(`${p}costAmount`, item.costAmount === null ? "" : String(item.costAmount));
    form.set(`${p}costCurrency`, item.costCurrency ?? "");
    if (item.booking) {
      form.set(`${p}booking`, "1");
      form.set(`${p}bookingNo`, item.booking.no);
      form.set(`${p}bookingLink`, item.booking.link);
      form.set(`${p}linkLevel`, item.booking.level);
    }
  });
  return form;
}
