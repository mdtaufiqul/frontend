const { fromZonedTime, formatInTimeZone } = require('date-fns-tz');
console.log('Imports successful!');
const date = new Date();
const timeZone = 'America/New_York';
console.log(formatInTimeZone(date, timeZone, 'yyyy-MM-dd HH:mm'));
console.log('fromZonedTime test:', fromZonedTime('2025-01-01 10:00', timeZone));
