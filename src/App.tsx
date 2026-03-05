import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import * as topojson from 'topojson-client'
import { countryNames, languages } from './data/countries'
import './App.css'

// 地域の定義
const regions = {
  world: { name: '世界', center: [0, 20] as [number, number], scale: 150 },
  middleEast: { name: '中東', center: [45, 28] as [number, number], scale: 600 },
  europe: { name: 'ヨーロッパ', center: [15, 52] as [number, number], scale: 600 },
  asia: { name: 'アジア', center: [105, 35] as [number, number], scale: 400 },
  africa: { name: 'アフリカ', center: [20, 0] as [number, number], scale: 400 },
  northAmerica: { name: '北米', center: [-100, 45] as [number, number], scale: 400 },
  southAmerica: { name: '南米', center: [-60, -15] as [number, number], scale: 400 },
  oceania: { name: 'オセアニア', center: [140, -25] as [number, number], scale: 500 },
}

type RegionKey = keyof typeof regions

// 国コードの変換マップ（数値ID → ISO3）
const numericToISO3: Record<number, string> = {
  4: "AFG", 8: "ALB", 12: "DZA", 20: "AND", 24: "AGO", 31: "AZE", 32: "ARG", 
  36: "AUS", 40: "AUT", 48: "BHR", 50: "BGD", 51: "ARM", 56: "BEL", 64: "BTN", 
  68: "BOL", 70: "BIH", 72: "BWA", 76: "BRA", 96: "BRN", 100: "BGR", 104: "MMR", 
  108: "BDI", 112: "BLR", 116: "KHM", 120: "CMR", 124: "CAN", 140: "CAF",
  144: "LKA", 148: "TCD", 152: "CHL", 156: "CHN", 158: "TWN", 170: "COL", 
  178: "COG", 180: "COD", 188: "CRI", 191: "HRV", 192: "CUB", 196: "CYP", 
  203: "CZE", 204: "BEN", 208: "DNK", 214: "DOM", 218: "ECU", 222: "SLV", 
  226: "GNQ", 231: "ETH", 232: "ERI", 233: "EST", 242: "FJI", 246: "FIN", 
  250: "FRA", 262: "DJI", 266: "GAB", 268: "GEO", 270: "GMB", 275: "PSE",
  276: "DEU", 288: "GHA", 300: "GRC", 308: "GRD", 320: "GTM", 324: "GIN",
  328: "GUY", 332: "HTI", 340: "HND", 348: "HUN", 352: "ISL", 356: "IND", 
  360: "IDN", 364: "IRN", 368: "IRQ", 372: "IRL", 376: "ISR", 380: "ITA", 
  384: "CIV", 388: "JAM", 392: "JPN", 398: "KAZ", 400: "JOR", 404: "KEN", 
  408: "PRK", 410: "KOR", 414: "KWT", 417: "KGZ", 418: "LAO", 422: "LBN", 
  426: "LSO", 428: "LVA", 430: "LBR", 434: "LBY", 440: "LTU", 442: "LUX",
  450: "MDG", 454: "MWI", 458: "MYS", 466: "MLI", 478: "MRT", 484: "MEX", 
  496: "MNG", 498: "MDA", 499: "MNE", 504: "MAR", 508: "MOZ", 512: "OMN",
  516: "NAM", 524: "NPL", 528: "NLD", 540: "NCL", 548: "VUT", 554: "NZL", 
  558: "NIC", 562: "NER", 566: "NGA", 578: "NOR", 586: "PAK", 591: "PAN", 
  598: "PNG", 600: "PRY", 604: "PER", 608: "PHL", 616: "POL", 620: "PRT", 
  624: "GNB", 626: "TLS", 634: "QAT", 642: "ROU", 643: "RUS", 646: "RWA",
  682: "SAU", 686: "SEN", 688: "SRB", 694: "SLE", 702: "SGP", 703: "SVK",
  704: "VNM", 705: "SVN", 706: "SOM", 710: "ZAF", 716: "ZWE", 724: "ESP", 
  728: "SSD", 729: "SDN", 732: "ESH", 740: "SUR", 748: "SWZ", 752: "SWE", 
  756: "CHE", 760: "SYR", 762: "TJK", 764: "THA", 768: "TGO", 780: "TTO",
  784: "ARE", 788: "TUN", 792: "TUR", 795: "TKM", 800: "UGA", 804: "UKR", 
  807: "MKD", 818: "EGY", 826: "GBR", 834: "TZA", 840: "USA", 854: "BFA",
  858: "URY", 860: "UZB", 862: "VEN", 887: "YEM", 894: "ZMB", 90: "SLB"
}

