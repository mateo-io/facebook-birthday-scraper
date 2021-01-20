chrome.extension.sendMessage({}, function (response) {
  var readyStateCheckInterval = setInterval(function () {
    if (document.readyState === "complete") {
      clearInterval(readyStateCheckInterval);

      // ----------------------------------------------------------
      // This part of the script triggers when page is done loading
      birthdayScraper();
    }
  }, 10);
});

const ROOT_SELECTOR = `#events_dashboard_calendar_container > div > div`;
let BUFFER_TIME = 1000;

// first step is getting the root components
const birthdayScraper = async () => {
  console.log(`birthdayScraper starts running`);

  const allMonths = [];

  /**
   * The process here is quite simple.
   *
   * We get the next month, add its contents to the array.
   *
   * Check if allMonths.length == 12 - if yes then our work here is done.
   *
   * If allMonths.length < 12 then we save the current month, we scroll to bottom and we point the selector to the next node
   */

  //  const processMonth = throttle(getMonthBirthdayData, SCROLL_INTERVAL)

  let currentSelector = ROOT_SELECTOR;

  const executeLoop = () => {
    let articleTag = $.find(`${currentSelector} > article`);
    let monthNode = articleTag[0];

    if (!monthNode) {
      // this means the next month has not loaded so we double the buffer time and try again
      scrollToBottom();
      BUFFER_TIME = BUFFER_TIME * 2;
      setTimeout(() => executeLoop(), BUFFER_TIME);
      return;
    }

    console.log(`birthdayScraper getting month number ${allMonths.length}`);

    allMonths.push(monthNode.innerText);
    currentSelector = `${currentSelector} > div`;
    scrollToBottom();

    // TODO
    if (allMonths.length < 1) {
      setTimeout(() => executeLoop(), BUFFER_TIME);
    } else {
      processData(allMonths);
    }
  };

  // this triggers the first execution of the process
  setTimeout(() => executeLoop(), BUFFER_TIME);
};

const processData = (allMonthsData) => {
  console.log(`birthdayScraper processData start`);
  const allDataHolder = {};

  allMonthsData.map((monthDataString) => {
    const monthName = getFirstLine(monthDataString);
    console.log(`birthdayScraper processing:${monthName}`);

    /**
     * Huge string in the form of
     *
     * \n
     * Mateo Mejia
     * \n
     * Sunday, 12 de febrero del 2021
     * \n
     */
    const restOfData = monthDataString
      .substring(monthName.length, undefined)
      .trim();

    const currentMonthBirthdays = [];

    const dataWithoutNewLines = restOfData
      .split("\n")
      .map((line) => {
        if (line == "\n" || line == "") {
          return null;
        }

        return line;
      })
      .filter((line) => line);

    let name = "";
    let birthday = "";

    /**
     * Data in the form of:
     *
     * Mateo M
     * Sunday, June 20 of 2021
     * Write on mateo's wall <---- we ignore this one based on indexes
     */
    dataWithoutNewLines.forEach((line, i) => {
      let index = i + 1;

      // the first line to be read is the name
      if (name == "") {
        name = line;
        return;
      }
      // base case for when we have both the name and the birthday
      if (name != "" && birthday != "") {
        currentMonthBirthdays.push({ name, birthday });

        name = "";
        birthday = "";
      }

      if (index % 3 == 0) {
        // this is the "Write on the wall of John Doe" text that we should remove
        return;
      }

      // else
      birthday = line;
    });

    console.log(`processed:${monthName}`);
    allDataHolder[monthName] = currentMonthBirthdays;
  });

  console.log(`processedAllData`);
  decideSaveFormat(allDataHolder);
};

const decideSaveFormat = (objectToBeSaved) => {
  chrome.storage.local.get("isBirthdayDataCsv", (isCsvObject) => {
    const isCsv = !!parseInt(isCsvObject["isBirthdayDataCsv"]);

    saveData(objectToBeSaved, isCsv);
  });
};

const saveData = (objectToBeSaved, isCsv) => {
  console.log(`birthdayScraper save data`);

  let dataToBeSaved;
  let extension = isCsv ? "csv" : "json";
  const rows = [];

  if (isCsv) {
    Object.keys(objectToBeSaved).forEach((month) => {
      monthData = objectToBeSaved[month];
      rows.push(monthData);
    });

    console.log(`rows:${JSON.stringify(rows)}`);

    const flattenedRows = rows.reduce((a, b) => a.concat(b), []);

    dataToBeSaved = `data:text/csv;charset=utf-8,${flattenedRows
      .map(
        (birthdayObject) =>
          `${birthdayObject["name"]}, ${birthdayObject["birthday"]}`
      )
      .join("\n")}`;
    extension = "csv";
  } else {
    // json
    dataToBeSaved = JSON.stringify(objectToBeSaved, null, 4); //indentation in json format, human readable
  }

  const vLink = document.createElement("a");
  const vBlob = new Blob([dataToBeSaved], { type: "octet/stream" });
  const vData = encodeURI(dataToBeSaved);
  const vName = `facebook_friends_birthday_data.${extension}`;
  const vUrl = window.URL.createObjectURL(vBlob);
  document.body.appendChild(vLink);
  if (isCsv) {
    vLink.setAttribute("href", vData);
  } else {
    vLink.setAttribute("href", vUrl);
  }
  vLink.setAttribute("download", vName);
  vLink.click();
};

/**
 *
 * Start Helpers
 */
const isElementFound = (element) => {
  if (element && element.length == 1) {
    return true;
  }

  return false;
};

const getElement = (selector) => {
  return $.find(selector);
};

const scrollToBottom = () => window.scrollTo(0, document.body.scrollHeight);

function throttle(func, timeFrame) {
  var lastTime = 0;
  return function () {
    var now = new Date();
    if (now - lastTime >= timeFrame) {
      func();
      lastTime = now;
    }
  };
}

function getFirstLine(text) {
  var index = text.indexOf("\n");
  if (index === -1) index = undefined;
  return text.substring(0, index);
}

/**
 * End Helpers
 */
