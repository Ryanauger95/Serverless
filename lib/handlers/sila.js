const sila = require('sila-sdk');

// sila.configure({
//   'key': '5F1B3A0493A3467E568F07115FDC74CC709B8F192866A34A41C86EBEC9670712',
//   'handle': 'escrow_dapp.app.silamoney.eth',
// });
sila.configure({
  key: '1B43787AED2CCE96356B2678BBCA845D4D38239FEDF8043D52B55D269880437F',
  handle: 'avery001_testapp1.app.silamoney.eth',
});

fboHandle = 'ryan.test.silamoney.eth';

module.exports = {sila, fboHandle};
