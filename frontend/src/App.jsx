import { useEffect, useMemo, useState } from 'react'
import L from 'leaflet'
import { CircleMarker, MapContainer, Marker, Polygon, Popup, Polyline, TileLayer } from 'react-leaflet'
import { fetchHealth, fetchMahalla, fetchMetrics, fetchOptimize } from './api'
import './App.css'

const translations = {
  en: {
    appTitle: 'MAHALLAMIND',
    headerTitle: 'Interactive mahalla digital twin',
    apiOnline: 'API online',
    apiOffline: 'Offline preview',
    dashboard: 'Dashboard',
    faq: 'FAQ',
    selectedLocation: 'Selected location',
    trafficLights: 'Traffic lights',
    targetSignal: 'Target signal',
    selectedSignal: 'Selected signal',
    localFacility: 'Local facility',
    neighborhoodCopy: 'Local flow is shown across the active neighborhood corridor, with signal focus and contextual access mapped to the roads residents actually use.',
    avgSpeed: 'Avg. speed',
    waiting: 'Waiting',
    liveFlow: 'Live flow',
    peak: 'Peak',
    signals: 'Signals',
    access: 'Access',
    analyze: 'Analyze',
    optimizing: 'Optimizing…',
    analyzing: 'Analyzing…',
    optimize: 'Optimize',
    baseline: 'Baseline',
    peakVehicles: 'Peak vehicles',
    recommendedIntervention: 'Recommended intervention',
    runOptimization: 'Run optimization to compare intervention candidates.',
    whyChoice: 'Why this choice?',
    explanationAfter: 'AI explanation appears after optimization.',
    mahallaPosition: 'MAHALLAMIND position',
    neighborhoodMobilityIntelligence: 'Neighborhood mobility intelligence',
    interventionOptions: 'Intervention options',
    intervention: 'intervention',
    speed: 'Speed',
    wait: 'Wait',
    deltaSpeed: 'Δ speed',
    deltaWait: 'Δ wait',
    confidence: 'Confidence',
    bestSignalId: 'Best signal ID',
    signalFocus: 'Signal focus: the most effective corridor timing change in the current scenario.',
    optimizationScope: 'Optimization scope: multi-factor corridor optimization across signal timing, access, safety, emissions, noise, and pilot feasibility.',
    expectedImpact: 'Expected impact: measurable improvement in delay, emissions, noise, safety, and access on the selected corridor.',
    neighborhoodPlatform: 'MAHALLAMIND is a neighborhood mobility intelligence platform for local signal and flow decisions.',
    neighborhoodContext: 'It helps neighborhood teams act before congestion affects daily movement and access.',
    backendOffline: 'Backend unavailable; offline preview is shown.',
    fallbackSelection: 'not selected',
    backToDashboard: 'Back to dashboard',
    language: 'RU',
    scenario: 'Scenario',
    morning: 'Morning peak',
    midday: 'Midday',
    evening: 'Evening peak',
    presentationMode: 'Presentation brief',
    executiveDecision: 'Decision brief',
    readinessScore: 'Readiness',
    impactScore: 'Impact index',
    delayReduction: 'Delay reduction',
    emissionCut: 'CO2 reduction',
    accessGain: 'Access gain',
    speedGain: 'Speed gain',
    percentagePoints: 'pp',
    launchWindow: 'Launch window',
    dataMode: 'Data mode',
    sumoSimulation: 'SUMO live model',
    demoFallback: 'Calibrated demo model',
    copyBrief: 'Copy brief',
    copied: 'Copied',
    printBrief: 'Print',
    decisionNeeded: 'Decision needed',
    decisionNeededCopy: 'Approve a two-week pilot on the selected corridor, validate field counts, and prepare a scale-up package for the next mahalla cluster.',
    businessCase: 'Executive case',
    implementationPlan: 'Implementation plan',
    riskControls: 'Risk controls',
    pilotNow: 'Pilot now',
    validateField: 'Validate field data',
    scaleNext: 'Scale decision',
    noBrief: 'Run optimization to generate a presentation-ready decision brief.',
    copyUnavailable: 'Brief is ready, but clipboard access is unavailable in this browser.',
    optimizationFactors: 'Optimization factors',
    delayFactor: 'Delay',
    throughputFactor: 'Flow',
    emissionsFactor: 'Emissions',
    safetyFactor: 'Safety',
    accessFactor: 'Access',
    noiseFactor: 'Noise',
    feasibilityFactor: 'Feasibility',
    reliabilityFactor: 'Reliability',
    beforeAfter: 'Before / after evidence',
    citizenImpact: 'Citizen impact',
    minutesSavedDay: 'Minutes saved daily',
    weeklyCo2Cut: 'Weekly CO2 cut',
    protectedAccess: 'Protected access',
    residentsSignal: 'Residents see a clearer trip to school, clinic, market, and bus stops.',
    facilityImpact: 'Facility impact',
    pilotPassport: 'Pilot passport',
    lowCost: 'Low cost',
    reversible: 'Reversible',
    owner: 'Owner',
    cityMobilityTeam: 'City mobility team',
    scenarioStress: 'Scenario stress test',
    runStressTest: 'Run stress test',
    stressTesting: 'Testing...',
    scenarioReady: 'Ready',
    evidencePack: 'Evidence pack',
    roadmapTitle: '30 / 60 / 90 scale-up',
    pitchCard: 'One-slide pitch',
    day30: '30 days',
    day60: '60 days',
    day90: '90 days',
    noStress: 'Run stress test to compare all peak scenarios.',
    problemZones: 'Problem zones',
    severity: 'Severity',
    affectedPlaces: 'Affected places',
    topStrategies: 'Top-3 strategies',
    strategyComparison: 'Top-3 comparison',
    strategy: 'Strategy',
    targetZone: 'Target zone',
    launch: 'Launch',
    ecologyBeforeAfter: 'Ecology before / after',
    before: 'Before',
    after: 'After',
    mapChange: 'Map change',
    appliesHere: 'is applied here',
    chooseStrategy: 'Select',
    optimizationIndex: 'Optimization index',
    dataQuality: 'Data quality',
    modelConfidence: 'Model confidence',
    dataInputs: 'Data inputs',
    environmentLayer: 'Environment layer',
    idleProxy: 'Idle proxy',
    futureSources: 'Future sources',
    downloadReport: 'Download report',
    reportDownloaded: 'Report ready',
    noProblemZones: 'Run optimization to map the highest-pressure zones.',
    faqPageTitle: 'Frequently asked questions',
    faqPageIntro: 'This page explains how the model works, what it measures, and how neighborhood-level decisions are evaluated in practice.',
    faqSections: [
      {
        q: 'What is the analysis area?',
        a: 'The analysis area is the local neighborhood corridor and its main access links. It covers only the physically relevant district, so the intervention remains understandable and actionable for local decision-makers.',
      },
      {
        q: 'Why are the traffic-light icons removed?',
        a: 'The map is designed to emphasize the neighborhood operating context rather than decorative control symbols. This makes the area easier to read and keeps the focus on the actual intervention logic.',
      },
      {
        q: 'Why are the vehicles no longer animated?',
        a: 'Animated vehicle markers add visual noise and can suggest unrealistic motion across water or non-road features. A simplified map reads more clearly and avoids misleading interpretations.',
      },
      {
        q: 'What does optimization compare?',
        a: 'It evaluates realistic local interventions such as adaptive phases, queue response, pedestrian priority, bus priority, curb management, safety measures, and low-emission timing using delay, throughput, emissions, noise, access, safety, feasibility, and reliability as decision factors.',
      },
      {
        q: 'What is the purpose of the dashboard?',
        a: 'The dashboard supports quick comparison between current conditions and recommended interventions so a user can assess whether a local mobility change improves flow without losing clarity or public access.',
      },
      {
        q: 'How should I interpret the results?',
        a: 'Use the recommended option as a decision support input, not as an unquestioned mandate. The strongest choice is the one that improves the corridor while keeping the district legible, safe, and accessible.',
      },
    ],
  },
  ru: {
    appTitle: 'MAHALLAMIND',
    headerTitle: 'Интерактивная цифровая двойня района',
    apiOnline: 'API онлайн',
    apiOffline: 'Офлайн-превью',
    dashboard: 'Панель',
    faq: 'FAQ',
    selectedLocation: 'Выбранный участок',
    trafficLights: 'Светофоры',
    targetSignal: 'Целевой сигнал',
    selectedSignal: 'Выбранный сигнал',
    localFacility: 'Локальный объект',
    neighborhoodCopy: 'Поток отображается по активному коридору района, а приоритет и доступность привязаны к дорогам, которыми пользуются жители.',
    avgSpeed: 'Средняя скорость',
    waiting: 'Ожидание',
    liveFlow: 'Поток',
    peak: 'Пик',
    signals: 'Сигналы',
    access: 'Доступ',
    analyze: 'Анализ',
    optimizing: 'Оптимизация…',
    analyzing: 'Анализ…',
    optimize: 'Оптимизировать',
    baseline: 'Базовый сценарий',
    peakVehicles: 'Пик транспорта',
    recommendedIntervention: 'Рекомендуемое решение',
    runOptimization: 'Запустите оптимизацию, чтобы сравнить варианты вмешательства.',
    whyChoice: 'Почему этот вариант?',
    explanationAfter: 'Объяснение ИИ появится после оптимизации.',
    mahallaPosition: 'Позиция MAHALLAMIND',
    neighborhoodMobilityIntelligence: 'Интеллект мобильности района',
    interventionOptions: 'Варианты вмешательства',
    intervention: 'мера',
    speed: 'Скорость',
    wait: 'Ожидание',
    deltaSpeed: 'Δ скорость',
    deltaWait: 'Δ ожидание',
    confidence: 'Уверенность',
    bestSignalId: 'Лучший сигнал ID',
    signalFocus: 'Фокус сигнала: наиболее эффективное изменение фаз коридора в текущем сценарии.',
    optimizationScope: 'Объём оптимизации: многокритериальная оптимизация коридора: фазы, доступность, безопасность, выбросы, шум и реализуемость пилота.',
    expectedImpact: 'Ожидаемый эффект: измеримое улучшение задержек, выбросов, шума, безопасности и доступности на выбранном коридоре.',
    neighborhoodPlatform: 'MAHALLAMIND — платформа интеллектуальной мобильности района для локальных решений по сигналам и потокам.',
    neighborhoodContext: 'Она помогает местным командам действовать до того, как заторы начнут влиять на повседневное движение и доступность.',
    backendOffline: 'Сервер недоступен; показан офлайн-превью.',
    fallbackSelection: 'не выбрано',
    backToDashboard: 'Назад к панели',
    language: 'EN',
    scenario: 'Сценарий',
    morning: 'Утренний пик',
    midday: 'Полдень',
    evening: 'Вечерний пик',
    presentationMode: 'Презентационный брифинг',
    executiveDecision: 'Управленческое решение',
    readinessScore: 'Готовность',
    impactScore: 'Индекс эффекта',
    delayReduction: 'Снижение ожидания',
    emissionCut: 'Снижение CO2',
    accessGain: 'Рост доступности',
    speedGain: 'Рост скорости',
    percentagePoints: 'п.п.',
    launchWindow: 'Окно запуска',
    dataMode: 'Режим данных',
    sumoSimulation: 'SUMO-модель',
    demoFallback: 'Калиброванная демо-модель',
    copyBrief: 'Скопировать бриф',
    copied: 'Скопировано',
    printBrief: 'Печать',
    decisionNeeded: 'Нужное решение',
    decisionNeededCopy: 'Одобрить двухнедельный пилот на выбранном коридоре, подтвердить полевые замеры и подготовить пакет масштабирования на следующий кластер махалли.',
    businessCase: 'Кейс для руководства',
    implementationPlan: 'План внедрения',
    riskControls: 'Контроль рисков',
    pilotNow: 'Запуск пилота',
    validateField: 'Полевое подтверждение',
    scaleNext: 'Решение о масштабе',
    noBrief: 'Запустите оптимизацию, чтобы сформировать брифинг для презентации.',
    copyUnavailable: 'Бриф готов, но браузер не дал доступ к буферу обмена.',
    optimizationFactors: 'Факторы оптимизации',
    delayFactor: 'Задержка',
    throughputFactor: 'Поток',
    emissionsFactor: 'Выбросы',
    safetyFactor: 'Безопасность',
    accessFactor: 'Доступность',
    noiseFactor: 'Шум',
    feasibilityFactor: 'Внедрение',
    reliabilityFactor: 'Надежность',
    beforeAfter: 'Доказательство до / после',
    citizenImpact: 'Эффект для жителей',
    minutesSavedDay: 'Минут экономии в день',
    weeklyCo2Cut: 'CO2 меньше в неделю',
    protectedAccess: 'Защищенный доступ',
    residentsSignal: 'Жители видят понятный маршрут к школе, клинике, рынку и остановкам.',
    facilityImpact: 'Влияние на объекты',
    pilotPassport: 'Паспорт пилота',
    lowCost: 'Низкая стоимость',
    reversible: 'Можно откатить',
    owner: 'Ответственный',
    cityMobilityTeam: 'Городская mobility-команда',
    scenarioStress: 'Стресс-тест сценариев',
    runStressTest: 'Проверить сценарии',
    stressTesting: 'Проверка...',
    scenarioReady: 'Готов',
    evidencePack: 'Пакет доказательств',
    roadmapTitle: 'Масштабирование 30 / 60 / 90',
    pitchCard: 'One-slide pitch',
    day30: '30 дней',
    day60: '60 дней',
    day90: '90 дней',
    noStress: 'Запустите стресс-тест, чтобы сравнить все пиковые сценарии.',
    problemZones: 'Проблемные зоны',
    severity: 'Нагрузка',
    affectedPlaces: 'Затронутые места',
    topStrategies: 'Top-3 стратегии',
    strategyComparison: 'Сравнение top-3',
    strategy: 'Стратегия',
    targetZone: 'Целевая зона',
    launch: 'Запуск',
    ecologyBeforeAfter: 'Экология до / после',
    before: 'До',
    after: 'После',
    mapChange: 'Изменение на карте',
    appliesHere: 'применяется здесь',
    chooseStrategy: 'Выбрать',
    optimizationIndex: 'Индекс оптимизации',
    dataQuality: 'Качество данных',
    modelConfidence: 'Уверенность модели',
    dataInputs: 'Источники данных',
    environmentLayer: 'Экологический слой',
    idleProxy: 'Простой транспорта',
    futureSources: 'Будущие источники',
    downloadReport: 'Скачать отчет',
    reportDownloaded: 'Отчет готов',
    noProblemZones: 'Запустите оптимизацию, чтобы увидеть зоны с максимальной нагрузкой.',
    faqPageTitle: 'Часто задаваемые вопросы',
    faqPageIntro: 'Эта страница объясняет, как работает модель, какие показатели она оценивает и как принимаются решения на уровне района.',
    faqSections: [
      {
        q: 'Что входит в зону анализа?',
        a: 'В зону анализа входят локальный районный коридор и основные точки доступа. Она охватывает только ту территорию, которая реально влияет на движение и решения местных органов, чтобы сценарий оставался понятным и применимым на практике.',
      },
      {
        q: 'Почему значки светофоров убраны?',
        a: 'Карта теперь подчеркивает контекст района и логику вмешательства, а не декоративные элементы управления. Это делает карту более читаемой и помогает сосредоточиться на реальном решении.',
      },
      {
        q: 'Почему машины больше не анимированы?',
        a: 'Анимированные маркеры создают визуальный шум и могут вводить в заблуждение, будто транспорт движется по воде или вне дорог. Упрощённая карта лучше передаёт реальную структуру района и снижает ложные интерпретации.',
      },
      {
        q: 'Что именно сравнивает оптимизация?',
        a: 'Она сравнивает реалистичные локальные меры: адаптивные фазы, реакцию на очереди, приоритет пешеходам и автобусам, управление бордюром, безопасность и экологичную настройку. Факторы выбора: задержки, поток, выбросы, шум, доступность, безопасность, реализуемость и надежность.',
      },
      {
        q: 'Какова цель панели управления?',
        a: 'Панель нужна для быстрого сравнения текущих условий и рекомендуемого решения, чтобы пользователь мог понять, улучшает ли локальная мера поток без потери ясности и общественной доступности.',
      },
      {
        q: 'Как правильно интерпретировать результаты?',
        a: 'Рекомендуемый вариант следует воспринимать как инструмент поддержки решения, а не как безусловную команду. Лучшее решение — это то, которое снижает задержки и сохраняет понятность, безопасность и доступность района.',
      },
    ],
  },
}

