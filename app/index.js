// index.htmlから呼び出されるjs
// ほとんどの処理はここと下請けのfileUtilでやっている

'use strict';

var remote = require('remote');
var fileUtil = remote.require('./lib/fileUtil');

// URLからクエリテキストのopenfileを取得
var matched = location.search.match(/openfile=([^&]*)/);
var openfile = matched && decodeURIComponent(matched[1]);
// ファイル監視
var chokidar = require('chokidar');
var watcher = null;

// プロセス間通信
var ipc = require('electron').ipcRenderer;

// 作業フォルダ取得
if(openfile){
    // markdownからhtmlファイルを作成
    var htmlfilepath = fileUtil.convertMarkdown(openfile);
    // console.log('file://' + htmlfilepath);   
    
    // iframeに読み込む
    var iframe =  document.getElementById('html-preview');
    iframe.src = 'file://' + htmlfilepath;

    // iframeの高さを目一杯にしたい
    // TODO: 本当はタブ幅の分ちゃんと削りたいけどよくわからないので-100px固定
    var dh = window.innerHeight ;
    iframe.style.height = (dh - 80) + 'px';
    
    // 監視の準備
    watcher = chokidar.watch(openfile);
    // Markdownファイルが更新されたらHTMLを作り直してリロードする
    watcher.on('change', function(path){
        // console.log('change: ' + path);
        fileUtil.convertMarkdown(openfile);
        document.getElementById('html-preview').contentDocument
            .location.reload(true);
    });
}

// ウィンドウリサイズ対応
window.onresize = function(){
    var iframe =  document.getElementById('html-preview');
    var dh = window.innerHeight ;
    // TODO: 本当はタブ幅の分ちゃんと削りたいけどよくわからないので-100px固定
    iframe.style.height = (dh - 80) + 'px';    
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
    }

});

// angularの使用準備
var ngModule = angular.module('mdpreview', ['ui.bootstrap']);

ngModule.controller('MainController', function($scope){
    var main = this;
    
    main.openfile = openfile; 
    // ファイルを取得
    if(main.openfile){
        main.fileText = fileUtil.getAsText(main.openfile);
    }
});

// <div md-preview="main.fileText"></div>と書くとそこに表示されるらしい
ngModule.directive('mdPreview', function () {
    return function ($scope, $elem, $attrs) {
        $scope.$watch($attrs.mdPreview, function(source) {
            //マークダウンテキストをpreで囲んで表示 
            $elem.html('<pre class="source-md"></pre>').find("pre").text(source);
        });
    };
});

