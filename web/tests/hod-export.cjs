/* eslint-disable @typescript-eslint/no-require-imports */
// Isolated in-memory Postgres validation; never reads the application's database.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const { PGlite } = require('@electric-sql/pglite');
function load(file, mocks = {}) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const testModule = { exports: {} };
  new Function('require', 'module', 'exports', source)((name) => {
    if (name === 'server-only') return {};
    if (name in mocks) return mocks[name];
    return require(name);
  }, testModule, testModule.exports);
  return testModule.exports;
}

test('HOD export: authorization, matching cohort, complete history and safe CSV', async () => {
  const pg = new PGlite();
  try {
    await pg.exec(load('lib/schema.ts').SCHEMA);
    await pg.exec(`INSERT INTO users(id,role,login_id,password_hash,name,birthday,gender) VALUES
      (1,'hod','HOD','secret','Head',NULL,NULL),
      (2,'patient','S1234567A','secret','Alice, "A"','1970-01-01','F'),
      (3,'patient','S7654321B','secret','Bob','2000-01-01','M'),
      (4,'patient','S0000000C','secret','=Unreferred',NULL,NULL);
      INSERT INTO referrals(id,patient_id,doctor_id,diagnosis,region,surgery_date,created_at) VALUES
      (1,2,1,'110: Knee','Knee',now() - interval '4 months',now()),
      (2,3,1,'Hip','Hip',NULL,now()),
      (3,2,1,'Old hip','Hip',NULL,now() - interval '1 year');
      INSERT INTO appointments(id,referral_id,patient_id,scheduled_at) VALUES (1,1,2,now()),(2,1,2,now());
      INSERT INTO surveys(patient_id,appointment_id,filled_by,mo,sc,ua,pd,ad,eq_vas,pain,index_value)
      VALUES(2,1,2,1,2,3,4,5,70,4,0.7),(2,NULL,2,1,1,1,1,1,90,1,0.9);`);
    const db = { db: async () => async (sql, args) => (await pg.query(sql, args)).rows };
    const search = load('lib/search.ts', { './db': db, './data': {}, './plain': {} });
    const csv = load('lib/csv.ts');
    const exporter = load('lib/hod-export.ts', { './db': db, './search': search, './csv': csv });
    let current = null;
    let calls = 0;
    const route = load('app/api/hod/export/route.ts', {
      '@/lib/auth': { session: async () => current }, '@/lib/search': search,
      '@/lib/hod-export': { exportPatients: async (p) => { calls++; return exporter.exportPatients(p); } },
    });
    const req = (query = '') => new Request('http://localhost/api/hod/export' + query);
    assert.equal((await route.GET(req())).status, 401);
    for (const role of ['patient', 'caregiver', 'doctor', 'physio']) {
      current = { user: { role } };
      assert.equal((await route.GET(req())).status, 403);
    }
    assert.equal(calls, 0);
    current = { user: { role: 'hod' } };
    const response = await route.GET(req('?diagnosis=110&min_age=50&max_age=90&postop=3-6&scope=mine'));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.match(response.headers.get('content-type'), /text\/csv/);
    assert.match(response.headers.get('content-disposition'), /attachment/);
    const body = await response.text();
    assert.match(body, /Alice, ""A""/);
    assert.doesNotMatch(body, /Bob|Unreferred|secret|password|S1234567A/);
    assert.equal(body.trim().split('\r\n').length, 8); // header + patient + 2 referrals + 2 appointments + 2 surveys
    assert.match(body, /Old hip/); // history retained after latest-referral filtering
    for (const query of ['?q=Bob', '?q=S7654321B', '?region=Hip', '?max_age=30']) {
      const result = await (await route.GET(req(query))).text();
      assert.match(result, /Bob/); assert.doesNotMatch(result, /Alice/);
    }
    const empty = await (await route.GET(req('?q=missing'))).text();
    assert.equal(empty.trim().split('\r\n').length, 1);
    const all = await (await route.GET(req())).text();
    assert.match(all, /'=Unreferred/);
    // Ensure export is not truncated by the browse screen's LIMIT 200.
    await pg.exec(`INSERT INTO users(id,role,login_id,password_hash,name) SELECT n + 100, 'patient', 'TEST' || n, 'secret', 'Bulk ' || n FROM generate_series(1,205) n`);
    const bulk = await exporter.exportPatients(search.parseSearch({}, 'all'));
    assert.match(bulk, /Bulk 205/);
    assert.equal(bulk.trim().split('\r\n').length, 216);
    assert.equal(csv.csv(['a','b'], [{a:'\n=HYPERLINK("x")',b:-0.2}]), '\uFEFF"a","b"\r\n"\'\n=HYPERLINK(""x"")","-0.2"\r\n');
    assert.equal(csv.csv(['a'], [{a:'x\r\ny'}]), '\uFEFF"a"\r\n"x\r\ny"\r\n');
  } finally { await pg.close(); }
});
