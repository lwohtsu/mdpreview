'use strict';

var glob = require('glob');
var path = require('path');
var fs = require('fs');
var dialog = require('dialog');
// var grmarkdown = require('./markdown.js');
var marked = require('marked');
var hljs = require('highlight.js');
var _ = require('lodash');

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
    console.log('svgConvert: ' + mdfile);
    console.log('maxwidth: ' + maxwidth);
    console.log('scale: ' + scale);
    console.log('density: ' + density);
  }

};

module.exports = fileUtil;