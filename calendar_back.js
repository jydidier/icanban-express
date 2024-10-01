import tsdav from './tsdav.js';

const calendars = {
    query: async function () {
        if (client) {
            let cal = await client.fetchCalendars();
            console.log(cal);


        }
        return [];
    }, // is in fact without any filter
    get: function(id) {}, // get by id
    onCreated : new EventTarget(),
    onUpdated : new EventTarget(),
    onRemoved : new EventTarget()
}

const items = {
    get: function() {},
    query: function() {},
    create: function() {},
    update: function() {},
    move: function() {},
    remove: function() {},
    onCreated : new EventTarget(),
    onUpdated : new EventTarget(),
    onRemoved : new EventTarget()
}



class Calendar {
    id = '';
    name = '';
    type= '';
    url = '';
    readOnly = false;
    enabled = true;
    color = '';
    
    constructor() {}
}

class CalendarItem {
    id = '';
    calendarId = '';
    type = '';
    instance = '';
    format = '';
    item = '';

    constructor() {}
}

await calendars.query();

export { calendars, items, Calendar, CalendarItem };
