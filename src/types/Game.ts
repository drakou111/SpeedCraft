export type GoalItem = {
  items: string[];
  min?: number;
  max?: number;
};

export type ItemInfo = {
  id: string,
  count: number
}

export type Game = {
  goals: GoalItem[];
  startLayout: Array<ItemInfo | null>;
  title?: string;
  author?: string;
  description?: string;
  showOnUI?: boolean;
  infiniteSupply?: string[];
  checkAtEndOnly: boolean;
};
