(function () {
  var greeting = document.getElementById('client-welcome-greeting');
  if (!greeting) return;

  var name = '';
  try {
    name = (sessionStorage.getItem('hbc_customer_first_name') || '').trim();
  } catch (e) {}

  if (!name) {
    greeting.textContent = 'Welcome!';
    return;
  }

  var safeName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  greeting.textContent = 'Welcome ' + safeName + '!';
})();
