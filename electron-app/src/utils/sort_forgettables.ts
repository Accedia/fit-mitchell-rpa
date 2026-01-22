import { MitchellForgettable } from '../interfaces/Forgettable';
import { ORDERED_GROUP_IDS } from '../constants/ordered_group_ids';

/**
 * Sorts forgettables by their groupId based on the order defined in ORDERED_GROUP_IDS.
 * Items with groupIds not in the list will be placed at the end.
 */
export const sortForgettablesByGroupId = (forgettables: MitchellForgettable[]): MitchellForgettable[] => {
  return [...forgettables].sort((a, b) => {
    const indexA = ORDERED_GROUP_IDS.indexOf(a.groupId || '');
    const indexB = ORDERED_GROUP_IDS.indexOf(b.groupId || '');

    // If groupId not found in the ordered list, put it at the end
    const orderA = indexA === -1 ? ORDERED_GROUP_IDS.length : indexA;
    const orderB = indexB === -1 ? ORDERED_GROUP_IDS.length : indexB;

    return orderA - orderB;
  });
};
