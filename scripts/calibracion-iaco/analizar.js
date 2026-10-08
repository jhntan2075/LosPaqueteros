// Uso: node analizar.js <barrido.csv>
// Normaliza el fitness por la media del escenario y resume por valor:
// media, desv, EE, IC95, CV por escenario, tiempo y evaluaciones. Escribe
// <barrido>-normalizado.csv con la columna fitness_normalizado.
const fs = require('fs');
const archivo = process.argv[2];
const lineas = fs.readFileSync(archivo, 'utf8').trim().split(/\r?\n/);
const cab = lineas[0].split(',');
const excluir = process.argv[3];
const filas = lineas.slice(1).map(l => {
  const c = l.split(',');
  const o = {};
  cab.forEach((k, i) => { o[k] = c[i]; });
  return o;
}).filter(f => f.escenario !== excluir);
if (excluir) {
  console.log(`(sin ${excluir})`);
}
const num = (o, k) => parseFloat(o[k]);
const media = a => a.reduce((s, x) => s + x, 0) / a.length;
const desv = a => { const m = media(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };

const mediaEsc = {};
for (const esc of new Set(filas.map(f => f.escenario))) {
  mediaEsc[esc] = media(filas.filter(f => f.escenario === esc).map(f => num(f, 'fitness_acumulado')));
}
filas.forEach(f => { f.fitness_normalizado = num(f, 'fitness_acumulado') / mediaEsc[f.escenario]; });
if (!excluir) fs.writeFileSync(archivo.replace(/\.csv$/, '-normalizado.csv'),
  [cab.concat('fitness_normalizado').join(',')]
    .concat(filas.map(f => cab.map(k => f[k]).concat(f.fitness_normalizado.toFixed(6)).join(',')))
    .join('\n') + '\n');

const valores = [...new Set(filas.map(f => f.valor_peso))];
const resumen = valores.map(v => {
  const g = filas.filter(f => f.valor_peso === v);
  const x = g.map(f => f.fitness_normalizado);
  const m = media(x), d = desv(x), ee = d / Math.sqrt(x.length);
  const cvs = [...new Set(g.map(f => f.escenario))].map(esc => {
    const y = g.filter(f => f.escenario === esc).map(f => num(f, 'fitness_acumulado'));
    return `${esc}:${(100 * desv(y) / media(y)).toFixed(2)}%`;
  });
  return {
    valor: v, n: x.length, media: m, desv: d, ee, lo: m - 1.96 * ee, hi: m + 1.96 * ee,
    cvs: cvs.join(' '),
    ms: media(g.map(f => num(f, 'tiempo_computo_ms'))),
    evals: media(g.map(f => num(f, 'evaluaciones_usadas'))),
    tarde: media(g.map(f => num(f, 'pedidos_fuera_de_plazo'))),
    sinEnt: media(g.map(f => num(f, 'pct_productos_sin_entregar'))),
    km: media(g.map(f => num(f, 'km_totales'))),
  };
});
console.log('valor | n | media | desv | EE | IC95 | CV por escenario | ms | evals | fuera_plazo | %prod_sin_entregar | km');
for (const r of resumen) {
  console.log([r.valor, r.n, r.media.toFixed(4), r.desv.toFixed(4), r.ee.toFixed(4),
    `[${r.lo.toFixed(4)}, ${r.hi.toFixed(4)}]`, r.cvs, r.ms.toFixed(0), r.evals.toFixed(0),
    r.tarde.toFixed(2), r.sinEnt.toFixed(3), r.km.toFixed(0)].join(' | '));
}
console.log('\nSolapamiento de IC95 por pares:');
for (let i = 0; i < resumen.length; i++) {
  for (let j = i + 1; j < resumen.length; j++) {
    const a = resumen[i], b = resumen[j];
    const solapan = a.lo <= b.hi && b.lo <= a.hi;
    console.log(`  ${a.valor} vs ${b.valor}: ${solapan ? 'se solapan' : 'SEPARADOS'}`);
  }
}
console.log('\nMedia de fitness bruto por escenario y valor:');
for (const esc of Object.keys(mediaEsc)) {
  console.log('  ' + esc + ': ' + valores.map(v =>
    `${v}=${media(filas.filter(f => f.escenario === esc && f.valor_peso === v)
      .map(f => num(f, 'fitness_acumulado'))).toFixed(1)}`).join('  '));
}
