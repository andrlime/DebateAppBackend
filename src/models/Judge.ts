import Evaluation from "./Evaluation"

export default class Judge { // This class exists but remains UNUSED
    constructor (
        public name: string,
        public email: string,
        public evaluations: Evaluation[],
        public totalEarnedPoints: number,
        public totalPossiblePoints: number
    ) {}

    static computeRating(judge: Judge): [number, number] { // [avg, stdev]
        return [judge.totalEarnedPoints/judge.totalPossiblePoints, Judge.computeStdev(judge)];
    }

    static computeStdev(judge: Judge): number { // this is unweighted stdev
        const partialList = [];
        for(const i of judge.evaluations) {
            partialList.push(i.getTotalScore());
        }

        // compute stdev of that list
        const sumOfList = partialList.reduce((accum, current) => accum+current, 0);
        const mean = sumOfList/partialList.length;

        const sumOfVariances = partialList.reduce((accum, current) => accum+((current-mean)**2), 0);
        return (sumOfVariances/(partialList.length-1))**(0.5);
    }
}