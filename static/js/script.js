let countingInterval;
let seconds = 0;
let stream = null;
let recognition;
let recognizing = false;

document.addEventListener("DOMContentLoaded", function () {
  const micBtn = document.getElementById('mic-btn');
  const chatBtn = document.querySelector('.chatbot-btn');
  const closeBtn = document.querySelector('.close-btn');
  const sendBtn = document.getElementById('send-btn');
  const preloadedBtns = document.querySelectorAll('.preloaded-messages button');

  // Inicializar la Web Speech API al cargar la página
  initWebSpeechAPI();

  // Cargar historial de chat si existe
  loadChatHistory();

  // Evento para abrir/cerrar el chatbot
  chatBtn.addEventListener('click', toggleChatbot);
  closeBtn.addEventListener('click', toggleChatbot);

  // Evento para reiniciar el chatbot
  document.querySelector('.restart-btn').addEventListener('click', restartChat);

  // Evento para enviar mensajes predefinidos
  preloadedBtns.forEach(button => {
    button.addEventListener('click', () => sendPreloadedMessage(button.textContent));
  });

  // Eventos mousedown y mouseup en el botón del micrófono
  micBtn.addEventListener('mousedown', startRecordingAndCounting);
  micBtn.addEventListener('mouseup', stopRecordingAndCounting);

  // Manejo cuando el mouse se mueva fuera del botón del micrófono
  micBtn.addEventListener('mouseleave', stopRecordingAndCounting);

  // Evento para enviar un mensaje cuando se presione el botón de enviar
  sendBtn.addEventListener('click', () => {
    const input = document.getElementById('user-input').value.trim();
    sendMessage(input);
  });

  // Evento para enviar mensaje con la tecla Enter
  document.getElementById('user-input').addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
      const input = document.getElementById('user-input').value.trim();
      sendMessage(input);
    }
  });
});

// Abrir/cerrar chatbot
function toggleChatbot() {
  const chatbot = document.getElementById('chatbot');
  chatbot.style.display = chatbot.style.display === 'none' || chatbot.style.display === '' ? 'flex' : 'none';
}

// Guardar historial de chat en localStorage
function saveChatToLocalStorage() {
  const chatContent = document.getElementById('chat-body').innerHTML;
  localStorage.setItem('chatHistory', chatContent);
}

// Cargar historial de chat desde localStorage
function loadChatHistory() {
  const chatContent = localStorage.getItem('chatHistory');
  if (chatContent) {
    document.getElementById('chat-body').innerHTML = chatContent;
  }
}

// Enviar mensaje predefinido
function sendPreloadedMessage(message) {
  sendMessage(message);
}

// Inicializar la Web Speech API
function initWebSpeechAPI() {
  recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = 'es-ES';  // Ajustar el idioma
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = function() {
    recognizing = true;
    console.log("Iniciando transcripción por voz...");
  };

  recognition.onresult = function(event) {
    const transcript = event.results[0][0].transcript;
    console.log("Transcripción completa:", transcript);
    sendMessage(transcript, true);  // Enviar el mensaje con el flag de mensaje de audio
  };

  recognition.onerror = function(event) {
    console.error('Error en la transcripción:', event.error);
    const errorMessage = document.createElement('div');
    errorMessage.className = 'bot-message';
    errorMessage.textContent = 'Hubo un error con la transcripción. Inténtalo de nuevo.';
    document.getElementById('chat-body').appendChild(errorMessage);
  };

  recognition.onend = function() {
    recognizing = false;
    console.log("Finalizó la transcripción.");
  };
}

// Iniciar la grabación de voz y transcripción
function startRecordingAndTranscribing() {
  if (recognition && !recognizing) {
    recognition.start();  // Comienza la transcripción
  }
}

// Detener la grabación de voz y transcripción
function stopRecordingAndTranscribing() {
  if (recognition && recognizing) {
    recognition.stop();  // Detiene la transcripción
  }
}

// Iniciar la grabación de audio y el conteo de tiempo
function startRecordingAndCounting() {
  const micBtn = document.getElementById('mic-btn');
  const micIcon = micBtn.querySelector('i');
  const userInput = document.getElementById('user-input');

  // Cambiar el ícono del micrófono a rojo
  micBtn.classList.add('active');
  micIcon.style.color = 'red';

  // Iniciar la transcripción por voz
  startRecordingAndTranscribing();

  // Iniciar el contador de tiempo
  if (!countingInterval) {
    countingInterval = setInterval(() => {
      seconds++;
      userInput.value = formatSeconds(seconds);
      userInput.classList.add('active');
    }, 1000);
  }
}

// Detener la grabación de audio y el conteo de tiempo
function stopRecordingAndCounting() {
  const micBtn = document.getElementById('mic-btn');
  const micIcon = micBtn.querySelector('i');
  const userInput = document.getElementById('user-input');

  // Detener el contador
  if (countingInterval) {
    clearInterval(countingInterval);
    countingInterval = null;
    seconds = 0;
  }

  // Restaurar el estado del ícono y el input
  micBtn.classList.remove('active');
  micIcon.style.color = 'white';
  userInput.value = '';
  userInput.classList.remove('active');

  // Detener la transcripción por voz
  stopRecordingAndTranscribing();
}

