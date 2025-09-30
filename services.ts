import type { WordPair, HighScores, GameHistoryEntry, GameName, PlayerState, VocabStat, UpgradeType } from './types';

declare var XLSX: any;

export const readExcelFile = (file: File): Promise<WordPair[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet);

        const pairs: WordPair[] = json
          .map((row) => ({
            vi: row.TiengViet?.toString().trim(),
            zh: row.TiengTrung?.toString().trim(),
          }))
          .filter((p) => p.vi && p.zh);
        
        if (pairs.length === 0) {
            reject(new Error("Không tìm thấy dữ liệu hợp lệ. Đảm bảo các cột được đặt tên là 'TiengViet' và 'TiengTrung' và không trống."));
        } else {
            resolve(pairs);
        }
      } catch (error) {
        reject(new Error("Không thể phân tích tệp Excel. Vui lòng kiểm tra định dạng tệp."));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};


const HIGH_SCORES_KEY = 'chinese_game_highscores';
const RESULTS_LOG_KEY = 'chinese_game_results';
const PLAYER_STATE_KEY = 'chinese_game_player_state';
const VOCAB_STATS_KEY = 'chinese_game_vocab_stats';

// --- Spaced Repetition System (SRS) ---
export const getVocabStats = (): Record<string, VocabStat> => {
    try {
        const stats = localStorage.getItem(VOCAB_STATS_KEY);
        return stats ? JSON.parse(stats) : {};
    } catch (e) {
        console.error("Failed to read vocab stats", e);
        return {};
    }
};

export const saveVocabStats = (stats: Record<string, VocabStat>) => {
    try {
        localStorage.setItem(VOCAB_STATS_KEY, JSON.stringify(stats));
    } catch (e) {
        console.error("Failed to save vocab stats", e);
    }
};

export const updateVocabStat = (vietnameseWord: string, isCorrect: boolean) => {
    const stats = getVocabStats();
    if (!stats[vietnameseWord]) {
        stats[vietnameseWord] = { correct: 0, incorrect: 0, lastCorrectTimestamp: 0 };
    }
    if (isCorrect) {
        stats[vietnameseWord].correct++;
        stats[vietnameseWord].lastCorrectTimestamp = Date.now();
    } else {
        stats[vietnameseWord].incorrect++;
    }
    saveVocabStats(stats);
};

const shuffleArray = <T,>(array: T[]): T[] => [...array].sort(() => Math.random() - 0.5);

export const getWeightedRandomPairs = (allPairs: WordPair[], count: number): WordPair[] => {
    if (allPairs.length <= count) {
        return shuffleArray(allPairs);
    }

    const stats = getVocabStats();
    const now = Date.now();

    const weightedPairs = allPairs.map(pair => {
        const stat = stats[pair.vi] || { correct: 0, incorrect: 0, lastCorrectTimestamp: 0 };
        const errorRatio = (stat.incorrect + 1) / (stat.correct + 1);
        const timeSinceCorrect = stat.lastCorrectTimestamp ? (now - stat.lastCorrectTimestamp) / (1000 * 3600 * 24) : 10;
        const recencyBonus = Math.log10(Math.max(1, timeSinceCorrect)) + 1;
        const weight = errorRatio * recencyBonus;
        return { pair, weight };
    });

    const totalWeight = weightedPairs.reduce((sum, item) => sum + item.weight, 0);
    const result: WordPair[] = [];
    const usedIndices = new Set<number>();

    while (result.length < count) {
        let random = Math.random() * totalWeight;
        for (let i = 0; i < weightedPairs.length; i++) {
            if (usedIndices.has(i)) continue;
            random -= weightedPairs[i].weight;
            if (random <= 0) {
                result.push(weightedPairs[i].pair);
                usedIndices.add(i);
                break;
            }
        }
        if (usedIndices.size === allPairs.length) break; // All pairs have been chosen
    }

    return shuffleArray(result);
};


// --- Player State (Coins & Upgrades) ---
export const getInitialPlayerState = (): PlayerState => ({
    coins: 0,
    destinyPoints: 0,
    upgrades: {
        timeExtension: 0,
        penaltyReduction: 0,
        coinBonus: 0,
        quizStreakBonus: 0,
        fallingSlowdown: 0,
        extraLife: 0,
        coinInterest: 0,
        highScoreBonus: 0,
        towerExtraLife: 0,
        towerStartWithBlessing: 0,
        towerBlessingReroll: 0,
        towerAddRareBlessings: 0,
        soulSiphon: 0,
        legacyOfKnowledge: 0,
        divineReflex: 0,
    },
    destinyUpgrades: {
        globalCoinMultiplier: 0,
        upgradeCostReducer: 0,
        blessingRarity: 0,
        startingCoins: 0,
    }
});

