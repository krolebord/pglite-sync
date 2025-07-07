export async function measureTime<T>(name: string, fn: () => Promise<T> | T) {
  const startMark = `${name}-start`;
  const endMark = `${name}-end`;

  performance.mark(startMark);
  const result = await fn();
  performance.mark(endMark);

  performance.measure(name, startMark, endMark);
  return result;
}

export function logMeasurements(filter?: string) {
  const measurements = performance.getEntriesByType("measure");

  if (measurements.length === 0) {
    console.log("📊 No performance measurements found");
    return;
  }

  // Filter measurements if a filter string is provided
  const filteredMeasurements = filter
    ? measurements.filter((m) => m.name.includes(filter))
    : measurements;

  if (filteredMeasurements.length === 0) {
    console.log(`📊 No measurements found matching "${filter}"`);
    return;
  }

  console.log("📊 Performance Measurements:");
  console.log("═".repeat(50));

  filteredMeasurements
    .sort((a, b) => b.duration - a.duration) // Sort by duration (longest first)
    .forEach((measurement) => {
      const duration = measurement.duration.toFixed(2);
      const name = measurement.name;

      // Add visual indicators based on duration
      let indicator = "🟢"; // Fast (< 10ms)
      if (measurement.duration > 100) indicator = "🔴"; // Slow (> 100ms)
      else if (measurement.duration > 50) indicator = "🟡"; // Medium (50-100ms)

      console.log(`${indicator} ${name.padEnd(30)} ${duration.padStart(8)}ms`);
    });

  console.log("═".repeat(50));

  const totalDuration = filteredMeasurements.reduce(
    (sum, m) => sum + m.duration,
    0
  );
  const avgDuration = totalDuration / filteredMeasurements.length;

  console.log(
    `📈 Total: ${totalDuration.toFixed(2)}ms | Average: ${avgDuration.toFixed(
      2
    )}ms | Count: ${filteredMeasurements.length}`
  );
}

export function clearMeasurements(namePattern?: string) {
  const measurements = performance.getEntriesByType("measure");

  if (namePattern) {
    measurements
      .filter((m) => m.name.includes(namePattern))
      .forEach((m) => performance.clearMeasures(m.name));
  } else {
    performance.clearMeasures();
  }

  console.log("🧹 Measurements cleared");
}
