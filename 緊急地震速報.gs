/**
* 訓練モード設定：`true`で全ての地震情報を通知、`false`で震度5～9の地震を対象
*/
const TRAINING_MODE = true;

/**
* 気象庁が公開している地震情報(高頻度フィード)を取得し、安否確認メールを送信
*/
function getEarthQuake() {
  
  var atom = XmlService.getNamespace('http://www.w3.org/2005/Atom');
  var feedUrl = 'https://www.data.jma.go.jp/developer/xml/feed/eqvol.xml';
  var feedRes = UrlFetchApp.fetch(feedUrl).getContentText();
  var feedDoc = XmlService.parse(feedRes);
  var feedXml = feedDoc.getRootElement();
  var feedLocs = getElementsByTagName(feedXml, 'entry');
  var sendFlg = false;
  var dt59 = "";

  var sheet = SpreadsheetApp.getActiveSheet();
  var preDate = (sheet.getRange(2, 3).getValue() == '') 
    ? Utilities.formatDate(new Date(),"JST","yyyy-MM-dd HH:mm:ss") 
    : Utilities.formatDate(sheet.getRange(2, 3).getValue(),"JST","yyyy-MM-dd HH:mm:ss");

  var quakeInfo = "";

  feedLocs.forEach(function(value, i) {
    var titleText = value.getChild('title', atom).getText();
    var linkText = value.getChild('link', atom).getAttribute('href').getValue();

    if ('震度速報' == titleText) {
      var dataUrl = linkText;
      var dataRes = UrlFetchApp.fetch(dataUrl).getContentText();
      var dataDoc = XmlService.parse(dataRes);
      var dataXml = dataDoc.getRootElement();
      var dataLocs = getElementsByTagName(dataXml, 'Pref');
      var dataReportDateTime = getElementsByTagName(dataXml, 'TargetDateTime')[0].getValue()
        .replace('T', ' ')
        .replace('+09:00', '');

      dataLocs.forEach(function(value, i) {
        var strPref = value.getValue();
        strPref = molding1(strPref);

        var shouldSend = TRAINING_MODE 
          || (dataReportDateTime > preDate && strPref.match(/震度[5-9]/));

        if (shouldSend) {
          sendFlg = true;
          quakeInfo = quakeInfo + strPref;
          dt59 = dataReportDateTime;
        }
      });
    }
  });

  if (sendFlg) {
    var sendToAddress = "shiori.nanjo@gmail.com";
    var mailTitle = '【緊急通知】避難・防災計画発動検討要';
    var mailMessage = 
        '【緊急通知】避難・防災計画発動検討要\n'+  
        '訓練モード：' + (TRAINING_MODE ? '有効' : '無効') + '\n' +
        '地震情報：\n' + dt59 + '\n' + quakeInfo;
    MailApp.sendEmail(sendToAddress, mailTitle, mailMessage);

    var now = Utilities.formatDate(new Date(),"JST","yyyy-MM-dd HH:mm:ss");
    sheet.getRange(2, 3).setValue(now);
  }
}

/**
* @param {string} element 検索要素
* @param {string} tagName タグ
* @return {string} data 要素
*/
function getElementsByTagName(element, tagName) {
  var data = [], descendants = element.getDescendants();
  for (var i in descendants) {
    var elem = descendants[i].asElement();
    if (elem != null && elem.getName() == tagName) data.push(elem);
  }
  return data;
}

/**
* @param {string} moji タグ
* @return {string} data 要素
*/
function molding1(moji) {
  var moji1 = moji.charAt(4);
  var moji2 = moji.charAt(5);
  if (moji1.match(/[0-9]/)) {
    data = molding2(moji, 6);
  } else if (moji2.match(/[0-9]/)) {
    data = molding2(moji, 7);
  }
  return data;
}

/**
* @param {string} moji タグ
* @return {string} data 要素
*/
function molding2(moji, i) {
  var sindo = '震度' + moji.substr(i, 1);
  if (moji.match(/県/)) {
    data = moji.replace(/県[0-9][0-9][0-9]*/, "県 " + sindo);
  } else if (moji.match(/府/)) {
    data = moji.replace(/府[0-9][0-9][0-9]*/, "府 " + sindo);
  } else if (moji.match(/東京都/)) {
    data = moji.replace(/東京都[0-9][0-9][0-9]*/, "東京都 " + sindo);
  } else if (moji.match(/北海道/)) {
    data = moji.replace(/北海道[0-9][0-9][0-9]*/, "北海道 " + sindo);
  } else {
    console.log('molding2 エラー');
  }
  return data;
}
