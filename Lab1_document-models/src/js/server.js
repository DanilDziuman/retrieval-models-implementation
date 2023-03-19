import express from 'express'
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';
import ts_router from '../api/theoretic-set.route.js'
import vs_router from '../api/vector-space.route.js'
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3000;

app.use(express.json());
app.use('/js', express.static(path.join(__dirname, '../js')));
app.use('/css', express.static(path.join(__dirname, '../css')));
app.use('/assets', express.static(path.join(__dirname, '../assets')));

app.use('/api/theoretic-set', ts_router);
app.use('/api/vector-space', vs_router);

app.get('/', (req, res) => {
  res.sendFile(path.resolve('./src/html/index.html'));
});

app.get('/theoretic-set/terms', (req, res) => {
  res.sendFile(path.resolve('./src/html/terms.html'));
});

app.get('/theoretic-set/documents', (req, res) => {
  res.sendFile(path.resolve('./src/html/documents.html'));
});

app.get('/theoretic-set/search', (req, res) => {
  res.sendFile(path.resolve('./src/html/ts_search.html'));
});

app.get('/vector-space/documents', (req, res) => {
  res.sendFile(path.resolve('./src/html/documents.html'));
})

app.get('/vector-space/search', (req, res) => {
  res.sendFile(path.resolve('./src/html/vs_search.html'));
})

app.use('*', (req, res) => { // fallback case
  res.status(404).json({
    error: "not found"
  });
});


app.listen(port, () => {
  console.log(`Listening to http://localhost:${port}`);
})

export default app;