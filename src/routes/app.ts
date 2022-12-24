import express, { Request, Response } from "express";
import conn from "../db/conn";
import dotenv from "dotenv";

type Judge = {
    name: string,
    email: string,
    evaluations: Evaluation[],
    totalEarnedPoints: number,
    totalPossiblePoints: number
}

type Evaluation = {
    tournamentName: string,
    roundName: string, // e.g., Round 1 Flight A etc.
    isPrelim: boolean,
    isImprovement: boolean,
    decision: number,
    comparison: number,
    citation: number,
    coverage: number,
    bias: number,
    weight: number
}

dotenv.config();
const router = express.Router();
const dbo = conn;

// if it works
router.route("/test/").get((_: Request, res: Response) => {
    res.json({response: 403, message: "No API key"});
});

// get one judge
// key, string -> Judge
router.route("/get/judge/:apikey/:judgeName").get((req: Request, res: Response) => {
    const dbConnect = dbo.getDb();
    if(!req.params.apikey) {
        res.json({response: 403, message: "No API key"});
    } else {
        if(req.params.apikey!=process.env.APIKEY) {
            res.json({response: 403, message: "Incorrect API key"});
        } else {
            dbConnect
            .collection("judges")
            .findOne({name: req.params.judgeName}, (err: Error, result: Response) => {
                if (err) throw err;
                res.json(result);
            });
        }
    }
});

// get all judges
// key -> [Judge]
router.route("/get/alljudges/:apikey").get((req: Request, res: Response) => {
    const dbConnect = dbo.getDb();
    if(!req.params.apikey) {
        res.json({response: 403, message: "No API key"});
    } else {
        if(req.params.apikey!=process.env.APIKEY) {
            res.json({response: 403, message: "Incorrect API key"});
        } else {
            dbConnect
            .collection("judges")
            .find({})
            .toArray(function (err: Error, result: Response) {
                if (err) throw err;
                res.json(result);
            });
        }
    }
});

// create judge
// Judge -> void
router.route("/create/judge").post(async (req: Request, res: Response) => {
    const dbConnect = dbo.getDb();
    if(!req.body.apikey) {
        res.json({response: 403, message: "No API key"});
    } else {
        if(req.body.apikey!=process.env.APIKEY) {
            res.json({response: 403, message: "Incorrect API key"});
        } else {
            const judge: Judge = {
                name: req.body.name,
                email: req.body.email,
                evaluations: [],
                totalEarnedPoints: 0,
                totalPossiblePoints: 0,
            }
        
            dbConnect.collection("judges").insertOne(judge, (err: Error, resp: Response) => {
                if (err) throw err;
                res.json(resp);
            });
        }
    }
});

// add evaluation
// Judge UUID -> void
router.route("/update/judge/:apikey/:judgeid").post(async (req: Request, res: Response) => {
    const dbConnect = dbo.getDb();
    if(!req.body.apikey) {
        res.json({response: 403, message: "No API key"});
    } else {
        if(req.body.apikey!=process.env.APIKEY) {
            res.json({response: 403, message: "Incorrect API key"});
        } else {
            let query = {_id: req.query.judgeid};
            let newEvaluation: Evaluation = {
                tournamentName: req.body.tName,
                roundName: req.body.rName, // e.g., Round 1 Flight A etc.
                isPrelim: req.body.isPrelim,
                isImprovement: req.body.isImprovement,
                decision: req.body.decision,
                comparison: req.body.comparison,
                citation: req.body.citation,
                coverage: req.body.coverage,
                bias: req.body.bias,
                weight: req.body.isImprovement ? req.body.weight*0.25 : req.body.weight
            };

            dbConnect
            .collection("judges")
            .findOne(query, (err: Error, result: any) => {
                if (err) throw err;
                // i have that judge now
                let judgeEvalsCurrent = result.evaluations;
                judgeEvalsCurrent.push(newEvaluation);

                dbConnect
                .collection("judges")
                .updateOne(query, {$set: {evaluations: judgeEvalsCurrent}}, function (err: Error, resp: Response) {
                    if (err) throw err;
                    res.json(resp);
                });
            });
        }
    }
});

module.exports = router;
export default router;