let countingInterval;
let seconds = 0;
let mediaRecorder;
let audioChunks = [];
let micPermissionGranted = false;
let stream = null;  // Agregado para manejar el stream de audio

document.addEventListener("DOMContentLoaded", function () {
  const micBtn = document.getElementById('mic-btn');
  const chatBtn = document.querySelector('.chatbot-btn');
  const closeBtn = document.querySelector('.close-btn');
  const sendBtn = document.getElementById('send-btn');
  const preloadedBtns = document.querySelectorAll('.preloaded-messages button');
  

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

// Iniciar la grabación de audio y el conteo de tiempo
function startRecordingAndCounting() {
  const micBtn = document.getElementById('mic-btn');
  const micIcon = micBtn.querySelector('i');
  const userInput = document.getElementById('user-input');

  // Cambiar el ícono del micrófono a rojo
  micBtn.classList.add('active');
  micIcon.style.color = 'red';

  // Iniciar la grabación
  startRecording();

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

  // Detener la grabación
  stopRecording();
}

// Funciones para la grabación de audio
function startRecording() {
  console.log("Iniciando grabación...");
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(audioStream => {
      stream = audioStream;
      mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = event => {
        audioChunks.push(event.data);
      };

      mediaRecorder.start();
      console.log("Grabación iniciada.");
    })
    .catch(error => console.error("Error al acceder al micrófono:", error));
}

function stopRecording() {
  const chatBody = document.getElementById('chat-body');  // Añadir esta línea al inicio
  console.log("Deteniendo grabación...");

  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    
    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.wav');

      audioChunks = [];

      // Enviar el audio al backend para transcripción
      fetch('https://api.servidorchatbot.com//api/v1/openai/generate-audio-1', {
        method: 'POST',
        body: formData
      })
      .then(response => response.json())
      .then(data => {
        console.log("Grabación detenida:", data.message);
        if (data.transcription) {
          showTranscriptionInChat(data.transcription);  // Mostrar transcripción en el chat
          document.getElementById('user-input').value = data.transcription || '';
          toggleSendButton();
        } else {
          const errorMessage = document.createElement('div');
          errorMessage.className = 'bot-message';
          errorMessage.textContent = 'Hubo un error en la transcripción. Inténtalo de nuevo.';
          chatBody.appendChild(errorMessage);
        }

        // Verificar si existe una URL de audio en la respuesta
        if (data.audio_url) {
          const botMessage = document.createElement('div');
          botMessage.className = 'bot-message';
          botMessage.textContent = 'Reproducción disponible:';

          const playButton = document.createElement('button');
          playButton.textContent = "Reproducir Audio";
          playButton.className = 'audio-play-button';  // Clase CSS opcional
          playButton.onclick = () => playAudio(data.audio_url);
          botMessage.appendChild(playButton);

          chatBody.appendChild(botMessage);
          console.log("Botón de reproducción de audio agregado:", playButton);
        }
      })
      .catch(error => console.error('Error al detener la grabación:', error));
    };
    
    // Detener el stream de audio
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }
  } else {
    console.warn("No se puede detener la grabación: mediaRecorder no está inicializado o ya está inactivo.");
  }
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
async function sendMessage(messageText) {
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
      showLoading();  // Mostrar un loader mientras se procesa la solicitud

      // Llamar al backend con el mensaje del usuario
      const response = await fetch('https://api.servidorchatbot.com/api/v1/openai/chat-with-assistant?message=' + encodeURIComponent(messageText), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();  // Obtener la respuesta en formato JSON
      hideLoading();  // Ocultar el loader

      // Mostrar la respuesta en el chat
      const botMessage = document.createElement('div');
      botMessage.className = 'bot-message';
      botMessage.textContent = data.answer;  // Usar 'answer' para el mensaje de texto
      chatBody.appendChild(botMessage);
      chatBody.scrollTop = chatBody.scrollHeight;  // Desplazar el chat hacia abajo

      // Intentar extraer una URL de imagen desde el mensaje
      const imageUrl = extractImageUrl(data.answer);
      if (imageUrl) {
        // Si se encuentra una URL de imagen, renderizarla en el chat
        const imageElement = document.createElement('img');
        imageElement.src = imageUrl;
        imageElement.alt = "Imagen del producto";
        imageElement.style.maxWidth = '100%';  // Ajustar tamaño

        const imageContainer = document.createElement('div');
        imageContainer.className = 'image-message';  // Clase CSS opcional para estilo
        imageContainer.appendChild(imageElement);
        chatBody.appendChild(imageContainer);
        chatBody.scrollTop = chatBody.scrollHeight;  // Desplazar el chat hacia abajo
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

// **NUEVA Función para renderizar el cuadro del producto**
function renderProductBox() {
  const chatBody = document.getElementById('chat-body');

  // Crear el cuadro del producto clicable
  const productBox = document.createElement('div');
  productBox.style.width = '100px';
  productBox.style.height = '100px';
  productBox.style.backgroundColor = '#BABABA';
  productBox.style.marginTop = '10px';
  productBox.style.borderRadius = '5px';
  productBox.style.cursor = 'pointer'; // Hacer el cuadro clicable
  productBox.onclick = showProductView; // Abrir la vista de producto al hacer clic
  chatBody.appendChild(productBox);

  // Desplazar el chat hacia abajo
  chatBody.scrollTop = chatBody.scrollHeight;
}

// Función para mostrar la vista de producto
function showProductView() {
  const chatBody = document.getElementById('chat-body');
  chatBody.innerHTML = `
  <div class="product-view">
      <button class="back-btn" onclick="backToChat()">← Volver</button>
      <div class="product-box" style="background-color: #FFFFFF; width: 300px; height: 300px;"></div>
      <p class="product-name">Nombre del producto</p>
      <p class="product-price">$123.00</p>
      <p class="product-description-heading">Descripción</p>
      <p class="product-description-body">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus lacinia odio vitae vestibulum. Nulla facilisi. Sed cursus ante dapibus diam.</p>
      <div class="quantity-section">
          <span class="quantity-label">Cantidad</span>
          <div class="quantity-btns">
              <button class="quantity-btn" onclick="decreaseQuantity()">-</button>
              <span id="quantity-value">1</span>
              <button class="quantity-btn" onclick="increaseQuantity()">+</button>
          </div>
      </div>
      <button class="add-to-cart-btn">Agregar al carrito</button>
  </div>
  `;
}

// Función para regresar a la vista principal del chatbot
function backToChat() {
  restartChat(); // Volver al inicio del chat
}

// Función para aumentar la cantidad del producto
function increaseQuantity() {
  const quantityValue = document.getElementById('quantity-value');
  let quantity = parseInt(quantityValue.textContent);
  quantity++;
  quantityValue.textContent = quantity;
}

// Función para disminuir la cantidad del producto
function decreaseQuantity() {
  const quantityValue = document.getElementById('quantity-value');
  let quantity = parseInt(quantityValue.textContent);
  if (quantity > 1) {
      quantity--;
      quantityValue.textContent = quantity;
  }
}
// Función para reproducir el audio
function playAudio(audioUrl) {
  const audio = new Audio(audioUrl);
  audio.addEventListener('canplaythrough', () => {
    audio.play();
  });
  audio.load();  // Pre-carga el audio con el nuevo URL
}

// Función para añadir efecto visual cuando se reproduzca el audio
function addAudioEffect(messageElement) {
  messageElement.classList.add('playing-audio');
  const duration = 5000;  // Ajusta la duración si es necesario
  setTimeout(() => {
    messageElement.classList.remove('playing-audio');
  }, duration);
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