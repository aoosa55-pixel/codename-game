// --- 1. Firebase Config ---
const firebaseConfig = {
  apiKey: "AIzaSyB6dS1qlFPWECCplTeqyVRtpmzIM-fmOC8",
  authDomain: "imposter-game-ad7d8.firebaseapp.com",
  databaseURL: "https://imposter-game-ad7d8-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "imposter-game-ad7d8",
  storageBucket: "imposter-game-ad7d8.firebasestorage.app",
  messagingSenderId: "179043399073",
  appId: "1:179043399073:web:7ffb52c7e97283fdd2c7e0"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

// --- 2. ตัวแปรในเกม ---
let currentRoomCode = "";
let currentUserId = "";
let isHost = false;
let myName = "";
let myTeam = "red";
let myRole = "operative";

// Elements
const homeScreen = document.getElementById("home-screen");
const lobbyScreen = document.getElementById("lobby-screen");
const gameScreen = document.getElementById("game-screen");

const playerNameInput = document.getElementById("player-name");
const roomCodeInput = document.getElementById("room-code-input");
const btnCreateRoom = document.getElementById("btn-create-room");
const btnJoinRoom = document.getElementById("btn-join-room");
const btnStartGame = document.getElementById("btn-start-game");
const btnLeaveLobby = document.getElementById("btn-leave-lobby");
const btnRestartGame = document.getElementById("btn-restart-game");
const displayRoomCode = document.getElementById("display-room-code");
const playerCountElement = document.getElementById("player-count");

// GameOver Modal Elements
const gameoverModal = document.getElementById("gameover-modal");
const gameoverTitle = document.getElementById("gameover-title");
const gameoverReason = document.getElementById("gameover-reason");

// General Modal
const customModal = document.getElementById("custom-modal");
const modalTitle = document.getElementById("modal-title");
const modalMessage = document.getElementById("modal-message");
const modalBtnClose = document.getElementById("modal-btn-close");

function showPopUp(title, msg) {
  if (modalTitle) modalTitle.innerText = title;
  if (modalMessage) modalMessage.innerText = msg;
  if (customModal) customModal.classList.remove("hidden");
}

if (modalBtnClose) {
  modalBtnClose.addEventListener("click", () => {
    if (customModal) customModal.classList.add("hidden");
  });
}

// --- 3. สร้าง / เข้าร่วมห้อง ---
if (btnCreateRoom) {
  btnCreateRoom.addEventListener("click", () => {
    myName = playerNameInput.value.trim();
    if (!myName) return showPopUp("แจ้งเตือน", "กรุณากรอกชื่อเล่นของคุณ");

    currentRoomCode = Math.floor(1000 + Math.random() * 9000).toString();
    currentUserId = "player_" + Date.now();
    isHost = true;

    const roomRef = database.ref("codenames_rooms/" + currentRoomCode);
    roomRef.set({
      status: "waiting",
      host: currentUserId,
      players: {
        [currentUserId]: { name: myName, team: "red", role: "spymaster", isHost: true }
      }
    }).then(() => {
      database.ref(`codenames_rooms/${currentRoomCode}/players/${currentUserId}`).onDisconnect().remove();
      listenToRoomUpdates(currentRoomCode);
      homeScreen.classList.add("hidden");
      lobbyScreen.classList.remove("hidden");
    }).catch(err => {
      showPopUp("Error", err.message);
    });
  });
}

if (btnJoinRoom) {
  btnJoinRoom.addEventListener("click", () => {
    myName = playerNameInput.value.trim();
    const code = roomCodeInput.value.trim();

    if (!myName) return showPopUp("แจ้งเตือน", "กรุณากรอกชื่อเล่นของคุณ");
    if (!code) return showPopUp("แจ้งเตือน", "กรุณากรอกรหัสห้อง 4 หลัก");

    const roomRef = database.ref("codenames_rooms/" + code);
    roomRef.once("value", (snapshot) => {
      if (!snapshot.exists()) return showPopUp("ผิดพลาด", "ไม่พบห้องนี้ในระบบ");

      currentRoomCode = code;
      currentUserId = "player_" + Date.now();
      isHost = false;

      const playerRef = database.ref(`codenames_rooms/${code}/players/${currentUserId}`);
      playerRef.set({ name: myName, team: "red", role: "operative", isHost: false }).then(() => {
        playerRef.onDisconnect().remove();
        listenToRoomUpdates(code);
        homeScreen.classList.add("hidden");
        lobbyScreen.classList.remove("hidden");
      });
    });
  });
}

// --- 4. เลือกทีม/บทบาท ---
function selectRole(team, role) {
  if (!currentRoomCode || !currentUserId) return;
  database.ref(`codenames_rooms/${currentRoomCode}/players/${currentUserId}`).update({
    team: team,
    role: role
  });
}

// --- 5. ฟังข้อมูล Real-time ---
function listenToRoomUpdates(code) {
  displayRoomCode.innerText = code;

  database.ref("codenames_rooms/" + code).on("value", (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    isHost = (data.host === currentUserId);
    if (btnStartGame) btnStartGame.style.display = isHost ? "block" : "none";

    const playersObj = data.players || {};
    const playerKeys = Object.keys(playersObj);
    if (playerCountElement) playerCountElement.innerText = playerKeys.length;

    if (playersObj[currentUserId]) {
      myTeam = playersObj[currentUserId].team;
      myRole = playersObj[currentUserId].role;
    }

    const redSpy = document.getElementById("red-spymaster-list");
    const redOp = document.getElementById("red-operatives-list");
    const blueSpy = document.getElementById("blue-spymaster-list");
    const blueOp = document.getElementById("blue-operatives-list");

    if (redSpy) redSpy.innerHTML = "";
    if (redOp) redOp.innerHTML = "";
    if (blueSpy) blueSpy.innerHTML = "";
    if (blueOp) blueOp.innerHTML = "";

    playerKeys.forEach(key => {
      const p = playersObj[key];
      const div = document.createElement("div");
      div.innerText = p.name + (p.isHost ? " 👑" : "");

      if (p.team === "red" && p.role === "spymaster" && redSpy) redSpy.appendChild(div);
      if (p.team === "red" && p.role === "operative" && redOp) redOp.appendChild(div);
      if (p.team === "blue" && p.role === "spymaster" && blueSpy) blueSpy.appendChild(div);
      if (p.team === "blue" && p.role === "operative" && blueOp) blueOp.appendChild(div);
    });

    // สลับหน้าจอตามสถานะห้อง
    if (data.status === "waiting") {
      gameScreen.classList.add("hidden");
      if (gameoverModal) gameoverModal.classList.add("hidden");
      lobbyScreen.classList.remove("hidden");
    } else if (data.status === "playing" || data.status === "ended") {
      lobbyScreen.classList.add("hidden");
      gameScreen.classList.remove("hidden");
      renderGameBoard(data);
    }
  });
}

// --- 6. ออกจาก Lobby ---
if (btnLeaveLobby) {
  btnLeaveLobby.addEventListener("click", () => {
    if (currentRoomCode && currentUserId) {
      database.ref(`codenames_rooms/${currentRoomCode}/players/${currentUserId}`).remove();
    }
    lobbyScreen.classList.add("hidden");
    homeScreen.classList.remove("hidden");
  });
}

// --- 7. ปุ่มกลับสู่หน้าเลือกฝั่ง (Restart Game) ---
if (btnRestartGame) {
  btnRestartGame.addEventListener("click", () => {
    if (!currentRoomCode) return;
    database.ref(`codenames_rooms/${currentRoomCode}`).update({
      status: "waiting",
      cards: null,
      currentClue: null,
      winner: null,
      winReason: null
    });
  });
}

// --- Pop-up กำหนดจำนวนคำ ---
const btnOpenClueModal = document.getElementById("btn-open-clue-modal");
const clueModal = document.getElementById("clue-modal");
const btnCloseClue = document.getElementById("btn-close-clue");
const btnSubmitClue = document.getElementById("btn-submit-clue");
const clueCountWheel = document.getElementById("clue-count-wheel");

if (btnOpenClueModal) {
  btnOpenClueModal.addEventListener("click", () => {
    if (clueCountWheel) clueCountWheel.value = "5";
    if (clueModal) clueModal.classList.remove("hidden");
  });
}

if (btnCloseClue) {
  btnCloseClue.addEventListener("click", () => {
    if (clueModal) clueModal.classList.add("hidden");
  });
}

if (btnSubmitClue) {
  btnSubmitClue.addEventListener("click", () => {
    const count = parseInt(clueCountWheel.value);

    database.ref(`codenames_rooms/${currentRoomCode}`).update({
      currentClue: {
        count: count,
        guessesLeft: count,
        isBonusTurn: false
      },
      turnState: "guessing"
    }).then(() => {
      if (clueModal) clueModal.classList.add("hidden");
    });
  });
}

// --- 8. กดเริ่มเกม (ดึงคำศัพท์จาก Firebase มาสุ่ม) ---
if (btnStartGame) {
  btnStartGame.addEventListener("click", () => {
    if (!currentRoomCode) return;

    // ดึงคำศัพท์ทั้งหมดจากโหนด word_bank
    database.ref("word_bank").once("value", (snapshot) => {
      let wordList = snapshot.val();

      // ถ้าระบบหา word_bank ไม่เจอ ให้ใช้คำศัพท์สำรอง
      if (!wordList || wordList.length < 25) {
        wordList = [
          "แอปเปิ้ล", "กล้วย", "หนังสือ", "ปากกา", "คอมพิวเตอร์",
          "โทรศัพท์", "นาฬิกา", "แมว", "สุนัข", "บ้าน",
          "รถยนต์", "เครื่องบิน", "ทะเล", "ภูเขา", "แม่น้ำ",
          "ดวงอาทิตย์", "พระจันทร์", "ดาว", "ฝน", "หิมะ",
          "กาแฟ", "ชา", "ขนมปัง", "พิซซ่า", "ช็อกโกแลต"
        ];
      }

      // สุ่มคำศัพท์มา 25 คำ
      const shuffledWords = [...wordList].sort(() => 0.5 - Math.random()).slice(0, 25);

      // กำหนดประเภทการ์ด (แดง 8, น้ำเงิน 8, ชาวบ้าน 8, นักฆ่า 1)
      const cardTypes = [
        ...Array(8).fill("red"),
        ...Array(8).fill("blue"),
        ...Array(8).fill("neutral"),
        ...Array(1).fill("assassin")
      ].sort(() => 0.5 - Math.random());

      // สร้างกระดานการ์ด 25 ใบ
      const boardCards = shuffledWords.map((word, index) => ({
        id: index,
        word: word,
        type: cardTypes[index],
        revealed: false
      }));

      // อัปเดตข้อมูลขึ้น Firebase เพื่อเริ่มเกม
      database.ref(`codenames_rooms/${currentRoomCode}`).update({
        status: "playing",
        currentTurn: "red",
        turnState: "clue",
        redLeft: 8,
        blueLeft: 8,
        cards: boardCards,
        winner: null,
        winReason: null
      }).catch(err => {
        showPopUp("Error", "ไม่สามารถเริ่มเกมได้: " + err.message);
      });
    });
  });
}

// --- 9. วาดกระดานเกม และรองรับ Pop-up สรุปผล ---
function renderGameBoard(roomData) {
  const boardGrid = document.getElementById("board-grid");
  const spymasterBoardView = document.getElementById("spymaster-board-view");
  const redLeftEl = document.getElementById("red-left");
  const blueLeftEl = document.getElementById("blue-left");
  const turnIndicator = document.getElementById("turn-indicator");
  const spymasterPanel = document.getElementById("spymaster-panel");
  const btnEndTurn = document.getElementById("btn-end-turn");

  if (!boardGrid || !spymasterBoardView) return;

  if (redLeftEl) redLeftEl.innerText = roomData.redLeft || 0;
  if (blueLeftEl) blueLeftEl.innerText = roomData.blueLeft || 0;

  turnIndicator.classList.remove("bonus-turn");
  btnEndTurn.classList.remove("btn-bonus");

  // กรณีเกมจบ (status === "ended") -> แสดง Pop-up สรุปผล
  if (roomData.status === "ended") {
    if (gameoverModal) {
      gameoverTitle.innerText = `🏆 ${roomData.winner} เป็นฝ่ายชนะ!`;
      gameoverReason.innerText = roomData.winReason || "จบการแข่งขัน";
      gameoverModal.classList.remove("hidden");
    }

    if (spymasterPanel) spymasterPanel.style.display = "none";
    if (btnEndTurn) btnEndTurn.classList.add("hidden");

    // เปิดกระดานเฉลยพื้นหลังให้ดูการ์ดทั้งหมด
    boardGrid.classList.add("hidden");
    spymasterBoardView.classList.remove("hidden");
    spymasterBoardView.innerHTML = "";

    (roomData.cards || []).forEach(card => {
      const cardEl = document.createElement("div");
      cardEl.className = `spymaster-card ${card.type} ${card.revealed ? "revealed" : ""}`;
      cardEl.innerText = card.word;
      spymasterBoardView.appendChild(cardEl);
    });

    return;
  } else {
    // ระหว่างเล่นเกม ให้ซ่อน Pop-up สรุปผล
    if (gameoverModal) gameoverModal.classList.add("hidden");
  }

  // กรณีระหว่างเล่นเกมปกติ
  const turnTeamText = roomData.currentTurn === "red" ? "🔴 ทีมแดง" : "🔵 ทีมน้ำเงิน";
  const currentClue = roomData.currentClue || {};

  if (roomData.turnState === "clue") {
    turnIndicator.innerText = `ตาของ ${turnTeamText} (หัวหน้านำทางกำลังบอกโควตาคำใบ้)`;
  } else {
    if (currentClue.isBonusTurn) {
      turnIndicator.classList.add("bonus-turn");
      turnIndicator.innerText = `✨ ${turnTeamText} ได้รับโบนัสทายฟรี 1 ใบ! (หรือกดข้ามได้)`;
    } else {
      turnIndicator.innerText = `ตาของ ${turnTeamText} (ต้องทายให้ครบ ${currentClue.guessesLeft} ใบที่เหลือ)`;
    }
  }

  const isMyTurnToClue = (myRole === "spymaster") && (myTeam === roomData.currentTurn) && (roomData.turnState === "clue");
  if (spymasterPanel) spymasterPanel.style.display = isMyTurnToClue ? "block" : "none";

  const isMyTurnToGuess = (myRole === "operative") && (myTeam === roomData.currentTurn) && (roomData.turnState === "guessing");
  if (btnEndTurn) {
    if (isMyTurnToGuess && currentClue.isBonusTurn) {
      btnEndTurn.classList.remove("hidden");
      btnEndTurn.classList.add("btn-bonus");
      btnEndTurn.innerText = "🎁 จบตา (โบนัสเปิดฟรี)";
      btnEndTurn.onclick = () => switchTurn(roomData);
    } else {
      btnEndTurn.classList.add("hidden");
    }
  }

  const cards = roomData.cards || [];

  if (myRole === "spymaster") {
    boardGrid.classList.add("hidden");
    spymasterBoardView.classList.remove("hidden");
    spymasterBoardView.innerHTML = "";

    cards.forEach(card => {
      const cardEl = document.createElement("div");
      cardEl.className = `spymaster-card ${card.type} ${card.revealed ? "revealed" : ""}`;
      cardEl.innerText = card.word;
      spymasterBoardView.appendChild(cardEl);
    });

  } else {
    spymasterBoardView.classList.add("hidden");
    boardGrid.classList.remove("hidden");
    boardGrid.innerHTML = "";

    cards.forEach(card => {
      const cardEl = document.createElement("div");
      cardEl.className = "card-item";
      
      if (card.revealed) {
        cardEl.classList.add("revealed", card.type);
      }

      cardEl.innerText = card.word;

      if (isMyTurnToGuess && !card.revealed) {
        cardEl.style.cursor = "pointer";
        cardEl.onclick = () => handleCardClick(card, roomData);
      }

      boardGrid.appendChild(cardEl);
    });
  }
}

// --- 10. การคลิกการ์ด ---
function handleCardClick(card, roomData) {
  let redLeft = roomData.redLeft;
  let blueLeft = roomData.blueLeft;
  const currentTurn = roomData.currentTurn;
  const currentClue = roomData.currentClue || {};
  let guessesLeft = currentClue.guessesLeft || 0;
  let isBonusTurn = currentClue.isBonusTurn || false;

  const updatedCards = roomData.cards.map(c => c.id === card.id ? { ...c, revealed: true } : c);

  // จิ้มโดนนักฆ่า
  if (card.type === "assassin") {
    const winner = currentTurn === "red" ? "🔵 ทีมน้ำเงิน" : "🔴 ทีมแดง";
    const reason = `💀 ${currentTurn === "red" ? "🔴 ทีมแดง" : "🔵 ทีมน้ำเงิน"} จิ้มโดนการ์ดนักฆ่า!`;
    database.ref(`codenames_rooms/${currentRoomCode}`).update({ 
      status: "ended", 
      winner: winner, 
      winReason: reason,
      cards: updatedCards 
    });
    return;
  }

  if (card.type === "red") redLeft--;
  if (card.type === "blue") blueLeft--;

  // ชนะเพราะเปิดคำครบ
  if (redLeft <= 0 || blueLeft <= 0) {
    const winner = redLeft <= 0 ? "🔴 ทีมแดง" : "🔵 ทีมน้ำเงิน";
    const reason = `🎉 ${winner} ถอดรหัสคำศัพท์ครบทั้งหมดแล้ว!`;
    database.ref(`codenames_rooms/${currentRoomCode}`).update({ 
      status: "ended", 
      winner: winner, 
      winReason: reason,
      cards: updatedCards 
    });
    return;
  }

  // ทายผิดสี
  if (card.type !== currentTurn) {
    const nextTurn = currentTurn === "red" ? "blue" : "red";
    database.ref(`codenames_rooms/${currentRoomCode}`).update({
      cards: updatedCards,
      redLeft: redLeft,
      blueLeft: blueLeft,
      currentTurn: nextTurn,
      turnState: "clue"
    });
    return;
  }

  // ทายถูกรอบโบนัส
  if (isBonusTurn) {
    const nextTurn = currentTurn === "red" ? "blue" : "red";
    database.ref(`codenames_rooms/${currentRoomCode}`).update({
      cards: updatedCards,
      redLeft: redLeft,
      blueLeft: blueLeft,
      currentTurn: nextTurn,
      turnState: "clue"
    });
  } else {
    guessesLeft--;
    if (guessesLeft <= 0) {
      database.ref(`codenames_rooms/${currentRoomCode}`).update({
        cards: updatedCards,
        redLeft: redLeft,
        blueLeft: blueLeft,
        "currentClue/isBonusTurn": true,
        "currentClue/guessesLeft": 0
      });
    } else {
      database.ref(`codenames_rooms/${currentRoomCode}`).update({
        cards: updatedCards,
        redLeft: redLeft,
        blueLeft: blueLeft,
        "currentClue/guessesLeft": guessesLeft
      });
    }
  }
}

// --- 11. ฟังก์ชันเปลี่ยนตาเล่น (ต้องจบแค่นี้) ---
function switchTurn(roomData) {
  const nextTurn = roomData.currentTurn === "red" ? "blue" : "red";
  database.ref(`codenames_rooms/${currentRoomCode}`).update({
    currentTurn: nextTurn,
    turnState: "clue"
  });
} // <-- ปีกกาปิดของ switchTurn อยู่ตรงนี้!