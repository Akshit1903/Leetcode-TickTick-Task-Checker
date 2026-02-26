var CLIENT_ID = chrome.runtime.getManifest().oauth2.client_id;
var CLIENT_SECRET = chrome.runtime.getManifest().oauth2.client_secret;
var REDIRECT_URI = `https://${chrome.runtime.id}.chromiumapp.org/`;
var AUTH_CODE_URL = `https://ticktick.com/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=tasks:read%20tasks:write&state=abc`;
var ACCESS_TOKEN_URL = "https://ticktick.com/oauth/token";

const TICK_TICK_AUTHORIZATION_CODE_KEY = "ticktick_authorization_code";
const TICK_TICK_ACCESS_TOKEN_KEY = "TICK_TICK_ACCESS_TOKEN";
const TODOIST_ACCESS_TOKEN_KEY = "TODOIST_ACCESS_TOKEN";

document.addEventListener("DOMContentLoaded", () => {
  const loginButton = document.getElementById("login");
  const codeDisplay = document.getElementById("code");
  const ticktickInputField = document.getElementById(
    "ticktickAccessTokenInput",
  );
  const ticktickTokenDisplay = document.getElementById("ticktick_token");
  const todoIstInputField = document.getElementById("todoistAccessTokenInput");
  const todoIstTokenDisplay = document.getElementById("todoist_token");

  // Load stored token on popup open
  chrome.storage.local.get(
    [
      TICK_TICK_AUTHORIZATION_CODE_KEY,
      TICK_TICK_ACCESS_TOKEN_KEY,
      TODOIST_ACCESS_TOKEN_KEY,
    ],
    (data) => {
      if (data[TICK_TICK_AUTHORIZATION_CODE_KEY]) {
        codeDisplay.innerText = data[TICK_TICK_AUTHORIZATION_CODE_KEY];
      } else {
        codeDisplay.innerText = "No code stored.";
      }

      if (data[TICK_TICK_ACCESS_TOKEN_KEY]) {
        ticktickTokenDisplay.innerText = data[TICK_TICK_ACCESS_TOKEN_KEY];
      } else {
        ticktickTokenDisplay.innerText = "No token stored.";
      }

      if (data[TODOIST_ACCESS_TOKEN_KEY]) {
        todoIstTokenDisplay.innerText = data[TODOIST_ACCESS_TOKEN_KEY];
      } else {
        todoIstTokenDisplay.innerText = "No token stored.";
      }
    },
  );

  ticktickInputField.addEventListener("input", () => {
    const accessToken = ticktickInputField.value;
    chrome.storage.local.set(
      { [TICK_TICK_ACCESS_TOKEN_KEY]: accessToken },
      () => {
        ticktickTokenDisplay.innerText = accessToken;
      },
    );
  });

  todoIstInputField.addEventListener("input", () => {
    const accessToken = todoIstInputField.value;
    chrome.storage.local.set(
      { [TODOIST_ACCESS_TOKEN_KEY]: accessToken },
      () => {
        todoIstTokenDisplay.innerText = accessToken;
      },
    );
  });

  function getAuthorizationCode() {
    return new Promise((resolve, reject) => {
      console.log("Starting getAuthorizationCode");
      chrome.identity.launchWebAuthFlow(
        {
          url: AUTH_CODE_URL,
          interactive: true,
        },
        (redirectUrl) => {
          if (chrome.runtime.lastError || !redirectUrl) {
            return reject("Authentication failed: getAuthorizationCode");
          }
          const authorizationCode = new URL(redirectUrl).searchParams.get(
            "code",
          );
          if (authorizationCode) {
            chrome.storage.local.set(
              { [TICK_TICK_AUTHORIZATION_CODE_KEY]: authorizationCode },
              () => {
                code.innerText = authorizationCode;
                console.log("Code saved.");
              },
            );
            resolve(authorizationCode);
          } else {
            reject("Authorization code not found");
          }
        },
      );
    });
  }

  loginButton.addEventListener("click", getAuthorizationCode);
});
