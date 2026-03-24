/**
 * Alternate Services — coach & Minami reach-out
 * Send: opens default email app (mailto:). If that does not work, user can use Gmail or Outlook in the browser.
 */
(function () {
  'use strict';

  function gmailComposeUrl(to, subject, body) {
    return (
      'https://mail.google.com/mail/?view=cm&fs=1&to=' +
      encodeURIComponent(to) +
      '&su=' +
      encodeURIComponent(subject) +
      '&body=' +
      encodeURIComponent(body)
    );
  }

  function outlookComposeUrl(to, subject, body) {
    return (
      'https://outlook.live.com/mail/0/deeplink/compose?to=' +
      encodeURIComponent(to) +
      '&subject=' +
      encodeURIComponent(subject) +
      '&body=' +
      encodeURIComponent(body)
    );
  }

  function showFallback(afterEl, id, to, subject, body) {
    var el = document.getElementById(id);
    if (!el) {
      el = document.createElement('p');
      el.id = id;
      el.className = 'email-compose-fallback';
      el.setAttribute('role', 'note');
      afterEl.parentNode.insertBefore(el, afterEl.nextSibling);
    }
    el.hidden = false;
    el.textContent = '';
    el.appendChild(
      document.createTextNode(
        "If your email app didn't open, compose in your browser (you may need to sign in): "
      )
    );
    var aG = document.createElement('a');
    aG.href = gmailComposeUrl(to, subject, body);
    aG.target = '_blank';
    aG.rel = 'noopener noreferrer';
    aG.textContent = 'Gmail';
    el.appendChild(aG);
    el.appendChild(document.createTextNode(' · '));
    var aO = document.createElement('a');
    aO.href = outlookComposeUrl(to, subject, body);
    aO.target = '_blank';
    aO.rel = 'noopener noreferrer';
    aO.textContent = 'Outlook.com';
    el.appendChild(aO);
    el.appendChild(document.createTextNode('.'));
  }

  var select = document.getElementById('coach-select');
  var emailBox = document.getElementById('coach-email');
  var messageBox = document.getElementById('session-message');
  var sendBtn = document.getElementById('open-email');

  if (select && emailBox && sendBtn) {
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
        alert("Please select a coach or enter your trainer's email.");
        return;
      }
      var subject = 'Training inquiry — Houston Badminton Center';
      var messageText =
        messageBox && messageBox.value
          ? messageBox.value.trim()
          : "Hi, I'm interested in scheduling a training session. Please let me know your availability.";
      window.location.href =
        'mailto:' +
        to +
        '?subject=' +
        encodeURIComponent(subject) +
        '&body=' +
        encodeURIComponent(messageText);
      showFallback(sendBtn, 'coach-email-fallback', to, subject, messageText);
    });
  }

  var minamiSend = document.getElementById('minami-send');
  var minamiMessage = document.getElementById('minami-message');
  if (minamiSend) {
    minamiSend.addEventListener('click', function () {
      var to = 'minami.hm33@gmail.com';
      var subject = 'Massage session inquiry — Houston Badminton Center';
      var messageText =
        minamiMessage && minamiMessage.value
          ? minamiMessage.value.trim()
          : "Hi Mika, I'd like to inquire about booking a massage session. Please let me know your availability.";
      window.location.href =
        'mailto:' +
        to +
        '?subject=' +
        encodeURIComponent(subject) +
        '&body=' +
        encodeURIComponent(messageText);
      showFallback(minamiSend, 'minami-email-fallback', to, subject, messageText);
    });
  }
})();
