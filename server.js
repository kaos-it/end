const express = require('express');
const { Client } = require('pg');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const methodOverride = require('method-override');




const app = express();
const port = 80; // Gerekirse portu değiştir
const host = '0.0.0.0'; // Tüm dış IP'lerden erişime açmak için

// PostgreSQL bağlantısı
const client = new Client({
  user: 'postgres',
  host: '127.0.0.1',
  database: 'postgres',
  password: '1',
  port: 5432,
});

// PostgreSQL bağlantısı
client.connect()
  .then(() => console.log('PostgreSQL bağlantısı başarılı!'))
  .catch(err => console.error('Bağlantı hatası:', err.stack));

// EJS şablon motoru olarak kullan
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // views klasörünü belirtiyoruz

// CORS ayarları
const allowedOrigins = [
  'https://rodoos.az', 
  'http://localhost:3000', 
  'http://127.0.0.1:3000'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy does not allow this origin!'));
    }
  },
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));

// Statik dosya servisi (resimler, stil dosyaları vb.)
app.use(express.static(path.join(__dirname, 'public')));

// JSON ve URL encoded veri almak için middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// method-override kullanımı
app.use(methodOverride('_method')); // POST metoduyla gelen istekleri DELETE gibi kullanabilmemizi sağlıyor

// Multer yapılandırması (fotoğraf yüklemek için)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // Maksimum dosya boyutu: 5MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype) return cb(null, true);
    cb(new Error('Lütfen bir resim dosyası yükleyin.'));
  }
});

// Fotoğraf yükleme işlemi
app.post('/upload', upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'Lütfen bir fotoğraf yükleyin.' });

  const photoBuffer = req.file.buffer;
  const description = req.body.description || '';

  const query = 'INSERT INTO photos (image, description) VALUES ($1, $2) RETURNING id';
  client.query(query, [photoBuffer, description], (err, result) => {
    if (err) return res.status(500).json({ success: false, message: `Fotoğraf yüklenemedi: ${err.message}` });

    // Fotoğraf yüklendikten sonra fotoğraf yükleme sayfasına yönlendir
    res.redirect('/upload');
  });
});

// Fotoğraf yükleme sayfası
app.get('/upload', (req, res) => {
  client.query('SELECT id, image, description FROM photos', (err, result) => {
    if (err) {
      console.error('Fotoğraflar alınamadı:', err);
      return res.status(500).json({ success: false, message: 'Fotoğraflar alınamadı.' });
    }

    const photos = result.rows.map(row => ({
      id: row.id,
      image: Buffer.from(row.image).toString('base64'),
      description: row.description
    }));

    res.render('photo-upload', { photos });
  });
});
// Fotoğraf silme işlemi - DELETE metodu ile
app.post('/delete-photo/:id', async (req, res) => {
  try {
    const result = await client.query('DELETE FROM photos WHERE id = $1', [req.params.id]);
    if (result.rowCount > 0) {
      res.json({ success: true, message: 'Fotoğraf başarıyla silindi!' });
    } else {
      res.status(404).json({ success: false, message: 'Fotoğraf bulunamadı!' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Fotoğraf silinemedi.' });
  }
});

// Ana sayfa yönlendirmesi (photos sayfasına yönlendirme)
app.get('/', (req, res) => {
  res.redirect('/photos');  // Ana sayfayı photos sayfasına yönlendiriyoruz
});

// Fotoğraflar sayfası
app.get('/photos', async (req, res) => {
  try {
    const result = await client.query('SELECT id, image, description FROM photos');

    const photos = result.rows.map(row => ({
      id: row.id,
      image: row.image ? Buffer.from(row.image).toString('base64') : null,
      description: row.description
    }));

    console.log("✅ Fotoğraflar başarıyla alındı:", photos.length);

    res.render('photos', { photos }); // 📌 EJS'e `photos` değişkenini gönderiyoruz!
  } catch (err) {
    console.error("❌ Fotoğraflar alınırken hata oluştu:", err);
    res.render('photos', { photos: [] }); // 📌 Hata olursa boş dizi gönderiyoruz.
  }
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Ana sayfa (fotoğraf yükleme sayfası)
app.get('/expert/upload', (req, res) => {
  client.query('SELECT id, image, description FROM expert', (err, result) => {
    if (err) {
      console.error('Fotoğraflar alınamadı:', err);
      return res.status(500).json({ success: false, message: 'Fotoğraflar alınamadı.' });
    }

    const photos = result.rows.map(row => ({
      id: row.id,
      image: row.image ? Buffer.from(row.image).toString('base64') : null,
      description: row.description
    }));

    // Yüklenmiş fotoğrafları expert-upload.ejs şablonuna gönderiyoruz
    res.render('expert-upload', { photos });
  });
});

// Fotoğraf yükleme işlemi
app.post('/expert/upload', upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'Lütfen bir fotoğraf yükleyin.' });

  const photoBuffer = req.file.buffer;
  const description = req.body.description || '';

  const query = 'INSERT INTO expert (image, description) VALUES ($1, $2) RETURNING id';
  client.query(query, [photoBuffer, description], (err, result) => {
    if (err) return res.status(500).json({ success: false, message: `Fotoğraf yüklenemedi: ${err.message}` });

    res.redirect('/expert/upload');
  });
});

// Fotoğraf silme işlemi
app.post('/expert/delete-photo/:id', async (req, res) => {
  try {
    const result = await client.query('DELETE FROM expert WHERE id = $1', [req.params.id]);
    if (result.rowCount > 0) {
      res.redirect('/expert/upload');
    } else {
      res.status(404).json({ success: false, message: 'Fotoğraf bulunamadı!' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Fotoğraf silinemedi.' });
  }
});
 

//listeleme

app.get('/expert/photos', (req, res) => {
  client.query('SELECT id, image, description FROM expert', (err, result) => {
    if (err) {
      console.error('Fotoğraflar alınamadı:', err);
      return res.status(500).json({ success: false, message: 'Fotoğraflar alınamadı.' });
    }

    const photos = result.rows.map(row => ({
      id: row.id,
      image: row.image ? Buffer.from(row.image).toString('base64') : null,
      description: row.description
    }));

    // Fotoğrafları expert-photos.ejs şablonuna gönderiyoruz
    res.render('expert-photos', { photos });
  });
});



///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////




// Diğer sayfa yönlendirmeleri
app.get('/expert', (req, res) => {
  res.render('expert');
});

app.get('/about', (req, res) => {
  res.render('about');
});
app.get('/telim', (req, res) => {
  res.render('telim');
});
app.get('/secenler', (req, res) => {
  res.render('secenler');
});



app.listen(port, host, () => {
  console.log(`Sunucu ${port} portunda çalışıyor...`);
  console.log(`👉 Siteyi aç: http://rodoos.az:${port}`);
});