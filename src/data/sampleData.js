// Sample Trackman data for demo/testing
export function generateSampleData() {
  const pitchTypes = [
    { type: 'Four-Seam', velo: [93, 96], spin: [2200, 2400], hb: [-8, -4], vb: [14, 18] },
    { type: 'Slider', velo: [84, 88], spin: [2400, 2700], hb: [2, 8], vb: [0, 4] },
    { type: 'Changeup', velo: [83, 87], spin: [1700, 1900], hb: [-10, -6], vb: [6, 10] },
    { type: 'Curveball', velo: [76, 80], spin: [2600, 2900], hb: [4, 10], vb: [-6, 2] },
    { type: 'Cutter', velo: [88, 92], spin: [2300, 2600], hb: [0, 4], vb: [10, 14] },
  ];

  const pitchers = ['J. Smith', 'M. Jones', 'A. Rivera'];
  const pitchCalls = ['StrikeCalled', 'StrikeSwinging', 'Ball', 'InPlay', 'FoulBall'];

  const rows = [];
  const rand = (min, max) => min + Math.random() * (max - min);
  const randInt = (arr) => arr[Math.floor(Math.random() * arr.length)];

  for (const pitcher of pitchers) {
    const total = 80 + Math.floor(Math.random() * 40);
    for (let i = 0; i < total; i++) {
      const pt = pitchTypes[Math.floor(Math.random() * pitchTypes.length)];
      const velo = rand(...pt.velo);
      const spin = rand(...pt.spin);
      const hb = rand(...pt.hb);
      const vb = rand(...pt.vb);

      // Simulate strike zone location (feet, home plate)
      const side = rand(-1.5, 1.5);
      const height = rand(1.2, 4.2);

      rows.push({
        Pitcher: pitcher,
        TaggedPitchType: pt.type,
        RelSpeed: velo.toFixed(1),
        SpinRate: spin.toFixed(0),
        HorzBreak: hb.toFixed(1),
        InducedVertBreak: vb.toFixed(1),
        PlateLocSide: side.toFixed(3),
        PlateLocHeight: height.toFixed(3),
        RelHeight: (6.0 + rand(-0.3, 0.3)).toFixed(3),
        RelSide: (-1.5 + rand(-0.2, 0.2)).toFixed(3),
        Extension: (6.5 + rand(-0.5, 0.5)).toFixed(2),
        VertApprAngle: (-5 + rand(-3, 1)).toFixed(1),
        SpinAxis: rand(180, 360).toFixed(0),
        PitchCall: randInt(pitchCalls),
        Date: '2025-04-15',
      });
    }
  }

  return rows;
}

export function sampleDataToCSV() {
  const rows = generateSampleData();
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map(r => headers.map(h => r[h]).join(',')),
  ];
  return lines.join('\n');
}
