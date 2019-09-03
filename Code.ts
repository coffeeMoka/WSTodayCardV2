import { Script } from "vm";
import { totalmem } from "os";

const url : string = 'https://ws-tcg.com/todays-card/';
const messageEndpoint : string = "メッセージ送る際のエンドポイント";
const TOKEN : string = "Slack API使う際のトークン";
const postChannel : string = "画像を送るチャンネル";
const imageEndpoint : string = "画像を送る際のエンドポイント";
function main() : void {
    deleteTrigger("main");
    if(isHoliday()) {
        const message : string = "今日は休みなので更新はありません！";
        postSlackMessage(message);
    }
    else
        postTodayCards();
    const tomorrow : Date = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(1);
    tomorrow.setMinutes(15);
    setTrigger(tomorrow, "setMainTrigger");

}

function postTodayCards() : void {
    const html : string = getHtml(url);
    const regexp : RegExp = /\/wordpress\/wp-content\/uploads\/today_card\/[\S]*?.png/g;
    const matchList : RegExpMatchArray = getMatchList(html, regexp);
    const message : string = "今日のカードが更新されました！\n今日は" + matchList.length + "枚です！";
    postSlackMessage(message);
    getProducts();
    for(const imagePath of matchList) {
        const cardUrl : string = "https://ws-tcg.com" + imagePath;
        const image : GoogleAppsScript.Base.Blob = getImage(cardUrl);
        postSlackImage(image);
    }
}

function setMainTrigger() : void {
    deleteTrigger("setMainTrigger");
    const today : Date = new Date();
    today.setHours(12);
    today.setMinutes(15);
    setTrigger(today, "main");
}

function setTrigger(date : Date, funcName : string) : void {
    ScriptApp.newTrigger(funcName).timeBased().at(date).create();
}

function deleteTrigger(funcName : string) : void {
    const triggers : GoogleAppsScript.Script.Trigger[] = ScriptApp.getProjectTriggers();
    for(let i : number = 0; i < triggers.length; i++) {
        if(triggers[i].getHandlerFunction() == funcName)
            ScriptApp.deleteTrigger(triggers[i]);
    }
}

function postSlackMessage(postMessage : string) : void {
    const payload = {
        "text": postMessage,
        "username": "今日のカード"
    };
    const options : GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
        "method": "post",
        "headers": { "Content-type": "application/json" },
        "payload": JSON.stringify(payload)
    }
    UrlFetchApp.fetch(messageEndpoint, options);
}

function postSlackImage(postImage : GoogleAppsScript.Base.Blob) : void {
    const data = {
        token: TOKEN,
        file: postImage,
        channels: postChannel,
        title: '今日のカード'
    }
    const options : GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
        "method": "post",
        "payload": data
    }
    UrlFetchApp.fetch(imageEndpoint, options);
}

function getImage(url : string) : GoogleAppsScript.Base.Blob {
    const response : GoogleAppsScript.URL_Fetch.HTTPResponse = UrlFetchApp.fetch(url);
    const fileBlob : GoogleAppsScript.Base.Blob = response.getBlob();
    return fileBlob;
}

function isHoliday() : boolean {
    const today : Date = new Date();
    const day : number = today.getDay();
    if(day === 0 || day == 6)
        return true;
    const calendarId : string = "ja.japanese#holiday@group.v.calendar.google.com";
    const calendar : GoogleAppsScript.Calendar.Calendar = CalendarApp.getCalendarById(calendarId);
    const events : GoogleAppsScript.Calendar.CalendarEvent[] = calendar.getEventsForDay(today);
    if(events.length > 0)
        return true;
    return false;
}

function getHtml(url : string) : string {
    const response : GoogleAppsScript.URL_Fetch.HTTPResponse = UrlFetchApp.fetch(url);
    const html = response.getContentText('UTF-8');
    return html;
}

function getProducts() : void {
    const html : string = getHtml(url);
    const result : RegExpMatchArray = getMatchList(html, /.*?\/">.*?(<br \/>|<\/a><\/h3>)/g);
    let postMessage : string = "今日の更新タイトル\n";
    let value : string[] = [];
    for(let i : number = 0; i < result.length; i++) {
        let r : string = result[i];
        let searchTag : string = getMatchList(r, /.*?\/">/g)[0];
        let firstIndex : number = r.indexOf(searchTag);
        let splitResult : string = r.substring(firstIndex + searchTag.length);
        let endTag : string = getMatchList(splitResult, /(<br \/)|(<\/a><\/h3>)/g)[0];
        let secondIndex : number = splitResult.indexOf(endTag);
        value[i] = splitResult.substring(0, secondIndex);
    }
    for(let i : number = 0; i < value.length; i++) {
        if(i !== 0)
            postMessage += '\n';
        postMessage += value[i];
    }
    postSlackMessage(postMessage);
}

function getMatchList(text : string, regex : RegExp) : RegExpMatchArray {
    return text.match(regex);
}

function testClear() {
    deleteTrigger("main");
    deleteTrigger("setMainTrigger");
}