// All Zimbabwe cities & towns, grouped by province. Used for the location
// picker during sign-up and job posting (and anywhere a location is chosen).

export const ZW_LOCATIONS = [
  { province: 'Harare Metropolitan', towns: ['Harare', 'Chitungwiza', 'Epworth'] },
  { province: 'Bulawayo Metropolitan', towns: ['Bulawayo'] },
  {
    province: 'Manicaland',
    towns: [
      'Mutare', 'Rusape', 'Chipinge', 'Nyanga', 'Chimanimani', 'Headlands',
      'Penhalonga', 'Odzi', 'Birchenough Bridge', 'Buhera', 'Murambinda',
      'Nyazura', 'Hauna', 'Checheche', 'Sakubva', 'Dangamvura',
    ],
  },
  {
    province: 'Mashonaland Central',
    towns: [
      'Bindura', 'Mount Darwin', 'Shamva', 'Guruve', 'Mvurwi', 'Centenary',
      'Concession', 'Glendale', 'Mazowe', 'Rushinga', 'Madziwa', 'Mukumbura',
    ],
  },
  {
    province: 'Mashonaland East',
    towns: [
      'Marondera', 'Ruwa', 'Chivhu', 'Murewa', 'Mutoko', 'Hwedza', 'Macheke',
      'Beatrice', 'Kotwa', 'Nyamapanda', 'Goromonzi', 'Juru', 'Dema', 'Mudzi',
    ],
  },
  {
    province: 'Mashonaland West',
    towns: [
      'Chinhoyi', 'Chegutu', 'Kadoma', 'Karoi', 'Kariba', 'Norton', 'Banket',
      'Mhangura', 'Chakari', 'Sanyati', 'Murombedzi', 'Magunje', 'Darwendale',
      'Raffingora', 'Chirundu', 'Makuti', 'Zvimba', 'Mubaira',
    ],
  },
  {
    province: 'Masvingo',
    towns: [
      'Masvingo', 'Chiredzi', 'Triangle', 'Gutu', 'Bikita', 'Zaka', 'Jerera',
      'Mashava', 'Ngundu', 'Mwenezi', 'Rutenga', 'Chatsworth', 'Renco Mine',
      'Nemamwa', 'Hippo Valley',
    ],
  },
  {
    province: 'Matabeleland North',
    towns: [
      'Hwange', 'Victoria Falls', 'Lupane', 'Binga', 'Dete', 'Nkayi',
      'Tsholotsho', 'Kamativi', 'Inyathi', 'Jambezi',
    ],
  },
  {
    province: 'Matabeleland South',
    towns: [
      'Gwanda', 'Beitbridge', 'Plumtree', 'Filabusi', 'Esigodini', 'Kezi',
      'Maphisa', 'West Nicholson', 'Colleen Bawn', 'Turk Mine',
    ],
  },
  {
    province: 'Midlands',
    towns: [
      'Gweru', 'Kwekwe', 'Zvishavane', 'Shurugwi', 'Redcliff', 'Gokwe',
      'Mvuma', 'Lalapanzi', 'Mberengwa', 'Zhombe', 'Silobela', 'Nembudziya',
      'Chirumhanzu', 'Mberengwa',
    ],
  },
];

// Flat, de-duplicated, alphabetically sorted list of every town.
export const ALL_TOWNS = Array.from(
  new Set(ZW_LOCATIONS.flatMap((g) => g.towns))
).sort((a, b) => a.localeCompare(b));

// Default selection for new forms.
export const DEFAULT_LOCATION = 'Harare';
