const express = require('express');
const qr = require('qr-image');
const { createCanvas, loadImage, registerFont } = require('canvas');
const sharp = require('sharp');
const archiver = require('archiver');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

// Register the font to use for numbers

// Set up view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.get('/', (req, res) => {
  res.render('index');
});

app.get('/generate', async (req, res) => {
  try {
    const urls = [];
    for (let i = 1; i <= 5; i++) {
      const randomPath = Math.random().toString(36).substring(2, 6);
      const url = `https://myreviews/scan/${randomPath}`;
      const qrCodePath = path.join(__dirname, 'qrcodes', `qrcode${i}.png`);
      await generateDinosaurQRCode(url, qrCodePath, i);
      urls.push({ url, qrCode: `qrcodes/qrcode${i}.png`, number: i });
    }
    res.render('qrcodes', { urls });
  } catch (error) {
    console.error('Error generating QR codes:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/download', async (req, res) => {
  const archive = archiver('zip', { zlib: { level: 9 } });
  res.attachment('qrcodes.zip');

  archive.on('error', (err) => {
    console.error('Error creating zip archive:', err);
    res.status(500).send('Internal Server Error');
  });

  const urls = [];
  for (let i = 1; i <= 5; i++) {
    const randomPath = Math.random().toString(36).substring(2, 6);
    const url = `https://myreviews/scan/${randomPath}`;
    urls.push({ url });
  }

  const tmpDir = path.join(__dirname, 'tmp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

  try {
    for (let i = 1; i <= urls.length; i++) {
      const qrCodePath = path.join(tmpDir, `qrcode${i}.png`);
      await generateDinosaurQRCode(urls[i - 1].url, qrCodePath, i);
      archive.file(qrCodePath, { name: `qrcode${i}.png` });
    }

    archive.pipe(res);
    archive.finalize();
  } catch (error) {
    console.error('Error generating QR codes for download:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

// Function to generate QR code with dinosaur icon and number
const generateDinosaurQRCode = async (url, outputPath, number) => {
  try {
    const qrSvg = qr.imageSync(url, { type: 'svg' });
    const canvas = createCanvas(500, 550); // Increase height to accommodate number
    const ctx = canvas.getContext('2d');

    const imgBuffer = await sharp(Buffer.from(qrSvg)).resize(500, 500).png().toBuffer();
    const qrImage = await loadImage(imgBuffer);
    ctx.drawImage(qrImage, 0, 0, 500, 500);

    const dinosaur = await loadImage(path.join(__dirname, 'dinosaur.png'));
    const logoSize = 100;
    const logoPosition = (canvas.width - logoSize) / 2;
    ctx.drawImage(dinosaur, logoPosition, logoPosition, logoSize, logoSize);

    // Add the number below the QR code
    ctx.font = 'bold 10px Arial';
    ctx.fillStyle = 'red';
    //ctx.textAlign = 'left';
    // Position number at the bottom center, adjust position as needed
    ctx.fillText(number, canvas.width / 7, canvas.height - 82);


    const out = fs.createWriteStream(outputPath);
    const stream = canvas.createPNGStream();
    stream.pipe(out);

    return new Promise((resolve, reject) => {
      out.on('finish', resolve);
      out.on('error', reject);
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
};
