'use strict';

var glob = require('glob');
var path = require('path');
var fs = require('fs');
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

  getAsText: function (filename) {
    return fs.readFileSync(filename, 'utf-8');
  },
  
  convertMarkdown: function(openfile) {
    var l = openfile.lastIndexOf(path.sep);
    var workfolder = openfile.substring(0, l);    
    // var templatepath = workfolder + path.sep + '_template.html';
    
    //書き出しファイル名
    var htmlfile = openfile.replace('.md', '.html');
    //テンプレートの読み込み
    try{
      var template = fs.readFileSync(
        path.join(workfolder, '_template.html'), 'utf-8');
    } catch (err){
      require('dialog').showErrorBox('Error', '_template.html not found.');
      return '_template.html not found.'; 
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
      require('dialog').showErrorBox('Error', 'cannot open file.');
      return 'cannot open file.';       
    }
    var html = marked(src);
    
    // 強引な後処理 閉じpreの後に改行（入れないとXML変換時にトラブルと思う）
    var html = html.replace(/<\/pre>/g, '</pre>\n');

    // lodashを使ってテンプレートにはめ込む
    var compiled = _.template(template);
    try {
      fs.writeFileSync(htmlfile, compiled({content: html}));    
    } catch (err){
      require('dialog').showErrorBox('Error', 'cannot write file.');
      return 'cannot write file.';       
    }
    
    return htmlfile;
  }
};

module.exports = fileUtil;