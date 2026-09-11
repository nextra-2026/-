const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'owner';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data.json');
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '*';

if (!JWT_SECRET) { console.error('JWT_SECRET is required'); process.exit(1); }
if (!ADMIN_PASSWORD) { console.error('ADMIN_PASSWORD is required'); process.exit(1); }

app.use(cors({ origin: FRONTEND_ORIGIN, credentials: FRONTEND_ORIGIN !== '*' }));
app.use(express.json({ limit: '1mb' }));

// NEXTRA has exactly ONE privileged account: the configured Admin account.
// There is no Manager, Supervisor, Staff, or second Admin account.
const ADMIN_ROLE = 'Admin';
const ADMIN_PERMISSIONS = [
  'overview', 'products', 'orders', 'customers', 'ads', 'roles', 'ai'
];

function loadDb(){
  if(!fs.existsSync(DATA_FILE)) return { admins: [], products: [], customers: [], orders: [] };
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch(e){ console.error('Invalid data.json, starting empty:', e.message); return { admins: [], products: [], customers: [], orders: [] }; }
}
function saveDb(){
  const tmp = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}
const db = loadDb();
db.admins ||= []; db.products ||= []; db.customers ||= []; db.orders ||= [];

async function ensureSingleAdmin(){
  // Normalize the persisted admin list so the backend can never keep multiple
  // privileged accounts. The configured username/password are authoritative.
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  db.admins = [{
    id: 1,
    username: ADMIN_USERNAME,
    passwordHash,
    role: ADMIN_ROLE
  }];
  saveDb();
  console.log(`Single Admin account ready: ${ADMIN_USERNAME}`);
}

function authenticate(req,res,next){
  const token = (req.headers.authorization || '').startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null;
  if(!token) return res.status(401).json({success:false,message:'غير مصرح'});

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    // Backend-side identity check: a token is accepted only for the one
    // configured Admin identity. This prevents a forged/old role from granting access.
    if (
      payload.id !== 1 ||
      payload.username !== ADMIN_USERNAME ||
      payload.role !== ADMIN_ROLE
    ) {
      return res.status(403).json({success:false,message:'حساب الإدارة غير مصرح'});
    }

    req.admin = {
      id: 1,
      username: ADMIN_USERNAME,
      role: ADMIN_ROLE
    };
    next();
  } catch {
    return res.status(401).json({success:false,message:'جلسة الدخول غير صالحة'});
  }
}

function requirePermission(permission){
  return (req,res,next) =>
    ADMIN_PERMISSIONS.includes(permission)
      ? next()
      : res.status(403).json({success:false,message:'ليس لديك صلاحية لهذا الإجراء'});
}

function cleanProduct(input){
  const name = String(input.name || '').trim();
  const category = String(input.category || '').trim();
  const price = Number(input.price);
  if(!name || !category || !Number.isFinite(price) || price < 0) return null;
  return {
    id: input.id || `PRD-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
    name,
    category,
    price,
    cost: Number.isFinite(Number(input.cost)) ? Number(input.cost) : 0,
    icon: String(input.icon || '🎮'),
    customPrice: Boolean(input.customPrice)
  };
}

app.get('/api/health', (req,res)=>res.json({success:true,status:'ok'}));

app.get('/api/products', (req,res)=>res.json({success:true,products:db.products}));

app.post('/api/products', authenticate, requirePermission('products'), (req,res)=>{
  const product = cleanProduct(req.body);
  if(!product) return res.status(400).json({success:false,message:'بيانات المنتج غير صحيحة'});
  db.products.push(product); saveDb();
  res.status(201).json({success:true,product});
});

app.delete('/api/products/:id', authenticate, requirePermission('products'), (req,res)=>{
  const before = db.products.length;
  db.products = db.products.filter(p => String(p.id) !== String(req.params.id));
  if(db.products.length === before) return res.status(404).json({success:false,message:'المنتج غير موجود'});
  saveDb(); res.json({success:true});
});

app.post('/api/customers', (req,res)=>{
  const name = String(req.body.name || '').trim();
  const contact = String(req.body.contact || '').trim();
  if(!name || !contact) return res.status(400).json({success:false,message:'بيانات العميل ناقصة'});
  let customer = db.customers.find(c => c.contact === contact);
  if(customer) customer.name = name;
  else {
    customer = {
      id:`USR-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
      name, contact, points:0, createdAt:new Date().toISOString()
    };
    db.customers.push(customer);
  }
  saveDb(); res.json({success:true,customer});
});

