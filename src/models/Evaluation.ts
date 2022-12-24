export default class Evaluation {
    constructor (
        public tournamentName: string,
        public roundName: string, // e.g., Round 1 Flight A etc.
        public isPrelim: boolean,
        public isImprovement: boolean,
        public decision: number,
        public comparison: number,
        public citation: number,
        public coverage: number,
        public bias: number,
        public weight: number
    ) {}

    static computeImprovementWeight(listOfAllEvaluations: Evaluation[]): number {
        let sum = 0;
        for(const i of listOfAllEvaluations) {
            sum+=i.weight;
        }

        return sum*0.25;
    }

    getTotalScore(): number {
        return (this.bias+this.citation+this.comparison+this.coverage+this.decision);
    }
}