// Formatear segundos a mm:ss
function formatSeconds(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Función para extraer la URL de la imagen desde el texto del mensaje
function extractImageUrl(text) {
  const urlRegex = /(https?:\/\/[^\s]+(?:png|jpg|jpeg|gif))/gi;
  const matches = text.match(urlRegex);
  return matches ? matches[0] : null;  // Devuelve la primera URL encontrada o null si no hay coincidencias
}

// Función para mostrar la transcripción en el chat
async function sendMessage(messageText, isVoiceMessage = false) {
  const chatBody = document.getElementById('chat-body');

  if (messageText.length > 0) {
    // Crear el mensaje del usuario y agregarlo al cuerpo del chat
    const userMessage = document.createElement('div');
    userMessage.className = 'user-message';
    userMessage.textContent = messageText;
    chatBody.appendChild(userMessage);

    // Limpiar el campo de entrada y actualizar el botón de enviar
    document.getElementById('user-input').value = '';
    toggleSendButton();
    saveChatToLocalStorage();

    try {
      showLoading(); // Mostrar un loader mientras se procesa la solicitud

      // Preparar el endpoint con los parámetros
      const url = new URL('https://api.servidorchatbot.com/api/v1/openai/chat-with-assistant');
      const params = {
        message: messageText,
        isVoiceMessage: isVoiceMessage // Flag para indicar si es un mensaje de voz
      };

      Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

      // Llamar al backend con el mensaje del usuario (método GET)
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json(); // Obtener la respuesta en formato JSON
      hideLoading(); // Ocultar el loader

      // Mostrar la respuesta en el chat
      const textResponse = data.answer || data.response || ''; // Priorizar 'answer', luego 'response'

      if (textResponse) {
        const botMessage = document.createElement('div');
        botMessage.className = 'bot-message';
        botMessage.textContent = textResponse;
        chatBody.appendChild(botMessage);
        chatBody.scrollTop = chatBody.scrollHeight; // Desplazar el chat hacia abajo

        // Si el mensaje es de voz, llamar al endpoint de generación de audio
        // ... código anterior ...

if (isVoiceMessage) {
  try {
    // Prepara la URL con el parámetro 'text' en la cadena de consulta
    const audioRequestUrl = new URL('https://api.servidorchatbot.com/api/v1/openai/generate-audio-2');
    audioRequestUrl.searchParams.append('text', textResponse);

    // Realiza la solicitud al endpoint de generación de audio
    const audioResponse = await fetch(audioRequestUrl, {
      method: 'POST', // Según la documentación, el método es POST
      headers: {
        // No es necesario 'Content-Type' ya que no enviamos cuerpo
      },
      body: null // No se envía cuerpo en la solicitud
    });

    if (!audioResponse.ok) {
      // Manejo de errores
      const errorText = await audioResponse.text();
      console.error('Error al generar el audio:', errorText);
      // Puedes mostrar un mensaje de error al usuario si es necesario
      const errorMessage = document.createElement('div');
      errorMessage.className = 'bot-message';
      errorMessage.textContent = 'Hubo un error al generar el audio. Por favor, inténtalo de nuevo.';
      chatBody.appendChild(errorMessage);
    } else {
      // Leer la respuesta como Blob
      const audioBlob = await audioResponse.blob();
      const audioObjectUrl = URL.createObjectURL(audioBlob);

      // Agregar un botón para reproducir el audio
      const playButton = document.createElement('button');
      playButton.textContent = "Reproducir Audio";
      playButton.className = 'audio-play-button';
      playButton.onclick = () => playAudio(audioObjectUrl);
      botMessage.appendChild(playButton);

      // Opcional: Puedes reproducir el audio automáticamente
      // playAudio(audioObjectUrl);
    }

  } catch (audioError) {
    console.error('Error al generar el audio:', audioError);
    // Mostrar mensaje de error al usuario si es necesario
    const errorMessage = document.createElement('div');
    errorMessage.className = 'bot-message';
    errorMessage.textContent = 'Ocurrió un error al procesar el audio.';
    chatBody.appendChild(errorMessage);
  }
}

// ... código posterior ...

      } else {
        const errorMessage = document.createElement('div');
        errorMessage.className = 'bot-message';
        errorMessage.textContent = 'No se recibió respuesta válida del backend.';
        chatBody.appendChild(errorMessage);
      }

    } catch (error) {
      console.error('Error al enviar el mensaje:', error);
      hideLoading();

      const errorMessage = document.createElement('div');
      errorMessage.className = 'bot-message';
      errorMessage.textContent = 'Hubo un error al procesar tu mensaje. Inténtalo más tarde.';
      chatBody.appendChild(errorMessage);
      chatBody.scrollTop = chatBody.scrollHeight;
    }
  }
}

// Función para reproducir el audio
function playAudio(audioUrl) {
  const audio = new Audio(audioUrl);
  audio.play().catch(error => {
    console.error('Error al reproducir el audio:', error);
    // Puedes mostrar un mensaje al usuario si es necesario
  });
}
// Mostrar un loader
function showLoading() {
  const chatBody = document.getElementById('chat-body');
  const loading = document.createElement('div');
  loading.className = 'bot-message loading';
  loading.textContent = 'Cargando...';
  chatBody.appendChild(loading);
}

// Ocultar el loader
function hideLoading() {
  const loading = document.querySelector('.loading');
  if (loading) loading.remove();
}

// Desactivar/activar el botón de enviar
function toggleSendButton() {
  const input = document.getElementById('user-input').value;
  const sendBtn = document.getElementById('send-btn');
  sendBtn.disabled = input.trim().length === 0;
}

// Reiniciar el chat
function restartChat() {
  localStorage.removeItem('chatHistory');  // Limpiar historial guardado
  const chatBody = document.getElementById('chat-body');
  chatBody.innerHTML = `
    <div id="initial-message">
      <p>Hi, I'm your shopping assistant. I can help you with...</p>
      <div class="preloaded-messages">
        <button onclick="sendPreloadedMessage('Help me find a gift')">Help me find a gift</button>
        <button onclick="sendPreloadedMessage('I want vegan products')">I want vegan products</button>
        <button onclick="sendPreloadedMessage('I am looking for running shoes')">I am looking for running shoes</button>
      </div>
    </div>
  `;
}