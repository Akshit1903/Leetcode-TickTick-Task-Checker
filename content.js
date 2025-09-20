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

async function markTaskAsCompleted(taskId) {
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
  return await markTaskAsCompleted(leetcodeTask.id);
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
    lastSubmission.statusDisplay === "Accepted"
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
