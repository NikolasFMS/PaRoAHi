/* Parks: Roll & Hike reference data */
window.PRH_DATA = (() => {
  const A = 'assets/icons/';
  const L = 'assets/icons/landmarks/';
  const P = 'assets/parks/';
  const parks = [
    {
      id: 'yosemite',
      name: 'Yosemite',
      landmark: 'Водопад',
      landmarkIcon: 'waterfall',
      front: P + 'yosemite-front.jpg',
      back: P + 'yosemite-back.jpg',
      journal: 'Завершив разворот с Водопадом, получи 1 ☀.',
      night: 'Потрать 2 ☀, чтобы взять два разных бонуса из трёх: Бинокль, Карандаш или Вода (нельзя брать два одинаковых).',
      score: '3 очка за каждую пару «Лес + Водопад» в журнале; 2 очка за каждую пару «Луг + Гора».',
      special: '',
      bonusCost: 2,
      bonusAction: 'Потрать 2 ☀: выбери два разных бонуса из трёх (Бинокль, Карандаш, Вода) и отметь их в блокноте.'
    },
    {
      id: 'arches',
      name: 'Arches',
      landmark: 'Арка',
      landmarkIcon: 'arch',
      front: P + 'arches-front.jpg',
      back: P + 'arches-back.jpg',
      journal: 'Завершив разворот с Аркой, получи бонус, связанный с рисунком на соседнем развороте (сверху, снизу, слева или справа), даже если тот разворот ещё не завершён.',
      night: 'Потрать 2 ☀, чтобы нарисовать по 1 линии на доступных страницах «Лес», «Гора» и «Луг» (по одной на каждой, всего до 3 линий).',
      score: '1 очко за каждый завершённый разворот с достопримечательностью (Аркой), которая отличается от всех соседних с ней рисунков.',
      special: '',
      bonusCost: 2,
      bonusAction: 'Потрать 2 ☀: нарисуй по одной линии на доступных страницах «Лес», «Гора» и «Луг» (до трёх линий всего).'
    },
    {
      id: 'death-valley',
      name: 'Death Valley',
      landmark: 'Череп',
      landmarkIcon: 'skull',
      front: P + 'death-valley-front.jpg',
      back: P + 'death-valley-back.jpg',
      journal: 'Завершив разворот с Черепом, зачеркни любое животное на выбор слева направо. Бонус этой клетки НЕ получай.',
      night: 'Потрать 3 ☀, чтобы нарисовать до 3 линий на одной доступной странице журнала.',
      score: 'Стандартный подсчёт очков (специального правила подсчёта нет).',
      special: 'Нехватка воды: вода с обычного кубика похода заменяется на ☀ (вода с оранжевого кубика ведущего не заменяется).',
      bonusCost: 3,
      bonusAction: 'Потрать 3 ☀: нарисуй до трёх линий на одной доступной странице журнала.'
    },
    {
      id: 'glacier',
      name: 'Glacier',
      landmark: 'Снежинка',
      landmarkIcon: 'snowflake',
      front: P + 'glacier-front.jpg',
      back: P + 'glacier-back.jpg',
      journal: 'Бонус при подсчёте фляги: завершённые развороты со Снежинкой дают +1 очко к счёту фляги за каждый такой разворот.',
      night: 'Можно выполнить любые или все три действия (каждое не более одного раза за ночь): 2 ☀ → +3 к очкам фляги за раунд; 2 ☀ → нарисовать Гору или Снежинку; 1 ☀ → получить воду.',
      score: 'При подсчёте фляги получи +1 очко за каждый завершённый разворот со Снежинкой в журнале.',
      special: '',
      bonusCost: null,
      bonusAction: 'Выбери одно или несколько из трёх ночных действий Glacier (каждое не более одного раза за ночь).'
    },
    {
      id: 'acadia',
      name: 'Acadia',
      landmark: 'Жёлудь',
      landmarkIcon: 'acorn',
      front: P + 'acadia-front.jpg',
      back: P + 'acadia-back.jpg',
      journal: 'Завершив разворот с Жёлудем, зарисуй Лес или Луг на следующем доступном развороте.',
      night: 'За каждый завершённый разворот «Лес» или «Луг» можно потратить 1 ☀, чтобы повторно получить его бонус.',
      score: 'Удвой очки в области подсчёта очков за животных.',
      special: '',
      bonusCost: 1,
      repeatable: true,
      bonusAction: 'Потрать 1 ☀ за каждый завершённый разворот «Лес» или «Луг», чтобы повторно получить его бонус.'
    },
    {
      id: 'smoky',
      name: 'Great Smoky Mountains',
      landmark: 'Облако',
      landmarkIcon: 'cloud',
      front: P + 'great-smoky-mountains-front.jpg',
      back: P + 'great-smoky-mountains-back.jpg',
      journal: 'Завершив разворот с Лугом, получи воду и ещё по 1 воде за каждый ранее завершённый разворот с Облаком.',
      night: 'Потрать 2 ☀, чтобы зачеркнуть доступное животное на выбор (слева направо).',
      score: '2 очка за каждую Гору, нарисованную в журнале (линии не требуются).',
      special: '',
      bonusCost: 2,
      bonusAction: 'Потрать 2 ☀: зачеркни доступное животное на выбор (слева направо).'
    }
  ];
  const assets = {
    binoculars: A + 'binoculars.svg',
    water: A + 'water.svg',
    water2: A + 'water-double.svg',
    mountain: A + 'mountain.svg',
    mountainSun: A + 'mountain-sun.svg',
    forest: A + 'forest.svg',
    forestSun: A + 'forest-sun.svg',
    pencil: A + 'pencil.svg',
    canteen: A + 'water.svg',
    canteenSun: A + 'sun-water.svg',
    arrowhead: A + 'arrowhead.svg',
    arrowheadSun: A + 'arrowhead-sun.svg',
    bear: A + 'bear.svg',
    bearTurtle: A + 'bear-turtle.svg',
    bird: A + 'bird.svg',
    fish: A + 'fish.svg',
    fishBird: A + 'fish-bird.svg',
    sunWater: A + 'sun-water.svg',
    sunPencil: A + 'sun-pencil.svg',
    turtle: A + 'turtle.svg',
    flower: A + 'flower.svg',
    flowerSun: A + 'flower-sun.svg',
    waterfall: L + 'yosemite-waterfall.svg',
    arch: L + 'arches-arch.svg',
    skull: L + 'death-valley-skull.svg',
    snowflake: L + 'glacier-snowflake.svg',
    cloud: L + 'smoky-cloud.svg',
    acorn: L + 'acadia-acorn.svg'
  };
  const die = (icons, label, slash = false) => ({ icons, label, slash });
  const dice = [
    { id: 1, faces: [die(['bird'], 'Птица'), die(['flower'], 'Цветок'), die(['arrowhead'], 'Наконечник стрелы'), die(['mountain', 'sun'], 'Гора + солнце'), die(['forest', 'sun'], 'Дерево + солнце'), die(['bear', 'turtle'], 'Медведь / черепаха', true)] },
    { id: 2, faces: [die(['forest'], 'Дерево'), die(['mountain'], 'Гора'), die(['bear'], 'Медведь'), die(['pencil'], 'Карандаш'), die(['flower', 'sun'], 'Цветок + солнце'), die(['arrowhead', 'sun'], 'Наконечник стрелы + солнце')] },
    { id: 3, faces: [die(['binoculars'], 'Бинокль'), die(['fish'], 'Рыба'), die(['water', 'water'], '2 воды'), die(['pencil'], 'Карандаш'), die(['sun', 'pencil'], 'Солнце + карандаш'), die(['sun', 'water'], 'Солнце + вода')] },
    { id: 4, faces: [die(['turtle'], 'Черепаха'), die(['sun', 'sun'], '2 солнца'), die(['fish', 'bird'], 'Рыба / птица', true), die(['sun', 'pencil'], 'Солнце + карандаш'), die(['arrowhead'], 'Наконечник стрелы'), die(['sun', 'water'], 'Солнце + вода')] },
    { id: 5, lead: true, faces: [die(['pencil'], 'Карандаш'), die(['pencil'], 'Карандаш'), die(['binoculars'], 'Бинокль'), die(['binoculars'], 'Бинокль'), die(['water'], 'Вода'), die(['water'], 'Вода')] }
  ];
  const tokens = [
    { id: 'forest', title: 'Лес', icon: 'forest', instruction: 'Отметь значок Леса в блокноте: нарисуй его на следующем развороте или заполни ночной бонус Леса. Затем все игроки могут бесплатно добавить одну линию на доступной странице Леса.' },
    { id: 'mountain', title: 'Гора', icon: 'mountain', instruction: 'Отметь значок Горы в блокноте: нарисуй её на следующем развороте или заполни ночной бонус Горы. Затем все игроки могут бесплатно добавить одну линию на доступной странице Горы.' },
    { id: 'meadow', title: 'Луг', icon: 'flower', instruction: 'Отметь значок Луга в блокноте: нарисуй его на следующем развороте или заполни ночной бонус Луга. Затем все игроки могут бесплатно добавить одну линию на доступной странице Луга.' },
    { id: 'park', title: 'Достопримечательность парка', icon: 'park', instruction: 'Отметь уникальную достопримечательность выбранного парка в блокноте. Затем все игроки могут бесплатно добавить одну линию на соответствующей доступной странице.' },
    { id: 'binoculars', title: 'Бинокль', icon: 'binoculars', instruction: 'Выбери любой тип достопримечательности: все игроки могут бесплатно добавить одну линию на соответствующей доступной странице журнала.' }
  ];
  return { parks, assets, dice, tokens };
})();
