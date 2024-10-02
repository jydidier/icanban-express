import dav from 'dav';
import ical from 'ical.js';
import express from 'express';
import process from 'node:process';
import open from 'open';

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
    loadObjects: true,
    filters: [
        {
            type: 'comp-filter',
            attrs: {name: 'VCALENDAR'},
            children: [
                {
                    type: 'comp-filter',
                    attrs: { name: 'VTODO' }
                }
            ]
        }   
    ]
});


let calendars = account.calendars.filter(calendar => {
    return calendar.components.includes('VTODO')
}).sort((a,b) => {
    return a.displayName.localeCompare(b.displayName);
}); 


let items = [];

calendars.forEach(calendar => {
    calendar.objects.forEach(object => {
        items.push({
            id : object.etag,
            calendarId : calendar.ctag,
            type: 'task',
            format: 'jcal',
            item: ical.parse(object.calendarData) // item must be in jcal format
        });
    });
});

let req = dav.request.propfind({
    props: [
        { name: 'displayname', namespace: 'DAV:' },
        { name: 'getctag', namespace: 'http://calendarserver.org/ns/' },
        { name: 'calendar-color', namespace: 'http://apple.com/ns/ical/' }        
    ],
    depth: 1    
});

let responses = await xhr.send(req, account.homeUrl);

let colors = {};

responses.forEach(response => {
    colors[response.props.getctag] = response.props.calendarColor ? response.props.calendarColor : 'white';
});   


app.get( '/calendars', async (req, res) => {
    let list = calendars.map(calendar => {
        return {
            id: calendar.ctag,
            name: calendar.displayName,
            color: colors[calendar.ctag],
            url: calendar.url
        }
    });
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

app.get( '/items', (req, res) => {
    res.json(items);
});

app.get( '/item/:cid/:id', (req, res) => {
    let item = items.find(item => item.id === req.params.id && item.calendarId === req.params.cid);
    res.json(item);
});

/*****************************************************************************
 * This part is required for the express backend
 * **************************************************************************/
app.use(express.json());

app.use('/ui', express.static('ui'));
app.use('/scripts', express.static('scripts'));

app.listen(config.port, () => {
    console.log(`Server started on http://localhost:${config.port}`);
    open(`http://localhost:${config.port}/ui/board.html`);
});
