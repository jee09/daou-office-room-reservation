chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message received in background:", message);

  if (message.type === "RESERVATION_SUCCESS") {
    console.log("Reservation success:", message.message);
    sendResponse({ status: "success" });
  } else if (message.type === "RESERVATION_COMPLETE") {
    console.log("Reservation complete:", message.message);
    sendResponse({ status: "success" });
  } else if (message.type === "RESERVATION_ERROR") {
    console.error("Reservation error:", message.message);
    sendResponse({ status: "error" });
  }

  return true; // 비동기 응답을 위해 항상 true 반환
});