app.get('/api/customers', authenticate, requirePermission('customers'),
  (req,res)=>res.json({success:true,customers:db.customers}));

app.post('/api/orders', (req,res)=>{
  const b = req.body || {};
  const items = Array.isArray(b.items) ? b.items : [];
  if(!b.customer || !b.contact || !items.length)
    return res.status(400).json({success:false,message:'بيانات الطلب ناقصة'});
  const total = Number(b.total);
  if(!Number.isFinite(total) || total < 0)
    return res.status(400).json({success:false,message:'إجمالي الطلب غير صحيح'});

  const order = {
    id: b.id || `NX-${Date.now()}`,
    customer:String(b.customer),
    contact:String(b.contact),
    items, total,
    status:'جديد',
    date:new Date().toISOString(),
    pointsAwarded:0
  };
  db.orders.unshift(order);

  if(!db.customers.some(c=>c.contact===order.contact)) {
    db.customers.push({
      id:`USR-${Date.now()}`,
      name:order.customer,
      contact:order.contact,
      points:0,
      createdAt:new Date().toISOString()
    });
  }
  saveDb();
  res.status(201).json({success:true,order});
});

app.get('/api/orders', authenticate, requirePermission('orders'),
  (req,res)=>res.json({success:true,orders:db.orders}));

app.patch('/api/orders/:id/status', authenticate, requirePermission('orders'), (req,res)=>{
  const allowed = ['جديد','قيد التنفيذ','مكتمل','ملغي'];
  if(!allowed.includes(req.body.status))
    return res.status(400).json({success:false,message:'حالة الطلب غير صحيحة'});

  const order = db.orders.find(o=>String(o.id)===String(req.params.id));
  if(!order) return res.status(404).json({success:false,message:'الطلب غير موجود'});

  const old = order.status;
  order.status = req.body.status;

  if(order.status === 'مكتمل' && old !== 'مكتمل' && !order.pointsAwarded){
    const points = Math.max(1, Math.floor(Number(order.total || 0)/10));
    order.pointsAwarded = points;
    const customer = db.customers.find(c=>c.contact===order.contact);
    if(customer) customer.points = Number(customer.points||0)+points;
  }

  saveDb();
  res.json({success:true,order});
});

app.get('/api/stats', authenticate, requirePermission('overview'), (req,res)=>{
  const revenue = db.orders.reduce((s,o)=>s+Number(o.total||0),0);
  res.json({
    success:true,
    stats:{
      orders:db.orders.length,
      revenue,
      customers:db.customers.length,
      products:db.products.length
    }
  });
});

app.post('/api/admin/login', async (req,res)=>{
  try{
    const {username,password} = req.body || {};

    // Login is tied to the backend environment identity, not a frontend flag.
    if(String(username || '') !== ADMIN_USERNAME) {
      return res.status(401).json({success:false,message:'بيانات الدخول غير صحيحة'});
    }

    const admin = db.admins.find(
      a => a.id === 1 &&
           a.username === ADMIN_USERNAME &&
           a.role === ADMIN_ROLE
    );

    if(!admin || !(await bcrypt.compare(String(password || ''), admin.passwordHash))) {
      return res.status(401).json({success:false,message:'بيانات الدخول غير صحيحة'});
    }

    const token = jwt.sign(
      {id:1, username:ADMIN_USERNAME, role:ADMIN_ROLE},
      JWT_SECRET,
      {expiresIn:'2h'}
    );

    res.json({
      success:true,
      token,
      admin:{
        username:ADMIN_USERNAME,
        role:ADMIN_ROLE,
        permissions:ADMIN_PERMISSIONS
      }
    });
  }catch(e){
    console.error(e);
    res.status(500).json({success:false,message:'حدث خطأ في السيرفر'});
  }
});

app.get('/api/admin/me', authenticate, (req,res)=>res.json({
  success:true,
  admin:req.admin,
  permissions:ADMIN_PERMISSIONS
}));

ensureSingleAdmin()
  .then(()=>app.listen(PORT,()=>console.log(`NEXTRA Backend running on port ${PORT}`)))
  .catch(err=>{console.error(err);process.exit(1);});
