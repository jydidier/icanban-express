import tsdav from 'tsdav';
import ical from 'ical.js';
import express from 'express';
import process from 'node:process';
import open from 'open';
import bodyParser from 'body-parser';
import * as uuid from 'uuid';
import * as JCAL from './scripts/jcal.js';

let cdefault = {};

if (process.argv.length > 2) {
    cdefault = await import(process.argv[2], { with: { type: "json" } });
} else {
    cdefault = await import('./config.json', { with: { type: "json" } });
}

const config = cdefault.default;

const app = express();
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

/*****************************************************************************
 * This part is dedicated to calendar management
 * **************************************************************************/
const client = new tsdav.DAVClient(config.server);
let dirty = true;

try {
    await client.login();
} catch (err) {
    client.account = {
        headers: client.authHeaders,
        rootUrl: config.server.serverUrl,
        principalUrl: config.server.serverUrl,
        homeUrl: config.server.serverUrl,
        accountType: client.accountType
    };
}

let calendars = [];
let items = new Map();

async function updateCalendars() {
    items.clear();
    console.log('updating calendars');
    let allCalendars = await client.fetchCalendars();

    calendars = allCalendars.filter(calendar => {
        return calendar.components.includes('VTODO')
    }).sort((a,b) => {
        return a.displayName.localeCompare(b.displayName);
    }); 

    calendars.forEach(async calendar => {
        let objects = await client.fetchCalendarObjects({ calendar: calendar });
        objects.forEach(object => {
            //console.log(object);
            let item = ical.parse(object.data);
            let jcal = new JCAL.Calendar(item);
            let todo = jcal.first('vtodo');
            //console.log(todo.data);
            items.set(todo.uid, {
                id : todo.uid,//object.etag.replaceAll('"',''),
                calendarId : calendar.ctag,
                type: 'task',
                format: 'jcal',
                item: item,
                data : object
                // in calendar.props we have also the calendarTimezone property 
                // that could be used
                // item must be in jcal format
            });
        });
    });
    dirty = false;
}

//await updateCalendars();

app.get( '/calendars', async (req, res) => {
    if (dirty) await updateCalendars();

    let list = calendars.map(calendar => {
        return {
            id: calendar.ctag,
            name: calendar.displayName,
            color: calendar.calendarColor,
            url: calendar.url
        }
    });
    res.json(list);
}); 

app.get( '/calendars/:id', (req, res) => {
    if (dirty) await updateCalendars();
    let calendar = calendars.find(calendar => calendar.ctag === req.params.id);

    res.json({
        id: calendar.ctag,
        name: calendar.displayName,
        color: calendar.calendarColor,
        url: calendar.url
    });
});

app.get( '/items', (req, res) => {
    //console.log(Array.from(items.values()));
    if (dirty) await updateCalendars();
    res.json(Array.from(items.values()));
});

app.get( '/items/:cid/:id', (req, res) => {
    if (dirty) await updateCalendars();
    let item = items.get(req.params.id);
    if (!item) {
        res.status(404).end();
    }

    if (item.calendarId !== req.params.cid) {
        res.status(404).end();
    }
    res.json(item);
});

app.post('/items/:cid', async (req, res) => {
    dirty = true;
    let calendar = calendars.find(calendar => calendar.ctag === req.params.cid);
    if (calendar) {
        let jCalendar = JCAL.Calendar.default();
        jCalendar.version = "2.0";
        jCalendar.prodid = "-//icanban.org/icanban-express v1.0//EN";
        let jTodo = new JCAL.Todo(req.body.item);
        jCalendar.addComponent(jTodo);
        jTodo.uid = jTodo.uid || uuid.v1();
        jTodo.dtstamp = (new Date()).toISOString(); 

        let pushObject = {
            calendar: calendar, 
            filename: `${jTodo.uid}.ics`,
            iCalString : ical.stringify(jCalendar.data),
            fetchOptions : { mode: 'no-cors' }
        };
        await client.createCalendarObject(pushObject);
        await updateCalendars();        
        res.status(200).end();
    } else {
        res.status(404).end();
    }
    res.status(200).end();
});

app.put("/items/move/:cid/:newcid/:id", async (req, res) => {
    dirty = true;
    let item = items.get(req.params.id);
    if (!item) {
        res.status(404).end();
        return;
    }
    if (item.calendarId !== req.params.cid) {
        res.status(404).end();
        return;
    }

    let objectToRemove = item.data;
    let jCalendar = new JCAL.Calendar(item.data);
    let jTodo = jCalendar.first("vtodo");

    if (objectToRemove) {
        await client.deleteCalendarObject({calendarObject: objectToRemove});
    } 

    let calendar = calendars.find(calendar => calendar.ctag === req.params.newcid);
 
    let pushObject = {
        calendar: calendar, 
        filename: `${jTodo.uid}.ics`,
        iCalString : ical.stringify(item.data),
        fetchOptions : { mode: 'no-cors' }
    };
    await client.createCalendarObject(pushObject);
    await updateCalendars();        
    res.status(200).end();
});


app.put("/items/:cid/:id", async (req, res) => {
    dirty = true;
    let item = items.get(req.params.id);
    if (!item) {
        res.status(404).end();
        return;
    }
    if (item.calendarId !== req.params.cid) {
        res.status(404).end();
        return ;
    }

    Object.assign(item.item, req.body.item);

    let pushObject = {
        calendarObject: {
            url : item.url,
            data : ical.stringify(jCalendar.data),
            etag : item.etag
        }
    }

    await client.updateCalendarObject(pushObject);
    await updateCalendars();        
    res.status(200).end();
});

app.delete('/items/:cid/:id', async (req, res) => {
    dirty = true;
    let item = items.get(req.params.id);
    if (!item) {
        res.status(404).end();
        return;
    }

    if (item.calendarId !== req.params.cid) {
        res.status(404).end();
        return;
    }

    let objectToRemove = item.data;

    if (objectToRemove) {
        await client.deleteCalendarObject({calendarObject: objectToRemove});
        await updateCalendars();
        res.status(200).end();
        return;
    } 
    res.status(404).end();
});

/*****************************************************************************
 * This part is required for the express backend
 * **************************************************************************/

app.use('/ui', express.static('ui'));
app.use('/scripts', express.static('scripts'));

app.listen(config.port, () => {
    console.log(`Server started on http://localhost:${config.port}`);
    open(`http://localhost:${config.port}/ui/board.html`);
});
