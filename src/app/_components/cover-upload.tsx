"use client";

import { useRef, useTransition } from "react";
import { setUploadedCover } from "@/app/actions/trips";
import { checkCoverFile, COVER_BUCKET, COVER_TYPES, coverObjectPath } from "@/lib/cover/cover";
import { createClient } from "@/lib/supabase/client";

// 대표 이미지 바꾸기 (F08 결정 5, 7). 소유자만 보인다.
// 사진은 로그인한 사용자 권한으로 Storage에 바로 올리고(소유자 확인은 Storage RLS), 주소 기록은 서버 액션이 한다.
export function CoverUpload({ tripId, className, onError }: { tripId: string; className: string; onError: (message: string | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
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

  return (
    <>
      <button type="button" onClick={() => input.current?.click()} disabled={pending} className={className}>
        {pending ? "올리는 중…" : "대표 이미지"}
      </button>
      <input ref={input} type="file" accept={COVER_TYPES.join(",")} onChange={onChange} hidden />
    </>
  );
}
