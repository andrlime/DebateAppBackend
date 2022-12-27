import express, { Request, Response } from "express";
import conn from "../db/conn";
import dotenv from "dotenv";
import { ObjectId } from "mongodb";

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
    weight: number,
    date: Date
}

dotenv.config();
const router = express.Router();
const dbo = conn;

// if it works
router.route("/test").get((_: Request, res: Response) => {
    res.json({status: "No API key"});
});

// auth
// key -> boolean
router.route("/auth/:key").get((req: Request, res: Response) => {
    if(req.params.key == process.env.PASSWORD) {
        res.json({status: "Correct Password", auth: true});
    } else {
        res.json({status: "Incorrect Password", auth: false});
    }
});

// get one judge
// key, string -> Judge
router.route("/get/judge/:apikey/:judgeId").get((req: Request, res: Response) => {
    const dbConnect = dbo.getDb();
    if(!req.params.apikey) {
        res.json({status: "No API key"});
    } else if (!req.params.judgeId) {
        res.json({status: "No judge given"});
    } else {
        if(req.params.apikey!=process.env.APIKEY) {
            res.json({status: "Incorrect API key"});
        } else {
            dbConnect
            .collection("judges")
            .findOne({_id: new ObjectId(req.params.judgeId)}, (err: Error, result: Response) => {
                if (err) throw err;
                res.json({result: result, status: `Found judge ${req.params.judgeId}`});
            });
        }
    }
});

router.route("/get/judge/:apikey/").get((req: Request, res: Response) => {
    res.json({status: "No judge given"});
});

// get all judges
// key -> [Judge]
router.route("/get/alljudges/:apikey").get((req: Request, res: Response) => {
    const dbConnect = dbo.getDb();
    if(!req.params.apikey) {
        res.json({status: "No API key"});
    } else {
        if(req.params.apikey!=process.env.APIKEY) {
            res.json({status: "Incorrect API key"});
        } else {
            dbConnect
            .collection("judges")
            .find({})
            .toArray(function (err: Error, result: Response) {
                if (err) throw err;
                res.json({result: result, status: `Found all judges`});
            });
        }
    }
});

// create judge
// Judge -> void
router.route("/create/judge").post(async (req: Request, res: Response) => {
    const dbConnect = dbo.getDb();
    if(!req.body.apikey) {
        res.json({status: "No API key"});
    } else {
        if(req.body.apikey!=process.env.APIKEY) {
            res.json({status: "Incorrect API key"});
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
                res.json({result: resp, status: `Created judge ${judge.name}`});
            });
        }
    }
});

// add evaluation
// Judge UUID -> void
router.route("/update/judge/:apikey/:judgeid").post(async (req: Request, res: Response) => {
    const dbConnect = dbo.getDb();
    if(!req.params.apikey) {
        res.json({status: "No API key"});
    } else {
        if(req.params.apikey!=process.env.APIKEY) {
            res.json({status: "Incorrect API key"});
        } else {
            let query = {_id: new ObjectId(req.params.judgeid)};
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
                weight: req.body.weight, // needs to be fixed
                date: new Date()
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
                .updateOne(query, {$set: {evaluations: judgeEvalsCurrent, totalEarnedPoints: result.totalEarnedPoints+(req.body.decision+req.body.comparison+req.body.citation+req.body.coverage+req.body.bias), totalPossiblePoints: result.totalPossiblePoints+5}}, (err: Error, resp: Response) => {
                    if (err) throw err;
                    res.json({result: resp, status: `Updated judge ${req.params.judgeid}`});
                });
            });
        }
    }
});

// routes to delete
router.route("/delete/judge/:apikey").delete(async (req: Request, res: Response) => {
    // body: judge id
    const dbConnect = dbo.getDb();
    if(!req.params.apikey) {
        res.json({status: "No API key"});
    } else {
        if(req.params.apikey!=process.env.APIKEY) {
            res.json({status: "Incorrect API key"});
        } else {
            let query = {_id: new ObjectId(req.body.judgeid)};
            dbConnect
            .collection("judges")
            .deleteOne(query, (err: Error, obj: any) => {
                if(!err) res.json({status: `Deleted judge ${req.body.judgeid}`});
            });
        }
    }
});

router.route("/delete/evaluation/:apikey").delete(async (req: Request, res: Response) => {
    // body: judge id, eval index
    const dbConnect = dbo.getDb();
    if(!req.params.apikey) {
        res.json({status: "No API key"});
    } else {
        if(req.params.apikey!=process.env.APIKEY) {
            res.json({status: "Incorrect API key"});
        } else {
            let query = {_id: new ObjectId(req.body.judgeid)};

            dbConnect
            .collection("judges")
            .findOne(query, (err: Error, result: any) => {
                if (err) throw err;
                // i have that judge now
                let judgeEvalsCurrent = result.evaluations;
                let j: Evaluation[] = [];
                for(let i = 0; i < judgeEvalsCurrent.length; i ++) {
                    if(i != req.body.index) {
                        j.push(judgeEvalsCurrent[i]);
                    }
                }

                dbConnect
                .collection("judges")
                .updateOne(query, {$set: {evaluations: j}}, (err: Error, resp: Response) => {
                    if (err) throw err;
                    res.json({result: resp, status: `Deleted evaluation ${req.body.index} of judge ${req.body.judgeid}`});
                });
            });
        }
    }
});

module.exports = router;
export default router;