const fallbackMahalla = {
  name: 'Mahalla Center and surrounding corridor (offline preview)',
  bounds: {
    name: 'Mahalla Center and surrounding corridor',
    southwest: [41.3052, 69.2564],
    northeast: [41.3276, 69.2804],
    polygon: [
      [41.3052, 69.2564],
      [41.3052, 69.2804],
      [41.3276, 69.2804],
      [41.3276, 69.2564],
    ],
  },
  intersections: [
    { id: 'intersection_1', name: 'Main Square', coords: [41.3168, 69.2666], traffic_light_ids: ['cluster_1'] },
    { id: 'intersection_2', name: 'School Junction', coords: [41.3182, 69.2684], traffic_light_ids: ['cluster_2'] },
    { id: 'intersection_3', name: 'Clinic Roundabout', coords: [41.3157, 69.2692], traffic_light_ids: ['cluster_3'] },
    { id: 'intersection_4', name: 'Market Edge', coords: [41.3149, 69.2638], traffic_light_ids: ['cluster_4'] },
    { id: 'intersection_5', name: 'North Residential Corridor', coords: [41.3199, 69.2718], traffic_light_ids: ['cluster_5'] },
    { id: 'intersection_6', name: 'Bus Terminal Link', coords: [41.3136, 69.2707], traffic_light_ids: ['cluster_6'] },
  ],
  roads: [
    [[41.3098, 69.2620], [41.3238, 69.2620]],
    [[41.3098, 69.2680], [41.3238, 69.2680]],
    [[41.3098, 69.2730], [41.3238, 69.2730]],
    [[41.3165, 69.2598], [41.3165, 69.2758]],
    [[41.3190, 69.2598], [41.3190, 69.2758]],
    [[41.3135, 69.2598], [41.3135, 69.2758]],
    [[41.3212, 69.2598], [41.3212, 69.2758]],
  ],
  facilities: [
    { id: 'school_1', type: 'school', name: 'District School', coords: [41.3186, 69.2698] },
    { id: 'clinic_1', type: 'clinic', name: 'Community Clinic', coords: [41.3154, 69.2676] },
    { id: 'kindergarten_1', type: 'kindergarten', name: 'Kindergarten #4', coords: [41.3171, 69.2648] },
    { id: 'bus_stop_1', type: 'bus_stop', name: 'Bus Stop East', coords: [41.3191, 69.2661] },
    { id: 'park_1', type: 'park', name: 'Park', coords: [41.3138, 69.2702] },
    { id: 'facility_1', type: 'administrative', name: 'Mahalla Office', coords: [41.3147, 69.2641] },
    { id: 'facility_2', type: 'public', name: 'Community Center', coords: [41.3198, 69.2709] },
    { id: 'market_1', type: 'market', name: 'Market Square', coords: [41.3128, 69.2645] },
    { id: 'mosque_1', type: 'religious', name: 'Mosque Lane', coords: [41.3213, 69.2727] },
  ],
}

