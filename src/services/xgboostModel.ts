// Service XGBoost temporairement désactivé
export class XGBoostModel {
  static async train() {
    return Promise.resolve();
  }

  static async predict() {
    return Promise.resolve([]);
  }
}