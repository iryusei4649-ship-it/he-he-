'use client';
import { useState, useEffect } from 'react';

// プレイヤーデータの型定義（名前やレートを管理する設計図）
interface Player {
  rank: number;
  name: string;
  rate: number;
  target: string;
  reportedResult: string;
}

export default function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // プレイヤーデータ（初期状態は空っぽにします！）
  const [players, setPlayers] = useState<Player[]>([]);

  // 对戦ステータス管理
  const [matchStatus, setMatchStatus] = useState<'normal' | 'waiting' | 'matched' | 'playing'>('normal');
  const [selectedOpponent, setSelectedOpponent] = useState('');
  const [myReportedResult, setMyReportedResult] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  // サイトを開いたときに、ブラウザに保存されているプレイヤーデータを自動で読み込む
  useEffect(() => {
    const savedPlayers = localStorage.getItem('sumabura-players');
    if (savedPlayers) {
      setPlayers(JSON.parse(savedPlayers));
    }
  }, []);

  // プレイヤーデータを更新しながら、ブラウザ（LocalStorage）に自動保存する関数
  const savePlayersData = (newPlayers: Player[]) => {
    setPlayers(newPlayers);
    localStorage.setItem('sumabura-players', JSON.stringify(newPlayers));
  };
  // ログインボタンを押したときの処理
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = username.trim();
    if (trimmedName === '') {
      alert('名前を入力してください。');
      return;
    }

    setIsLoggedIn(true);

    // 【自動追加機能】ログインした名前がまだランキングになければ、新しく登録する
    const playerExists = players.some(p => p.name === trimmedName);
    if (!playerExists) {
      const newPlayer: Player = {
        rank: players.length + 1,
        name: trimmedName,
        rate: 1500, // 新しいプレイヤーはみんなレート1500からスタート！
        target: '',
        reportedResult: ''
      };
      const updatedPlayers = [...players, newPlayer];
      
      // レートが高い順に並び替えて、順位（1位、2位…）をきれいに付け直す
      const sorted = updatedPlayers
        .sort((a, b) => b.rate - a.rate)
        .map((p, index) => ({ ...p, rank: index + 1 }));
      savePlayersData(sorted);
    }
  };

  // ランキングの名前をタップして対戦を申し込むときの処理
  const handlePlayerClick = (opponentName: string) => {
    if (opponentName === username) return;
    let isMatched = false;
    
    const updated = players.map(p => p.name === username ? { ...p, target: opponentName } : p);
    const opponent = updated.find(p => p.name === opponentName);
    if (opponent && opponent.target === username) {
      isMatched = true; // お互いが選び合っていたらマッチング成功！
    }
    
    savePlayersData(updated);
    setSelectedOpponent(opponentName);

    if (isMatched) {
      setMatchStatus('matched');
    } else {
      setMatchStatus('waiting');
    }
  };



  // 試合結果（勝ち・負け）を報告したときのレート増減計算
  const handleReportSubmit = (myResult: string) => {
    setMyReportedResult(myResult);
    const opponentResult = myResult === '勝ち' ? '負け' : '勝ち';

    if (myResult === '勝ち' && opponentResult === '勝ち') {
      setStatusMessage(`⚠️ 【保留】あなたと${selectedOpponent}の勝敗報告が食い違っています！管理者の確認待ちです。`);
      setMatchStatus('normal');
      setSelectedOpponent('');
      return;
    }

    const me = players.find(p => p.name === username);
    const opp = players.find(p => p.name === selectedOpponent);
    if (!me || !opp) return;

    // お互いのレート差に応じて、増減するポイントを細かく計算（イロレーティング）
    const rateDiff = opp.rate - me.rate;
    const expectedScore = 1 / (1 + Math.pow(10, rateDiff / 400));
    const actualScore = myResult === '勝ち' ? 1 : 0;
    const rateChange = Math.round(32 * (actualScore - expectedScore));

    const updated = players.map(p => {
      if (p.name === username) {
        return { ...p, rate: p.rate + rateChange, target: '', reportedResult: '' };
      }
      if (p.name === selectedOpponent) {
        return { ...p, rate: p.rate - rateChange, target: '', reportedResult: '' };
      }
      return p;
    });

    // 計算が終わったら最新のレート順にランキングを並び替える
    const sorted = updated
      .sort((a, b) => b.rate - a.rate)
      .map((p, index) => ({ ...p, rank: index + 1 }));

    savePlayersData(sorted);
    setStatusMessage(`対戦完了：${selectedOpponent}との試合結果を記録しました！（レート変動完了）`);
    setMatchStatus('normal');
    setSelectedOpponent('');
  };
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center p-4 font-sans text-center">
      <style dangerouslySetInnerHTML={{__html: `
        .center-layout { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
        .full-center-input { text-align-last: center; text-align: center; }
      `}} />

      {!isLoggedIn ? (
        /* 1. ログイン画面 */
        <div className="bg-gradient-to-b from-gray-900 to-black border border-gray-800 rounded-3xl p-10 w-full max-w-md shadow-[0_0_50px_rgba(239,68,68,0.1)] relative overflow-hidden center-layout">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-800 via-red-500 to-red-800"></div>
          <h1 className="text-3xl font-black tracking-widest bg-gradient-to-b from-white via-gray-200 to-gray-400 bg-clip-text text-transparent uppercase mb-2">スマブラ身内レート戦</h1>
          <p className="text-red-500 text-[10px] font-black uppercase tracking-[0.3em] mb-8">Smash Bros Rating System</p>
          <form onSubmit={handleLogin} className="space-y-6 w-full center-layout">
            <div className="w-full center-layout">
              <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">ユーザーID (名前)</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full max-w-xs bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 focus:ring-1 font-bold full-center-input" placeholder="名前を入力してログイン" />
            </div>
            <div className="w-full center-layout">
              <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">パスワード（自由に入力）</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full max-w-xs bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 focus:ring-1 font-bold full-center-input" placeholder="••••••••" />
            </div>
            <button type="submit" className="w-full max-w-xs bg-gradient-to-r from-red-700 to-red-600 text-white font-black py-4 rounded-xl tracking-[0.2em] shadow-lg text-xs border border-red-800/50 mt-4">参加 (ログイン)</button>
          </form>
        </div>
      ) : (
        /* 2. メイン画面 */
        <div className="w-full max-w-4xl mx-auto py-8 text-left">
          {matchStatus === 'normal' && (
            <div>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-800 pb-6 mb-8">
                <div>
                  <h1 className="text-4xl font-black bg-gradient-to-r from-red-500 to-yellow-500 bg-clip-text text-transparent">⚔️ スマブラ身内レート戦</h1>
                  <p className="text-gray-400 text-xs mt-1">Player: <span className="text-red-400 font-bold">{username}</span></p>
                </div>
                <div className="text-xs bg-gray-900 border border-gray-800 px-4 py-2 rounded-xl text-gray-400 font-semibold">💡 ランキングの名前をタップすると対戦を申し込みます。</div>
              </div>

              {statusMessage && (
                <div className="bg-emerald-950/40 border border-emerald-800 text-emerald-400 px-5 py-4 rounded-xl mb-6 text-sm font-semibold shadow-lg">🎉 {statusMessage}</div>
              )}

              <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-5 border-b border-gray-800"><h2 className="font-extrabold text-xl flex items-center gap-2"><span className="text-yellow-500">👑</span> 最強レートランキング</h2></div>
                <div className="divide-y divide-gray-800/60">
                  {players.length === 0 ? (
                    <div className="p-5 text-gray-500 text-sm text-center">まだプレイヤーがいません。新しい名前でログインすると自動で増えます！</div>
                  ) : (
                    players.map((player) => (
                      <button key={player.name} onClick={() => handlePlayerClick(player.name)} disabled={player.name === username} className={`w-full text-left flex justify-between items-center p-5 transition ${player.name === username ? 'bg-gray-900/20 cursor-default' : 'hover:bg-red-950/20 bg-gray-900/50 border-l-2 border-transparent hover:border-red-600'}`}>
                        <div className="flex items-center gap-5">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm border ${player.rank === 1 ? 'border-yellow-500 text-yellow-500 shadow-lg' : 'border-gray-800 text-gray-500'}`}>{player.rank}</span>
                          <div>
                            <div className="font-bold text-lg">{player.name} {player.name === username && <span className="text-[10px] bg-red-950 border border-red-800 text-red-400 px-1.5 py-0.5 rounded font-black ml-2">YOU</span>}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-400">{player.rate}</span>
                          <span className="text-[10px] block text-gray-500 font-bold uppercase tracking-wider">Rating</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
          {/* ②：申し込み待機画面 */}
          {matchStatus === 'waiting' && (
            <div className="min-h-[50vh] flex flex-col items-center justify-center text-center w-full">
              <div className="bg-gray-900 border border-gray-800 rounded-3xl p-10 w-full max-w-lg shadow-2xl flex flex-col items-center">
                <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-6"></div>
                <h2 className="text-2xl font-black mb-2">相手があなたを選ぶのを待っています...</h2>
                <p className="text-gray-400 text-sm mb-6">対戦相手：<span className="text-red-400 font-bold text-lg">{selectedOpponent}</span></p>
                <div className="flex gap-4 w-full">
                  <button onClick={() => setMatchStatus('normal')} className="flex-1 bg-gray-800 text-gray-300 font-bold py-3.5 rounded-xl text-sm">キャンセル</button>
              
                </div>
              </div>
            </div>
          )}

          {/* ③：マッチングしました画面 */}
          {matchStatus === 'matched' && (
            <div className="min-h-[50vh] flex flex-col items-center justify-center text-center w-full">
              <div className="bg-gray-900 border border-gray-800 rounded-3xl p-10 w-full max-w-lg shadow-2xl flex flex-col items-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
                <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 uppercase tracking-wider mb-2">マッチングしました！</h2>
                <p className="text-gray-400 text-sm mb-8">対戦カード：<span className="text-white font-bold">{username}</span> <span className="text-red-500 font-bold mx-2">VS</span> <span className="text-red-400 font-bold">{selectedOpponent}</span></p>
                <button
                  onClick={() => setMatchStatus('playing')}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black py-4 rounded-xl tracking-widest text-sm shadow-lg transform hover:-translate-y-0.5 active:translate-y-0 animate-bounce"
                >
                  対戦開始
                </button>
              </div>
            </div>
          )}

          {/* ④：勝敗報告画面 */}
          {matchStatus === 'playing' && (
            <div className="min-h-[50vh] flex flex-col items-center justify-center text-center w-full">
              <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 w-full max-w-xl shadow-2xl relative text-left">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                <h3 className="text-2xl font-black mb-6 pb-4 border-b border-gray-800 flex justify-between items-center">⚔️ 決戦（結果入力） <span className="text-xs bg-blue-950 border border-blue-800 text-blue-400 px-3 py-1 rounded-full font-bold">対戦中</span></h3>
                <div className="text-center bg-gray-950 border border-gray-800 rounded-xl py-4 mb-6 font-bold"><span className="text-xl text-gray-300">{username}</span> <span className="text-red-500 mx-2 text-sm">VS</span> <span className="text-xl text-red-400">{selectedOpponent}</span></div>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-black text-gray-400 mb-3 uppercase tracking-wider text-center w-full">🏆 試合結果の報告</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button type="button" onClick={() => handleReportSubmit('勝ち')} className="py-4 rounded-xl font-black border transition hover:scale-[1.01] active:scale-100 bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg">WIN（自分が勝った）</button>
                      <button type="button" onClick={() => handleReportSubmit('負け')} className="py-4 rounded-xl font-black border transition hover:scale-[1.01] active:scale-100 bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-lg">LOSE（自分が負けた）</button>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-gray-800/60">
                    <button type="button" onClick={() => handleReportSubmit('勝ち')} className="w-full py-2 bg-gray-950 border border-gray-800 hover:border-red-900 rounded-lg text-[10px] text-gray-500 hover:text-red-400 font-bold transition">⚠️ テスト：相手も「勝ち」と報告（食い違い保留機能）</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