const localizedNames = {
  ru: {
    intersections: {
      intersection_1: 'Главная площадь',
      intersection_2: 'Школьный перекресток',
      intersection_3: 'Кольцо у клиники',
      intersection_4: 'Край рынка',
      intersection_5: 'Северный жилой коридор',
      intersection_6: 'Связь с автобусным терминалом',
    },
    facilities: {
      school_1: 'Районная школа',
      clinic_1: 'Семейная поликлиника',
      kindergarten_1: 'Детский сад N4',
      bus_stop_1: 'Восточная автобусная остановка',
      park_1: 'Сквер',
      facility_1: 'Офис махалли',
      facility_2: 'Общественный центр',
      market_1: 'Рыночная площадь',
      mosque_1: 'Улица у мечети',
    },
    facilityTypes: {
      school: 'школа',
      clinic: 'клиника',
      kindergarten: 'детский сад',
      bus_stop: 'автобусная остановка',
      park: 'сквер',
      administrative: 'объект управления',
      public: 'общественный объект',
      market: 'рынок',
      religious: 'религиозный объект',
    },
  },
}

const getLocalizedName = (language, group, item) => {
  if (!item) return ''
  return localizedNames[language]?.[group]?.[item.id] || item.name
}

const getFacilityTypeLabel = (language, type) => {
  return localizedNames[language]?.facilityTypes?.[type] || type
}

const defaultMetrics = {
  average_speed_kmh: 0,
  average_waiting_seconds: 0,
  max_vehicle_count: 0,
  traffic_light_count: 0,
  co2_kg: 0,
  nox_g: 0,
  noise_db: 55,
  pedestrian_delay_seconds: 0,
  accessibility_score: 100,
}

const ensureMetrics = (data) => ({ ...defaultMetrics, ...data })

const ensureCandidate = (candidate) => {
  if (!candidate) return null
  return {
    ...candidate,
    factor_scores: candidate.factor_scores || {},
    implementation: candidate.implementation || {},
    metrics: ensureMetrics(candidate.metrics || {}),
    delta: {
      average_speed_kmh: candidate.delta?.average_speed_kmh ?? 0,
      average_waiting_seconds: candidate.delta?.average_waiting_seconds ?? 0,
      max_vehicle_count: candidate.delta?.max_vehicle_count ?? 0,
      co2_kg: candidate.delta?.co2_kg ?? 0,
      nox_g: candidate.delta?.nox_g ?? 0,
      noise_db: candidate.delta?.noise_db ?? 0,
      pedestrian_delay_seconds: candidate.delta?.pedestrian_delay_seconds ?? 0,
      accessibility_score: candidate.delta?.accessibility_score ?? 0,
    },
  }
}

const ensureList = (value) => (Array.isArray(value) ? value : [])

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const formatSigned = (value, digits = 1) => {
  const numeric = Number.isFinite(value) ? value : 0
  const sign = numeric > 0 ? '+' : ''
  return `${sign}${numeric.toFixed(digits)}`
}

const calculateExecutiveImpact = (baseline, candidate) => {
  if (!candidate) {
    return {
      waitingReductionSeconds: 0,
      waitingReductionPercent: 0,
      co2ReductionKg: 0,
      co2ReductionPercent: 0,
      accessGain: 0,
      speedGain: 0,
      readiness: 0,
      impactIndex: 0,
      pilotDays: 0,
      dataMode: baseline?.data_source || 'pending',
    }
  }

  const baseWait = baseline.average_waiting_seconds || 0
  const baseCo2 = baseline.co2_kg || 0
  const waitingReductionSeconds = baseWait - candidate.metrics.average_waiting_seconds
  const waitingReductionPercent = baseWait ? (waitingReductionSeconds / baseWait) * 100 : 0
  const co2ReductionKg = baseCo2 - (candidate.metrics.co2_kg || 0)
  const co2ReductionPercent = baseCo2 ? (co2ReductionKg / baseCo2) * 100 : 0
  const accessGain = (candidate.metrics.accessibility_score || 0) - (baseline.accessibility_score || 0)
  const speedGain = candidate.metrics.average_speed_kmh - baseline.average_speed_kmh

  const readiness = clamp(
    68 + Math.max(0, waitingReductionPercent) * 0.35 + Math.max(0, accessGain) * 0.9 + Math.max(0, co2ReductionPercent) * 0.25,
    0,
    96,
  )
  const impactIndex = clamp(
    50 + Math.max(0, waitingReductionPercent) * 0.55 + Math.max(0, co2ReductionPercent) * 0.35 + Math.max(0, speedGain) * 1.3,
    0,
    99,
  )
  const pilotDays = candidate.implementation?.days ?? (candidate.category === 'transit' ? 14 : 10)

  return {
    waitingReductionSeconds,
    waitingReductionPercent,
    co2ReductionKg,
    co2ReductionPercent,
    accessGain,
    speedGain,
    readiness,
    impactIndex,
    pilotDays,
    dataMode: baseline.data_source || 'sumo',
  }
}

const buildPresentationBrief = ({ t, scenarioLabel, selectedCandidate, impact, optResult }) => {
  if (!selectedCandidate) return t.noBrief

  const environment = optResult?.environment_layer
  const quality = optResult?.data_quality
  const strategyLines = ensureList(optResult?.top_strategies)
    .map((item) => `${item.title}: ${item.label}`)
    .join('\n')

  return [
    `MahallaMind — ${t.executiveDecision}`,
    `${t.scenario}: ${scenarioLabel}`,
    `${t.recommendedIntervention}: ${selectedCandidate.label || selectedCandidate.id}`,
    strategyLines ? `${t.topStrategies}:\n${strategyLines}` : '',
    `${t.delayReduction}: ${Math.max(0, impact.waitingReductionSeconds).toFixed(1)} s (${Math.max(0, impact.waitingReductionPercent).toFixed(0)}%)`,
    `${t.emissionCut}: ${Math.max(0, impact.co2ReductionKg).toFixed(1)} kg (${Math.max(0, impact.co2ReductionPercent).toFixed(0)}%)`,
    environment ? `NOx: ${Math.max(0, environment.delta?.nox_g || 0).toFixed(1)} g; ${t.idleProxy}: ${Math.max(0, environment.delta?.idle_seconds_proxy || 0).toFixed(0)} s` : '',
    `${t.accessGain}: ${formatSigned(impact.accessGain)} ${t.percentagePoints}`,
    `${t.speedGain}: ${formatSigned(impact.speedGain)} km/h`,
    `${t.confidence}: ${optResult?.ai?.confidence || 'medium'}${quality ? `; ${t.modelConfidence}: ${quality.confidence}%` : ''}`,
    `${t.decisionNeeded}: ${t.decisionNeededCopy}`,
  ].filter(Boolean).join('\n')
}

const buildFactorRows = (t, scores = {}) => ([
  { key: 'delay', label: t.delayFactor, value: scores.delay ?? 0 },
  { key: 'throughput', label: t.throughputFactor, value: scores.throughput ?? 0 },
  { key: 'emissions', label: t.emissionsFactor, value: scores.emissions ?? 0 },
  { key: 'safety', label: t.safetyFactor, value: scores.safety ?? 0 },
  { key: 'access', label: t.accessFactor, value: scores.access ?? 0 },
  { key: 'noise', label: t.noiseFactor, value: scores.noise ?? 0 },
  { key: 'feasibility', label: t.feasibilityFactor, value: scores.feasibility ?? 0 },
  { key: 'reliability', label: t.reliabilityFactor, value: scores.reliability ?? 0 },
])

