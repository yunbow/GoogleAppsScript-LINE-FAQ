/**
 * FAQ BOT
 */
const LINE_CHANNEL_TOKEN = '*****'; // LINE NOTIFYのアクセストークン
const SSID = '*****';
const SSN_USER = 'user';
const SSN_FAQ = 'faq';

let spreadsheet = SpreadsheetApp.openById(SSID);
let userSheet = spreadsheet.getSheetByName(SSN_USER);
let faqSheet = spreadsheet.getSheetByName(SSN_FAQ);

/**
 * POSTリクエスト
 * @param {Object} event 
 */
function doPost(event) {
    try {
        if (event.postData) {
            let reqObj = JSON.parse(event.postData.contents);
            execute(reqObj);
        }
    } catch (e) {
        console.error(e.stack);
    }
}

/**
 * イベント処理
 * @param {Object} reqObj 
 */
function execute(reqObj) {

    for (let i in reqObj.events) {
        let reqEvent = reqObj.events[i];
        console.log(reqEvent);

        switch (reqEvent.type) {
            case 'follow':
                executeFollow(reqEvent);
                break;
            case 'unfollow':
                executeUnfollow(reqEvent);
                break;
            case 'message':
                executeMessage(reqEvent);
                break;
        }
    }
}

/**
 * Followイベント処理
 * @param {Object} reqEvent 
 */
function executeFollow(reqEvent) {
    let msg = createMsg(1);
    if (msg) {
        let msgList = [msg];
        sendLinePush(reqEvent.source.userId, msgList);
    }
    let user = getUser(reqEvent.source.userId);
    if (user) {
        userSheet.getRange(user.index + 2, 3).setValue(1);
    } else {
        userSheet.appendRow([reqEvent.source.type, reqEvent.source.userId, 1]);
    }
}

/**
 * UnFollowイベント
 * @param {Object} reqEvent 
 */
function executeUnfollow(reqEvent) {
    let user = getUser(reqEvent.source.userId);
    if (user) {
        userSheet.getRange(user.index + 2, 3).setValue(0);
    }
}

/**
 * メッセージイベント
 * @param {Object} reqEvent 
 */
function executeMessage(reqEvent) {
    let msgList = [];
    let user = getUser(reqEvent.source.userId);
    if (user) {
        if (reqEvent.message.type === 'text') {
            let msg = createMsg(reqEvent.message.text);
            if (msg) {
                msgList.push(msg);
                sendLineReply(reqEvent.replyToken, msgList);
            }
        }
    }
}

/**
 * FAQ IDからメッセージを生成する
 * @param {String} faqId 
 */
function createMsg(faqId) {

    let msg = null;
    let faq = getFaq(faqId);
    if (faq) {
        switch (faq.type) {
            case 'message':
                msg = {
                    'type': 'text',
                    'text': String(faq.text),
                }
                break;
            case 'confirm':
                msg = {
                    'type': 'template',
                    'altText': String(faq.text),
                    'template': {
                        'text': String(faq.text),
                        'type': 'confirm',
                        'actions': [{
                                'type': 'message',
                                'label': String(faq.yes.text),
                                'text': String(faq.yes.id)
                            },
                            {
                                'type': 'message',
                                'label': String(faq.no.text),
                                'text': String(faq.no.id)
                            }
                        ],
                    },
                }
                break;
        }
    }
    return msg;
}

/**
 * FAQを取得する
 * @param {String} faqId 
 */
function getFaq(faqId) {
    let faqList = getFaqList();
    for (let i in faqList) {
        let faq = faqList[i];
        if (faq.id == faqId) {
            return faq;
        }
    }
    return null;
}

/**
 * FAQ一覧を取得する
 */
function getFaqList() {
    let faqList = [];
    let lastRow = faqSheet.getLastRow();
    if (2 < lastRow) {
        faqList = faqSheet.getRange(2, 1, lastRow, 7).getValues();
        faqList = faqList.map((row) => {
            return {
                id: row[0],
                type: row[1],
                text: row[2],
                yes: {
                    id: row[3],
                    text: row[4],
                },
                no: {
                    id: row[5],
                    text: row[6],
                },
            }
        });
    }
    return faqList;
}

/**
 * ユーザーを取得する
 * @param {String} userId 
 */
function getUser(userId) {
    let userList = getUserList();
    for (let i in userList) {
        let user = userList[i];
        if (user.userId === userId) {
            return {
                index: parseInt(i),
                item: user
            };
        }
    }
    return null;
}

/**
 * ユーザー一覧を取得する
 */
function getUserList() {
    let userList = [];
    let lastRow = userSheet.getLastRow();
    if (1 < lastRow) {
        userList = userSheet.getRange(2, 1, lastRow, 3).getValues();
        userList = userList.map((row) => {
            return {
                type: row[0],
                userId: row[1],
                follow: row[2],
            }
        });
    }
    return userList;
}

/**
 * LINEにメッセージを送信する
 * @param {String} targetId ターゲットID（userId/groupId/roomId）
 * @param {Object} msgList メッセージリスト
 */
function sendLinePush(targetId, msgList) {
    let url = 'https://api.line.me/v2/bot/message/push';
    let options = {
        'method': 'post',
        'headers': {
            'Content-Type': 'application/json; charset=UTF-8',
            'Authorization': `Bearer ${LINE_CHANNEL_TOKEN}`
        },
        'payload': JSON.stringify({
            to: targetId,
            messages: msgList
        })
    };
    let response = UrlFetchApp.fetch(url, options);
    return JSON.parse(response.getContentText('UTF-8'));
}

/**
 * LINEに応答メッセージを送信する
 * @param {String} replyToken リプライトークン
 * @param {Object} msgList メッセージリスト
 */
function sendLineReply(replyToken, msgList) {
    let url = 'https://api.line.me/v2/bot/message/reply';
    let options = {
        'method': 'post',
        'headers': {
            'Content-Type': 'application/json; charset=UTF-8',
            'Authorization': `Bearer ${LINE_CHANNEL_TOKEN}`
        },
        'payload': JSON.stringify({
            replyToken: replyToken,
            messages: msgList
        })
    };
    let response = UrlFetchApp.fetch(url, options);
    return JSON.parse(response.getContentText('UTF-8'));
}