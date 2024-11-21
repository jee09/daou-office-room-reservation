console.log("Content script loaded");
// content.js
window.makeReservations = function (weeks) {
  // 현재 값들 저장
  const currentValues = {
    startDate: document.querySelector("#startDate").value,
    startTime: document.querySelector("#startTime").value,
    endTime: document.querySelector("#endTime").value,
    purpose: document.querySelector(
      'tr[data-type="attribute"][data-id="340"] input.txt.w_max'
    ).value,
    attendees: document.querySelector(
      'tr[data-type="attribute"][data-id="341"] input.txt.w_max'
    ).value,
    userId: document.querySelector("#userId").dataset.userid,
  };

  // 다음 n주의 날짜 생성
  const dates = [];
  const start = new Date(currentValues.startDate);

  // 현재 날짜부터 시작
  dates.push(start.toISOString().split("T")[0]);

  for (let i = 1; i < weeks; i++) {
    const nextDate = new Date(start);
    nextDate.setDate(start.getDate() + i * 7);
    dates.push(nextDate.toISOString().split("T")[0]);
  }

  // 예약 진행
  async function processReservations() {
    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      try {
        const requestBody = {
          assetId: 284,
          itemId: "4140",
          type: "reserve",
          startTime: `${date}T${currentValues.startTime}:00.000+09:00`,
          endTime: `${date}T${currentValues.endTime}:00.000+09:00`,
          useAnonym: false,
          user: {
            id: currentValues.userId,
          },
          properties: [
            {
              attributeId: "340",
              content: currentValues.purpose,
            },
            {
              attributeId: "341",
              content: currentValues.attendees,
            },
          ],
          allday: false,
        };

        const response = await fetch(
          "https://ezpmp.daouoffice.com/api/asset/284/item/4140/reserve",
          {
            method: "POST",
            headers: {
              accept: "application/json, text/javascript, */*; q=0.01",
              "content-type": "application/json",
              "x-requested-with": "XMLHttpRequest",
            },
            body: JSON.stringify(requestBody),
            credentials: "include",
          }
        );

        const responseData = await response.json();

        if (!response.ok) {
          throw new Error(
            responseData.message || `HTTP error! status: ${response.status}`
          );
        }

        // 메시지 전송
        try {
          chrome.runtime.sendMessage(
            {
              type: "RESERVATION_SUCCESS",
              message: `${date} 예약 완료`,
              progress: { current: i + 1, total: dates.length },
            },
            (response) => {
              if (chrome.runtime.lastError) {
                console.error(
                  "Error sending message:",
                  chrome.runtime.lastError.message
                );
              } else {
                console.log("Message response:", response);
              }
            }
          );
        } catch (error) {
          console.error("Error in sendMessage:", error);
        }
      } catch (error) {
        chrome.runtime.sendMessage(
          {
            type: "RESERVATION_ERROR",
            message: `${date} 예약 실패: ${error.message}`,
            progress: { current: i + 1, total: dates.length },
          },
          "*"
        );
      }

      // 다음 요청 전 대기
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    try {
      chrome.runtime.sendMessage(
        {
          type: "RESERVATION_COMPLETE",
          message: "모든 예약이 완료되었습니다.",
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error(
              "Error sending completion message:",
              chrome.runtime.lastError.message
            );
          } else {
            console.log("Completion message sent successfully:", response);

            // 모달 닫기 버튼 클릭
            const closeButton = document.querySelector("#go_popup_close_icon");
            if (closeButton) {
              console.log("닫기 버튼을 찾았습니다. 닫기 동작 실행 중...");
              closeButton.click();
            } else {
              console.error("닫기 버튼을 찾을 수 없습니다.");
            }
          }
        }
      );
    } catch (error) {
      console.error("Error in sendMessage (completion):", error);
    }
  }

  processReservations();
};

console.log("Content script loaded and makeReservations function defined");
