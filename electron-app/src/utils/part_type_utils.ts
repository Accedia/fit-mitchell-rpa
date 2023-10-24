const PART_TYPE_DROPDOWN_INDEXES = {
  OEM: 1,
  Aftermarket: 2,
  Recycled: 3,
  Reconditioned: 4,
  'Opt OEM': 5,
  Recored: 6,
  Tire: 7,
  None: 8,
};

/**
 * Returns how many clicks are needed to select the
 * correct part type in the "Type" dropdown
 * @param partType The forgettable part type
 */
export const getPartTypeOptionIndex = (partType: string): number => {
  if (Object.keys(PART_TYPE_DROPDOWN_INDEXES).includes(partType)) {
    const partTypeKey = partType as keyof typeof PART_TYPE_DROPDOWN_INDEXES;
    return 8 - PART_TYPE_DROPDOWN_INDEXES[partTypeKey];
  }

  return 0;
};

/**
 * Returns how many tab clicks are needed to navigate to the part type drop down
 *
 * Different because, depending on oper some fields are disabled and therefore
 * not selectable with "Tab"
 * @param oper The operation of the forgettable
 */
export const getPartTypeTabIndex = (oper: string): number => {
  switch (oper) {
    case 'Repl':
    case 'R_I':
    case 'Subl':
    case 'Align':
      return 2;
    case 'Rpr':
      return 3;
    case 'Refn':
    case 'Blend':
      return 1;
    case 'Sect':
      return 5;
    case 'PDR':
      return 0;
    default:
      throw new Error('Unknown operation');
  }
};

export const getPartNumTabIndex = (oper: string): number => {
  switch (oper) {
    case 'Repl':
      return 4;
    case 'Sect':
      return 6;
    case 'Subl':
      return 3;
    default:
      return 0;
  }
};
