import dav from 'dav';
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

const app = express();


/*****************************************************************************
 * This part is dedicated to calendar management
 * **************************************************************************/

const xhr = new dav.transport.Basic(
    new dav.Credentials({
        username: config.server.credentials.username,
        password: config.server.credentials.password
    })
);

const account = await dav.createAccount({
    server: config.server.serverUrl,
    xhr: xhr,
    //loadObjects: true
});

console.log(account);

let calendars = account.calendars.filter(calendar => {
    return calendar.components.includes('VTODO')
}).sort((a,b) => {
    return a.displayName.localeCompare(b.displayName);
}); 

// yes ! we have colors !
let req = dav.request.propfind({
    props: [
        { name: 'displayname', namespace: 'DAV:' },
        { name: 'getctag', namespace: 'http://calendarserver.org/ns/' },
        { name: 'calendar-color', namespace: 'http://apple.com/ns/ical/' }        
    ],
    depth: 1    
});

let responses = await xhr.send(req, account.homeUrl);

console.log(responses);

let colors = {};

responses.forEach(response => {
    colors[response.props.getctag] = response.props.calendarColor ? response.props.calendarColor : 'white';
});   



app.get( '/calendars', async (req, res) => {
    //let cal = await client.fetchCalendars();
    let list = calendars.map(calendar => {
        return {
            id: calendar.ctag,
            name: calendar.displayName,
            color: colors[calendar.ctag],
            url: calendar.url
        }
    });


    //console.log(cal);

    res.json(list);
}); 

app.get( '/calendar/:id', (req, res) => {
    console.log(req.params.id);
    let calendar = calendars.find(calendar => calendar.ctag === req.params.id);

    res.json({
        id: calendar.ctag,
        name: calendar.displayName,
        color: colors[calendar.ctag],
        url: calendar.url
    });
});






/*****************************************************************************
 * This part is required for the express backend
 * **************************************************************************/
app.use(express.json());

app.use('/ui', express.static('ui'));
app.use('/scripts', express.static('scripts'));

app.listen(config.port, () => {
    console.log(`Open browser with address : http://localhost:${config.port}/ui/board.html`);
});
