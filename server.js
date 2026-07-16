const express = require('express');
const compression = require('compression');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(compression());
app.use(express.static('dist/webrtc-angular/browser'));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/webrtc-angular/browser/index.html'));
});

app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
});
