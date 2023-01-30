import { ObjectId } from "mongodb";
import { Evaluation } from "./Evaluation";
import { stdDev } from '@mathigon/fermat';

export type Judge = {
  _id?: ObjectId | string;
  name: string;
  email: string;
  evaluations: Evaluation[];
  paradigm: string;
};

// methods
export const computeStdev = (judge: Judge): number => {
  const partialList = [];
  for (const i of judge.evaluations) {
    partialList.push(
      i.bias + i.citation + i.comparison + i.coverage + i.decision
    );
  }

  // compute stdev of that list
  const sumOfList = partialList.reduce((accum, current) => accum + current, 0);
  const mean = sumOfList / partialList.length;

  const sumOfVariances = partialList.reduce(
    (accum, current) => accum + (current - mean) ** 2,
    0
  );
  return (sumOfVariances / (partialList.length - 1)) ** 0.5;
};

export const computeZ = (judge: Judge, judges: Judge[]): number => {
  const W_AVG_ALLJUDGES = (judges.reduce((accum, current) => accum + computeMean(current),0)/judges.length);
  const W_AVG_JUST_THIS_JUDGE = computeMean(judge);

  let ARR_EVALS: number[] = [];
  judge.evaluations.forEach((e) => {
    ARR_EVALS.push(e.bias+e.citation+e.comparison+e.coverage+e.decision);
  });

  let ARR_ALL_EVALS: number[] = [];
  judges.forEach((f) => {
    if(f.evaluations[0] && f.evaluations.length > 0) {
      f.evaluations.forEach((e) => {
        ARR_ALL_EVALS.push(e.bias+e.citation+e.comparison+e.coverage+e.decision);
      });
    }
  });

  // find stdev for both samples
  const SD_JUST_THIS_JUDGE = stdDev(ARR_EVALS);
  const SD_ALL_JUDGES = stdDev(ARR_ALL_EVALS);

  return (W_AVG_JUST_THIS_JUDGE - W_AVG_ALLJUDGES) /
    ((((SD_JUST_THIS_JUDGE**2)/ARR_EVALS.length) + ((SD_ALL_JUDGES**2)/ARR_ALL_EVALS.length))**0.5 + 1);
};

export const computeMean = (j: Judge, f?: string[]): number => {
  // f is filters
  if (f) {
    // yes filters, only do the ones inside filters
    let averages = [];
    for (let currentFilter of f) {
      // HORRIBLE O(n^4)?
      let count = 0;
      let sum = 0;
      for (let ev of j.evaluations) {
        if (ev.tournamentName == currentFilter) {
          count++;
          sum +=
            ev.bias + ev.citation + ev.comparison + ev.coverage + ev.decision;
        }
      }
      averages.push(sum / count);
    }

    // now i have all the averages, so i want to average the averages

    return averages.reduce((acc, cur) => acc + cur, 0) / averages.length;
  } else {
    // no filters, do all of them
    let wsum = 0;
    let wtotal = 0;

    for (let ev of j.evaluations) {
      wsum +=
        (ev.bias + ev.citation + ev.comparison + ev.coverage + ev.decision) *
        ev.weight;
      wtotal += ev.weight;
    }

    let result = wsum / wtotal;
    return isNaN(result) ? 0 : result;
  }
};

export const computeMeanDecision = (j: Judge, f?: string[]): number => {
  // f is filters
  if (f) {
    // yes filters, only do the ones inside filters
    let averages = [];
    for (let currentFilter of f) {
      // HORRIBLE O(n^4)?
      let count = 0;
      let sum = 0;
      for (let ev of j.evaluations) {
        if (ev.tournamentName == currentFilter) {
          count++;
          sum += ev.decision;
        }
      }
      averages.push(sum / count);
    }

    // now i have all the averages, so i want to average the averages

    return averages.reduce((acc, cur) => acc + cur, 0) / averages.length;
  } else {
    // no filters, do all of them
    let wsum = 0;
    let wtotal = 0;

    for (let ev of j.evaluations) {
      wsum += ev.decision * ev.weight;
      wtotal += ev.weight;
    }

    let result = wsum / wtotal;
    return isNaN(result) ? 0 : result;
  }
};