const buildStrategyComparisonRows = (strategies, candidates) => {
  const candidateMap = new Map(
    ensureList(candidates)
      .map((candidate) => ensureCandidate(candidate))
      .filter(Boolean)
      .map((candidate) => [candidate.id, candidate]),
  )

  return ensureList(strategies)
    .map((strategy, index) => {
      const candidate = candidateMap.get(strategy.candidate_id)
      if (!candidate) return null

      return {
        id: candidate.id,
        rank: index + 1,
        title: strategy.title || candidate.category_label || candidate.category || '',
        label: strategy.label || candidate.label || candidate.id,
        waitDelta: candidate.delta.average_waiting_seconds,
        co2Delta: candidate.delta.co2_kg,
        safety: candidate.factor_scores.safety ?? 0,
        access: candidate.factor_scores.access ?? 0,
        launchDays: candidate.implementation.days ?? 10,
        targetZoneId: candidate.target_zone_id,
      }
    })
    .filter(Boolean)
}

const numberOrZero = (value) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

const buildEcologyRows = (t, layer) => {
  if (!layer) return []
  const baseline = layer.baseline || {}
  const optimized = layer.optimized || {}

  return [
    {
      key: 'co2',
      label: 'CO2',
      before: numberOrZero(baseline.co2_kg),
      after: numberOrZero(optimized.co2_kg),
      unit: 'kg',
    },
    {
      key: 'nox',
      label: 'NOx',
      before: numberOrZero(baseline.nox_g),
      after: numberOrZero(optimized.nox_g),
      unit: 'g',
    },
    {
      key: 'noise',
      label: t.noiseFactor,
      before: numberOrZero(baseline.noise_db),
      after: numberOrZero(optimized.noise_db),
      unit: 'dB',
    },
  ]
}

const calculateCitizenImpact = (baseline, candidate, impact, facilityCount) => {
  const observedVehicles = Math.max(1, baseline.max_vehicle_count || 1)
  const dailyTrips = Math.max(240, observedVehicles * 36)
  const minutesSavedDaily = Math.max(0, (impact.waitingReductionSeconds * dailyTrips) / 60)
  const weeklyCo2Cut = Math.max(0, impact.co2ReductionKg * 7)
  const protectedAccess = Math.max(0, Math.round((candidate?.metrics?.accessibility_score || baseline.accessibility_score || 0) * facilityCount / 100))

  return {
    dailyTrips,
    minutesSavedDaily,
    weeklyCo2Cut,
    protectedAccess,
  }
}

const buildFacilityImpact = ({ language, impact }) => {
  const accessText = language === 'ru' ? 'доступ стабильнее' : 'access is more reliable'
  const delayText = language === 'ru' ? 'меньше задержек' : 'lower delay'
  const priorityText = language === 'ru' ? 'приоритет потока' : 'flow priority'

  return [
    { label: language === 'ru' ? 'Школа и детский сад' : 'School and kindergarten', value: accessText, score: clamp(76 + impact.accessGain * 1.5, 0, 99) },
    { label: language === 'ru' ? 'Клиника' : 'Clinic', value: delayText, score: clamp(74 + Math.max(0, impact.waitingReductionPercent) * 0.35, 0, 99) },
    { label: language === 'ru' ? 'Рынок' : 'Market', value: priorityText, score: clamp(72 + Math.max(0, impact.speedGain) * 2.1, 0, 99) },
    { label: language === 'ru' ? 'Автобусный коридор' : 'Bus corridor', value: language === 'ru' ? 'надежность выше' : 'higher reliability', score: clamp(80 + Math.max(0, impact.impactIndex - 60) * 0.28, 0, 99) },
  ]
}

const buildRoadmap = (language) => {
  if (language === 'ru') {
    return [
      'Пилотный коридор, полевые замеры, публичная карта решения.',
      'Подключение соседних махаллей и сравнение нескольких коридоров.',
      'Городской контур принятия решений: бюджет, KPI, масштабирование.',
    ]
  }

  return [
    'Pilot corridor, field counts, and a public decision map.',
    'Connect neighboring mahallas and compare multiple corridors.',
    'City-scale decision loop with budget, KPIs, and rollout control.',
  ]
}

