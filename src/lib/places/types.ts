// 매거진 장소 카드 사진 (C8 F22). 화면과 서버가 같이 쓴다.
// 출처 표시: Wikimedia는 작가·라이선스·파일 페이지, Google은 작가(링크)와 "Google Maps"를 사진과 같은 카드 안에 보인다.

export type PhotoAuthor = { name: string; uri: string | null };

export type CardPhoto = {
  url: string;
  source: "wikimedia" | "google";
  authors: PhotoAuthor[];
  license: string | null; // Wikimedia만
  link: string | null; // 원본 페이지: Commons 파일 페이지 또는 Google 지도의 사진
};

export type PhotoResponse = { photo: CardPhoto | null };
