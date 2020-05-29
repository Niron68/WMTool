const { app, BrowserWindow } = require('electron');

function createWindow () {
    let win = new BrowserWindow({
      width: 1280,
      height: 720,
      webPreferences: {
        nodeIntegration: true
      }
    })
  
    win.loadFile('indexBis.html');
    win = null;
}
  
  app.whenReady().then(createWindow)
  
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  })
  
  app.on('activate', () => {
    if (win === null) {
      createWindow();
    }
  })