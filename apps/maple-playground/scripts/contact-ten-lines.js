const fullName = [salutation, firstName, lastName].filter((part) => part !== '').join(' ');
const openActivities = activities.filter((activity) => !activity.done);
const calls = openActivities.filter((activity) => activity.type === 'call').length;
const location = address.city + ' (' + address.country + ')';

let priority = 'low';
if (vip || score > 80) {
  priority = 'high';
} else if (openDeals > 0) {
  priority = 'medium';
}

return {
  name: fullName,
  location,
  open: openActivities.length,
  calls,
  priority
};
