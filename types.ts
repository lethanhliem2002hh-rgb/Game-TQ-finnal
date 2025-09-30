export interface WordPair {
  vi: string;
  zh:string;
}

export enum Game {
  Match,
  Quiz,
  Falling,
  Tower,
}

export type GameName = 'match' | 'quiz' | 'falling' | 'tower';

export interface HighScores {
    match: number;
    quiz: number;
    falling: number;
    tower: number;
}

export interface GameHistoryEntry {
    time: string;
    game: GameName;
    score: number;
    correct?: number;
    wrong?: number;
}

export type UpgradeType = 
    // Old
    | 'timeExtension' 
    | 'penaltyReduction' 
    | 'coinBonus'
    | 'quizStreakBonus'
    | 'fallingSlowdown'
    | 'extraLife'
    // New Grand Upgrades
    | 'coinInterest'
    | 'highScoreBonus'
    | 'towerExtraLife'
    | 'towerStartWithBlessing'
    | 'towerBlessingReroll'
    | 'towerAddRareBlessings'
    // User Suggested
    | 'soulSiphon'
    | 'legacyOfKnowledge'
    | 'divineReflex';


export type DestinyUpgradeType = 
    | 'globalCoinMultiplier'
    | 'upgradeCostReducer'
    | 'blessingRarity'
    | 'startingCoins';

export interface PlayerState {
    coins: number;
    destinyPoints: number;
    upgrades: {
        [key in UpgradeType]: number;
    };
    destinyUpgrades: {
        [key in DestinyUpgradeType]: number;
    };
}

export interface VocabStat {
    correct: number;
    incorrect: number;
    lastCorrectTimestamp: number;
}