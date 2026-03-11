/**
 * Client Alternate Services — coach reach-out form
 * Prefills "To" from coach dropdown; Send opens mailto with user email and message.
 */
(function () {
  'use strict';

  var select = document.getElementById('coach-select');
  var emailBox = document.getElementById('coach-email');
  var messageBox = document.getElementById('session-message');
  var sendBtn = document.getElementById('open-email');

  if (!select || !emailBox || !sendBtn) return;

  var PERSONAL_TRAINER = 'personal-trainer';

  function updateToField() {
    var val = select.value;
    if (val === PERSONAL_TRAINER) {
      emailBox.value = '';
      emailBox.readOnly = false;
      emailBox.placeholder = "Enter your trainer's email";
    } else {
      emailBox.value = val || '';
      emailBox.readOnly = true;
      emailBox.placeholder = "Select a coach above or enter your trainer's email";
    }
  }

  select.addEventListener('change', updateToField);

  sendBtn.addEventListener('click', function () {
    var to = emailBox.value ? emailBox.value.trim() : '';
    if (!to) {
      alert('Please select a coach or enter your trainer\'s email.');
      return;
    }
    var subject = encodeURIComponent('Training inquiry — Houston Badminton Center');
    var messageText = (messageBox && messageBox.value) ? messageBox.value.trim() : 'Hi, I\'m interested in scheduling a training session. Please let me know your availability.';
    var body = encodeURIComponent(messageText);
    window.location.href = 'mailto:' + to + '?subject=' + subject + '&body=' + body;
  });

  // Minami Massage — Send opens mailto to Mika
  var minamiSend = document.getElementById('minami-send');
  var minamiMessage = document.getElementById('minami-message');
  if (minamiSend) {
    minamiSend.addEventListener('click', function () {
      var to = 'minami.hm33@gmail.com';
      var subject = encodeURIComponent('Massage session inquiry — Houston Badminton Center');
      var messageText = (minamiMessage && minamiMessage.value) ? minamiMessage.value.trim() : 'Hi Mika, I\'d like to inquire about booking a massage session. Please let me know your availability.';
      var body = encodeURIComponent(messageText);
      window.location.href = 'mailto:' + to + '?subject=' + subject + '&body=' + body;
    });
  }
})();
