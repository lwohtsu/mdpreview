// エントリポイント
// やっていることはほとんどウィンドウのとメニューの作成
// 主な仕事はindex.jsにおまかせ

'use strict';

var app = require('electron').app;
var BrowserWindow = require('electron').BrowserWindow;
var Menu = require('electron').Menu;
var Shell = require('electron').shell;
var dialog = require('electron').dialog;

const {crashReporter} = require('electron');
crashReporter.start({
  productName: 'mdpreview',
  companyName: 'LibroWorks',
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
  mainWindow = new BrowserWindow({width: 800, height: 600, backgroundColor: '#fff'});
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
      {label: '終了', accelerator: 'CmdOrCtrl+Q', click: function () {app.quit();}}
    ]
  }, {
    label: 'ファイル',
    submenu: [
      {label: '開く', accelerator: 'CmdOrCtrl+O', click: function() {
        // 「ファイルを開く」ダイアログの呼び出し
        dialog.showOpenDialog(
          {
            properties: ['openFile'],
            filters:[{name: 'Markdown', extensions: ['md']}]
          },
          //ファイルを開く処理
          function (filenames){
            if(filenames && filenames[0]){
              if(mainWindow == null){
                  mainWindow = new BrowserWindow({width: 800, height: 600});
              }
              mainWindow.loadURL('file://' + __dirname + '/index.html?openfile=' + encodeURIComponent(filenames[0]));
            }
        });
      }},
      { label: '改ページプレビューPDF書き出し', accelerator: 'CmdOrCtrl+P', click: function(){
        printToPDF1();
      }},
      { label: 'InDesign用XMLを書き出し', click: function() { 
        mainWindow.webContents.send('main-process-message', 'Export XML'); 
      } }
    ]
  }, {
    label: '編集',
    submenu: [
      { label: '印刷用URLをコピー', click: function() { mainWindow.webContents.send('main-process-message', 'Print URL'); } }
    ]
  }, {
    label: 'ビュー',
    submenu: [
      { label: '全てのタブをリロード', accelerator: 'CmdOrCtrl+R', click: function() { mainWindow.webContents.reloadIgnoringCache(); } },
      { label: 'デベロッパーツールの表示／非表示', accelerator: 'Alt+CmdOrCtrl+I', click: function() { mainWindow.toggleDevTools(); } },
      { label: 'ズームイン', accelerator: 'CmdOrCtrl+Plus', click: function(){ mainWindow.webContents.send('main-process-message', 'Zoom In');}},
      { label: 'ズームアウト', accelerator: 'CmdOrCtrl+-', click: function(){ mainWindow.webContents.send('main-process-message', 'Zoom Out');}},
      { label: 'VSPreviewのみリロード', accelerator: 'CmdOrCtrl+Shift+R', click: function(){ mainWindow.webContents.send('main-process-message', 'VSPreview Reload');}}
    ]
  }
];

var menu = Menu.buildFromTemplate(template);


function printToPDF1(){
  if(openfile==null) return false;
  // markdownからhtmlファイルを作成
  var htmlfilepath = fileUtil.convertMarkdown(openfile);
  var previewWindow = new BrowserWindow({width: 640, height: 480});
  previewWindow.loadURL('file://' + htmlfilepath);
  // 読み込みが完了したらPDF出力
  previewWindow.webContents.on('did-finish-load', function(){
    console.log('start gen pdf');
    setTimeout(function(){
      previewWindow.webContents.printToPDF(
        {
          marginsType: 0,
          pageSize: 'A3',
          printBackground: true,
          printSelectionOnly: false,
          landscape: false
        }, 
        function(error, data){
          if(error) throw error;
          console.log('pdf writing');
          fs.writeFile('/Users/ohtsu/Documents/進行中/インプレスJS教本/10原稿/lw整理原稿/test.pdf', data, function(error){
            if (error) throw error;
            console.log('pdf finish');
          });
          setTimeout(function(){
            previewWindow.close();
          }, 100);
      });
    },1000);
  });

}
