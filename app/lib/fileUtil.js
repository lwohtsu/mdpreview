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
//var jsdom = require('jsdom').jsdom;
var cheerio = require('cheerio');

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
      var $ = cheerio.load(src);
    } catch (err){
      dialog.showErrorBox('File Open Error', err.message);
      throw new Error('cannot open file.');
    }
    // body要素を取得
    var body = $('body');
    //console.log(body);
    
    // XMLを構築
    var out = '<?xml version="1.0" encoding="UTF-8"?>';
        out += '<story xmlns:aid5="http://ns.adobe.com/AdobeInDesign/5.0/" '
            + 'xmlns:aid="http://ns.adobe.com/AdobeInDesign/4.0/">'
            + '</story>';
    var $x = cheerio.load(out, {
      normalizeWhitespace: true,
      xmlMode: true
    });
    var xstory = $x('story');
    console.log($x.xml());
    htmltoxml(body.get(0), xstory.get(0));
 
    //書き出しファイル名
    var xmlfilepath = htmlfile.replace('.html', '.xml');
    console.log(xmlfilepath);
    var xmltext = $x.xml();
    // img要素が単独要素にならないので、置換で強引に直す。
    xmltext = xmltext.replace(/>[^<]*<\/img>/g, '/>');
    // 画像タグの後の改行を詰める
    xmltext = xmltext.replace(/<div_figure>\n/g, '<div_figure>');
    xmltext = xmltext.replace(/<svg>\n/g, '<svg>');
    xmltext = xmltext.replace(/\n<\/svg>\n/g, '</svg>');
    xmltext = xmltext.replace(/<\/div_figcaption>\n/g, '</div_figcaption>');
    xmltext = xmltext.replace(/\n<div_figcaption>/g, '<div_figcaption>');
    // br要素をただの改行に
    xmltext = xmltext.replace(/<br\/>/g, '\n');
    try {
      fs.writeFileSync(xmlfilepath, xmltext);    
    } catch (err){
      dialog.showErrorBox('File Write Error', err.message);
      throw new Error('cannot write file.');
    }

    return;
    
    function htmltoxml(htmldom, xmldom){
      if(htmldom.type == 'tag'){
        // 要素の移植
        var name = htmldom.tagName;
        var classname = $(htmldom).attr('class');
        // svg要素の場合はスキップ
        // if(htmldom.tagName == 'svg') return;
        // svgのimage要素の場合はimg要素にタグ名を変更
        if(name == 'image') name = 'img';
        // 見出しまたは段落要素であれば、親要素のクラス名をタグ名に加える
        if('h1h2h3h4h5h6p'.indexOf(htmldom.tagName)>=0){
          classname = $(htmldom.parentNode).attr('class')
        }
        // li要素の場合、親がul、olの場合で書き出しタグを変える（ul_li、ol_liになる）
        if(name == 'li'){
          var parent = htmldom.parentNode;
          name = parent.tagName + '_' + name;
        }
        // HTMLのタグ名とクラス名を連結したものをXMLのタグ名とする
        if(classname) name = name + '_' + classname;
        $x(xmldom).append('<' + name + '></' + name + '>' );
        // 追加したノードを取得
        var nodes = $x(xmldom).children(name);
        var newnode = nodes[nodes.length-1];
        // img要素の場合はsrc属性をhref属性として移植
        if(htmldom.tagName == 'img'){
          $x(newnode).attr('href', 'file://'+ $(htmldom).attr('src'));
        }
        // svgのimage要素のhref属性の場合はxlink:hrefをhref属性として移植
        if(htmldom.tagName == 'image'){
          $x(newnode).attr('href', 'file://'+ $(htmldom).attr('xlink:href'));
          // 変形指定を分割して個別の属性にする
          var tfvalue = $(htmldom).attr('transform');
          tfvalue =  tfvalue.replace(/translate\(([^,]*),([^\)]*)\) scale\(([^\)]+)\)/
            , '$1 $2 $3');
          var params = tfvalue.split(' ');
          $x(newnode).attr('translate-x', params[0]);
          $x(newnode).attr('translate-y', params[1]);
          $x(newnode).attr('scale', params[2]);
          var parent = htmldom.parentNode;
          // 親がsvg要素の場合はwidthとheightを移植
          if(parent.tagName == 'svg'){
            $x(newnode).attr('width', $(parent).attr('width'));
            $x(newnode).attr('height', $(parent).attr('height'));            
          }
        }
        // 子の取得
        var contents = $(htmldom).contents();
        if(contents.length > 0){
          for(var i=0; i<contents.length; i++){
            htmltoxml(contents.get(i), newnode);
          }
        }
      } else if(htmldom.type == 'text'){
        // テキストノード
        // テキストすべて16進数になってしまうが問題はないらしい
        $x(xmldom).append(htmldom);
      }
    }

  }

};

module.exports = fileUtil;