import tsdav from 'tsdav';
import ical from 'ical.js';
import express from 'express';
import process from 'node:process';

let cdefault = {};

if (process.argv.length > 2) {
    cdefault = await import(process.argv[2], { with: { type: "json" } });
} else {
    cdefault = await import('./config.json', { with: { type: "json" } });
}

const config = cdefault.default;

/*****************************************************************************
 * This part is dedicated to calendar management
 * **************************************************************************/

const client = new tsdav.DAVClient( config.server );
await client.login();

app.get( '/calendars', async (req, res) => {
    let cal = await client.fetchCalendars();
    console.log(cal);

    res.json();
}); 

app.get( '/calendar/:id', (req, res) => {
    console.log(req.params.id);
    res.json();
});






/*****************************************************************************
 * This part is required for the express backend
 * **************************************************************************/
const app = express();
app.use(express.json());

app.use('/ui', express.static('ui'));
app.use('/scripts', express.static('scripts'));

app.listen(config.port, () => {
    console.log(`Open browser with address : http://localhost:${config.port}/ui/board.html`);
});
