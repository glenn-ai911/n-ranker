// 네이버 쇼핑인사이트 카테고리 데이터 (하드코딩)
// 네이버 DataLab API가 외부 서버에서 차단되므로, 주요 카테고리를 직접 정의합니다.

export interface CategoryNode {
    cid: string
    name: string
    children?: CategoryNode[]
}

export const SHOPPING_CATEGORY_TREE: CategoryNode[] = [
    {
        cid: '50000000', name: '패션의류', children: [
            {
                cid: '50000001', name: '여성의류', children: [
                    { cid: '50000054', name: '티셔츠' },
                    { cid: '50000055', name: '니트/스웨터' },
                    { cid: '50000056', name: '블라우스/셔츠' },
                    { cid: '50000057', name: '원피스' },
                    { cid: '50000058', name: '스커트' },
                    { cid: '50000059', name: '바지/팬츠' },
                    { cid: '50000060', name: '청바지' },
                    { cid: '50000061', name: '자켓' },
                    { cid: '50000062', name: '코트' },
                    { cid: '50000063', name: '패딩/점퍼' },
                    { cid: '50000064', name: '가디건' },
                    { cid: '50000065', name: '조끼/베스트' },
                    { cid: '50000066', name: '트레이닝복' },
                    { cid: '50000067', name: '정장' },
                    { cid: '50000068', name: '이너웨어' },
                    { cid: '50000069', name: '홈웨어/잠옷' },
                    { cid: '50000070', name: '수영복/래시가드' },
                    { cid: '50000071', name: '한복' },
                    { cid: '50000072', name: '기타의류' },
                ]
            },
            {
                cid: '50000002', name: '남성의류', children: [
                    { cid: '50000073', name: '티셔츠' },
                    { cid: '50000074', name: '니트/스웨터' },
                    { cid: '50000075', name: '셔츠' },
                    { cid: '50000076', name: '바지/팬츠' },
                    { cid: '50000077', name: '청바지' },
                    { cid: '50000078', name: '자켓' },
                    { cid: '50000079', name: '코트' },
                    { cid: '50000080', name: '패딩/점퍼' },
                    { cid: '50000081', name: '가디건' },
                    { cid: '50000082', name: '조끼/베스트' },
                    { cid: '50000083', name: '트레이닝복' },
                    { cid: '50000084', name: '정장' },
                    { cid: '50000085', name: '이너웨어' },
                    { cid: '50000086', name: '홈웨어/잠옷' },
                    { cid: '50000087', name: '수영복/래시가드' },
                    { cid: '50000088', name: '한복' },
                    { cid: '50000089', name: '기타의류' },
                ]
            },
            {
                cid: '50000003', name: '유아동의류', children: [
                    { cid: '50000090', name: '여아의류' },
                    { cid: '50000091', name: '남아의류' },
                    { cid: '50000092', name: '유아의류' },
                    { cid: '50000093', name: '베이비의류' },
                ]
            },
        ]
    },
    {
        cid: '50000001', name: '패션잡화', children: [
            {
                cid: '50000004', name: '여성가방', children: [
                    { cid: '50000094', name: '숄더백' },
                    { cid: '50000095', name: '토트백' },
                    { cid: '50000096', name: '크로스백' },
                    { cid: '50000097', name: '클러치' },
                    { cid: '50000098', name: '백팩' },
                    { cid: '50000099', name: '에코백' },
                ]
            },
            {
                cid: '50000005', name: '남성가방', children: [
                    { cid: '50000100', name: '브리프케이스' },
                    { cid: '50000101', name: '크로스백' },
                    { cid: '50000102', name: '백팩' },
                    { cid: '50000103', name: '클러치' },
                ]
            },
            {
                cid: '50000006', name: '여성신발', children: [
                    { cid: '50000104', name: '운동화/스니커즈' },
                    { cid: '50000105', name: '구두/로퍼' },
                    { cid: '50000106', name: '샌들/슬리퍼' },
                    { cid: '50000107', name: '부츠/워커' },
                    { cid: '50000108', name: '플랫슈즈' },
                ]
            },
            {
                cid: '50000007', name: '남성신발', children: [
                    { cid: '50000109', name: '운동화/스니커즈' },
                    { cid: '50000110', name: '구두/로퍼' },
                    { cid: '50000111', name: '샌들/슬리퍼' },
                    { cid: '50000112', name: '부츠/워커' },
                ]
            },
            { cid: '50000008', name: '시계', children: [] },
            { cid: '50000009', name: '주얼리', children: [] },
            { cid: '50000010', name: '모자', children: [] },
            { cid: '50000011', name: '벨트', children: [] },
            { cid: '50000012', name: '지갑', children: [] },
            { cid: '50000013', name: '선글라스/안경', children: [] },
            { cid: '50000014', name: '머플러/스카프', children: [] },
            { cid: '50000015', name: '양말', children: [] },
        ]
    },
    {
        cid: '50000002', name: '화장품/미용', children: [
            {
                cid: '50000016', name: '스킨케어', children: [
                    { cid: '50000113', name: '스킨/토너' },
                    { cid: '50000114', name: '에센스/세럼' },
                    { cid: '50000115', name: '로션/에멀전' },
                    { cid: '50000116', name: '크림' },
                    { cid: '50000117', name: '미스트' },
                    { cid: '50000118', name: '선케어' },
                    { cid: '50000119', name: '마스크팩' },
                    { cid: '50000120', name: '클렌징' },
                ]
            },
            {
                cid: '50000017', name: '메이크업', children: [
                    { cid: '50000121', name: '베이스메이크업' },
                    { cid: '50000122', name: '아이메이크업' },
                    { cid: '50000123', name: '립메이크업' },
                    { cid: '50000124', name: '네일' },
                    { cid: '50000125', name: '메이크업도구' },
                ]
            },
            {
                cid: '50000018', name: '헤어케어', children: [
                    { cid: '50000126', name: '샴푸/린스' },
                    { cid: '50000127', name: '트리트먼트/팩' },
                    { cid: '50000128', name: '에센스/오일' },
                    { cid: '50000129', name: '염색/펌' },
                    { cid: '50000130', name: '스타일링' },
                ]
            },
            {
                cid: '50000019', name: '바디케어', children: [
                    { cid: '50000131', name: '바디워시' },
                    { cid: '50000132', name: '바디로션/크림' },
                    { cid: '50000133', name: '핸드케어' },
                    { cid: '50000134', name: '풋케어' },
                    { cid: '50000135', name: '데오드란트' },
                ]
            },
            { cid: '50000020', name: '향수', children: [] },
            { cid: '50000021', name: '남성화장품', children: [] },
            { cid: '50000022', name: '미용소품', children: [] },
        ]
    },
    {
        cid: '50000003', name: '디지털/가전', children: [
            { cid: '50000023', name: '노트북', children: [] },
            { cid: '50000024', name: '데스크탑/모니터', children: [] },
            { cid: '50000025', name: '태블릿PC', children: [] },
            { cid: '50000026', name: '휴대폰', children: [] },
            { cid: '50000027', name: '휴대폰액세서리', children: [] },
            { cid: '50000028', name: '카메라/캠코더', children: [] },
            { cid: '50000029', name: '게임/타이틀', children: [] },
            { cid: '50000030', name: 'TV', children: [] },
            { cid: '50000031', name: '냉장고', children: [] },
            { cid: '50000032', name: '세탁기/건조기', children: [] },
            { cid: '50000033', name: '에어컨', children: [] },
            { cid: '50000034', name: '청소기', children: [] },
            { cid: '50000035', name: '공기청정기', children: [] },
            { cid: '50000036', name: '주방가전', children: [] },
            { cid: '50000037', name: '생활가전', children: [] },
            { cid: '50000038', name: '이미용가전', children: [] },
            { cid: '50000039', name: '음향가전', children: [] },
            { cid: '50000040', name: '영상가전', children: [] },
        ]
    },
    {
        cid: '50000004', name: '가구/인테리어', children: [
            { cid: '50000041', name: '침대/매트리스', children: [] },
            { cid: '50000042', name: '소파', children: [] },
            { cid: '50000043', name: '테이블/책상', children: [] },
            { cid: '50000044', name: '의자', children: [] },
            { cid: '50000045', name: '수납/정리', children: [] },
            { cid: '50000046', name: '침구', children: [] },
            { cid: '50000047', name: '커튼/블라인드', children: [] },
            { cid: '50000048', name: '카페트/러그', children: [] },
            { cid: '50000049', name: '조명', children: [] },
            { cid: '50000050', name: 'DIY/셀프인테리어', children: [] },
            { cid: '50000051', name: '홈갤러리', children: [] },
        ]
    },
    {
        cid: '50000005', name: '출산/육아', children: [
            { cid: '50000136', name: '기저귀', children: [] },
            { cid: '50000137', name: '분유/유아식', children: [] },
            { cid: '50000138', name: '수유용품', children: [] },
            { cid: '50000139', name: '이유식/간식', children: [] },
            { cid: '50000140', name: '유모차', children: [] },
            { cid: '50000141', name: '카시트', children: [] },
            { cid: '50000142', name: '유아완구', children: [] },
            { cid: '50000143', name: '유아동침구', children: [] },
            { cid: '50000144', name: '목욕/위생용품', children: [] },
        ]
    },
    {
        cid: '50000006', name: '식품', children: [
            { cid: '50000145', name: '과일', children: [] },
            { cid: '50000146', name: '채소', children: [] },
            { cid: '50000147', name: '쌀/잡곡', children: [] },
            { cid: '50000148', name: '축산물', children: [] },
            { cid: '50000149', name: '수산물', children: [] },
            { cid: '50000150', name: '건강식품', children: [] },
            { cid: '50000151', name: '면류/통조림', children: [] },
            { cid: '50000152', name: '간식/과자', children: [] },
            { cid: '50000153', name: '음료/커피', children: [] },
            { cid: '50000154', name: '조미료/양념', children: [] },
            { cid: '50000155', name: '반찬/밀키트', children: [] },
            { cid: '50000156', name: '김치/젓갈', children: [] },
        ]
    },
    {
        cid: '50000007', name: '스포츠/레저', children: [
            { cid: '50000157', name: '스포츠의류', children: [] },
            { cid: '50000158', name: '스포츠신발', children: [] },
            { cid: '50000159', name: '헬스/요가', children: [] },
            { cid: '50000160', name: '골프', children: [] },
            { cid: '50000161', name: '등산/아웃도어', children: [] },
            { cid: '50000162', name: '자전거', children: [] },
            { cid: '50000163', name: '캠핑', children: [] },
            { cid: '50000164', name: '낚시', children: [] },
            { cid: '50000165', name: '수영/수상레저', children: [] },
            { cid: '50000166', name: '겨울스포츠', children: [] },
            { cid: '50000167', name: '구기스포츠', children: [] },
        ]
    },
    {
        cid: '50000008', name: '생활/건강', children: [
            { cid: '50000168', name: '세제/세정제', children: [] },
            { cid: '50000169', name: '욕실용품', children: [] },
            { cid: '50000170', name: '주방용품', children: [] },
            { cid: '50000171', name: '생활잡화', children: [] },
            { cid: '50000172', name: '건강관리용품', children: [] },
            { cid: '50000173', name: '의료/위생용품', children: [] },
            { cid: '50000174', name: '문구/사무용품', children: [] },
            { cid: '50000175', name: '반려동물용품', children: [] },
        ]
    },
    {
        cid: '50000009', name: '여가/생활편의', children: [
            { cid: '50000176', name: '도서', children: [] },
            { cid: '50000177', name: '여행/항공권', children: [] },
            { cid: '50000178', name: '티켓/쿠폰', children: [] },
            { cid: '50000179', name: 'e쿠폰', children: [] },
            { cid: '50000180', name: '꽃배달/떡케이크', children: [] },
            { cid: '50000181', name: '자동차용품', children: [] },
        ]
    },
    {
        cid: '50000010', name: '면세점', children: [
            { cid: '50000182', name: '화장품', children: [] },
            { cid: '50000183', name: '패션', children: [] },
            { cid: '50000184', name: '시계/쥬얼리', children: [] },
            { cid: '50000185', name: '전자/통신기기', children: [] },
            { cid: '50000186', name: '식품', children: [] },
        ]
    },
]

/**
 * 주어진 부모 카테고리 ID의 하위 카테고리를 반환합니다.
 */
export function getSubCategories(parentCid: string): { cid: string; name: string }[] {
    // 1차 분류 레벨에서 검색
    const topLevel = SHOPPING_CATEGORY_TREE.find(c => c.cid === parentCid)
    if (topLevel?.children) {
        return topLevel.children.map(c => ({ cid: c.cid, name: c.name }))
    }

    // 2차 분류 레벨에서 검색
    for (const top of SHOPPING_CATEGORY_TREE) {
        if (top.children) {
            const secondLevel = top.children.find(c => c.cid === parentCid)
            if (secondLevel?.children) {
                return secondLevel.children.map(c => ({ cid: c.cid, name: c.name }))
            }
        }
    }

    // 3차 분류 레벨에서 검색
    for (const top of SHOPPING_CATEGORY_TREE) {
        if (top.children) {
            for (const second of top.children) {
                if (second.children) {
                    const thirdLevel = second.children.find(c => c.cid === parentCid)
                    if (thirdLevel?.children) {
                        return thirdLevel.children.map(c => ({ cid: c.cid, name: c.name }))
                    }
                }
            }
        }
    }

    return []
}
