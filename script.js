let currentChat = null;
let user = {};
let peer = null;
let localStream = null;
let currentCall = null;
let mediaRecorderAudio = null;
let recordedAudioChunks = [];
let mediaRecorderScreen = null;
let recordedScreenChunks = [];

// Login
function login() {
  const name = document.getElementById("username").value.trim();
  const number = document.getElementById("usernumber").value.trim();

  if (!name || !number) {
    alert("Preencha seu nome e número!");
    return;
  }

  user = { name, number };
  localStorage.setItem("chatUser", JSON.stringify(user));

  // Inicializa o PeerJS com o número como ID
  peer = new Peer(user.number, {
    host: 'peerjs.com', // servidor público do PeerJS
    port: 443,
    secure: true
  });

  peer.on('open', id => {
    console.log("Conectado ao servidor PeerJS com ID:", id);
  });

  // Recebe chamadas
  peer.on('call', call => {
    const aceitar = confirm(`Você está recebendo uma chamada de ${call.peer}. Deseja atender?`);
    if (!aceitar) {
      call.close();
      return;
    }
    navigator.mediaDevices.getUserMedia({ audio: true, video: true }).then(stream => {
      localStream = stream;
      call.answer(stream);
      setupCallEvents(call);
      showCallUI(call.peer);
    }).catch(() => alert("Erro ao acessar microfone/câmera!"));
  });

  document.getElementById("login-container").classList.add("hidden");
  document.getElementById("contacts-container").classList.remove("hidden");

  loadContacts();
}

function logout() {
  localStorage.removeItem("chatUser");
  if (peer) peer.destroy();
  location.reload();
}

function loadContacts() {
  const list = document.getElementById("contacts-list");
  list.innerHTML = "";
  const contacts = JSON.parse(localStorage.getItem("contacts")) || [
    { name: "Kaelys", number: "77777-0000" },
    { name: "Selmara", number: "88888-1111" },
    { name: "Drakmor", number: "99999-2222" }
  ];
  contacts.forEach(c => {
    const li = document.createElement("li");
    li.textContent = `${c.name} (${c.number})`;
    li.onclick = () => openChat(c);
    list.appendChild(li);
  });
  localStorage.setItem("contacts", JSON.stringify(contacts));
}

function openChat(contact) {
  currentChat = contact;
  document.getElementById("contacts-container").classList.add("hidden");
  document.getElementById("chat-container").classList.remove("hidden");
  document.getElementById("chat-title").innerText = `Chat com ${contact.name}`;
  loadMessages(contact.number);
}

function goBack() {
  document.getElementById("chat-container").classList.add("hidden");
  document.getElementById("contacts-container").classList.remove("hidden");
}

// Mensagens texto e imagem
function sendMessage() {
  const input = document.getElementById("message-input");
  const text = input.value.trim();
  if (!text) return;

  const msg = {
    text,
    user: user.name,
    time: new Date().toLocaleTimeString()
  };
  saveMessage(currentChat.number, msg);
  displayMessage(msg);
  input.value = "";
}

function displayMessage(msg) {
  const box = document.getElementById("chat-box");
  const div = document.createElement("div");
  div.classList.add("message");

  if (msg.img) {
    div.innerHTML = `<strong>${msg.user}</strong>:<br><img src="${msg.img}"/><span class="time">${msg.time}</span>`;
  } else if (msg.audio) {
    div.innerHTML = `<strong>${msg.user}</strong>:<br><audio controls src="${msg.audio}"></audio><span class="time">${msg.time}</span>`;
  } else {
    div.textContent = `${msg.user}: ${msg.text} `;
    const timeSpan = document.createElement("span");
    timeSpan.classList.add("time");
    timeSpan.textContent = msg.time;
    div.appendChild(timeSpan);
  }

  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

function saveMessage(number, msg) {
  const msgs = JSON.parse(localStorage.getItem("chat-" + number)) || [];
  msgs.push(msg);
  localStorage.setItem("chat-" + number, JSON.stringify(msgs));
}

function loadMessages(number) {
  const box = document.getElementById("chat-box");
  box.innerHTML = "";
  const msgs = JSON.parse(localStorage.getItem("chat-" + number)) || [];
  msgs.forEach(displayMessage);
}

// Enviar imagem
document.getElementById('imageInput').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e2 => {
    const msg = {
      img: e2.target.result,
      user: user.name,
      time: new Date().toLocaleTimeString()
    };
    saveMessage(currentChat.number, msg);
    displayMessage(msg);
  };
  reader.readAsDataURL(file);
  e.target.value = "";
});

