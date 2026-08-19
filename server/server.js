import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
const { Pool } = pg;
const app = express();
const PORT = Number(process.env.PORT || 5001);
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://localhost/drug_inventory' });
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());

function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function initializeDatabase() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const seed = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
  await pool.query(schema);
  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM facilities');
  if (rows[0].count === 0) await pool.query(seed);
  console.log('PostgreSQL database ready.');
}

pool.query(`ALTER TABLE facilities ADD COLUMN IF NOT EXISTS address TEXT`).catch(e => console.error('Address column setup:', e.message));

app.get('/api/health', async (_, res) => {
  try { await pool.query('SELECT 1'); res.json({ ok: true, database: 'PostgreSQL' }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.get('/api/search', async (req, res) => {
  try {
    const q = String(req.query.medicine || '').trim();
    const lat = Number(req.query.lat || 17.4065);
    const lng = Number(req.query.lng || 78.4772);
    if (!q) return res.json([]);
    const { rows } = await pool.query(`
      SELECT i.id AS inventory_id, f.id AS "sourceId", f.name AS "sourceName", f.type,
             f.phone, f.address, f.license, f.verified, f.lat, f.lng,
             m.name AS medicine, m.strength, i.quantity, i.expiry
      FROM inventory i
      JOIN facilities f ON f.id=i.facility_id
      JOIN medicines m ON m.id=i.medicine_id
      WHERE m.name ILIKE $1 AND i.quantity > 0
      ORDER BY i.quantity DESC`, [`%${q}%`]);
    const results = rows.map(r => ({
      ...r,
      distanceKm: Number(distanceKm(lat,lng,r.lat,r.lng).toFixed(2)),
      status: r.quantity < 10 ? 'LOW STOCK' : r.quantity > 30 ? 'AVAILABLE' : 'LIMITED'
    })).sort((a,b)=>a.distanceKm-b.distanceKm);
    res.json(results);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/network', async (_, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT i.id, f.id AS "sourceId", f.name AS "sourceName", f.type,
             f.phone, f.license, m.name AS medicine, m.strength, i.quantity, i.expiry
      FROM inventory i JOIN facilities f ON f.id=i.facility_id JOIN medicines m ON m.id=i.medicine_id
      ORDER BY f.name, m.name`);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/facilities', async (_, res) => {
  try { const { rows } = await pool.query('SELECT * FROM facilities ORDER BY name'); res.json(rows); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/medicines', async (_, res) => {
  try { const { rows } = await pool.query('SELECT * FROM medicines ORDER BY name, strength'); res.json(rows); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/facilities', async (req,res) => {
  try {
    const { name,type,lat,lng,phone,license,verified=false } = req.body;
    if (!name || !type || lat === undefined || lng === undefined || !phone || !license) return res.status(400).json({error:'All facility fields are required'});
    const { rows } = await pool.query(`INSERT INTO facilities(name,type,lat,lng,phone,license,verified) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [name,type,Number(lat),Number(lng),phone,license,Boolean(verified)]);
    res.status(201).json(rows[0]);
  } catch(e) { res.status(400).json({error:e.code==='23505'?'License already exists':e.message}); }
});

app.post('/api/admin/inventory', async (req,res) => {
  try {
    const { facilityId, medicineName, strength, quantity, expiry } = req.body;
    if (!facilityId || !medicineName || !strength || quantity === undefined || !expiry) return res.status(400).json({error:'All inventory fields are required'});
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const m = await client.query(`INSERT INTO medicines(name,strength) VALUES($1,$2) ON CONFLICT(name,strength) DO UPDATE SET name=EXCLUDED.name RETURNING id`,[medicineName,strength]);
      const result = await client.query(`INSERT INTO inventory(facility_id,medicine_id,quantity,expiry) VALUES($1,$2,$3,$4) ON CONFLICT(facility_id,medicine_id) DO UPDATE SET quantity=EXCLUDED.quantity, expiry=EXCLUDED.expiry RETURNING *`,[Number(facilityId),m.rows[0].id,Number(quantity),expiry]);
      await client.query('COMMIT'); res.status(201).json(result.rows[0]);
    } catch(e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  } catch(e) { res.status(400).json({error:e.message}); }
});

app.post('/api/admin/facilities/:id/verify', async (req,res) => {
  try {
    const id = Number(req.params.id);
    const { rows } = await pool.query(
      'UPDATE facilities SET verified=TRUE WHERE id=$1 RETURNING *',
      [id]
    );
    if (!rows[0]) return res.status(404).json({error:'Facility not found'});
    res.json(rows[0]);
  } catch(e) {
    res.status(500).json({error:e.message});
  }
});

app.post('/api/license/verify', async (req,res) => {
  try { const license=String(req.body.license||'').trim(); const {rows}=await pool.query('SELECT name,license,verified FROM facilities WHERE license=$1',[license]); res.json({license,valid:rows.length>0 && rows[0].verified,facility:rows[0]?.name||null}); }
  catch(e){res.status(500).json({error:e.message});}
});

app.post('/api/delivery/request', async (req,res) => {
  const { sourceId, medicine, quantity=1, customerName='Emergency User', phone='' }=req.body;
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const item=await client.query(`SELECT i.id,i.quantity,i.medicine_id,f.name AS source FROM inventory i JOIN facilities f ON f.id=i.facility_id JOIN medicines m ON m.id=i.medicine_id WHERE i.facility_id=$1 AND m.name ILIKE $2 FOR UPDATE`,[Number(sourceId),medicine]);
    if(!item.rows[0]) return res.status(404).json({error:'Medicine not found at source'});
    if(item.rows[0].quantity<Number(quantity)) return res.status(400).json({error:'Insufficient stock'});
    await client.query('UPDATE inventory SET quantity=quantity-$1 WHERE id=$2',[Number(quantity),item.rows[0].id]);
    const r=await client.query(`INSERT INTO delivery_requests(facility_id,medicine_id,quantity,customer_name,customer_phone) VALUES($1,$2,$3,$4,$5) RETURNING *`,[Number(sourceId),item.rows[0].medicine_id,Number(quantity),customerName,phone]);
    await client.query('COMMIT'); res.json({...r.rows[0],source:item.rows[0].source});
  } catch(e){await client.query('ROLLBACK');res.status(500).json({error:e.message});} finally{client.release();}
});

app.post('/api/transfer/request', async(req,res)=>{
  try{
    const {fromSourceId,toSourceId,medicine,quantity}=req.body;
    const {rows}=await pool.query(`SELECT i.medicine_id,i.quantity FROM inventory i JOIN medicines m ON m.id=i.medicine_id WHERE i.facility_id=$1 AND m.name ILIKE $2`,[Number(fromSourceId),medicine]);
    if(!rows[0]||rows[0].quantity<Number(quantity)) return res.status(400).json({error:'Source does not have enough stock'});
    const r=await pool.query(`INSERT INTO transfer_requests(from_facility_id,to_facility_id,medicine_id,quantity) VALUES($1,$2,$3,$4) RETURNING *`,[Number(fromSourceId),Number(toSourceId),rows[0].medicine_id,Number(quantity)]);
    res.json(r.rows[0]);
  }catch(e){res.status(500).json({error:e.message});}
});

initializeDatabase().then(()=>app.listen(PORT,()=>console.log(`Drug Inventory API running on http://localhost:${PORT}`))).catch(e=>{console.error('Database startup failed:',e.message);process.exit(1);});
