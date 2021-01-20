$("#getBirthdays").click((element) => {
  console.log(`birthdayScraper click`);
  var newURL = "https://m.facebook.com/events/calendar/birthdays/";
  chrome.tabs.create({ url: newURL });
});

$("#json").click(() => {
  chrome.storage.local.set({ isBirthdayDataCsv: "0" });
});

$("#csv").click(() => {
  chrome.storage.local.set({ isBirthdayDataCsv: "1" });
});
