chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message received in background:", message);

  if (
    message.type === "RESERVATION_SUCCESS" ||
    message.type === "RESERVATION_COMPLETE"
  ) {
    console.log("Reservation status:", message.message);
    // 응답이 필요 없는 경우
    return true; // 비동기 처리 신호
  } else if (message.type === "RESERVATION_ERROR") {
    console.error("Reservation error:", message.message);
    sendResponse({ status: "error" });
  }
});
