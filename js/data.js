/* Parks: Roll & Hike reference data */
window.PRH_DATA = (() => {
  const A = 'assets/icons/';
  const P = 'assets/parks/';
  const parks = [
    { id:'yosemite', name:'Yosemite', landmark:'Водопад', landmarkIcon:'park', front:P+'yosemite-front.jpg', back:P+'yosemite-back.jpg', journal:'Завершив разворот с Водопадом, получи 1 ☀.', night:'Потрать 2 ☀, чтобы взять два разных бонуса: бинокль, карандаш или воду.', score:'3 очка за каждую пару «Лес + Водопад»; 2 очка за каждую пару «Луг + Гора».', special:'', bonusCost:2, bonusAction:'Выбери два разных бонуса парка и отметь их в блокноте.' },
    { id:'arches', name:'Arches', landmark:'Арка', landmarkIcon:'park', front:P+'arches-front.jpg', back:P+'arches-back.jpg', journal:'Завершив разворот с Аркой, получи бонус, связанный с рисунком на соседнем развороте (сверху, снизу, слева или справа). Соседний разворот не обязан быть завершён.', night:'Потрать 2 ☀, чтобы добавить по 1 линии на доступные страницы «Лес», «Гора» и «Луг» (до 3 линий).', score:'1 очко за каждый завершённый разворот, чей рисунок отличается от рисунков на всех соседних разворотах.', special:'', bonusCost:2, bonusAction:'Добавь по одной линии на доступные страницы «Лес», «Гора» и «Луг» (до трёх линий всего).' },
    { id:'death-valley', name:'Death Valley', landmark:'Череп', landmarkIcon:'park', front:P+'death-valley-front.jpg', back:P+'death-valley-back.jpg', journal:'Завершив разворот с Черепом, зачеркни доступное животное на выбор. Бонус этой клетки не получай; правило движения слева направо сохраняется.', night:'Потрать 3 ☀, чтобы добавить до 3 линий на одну доступную страницу журнала.', score:'2 очка за каждую Гору, нарисованную в журнале (линии не требуются).', special:'Вода, полученная с обычного кубика похода, заменяется на ☀.', bonusCost:3, bonusAction:'Добавь до трёх линий на одну доступную страницу журнала.' },
    { id:'glacier', name:'Glacier', landmark:'Снежинка', landmarkIcon:'park', front:P+'glacier-front.jpg', back:P+'glacier-back.jpg', journal:'Для разворота со Снежинкой отдельный немедленный бонус в правилах не указан; завершённые развороты со Снежинкой дают бонус при подсчёте фляги.', night:'Можно выполнить любые или все действия по одному разу: 2 ☀ → +3 к очкам фляги за раунд; 2 ☀ → нарисовать Гору или Снежинку; 1 ☀ → получить воду.', score:'При подсчёте фляги получи +1 за каждый завершённый разворот со Снежинкой.', special:'За каждый завершённый разворот «Лес» или «Луг» можно потратить 1 ☀, чтобы повторно получить его связанный бонус.', bonusCost:null, bonusAction:'Выбери одно или несколько из трёх ночных действий; каждое можно выполнить не больше одного раза за ночь.' },
    { id:'acadia', name:'Acadia', landmark:'Жёлудь', landmarkIcon:'park', front:P+'acadia-front.jpg', back:P+'acadia-back.jpg', journal:'Завершив разворот с Жёлудем, нарисуй Лес или Луг на следующей доступной странице.', night:'За каждый завершённый разворот «Лес» или «Луг» можно потратить 1 ☀, чтобы повторить его связанный бонус.', score:'Удвой очки в области подсчёта животных.', special:'', bonusCost:1, repeatable:true, bonusAction:'Потрать 1 ☀ за повтор бонуса завершённого разворота «Лес» или «Луг».' },
    { id:'smoky', name:'Great Smoky Mountains', landmark:'Облако', landmarkIcon:'park', front:P+'great-smoky-mountains-front.jpg', back:P+'great-smoky-mountains-back.jpg', journal:'Завершив разворот с Лугом, получи воду и ещё по одной воде за каждый ранее завершённый разворот с Облаком.', night:'Потрать 2 ☀, чтобы зачеркнуть доступное животное на выбор.', score:'2 очка за каждую Гору, нарисованную в журнале (линии не требуются).', special:'', bonusCost:2, bonusAction:'Зачеркни доступное животное на выбор.' }
  ];
  const assets = {
    binoculars:A+'binoculars.svg', water:A+'water.svg', water2:A+'water-double.svg', mountain:A+'mountain.svg', mountainSun:A+'mountain-sun.svg',
    forest:A+'forest.svg', forestSun:A+'forest-sun.svg', pencil:A+'pencil.svg', canteen:A+'canteen.svg', canteenSun:A+'canteen-sun.svg',
    bear:A+'bear.svg', bearTurtle:A+'bear-turtle.svg', bird:A+'bird.svg', fish:A+'fish.svg', fishBird:A+'fish-bird.svg',
    sunWater:A+'sun-water.svg', sunPencil:A+'sun-pencil.svg', turtle:A+'turtle.svg', flower:A+'flower.svg', flowerSun:A+'flower-sun.svg'
  };
  const die = (icons, label, slash=false) => ({ icons, label, slash });
  const dice = [
    { id:1, faces:[die(['park'],'Уникальная достопримечательность'),die(['flower'],'Луг'),die(['canteen'],'Вода'),die(['mountain','sun'],'Гора + солнце'),die(['forest','sun'],'Лес + солнце'),die(['bear','turtle'],'Медведь / черепаха',true)] },
    { id:2, faces:[die(['forest'],'Лес'),die(['mountain'],'Гора'),die(['bear'],'Медведь'),die(['pencil'],'Карандаш'),die(['flower','sun'],'Луг + солнце'),die(['canteen','sun'],'Вода + солнце')] },
    { id:3, faces:[die(['binoculars'],'Бинокль'),die(['fish'],'Рыба'),die(['water','water'],'Две воды'),die(['pencil'],'Карандаш'),die(['sun','pencil'],'Солнце + карандаш'),die(['sun','water'],'Солнце + вода')] },
    { id:4, faces:[die(['turtle'],'Черепаха'),die(['sun','sun'],'Два солнца'),die(['fish','bird'],'Рыба / птица',true),die(['sun','pencil'],'Солнце + карандаш'),die(['canteen'],'Вода'),die(['sun','water'],'Солнце + вода')] },
    { id:5, lead:true, faces:[die(['pencil'],'Карандаш'),die(['binoculars'],'Бинокль'),die(['water'],'Вода'),die(['pencil'],'Карандаш'),die(['binoculars'],'Бинокль'),die(['water'],'Вода')] }
  ];
  const tokens = [
    { id:'forest', title:'Лес', icon:'forest', instruction:'Отметь значок Леса в блокноте: нарисуй его на следующем развороте или заполни ночной бонус Леса. Затем все игроки могут бесплатно добавить одну линию на доступной странице Леса.' },
    { id:'mountain', title:'Гора', icon:'mountain', instruction:'Отметь значок Горы в блокноте: нарисуй её на следующем развороте или заполни ночной бонус Горы. Затем все игроки могут бесплатно добавить одну линию на доступной странице Горы.' },
    { id:'meadow', title:'Луг', icon:'flower', instruction:'Отметь значок Луга в блокноте: нарисуй его на следующем развороте или заполни ночной бонус Луга. Затем все игроки могут бесплатно добавить одну линию на доступной странице Луга.' },
    { id:'park', title:'Достопримечательность парка', icon:'park', instruction:'Отметь уникальную достопримечательность выбранного парка в блокноте. Затем все игроки могут бесплатно добавить одну линию на соответствующей доступной странице.' },
    { id:'binoculars', title:'Бинокль', icon:'binoculars', instruction:'Выбери любой тип достопримечательности: все игроки могут бесплатно добавить одну линию на соответствующей доступной странице журнала.' }
  ];
  return { parks, assets, dice, tokens };
})();
