// this is the front part of our calendar
// we must export a calendar object

const calendars = new EventTarget();
calendars.query = async function() { 
    let url = location.origin + '/calendars';
    let response = await fetch(url);
    let calendars = await response.json();
    return calendars;
}; // is in fact without any filter
calendars.get = async function(id) {
    let url = `${location.origin}/calendars/${id}`;
    let response = await fetch(url);
    let calendar = await response.json();
    return calendar ;
}; // get by id
  
const items = new EventTarget();
items.get = async function(calendarId, id) {
    let url = `${location.origin}/items/${calendarId}/${id}`;
    let response = await fetch(url);
    let item = await response.json();
    return item ;
};
items.query = async function() {
    let url = location.origin + '/items';
    let response = await fetch(url);
    let items = await response.json();
    return items;
};
items.create = async function(calendarId, item) {
    let url = `${location.origin}/items/${calendarId}`;
    let response = await fetch(url, {
        method: 'POST', 
        body: JSON.stringify(item),
        headers: {"Content-Type": "application/json"}
    });
    calendars.dispatchEvent(new Event('updated'));
};
items.update = async function(calendarId,id,data) {
    let url = `${location.origin}/items/${calendarId}/${id}`;
    let response = await fetch(url, {
        method: 'PUT',
        body: JSON.stringify(data),
        headers: {"Content-Type": "application/json"}
    });
    calendars.dispatchEvent(new Event('updated'));
};
items.move = async function(cid, newcid, id) {
    let url = `${location.origin}/items/move/${cid}/${newcid}/${id}`;
    let response = await fetch(url, {
        method: 'PUT'
    });
    calendars.dispatchEvent(new Event('updated'));
};
items.remove = async function(cid, id) {
    console.log('trying to remove', id);
    let url = `${location.origin}/items/${cid}/${id}`;
    let response = await fetch(url, { method: 'DELETE'});
    calendars.dispatchEvent(new Event('updated'));
};

export { calendars, items };
