/**
 * 贵州省三级区域 mock 数据（省/市/县 Cascader 选项）
 * 演示环境仅收录代表性区县；正式开发对接行政区划标准库
 */
export const GUIZHOU_REGION_OPTIONS = [
  {
    value: '贵州省',
    label: '贵州省',
    children: [
      {
        value: '贵阳市',
        label: '贵阳市',
        children: ['南明区', '云岩区', '花溪区', '乌当区', '白云区', '观山湖区', '清镇市', '修文县', '息烽县', '开阳县'].map((d) => ({ value: d, label: d })),
      },
      {
        value: '六盘水市',
        label: '六盘水市',
        children: ['钟山区', '六枝特区', '盘州市', '水城区'].map((d) => ({ value: d, label: d })),
      },
      {
        value: '遵义市',
        label: '遵义市',
        children: ['红花岗区', '汇川区', '播州区', '仁怀市', '赤水市', '桐梓县', '湄潭县'].map((d) => ({ value: d, label: d })),
      },
      {
        value: '安顺市',
        label: '安顺市',
        children: ['西秀区', '平坝区', '镇宁布依族苗族自治县', '关岭布依族苗族自治县'].map((d) => ({ value: d, label: d })),
      },
      {
        value: '毕节市',
        label: '毕节市',
        children: ['七星关区', '织金县', '黔西市', '大方县', '威宁彝族回族苗族自治县'].map((d) => ({ value: d, label: d })),
      },
      {
        value: '铜仁市',
        label: '铜仁市',
        children: ['碧江区', '万山区', '石阡县', '思南县', '江口县'].map((d) => ({ value: d, label: d })),
      },
      {
        value: '黔东南苗族侗族自治州',
        label: '黔东南苗族侗族自治州',
        children: ['凯里市', '镇远县', '雷山县', '黎平县', '从江县'].map((d) => ({ value: d, label: d })),
      },
      {
        value: '黔南布依族苗族自治州',
        label: '黔南布依族苗族自治州',
        children: ['都匀市', '荔波县', '福泉市', '独山县'].map((d) => ({ value: d, label: d })),
      },
      {
        value: '黔西南布依族苗族自治州',
        label: '黔西南布依族苗族自治州',
        children: ['兴义市', '兴仁市', '安龙县', '贞丰县'].map((d) => ({ value: d, label: d })),
      },
    ],
  },
]

// Cascader 值 ⇄ Region 对象互转
export function regionToPath(region: { province: string; city: string; district: string }): string[] {
  return [region.province, region.city, region.district]
}

export function pathToRegion(path: (string | number)[]): { province: string; city: string; district: string } {
  return {
    province: String(path[0] ?? '贵州省'),
    city: String(path[1] ?? ''),
    district: String(path[2] ?? ''),
  }
}
