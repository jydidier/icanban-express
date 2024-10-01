import tsdav from 'tsdav';
import ical from 'ical.js';
import express from 'express';

const app = express();
app.use(express.json());

app.use('/ui', express.static('ui'));
app.use('/scripts', express.static('scripts'));

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
