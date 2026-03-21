function observeSubmitButton() {
  const button = document.querySelector(
    '[data-e2e-locator="console-submit-button"]',
    // '[data-e2e-locator="console-run-button"]',
  );

  if (button) {
    console.log("Submit button found, attaching listener...");
    button.addEventListener("click", async () => {
      console.log("Submit button clicked, notifying service worker...");
      // chrome.runtime.sendMessage({ action: "leetcode_submit_clicked" });
      await triggerWorkflow();
    });
  } else {
    console.log("Submit button not found");
  }

  document.addEventListener("keydown", async (event) => {
    if (event.ctrlKey && event.key === "Enter") {
      console.log("🚀 Ctrl + Enter detected!");
      await triggerWorkflow();
    }
  });
}

const TICK_TICK_AUTHORIZATION_CODE_KEY = "ticktick_authorization_code";
const TICK_TICK_ACCESS_TOKEN_KEY = "TICK_TICK_ACCESS_TOKEN";
const TODOIST_ACCESS_TOKEN_KEY = "TODOIST_ACCESS_TOKEN";

let ticktickAccessToken = "";
let todoistAccessToken = "";
const projectId = "66ee25eceba6f70000000163";
const leetcodeTaskTitle = "Leetcode Daily";

async function parseReadableStream(response) {
  const reader = response.body.getReader(); // Get the stream reader
  const decoder = new TextDecoder(); // To convert bytes to text
  let res = "";
  function readStream({ done, value }) {
    if (done) {
      return;
    }
    res += decoder.decode(value, { stream: true }); // Decode chunk
    return reader.read().then(readStream); // Read next chunk
  }
  await reader.read().then(readStream);
  return JSON.parse(res);
}

async function markTickTickTaskAsCompleted(taskId) {
  const myHeaders = new Headers();
  myHeaders.append("Authorization", ticktickAccessToken);

  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    redirect: "follow",
  };
  try {
    return await fetch(
      `https://api.ticktick.com/open/v1/project/${projectId}/task/${taskId}/complete`,
      requestOptions,
    );
  } catch (e) {
    console.log(e);
  }
}

async function markTodoistTaskAsCompleted(taskId) {
  const myHeaders = new Headers();
  myHeaders.append("Authorization", todoistAccessToken);

  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    redirect: "follow",
  };

  try {
    const response = await fetch(
      `https://api.todoist.com/api/v1/tasks/${taskId}/close`,
      requestOptions,
    );

    return response;
  } catch (e) {
    return e;
  }
}

async function getFormattedTodaysDate() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

async function getFormattedTomorrowsDate() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const now = new Date();
  now.setDate(now.getDate() + 1);
  return formatter.format(now);
}

async function markDueDateOfTodoistTaskAsToday(taskId, formattedDate) {
  const myHeaders = new Headers();
  myHeaders.append("Authorization", todoistAccessToken);
  myHeaders.append("Content-Type", "application/json");

  const body = {
    due_string: `${formattedDate}, Everyday`,
  };
  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    redirect: "follow",
    body: JSON.stringify(body),
  };

  try {
    const response = await fetch(
      `https://api.todoist.com/api/v1/tasks/${taskId}`,
      requestOptions,
    );
    return await parseReadableStream(response);
  } catch (e) {
    console.error(e);
  }
}

async function getTickTickTasks() {
  const myHeaders = new Headers();
  myHeaders.append("Authorization", ticktickAccessToken);

  const requestOptions = {
    method: "GET",
    headers: myHeaders,
    redirect: "follow",
  };

  try {
    const response = await fetch(
      `https://api.ticktick.com/open/v1/project/${projectId}/data`,
      requestOptions,
    );

    return await parseReadableStream(response);
  } catch (e) {
    console.error(e);
  }
}

async function getAllTodoIstStudyTasks() {
  const myHeaders = new Headers();
  myHeaders.append("Authorization", todoistAccessToken);

  const requestOptions = {
    method: "GET",
    headers: myHeaders,
    redirect: "follow",
  };

  try {
    const response = await fetch(
      `https://api.todoist.com/api/v1/tasks?project_id=6fx7VP9x6M6Jvv62`,
      requestOptions,
    );
    const resJson = await parseReadableStream(response);
    return resJson["results"];
  } catch (e) {
    console.error(e);
  }
}

async function getLeetCodeTickTickTask() {
  const projectDetails = await getTickTickTasks();

  let res = {};
  const currTime = new Date().getTime();
  projectDetails.tasks.forEach((task) => {
    const taskStartDate = new Date(task.dueDate);
    taskStartDate.setHours(taskStartDate.getHours() + 5);
    const taskDueDate = new Date(task.dueDate);
    taskDueDate.setHours(taskDueDate.getHours() + 29);
    if (
      String(task.title) == leetcodeTaskTitle &&
      taskStartDate.getTime() < currTime &&
      currTime < taskDueDate.getTime()
    ) {
      res = task;
    }
  });
  return res;
}

async function getLeetCodeTodoIstTask() {
  const allStudyTasks = await getAllTodoIstStudyTasks();
  for (const task of allStudyTasks) {
    if (task.content === "Leetcode Daily") {
      return task;
    }
  }
}

