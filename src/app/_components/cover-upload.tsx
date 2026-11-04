"use client";

import { useRef, useTransition } from "react";
import { setUploadedCover } from "@/app/actions/trips";
import { checkCoverFile, COVER_BUCKET, COVER_TYPES, coverObjectPath } from "@/lib/cover/cover";
import { createClient } from "@/lib/supabase/client";

// 대표 이미지 바꾸기 (F08 결정 5, 7). 소유자만 보인다.
// 사진은 로그인한 사용자 권한으로 Storage에 바로 올리고(소유자 확인은 Storage RLS), 주소 기록은 서버 액션이 한다.
// 카드의 ⋯ 메뉴 항목(C9 F24)에서 파일 고르기 창을 연다. 메뉴는 고르는 동안 닫히므로
// 파일 입력(input)은 메뉴 밖, 카드에 늘 붙어 있게 `input`을 따로 그린다.
export function useCoverUpload(tripId: string, onError: (message: string | null) => void) {
  const ref = useRef<HTMLInputElement>(null);
  const [pending, startUpload] = useTransition();

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const problem = checkCoverFile(file);
    if (problem) return onError(problem);

    startUpload(async () => {
      const { error } = await createClient()
        .storage.from(COVER_BUCKET)
        .upload(coverObjectPath(tripId), file, { upsert: true, contentType: file.type, cacheControl: "3600" });
      if (error) return onError("사진을 올리지 못했습니다. 다시 시도해 주세요.");
      const result = await setUploadedCover(tripId);
      onError(result.error);
    });
  }

  return {
    pending,
    pick: () => ref.current?.click(),
    input: <input ref={ref} type="file" accept={COVER_TYPES.join(",")} onChange={onChange} hidden />,
  };
}
