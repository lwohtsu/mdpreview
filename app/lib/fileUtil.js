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
    
    // markedで変換
    try{
      var src = fs.readFileSync(openfile, 'utf-8');
    } catch (err){
      dialog.showErrorBox('File Open Error', err.message);
      throw new Error('cannot open file.');
    }
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
  },

  // 指定したMarkdownファイル内の画像指定を変換し、SVGにする
  svgConvert: function(mdfile, maxwidth, scale, density){
    // console.log('svgConvert: ' + mdfile);
    // console.log('maxwidth: ' + maxwidth);
    // console.log('scale: ' + scale);
    // console.log('density: ' + density);

    //作業フォルダを取得
    var l = mdfile.lastIndexOf(path.sep);
    var workfolder = mdfile.substring(0, l);    
    // Markdownファイルを読み込み
    var mdtext;
    try{
        mdtext = fs.readFileSync(mdfile, 'utf-8');  
    } catch(e){
        dialog.showErrorBox('Error', mdfile + ' not found.');
        return mdfile + 'not found.'; 
    }
    // 解像度からmmを得るための値を求めておく
    var dpi2mm = 25.4 / density;
    // 置換実行
    var mdsvgtext = mdtext.replace(/!\[[^\]]*\]\(([^\)]+)\)/g, function(str, $1){
      // strはマッチテキスト全体、$1はファイル名
      var imgpath = path.join(workfolder, $1);
      console.log(imgpath);
      var img = nativeImage.createFromPath(imgpath);
      // 読み込めない場合は変換せずにそのまま返す
      if(img.isEmpty()){
        return str;
      }
      // サイズを取得
      var size = img.getSize();
      var printW = size.width * dpi2mm;
      var printH = size.height * dpi2mm;
      // 小数点第三位までにしておく
      printW = Math.round(printW * 1000) / 1000;
      printH = Math.round(printH * 1000) / 1000;
      // console.log(printW);
      // console.log(printH);
      // 拡大縮小を反映
      var newscale = scale;
      var scaleW = printW * newscale;
      var scaleH = printH * newscale;
      // 最大サイズより大きい場合はどうする？
      if(scaleW > maxwidth){
        // その分縮小して全体をmaxwidth内に納める
        newscale = maxwidth / printW;
        scaleW = printW * newscale;
        scaleH = printH * newscale;
      }
      // 小数点第三位までにしておく
      newscale = Math.round(newscale * 1000) / 1000;
      scaleW = Math.round(scaleW * 1000) / 1000;
      scaleH = Math.round(scaleH * 1000) / 1000;
      // 最大サイズより小さいまたは等しい場合
      var result = '<svg width="' + scaleW + 'mm" height="' + scaleH + 'mm" ' 
            + 'viewBox="0 0 ' + scaleW + ' ' + scaleH + '">\n';
      result += '<image width="' + printW + '" height="' + printH + '" ' 
            + 'xlink:href="' + $1 + '" '
            + 'transform="scale(' + newscale + ') translate(0,0)"> \n';
      result += '</svg>';
      console.log(result);
      return result;
    });
    // 書き出す
    try {
      fs.writeFileSync(mdfile, mdsvgtext);    
    } catch (err){
      dialog.showErrorBox('File Write Error', err.message);
      throw new Error('cannot write file.');
    }    
  },
  
  // 既存SVGタグが対象となるだけでsvgConvertとほとんど同じ。
  // うまく共通部分をまとめられなかったので、後で何とかしたい
  svgUpdate: function(mdfile, maxwidth, scale, density){
    //作業フォルダを取得
    var l = mdfile.lastIndexOf(path.sep);
    var workfolder = mdfile.substring(0, l);    
    // Markdownファイルを読み込み
    var mdtext;
    try{
        mdtext = fs.readFileSync(mdfile, 'utf-8');  
    } catch(e){
        dialog.showErrorBox('Error', mdfile + ' not found.');
        return mdfile + 'not found.'; 
    }
    // 解像度からmmを得るための値を求めておく
    var dpi2mm = 25.4 / density;
    // 置換実行
    var mdsvgtext = mdtext.replace(/<svg[^<]+<image[^<]+xlink:href="([^"]+)"[^<]+<\/svg>/g, function(str, $1){
      // strはマッチテキスト全体、$1はファイル名
      var imgpath = path.join(workfolder, $1);
      console.log(imgpath);
      var img = nativeImage.createFromPath(imgpath);
      // 読み込めない場合は変換せずにそのまま返す
      if(img.isEmpty()){
        return str;
      }
      // サイズを取得
      var size = img.getSize();
      var printW = size.width * dpi2mm;
      var printH = size.height * dpi2mm;
      // 小数点第三位までにしておく
      printW = Math.round(printW * 1000) / 1000;
      printH = Math.round(printH * 1000) / 1000;
      // console.log(printW);
      // console.log(printH);
      // 拡大縮小を反映
      var newscale = scale;
      var scaleW = printW * newscale;
      var scaleH = printH * newscale;
      // 最大サイズより大きい場合はどうする？
      if(scaleW > maxwidth){
        // その分縮小して全体をmaxwidth内に納める
        newscale = maxwidth / printW;
        scaleW = printW * newscale;
        scaleH = printH * newscale;
      }
      // 小数点第三位までにしておく
      newscale = Math.round(newscale * 1000) / 1000;
      scaleW = Math.round(scaleW * 1000) / 1000;
      scaleH = Math.round(scaleH * 1000) / 1000;
      // SVGを生成
      var result = '<svg width="' + scaleW + 'mm" height="' + scaleH + 'mm" ' 
            + 'viewBox="0 0 ' + scaleW + ' ' + scaleH + '">\n';
      result += '<image width="' + printW + '" height="' + printH + '" ' 
            + 'xlink:href="' + $1 + '" '
            + 'transform="scale(' + newscale + ') translate(0,0)"> \n';
      result += '</svg>';
      console.log(result);
      return result;
    });
    // 書き出す
    try {
      fs.writeFileSync(mdfile, mdsvgtext);    
    } catch (err){
      dialog.showErrorBox('File Write Error', err.message);
      throw new Error('cannot write file.');
    }        
  }


};

module.exports = fileUtil;