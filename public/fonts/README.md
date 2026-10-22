# G3 한글 글꼴

`NanumGothic-Regular.ttf`: 나눔고딕 Regular, Version 3.021, 원본 내부 이름 NanumGothic. 이 Mac에 설치되어 있던 NAVER 배포 전체 TTF를 수정 없이 복사했다. 파일명만 배포 경로에 맞췄으며 글리프/내부 글꼴 이름은 변경하지 않았다.

저작권: Copyright © 2011 NHN Corporation. All rights reserved. Font designed by Sandoll Communications Inc.

라이선스: SIL Open Font License 1.1. 전문은 `OFL-NanumGothic.txt`에 포함했다. 네이버의 재배포 안내와 함께 저작권을 보존한다.

- 공식 배포/권리 안내: https://hangeul.naver.com/font
- OFL 전문 출처: https://raw.githubusercontent.com/google/fonts/main/ofl/nanumgothic/OFL.txt

초기 Google Fonts 2,054,744-byte 파일에는 ①②③ 글리프가 없어 전체판 4,691,820-byte 파일로 교체했다. 전체판도 임의의 모든 유니코드/emoji 지원을 보장하지 않는다. 새 출력 문구의 문자 지원을 확인한다.

글꼴은 JS 번들에 base64로 넣지 않고 Node runtime에서 파일로 읽는다. 실제 Vercel의 파일 추적/메모리/렌더 한도는 별도로 검증한다.

D+E HTML typography: NanumMyeongjo-Bold.woff2 and NanumPenScript-Regular.woff2 are full Korean fonts compressed from the official google/fonts repository. OFL licenses are adjacent. They are separate from the existing G3 PNG font and do not alter its runtime.
