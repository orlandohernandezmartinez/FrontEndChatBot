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

// Definir la función extractImageUrl antes de sendMessage
function extractImageUrl(text) {
  // Expresión regular para detectar imágenes en formato Markdown, incluyendo saltos de línea
  const markdownImageRegex = /!\[.*?\]\((https?:\/\/.*?\.(?:png|jpg|jpeg|gif)[^\)]*)\)/is;
  const matches = markdownImageRegex.exec(text);
  return matches ? matches[1] : null; // Devuelve la URL capturada o null si no hay coincidencias
}

// Función para eliminar formato Markdown
function removeMarkdown(text) {
  return text
    .replace(/!\[.*?\]\(.*?\)/gis, '') // Eliminar imágenes en formato Markdown
    .replace(/\[.*?\]\(.*?\)/gis, '')  // Eliminar enlaces en formato Markdown
    .replace(/[*_~`]+/g, '')          // Eliminar caracteres de formato
    .replace(/>{1,}/g, '')            // Eliminar citas
    .replace(/#{1,6}\s*/g, '')        // Eliminar encabezados
    .replace(/\n+/g, ' ')             // Reemplazar saltos de línea por espacios
    .trim();
}

async function sendMessage(messageText, isVoiceMessage = false) {
  const chatBody = document.getElementById('chat-body');

  if (messageText.length > 0) {
    // Crear el mensaje del usuario y agregarlo al cuerpo del chat
    const userMessage = document.createElement('div');
    userMessage.className = 'user-message';
    userMessage.textContent = messageText;
    chatBody.appendChild(userMessage);

    // Desplazar el chat hacia abajo después de agregar el mensaje del usuario
    chatBody.scrollTop = chatBody.scrollHeight;

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
        method: 'GET'
        // No es necesario el encabezado 'Content-Type' para una solicitud GET sin cuerpo
      });

      const data = await response.json(); // Obtener la respuesta en formato JSON
      hideLoading(); // Ocultar el loader

      // Mostrar la respuesta en el chat
      const textResponse = data.answer || data.response || ''; // Priorizar 'answer', luego 'response'
      
        if (textResponse) {
          const botMessage = document.createElement('div');
          botMessage.className = 'bot-message';
      
          let processedText = textResponse;
      
          // 1. Detectar y eliminar la imagen en formato Markdown si existe
          const imageUrl = extractImageUrl(processedText);
          if (imageUrl) {
            // Eliminar la imagen en formato Markdown del texto
            const markdownImageRegex = /!$begin:math:display$.*?$end:math:display$$begin:math:text$.*?$end:math:text$/gis;
  processedText = processedText.replace(markdownImageRegex, '').trim();
          }
      
          // 2. Detectar y eliminar la URL de checkout si existe
          const checkoutUrlRegex = /(https?:\/\/mayyalimitless\.com\/cart\/[^\s]*)/gi;
          const checkoutUrlMatch = checkoutUrlRegex.exec(processedText);
      
          if (checkoutUrlMatch) {
            const checkoutUrl = checkoutUrlMatch[1];
      
            // Validar la URL de checkout
            if (checkoutUrl.startsWith('https://mayyalimitless.com/cart/')) {
              // Eliminar la URL del texto
              processedText = processedText.replace(checkoutUrl, '').trim();
      
              // Crear y agregar el botón de checkout
              const checkoutButton = document.createElement('button');
              checkoutButton.textContent = "Finalizar compra";
              checkoutButton.className = 'checkout-button';
              checkoutButton.onclick = () => {
                window.open(checkoutUrl, '_blank');
              };
              botMessage.appendChild(checkoutButton);
            } else {
              console.error('URL de checkout no válida:', checkoutUrl);
              // Opcional: Puedes agregar un mensaje al usuario si lo deseas
            }
          }
      
          // 3. Eliminar cualquier formato Markdown restante del texto
          processedText = removeMarkdown(processedText);
      
          // 4. Agregar el texto restante al mensaje del bot
          if (processedText) {
            const textNode = document.createTextNode(processedText);
            botMessage.insertBefore(textNode, botMessage.firstChild);
          }
      
          // 5. Si hay una imagen, agregarla al mensaje del bot
          if (imageUrl) {
            const imageElement = document.createElement('img');
            imageElement.src = imageUrl;
            imageElement.alt = 'Imagen';
            imageElement.className = 'bot-image';
            botMessage.appendChild(imageElement);
          }
      
          // Agregar el mensaje completo al chat
          chatBody.appendChild(botMessage);
          chatBody.scrollTop = chatBody.scrollHeight;
      
          // 6. Generar audio si es necesario
          if (isVoiceMessage && processedText) {
            // Generar el audio utilizando 'processedText' (sin las URLs y sin formato Markdown)
            const audioRequestUrl = new URL('https://api.servidorchatbot.com/api/v1/openai/generate-audio-1');
            audioRequestUrl.searchParams.append('text', processedText);
      
            try {
              const audioResponse = await fetch(audioRequestUrl, {
                method: 'POST'
              });
      
              if (!audioResponse.ok) {
                // Manejo de errores
                const errorText = await audioResponse.text();
                console.error('Error al generar el audio:', errorText);
                // Mostrar mensaje de error al usuario
                const errorMessage = document.createElement('div');
                errorMessage.className = 'bot-message';
                errorMessage.textContent = 'Hubo un error al generar el audio. Por favor, inténtalo de nuevo.';
                chatBody.appendChild(errorMessage);
                chatBody.scrollTop = chatBody.scrollHeight;
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
      
                // Desplazar el chat hacia abajo después de agregar el botón de reproducción
                chatBody.scrollTop = chatBody.scrollHeight;
              }
            } catch (audioError) {
              console.error('Error al generar el audio:', audioError);
              // Mostrar mensaje de error al usuario
              const errorMessage = document.createElement('div');
              errorMessage.className = 'bot-message';
              errorMessage.textContent = 'Ocurrió un error al procesar el audio.';
              chatBody.appendChild(errorMessage);
              chatBody.scrollTop = chatBody.scrollHeight;
            }
          }
      
        } else {
          // Manejo de error si no se recibió una respuesta válida
          const errorMessage = document.createElement('div');
          errorMessage.className = 'bot-message';
          errorMessage.textContent = 'No se recibió respuesta válida del backend.';
          chatBody.appendChild(errorMessage);
          chatBody.scrollTop = chatBody.scrollHeight;
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