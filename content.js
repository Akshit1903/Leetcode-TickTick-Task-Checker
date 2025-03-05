function observeSubmitButton() {
  const button = document.querySelector(
    '[data-e2e-locator="console-submit-button"]'
    // '[data-e2e-locator="console-run-button"]'
  );

  if (button) {
    console.log("Submit button found, attaching listener...");
    button.addEventListener("click", () => {
      console.log("Submit button clicked, notifying service worker...");
      chrome.runtime.sendMessage({ action: "leetcode_submit_clicked" });
    });
  } else {
    console.log("Submit button not found");
  }

  document.addEventListener("keydown", (event) => {
    if (event.ctrlKey && event.key === "Enter") {
      console.log("🚀 Ctrl + Enter detected!");

      // Send a message to the service worker
      chrome.runtime.sendMessage(
        { action: "leetcode_submit_clicked" },
        (response) => {
          console.log("✅ Message sent successfully!");
        }
      );
    }
  });
}

observeSubmitButton();
