const express = require('express');
const { Client } = require('pg');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const methodOverride = require('method-override'); // method-override ekliyoruz

const app = express();
const port = 3000;

// PostgreSQL bağlantısı
const client = new Client({
  user: 'postgres',
  host: '127.0.0.1',
  database: 'postgres',
  password: '1',
  port: 5432,
});

client.connect()
  .then(() => console.log('PostgreSQL bağlantısı başarılı!'))
  .catch(err => console.error('Bağlantı hatası:', err.stack));

// EJS şablon motoru olarak kullan
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // views klasörünü belirtiyoruz

// CORS ayarları
app.use(cors({
  origin: 'http://localhost:5500', // Frontend domainini burada belirt
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

// Fotoğraf silme işlemi
app.delete('/delete-photo/:id', (req, res) => {
  const photoId = req.params.id;

  const query = 'DELETE FROM photos WHERE id = $1';
  client.query(query, [photoId], (err) => {
    if (err) {
      console.error('Silme hatası:', err);
      return res.status(500).json({ success: false, message: 'Fotoğraf silinemedi' });
    }
    res.json({ success: true, message: 'Fotoğraf başarıyla silindi!' });
  });
});

// Silme formunun POST metoduyla çalışabilmesi için
app.post('/delete-photo/:id', (req, res) => {
  const photoId = req.params.id;

  const query = 'DELETE FROM photos WHERE id = $1';
  client.query(query, [photoId], (err) => {
    if (err) {
      console.error('Silme hatası:', err);
      return res.status(500).json({ success: false, message: 'Fotoğraf silinemedi' });
    }
    res.redirect('/upload'); // Silme işleminden sonra yükleme sayfasına yönlendir
  });
});

// Fotoğrafları listeleme
app.get('/photos', (req, res) => {
  client.query('SELECT id, image, description FROM photos', (err, result) => {
    if (err) return res.status(500).json({ success: false, message: 'Fotoğraflar alınamadı.' });

    const photos = result.rows.map(row => ({
      id: row.id,
      image: Buffer.from(row.image).toString('base64'),
      description: row.description
    }));

    res.render('photos', { photos });
  });
});
app.use(express.static('public'));

app.get('/expert', (req, res) => {
  res.render('expert');
});
app.get('/about', (req, res) => {
  res.render('about');
});
app.get('/hakkimizda', (req, res) => {
  res.render('hakkimizda');
});
app.get('/deyerlerimiz', (req, res) => {
  res.render('deyerlerimiz');
});
app.get('/misya', (req, res) => {
  res.render('misya');
});
app.get('/telim', (req, res) => {
  res.render('telim');
});
app.get('/meslehet', (req, res) => {
  res.render('meslehet');
});
app.get('/arasdirma', (req, res) => {
  res.render('arasdirma');
});
app.get('/secenler', (req, res) => {
  res.render('secenler');
});




app.listen(port, () => {
  console.log(`Sunucu ${port} portunda çalışıyor...`);
});
