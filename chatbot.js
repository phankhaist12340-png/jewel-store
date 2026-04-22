// Chatbot Functions
let chatbotOpen = false;

function toggleChatbot() {
  const window = document.getElementById('chatbotWindow');
  chatbotOpen = !chatbotOpen;
  if (chatbotOpen) {
    window.classList.add('active');
  } else {
    window.classList.remove('active');
  }
}

function sendMessage() {
  const input = document.getElementById('chatbotInput');
  const message = input.value.trim();
  if (message) {
    addMessage(message, 'user');
    input.value = '';
    setTimeout(() => {
      respondToMessage(message);
    }, 500);
  }
}

function sendQuickReply(text) {
  addMessage(text, 'user');
  setTimeout(() => {
    respondToMessage(text);
  }, 500);
}

function handleKeyPress(event) {
  if (event.key === 'Enter') {
    sendMessage();
  }
}

function addMessage(text, type) {
  const messagesDiv = document.getElementById('chatbotMessages');
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${type}`;

  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.innerHTML = type === 'bot' ? 'WBS' : '<i class="fa-regular fa-user"></i>';

  const content = document.createElement('div');
  content.className = 'message-content';
  content.textContent = text;

  messageDiv.appendChild(avatar);
  messageDiv.appendChild(content);
  messagesDiv.appendChild(messageDiv);

  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function respondToMessage(userMessage) {
  const message = userMessage.toLowerCase();
  let response = '';
  const productPageUrl = 'http://127.0.0.1:5501/index.html';

  if (message.includes('chào') || message.includes('hello') || message.includes('xin chào')) {
    response = 'Xin chào! Rất vui được hỗ trợ bạn. Bạn cần tư vấn về sản phẩm nào?';
  } else if (message.includes('xem sản phẩm') || message.includes('sản phẩm cửa hàng')) {
    response = `Link sản phẩm: ${productPageUrl}`;
  } else if (message.includes('liên hệ hotline') || message.includes('hotline') || message.includes('số điện thoại')) {
    response = 'Hotline của WBS: 0123456789\n\nBạn có thể gọi để được tư vấn về:\n• Sản phẩm\n• Đơn hàng\n• Chính sách đổi trả\n• Vận chuyển\n\nThời gian hỗ trợ: 8:00 - 22:00 hàng ngày';
  } else if (message.includes('hot') || message.includes('nổi bật') || message.includes('bán chạy')) {
    response = 'Hiện tại các sản phẩm đang hot tại WBS:\n• Nhẫn kim cương\n• Nhẫn bạc\n• Dây chuyền vàng\n• Dây chuyền bạc\n\nBạn muốn xem chi tiết sản phẩm nào?';
  } else if (message.includes('giá') || message.includes('price') || message.includes('bao nhiêu')) {
    response = `Bạn quan tâm sản phẩm nào?\nBạn có thể xem giá chi tiết tại: ${productPageUrl}`;
  } else if (message.includes('đổi trả') || message.includes('hoàn') || message.includes('return')) {
    response = 'Chính sách đổi trả tại WBS:\n• Đổi trả miễn phí trong 7 ngày\n• Sản phẩm phải còn Hóa đơn mua hàng\n• Áp dụng cho sản phẩm bị lỗi do nhà cung cấp\n\nBạn có cần hỗ trợ thêm gì không?';
  } else if (message.includes('vận chuyển') || message.includes('ship') || message.includes('giao hàng')) {
    response = 'Thông tin vận chuyển:\n• Miễn phí ship cho đơn hàng trên 100.000vn₫\n• Thời gian giao hàng: 2-CN ngày làm việc\n• Hỗ trợ giao hàng toàn quốc';
  } else if (message.includes('cảm ơn') || message.includes('thanks')) {
    response = 'Không có gì! Chúc bạn mua sắm vui vẻ tại WBS. Nếu cần hỗ trợ thêm, cứ liên hệ tôi nhé! 😊';
  } else {
    response = 'Xin lỗi, mình chưa hiểu rõ. Bạn có thể hỏi về:\n• Sản phẩm hot\n• Giá cả\n• Chính sách đổi trả\n• Vận chuyển\n• Liên hệ hotline\n\nHoặc gõ "Xem sản phẩm" để lấy link sản phẩm.';
  }

  addMessage(response, 'bot');

  // Thêm quick replies cho một số câu trả lời
  if (message.includes('hot') || message.includes('giá')) {
    setTimeout(() => {
      const messagesDiv = document.getElementById('chatbotMessages');
      const quickDiv = document.createElement('div');
      quickDiv.className = 'message bot';
      quickDiv.innerHTML = `
        <div class="message-avatar">WBS</div>
        <div>
          <div class="quick-replies">
            <span class="quick-reply" onclick="sendQuickReply('Xem sản phẩm')">Xem sản phẩm</span>
            <span class="quick-reply" onclick="sendQuickReply('Liên hệ hotline')">Liên hệ hotline</span>
          </div>
        </div>
      `;
      messagesDiv.appendChild(quickDiv);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }, 300);
  }
}

