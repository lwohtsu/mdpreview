'use strict';

var glob = require('glob');
var path = require('path');
var fs = require('fs');
var dialog = require('dialog');
// var grmarkdown = require('./markdown.js');
var marked = require('marked');
var hljs = require('highlight.js');
var _ = require('lodash');
var nativeImage = require('electron').nativeImage;

var fileUtil = {
  fetchReadmeList: function (baseDir, cb) {
    glob('node_modules/**/README.md', {cwd: baseDir}, function (err, matches) {
      if(err) {
        cb(err, null);
        return;
      }
      cb(null, matches.map(function (filename){
        var split = path.dirname(filename).split(path.sep), modNames = [];
        for (var i = split.length - 1; i >= 0; i--) {
          if(split[i] === 'node_modules') break;
          modNames.push(split[i]);
        }
        return {
          filepath: path.join(baseDir, filename),
          moduleName: modNames.join('/')
        };
      }));
    });
  },

  //指定したファイルをプレーンテキストとして返す
  getAsText: function (filename) {
    try{
        return fs.readFileSync(filename, 'utf-8');  
    } catch(e){
        dialog.showErrorBox('Error', filename + ' not found.');
        return filename + 'not found.'; 
    }
  },
  
  // 指定したファイルをコードハイライトしたHTMLとして返す
  getAsHTML: function(filename){
    try{
        return hljs.highlight('html', fs.readFileSync(filename, 'utf-8')).value;  
    } catch(e){
        dialog.showErrorBox('Error', filename + ' not found.');
        return filename + 'not found.'; 
    }    
  },
  
  // 指定したファイルをJSONファイルとして返す（ない場合は空白）
  getAsReplaceList:function (openfile) {
    var l = openfile.lastIndexOf(path.sep);
    var workfolder = openfile.substring(0, l);    
    try{
      var replist = fs.readFileSync( 
        path.join(workfolder, '_postReplaceList.json'), 'utf-8');      
      return hljs.highlight('javascript', replist).value;
    } catch(e){
      return '';
    }
  },
  
  convertMarkdown: function(openfile) {
    var l = openfile.lastIndexOf(path.sep);
    var workfolder = openfile.substring(0, l);    
    
    //書き出しファイル名
    var htmlfilepath = openfile.replace('.md', '.html');
    //テンプレートの読み込み
    try{
      var template = fs.readFileSync(
        path.join(workfolder, '_template.html'), 'utf-8');
    } catch (err){
      dialog.showErrorBox('File Open Error', err.message);
      throw new Error('_template.html not found.');
    }
  
    //markedのオプション設定
    marked.setOptions({
      renderer: new marked.Renderer(),
      gfm: true,        //GitHub Flavored Markdown
      tables: true,     //表組み対応
      breaks: false,    //GFMページブレーク対応
      pedantic: false,
      sanitize: false,  //HTMLタグのエスケープ（svgなどを通したいので無効に）
      smartLists: true,
      smartypants: false,
      // コードハイライト用の関数を当てる
      highlight: function(code, lang){
        var out = code;
        // ```言語名 での指定があればそれを使う
        try {
          out = hljs.highlight(lang, code).value;
        } catch (e){
          out = hljs.highlightAuto(code).value;
        }
        return out;
      }
    });

    // ファイルを読み込み
    try{
      var src = fs.readFileSync(openfile, 'utf-8');
    } catch (err){
      dialog.showErrorBox('File Open Error', err.message);
      throw new Error('cannot open file.');
    }

    // 画像のsvg変換
    src = svgimg(src);

    // markedで変換
    var html = marked(src);
    
    // 強引な後処理 閉じpreの後に改行（入れないとXML変換時にトラブルと思う）
    html = html.replace(/<\/pre>/g, '</pre>\n');

    // _postReplaceList.jsonがあれば後置換を実行
    try{
      var replisttext = fs.readFileSync( 
        path.join(workfolder, '_postReplaceList.json'), 'utf-8');      
      var replist = JSON.parse(replisttext);
      for(var i=0; i<replist.length; i++){
        html = html.replace(new RegExp(replist[i].f, 'g'), replist[i].r);
      }
    } catch(err){
      dialog.showErrorBox('RepList Open Error', err.message);
      console.log('no replist');
    }
    
    // lodashを使ってテンプレートにはめ込んで書き出す
    var compiled = _.template(template);
    try {
      fs.writeFileSync(htmlfilepath, compiled({content: html}));    
    } catch (err){
      dialog.showErrorBox('File Write Error', err.message);
      throw new Error('cannot write file.');
    }
    
    // vspreviewが可能かチェックする
    try{
      fs.accessSync(path.join( path.join(workfolder, 'viewer'), 'vivliostyle-viewer.html'));
    } catch(err){
      dialog.showErrorBox('VivlioStyle not Found', err.message);      
    }

    return htmlfilepath;
    
    // クエリ文字列（?svgimg=倍率,幅トリム,高さトリム,縦シフト,横シフト）SVG
    // 倍率以外は省略可
    function svgimg(mdtext){
      // console.log('svgimg');
      // 解像度からmmを得るための値を求めておく
      var density = 72;
      var dpi2mm = 25.4 / density;
      // 置換実行
      var mdsvgtext = mdtext.replace(/!\[[^\]]*\]\(([^\)]+)\)/g, function(str, $1){
        // strはマッチテキスト全体、$1はファイル名
        // クエリ文字列?svgimg=を含まない場合は置換しない
        var s = $1.indexOf('?svgimg=');
        if(s<0) return str;
        var imgpath = path.join(workfolder, $1.substring(0, s));
        // console.log(imgpath);
        var img = nativeImage.createFromPath(imgpath);
        // 読み込めない場合は変換せずにそのまま返す
        if(img.isEmpty()) return str;
        // パラメータを取得
        var scale = 1;
        var trimW = 0, trimH = 0;
        var shiftX = 0, shiftY=0;
        var params = $1.substring($1.indexOf('=')+1).split(',');
        if(params.length < 1) return str;  // パラメータ不正
        scale = parseFloat(params[0]) / 100;
        if(params.length > 1 && params[1].length > 0) trimW = parseFloat(params[1]);  
        if(params.length > 2 && params[2].length > 0) trimH = parseFloat(params[2]);  
        if(params.length > 3 && params[3].length > 0) shiftX = parseFloat(params[3]);  
        if(params.length > 4 && params[4].length > 0) shiftY = parseFloat(params[4]);  
        // console.log(scale + ', ' + trimW + ', ' + trimH + ', ' + shiftX + ', ' + shiftY);
        // サイズを取得
        var size = img.getSize();
        var printW = size.width * dpi2mm;
        var printH = size.height * dpi2mm;
        // 小数点第三位までにしておく
        printW = Math.round(printW * 1000) / 1000;
        printH = Math.round(printH * 1000) / 1000;
        // 拡大縮小を反映
        var newscale = scale;
        var scaleW = printW * newscale;
        var scaleH = printH * newscale;
        // 小数点第三位までにしておく
        newscale = Math.round(newscale * 1000) / 1000;
        scaleW = Math.round(scaleW * 1000) / 1000;
        scaleH = Math.round(scaleH * 1000) / 1000;
        if(trimW == 0) trimW = scaleW;
        if(trimH == 0) trimH = scaleH;
        // svg生成
        var result = '<svg width="' + trimW + 'mm" height="' + trimH + 'mm" ' 
              + 'viewBox="0 0 ' + trimW + ' ' + trimH + '">\n';
        result += '<image width="' + printW + '" height="' + printH + '" ' 
              + 'xlink:href="' + $1.substring(0, s) + '" '
              + 'transform="translate('+ shiftX + ','+ shiftY + ') '
              + 'scale(' + newscale + ')"> \n';
        result += '</svg> \n';
        // console.log(result);
        return result;
      });
      
      return mdsvgtext;
    }
  },
  // InDesign向けのXMLファイルパスを書き出す
  exportInDesignXML: function(htmlfile){    
console.log('exportXML');
    var l = htmlfile.lastIndexOf(path);
    var workfolder = htmlfile.substring(0, l);    
    // ファイルを読み込み
    try{
      var src = fs.readFileSync(htmlfile, 'utf-8');
    } catch (err){
      dialog.showErrorBox('File Open Error', err.message);
      throw new Error('cannot open file.');
    }
    var out = '<?xml version="1.0" encoding="UTF-8"?>';
        out += '<story xmlns:aid5="http://ns.adobe.com/AdobeInDesign/5.0/" '
            + 'xmlns:aid="http://ns.adobe.com/AdobeInDesign/4.0/">';
    var lines = src.split('\n');
    var olmode = false;
    //ヘッダーをスキップ
    for(var i=0; i<lines.length; i++){
      if(lines[i].indexOf('<body') >= 0) {
        break;
      }
    }
    console.log(htmlfile);
    console.log(lines.length);
    var codemode = false;
    // 書き出しループ
    for(; i<lines.length; i++){
      var line = lines[i]; 
      console.log(line);
      if(codemode == true){
        //コード専用の処理
        //コードが終わったかチェック
        if(line.indexOf('</code></pre>')>=0){
          codemode = false;
          //</code></pre>より前は処理したい
          out += parseCode(line.replace(/(.*)<\/code><\/pre>/, '$1')) + '\n';
          out += '</codelist>' + '\n';
          continue;
        }
        out += parseCode(line) + '\n';
      } else {
        //コード以外の処理
        //コードか否かをチェック
        if(line.indexOf('<pre><code')>=0){
          codemode = true;
          //out += '<codelist data-type="'+line.replace(/.*class="lang-([a-z]*)".*/, '$1')+'">\n';
          out += '<codelist>\n';
          //pre codeを抜いた部分だけはコードとして処理したい
          lines[i] = line.replace(/<pre><code[^>]*>(.*)/, '$1');
          i--;
          continue;
        }
        //html終了タグが来たら終了
        if(line.indexOf('</html>')>=0) break;
        //ulかolか
        if(line.indexOf('<ul>')>=0) olmode=false;
        if(line.indexOf('<ol>')>=0) olmode=true;
        //1ライン出力
        var htmlline = parseHTML(line.trim(), olmode);
        //行末がタグなら改行を入れる。タグでなければ詰める
        if(htmlline.charAt(htmlline.length-1) == '>') out += htmlline + '\n';
        else out += htmlline;
      }
    }
    out += '</story>';
 
    //書き出しファイル名
    var xmlfilepath = htmlfile.replace('.html', '.xml');
    console.log(xmlfilepath);
    try {
      fs.writeFileSync(xmlfilepath, out);    
    } catch (err){
      dialog.showErrorBox('File Write Error', err.message);
      throw new Error('cannot write file.');
    }

    return;
    
    function parseCode(src, olmode){
      console.log('parseCode');
      src = src.replace(/<span class="([^"]*)">([^<]*)<\/span>/g, 
              '<span_$1>$2</span_$1>');
      //決め打ち処理後で対策を検討
      src = src.replace(/<span class="[^"]*">/g, '');
      src = src.replace(/<\/span>/g, '');
      return '<pre><code>' + src + '</code></pre>';
    }
    function parseHTML(src, olmode){
      return src;
    }


  }

};

module.exports = fileUtil;