export const getPlayerState = (): PlayerState => {
    try {
        const state = localStorage.getItem(PLAYER_STATE_KEY);
        const defaultState = getInitialPlayerState();
        if(state) {
            const parsed = JSON.parse(state);
            // Merge to handle users with old state shape
            return {
                ...defaultState,
                ...parsed,
                upgrades: {
                    ...defaultState.upgrades,
                    ...(parsed.upgrades || {})
                },
                destinyUpgrades: {
                    ...defaultState.destinyUpgrades,
                    ...(parsed.destinyUpgrades || {})
                }
            };
        }
        return defaultState;
    } catch (e) {
        console.error("Failed to read player state", e);
        return getInitialPlayerState();
    }
}

export const savePlayerState = (state: PlayerState) => {
    try {
        localStorage.setItem(PLAYER_STATE_KEY, JSON.stringify(state));
    } catch (e) {
        console.error("Failed to save player state", e);
    }
}

// --- Highscores & Logging ---
export const getHighScores = (): HighScores => {
  try {
    const scores = localStorage.getItem(HIGH_SCORES_KEY);
    const defaultScores = { match: 0, quiz: 0, falling: 0, tower: 0 };
    if (scores) {
        return { ...defaultScores, ...JSON.parse(scores) };
    }
    return defaultScores;
  } catch (e) {
    console.error("Failed to read high scores from localStorage", e);
    return { match: 0, quiz: 0, falling: 0, tower: 0 };
  }
};

export const logResult = (game: GameName, score: number, totalCorrect?: number, totalWrong?: number): { entry: GameHistoryEntry, coinsEarned: number } => {
    const playerState = getPlayerState();
    const highScores = getHighScores();

    // Update high score for current game first
    if (score > highScores[game]) {
        highScores[game] = score;
        localStorage.setItem(HIGH_SCORES_KEY, JSON.stringify(highScores));
    }
    
    // --- COIN CALCULATION ---
    let baseCoin: number;
    if (game === 'tower') {
        baseCoin = Math.floor(Math.max(0, score) / 10);
    } else {
        baseCoin = Math.floor(Math.sqrt(Math.max(0, score)) * 8);
    }

    // 1. Standard coin bonus
    const coinBonusMultiplier = 1 + (playerState.upgrades.coinBonus * 0.05);
    
    // 2. High score bonus
    const totalHighScore = Object.values(highScores).reduce((sum, s) => sum + s, 0);
    const highScoreBonus = Math.floor(totalHighScore / 1000) * (playerState.upgrades.highScoreBonus * 0.01);
    
    // 3. Coin Interest
    const interestBonus = Math.floor(playerState.coins * (playerState.upgrades.coinInterest * 0.001));

    // 4. Legacy of Knowledge bonus
    const totalUpgradeLevels = Object.values(playerState.upgrades).reduce((sum, level) => sum + level, 0);
    const legacyBonusMultiplier = 1 + (totalUpgradeLevels * (playerState.upgrades.legacyOfKnowledge * 0.001));

    const totalMultiplier = (coinBonusMultiplier + highScoreBonus) * legacyBonusMultiplier;
    const globalDestinyMultiplier = 1 + (playerState.destinyUpgrades.globalCoinMultiplier * 0.05);

    let coinsEarned = Math.floor((baseCoin * totalMultiplier) + interestBonus) * globalDestinyMultiplier;

    // 5. Soul Siphon check
    if ((playerState.upgrades.soulSiphon || 0) > 0 && Math.random() < playerState.upgrades.soulSiphon * 0.01) {
        coinsEarned *= 2;
    }
    
    playerState.coins += coinsEarned;
    savePlayerState(playerState);

    const now = new Date();
    const entry: GameHistoryEntry = {
        time: now.toLocaleString('vi-VN'),
        game,
        score,
        correct: totalCorrect,
        wrong: totalWrong
    };

    try {
        const log = localStorage.getItem(RESULTS_LOG_KEY);
        const currentLog: GameHistoryEntry[] = log ? JSON.parse(log) : [];
        currentLog.unshift(entry);
        localStorage.setItem(RESULTS_LOG_KEY, JSON.stringify(currentLog.slice(0, 100))); // Limit log size
    } catch (e) {
        console.error("Failed to save result log", e);
    }
    
    return { entry, coinsEarned };
};

export const getResultsLog = (): GameHistoryEntry[] => {
    try {
        const log = localStorage.getItem(RESULTS_LOG_KEY);
        return log ? JSON.parse(log) : [];
    } catch (e) {
        console.error("Failed to read results log from localStorage", e);
        return [];
    }
}