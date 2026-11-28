'use strict';
// Pure presentation geometry only. Does not read cards, the DOM or game rules.
function computeHandLayout(handCount,handArea){
  const cardWidth = handArea.cardWidth || 58;
  const availableHandWidth = Math.max(cardWidth, handArea.width || 300);
  // Show a readable card-number strip on each overlapped card. Long hands
  // flow into compact stacked rows rather than being clipped off-screen.
  const visibleStrip = availableHandWidth < 520 ? 32 : 44;
  const maxColumns = Math.max(1, Math.floor(
    Math.max(0, availableHandWidth - cardWidth) / visibleStrip
  ) + 1);
  const handColumns = Math.max(1, Math.min(handCount, maxColumns));
  const handRows = handCount ? Math.ceil(handCount / handColumns) : 0;
  const handStep = handColumns <= 1 ? cardWidth :
    Math.min(cardWidth + (availableHandWidth < 520 ? 3 : 8),
      (availableHandWidth - cardWidth) / (handColumns - 1));
  const cardHeight = cardWidth * 355 / 252;
  const handRowStep = Math.max(34, Math.round(cardHeight * (handRows > 3 ? .49 : .64)));
  // Center a partly occupied final row, instead of leaving its cards
  // stranded on the left side of the table.
  const tailCount = handCount - Math.max(0, handRows - 1) * handColumns;
  const lastRowShift = handRows > 1 && tailCount < handColumns
    ? (handColumns - tailCount) * handStep / 2 : 0;
  const handLayout = {
    gridTemplateColumns: `repeat(${handColumns}, ${handStep}px)`,
    gridAutoRows: `${handRowStep}px`,
    width: `${cardWidth + (handColumns - 1) * handStep}px`,
    height: `${cardHeight + Math.max(0, handRows - 1) * handRowStep}px`
  };

  return {handColumns,handRows,lastRowShift,handLayout};
}
module.exports={computeHandLayout};
