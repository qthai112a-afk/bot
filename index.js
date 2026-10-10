const express = require("express");
const login = require("fca-project-origen");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.send("Bot Messenger đang hoạt động 24/7!");
});

app.listen(PORT, () => {
    console.log(`--> Web Server đang chạy ở cổng ${PORT}`);
});

let appState;
try {
    appState = JSON.parse(fs.readFileSync(__dirname + "/appstate.json", "utf8"));
} catch (e) {
    console.error("Lỗi: Không tìm thấy hoặc file appstate.json bị hỏng!");
    process.exit(1);
}

login({ appState }, (err, api) => {
    if (err) return console.error("Đăng nhập thất bại:", err);

    api.setOptions({
        listenEvents: true,
        selfListen: false,
        logLevel: "silent"
    });

    console.log("--> Bot đã đăng nhập thành công và sẵn sàng tự gửi tin nhắn nhóm!");

    api.listenMqtt(async (err, event) => {
        if (err) return console.error("Lỗi listenMqtt:", err);

        if (event.type === "event" && event.logMessageType === "log:subscribe") {
            const addedParticipants = event.logMessageData.addedParticipants;

            for (const participant of addedParticipants) {
                const userID = participant.userFbId;
                const userName = participant.fullName;

                if (userID === api.getCurrentUserID()) {
                    api.sendMessage("Cảm ơn đã thêm Bot vào nhóm! Mọi người tương tác vui vẻ nhé 🎉", event.threadID);
                } else {
                    api.sendMessage(`Chào mừng ${userName} đã tham gia vào nhóm! 🎉\nChúc bạn có thời gian trò chuyện vui vẻ.`, event.threadID);
                }
            }
        }

        if (event.type === "event" && event.logMessageType === "log:unsubscribe") {
            const leftUserID = event.logMessageData.leftParticipantFbId;

            try {
                const userInfo = await api.getUserInfo(leftUserID);
                const userName = userInfo[leftUserID]?.name || "Một thành viên";
                api.sendMessage(`${userName} đã rời khỏi nhóm hoặc bị xóa khỏi danh sách. Tạm biệt! 👋`, event.threadID);
            } catch (error) {
                api.sendMessage("Một thành viên đã rời khỏi nhóm.", event.threadID);
            }
        }
    });
});
