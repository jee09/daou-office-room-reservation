window.makeReservations = function (weeks, selectedRoomId) {
  // selectedRoomId 파라미터 추가
  if (!selectedRoomId) {
    alert("회의실을 선택해주세요!");
    return;
  }

  const currentValues = {
    itemId: selectedRoomId, // 선택된 회의실 ID 사용
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

  const dates = [];
  const start = new Date(currentValues.startDate);
  dates.push(start.toISOString().split("T")[0]);

  for (let i = 1; i < weeks; i++) {
    const nextDate = new Date(start);
    nextDate.setDate(start.getDate() + i * 7);
    dates.push(nextDate.toISOString().split("T")[0]);
  }

  async function makeRequest(date, retryCount = 0) {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000;

    try {
      const requestBody = {
        assetId: 284,
        itemId: parseInt(currentValues.itemId),
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
        disconnectionCalendar: false,
        otherCompanyReservation: false,
        exclude: false,
      };
      console.log(`${date} 예약 요청:`, {
        url: `https://ezpmp.daouoffice.com/api/asset/284/item/${currentValues.itemId}/reserve`,
        body: requestBody,
      });

      const response = await fetch(
        `https://ezpmp.daouoffice.com/api/asset/284/item/${currentValues.itemId}/reserve`,
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
      console.log(`응답 (${date}):`, responseData);

      if (!response.ok) {
        throw new Error(
          responseData.message || `서버 에러: ${response.status}`
        );
      }

      if (responseData.code !== "200") {
        throw new Error(responseData.message || "예약 실패");
      }

      return true;
    } catch (error) {
      console.error(`예약 실패 (${date}):`, error);

      if (retryCount < MAX_RETRIES) {
        console.log(`재시도 중... (${retryCount + 1}/${MAX_RETRIES})`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        return makeRequest(date, retryCount + 1);
      }
      throw error;
    }
  }

  async function sendMessage(type, message, progress = null) {
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage(
          {
            type,
            message,
            ...(progress && { progress }),
          },
          (response) => {
            if (chrome.runtime.lastError) {
              console.warn("Message error:", chrome.runtime.lastError);
              resolve(); // 오류가 있어도 진행
            } else {
              resolve(response);
            }
          }
        );
      } catch (error) {
        console.warn("Send message failed:", error);
        resolve(); // 오류가 있어도 진행
      }
    });
  }

  async function processReservations() {
    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      try {
        let success = false;
        try {
          success = await makeRequest(date);
        } catch (error) {
          console.error(`${date} 예약 실패:`, error);
        }

        if (success) {
          await sendMessage("RESERVATION_SUCCESS", `${date} 예약 완료`, {
            current: i + 1,
            total: dates.length,
          });
        } else {
          await sendMessage("RESERVATION_ERROR", `${date} 예약 실패`, {
            current: i + 1,
            total: dates.length,
          });
        }
      } catch (error) {
        console.error("처리 중 오류:", error);
      }

      // 다음 요청 전 대기
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    try {
      await sendMessage("RESERVATION_COMPLETE", "모든 예약이 완료되었습니다.");
    } catch (error) {
      console.error("완료 메시지 전송 실패:", error);
    }
  }

  processReservations();
};