function App() {
  const svgRef = useRef<SVGSVGElement>(null)
  const [worldData, setWorldData] = useState<any>(null)
  const [currentRegion, setCurrentRegion] = useState<RegionKey>('world')
  const [language1, setLanguage1] = useState('ja')
  const [language2, setLanguage2] = useState('')
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null)

  // 地図データを読み込む
  useEffect(() => {
    fetch('/data/countries.json')
      .then(response => response.json())
      .then(data => {
        setWorldData(data)
      })
  }, [])

  // 国名を取得する関数
  const getCountryName = (numericId: number): string => {
    const iso3 = numericToISO3[numericId]
    if (!iso3 || !countryNames[iso3]) return `Unknown (${numericId})`
    
    const name1 = countryNames[iso3][language1] || countryNames[iso3]['en']
    if (language2 && language2 !== language1) {
      const name2 = countryNames[iso3][language2] || countryNames[iso3]['en']
      return `${name1} / ${name2}`
    }
    return name1
  }

  // 地図を描画する
  useEffect(() => {
    if (!worldData || !svgRef.current) return

    const svg = d3.select(svgRef.current)
    const width = 800
    const height = 500

    svg.selectAll('*').remove()

    const region = regions[currentRegion]
    const projection = d3.geoMercator()
      .center(region.center)
      .scale(region.scale)
      .translate([width / 2, height / 2])

    const path = d3.geoPath().projection(projection)

    const countries = topojson.feature(worldData, worldData.objects.countries) as any

    svg.append('g')
      .selectAll('path')
      .data(countries.features)
      .enter()
      .append('path')
      .attr('d', path as any)
      .attr('fill', '#69b3a2')
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.5)
      .attr('cursor', 'pointer')
      .on('mouseover', function(event, d: any) {
        d3.select(this).attr('fill', '#ffa500')
        const numericId = parseInt(d.id)
        setHoveredCountry(getCountryName(numericId))
      })
      .on('mouseout', function() {
        d3.select(this).attr('fill', '#69b3a2')
        setHoveredCountry(null)
      })
      .on('click', function(event, d: any) {
        const numericId = parseInt(d.id)
        alert(getCountryName(numericId))
      })

  }, [worldData, currentRegion, language1, language2])

  return (
    <div className="app">
      <h1>🌍 世界地図クイズ</h1>
      
      <div className="language-selector">
        <label>
          言語1:
          <select value={language1} onChange={(e) => setLanguage1(e.target.value)}>
            {languages.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.name}</option>
            ))}
          </select>
        </label>
        <label>
          言語2:
          <select value={language2} onChange={(e) => setLanguage2(e.target.value)}>
            <option value="">なし</option>
            {languages.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.name}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="region-buttons">
        {Object.entries(regions).map(([key, value]) => (
          <button
            key={key}
            onClick={() => setCurrentRegion(key as RegionKey)}
            className={currentRegion === key ? 'active' : ''}
          >
            {value.name}
          </button>
        ))}
      </div>

      <div className="country-name-display">
        {hoveredCountry || '国にカーソルを合わせてください'}
      </div>

      <svg ref={svgRef} width={800} height={500}></svg>
   <p className="note">
        ※ 一部の地域（係争地・未承認国など）は「Unknown」と表示されます
      </p>
    </div>
  )
}

export default App