export const computeMeanCoverage = (j: Judge, f?: string[]): number => {
  // f is filters
  if (f) {
    // yes filters, only do the ones inside filters
    let averages = [];
    for (let currentFilter of f) {
      // HORRIBLE O(n^4)?
      let count = 0;
      let sum = 0;
      for (let ev of j.evaluations) {
        if (ev.tournamentName == currentFilter) {
          count++;
          sum += ev.coverage;
        }
      }
      averages.push(sum / count);
    }

    // now i have all the averages, so i want to average the averages

    return averages.reduce((acc, cur) => acc + cur, 0) / averages.length;
  } else {
    // no filters, do all of them
    let wsum = 0;
    let wtotal = 0;

    for (let ev of j.evaluations) {
      wsum += ev.coverage * ev.weight;
      wtotal += ev.weight;
    }

    let result = wsum / wtotal;
    return isNaN(result) ? 0 : result;
  }
};

export const computeMeanCitation = (j: Judge, f?: string[]): number => {
  // f is filters
  if (f) {
    // yes filters, only do the ones inside filters
    let averages = [];
    for (let currentFilter of f) {
      // HORRIBLE O(n^4)?
      let count = 0;
      let sum = 0;
      for (let ev of j.evaluations) {
        if (ev.tournamentName == currentFilter) {
          count++;
          sum += ev.citation;
        }
      }
      averages.push(sum / count);
    }

    // now i have all the averages, so i want to average the averages

    return averages.reduce((acc, cur) => acc + cur, 0) / averages.length;
  } else {
    // no filters, do all of them
    let wsum = 0;
    let wtotal = 0;

    for (let ev of j.evaluations) {
      wsum += ev.citation * ev.weight;
      wtotal += ev.weight;
    }

    let result = wsum / wtotal;
    return isNaN(result) ? 0 : result;
  }
};

export const computeMeanComparison = (j: Judge, f?: string[]): number => {
  // f is filters
  if (f) {
    // yes filters, only do the ones inside filters
    let averages = [];
    for (let currentFilter of f) {
      // HORRIBLE O(n^4)?
      let count = 0;
      let sum = 0;
      for (let ev of j.evaluations) {
        if (ev.tournamentName == currentFilter) {
          count++;
          sum += ev.comparison;
        }
      }
      averages.push(sum / count);
    }

    // now i have all the averages, so i want to average the averages

    return averages.reduce((acc, cur) => acc + cur, 0) / averages.length;
  } else {
    // no filters, do all of them
    let wsum = 0;
    let wtotal = 0;

    for (let ev of j.evaluations) {
      wsum += ev.comparison * ev.weight;
      wtotal += ev.weight;
    }

    let result = wsum / wtotal;
    return isNaN(result) ? 0 : result;
  }
};

export const computeMeanBias = (j: Judge, f?: string[]): number => {
  // f is filters
  if (f) {
    // yes filters, only do the ones inside filters
    let averages = [];
    for (let currentFilter of f) {
      // HORRIBLE O(n^4)?
      let count = 0;
      let sum = 0;
      for (let ev of j.evaluations) {
        if (ev.tournamentName == currentFilter) {
          count++;
          sum += ev.bias;
        }
      }
      averages.push(sum / count);
    }

    // now i have all the averages, so i want to average the averages

    return averages.reduce((acc, cur) => acc + cur, 0) / averages.length;
  } else {
    // no filters, do all of them
    let wsum = 0;
    let wtotal = 0;

    for (let ev of j.evaluations) {
      wsum += ev.bias * ev.weight;
      wtotal += ev.weight;
    }

    let result = wsum / wtotal;
    return isNaN(result) ? 0 : result;
  }
};

export default Judge;