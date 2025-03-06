function observeSubmitButton() {
  const button = document.querySelector(
    '[data-e2e-locator="console-submit-button"]'
    // '[data-e2e-locator="console-run-button"]'
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

      // Send a message to the service worker
      // chrome.runtime.sendMessage(
      //   { action: "leetcode_submit_clicked" },
      //   (response) => {
      //     console.log("✅ Message sent successfully!");
      //   }
      // );
      await triggerWorkflow();
    }
  });
}

const AUTHORIZATION_CODE = "AUTHORIZATION_CODE";
const ACCESS_TOKEN = "ACCESS_TOKEN";
let accessToken = "";
const projectId = "66b3db7ac71c7100000000cd";
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

async function maskTaskAsCompleted(taskId) {
  const myHeaders = new Headers();
  myHeaders.append("Authorization", accessToken);

  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    redirect: "follow",
  };
  try {
    return await fetch(
      `https://api.ticktick.com/open/v1/project/${projectId}/task/${taskId}/complete`,
      requestOptions
    );
  } catch (e) {
    console.log(e);
  }
}

async function getProjectDetails() {
  const myHeaders = new Headers();
  myHeaders.append("Authorization", accessToken);

  const requestOptions = {
    method: "GET",
    headers: myHeaders,
    redirect: "follow",
  };

  try {
    const response = await fetch(
      `https://api.ticktick.com/open/v1/project/${projectId}/data`,
      requestOptions
    );

    return await parseReadableStream(response);
  } catch (e) {
    console.error(e);
  }
}

async function getLeetCodeTask() {
  const projectDetails = await getProjectDetails();

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

async function markLeetCodeDailyTaskDone() {
  const leetcodeTask = await getLeetCodeTask();
  return await maskTaskAsCompleted(leetcodeTask.id);
}

async function getDailyQuestionDetails() {
  const requestOptions = {
    method: "GET",
    redirect: "follow",
  };
  try {
    const response = await fetch(
      "https://alfa-leetcode-api.onrender.com/daily",
      requestOptions
    );
    return await parseReadableStream(response);
  } catch (e) {
    console.log(e);
  }
}

async function getLastSubmission() {
  const requestOptions = {
    method: "GET",
    redirect: "follow",
  };

  try {
    const response = await fetch(
      "https://alfa-leetcode-api.onrender.com/akshit19/submission?limit=1",
      requestOptions
    );
    return await parseReadableStream(response);
  } catch (e) {
    console.log(e);
  }
}

async function isLeetCodeQuestionDone() {
  const dailyQuestionDetails = await getDailyQuestionDetails();
  let lastSubmission = await getLastSubmission();
  lastSubmission = lastSubmission.submission[0];
  console.log("Last Submission Status:", lastSubmission.statusDisplay);

  return (
    dailyQuestionDetails.titleSlug === lastSubmission.titleSlug &&
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

chrome.storage.local.get("access_token", async (data) => {
  accessToken = "Bearer " + data.access_token;
  observeSubmitButton();
});
