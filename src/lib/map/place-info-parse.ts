// Places API(New) 검색 결과에서 매거진 장소 카드(F10)에 쓸 값만 뽑는다. (서버·화면 공용, 순수 함수)

export type PlaceInfo = {
  photoName: string | null; // places/.../photos/... (사진 주소를 받을 때만 쓴다)
  photoUrl: string | null;
  photoCredit: string | null; // 사진 올린 사람 (구글 표시 규칙)
  hours: string[]; // 요일별 영업시간 "월요일: 오전 9:00~오후 5:00"
  mapsUrl: string | null;
  rating: number | null;
};

export type PlaceSearchResponse = {
  places?: {
    photos?: { name?: string; authorAttributions?: { displayName?: string }[] }[];
    regularOpeningHours?: { weekdayDescriptions?: string[] };
    googleMapsUri?: string;
    rating?: number;
  }[];
};

export function parsePlaceInfo(data: PlaceSearchResponse): PlaceInfo | null {
  const place = data.places?.[0];
  if (!place) return null;
  const photo = place.photos?.[0];
  return {
    photoName: photo?.name ?? null,
    photoUrl: null,
    photoCredit: photo?.authorAttributions?.[0]?.displayName ?? null,
    hours: place.regularOpeningHours?.weekdayDescriptions ?? [],
    mapsUrl: place.googleMapsUri ?? null,
    rating: typeof place.rating === "number" ? place.rating : null,
  };
}
