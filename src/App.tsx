import { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import * as topojson from 'topojson-client'
import { countryNames, regionCountries, languages } from './data/countries'
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
type GameMode = 'explore' | 'quiz-name-to-map' | 'quiz-map-to-name' | 'quiz-fill-in'

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

  // クイズ関連のstate
  const [gameMode, setGameMode] = useState<GameMode>('explore')
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [remainingCountries, setRemainingCountries] = useState<string[]>([])
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong', message: string } | null>(null)
  const [choices, setChoices] = useState<string[]>([])

  // 穴埋めクイズ関連のstate
  const [hiddenCountries, setHiddenCountries] = useState<string[]>([])
  const [fillInTarget, setFillInTarget] = useState<string | null>(null)
  const [fillInChoices, setFillInChoices] = useState<string[]>([])

  // 地図データを読み込む
  useEffect(() => {
    fetch('/data/countries.json')
      .then(response => response.json())
      .then(data => {
        setWorldData(data)
      })
  }, [])

  // 国名を取得する関数
  const getCountryName = useCallback((iso3: string): string => {
    if (!countryNames[iso3]) return `Unknown`

    const name1 = countryNames[iso3][language1] || countryNames[iso3]['en']
    if (language2 && language2 !== language1) {
      const name2 = countryNames[iso3][language2] || countryNames[iso3]['en']
      return `${name1} / ${name2}`
    }
    return name1
  }, [language1, language2])

  // 数値IDから国名を取得
  const getCountryNameFromNumeric = useCallback((numericId: number): string => {
    const iso3 = numericToISO3[numericId]
    if (!iso3) return `Unknown (${numericId})`
    return getCountryName(iso3)
  }, [getCountryName])

  // クイズを開始する
  const startQuiz = (mode: 'quiz-name-to-map' | 'quiz-map-to-name') => {
    if (currentRegion === 'world') {
      alert('地域を選択してください（世界全体ではクイズできません）')
      return
    }

    const countries = regionCountries[currentRegion] || []
    const availableCountries = countries.filter(c => countryNames[c])

    if (availableCountries.length === 0) {
      alert('この地域にはクイズ対象の国がありません')
      return
    }

    setGameMode(mode)
    setScore(0)
    setTotalQuestions(0)
    setRemainingCountries([...availableCountries].sort(() => Math.random() - 0.5))
    setFeedback(null)
  }

  // 穴埋めクイズを開始する
  const startFillInQuiz = () => {
    if (currentRegion === 'world') {
      alert('地域を選択してください（世界全体ではクイズできません）')
      return
    }

    const countries = regionCountries[currentRegion] || []
    const available = countries.filter(c => countryNames[c])

    if (available.length < 3) {
      alert('この地域にはクイズ対象の国が少なすぎます')
      return
    }

    const count = Math.min(5, Math.max(3, Math.floor(Math.random() * 3) + 3))
    const actualCount = Math.min(count, available.length)
    const shuffled = [...available].sort(() => Math.random() - 0.5)
    const hidden = shuffled.slice(0, actualCount)

    setGameMode('quiz-fill-in')
    setHiddenCountries(hidden)
    setScore(0)
    setTotalQuestions(hidden.length)
    setFillInTarget(null)
    setFillInChoices([])
    setFeedback(null)
    setRemainingCountries([])
    setCurrentQuestion(null)
  }

  // 穴埋めクイズの選択肢をクリックした時の処理
  const handleFillInChoice = useCallback((choice: string) => {
    if (!fillInTarget) return

    if (choice === fillInTarget) {
      const newHidden = hiddenCountries.filter(c => c !== fillInTarget)
      setHiddenCountries(newHidden)
      setScore(prev => prev + 1)
      setFeedback({ type: 'correct', message: '正解！ 🎉' })
      setFillInTarget(null)
      setFillInChoices([])

      setTimeout(() => setFeedback(null), 1000)

      if (newHidden.length === 0) {
        setTimeout(() => {
          alert('全問正解！クリア！ 🎉')
          endQuiz()
        }, 1000)
      }
    } else {
      setFeedback({ type: 'wrong', message: 'はずれ... もう一度！' })
    }
  }, [fillInTarget, hiddenCountries])

  // 次の問題を出題
  useEffect(() => {
    if (gameMode.startsWith('quiz') && gameMode !== 'quiz-fill-in' && remainingCountries.length > 0 && !currentQuestion) {
      const nextCountry = remainingCountries[0]
      setCurrentQuestion(nextCountry)

      // 地図→国名モードの場合、選択肢を生成
      if (gameMode === 'quiz-map-to-name') {
        const otherCountries = Object.keys(countryNames).filter(c => c !== nextCountry)
        const shuffled = otherCountries.sort(() => Math.random() - 0.5)
        const wrongChoices = shuffled.slice(0, 3)
        const allChoices = [...wrongChoices, nextCountry].sort(() => Math.random() - 0.5)
        setChoices(allChoices)
      }
    }
  }, [gameMode, remainingCountries, currentQuestion])

  // 地図→国名モードで選択肢をクリックした時の処理
  const handleChoiceClick = (choice: string) => {
    if (!currentQuestion) return

    setTotalQuestions(prev => prev + 1)

    if (choice === currentQuestion) {
      // 正解
      setScore(prev => prev + 1)
      setFeedback({ type: 'correct', message: '正解！ 🎉' })

      setTimeout(() => {
        const newRemaining = remainingCountries.slice(1)
        setRemainingCountries(newRemaining)
        setCurrentQuestion(null)
        setFeedback(null)

        if (newRemaining.length === 0) {
          setTimeout(() => {
            alert(`クイズ終了！\nスコア: ${score + 1} / ${totalQuestions + 1}`)
            endQuiz()
          }, 500)
        }
      }, 1000)
    } else {
      // 不正解
      const correctName = getCountryName(currentQuestion)
      setFeedback({ type: 'wrong', message: `残念... 正解は ${correctName}` })
    }
  }

  const endQuiz = () => {
    setGameMode('explore')
    setCurrentQuestion(null)
    setRemainingCountries([])
    setFeedback(null)
    setHiddenCountries([])
    setFillInTarget(null)
    setFillInChoices([])
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
      .attr('fill', (d: any) => {
        const numericId = parseInt(d.id)
        const iso3 = numericToISO3[numericId]
        if (gameMode === 'quiz-map-to-name' && iso3 === currentQuestion) {
          return '#ffa500'
        }
        if (gameMode === 'quiz-fill-in' && iso3 && hiddenCountries.includes(iso3)) {
          return '#888888'
        }
        return '#69b3a2'
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.5)
      .attr('cursor', 'pointer')
      .on('mouseover', function(this: SVGPathElement, _event: any, d: any) {
        const numericId = parseInt(d.id)
        const iso3 = numericToISO3[numericId]
        if (gameMode === 'quiz-fill-in' && iso3 && hiddenCountries.includes(iso3)) {
          d3.select(this).attr('fill', '#aaaaaa')
        } else {
          d3.select(this).attr('fill', '#ffa500')
        }
        if (gameMode === 'explore') {
          setHoveredCountry(getCountryNameFromNumeric(numericId))
        }
      })
      .on('mouseout', function(this: SVGPathElement, _event: any, d: any) {
        const numericId = parseInt(d.id)
        const iso3 = numericToISO3[numericId]
        if (gameMode === 'quiz-fill-in' && iso3 && hiddenCountries.includes(iso3)) {
          d3.select(this).attr('fill', '#888888')
        } else if (gameMode === 'quiz-map-to-name' && iso3 === currentQuestion) {
          d3.select(this).attr('fill', '#ffa500')
        } else {
          d3.select(this).attr('fill', '#69b3a2')
        }
        if (gameMode === 'explore') {
          setHoveredCountry(null)
        }
      })
      .on('click', function(this: SVGPathElement, _event: any, d: any) {
        const numericId = parseInt(d.id)
        const clickedISO3 = numericToISO3[numericId]

        if (gameMode === 'quiz-name-to-map' && currentQuestion) {
          setTotalQuestions(prev => prev + 1)

          if (clickedISO3 === currentQuestion) {
            // 正解
            setScore(prev => prev + 1)
            setFeedback({ type: 'correct', message: '正解！ 🎉' })

            // 次の問題へ
            setTimeout(() => {
              const newRemaining = remainingCountries.slice(1)
              setRemainingCountries(newRemaining)
              setCurrentQuestion(null)
              setFeedback(null)

              if (newRemaining.length === 0) {
                // クイズ終了
                setTimeout(() => {
                  alert(`クイズ終了！\nスコア: ${score + 1} / ${totalQuestions + 1}`)
                  endQuiz()
                }, 500)
              }
            }, 1000)
          } else {
            // 不正解
            const clickedName = clickedISO3 ? getCountryName(clickedISO3) : 'Unknown'
            setFeedback({ type: 'wrong', message: `残念... ${clickedName} ではありません` })
          }
        } else if (gameMode === 'quiz-fill-in') {
          if (clickedISO3 && hiddenCountries.includes(clickedISO3)) {
            // 隠れた国をクリック → 4択を生成
            const regionList = regionCountries[currentRegion] || []
            const otherCountries = regionList.filter(c => c !== clickedISO3 && countryNames[c])
            const wrongChoices = [...otherCountries].sort(() => Math.random() - 0.5).slice(0, 3)
            const allChoices = [...wrongChoices, clickedISO3].sort(() => Math.random() - 0.5)
            setFillInTarget(clickedISO3)
            setFillInChoices(allChoices)
            setFeedback(null)
          }
        } else if (gameMode === 'explore') {
          setHoveredCountry(getCountryNameFromNumeric(numericId))
        }
      })

  }, [worldData, currentRegion, gameMode, currentQuestion, hiddenCountries, getCountryNameFromNumeric, getCountryName, remainingCountries, score, totalQuestions])

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
            onClick={() => {
              setCurrentRegion(key as RegionKey)
              if (gameMode.startsWith('quiz')) endQuiz()
            }}
            className={currentRegion === key ? 'active' : ''}
            disabled={gameMode.startsWith('quiz')}
          >
            {value.name}
          </button>
        ))}
      </div>

      {gameMode === 'explore' ? (
        <>
          <div className="country-name-display">
            {hoveredCountry || '国をタップ/ホバーして確認'}
          </div>

          <div className="quiz-mode-buttons">
            <button className="quiz-start-button" onClick={() => startQuiz('quiz-name-to-map')}>
              🎯 国名→地図クイズ
            </button>
            <button className="quiz-start-button secondary" onClick={() => startQuiz('quiz-map-to-name')}>
              🗺️ 地図→国名クイズ
            </button>
            <button className="quiz-start-button fill-in" onClick={() => startFillInQuiz()}>
              📝 穴埋めクイズ
            </button>
          </div>
        </>
      ) : (
        <div className="quiz-panel">
          {gameMode === 'quiz-name-to-map' && (
            <>
              <div className="quiz-question">
                <span className="quiz-label">この国をクリック:</span>
                <span className="quiz-country-name">{currentQuestion ? getCountryName(currentQuestion) : ''}</span>
              </div>
            </>
          )}

          {gameMode === 'quiz-map-to-name' && (
            <>
              <div className="quiz-question">
                <span className="quiz-label">オレンジの国はどこ？</span>
              </div>
              <div className="quiz-choices">
                {choices.map((choice) => (
                  <button
                    key={choice}
                    className="quiz-choice-button"
                    onClick={() => handleChoiceClick(choice)}
                  >
                    {getCountryName(choice)}
                  </button>
                ))}
              </div>
            </>
          )}

          {gameMode === 'quiz-fill-in' && (
            <>
              <div className="quiz-question">
                <span className="quiz-label">
                  {fillInTarget
                    ? 'この国はどこ？'
                    : `グレーの国をクリックして答えよう！（残り ${hiddenCountries.length} 問）`}
                </span>
              </div>
              {fillInTarget && (
                <div className="quiz-choices">
                  {fillInChoices.map((choice) => (
                    <button
                      key={choice}
                      className="quiz-choice-button"
                      onClick={() => handleFillInChoice(choice)}
                    >
                      {getCountryName(choice)}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          <div className="quiz-score">
            {gameMode === 'quiz-fill-in'
              ? `発見: ${score} / ${totalQuestions}`
              : `スコア: ${score} / ${totalQuestions} | 残り: ${remainingCountries.length}問`}
          </div>

          {feedback && (
            <div className={`quiz-feedback ${feedback.type}`}>
              {feedback.message}
            </div>
          )}

          <button className="quiz-end-button" onClick={endQuiz}>
            クイズを終了
          </button>
        </div>
      )}

      <svg ref={svgRef} viewBox="0 0 800 500" style={{width: '100%', height: 'auto'}}></svg>

      <p className="note">
        ※ 一部の地域（係争地・未承認国など）は「Unknown」と表示されます<br />
        ※ 地図データはNatural Earthに基づいています。表示される境界線は日本政府の公式見解とは異なる場合があります。
      </p>
    </div>
  )
}

export default App
