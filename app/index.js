// index.htmlから呼び出されるjs
// ほとんどの処理はここと下請けのfileUtilでやっている

'use strict';

var remote = require('electron').remote;
var fileUtil = remote.require('./lib/fileUtil');

// URLからクエリテキストのopenfileを取得
var matched = location.search.match(/openfile=([^&]*)/);
var openfile = matched && decodeURIComponent(matched[1]);
var htmlfilepath = '';
// ファイル監視
var chokidar = require('chokidar');
var watcher = null;
// サーバ
var nodeStatic = require('node-static');
var http = require('http');
var path = require('path');

// プロセス間通信
var ipc = require('electron').ipcRenderer;

var clipboard = require('electron').clipboard;
// var dialog = require('dialog');

// 作業フォルダ取得
if(openfile){
    try{
        // markdownからhtmlファイルを作成
        htmlfilepath = fileUtil.convertMarkdown(openfile);
        // console.log('file://' + htmlfilepath);   

        // iframeに読み込む
        var iframe =  document.getElementById('html-preview');
        iframe.src = 'file://' + htmlfilepath;

        // iframeの高さを目一杯にしたい
        // TODO: 本当はタブ幅の分ちゃんと削りたいけどよくわからないので-100px固定
        var dh = window.innerHeight ;
        iframe.style.height = (dh - 50) + 'px';
                
        // 監視の準備
        watcher = chokidar.watch(openfile);
        // Markdownファイルが更新されたらHTMLを作り直してリロードする
        watcher.on('change', function(path){
            if(htmlfilepath === '') return;
            // console.log('change: ' + path);
            fileUtil.convertMarkdown(openfile);
            var tabid = $('.nav-tabs .active a').attr('href');
            // alert('tabid: ' + tabid);
            if(tabid == '#tab1'){
                document.getElementById('html-preview').contentDocument
                    .location.reload(true);
            } else {
                document.getElementById('vs-preview').contentDocument
                    .location.reload(true);
            }
        });        

        // サーバを起動
        var l = htmlfilepath.lastIndexOf(path.sep);
        var workfolder = htmlfilepath.substring(0, l);    
        var file = new nodeStatic.Server(workfolder, { cache: 0 });
        http.createServer(function (request, response) {
            request.addListener('end', function () {
                file.serve(request, response);
            }).resume();
        }).listen(8080);
        var vsiframe =  document.getElementById('vs-preview');
        vsiframe.src = 'http://localhost:8080/viewer/vivliostyle-viewer.html#x=../' + htmlfilepath.substr(l+1);
        vsiframe.style.height = (dh - 50) + 'px';
        console.log(vsiframe.src);
    } catch(err){
        console.log(err.message);
        htmlfilepath = '';
    }
}

// ウィンドウリサイズ対応
window.onresize = function(){
    var iframe =  document.getElementById('html-preview');
    var dh = window.innerHeight ;
    // TODO: 本当はタブ幅の分ちゃんと削りたいけどよくわからないので-100px固定
    iframe.style.height = (dh - 50) + 'px';    
    var vsiframe =  document.getElementById('vs-preview');
    vsiframe.style.height = (dh - 50) + 'px';   
    // TODO: リサイズ時のリロードを止める　できれば警告を表示したい
    // vsiframe.contentDocument.location.reload(true);
}

// 非同期でメインプロセスからのメッセージを受信する
var g_zoomrate = 1.0;
ipc.on('main-process-message', function(event, arg) {
    console.log(arg);
    if(arg == 'Zoom In'){
        //HTMLプレビューの拡大
        var iframe = document.getElementById('html-preview');
        g_zoomrate += 0.25;
        if(g_zoomrate > 6.0) g_zoomrate = 6.0;
        iframe.style.transformOrigin = '0 0';
        iframe.style.transform = 'scale('+ g_zoomrate + ')';        
    } else if(arg == 'Zoom Out'){
        //HTMLプレビューの縮小
        var iframe = document.getElementById('html-preview');
        g_zoomrate -= 0.25;
        if(g_zoomrate < 1.0) g_zoomrate = 1.0;
        iframe.style.transformOrigin = '0 0';
        iframe.style.transform = 'scale('+ g_zoomrate + ')';        
    } else if(arg== 'VSPreview Reload'){
        var vsiframe =  document.getElementById('vs-preview');
        vsiframe.contentDocument.location.reload(true);        
    } else if(arg== 'Print URL'){
        clipboard.writeText('http://localhost:8080/viewer/vivliostyle-viewer.html#x=../' + htmlfilepath.substr(l+1));    
        console.log('http://localhost:8080/viewer/vivliostyle-viewer.html#x=../' + htmlfilepath.substr(l+1));     
    } else if(arg== 'Export XML'){
        if(htmlfilepath) fileUtil.exportInDesignXML(htmlfilepath);
    }

});
