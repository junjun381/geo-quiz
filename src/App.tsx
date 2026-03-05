import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import * as topojson from 'topojson-client'
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

function App() {
  const svgRef = useRef<SVGSVGElement>(null)
  const [worldData, setWorldData] = useState<any>(null)
  const [currentRegion, setCurrentRegion] = useState<RegionKey>('world')

  // 地図データを読み込む
  useEffect(() => {
    fetch('/data/countries.json')
      .then(response => response.json())
      .then(data => {
        setWorldData(data)
      })
  }, [])

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
      .on('mouseover', function() {
        d3.select(this).attr('fill', '#ffa500')
      })
      .on('mouseout', function() {
        d3.select(this).attr('fill', '#69b3a2')
      })
      .on('click', function(event, d: any) {
        console.log('Clicked country:', d.properties?.name || d.id)
      })

  }, [worldData, currentRegion])

  return (
    <div className="app">
      <h1>🌍 世界地図クイズ</h1>
      
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

      <svg ref={svgRef} width={800} height={500}></svg>
    </div>
  )
}

export default App