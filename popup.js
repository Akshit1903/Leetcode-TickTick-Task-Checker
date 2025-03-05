const CLIENT_ID = chrome.runtime.getManifest().oauth2.client_id;
const CLIENT_SECRET = chrome.runtime.getManifest().oauth2.client_secret;
const REDIRECT_URI = `https://${chrome.runtime.id}.chromiumapp.org/`;
const AUTH_CODE_URL = `https://ticktick.com/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=tasks:read%20tasks:write&state=abc`;
const ACCESS_TOKEN_URL = "https://ticktick.com/oauth/token";
const AUTHORIZATION_CODE = "authorization_code";
const ACCESS_TOKEN = "access_token";

document.addEventListener("DOMContentLoaded", () => {
  const loginButton = document.getElementById("login");
  const codeDisplay = document.getElementById("code");
  const tokenDisplay = document.getElementById("token");
  const inputField = document.getElementById("accessTokenInput");

  // Load stored token on popup open
  chrome.storage.local.get([AUTHORIZATION_CODE, ACCESS_TOKEN], (data) => {
    if (data[AUTHORIZATION_CODE]) {
      codeDisplay.innerText = data[AUTHORIZATION_CODE];
    } else {
      codeDisplay.innerText = "No code stored.";
    }

    if (data.access_token) {
      tokenDisplay.innerText = data.access_token;
    } else {
      tokenDisplay.innerText = "No token stored.";
    }
  });
  inputField.addEventListener("input", () => {
    const accessToken = inputField.value;
    chrome.storage.local.set({ [ACCESS_TOKEN]: accessToken }, () => {
      tokenDisplay.innerText = accessToken;
    });
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
            "code"
          );
          if (authorizationCode) {
            chrome.storage.local.set(
              { [AUTHORIZATION_CODE]: authorizationCode },
              () => {
                code.innerText = authorizationCode;
                console.log("Code saved.");
              }
            );
            resolve(authorizationCode);
          } else {
            reject("Authorization code not found");
          }
        }
      );
    });
  }

  loginButton.addEventListener("click", getAuthorizationCode);
});
