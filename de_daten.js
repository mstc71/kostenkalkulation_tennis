const DE_DATES = {
  "Hessen": {
    feiertage: {
      2025: [
        {datum: '2025-01-01', name: 'Neujahr' }, 
        {datum: '2025-04-18', name: 'Karfreitag' }, 
        {datum: '2025-04-21', name: 'Ostermontag' }, 
        {datum: '2025-05-01', name: 'Tag der Arbeit' }, 
        {datum: '2025-05-29', name: 'Christi Himmelfahrt' }, 
        {datum: '2025-06-09', name: 'Pfingstmontag' }, 
        {datum: '2025-06-19', name: 'Fronleichnam' }, 
        {datum: '2025-10-03', name: 'Tag der Deutschen Einheit' }, 
        {datum: '2025-12-25', name: '1. Weihnachtstag' }, 
        {datum: '2025-12-26', name: '2. Weihnachtstag' }
      ],
      2026: [
        {datum: '2026-01-01', name: 'Neujahr' }, 
        {datum: '2026-04-03', name: 'Karfreitag' }, 
        {datum: '2026-04-06', name: 'Ostermontag' }, 
        {datum: '2026-05-01', name: 'Tag der Arbeit' },
        {datum: '2026-05-14', name: 'Christi Himmelfahrt' }, 
        {datum: '2026-05-25', name: 'Pfingstmontag' }, 
        {datum: '2026-06-04', name: 'Fronleichnam' }, 
        {datum: '2026-10-03', name: 'Tag der Deutschen Einheit' }, 
        {datum: '2026-12-25', name: '1. Weihnachtstag' }, 
        {datum: '2026-12-26', name: '2. Weihnachtstag' }
      ],
      2027: [
        {datum: '2027-01-01', name: 'Neujahr' }, 
        {datum: '2027-03-26', name: 'Karfreitag' }, 
        {datum: '2027-03-29', name: 'Ostermontag' }, 
        {datum: '2027-05-01', name: 'Tag der Arbeit' }, 
        {datum: '2027-05-06', name: 'Christi Himmelfahrt' }, 
        {datum: '2027-05-17', name: 'Pfingstmontag' }, 
        {datum: '2027-05-27', name: 'Fronleichnam' }, 
        {datum: '2027-10-03', name: 'Tag der Deutschen Einheit' },
        {datum: '2027-12-25', name: '1. Weihnachtstag' }, 
        {datum: '2027-12-26', name: '2. Weihnachtstag' }
      ],
      2028: [
        {datum: '2028-01-01', name: 'Neujahr' }, 
        {datum: '2028-04-14', name: 'Karfreitag' }, 
        {datum: '2028-04-17', name: 'Ostermontag' }, 
        {datum: '2028-05-01', name: 'Tag der Arbeit' }, 
        {datum: '2028-05-25', name: 'Christi Himmelfahrt' }, 
        {datum: '2028-06-05', name: 'Pfingstmontag' }, 
        {datum: '2028-06-15', name: 'Fronleichnam' }, 
        {datum: '2028-10-03', name: 'Tag der Deutschen Einheit' }, 
        {datum: '2028-12-25', name: '1. Weihnachtstag' }, 
        {datum: '2028-12-26', name: '2. Weihnachtstag' }
      ],
      2029: [
        {datum: '2029-01-01', name: 'Neujahr' }, 
        {datum: '2029-03-30', name: 'Karfreitag' }, 
        {datum: '2029-04-02', name: 'Ostermontag' }, 
        {datum: '2029-05-01', name: 'Tag der Arbeit' }, 
        {datum: '2029-05-10', name: 'Christi Himmelfahrt' }, 
        {datum: '2029-05-21', name: 'Pfingstmontag' }, 
        {datum: '2029-05-31', name: 'Fronleichnam' }, 
        {datum: '2029-10-03', name: 'Tag der Deutschen Einheit' }, 
        {datum: '2029-12-25', name: '1. Weihnachtstag' }, 
        {datum: '2029-12-26', name: '2. Weihnachtstag' }
      ],
      2030: [
        {datum: '2030-01-01', name: 'Neujahr' }, 
        {datum: '2030-04-19', name: 'Karfreitag' }, 
        {datum: '2030-04-22', name: 'Ostermontag' }, 
        {datum: '2030-05-01', name: 'Tag der Arbeit' }, 
        {datum: '2030-05-30', name: 'Christi Himmelfahrt' }, 
        {datum: '2030-06-10', name: 'Pfingstmontag' }, 
        {datum: '2030-06-20', name: 'Fronleichnam' }, 
        {datum: '2030-10-03', name: 'Tag der Deutschen Einheit' }, 
        {datum: '2030-12-25', name: '1. Weihnachtstag' }, 
        {datum: '2030-12-26', name: '2. Weihnachtstag' }
      ],
    },
    ferien: {
      2025: [    
        { von: "2025-04-07", bis: "2025-04-21", name: "Osterferien" },
        { von: "2025-07-07", bis: "2025-08-15", name: "Sommerferien" },
        { von: "2025-10-06", bis: "2025-10-18", name: "Herbstferien" },
        { von: "2025-12-22", bis: "2026-01-10", name: "Weihnachtsferien" }
      ],
      2026: [
        { von: "2026-03-30", bis: "2026-04-10", name: "Osterferien" },
        { von: "2026-06-29", bis: "2026-08-07", name: "Sommerferien" },
        { von: "2026-10-05", bis: "2026-10-17", name: "Herbstferien" },
        { von: "2026-12-23", bis: "2027-01-12", name: "Weihnachtsferien" }
      ],
      2027: [
        { von: "2027-03-22", bis: "2027-04-02", name: "Osterferien" },
        { von: "2027-06-28", bis: "2027-08-06", name: "Sommerferien" },
        { von: "2027-10-04", bis: "2027-10-16", name: "Herbstferien" },
        { von: "2027-12-23", bis: "2028-01-11", name: "Weihnachtsferien" }
      ],
      2028: [
        { von: "2028-04-03", bis: "2028-04-14", name: "Osterferien" },
        { von: "2028-07-03", bis: "2028-08-11", name: "Sommerferien" },
        { von: "2028-10-09", bis: "2028-10-20", name: "Herbstferien" },
        { von: "2028-12-27", bis: "2029-01-12", name: "Weihnachtsferien" }
      ],
      2029: [
        { von: "2029-03-29", bis: "2029-04-13", name: "Osterferien" },
        { von: "2029-07-16", bis: "2029-08-24", name: "Sommerferien" },
        { von: "2029-10-15", bis: "2029-10-26", name: "Herbstferien" },
        { von: "2029-12-24", bis: "2030-01-11", name: "Weihnachtsferien" }
      ],
      2030: [
        { von: "2030-04-06", bis: "2030-04-22", name: "Osterferien" },
        { von: "2030-07-22", bis: "2030-08-30", name: "Sommerferien" },
        { von: "2030-10-27", bis: "2030-10-31", name: "Herbstferien" },  // -> noch nicht bekannt
        { von: "2030-12-22", bis: "2031-01-05", name: "Weihnachtsferien" }   // -> noch nicht bekannt
      ],
    }
  }
};