const isLateNight = () => {
  // Get current time in India (IST) as a string
  const indiaTimeStr = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());

  // Convert "HH:mm" to a numerical value for easy comparison
  // Example: "05:15" becomes 5.25 or just use string comparison for simplicity
  const [hours, minutes] = indiaTimeStr.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes;

  const start = 0; // 12:00 AM in minutes
  const end = 5 * 60 + 30; // 05:30 AM in minutes

  return totalMinutes >= start && totalMinutes <= end;
};

async function getFormattedYesterdaysDate() {
  const today = new Date();
  // Subtract 24 hours worth of milliseconds
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(yesterday);
}

async function markLeetCodeDailyTaskDone() {
  // TickTick Logic
  // const tickTickLeetcodeTask = await getLeetCodeTickTickTask();
  // await markTickTickTaskAsCompleted(tickTickLeetcodeTask.id);

  // TodoIst Logic
  const todoistLeetcodeTask = await getLeetCodeTodoIstTask();
  console.log(todoistLeetcodeTask);

  const taskDueDate = todoistLeetcodeTask?.due?.date;

  console.log(isLateNight());
  console.log(taskDueDate === (await getFormattedYesterdaysDate()));

  if (isLateNight()) {
    const responseBody = await markDueDateOfTodoistTaskAsToday(
      todoistLeetcodeTask.id,
      await getFormattedTodaysDate(),
    );
    console.log(responseBody);
  } else {
    // const responseBody = await markTodoistTaskAsCompleted(
    //   todoistLeetcodeTask.id,
    // );
    // const responseStatus = responseBody.status;
    // if (responseStatus === 204) {
    //   console.log("Updation Successful");
    // } else if (responseStatus === 400) {
    //   console.log("Error Occured from TodoIst");
    //   console.error(responseStatus);
    // } else {
    //   console.log("Case Misunderstood");
    //   console.log(responseBody);
    // }
    const responseBody = await markDueDateOfTodoistTaskAsToday(
      todoistLeetcodeTask.id,
      await getFormattedTomorrowsDate(),
    );
  }
}

async function getDailyQuestionDetails() {
  const query = `
  query getDailyProblem {
    activeDailyCodingChallengeQuestion {
        date
        link
        question {
            questionId
            questionFrontendId
            boundTopicId
            title
            titleSlug
            content
            translatedTitle
            translatedContent
            isPaidOnly
            difficulty
            likes
            dislikes
            isLiked
            similarQuestions
            exampleTestcases
            contributors {
                username
                profileUrl
                avatarUrl
            }
            topicTags {
                name
                slug
                translatedName
            }
            companyTagStats
            codeSnippets {
                lang
                langSlug
                code
            }
            stats
            hints
            solution {
                id
                canSeeDetail
                paidOnly
                hasVideoSolution
                paidOnlyVideo
            }
            status
            sampleTestCase
            metaData
            judgerAvailable
            judgeType
            mysqlSchemas
            enableRunCode
            enableTestMode
            enableDebugger
            envInfo
            libraryUrl
            adminUrl
            challengeQuestion {
                id
                date
                incompleteChallengeCount
                streakCount
                type
            }
            note
        }
    }
}`;
  const response = await fetch("https://leetcode.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Referer: "https://leetcode.com",
    },
    body: JSON.stringify({
      query,
      variables: {}, // No variables needed for this query
    }),
  });

  const result = await response.json();
  return result["data"]["activeDailyCodingChallengeQuestion"];
}

async function getRecentSubmissions(username, limit) {
  const query = `
query getRecentSubmissions($username: String!, $limit: Int) {
    recentSubmissionList(username: $username, limit: $limit) {
        title
        titleSlug
        timestamp
        statusDisplay
        lang
    }
}`;
  const response = await fetch("https://leetcode.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Referer: "https://leetcode.com",
    },
    body: JSON.stringify({
      query,
      variables: {
        username,
        limit,
      },
    }),
  });

  const result = await response.json();
  return result.data;
}

async function getLastSubmission() {
  return await getRecentSubmissions("akshit19", 1);
}

async function isLeetCodeQuestionDone() {
  const dailyQuestionDetails = await getDailyQuestionDetails();
  let lastSubmission = await getLastSubmission();
  lastSubmission = lastSubmission.recentSubmissionList[0];
  console.log("Last Submission Status:", lastSubmission.statusDisplay);

  return (
    dailyQuestionDetails.question.titleSlug === lastSubmission.titleSlug &&
    (lastSubmission.statusDisplay === "Accepted" ||
      lastSubmission.statusDisplay === "Internal Error")
  );
}

let triggerWorkflow = async (message, sender, sendResponse) => {
  console.log("🚀 LeetCode submit button clicked!");
  if (await isLeetCodeQuestionDone()) {
    console.log("Question accepted, marking today as done");
    await markLeetCodeDailyTaskDone();
  } else {
    console.log("Isn't done correctly, doing nothing");
  }
};

chrome.storage.local.get(
  [TICK_TICK_ACCESS_TOKEN_KEY, TODOIST_ACCESS_TOKEN_KEY],
  async (data) => {
    ticktickAccessToken = "Bearer " + data[TICK_TICK_ACCESS_TOKEN_KEY];
    todoistAccessToken = "Bearer " + data[TODOIST_ACCESS_TOKEN_KEY];
    observeSubmitButton();
  },
);
