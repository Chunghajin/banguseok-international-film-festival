export type CategoryId = "grand" | "lifetime" | "sorry" | "once" | "dissent" | "rescue";
export type Candidate = {id:number;label:string;year:number};
export type Category = {id:CategoryId;name:string;description:string;groups:Candidate[][]};
// IDs verified against TMDB; editorial labels/years remain SCREEN_CONTENT v1.1.
export const CATEGORIES: Category[] = [
  {
    "id": "grand",
    "name": "심사위원장 대상",
    "description": "“이게 내 영화다”가 먼저 나오는 작품",
    "groups": [
      [
        {
          "id": 496243,
          "label": "기생충",
          "year": 2019
        },
        {
          "id": 278,
          "label": "쇼생크 탈출",
          "year": 1994
        },
        {
          "id": 157336,
          "label": "인터스텔라",
          "year": 2014
        },
        {
          "id": 129,
          "label": "센과 치히로의 행방불명",
          "year": 2001
        }
      ],
      [
        {
          "id": 38,
          "label": "이터널 선샤인",
          "year": 2004
        },
        {
          "id": 11216,
          "label": "시네마 천국",
          "year": 1988
        },
        {
          "id": 244786,
          "label": "위플래쉬",
          "year": 2014
        },
        {
          "id": 11104,
          "label": "중경삼림",
          "year": 1994
        }
      ],
      [
        {
          "id": 776503,
          "label": "코다",
          "year": 2021
        },
        {
          "id": 147,
          "label": "400번의 구타",
          "year": 1959
        },
        {
          "id": 21334,
          "label": "천국의 아이들",
          "year": 1997
        },
        {
          "id": 191714,
          "label": "런치박스",
          "year": 2013
        }
      ]
    ]
  },
  {
    "id": "lifetime",
    "name": "평생공로상",
    "description": "오래 곁에 있었거나 오래 남을 것 같은 영화 한 편",
    "groups": [
      [
        {
          "id": 771,
          "label": "나 홀로 집에",
          "year": 1990
        },
        {
          "id": 862,
          "label": "토이 스토리",
          "year": 1995
        },
        {
          "id": 671,
          "label": "해리 포터와 마법사의 돌",
          "year": 2001
        },
        {
          "id": 105,
          "label": "백 투 더 퓨처",
          "year": 1985
        }
      ],
      [
        {
          "id": 47002,
          "label": "러브레터",
          "year": 1995
        },
        {
          "id": 448491,
          "label": "리틀 포레스트",
          "year": 2018
        },
        {
          "id": 37165,
          "label": "트루먼 쇼",
          "year": 1998
        },
        {
          "id": 1584,
          "label": "스쿨 오브 락",
          "year": 2003
        }
      ],
      [
        {
          "id": 369557,
          "label": "싱 스트리트",
          "year": 2016
        },
        {
          "id": 11216,
          "label": "시네마 천국",
          "year": 1988
        },
        {
          "id": 37288,
          "label": "고양이를 부탁해",
          "year": 2001
        },
        {
          "id": 315846,
          "label": "바닷마을 다이어리",
          "year": 2015
        }
      ]
    ]
  },
  {
    "id": "sorry",
    "name": "친구야 미안했상",
    "description": "같이 보자고 했다가 친구 눈치를 보게 된 작품",
    "groups": [
      [
        {
          "id": 27205,
          "label": "인셉션",
          "year": 2010
        },
        {
          "id": 496243,
          "label": "기생충",
          "year": 2019
        },
        {
          "id": 293670,
          "label": "곡성",
          "year": 2016
        },
        {
          "id": 545611,
          "label": "에브리씽 에브리웨어 올 앳 원스",
          "year": 2022
        }
      ],
      [
        {
          "id": 254320,
          "label": "더 랍스터",
          "year": 2015
        },
        {
          "id": 381283,
          "label": "마더!",
          "year": 2017
        },
        {
          "id": 503919,
          "label": "라이트하우스",
          "year": 2019
        },
        {
          "id": 491584,
          "label": "버닝",
          "year": 2018
        }
      ],
      [
        {
          "id": 103328,
          "label": "홀리 모터스",
          "year": 2012
        },
        {
          "id": 97370,
          "label": "언더 더 스킨",
          "year": 2013
        },
        {
          "id": 38368,
          "label": "엉클 분미",
          "year": 2010
        },
        {
          "id": 179144,
          "label": "그레이트 뷰티",
          "year": 2013
        }
      ]
    ]
  },
  {
    "id": "once",
    "name": "두 번은 못 보겠상",
    "description": "강하게 남았지만 다시 볼 용기는 나지 않는 작품. 호불호와 별개",
    "groups": [
      [
        {
          "id": 396535,
          "label": "부산행",
          "year": 2016
        },
        {
          "id": 670,
          "label": "올드보이",
          "year": 2003
        },
        {
          "id": 424,
          "label": "쉰들러 리스트",
          "year": 1993
        },
        {
          "id": 597,
          "label": "타이타닉",
          "year": 1997
        }
      ],
      [
        {
          "id": 641,
          "label": "레퀴엠",
          "year": 2000
        },
        {
          "id": 16,
          "label": "어둠 속의 댄서",
          "year": 2000
        },
        {
          "id": 12477,
          "label": "반딧불이의 묘",
          "year": 1988
        },
        {
          "id": 334541,
          "label": "맨체스터 바이 더 씨",
          "year": 2016
        }
      ],
      [
        {
          "id": 25237,
          "label": "컴 앤 씨",
          "year": 1985
        },
        {
          "id": 336050,
          "label": "사울의 아들",
          "year": 2015
        },
        {
          "id": 46738,
          "label": "그을린 사랑",
          "year": 2010
        },
        {
          "id": 2517,
          "label": "아무도 모른다",
          "year": 2004
        }
      ]
    ]
  },
  {
    "id": "dissent",
    "name": "다들 좋다는데 모르겠상",
    "description": "주변의 호평과 달리 나는 마음이 가지 않았던 작품",
    "groups": [
      [
        {
          "id": 157336,
          "label": "인터스텔라",
          "year": 2014
        },
        {
          "id": 19995,
          "label": "아바타",
          "year": 2009
        },
        {
          "id": 313369,
          "label": "라라랜드",
          "year": 2016
        },
        {
          "id": 475557,
          "label": "조커",
          "year": 2019
        }
      ],
      [
        {
          "id": 545611,
          "label": "에브리씽 에브리웨어 올 앳 원스",
          "year": 2022
        },
        {
          "id": 705996,
          "label": "헤어질 결심",
          "year": 2022
        },
        {
          "id": 85350,
          "label": "보이후드",
          "year": 2014
        },
        {
          "id": 438631,
          "label": "듄",
          "year": 2021
        }
      ],
      [
        {
          "id": 8967,
          "label": "트리 오브 라이프",
          "year": 2011
        },
        {
          "id": 64690,
          "label": "드라이브",
          "year": 2011
        },
        {
          "id": 30020,
          "label": "체리 향기",
          "year": 1997
        },
        {
          "id": 467244,
          "label": "존 오브 인터레스트",
          "year": 2023
        }
      ]
    ]
  },
  {
    "id": "rescue",
    "name": "아무도 안 줘서 내가 주겠상",
    "description": "더 사랑받아도 된다고 생각하는 작품. 실제 수상 이력과 무관",
    "groups": [
      [
        {
          "id": 644,
          "label": "A.I.",
          "year": 2001
        },
        {
          "id": 116745,
          "label": "월터의 상상은 현실이 된다",
          "year": 2013
        },
        {
          "id": 9502,
          "label": "쿵푸팬더",
          "year": 2008
        },
        {
          "id": 77117,
          "label": "써니",
          "year": 2011
        }
      ],
      [
        {
          "id": 7459,
          "label": "스피드 레이서",
          "year": 2008
        },
        {
          "id": 83542,
          "label": "클라우드 아틀라스",
          "year": 2012
        },
        {
          "id": 369557,
          "label": "싱 스트리트",
          "year": 2016
        },
        {
          "id": 37288,
          "label": "고양이를 부탁해",
          "year": 2001
        }
      ],
      [
        {
          "id": 483297,
          "label": "소공녀",
          "year": 2018
        },
        {
          "id": 49529,
          "label": "존 카터: 바숨 전쟁의 서막",
          "year": 2012
        },
        {
          "id": 36592,
          "label": "스윙걸즈",
          "year": 2004
        },
        {
          "id": 513434,
          "label": "카메라를 멈추면 안 돼!",
          "year": 2017
        }
      ]
    ]
  }
];
