// oxlint-disable eslint/object-shorthand, unicorn/no-array-sort -- ES5 for js-interpreter, which has neither shorthand properties nor toSorted
// Summarises a contact for a CRM side panel: identity, activity statistics, a lead score and
// the custom fields that are still empty. Written in ES5, so js-interpreter can run it too
var today = new Date('2026-10-21');
var DAY = 24 * 60 * 60 * 1000;

var fullName = [salutation, title, firstName, middleName, lastName]
  .filter(function (part) {
    return typeof part === 'string' && part.trim() !== '';
  })
  .join(' ');
var initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
var at = email.indexOf('@');
var emailDomain = at === -1 ? null : email.slice(at + 1);
var location = [address.zip, address.city, address.country].filter(Boolean).join(', ');

var byType = {};
var byMonth = {};
var lastActivity = null;
var overdue = 0;

for (var index = 0; index < activities.length; index++) {
  var activity = activities[index];
  var stats = byType[activity.type] || { total: 0, done: 0 };
  stats.total += 1;
  if (activity.done) {
    stats.done += 1;
  }
  byType[activity.type] = stats;

  var month = activity.date.slice(0, 7);
  byMonth[month] = (byMonth[month] || 0) + 1;

  var date = new Date(activity.date);
  if (!activity.done && date < today) {
    overdue += 1;
  }
  if (activity.done && (lastActivity === null || date > new Date(lastActivity.date))) {
    lastActivity = activity;
  }
}

var daysSinceContact =
  lastActivity === null
    ? null
    : Math.floor((today.getTime() - new Date(lastActivity.date).getTime()) / DAY);
var busiestMonths = Object.keys(byMonth)
  .map(function (key) {
    return { month: key, count: byMonth[key] };
  })
  .sort(function (a, b) {
    return b.count - a.count;
  })
  .slice(0, 3);
var activityTypes = Object.keys(byType)
  .map(function (type) {
    var entry = byType[type];
    return {
      type: type,
      total: entry.total,
      done: entry.done,
      rate: Math.round((entry.done / entry.total) * 100)
    };
  })
  .sort(function (a, b) {
    return b.total - a.total;
  });

var leadScore = score;
if (vip) {
  leadScore += 20;
}
if (wonDeals > lostDeals) {
  leadScore += 10;
}
leadScore += 5 * openDeals;
if (daysSinceContact !== null && daysSinceContact > 90) {
  leadScore -= 15;
}
if (overdue > 10) {
  leadScore -= 10;
}
leadScore = Math.max(0, Math.min(100, leadScore));
var tier = leadScore >= 80 ? 'hot' : leadScore >= 50 ? 'warm' : 'cold';

var customKeys = Object.keys(customFields);
var emptyFields = customKeys.filter(function (key) {
  var value = customFields[key];
  return value === null || value === '';
});

var tagList = tags
  .split(',')
  .map(function (tag) {
    return tag.trim();
  })
  .filter(function (tag) {
    return tag.length > 0;
  });

var reachable = !doNotCall && /^\+?[\d\s]+$/.test(mobile || phone);

return {
  fullName: fullName,
  initials: initials,
  company: company + ' · ' + department,
  emailDomain: emailDomain,
  location: location,
  tags: tagList,
  reachable: reachable,
  activity: {
    total: activities.length,
    overdue: overdue,
    daysSinceContact: daysSinceContact,
    busiestMonths: busiestMonths,
    types: activityTypes
  },
  lead: { score: leadScore, tier: tier, revenue: revenue.toFixed(2) + ' ' + currency },
  customFields: { total: customKeys.length, empty: emptyFields.length }
};
