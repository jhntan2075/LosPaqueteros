// Uso: node comparar-n.js <barrido.csv>...
// Por valor: tiempo medio (s) sobre todas las corridas, y fitness normalizado
// con n=30 (rep 1-10) y n=15 (rep 1-5). La normalizacion divide por la media
// del escenario dentro del mismo subconjunto, como se haria si solo existiera ese n.
const fs = require('fs');
const media = a => a.reduce((s, x) => s + x, 0) / a.length;
const desv = a => { const m = media(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };

function estad(filas) {
  const mediaEsc = {};
  for (const e of new Set(filas.map(f => f.escenario))) {
    mediaEsc[e] = media(filas.filter(f => f.escenario === e).map(f => f.fit));
  }
  const res = {};
  for (const v of new Set(filas.map(f => f.valor))) {
    const x = filas.filter(f => f.valor === v).map(f => f.fit / mediaEsc[f.escenario]);
    const m = media(x), d = desv(x), ee = d / Math.sqrt(x.length);
    res[v] = { n: x.length, m, d, lo: m - 1.96 * ee, hi: m + 1.96 * ee };
  }
  return res;
}

for (const archivo of process.argv.slice(2)) {
  const lineas = fs.readFileSync(archivo, 'utf8').trim().split(/\r?\n/);
  const cab = lineas[0].split(',');
  const i = k => cab.indexOf(k);
  const filas = lineas.slice(1).map(l => {
    const c = l.split(',');
    return { escenario: c[i('escenario')], valor: c[i('valor_peso')], rep: +c[i('repeticion')],
      fit: +c[i('fitness_acumulado')], ms: +c[i('tiempo_computo_ms')] };
  });
  const n30 = estad(filas);
  const n15 = estad(filas.filter(f => f.rep <= 5));
  console.log('\n' + archivo.split('/').pop());
  console.log('valor | corridas | t_medio_s | t_real_s | t_t330_s | n30 media | n30 desv | n15 media | n15 desv | n15 IC95');
  for (const v of Object.keys(n30)) {
    const g = filas.filter(f => f.valor === v);
    const tr = g.filter(f => f.escenario.startsWith('real'));
    const tt = g.filter(f => !f.escenario.startsWith('real'));
    const a = n30[v], b = n15[v];
    console.log([v, g.length, (media(g.map(f => f.ms)) / 1000).toFixed(1),
      (media(tr.map(f => f.ms)) / 1000).toFixed(1), (media(tt.map(f => f.ms)) / 1000).toFixed(1),
      a.m.toFixed(4), a.d.toFixed(4), b.m.toFixed(4), b.d.toFixed(4),
      `[${b.lo.toFixed(4)}, ${b.hi.toFixed(4)}]`].join(' | '));
  }
  const vals = Object.keys(n15);
  const pares = [];
  for (let x = 0; x < vals.length; x++) {
    for (let y = x + 1; y < vals.length; y++) {
      const a = n15[vals[x]], b = n15[vals[y]];
      if (!(a.lo <= b.hi && b.lo <= a.hi)) {
        pares.push(`${vals[x]} vs ${vals[y]}`);
      }
    }
  }
  console.log('n15 pares separados: ' + (pares.length ? pares.join(', ') : 'ninguno'));
}