// === GRAVAÇÃO DE ÁUDIO E ENVIO PARA CHAT ===
document.getElementById("recordAudioBtn").addEventListener("click", () => {
  if (mediaRecorderAudio && mediaRecorderAudio.state === "recording") {
    mediaRecorderAudio.stop();
    return;
  }

  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    mediaRecorderAudio = new MediaRecorder(stream);
    recordedAudioChunks = [];

    mediaRecorderAudio.ondataavailable = e => {
      if (e.data.size > 0) recordedAudioChunks.push(e.data);
    };

    mediaRecorderAudio.onstop = () => {
      const blob = new Blob(recordedAudioChunks, { type: "audio/webm" });
      const url = URL.createObjectURL(blob);

      // Cria mensagem de áudio no chat
      const msg = {
        audio: url,
        user: user.name,
        time: new Date().toLocaleTimeString()
      };
      saveMessage(currentChat.number, msg);
      displayMessage(msg);

      // Para parar a captura do microfone
      stream.getTracks().forEach(track => track.stop());
      alert("Gravação de áudio enviada no chat!");
    };

    mediaRecorderAudio.start();
    alert("Gravação de áudio iniciada! Clique novamente para parar.");
  }).catch(() => alert("Não foi possível acessar o microfone."));
});

// === GRAVAÇÃO DE TELA ===
document.getElementById("recordScreenBtn").addEventListener("click", () => {
  if (mediaRecorderScreen && mediaRecorderScreen.state === "recording") {
    mediaRecorderScreen.stop();
    return;
  }

  navigator.mediaDevices.getDisplayMedia({ video: true }).then(stream => {
    mediaRecorderScreen = new MediaRecorder(stream);
    recordedScreenChunks = [];

    mediaRecorderScreen.ondataavailable = e => {
      if (e.data.size > 0) recordedScreenChunks.push(e.data);
    };

    mediaRecorderScreen.onstop = () => {
      const blob = new Blob(recordedScreenChunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "gravacao_tela.webm";
      a.click();
      URL.revokeObjectURL(url);
      alert("Gravação da tela salva localmente!");
      stream.getTracks().forEach(track => track.stop());
    };

    mediaRecorderScreen.start();
    alert("Gravação de tela iniciada! Clique novamente para parar.");
  }).catch(() => alert("Não foi possível acessar a tela."));
});

// === CHAMADAS REAIS PEERJS ===

function startCall(isVideo) {
  if (!currentChat) return alert("Abra um chat para ligar.");
  const callToId = currentChat.number;

  navigator.mediaDevices.getUserMedia({
    audio: true,
    video: isVideo
  }).then(stream => {
    localStream = stream;
    showCallUI(callToId);

    // Mostra o vídeo local se for vídeo
    const localVideo = document.getElementById("local-video");
    if (isVideo) {
      localVideo.classList.remove("hidden");
      localVideo.srcObject = stream;
    } else {
      localVideo.classList.add("hidden");
      // Criar áudio local (se quiser monitorar) ou não
    }

    // Faz a chamada via PeerJS
    const call = peer.call(callToId, stream);
    currentCall = call;

    call.on('stream', remoteStream => {
      // Exibe o vídeo remoto
      const remoteVideo = document.getElementById("remote-video");
      remoteVideo.srcObject = remoteStream;
      remoteVideo.classList.remove("hidden");
    });

    call.on('close', () => {
      endCall();
    });

    call.on('error', err => {
      alert("Erro na chamada: " + err);
      endCall();
    });

  }).catch(() => alert("Não foi possível acessar microfone/câmera."));
}

function setupCallEvents(call) {
  currentCall = call;

  const remoteVideo = document.getElementById("remote-video");
  call.on('stream', stream => {
    remoteVideo.srcObject = stream;
    remoteVideo.classList.remove("hidden");
  });

  call.on('close', () => {
    endCall();
  });

  call.on('error', err => {
    alert("Erro na chamada: " + err);
    endCall();
  });

  // Exibe o vídeo local também
  const localVideo = document.getElementById("local-video");
  if (localStream) {
    localVideo.srcObject = localStream;
    localVideo.classList.remove("hidden");
  }

  showCallUI(call.peer);
}

function showCallUI(peerId) {
  document.getElementById("call-to").innerText = peerId;
  document.getElementById("login-container").classList.add("hidden");
  document.getElementById("contacts-container").classList.add("hidden");
  document.getElementById("chat-container").classList.add("hidden");
  document.getElementById("call-screen").classList.remove("hidden");
}

function endCall() {
  if (currentCall) {
    currentCall.close();
    currentCall = null;
  }
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }
  document.getElementById("local-video").classList.add("hidden");
  document.getElementById("remote-video").classList.add("hidden");

  document.getElementById("call-screen").classList.add("hidden");
  document.getElementById("chat-container").classList.remove("hidden");
  // Se quiser, pode mostrar contatos ou chat atual
}
