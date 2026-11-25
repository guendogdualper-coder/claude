// Seelenstein – Desktop-App: kleine Brücke ins Spiel (nur Hauptfenster, siehe main.js)
//
// Das Spiel findet window.seelensteinDesktop.benachrichtigungen und plant darüber Erinnerungen als Windows-Systemmeldung
// (js/benachrichtigung.js im Spiel, Zeitgeber in meldungen.js). Mehr gibt es hier nicht: kein Node, keine Dateien.
// Der Hauptprozess nimmt Aufträge nur vom Spiel im Hauptfenster an (eigene Domain).

'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('seelensteinDesktop', {
  benachrichtigungen: {
    unterstuetzt: () => ipcRenderer.invoke('benachrichtigungen:unterstuetzt'),
    planen: (liste) => ipcRenderer.invoke('benachrichtigungen:planen', liste),
    loeschen: () => ipcRenderer.invoke('benachrichtigungen:loeschen')
  }
});
