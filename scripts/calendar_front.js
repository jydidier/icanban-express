// this is the front part of our calendar
// we must export a calendar object

const calendars = new EventTarget();
calendars.query = async function() {
    let url = location.origin + '/calendars';
    let response = await fetch(url);
    let calendars = await response.json();
    //console.log(calendars);
    return calendars;
}; // is in fact without any filter

calendars.get = async function(id) {
    let url = `${location.origin}/calendars/${id}`;
    let response = await fetch(url);
    let calendar = await response.json();
    //console.log(calendar);
    return calendar ;
}; // get by id
  
// onCreated : new EventTarget(),
//     onUpdated : new EventTarget(),
//     onRemoved : new EventTarget()
// }

const items = new EventTarget();
items.get = async function(calendarId, id) {
    let url = `${location.origin}/items/${calendarId}/${id}`;
    let response = await fetch(url);
    let item = await response.json();
    //console.log(item);
    return item ;
};
items.query = async function() {
    let url = location.origin + '/items';
    let response = await fetch(url);
    let items = await response.json();
    //console.log(items);
    return items;
};
items.create = function() {};
items.update = function() {};
items.move = function() {};
items.remove = async function(cid, id) {
    console.log('trying to remove', id);
    let url = `${location.origin}/items/${cid}/${id}`;
    let response = await fetch(url, { method: 'DELETE'});
    console.log(response.status);
    calendars.dispatchEvent(new Event('updated'));
    return ;
};
//     onCreated : new EventTarget(),
//     onUpdated : new EventTarget(),
//     onRemoved : new EventTarget()

export { calendars, items };