export function createLogicalClock(initialTimestamp: number = 0) {
  let timestamp = initialTimestamp;

  return {
    getNextTimestamp: () => timestamp++,
    syncTimestamp: (otherTimestamp: number) => {
      timestamp = Math.max(timestamp, otherTimestamp) + 1;
    },
  };
}
