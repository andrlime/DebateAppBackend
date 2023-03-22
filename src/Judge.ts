import { ObjectId } from "mongodb";
import { Evaluation } from "./Evaluation";
import { stdDev } from '@mathigon/fermat';
import Options from "./Options";

export type Judge = {
  _id: ObjectId | string;
  name: string;
  email: string;
  evaluations: Evaluation[];
  paradigm: string;
  options?: Options
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

const findFourMostRecents = (j: Judge) => {
  // this assues the judge is sorted as it should be in the axios response
  let strings: string[] = [];
  let count = 0;
  const AMOUNT_I_WANT = 4;
  for(let ev of j.evaluations) {
    if(strings.includes(ev.tournamentName)) continue;
    else {
      strings.push(ev.tournamentName);
      count++;
    }
    if(count == AMOUNT_I_WANT) {
      return strings;
    }
  }

  return strings;
}

export const computeZ = (judge: Judge, judges: Judge[]): number => {
  const W_AVG_ALLJUDGES = (judges.reduce((accum, current) => accum + computeMean(current, findFourMostRecents(current)),0)/judges.length);
  const W_AVG_JUST_THIS_JUDGE = computeMean(judge, findFourMostRecents(judge));

  let ARR_EVALS: number[] = [];
  judge.evaluations.forEach((e) => {
    let fmr = findFourMostRecents(judge);
    if(fmr.includes(e.tournamentName)) {
      ARR_EVALS.push(e.bias+e.citation+e.comparison+e.coverage+e.decision);
    }
  });

  let ARR_ALL_EVALS: number[] = [];
  judges.forEach((f) => {
    let fmr = findFourMostRecents(f);
    f.evaluations.forEach((e) => {
      if(fmr.includes(e.tournamentName)) {
        ARR_ALL_EVALS.push(e.bias+e.citation+e.comparison+e.coverage+e.decision);
      }
    });
  });

  // find stdev for both samples
  const SD_JUST_THIS_JUDGE = stdDev(ARR_EVALS);
  const SD_ALL_JUDGES = stdDev(ARR_ALL_EVALS);
  const WEIGHT_OF_JUST_ME = 0.25;

  //let denominator = (SD_ALL_JUDGES**2 * ((1/(findFourMostRecents(judge).length) + ((SD_JUST_THIS_JUDGE) + 1/(judges.reduce((acc, cur) => acc + findFourMostRecents(cur).length,0)))))) ** 0.5;
  //console.log(W_AVG_JUST_THIS_JUDGE, computeMean(judge, findFourMostRecents(judge)));
  let ZZ = (W_AVG_JUST_THIS_JUDGE - W_AVG_ALLJUDGES) / ((1-WEIGHT_OF_JUST_ME)*SD_ALL_JUDGES + WEIGHT_OF_JUST_ME*SD_JUST_THIS_JUDGE);
  return ZZ
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

    const G = averages.reduce((acc, cur) => acc + cur, 0) / averages.length;
    return isNaN(G) ? 0 : G;
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

    const G = averages.reduce((acc, cur) => acc + cur, 0) / averages.length;
    return isNaN(G) ? 0 : G;
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

    const G = averages.reduce((acc, cur) => acc + cur, 0) / averages.length;
    return isNaN(G) ? 0 : G;
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

    const G = averages.reduce((acc, cur) => acc + cur, 0) / averages.length;
    return isNaN(G) ? 0 : G;
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

    const G = averages.reduce((acc, cur) => acc + cur, 0) / averages.length;
    return isNaN(G) ? 0 : G;
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

    const G = averages.reduce((acc, cur) => acc + cur, 0) / averages.length;
    return isNaN(G) ? 0 : G;
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