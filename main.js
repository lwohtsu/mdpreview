// エントリポイント
// やっていることはほとんどウィンドウのとメニューの作成
// 主な仕事はindex.jsにおまかせ

'use strict';

var app = require('app');
var BrowserWindow = require('browser-window');
var Menu = require('menu');
var Shell = require('electron').shell;

require('crash-reporter').start({
  productName: 'mdpreview',
  companyName: 'Libroworks',
  submitURL: 'htp://www.libroworks.co.jp',
  autoSubmit: false
});

var mainWindow = null;

app.on('window-all-closed', function() {
  if (process.platform != 'darwin')
    app.quit();
});

// 起動時にウィンドウを開く
app.on('ready', function() {
  Menu.setApplicationMenu(menu);
  
  // ブラウザ(Chromium)の起動, 初期画面のロード
  mainWindow = new BrowserWindow({width: 800, height: 600});
  mainWindow.loadURL('file://' + __dirname + '/index.html');

  mainWindow.on('closed', function() {
    mainWindow = null;
  });

  // _blankリンクをブラウザで開く
  mainWindow.webContents.on('new-window', function(event, url){
    event.preventDefault();
    Shell.openExternal(url);
  });

});



// メニュー情報の作成
var template = [
  {
    label: 'MDPreview',
    submenu: [
      {label: 'Quit', accelerator: 'Command+Q', click: function () {app.quit();}}
    ]
  }, {
    label: 'File',
    submenu: [
      {label: 'Open', accelerator: 'Command+O', click: function() {
        // 「ファイルを開く」ダイアログの呼び出し
        require('dialog').showOpenDialog(
          {
            properties: ['openFile'], 
            filters:[{name: 'Markdown', extensions: ['md']}]
          }, 
          //ファイルを開く処理
          function (filenames){
            if(filenames && filenames[0]){
              mainWindow.loadURL('file://' + __dirname + '/index.html?openfile=' + encodeURIComponent(filenames[0]));              
            }
        });
      }}
    ]
  }, {
    label: 'View',
    submenu: [
      { label: 'Reload', accelerator: 'Command+R', click: function() { mainWindow.webContents.reloadIgnoringCache(); } },
      { label: 'Toggle DevTools', accelerator: 'Alt+Command+I', click: function() { mainWindow.toggleDevTools(); } }
    ]
  }
];

var menu = Menu.buildFromTemplate(template);