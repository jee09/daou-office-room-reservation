// 날짜 요일 구하기 함수
function getDayOfWeek(date) {
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return days[new Date(date).getDay()];
}

// 날짜 미리보기 업데이트
function updatePreview() {
  const weeks = document.getElementById("weeks").value;
  const previewContainer = document.getElementById("preview-container");
  const previewDates = document.getElementById("preview-dates");

  chrome.tabs.query(
    { active: true, currentWindow: true },
    async function (tabs) {
      try {
        const tab = tabs[0];
        const result = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: () => {
            const startDateInput = document.querySelector("#startDate");
            const startTimeInput = document.querySelector("#startTime");
            return {
              startDate: startDateInput ? startDateInput.value : null,
              startTime: startTimeInput ? startTimeInput.value : null,
            };
          },
        });

        const { startDate, startTime } = result[0].result;

        if (startDate && startTime) {
          const dates = [];
          const start = new Date(startDate);

          // 현재 선택한 날짜부터 시작
          dates.push({
            date: start.toISOString().split("T")[0],
            dayOfWeek: getDayOfWeek(start),
          });

          // 나머지 주 추가
          for (let i = 1; i < weeks; i++) {
            const nextDate = new Date(start);
            nextDate.setDate(start.getDate() + i * 7);
            dates.push({
              date: nextDate.toISOString().split("T")[0],
              dayOfWeek: getDayOfWeek(nextDate),
            });
          }

          previewContainer.style.display = "block";
          previewDates.innerHTML = dates
            .map(
              (d) =>
                `<div class="date-item">${d.date} (${d.dayOfWeek}) ${startTime}</div>`
            )
            .join("");
        }
      } catch (error) {
        console.error("미리보기 업데이트 실패:", error);
      }
    }
  );
}

// 로그 추가 함수
function addLog(message, type = "info") {
  const resultContainer = document.getElementById("result-container");
  const logEntry = document.createElement("div");
  logEntry.className = `date-item ${type}`;
  logEntry.textContent = message;
  resultContainer.appendChild(logEntry);
}

// 진행률 업데이트 함수
function updateProgress(current, total) {
  const percentage = Math.round((current / total) * 100);
  const progressBar = document.getElementById("progressBar");
  const progressText = document.getElementById("progressText");

  console.log(`진행률 업데이트: ${current}/${total} (${percentage}%)`); // 디버깅 로그

  progressBar.style.width = `${percentage}%`;
  progressText.textContent = `${percentage}%`;

  if (percentage === 100) {
    progressBar.style.backgroundColor = "#4caf50"; // 완료 시 초록색
  }
}

// 이벤트 리스너 등록
document.getElementById("weeks").addEventListener("input", updatePreview);
document.addEventListener("DOMContentLoaded", updatePreview);

// 예약 시작 버튼 클릭 이벤트
document
  .getElementById("startReservation")
  .addEventListener("click", async () => {
    const button = document.getElementById("startReservation");
    const weeks = document.getElementById("weeks").value;
    const progressContainer = document.getElementById("progressContainer");
    const resultContainer = document.getElementById("result-container");
    const selectedRoom = document.getElementById("roomSelect").value;

    if (!selectedRoom) {
      alert("회의실을 선택해주세요!");
      return;
    }

    console.log("예약 시작 버튼 클릭됨");
    console.log(`예약할 주 수: ${weeks}`);

    button.disabled = true;
    progressContainer.style.display = "block";
    resultContainer.innerHTML = "";

    button.textContent = "예약 중...";
    button.disabled = true;

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: (weeks, roomId) => {
          window.makeReservations(weeks, roomId);
        },
        args: [Number(weeks), selectedRoom],
      });
    } catch (error) {
      console.error("Error:", error);
      button.disabled = false;
      button.textContent = "예약 시작";
    } finally {
      button.disabled = false;
    }
  });

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Received message in popup.js:", message);

  if (message.type === "RESERVATION_SUCCESS") {
    updateProgress(message.progress.current, message.progress.total);
    addLog(message.message, "success");
  } else if (message.type === "RESERVATION_ERROR") {
    addLog(message.message, "error");
    updateProgress(message.progress.current, message.progress.total);
  } else if (message.type === "RESERVATION_COMPLETE") {
    const resultContainer = document.getElementById("result-container");
    if (resultContainer) {
      resultContainer.innerHTML = `<div class="success">
        예약이 모두 완료되었습니다. 페이지를 새로고침합니다...
      </div>`;
    }

    document.getElementById("startReservation").textContent = "새 예약 시작";
    document.getElementById("startReservation").disabled = false;

    // 페이지 새로고침
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.reload(tabs[0].id, () => {
          console.log("Page reloaded successfully.");

          // 새로고침 후 메시지 초기화
          if (resultContainer) {
            resultContainer.innerHTML = "";
          }
        });
      }
    });

    sendResponse({ status: "success" });
  }
});
