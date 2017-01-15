// エントリポイント
// やっていることはほとんどウィンドウのとメニューの作成
// 主な仕事はindex.jsにおまかせ

'use strict';

var app = require('electron').app;
var BrowserWindow = require('electron').BrowserWindow;
var Menu = require('electron').Menu;
var Shell = require('electron').shell;
var dialog = require('electron').dialog;
var fs = require('fs');
var fileUtil = require('./lib/fileUtil');
var path = require('path');

const {crashReporter} = require('electron');
crashReporter.start({
  productName: 'mdpreview',
  companyName: 'LibroWorks',
  submitURL: 'htp://www.libroworks.co.jp',
  autoSubmit: false
});

var mainWindow = null;
var openfile = null;

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
              openfile = filenames[0];
            }
        });
      }},
      { label: '改ページプレビューPDF書き出し', accelerator: 'CmdOrCtrl+P', click: function(){
        printToPDF1();
      }},
      { label: 'Vivliostyle Viewer PDF書き出し', accelerator: 'CmdOrCtrl+shift+P', click: function(){
        printToPDF_VS();
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

// 簡易PDF書き出し（ノンブルが入らない）
function printToPDF1(){
  if(openfile==null) return false;
  // 「ファイルを開く」ダイアログの呼び出し
  dialog.showSaveDialog(
    {
      title: '簡易PDF書き出し',
      defaultpath: openfile,
      properties: ['openFile'],
      filters:[{name: 'PDF', extensions: ['pdf']}]
    },
    //PDFファイルを書き出す処理
    function (filename){
      if(!filename) return;
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
              marginsType: 1,
              pageSize: 'A4', // CSSの@page指定が優先
              printBackground: true,
              printSelectionOnly: false,
              landscape: false
            }, 
            function(error, data){
              if (error) {
                dialog.showMessageBox({
                  title: '簡易PDF書き出し',
                  message: 'PDF書き出しに失敗しました',
                  type: 'error'
                });
                throw error;
              }
              console.log('pdf writing');
              fs.writeFile(filename, data, function(error){
                if (error) {
                  dialog.showMessageBox({
                    title: '簡易PDF書き出し',
                    message: 'PDF書き出しに失敗しました',
                    type: 'error'
                  });
                  throw error;
                }
                console.log('pdf finish');
              });
              // 書き出しが終了したらダイアログを閉じる
              setTimeout(function(){
                dialog.showMessageBox({
                  title: '簡易PDF書き出し',
                  message: 'PDFを書き出しました',
                  type: 'info'
                });
                previewWindow.close();
              }, 100);
          });
        },1000);
      });
  });
}

// Vivliostyle版のPDF書き出し
function printToPDF_VS(){
  if(openfile==null) return false;
  // 「ファイルを開く」ダイアログの呼び出し
  dialog.showSaveDialog(
    {
      title: 'VivliostyleプレビューのPDF書き出し',
      defaultpath: openfile,
      properties: ['openFile'],
      filters:[{name: 'PDF', extensions: ['pdf']}]
    },
    //PDFファイルを書き出す処理
    function (filename){
      if(!filename) return;
      // markdownからhtmlファイルを作成
      var htmlfilepath = fileUtil.convertMarkdown(openfile);
      var previewWindow = new BrowserWindow({width: 640, height: 480});
      var l = htmlfilepath.lastIndexOf(path.sep);
      previewWindow.loadURL('http://localhost:8080/viewer/vivliostyle-viewer.html#x=../' + htmlfilepath.substr(l+1));
      // 読み込みが完了したらPDF出力
      previewWindow.webContents.on('did-finish-load', function(){
        console.log('start gen pdf');
        setTimeout(function(){
          previewWindow.webContents.printToPDF(
            {
              marginsType: 1,
              pageSize: 'A4', // CSSの@page指定が優先
              printBackground: true,
              printSelectionOnly: false,
              landscape: false
            }, 
            function(error, data){
              if (error) {
                dialog.showMessageBox({
                  title: 'VivliostyleプレビューのPDF書き出し',
                  message: 'PDF書き出しに失敗しました',
                  type: 'error'
                });
                throw error;
              }
              console.log('pdf writing');
              fs.writeFile(filename, data, function(error){
                if (error) {
                  dialog.showMessageBox({
                    title: 'VivliostyleプレビューのPDF書き出し',
                    message: 'PDF書き出しに失敗しました',
                    type: 'error'
                  });
                  throw error;
                }
                console.log('pdf finish');
              });
              // 書き出しが終了したらダイアログを閉じる
              setTimeout(function(){
                dialog.showMessageBox({
                  title: '改ページプレビューのPDF書き出し',
                  message: 'PDFを書き出しました',
                  type: 'info'
                });
                previewWindow.close();
              }, 100);
          });
        },60000); // setTimeout
      });
  });
}
