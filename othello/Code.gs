// スプレッドシートのIDを設定してください
const SPREADSHEET_ID = '1-UCNbsyUGqXl1GWPovmocmIeo9mAUDxPDZPqhbKoiDE';

function doGet(e) {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('勝敗予想チャレンジ')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// 新規ユーザーを作成
function createNewUser() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('PC_users');
  const data = sheet.getDataRange().getValues();
  
  // 新しいユーザーIDを生成（既存の最大値+1）
  let maxId = 0;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] > maxId) {
      maxId = data[i][0];
    }
  }
  const newUserId = maxId + 1;
  
  // デフォルトのニックネーム
  const nickname = 'ゲスト' + newUserId;
  const points = 1000; // 初期ポイント
  const formula = '=SUMIFS(PC_votes!$I$2:$I$1001,PC_votes!$B$2:$B$1001,INDIRECT(ADDRESS(ROW(), 1))) + PC_data!$B$1';
  
  // ユーザーを追加
  sheet.appendRow([newUserId, nickname, formula]);
  
  return {
    user_id: newUserId,
    nickname: nickname,
    points: points
  };
}

// ニックネームを更新
function updateNickname(userId, newNickname) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('PC_users');
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == userId) {
      sheet.getRange(i + 1, 2).setValue(newNickname);
      return { success: true };
    }
  }
  return { success: false };
}

// 開催中の試合一覧を取得
function getOpenMatches() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('PC_matchs');
  const data = sheet.getDataRange().getValues();
  
  const matches = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][4] === 'open') { // status列
      matches.push({
        match_id: data[i][0],
        match_name: data[i][1],
        team1: data[i][2],
        team2: data[i][3],
        team1_vote_num: data[i][7] || 0,
        team2_vote_num: data[i][8] || 0,
        team1_odds: data[i][9] || 1.0,
        team2_odds: data[i][10] || 1.0
      });
    }
  }
  return matches;
}

// 終了した試合一覧を取得
function getClosedMatches() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('PC_matchs');
  const data = sheet.getDataRange().getValues();
  
  const matches = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][4] === 'closed') { // status列
      matches.push({
        match_id: data[i][0],
        match_name: data[i][1],
        team1: data[i][2],
        team2: data[i][3],
        result: data[i][6]
      });
    }
  }
  return matches;
}

// ユーザーの投票履歴を取得
function getUserVotes(userId) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('PC_votes');
  const data = sheet.getDataRange().getValues();
  
  const votes = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] == userId) { // user_id列
      votes.push({
        vote_id: data[i][0],
        match_id: data[i][2],
        choice: data[i][3],
        voted_at: data[i][4],
        winner: data[i][5],
        odds: data[i][6],
        result: data[i][7],
        points_change: data[i][8] || 0
      });
    }
  }
  return votes;
}

// 投票を登録・更新
function submitVote(userId, matchId, choice) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const votesSheet = ss.getSheetByName('PC_votes');
  const matchsSheet = ss.getSheetByName('PC_matchs');
  
  const votesData = votesSheet.getDataRange().getValues();
  
  // 既存の投票を検索
  let existingRow = -1;
  for (let i = 1; i < votesData.length; i++) {
    if (votesData[i][1] == userId && votesData[i][2] == matchId) {
      existingRow = i + 1; // 実際の行番号
      break;
    }
  }
  
  const now = new Date();
  const timeString = Utilities.formatDate(now, Session.getScriptTimeZone(), "H:mm:ss");
  
  if (existingRow > 0) {
    // 既存の投票を更新
    votesSheet.getRange(existingRow, 4).setValue(choice); // choice列
    votesSheet.getRange(existingRow, 5).setValue(timeString); // voted_at列
  } else {
    // 新規投票を追加
    const voteId = votesData.length;
    votesSheet.appendRow([
      voteId,
      userId,
      matchId,
      choice,
      timeString
    ]);
  }
  
  // 投票数を更新
  updateVoteCount(matchId);
  
  return { success: true, message: '投票を受け付けました' };
}

// 投票数を更新
function updateVoteCount(matchId) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const votesSheet = ss.getSheetByName('PC_votes');
  const matchsSheet = ss.getSheetByName('PC_matchs');
  
  const votesData = votesSheet.getDataRange().getValues();
  const matchsData = matchsSheet.getDataRange().getValues();
  
  // 該当試合の投票を集計
  let team1Count = 0;
  let team2Count = 0;
  
  for (let i = 1; i < votesData.length; i++) {
    if (votesData[i][2] == matchId) {
      if (votesData[i][3] === 'team1') team1Count++;
      if (votesData[i][3] === 'team2') team2Count++;
    }
  }
  
  // matchsシートを更新
  for (let i = 1; i < matchsData.length; i++) {
    if (matchsData[i][0] == matchId) {
      matchsSheet.getRange(i + 1, 8).setValue(team1Count); // team1_vote_num
      matchsSheet.getRange(i + 1, 9).setValue(team2Count); // team2_vote_num
      break;
    }
  }
}

// ランキングを取得
function getRanking() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('PC_users');
  const data = sheet.getDataRange().getValues();
  
  const users = [];
  for (let i = 1; i < data.length; i++) {
    users.push({
      user_id: data[i][0],
      nickname: data[i][1],
      points: data[i][2] || 0
    });
  }
  
  // ポイント順にソート
  users.sort((a, b) => b.points - a.points);
  
  // トップ10のみ返す
  return users.slice(0, 10);
}

// ユーザー情報を取得
function getUserInfo(userId) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('PC_users');
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == userId) {
      return {
        user_id: data[i][0],
        nickname: data[i][1],
        points: data[i][2] || 0
      };
    }
  }
  return null;
}

// vote_idを生成
function generateVoteId() {
  return 'vote_' + new Date().getTime() + '_' + Math.floor(Math.random() * 1000);
}