function App() {
  const [health, setHealth] = useState(null)
  const [mahalla, setMahalla] = useState(null)
  const [scenario, setScenario] = useState('midday')
  const [selectedId, setSelectedId] = useState('intersection_1')
  const [selectedCandidateId, setSelectedCandidateId] = useState(null)
  const [metrics, setMetrics] = useState(defaultMetrics)
  const [optResult, setOptResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [language, setLanguage] = useState('ru')
  const [currentView, setCurrentView] = useState('dashboard')
  const [presentationMode, setPresentationMode] = useState(true)
  const [briefCopied, setBriefCopied] = useState(false)
  const [reportDownloaded, setReportDownloaded] = useState(false)
  const [stressLoading, setStressLoading] = useState(false)
  const [scenarioResults, setScenarioResults] = useState([])
  const t = translations[language]
  const offlineMessage = t.backendOffline

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [healthResponse, mahallaResponse] = await Promise.all([
          fetchHealth(),
          fetchMahalla(),
        ])
        setHealth(healthResponse)
        setMahalla(mahallaResponse)
      } catch {
        setHealth({ ok: false })
        setMahalla(fallbackMahalla)
        setError(offlineMessage)
      }
    }

    loadInitialData()
  }, [offlineMessage])

  const getIntersectionForTrafficLight = (trafficLightId) => {
    if (!mahalla || !trafficLightId) return null
    // Try exact match first
    let match = mahalla.intersections.find((item) => item.traffic_light_ids.includes(trafficLightId))
    // If no match and trafficLightId is a real SUMO signal ID (not cluster_X), default to first intersection
    if (!match && trafficLightId && !trafficLightId.startsWith('cluster_')) {
      match = mahalla.intersections[0] || null
    }
    return match || null
  }

  const selectedIntersection = useMemo(() => {
    if (!mahalla) return null
    return mahalla.intersections.find((item) => item.id === selectedId) || mahalla.intersections[0]
  }, [mahalla, selectedId])

  const selectedCandidate = useMemo(() => {
    if (!optResult) return null
    const list = optResult.ranked_candidates || []
    let candidate
    if (selectedCandidateId) {
      candidate = list.find((c) => c.id === selectedCandidateId) || optResult.best_candidate || null
    } else {
      candidate = optResult.best_candidate || null
    }
    return ensureCandidate(candidate)
  }, [optResult, selectedCandidateId])

  const targetSignalId = selectedCandidate?.intervention?.traffic_light_id || selectedIntersection?.traffic_light_ids?.[0] || null

  const selectCandidate = (candidateId) => {
    if (!candidateId || !optResult) return
    const candidate = ensureCandidate(ensureList(optResult.ranked_candidates).find((item) => item.id === candidateId))
    setSelectedCandidateId(candidateId)
    const zoneMatch = candidate?.target_zone_id
      ? mahalla?.intersections?.find((item) => item.id === candidate.target_zone_id)
      : null
    const signalMatch = getIntersectionForTrafficLight(candidate?.intervention?.traffic_light_id)
    const match = zoneMatch || signalMatch
    if (match) {
      setSelectedId(match.id)
    }
  }

  const handleAnalyze = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchMetrics({ steps: 300, scenario })
      setMetrics(ensureMetrics(data))
      setOptResult(null)
      setSelectedCandidateId(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleOptimize = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchOptimize({ steps: 300, scenario, language })
      setOptResult(data)
      setMetrics(ensureMetrics(data.baseline || {}))
      setSelectedCandidateId(data.best_candidate?.id || null)
      setScenarioResults([])
      const zoneMatch = data.best_candidate?.target_zone_id
        ? mahalla?.intersections?.find((item) => item.id === data.best_candidate.target_zone_id)
        : null
      const signalMatch = getIntersectionForTrafficLight(data.best_candidate?.intervention?.traffic_light_id)
      setSelectedId(zoneMatch?.id || signalMatch?.id || 'intersection_1')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const mapCenter = selectedIntersection ? [selectedIntersection.coords[0], selectedIntersection.coords[1]] : [41.317, 69.267]
  const mapBounds = useMemo(() => {
    const bounds = mahalla?.bounds
    if (!bounds) return null
    return [bounds.southwest, bounds.northeast]
  }, [mahalla])

  const boundaryBounds = useMemo(() => {
    const bounds = mahalla?.bounds
    if (!bounds?.southwest || !bounds?.northeast) return null
    return [bounds.southwest, bounds.northeast]
  }, [mahalla])

  const boundaryRectangle = useMemo(() => {
    if (!boundaryBounds) return null
    const [sw, ne] = boundaryBounds
    return [
      [sw[0], sw[1]],
      [sw[0], ne[1]],
      [ne[0], ne[1]],
      [ne[0], sw[1]],
    ]
  }, [boundaryBounds])

  const flowDots = useMemo(() => {
    if (!mahalla?.roads) return []

    const points = []

    mahalla.roads.forEach((road, roadIndex) => {
      for (let i = 0; i < road.length - 1; i += 1) {
        const start = road[i]
        const end = road[i + 1]
        const totalSteps = Math.max(18, Math.round(Math.hypot(end[0] - start[0], end[1] - start[1]) * 9000))

        for (let step = 0; step <= totalSteps; step += 1) {
          const ratio = step / totalSteps
          const lat = start[0] + (end[0] - start[0]) * ratio
          const lng = start[1] + (end[1] - start[1]) * ratio
          const laneOffset = (roadIndex % 2 === 0 ? 1 : -1) * 0.00008
          const offsetAngle = ((roadIndex % 3) + 1) * 0.35
          const offsetLat = Math.cos(offsetAngle) * laneOffset
          const offsetLng = Math.sin(offsetAngle) * laneOffset

          points.push({
            id: `road-${roadIndex}-segment-${i}-dot-${step}`,
            coords: [lat + offsetLat, lng + offsetLng],
            radius: 2.2 + ((step + roadIndex) % 3) * 0.35,
          })
        }
      }
    })

    return points
  }, [mahalla])

  const liveVehicleCount = useMemo(() => {
    const peak = Number.isFinite(metrics.max_vehicle_count) ? metrics.max_vehicle_count : 0
    return peak ? Math.max(12, Math.round(peak * 0.7)) : 0
  }, [metrics.max_vehicle_count])

  const baselineForDecision = useMemo(() => ensureMetrics(optResult?.baseline || metrics), [optResult, metrics])
  const executiveImpact = useMemo(
    () => calculateExecutiveImpact(baselineForDecision, selectedCandidate),
    [baselineForDecision, selectedCandidate],
  )
  const dataModeLabel = executiveImpact.dataMode === 'demo_fallback' ? t.demoFallback : t.sumoSimulation
  const presentationBriefText = useMemo(
    () => buildPresentationBrief({
      t,
      scenarioLabel: t[scenario],
      selectedCandidate,
      impact: executiveImpact,
      optResult,
    }),
    [executiveImpact, optResult, scenario, selectedCandidate, t],
  )

  const implementationSteps = useMemo(() => ([
    { title: t.pilotNow, value: `0-${Math.max(2, Math.round(executiveImpact.pilotDays / 4))} ${language === 'ru' ? 'дня' : 'days'}` },
    { title: t.validateField, value: `${executiveImpact.pilotDays} ${language === 'ru' ? 'дней' : 'days'}` },
    { title: t.scaleNext, value: language === 'ru' ? 'следующий кластер' : 'next cluster' },
  ]), [executiveImpact.pilotDays, language, t])

  const riskControls = useMemo(() => {
    if (language === 'ru') {
      return [
        'Пилот ограничен одним коридором: откат возможен без капитальных работ.',
        'Полевые замеры подтверждают модель перед масштабированием.',
        'Приоритет общественного транспорта сохраняет доступ к школе, рынку и клинике.',
      ]
    }

    return [
      'The pilot is limited to one corridor and can be reverted without capital works.',
      'Field counts validate the model before scale-up.',
      'Transit priority preserves access to the school, market, and clinic.',
    ]
  }, [language])

  const factorRows = useMemo(
    () => buildFactorRows(t, selectedCandidate?.factor_scores || {}),
    [selectedCandidate, t],
  )
  const problemZones = useMemo(() => ensureList(optResult?.problem_zones), [optResult])
  const topProblemZones = useMemo(() => problemZones.slice(0, 3), [problemZones])
  const topStrategies = useMemo(() => ensureList(optResult?.top_strategies), [optResult])
  const rankedCandidates = useMemo(() => ensureList(optResult?.ranked_candidates), [optResult])
  const strategyComparisonRows = useMemo(
    () => buildStrategyComparisonRows(topStrategies, rankedCandidates),
    [rankedCandidates, topStrategies],
  )
  const dataQuality = optResult?.data_quality || null
  const environmentLayer = optResult?.environment_layer || null
  const ecologyRows = useMemo(() => buildEcologyRows(t, environmentLayer), [environmentLayer, t])
  const selectedTargetZone = useMemo(() => {
    const targetId = selectedCandidate?.target_zone_id || selectedId
    return problemZones.find((zone) => zone.id === targetId) || null
  }, [problemZones, selectedCandidate, selectedId])
  const citizenImpact = useMemo(
    () => calculateCitizenImpact(baselineForDecision, selectedCandidate, executiveImpact, mahalla?.facilities?.length || 0),
    [baselineForDecision, executiveImpact, mahalla?.facilities?.length, selectedCandidate],
  )
  const facilityImpact = useMemo(
    () => buildFacilityImpact({ language, impact: executiveImpact }),
    [executiveImpact, language],
  )
  const roadmap = useMemo(() => ensureList(optResult?.product_roadmap), [optResult])
  const fallbackRoadmap = useMemo(() => buildRoadmap(language), [language])
  const pitchLines = useMemo(() => {
    if (language === 'ru') {
      return [
        'MahallaMind превращает транспортную симуляцию в понятное решение для хокимията.',
        `Рекомендация: ${selectedCandidate?.label || 'запустить оптимизацию'} с измеримым снижением ожидания.`,
        'Следующий шаг: пилот, полевые замеры и масштабирование на соседние махалли.',
      ]
    }

    return [
      'MahallaMind turns traffic simulation into a clear city decision.',
      `Recommendation: ${selectedCandidate?.label || 'run optimization'} with measurable delay reduction.`,
      'Next step: pilot, field validation, and scale-up to neighboring mahallas.',
    ]
  }, [language, selectedCandidate])

  const handleCopyBrief = async () => {
    try {
      await navigator.clipboard.writeText(presentationBriefText)
      setBriefCopied(true)
      window.setTimeout(() => setBriefCopied(false), 1800)
    } catch {
      setError(t.copyUnavailable)
    }
  }

  const handleDownloadReport = () => {
    if (!selectedCandidate) return
    const blob = new Blob([presentationBriefText], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `mahallamind-${scenario}-decision-report.txt`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    setReportDownloaded(true)
    window.setTimeout(() => setReportDownloaded(false), 1800)
  }

  const handlePrintBrief = () => {
    window.print()
  }

  const getTargetZoneLabel = (zoneId) => {
    if (!zoneId) return '-'
    const zone = problemZones.find((item) => item.id === zoneId)
      || mahalla?.intersections?.find((item) => item.id === zoneId)
    return zone ? getLocalizedName(language, 'intersections', zone) : zoneId
  }

  const handleStressTest = async () => {
    setStressLoading(true)
    setError('')
    try {
      const results = await Promise.all(
        ['morning', 'midday', 'evening'].map(async (scenarioName) => {
          const data = await fetchOptimize({ steps: 160, scenario: scenarioName, language })
          const candidate = ensureCandidate(data.best_candidate)
          const baseline = ensureMetrics(data.baseline || {})
          const impact = calculateExecutiveImpact(baseline, candidate)
          return {
            scenario: scenarioName,
            label: t[scenarioName],
            recommendation: candidate?.label || data.best_candidate?.id || '',
            readiness: impact.readiness,
            waitReduction: impact.waitingReductionSeconds,
            score: candidate?.score ?? 0,
          }
        }),
      )
      setScenarioResults(results)
    } catch (err) {
      setError(err.message)
    } finally {
      setStressLoading(false)
    }
  }

  if (!mahalla) {
    return <div className="app-shell loading">Загрузка MahallaMind...</div>
  }

  if (currentView === 'faq') {
    return (
      <div className="app-shell faq-shell">
        <header className="topbar topbar-faq">
          <div className="brand-wrap">
            <div className="brand-mark">M</div>
            <div>
              <p className="eyebrow">MAHALLAMIND</p>
              <h1>{t.faqPageTitle}</h1>
            </div>
          </div>
          <div className="topbar-actions">
            <button type="button" className="ghost-button" onClick={() => setCurrentView('dashboard')}>{t.backToDashboard}</button>
            <button type="button" className="language-toggle" onClick={() => setLanguage((value) => (value === 'en' ? 'ru' : 'en'))}>{t.language}</button>
          </div>
        </header>

        <main className="faq-page">
          <p className="faq-intro">{t.faqPageIntro}</p>
          <div className="faq-list">
            {t.faqSections.map((item) => (
              <article key={item.q} className="faq-entry">
                <h3>{item.q}</h3>
                <p>{item.a}</p>
              </article>
            ))}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className="map-panel">
        <header className="map-header">
          <div className="brand-wrap">
            <div className="brand-mark">M</div>
            <div>
              <p className="eyebrow">{t.appTitle}</p>
              <h1>{t.headerTitle}</h1>
            </div>
          </div>
          <div className="topbar-actions">
            <span className={`status-pill ${health?.ok ? 'online' : 'offline'}`}>
              {health?.ok ? t.apiOnline : t.apiOffline}
            </span>
            <div className="scenario-toggle" aria-label={t.scenario}>
              {['morning', 'midday', 'evening'].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={scenario === value ? 'scenario-button active' : 'scenario-button'}
                  onClick={() => setScenario(value)}
                >
                  {t[value]}
                </button>
              ))}
            </div>
            <button type="button" className="ghost-button" onClick={() => setCurrentView('dashboard')}>{t.dashboard}</button>
            <button type="button" className="ghost-button" onClick={() => setCurrentView('faq')}>{t.faq}</button>
            <button
              type="button"
              className={presentationMode ? 'ghost-button active-control' : 'ghost-button'}
              onClick={() => setPresentationMode((value) => !value)}
            >
              {t.presentationMode}
            </button>
            <button type="button" className="language-toggle" onClick={() => setLanguage((value) => (value === 'en' ? 'ru' : 'en'))}>{t.language}</button>
          </div>
        </header>

        <MapContainer
          center={mapCenter}
          bounds={mapBounds}
          boundsOptions={{ padding: [24, 24] }}
          scrollWheelZoom
          className="map-container"
          zoom={15}
          minZoom={12}
          maxZoom={18}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {boundaryRectangle && (
            <Polygon
              positions={boundaryRectangle}
              pathOptions={{
                color: '#94a3b8',
                weight: 2,
                opacity: 0.6,
                fillColor: 'transparent',
                fillOpacity: 0,
                lineJoin: 'miter',
                lineCap: 'butt',
                dashArray: '4,4',
              }}
            />
          )}

          {mahalla.roads.map((road, index) => (
            <Polyline
              key={index}
              positions={road}
              pathOptions={{
                color: '#cbd5e1',
                weight: 2.2,
                opacity: 0.8,
              }}
            />
          ))}

          {flowDots.map((dot) => (
            <CircleMarker
              key={dot.id}
              center={dot.coords}
              radius={dot.radius}
              pathOptions={{
                color: '#fbbf24',
                fillColor: '#facc15',
                fillOpacity: 0.72,
                weight: 0.8,
              }}
            />
          ))}

          {problemZones.map((zone) => {
            const isTargetZone = selectedCandidate?.target_zone_id === zone.id
            const isSelectedZone = zone.id === selectedId
            return (
              <CircleMarker
                key={`problem-${zone.id}`}
                center={zone.coords}
                radius={10 + clamp(zone.severity || 0, 0, 100) / 10}
                pathOptions={{
                  color: isTargetZone ? '#7f1d1d' : isSelectedZone ? '#991b1b' : '#ef4444',
                  fillColor: isTargetZone ? '#dc2626' : '#f97316',
                  fillOpacity: 0.18 + clamp(zone.severity || 0, 0, 100) / 220,
                  weight: isTargetZone ? 3.6 : isSelectedZone ? 3 : 1.5,
                }}
                eventHandlers={{ click: () => setSelectedId(zone.id) }}
              >
                <Popup>
                  <strong>{getLocalizedName(language, 'intersections', zone)}</strong><br />
                  {zone.primary_issue_label}<br />
                  {t.severity}: {Math.round(zone.severity || 0)}
                </Popup>
              </CircleMarker>
            )
          })}

          {mahalla.facilities.map((facility) => (
            <CircleMarker
              key={facility.id}
              center={facility.coords}
              radius={5.2}
              pathOptions={{
                color: '#6ee7b7',
                fillColor: '#10b981',
                fillOpacity: 0.9,
                weight: 2,
              }}
            >
              <Popup>
                <strong>{getLocalizedName(language, 'facilities', facility)}</strong><br />
                {getFacilityTypeLabel(language, facility.type)}
              </Popup>
            </CircleMarker>
          ))}

          {mahalla.intersections.map((intersection) => {
            const isSelected = selectedIntersection?.id === intersection.id
            return (
              <Marker
                key={intersection.id}
                position={intersection.coords}
                eventHandlers={{ click: () => setSelectedId(intersection.id) }}
                icon={
                  new L.DivIcon({
                    className: 'intersection-marker-wrap',
                    html: `<span class="intersection-marker ${isSelected ? 'active' : ''}"></span>`,
                    iconSize: [12, 12],
                    iconAnchor: [6, 6],
                  })
                }
              >
                <Popup>
                  <strong>{getLocalizedName(language, 'intersections', intersection)}</strong><br />
                  {intersection.traffic_light_ids.length} {language === 'ru' ? 'светофорных кластеров' : 'traffic-light clusters'}
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>
        {selectedCandidate && selectedTargetZone ? (
          <div className="map-change-caption">
            <div>
              <span>{t.mapChange}</span>
              <strong>{getLocalizedName(language, 'intersections', selectedTargetZone)}</strong>
            </div>
            <p><b>{selectedCandidate.label || selectedCandidate.id}</b> {t.appliesHere}</p>
          </div>
        ) : null}
      </div>

      <aside className="sidebar">
        <div className="panel-card">
          <h2>{t.selectedLocation}</h2>
          {selectedIntersection && (
            <>
              <p className="location-name">{getLocalizedName(language, 'intersections', selectedIntersection)}</p>
              <p>ID: {selectedIntersection.id}</p>
              <p>{t.trafficLights}: {selectedIntersection.traffic_light_ids.length}</p>
              <p className="traffic-legend">{t.targetSignal}: {targetSignalId || t.fallbackSelection}</p>
              <div className="legend-box">
                <div><span className="legend-swatch signal" /> {t.selectedSignal}</div>
                <div><span className="legend-swatch facility" /> {t.localFacility}</div>
                <div><span className="legend-swatch problem" /> {t.problemZones}</div>
              </div>
              <p className="traffic-legend muted">{t.neighborhoodCopy}</p>
            </>
          )}
        </div>

        <div className="panel-card problem-zone-panel">
          <h3>{t.problemZones}</h3>
          {topProblemZones.length ? (
            <div className="problem-zone-list">
              {topProblemZones.map((zone) => (
                <button
                  type="button"
                  key={zone.id}
                  className={`problem-zone-item ${selectedId === zone.id ? 'selected' : ''}`}
                  onClick={() => setSelectedId(zone.id)}
                >
                  <span>{Math.round(zone.severity || 0)}</span>
                  <div>
                    <strong>{getLocalizedName(language, 'intersections', zone)}</strong>
                    <small>{zone.primary_issue_label}</small>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="traffic-legend muted">{t.noProblemZones}</p>
          )}
        </div>

        <div className="panel-card metric-grid">
          <div>
            <span>{t.avgSpeed}</span>
            <strong>{metrics.average_speed_kmh.toFixed(2)} km/h</strong>
          </div>
          <div>
            <span>{t.waiting}</span>
            <strong>{metrics.average_waiting_seconds.toFixed(2)} s</strong>
          </div>
          <div>
            <span>CO2</span>
            <strong>{(metrics.co2_kg ?? 0).toFixed(1)} kg</strong>
          </div>
          <div>
            <span>NOx</span>
            <strong>{(metrics.nox_g ?? 0).toFixed(1)} g</strong>
          </div>
          <div>
            <span>{t.liveFlow}</span>
            <strong>{liveVehicleCount}</strong>
          </div>
          <div>
            <span>{t.peak}</span>
            <strong>{metrics.max_vehicle_count}</strong>
          </div>
          <div>
            <span>{t.signals}</span>
            <strong>{metrics.traffic_light_count}</strong>
          </div>
          <div>
            <span>{t.access}</span>
            <strong>{(metrics.accessibility_score ?? 100).toFixed(0)}%</strong>
          </div>
        </div>

        <div className="panel-card button-stack">
          <button type="button" onClick={handleAnalyze} disabled={loading}>
            {loading ? t.analyzing : t.analyze}
          </button>
          <button type="button" className="accent" onClick={handleOptimize} disabled={loading}>
            {loading ? t.optimizing : t.optimize}
          </button>
        </div>

        {error && <div className="panel-card error-box">{error}</div>}
      </aside>

      <section className="results-panel">
        {presentationMode && (
          <div className="panel-card presentation-panel full-width-card">
            <div className="presentation-header">
              <div>
                <p className="eyebrow dark">{t.presentationMode}</p>
                <h3>{t.executiveDecision}</h3>
              </div>
              <div className="presentation-actions">
                <button type="button" onClick={handleCopyBrief} disabled={!selectedCandidate}>
                  {briefCopied ? t.copied : t.copyBrief}
                </button>
                <button type="button" onClick={handleDownloadReport} disabled={!selectedCandidate}>
                  {reportDownloaded ? t.reportDownloaded : t.downloadReport}
                </button>
                <button type="button" className="ghost-print" onClick={handlePrintBrief}>
                  {t.printBrief}
                </button>
              </div>
            </div>

            {selectedCandidate ? (
              <>
                <div className="executive-grid">
                  <div className="executive-metric primary">
                    <span>{t.readinessScore}</span>
                    <strong>{executiveImpact.readiness.toFixed(0)}%</strong>
                    <div className="meter"><span style={{ width: `${executiveImpact.readiness}%` }} /></div>
                  </div>
                  <div className="executive-metric">
                    <span>{t.impactScore}</span>
                    <strong>{executiveImpact.impactIndex.toFixed(0)}</strong>
                  </div>
                  <div className="executive-metric">
                    <span>{t.delayReduction}</span>
                    <strong>{Math.max(0, executiveImpact.waitingReductionSeconds).toFixed(1)} s</strong>
                    <small>{Math.max(0, executiveImpact.waitingReductionPercent).toFixed(0)}%</small>
                  </div>
                  <div className="executive-metric">
                    <span>{t.emissionCut}</span>
                    <strong>{Math.max(0, executiveImpact.co2ReductionKg).toFixed(1)} kg</strong>
                    <small>{Math.max(0, executiveImpact.co2ReductionPercent).toFixed(0)}%</small>
                  </div>
                  <div className="executive-metric">
                    <span>{t.accessGain}</span>
                    <strong>{formatSigned(executiveImpact.accessGain)} {t.percentagePoints}</strong>
                  </div>
                  <div className="executive-metric">
                    <span>{t.dataMode}</span>
                    <strong>{dataModeLabel}</strong>
                  </div>
                </div>

                {topStrategies.length ? (
                  <div className="strategy-grid">
                    {topStrategies.map((strategy) => (
                      <button
                        type="button"
                        key={strategy.role}
                        className={`strategy-card ${selectedCandidate?.id === strategy.candidate_id ? 'selected' : ''}`}
                        onClick={() => selectCandidate(strategy.candidate_id)}
                      >
                        <span>{strategy.title}</span>
                        <strong>{strategy.label}</strong>
                        <small>{strategy.reason}</small>
                        <em>{t.optimizationIndex}: {Math.round(strategy.optimization_index || 0)}</em>
                      </button>
                    ))}
                  </div>
                ) : null}

                {strategyComparisonRows.length ? (
                  <div className="strategy-comparison">
                    <div className="strategy-comparison-head">
                      <h4>{t.strategyComparison}</h4>
                      <span>{t.targetZone}</span>
                    </div>
                    <div className="strategy-table-wrap">
                      <table className="strategy-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>{t.strategy}</th>
                            <th>{t.targetZone}</th>
                            <th>{t.deltaWait}</th>
                            <th>CO2</th>
                            <th>{t.safetyFactor}</th>
                            <th>{t.accessFactor}</th>
                            <th>{t.launch}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {strategyComparisonRows.map((row) => (
                            <tr key={row.id} className={selectedCandidate?.id === row.id ? 'selected' : ''}>
                              <td>{row.rank}</td>
                              <td>
                                <button
                                  type="button"
                                  className="table-strategy-button"
                                  onClick={() => selectCandidate(row.id)}
                                >
                                  <span>{row.title}</span>
                                  <strong>{row.label}</strong>
                                </button>
                              </td>
                              <td>{getTargetZoneLabel(row.targetZoneId)}</td>
                              <td className={row.waitDelta <= 0 ? 'metric-delta good' : 'metric-delta warn'}>
                                {formatSigned(row.waitDelta, 1)} s
                              </td>
                              <td className={row.co2Delta <= 0 ? 'metric-delta good' : 'metric-delta warn'}>
                                {formatSigned(row.co2Delta, 1)} kg
                              </td>
                              <td>{Math.round(clamp(row.safety, 0, 100))}</td>
                              <td>{Math.round(clamp(row.access, 0, 100))}</td>
                              <td>{row.launchDays} {language === 'ru' ? 'дней' : 'days'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}

                <div className="decision-layout">
                  <div className="decision-copy">
                    <h4>{t.businessCase}</h4>
                    <p className="recommendation-tag">{selectedCandidate.label || selectedCandidate.id}</p>
                    <p>{optResult?.ai?.expected_impact || t.expectedImpact}</p>
                    <p className="selection-reason">{t.decisionNeeded}: {t.decisionNeededCopy}</p>
                  </div>

                  <div className="timeline-block">
                    <h4>{t.implementationPlan}</h4>
                    <div className="timeline-list">
                      {implementationSteps.map((step, index) => (
                        <div key={step.title} className="timeline-step">
                          <span>{index + 1}</span>
                          <div>
                            <strong>{step.title}</strong>
                            <small>{step.value}</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="risk-block">
                    <h4>{t.riskControls}</h4>
                    <ul>
                      {riskControls.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                </div>

                <div className="demo-feature-grid">
                  <div className="demo-card factor-card">
                    <div className="demo-card-header">
                      <h4>{t.optimizationFactors}</h4>
                      <strong>{Math.round(selectedCandidate.score || 0)}</strong>
                    </div>
                    <div className="factor-list">
                      {factorRows.map((item) => (
                        <div key={item.key} className="factor-row">
                          <div>
                            <strong>{item.label}</strong>
                            <span>{Math.round(clamp(item.value, 0, 100))}</span>
                          </div>
                          <div className="factor-track">
                            <span style={{ width: `${clamp(item.value, 4, 100)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="demo-card problem-card">
                    <h4>{t.problemZones}</h4>
                    {topProblemZones.length ? (
                      <div className="problem-brief-list">
                        {topProblemZones.map((zone) => (
                          <div key={zone.id}>
                            <span>{Math.round(zone.severity || 0)}</span>
                            <div>
                              <strong>{getLocalizedName(language, 'intersections', zone)}</strong>
                              <small>{zone.primary_issue_label}</small>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p>{t.noProblemZones}</p>
                    )}
                  </div>

                  <div className="demo-card">
                    <h4>{t.beforeAfter}</h4>
                    <div className="comparison-bars">
                      <div>
                        <span>{t.waiting}</span>
                        <strong>{baselineForDecision.average_waiting_seconds.toFixed(1)} s {'->'} {selectedCandidate.metrics.average_waiting_seconds.toFixed(1)} s</strong>
                        <div className="bar-track"><span style={{ width: `${clamp(100 - Math.max(0, executiveImpact.waitingReductionPercent), 8, 100)}%` }} /></div>
                      </div>
                      <div>
                        <span>{t.avgSpeed}</span>
                        <strong>{baselineForDecision.average_speed_kmh.toFixed(1)} {'->'} {selectedCandidate.metrics.average_speed_kmh.toFixed(1)} km/h</strong>
                        <div className="bar-track positive"><span style={{ width: `${clamp(55 + Math.max(0, executiveImpact.speedGain) * 4, 12, 100)}%` }} /></div>
                      </div>
                      <div>
                        <span>CO2</span>
                        <strong>{baselineForDecision.co2_kg.toFixed(1)} {'->'} {(selectedCandidate.metrics.co2_kg || 0).toFixed(1)} kg</strong>
                        <div className="bar-track"><span style={{ width: `${clamp(100 - Math.max(0, executiveImpact.co2ReductionPercent), 8, 100)}%` }} /></div>
                      </div>
                    </div>
                  </div>

                  {environmentLayer ? (
                    <div className="demo-card environment-card">
                      <h4>{t.environmentLayer}</h4>
                      <div className="mini-kpis">
                        <div><span>CO2</span><strong>{Math.max(0, environmentLayer.delta?.co2_kg || 0).toFixed(1)} kg</strong></div>
                        <div><span>NOx</span><strong>{Math.max(0, environmentLayer.delta?.nox_g || 0).toFixed(1)} g</strong></div>
                        <div><span>{t.noiseFactor}</span><strong>{Math.max(0, environmentLayer.delta?.noise_db || 0).toFixed(1)} dB</strong></div>
                        <div><span>{t.idleProxy}</span><strong>{Math.max(0, environmentLayer.delta?.idle_seconds_proxy || 0).toFixed(0)} s</strong></div>
                      </div>
                      {ecologyRows.length ? (
                        <div className="eco-bar-list" aria-label={t.ecologyBeforeAfter}>
                          {ecologyRows.map((row) => {
                            const maxValue = Math.max(row.before, row.after, 1)
                            return (
                              <div className="eco-row" key={row.key}>
                                <span>{row.label}</span>
                                <div className="eco-bars">
                                  <div className="eco-bar-line">
                                    <small>{t.before}</small>
                                    <div className="eco-track before">
                                      <span style={{ width: `${clamp((row.before / maxValue) * 100, 4, 100)}%` }} />
                                    </div>
                                    <strong>{row.before.toFixed(1)} {row.unit}</strong>
                                  </div>
                                  <div className="eco-bar-line">
                                    <small>{t.after}</small>
                                    <div className="eco-track after">
                                      <span style={{ width: `${clamp((row.after / maxValue) * 100, 4, 100)}%` }} />
                                    </div>
                                    <strong>{row.after.toFixed(1)} {row.unit}</strong>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : null}
                      <p>{environmentLayer.summary}</p>
                    </div>
                  ) : null}

                  <div className="demo-card">
                    <h4>{t.citizenImpact}</h4>
                    <div className="mini-kpis">
                      <div><span>{t.minutesSavedDay}</span><strong>{citizenImpact.minutesSavedDaily.toFixed(0)}</strong></div>
                      <div><span>{t.weeklyCo2Cut}</span><strong>{citizenImpact.weeklyCo2Cut.toFixed(1)} kg</strong></div>
                      <div><span>{t.protectedAccess}</span><strong>{citizenImpact.protectedAccess}/{mahalla.facilities.length}</strong></div>
                    </div>
                    <p>{t.residentsSignal}</p>
                  </div>

                  <div className="demo-card">
                    <h4>{t.facilityImpact}</h4>
                    <div className="facility-impact-list">
                      {facilityImpact.map((item) => (
                        <div key={item.label}>
                          <div>
                            <strong>{item.label}</strong>
                            <small>{item.value}</small>
                          </div>
                          <span>{item.score.toFixed(0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {dataQuality ? (
                    <div className="demo-card data-quality-card">
                      <div className="demo-card-header">
                        <h4>{t.dataQuality}</h4>
                        <strong>{dataQuality.confidence}%</strong>
                      </div>
                      <p className="traffic-legend muted">{dataQuality.mode_label}</p>
                      <div className="quality-list">
                        {ensureList(dataQuality.inputs).map((item) => (
                          <div key={item.label}>
                            <strong>{item.label}</strong>
                            <span>{item.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="demo-card passport-card">
                    <h4>{t.pilotPassport}</h4>
                    <div className="passport-grid">
                      <div><span>{t.launchWindow}</span><strong>{executiveImpact.pilotDays} {language === 'ru' ? 'дней' : 'days'}</strong></div>
                      <div><span>{t.lowCost}</span><strong>{language === 'ru' ? 'без стройки' : 'no civil works'}</strong></div>
                      <div><span>{t.reversible}</span><strong>{language === 'ru' ? 'да' : 'yes'}</strong></div>
                      <div><span>{t.owner}</span><strong>{t.cityMobilityTeam}</strong></div>
                    </div>
                  </div>

                  <div className="demo-card stress-card">
                    <div className="demo-card-header">
                      <h4>{t.scenarioStress}</h4>
                      <button type="button" onClick={handleStressTest} disabled={stressLoading}>
                        {stressLoading ? t.stressTesting : t.runStressTest}
                      </button>
                    </div>
                    {scenarioResults.length ? (
                      <div className="stress-list">
                        {scenarioResults.map((item) => (
                          <div key={item.scenario}>
                            <strong>{item.label}</strong>
                            <span>{item.readiness.toFixed(0)}% {t.scenarioReady}</span>
                            <small>{item.recommendation}</small>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p>{t.noStress}</p>
                    )}
                  </div>

                  <div className="demo-card evidence-card">
                    <h4>{t.evidencePack}</h4>
                    <ul>
                      <li>{language === 'ru' ? 'FastAPI API возвращает метрики, кандидатов и AI-объяснение.' : 'FastAPI returns metrics, candidates, and AI explanation.'}</li>
                      <li>{language === 'ru' ? 'Leaflet-карта показывает районный коридор и социальные объекты.' : 'Leaflet map shows the corridor and public facilities.'}</li>
                      <li>{language === 'ru' ? 'Оптимизация ранжирует несколько вмешательств по прозрачной формуле.' : 'Optimization ranks multiple interventions with a transparent formula.'}</li>
                      <li>{language === 'ru' ? 'Fallback не дает демо упасть без локального SUMO.' : 'Fallback keeps the demo running without local SUMO.'}</li>
                    </ul>
                  </div>

                  <div className="demo-card roadmap-card">
                    <h4>{t.roadmapTitle}</h4>
                    {roadmap.length ? (
                      roadmap.map((item) => (
                        <div key={item.phase} className="roadmap-row">
                          <span>{item.phase}</span>
                          <p><strong>{item.title}</strong><small>{ensureList(item.items).join(' · ')}</small></p>
                        </div>
                      ))
                    ) : (
                      [t.day30, t.day60, t.day90].map((label, index) => (
                        <div key={label} className="roadmap-row">
                          <span>{label}</span>
                          <p>{fallbackRoadmap[index]}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="demo-card pitch-card">
                    <h4>{t.pitchCard}</h4>
                    {pitchLines.map((line) => <p key={line}>{line}</p>)}
                  </div>
                </div>
              </>
            ) : (
              <p>{t.noBrief}</p>
            )}
          </div>
        )}

        <div className="panel-card">
          <h3>{t.baseline}</h3>
          <div className="two-col">
            <div><span>{t.avgSpeed}</span><strong>{(optResult?.baseline?.average_speed_kmh ?? metrics.average_speed_kmh).toFixed(2)} km/h</strong></div>
            <div><span>{t.waiting}</span><strong>{(optResult?.baseline?.average_waiting_seconds ?? metrics.average_waiting_seconds).toFixed(2)} s</strong></div>
            <div><span>{t.liveFlow}</span><strong>{liveVehicleCount}</strong></div>
            <div><span>{t.peakVehicles}</span><strong>{optResult?.baseline?.max_vehicle_count ?? metrics.max_vehicle_count}</strong></div>
          </div>
        </div>

        <div className="panel-card">
          <h3>{t.recommendedIntervention}</h3>
          {selectedCandidate ? (
            <>
              <p className="recommendation-tag">{selectedCandidate.label || selectedCandidate.id}</p>
              <p className="traffic-legend muted">{selectedCandidate.category_label || selectedCandidate.category || 'mobility'} {t.intervention}</p>
              <p>{selectedCandidate.summary || selectedCandidate.description}</p>
              {selectedCandidate.selected_reason && (
                <p className="selection-reason">{selectedCandidate.selected_reason}</p>
              )}
              <div className="two-col">
                <div><span>{t.speed}</span><strong>{selectedCandidate.metrics.average_speed_kmh.toFixed(2)} km/h</strong></div>
                <div><span>{t.wait}</span><strong>{selectedCandidate.metrics.average_waiting_seconds.toFixed(2)} s</strong></div>
                <div><span>CO2</span><strong>{(selectedCandidate.metrics.co2_kg ?? 0).toFixed(1)} kg</strong></div>
                <div><span>{t.access}</span><strong>{(selectedCandidate.metrics.accessibility_score ?? 100).toFixed(0)}%</strong></div>
                <div><span>{t.deltaSpeed}</span><strong>{selectedCandidate.delta.average_speed_kmh.toFixed(2)}</strong></div>
                <div><span>{t.deltaWait}</span><strong>{selectedCandidate.delta.average_waiting_seconds.toFixed(2)}</strong></div>
              </div>
            </>
          ) : (
            <p>{t.runOptimization}</p>
          )}
        </div>

        <div className="panel-card">
          <h3>{t.whyChoice}</h3>
          {optResult?.ai ? (
            <>
              <p><strong>{optResult.ai.recommendation}</strong></p>
              <p className="selection-reason">{optResult.ai.signal_focus || t.signalFocus}</p>
              <p className="traffic-legend muted">{optResult.ai.scope || t.optimizationScope}</p>
              <p>{optResult.ai.reasoning}</p>
              {Array.isArray(optResult.ai.tradeoffs) && optResult.ai.tradeoffs.length ? (
                <ul>
                  {optResult.ai.tradeoffs.map((item) => <li key={item}>{item}</li>)}
                </ul>
              ) : null}
              <p className="confidence">{t.confidence}: {optResult.ai.confidence}</p>
              <p className="traffic-legend muted">{optResult.ai.expected_impact || t.expectedImpact}</p>
              {optResult.ai.best_signal_id ? <p className="traffic-legend muted">{t.bestSignalId}: {optResult.ai.best_signal_id}</p> : null}
            </>
          ) : (
            <p>{t.explanationAfter}</p>
          )}
        </div>

        <div className="panel-card">
          <h3>{t.mahallaPosition}</h3>
          <p className="recommendation-tag">{t.neighborhoodMobilityIntelligence}</p>
          <p>{optResult?.insights?.headline || t.neighborhoodPlatform}</p>
          <p className="selection-reason">{optResult?.insights?.context || t.neighborhoodContext}</p>
        </div>

        <div className="panel-card full-width-card">
          <h3>{t.interventionOptions}</h3>
          <div className="candidate-list">
            {optResult?.ranked_candidates?.length ? (
              optResult.ranked_candidates.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  className={`candidate-card ${selectedCandidate?.id === candidate.id ? 'selected' : ''}`}
                  onClick={() => selectCandidate(candidate.id)}
                >
                  <div className="candidate-header">
                    <strong>{candidate.label || candidate.id}</strong>
                    <span>{candidate.score.toFixed(2)}</span>
                  </div>
                  <p>{candidate.summary || candidate.description}</p>
                  <div className="candidate-stats">
                    <span>{t.speed}: {candidate.metrics.average_speed_kmh.toFixed(2)} km/h</span>
                    <span>{t.wait}: {candidate.metrics.average_waiting_seconds.toFixed(2)} s</span>
                    <span>{t.deltaSpeed}: {candidate.delta.average_speed_kmh.toFixed(2)}</span>
                    <span>{t.deltaWait}: {candidate.delta.average_waiting_seconds.toFixed(2)}</span>
                  </div>
                </button>
              ))
            ) : (
              <p>{t.runOptimization}</p>
            )}
          </div>
        </div>
      </section>

    </div>
  )
}

export default App
