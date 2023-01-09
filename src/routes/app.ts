import express, { Request, Response } from "express";
import conn from "../db/conn";
import dotenv from "dotenv";
import { ObjectId } from "mongodb";
import { createHash } from "crypto";

type Judge = {
  name: string;
  email: string;
  evaluations: Evaluation[];
};

type Evaluation = {
  tournamentName: string;
  date: Date | string;
  roundName: string; // e.g., Round 1 Flight A etc.
  isPrelim: boolean;
  isImprovement: boolean;
  decision: number;
  comparison: number;
  citation: number;
  coverage: number;
  bias: number;
  weight: number;
};

dotenv.config();
const router = express.Router();
const dbo = conn;

// if it works
router.route("/test").get((_: Request, res: Response) => {
  res.json({ status: "No API key" });
});

// auth
// new auth
router.route("/authy").post((req: Request, res: Response) => {
    const dbConnect = dbo.getDb();
    let un = req.body.username;
    let pw = req.body.password;
    let hash = createHash('sha256').update(`${un}${pw}`).digest('hex');
    console.log(`${un}${pw} - ${hash}`);

    dbConnect.collection("auth").insertOne({username: un, password: hash}, (err: Error, resp: Response) => {
        if (err) throw err;
        res.json({result: hash, status: `Created account ${un}`}); // usernames are not exclusive until i implement that
    });
});

router.route("/authy/:un/:pw").get((req: Request, res: Response) => {
    const dbConnect = dbo.getDb();
    let un = req.params.un;
    let pw = req.params.pw;
    let hash = createHash('sha256').update(`${un}${pw}`).digest('hex');
    dbConnect  
    .collection("auth")
    .findOne({username: un, password: hash}, (err: Error, result: Response) => {
        if (err) throw err;
        console.log(result);
        if(result) {
            res.json({result: 1, status: `Found account ${req.params.un}`});
        } else {
            res.json({result: -1, status: `Not valid account`});
        }
    });
});

// key -> boolean
router.route("/auth/:key").get((req: Request, res: Response) => {
  if (req.params.key === process.env.PASSWORD) {
    res.json({ status: "Correct Password", auth: true });
  } else {
    res.json({ status: "Incorrect Password", auth: false });
  }
});

// get one judge
// key, string -> Judge
router
  .route("/get/judge/:apikey/:judgeId")
  .get((req: Request, res: Response) => {
    const dbConnect = dbo.getDb();
    if (!req.params.apikey) {
      res.json({ status: "No API key" });
    } else if (!req.params.judgeId) {
      res.json({ status: "No judge given" });
    } else {
      if (req.params.apikey !== process.env.APIKEY) {
        res.json({ status: "Incorrect API key" });
      } else {
        dbConnect
          .collection("judges")
          .findOne(
            { _id: new ObjectId(req.params.judgeId) },
            (err: Error, result: Response) => {
              if (err) throw err;
              res.json({ result, status: `Found judge ${req.params.judgeId}` });
            }
          );
      }
    }
  });

router.route("/get/judge/:apikey/").get((req: Request, res: Response) => {
  res.json({ status: "No judge given" });
});

// get all judges
// key -> [Judge]
router.route("/get/alljudges/:apikey").get((req: Request, res: Response) => {
  const dbConnect = dbo.getDb();
  if (!req.params.apikey) {
    res.json({ status: "No API key" });
  } else {
    if (req.params.apikey !== process.env.APIKEY) {
      res.json({ status: "Incorrect API key" });
    } else {
      dbConnect
        .collection("judges")
        .find({})
        .toArray((err: Error, result: Response) => {
          if (err) throw err;
          res.json({ result, status: `Found all judges` });
        });
    }
  }
});

// create judge
// Judge -> void
router.route("/create/judge").post(async (req: Request, res: Response) => {
  const dbConnect = dbo.getDb();
  if (!req.body.apikey) {
    res.json({ status: "No API key" });
  } else {
    if (req.body.apikey !== process.env.APIKEY) {
      res.json({ status: "Incorrect API key" });
    } else {
      const judge: Judge = {
        name: req.body.name,
        email: req.body.email,
        evaluations: [],
      };

      dbConnect
        .collection("judges")
        .insertOne(judge, (err: Error, resp: Response) => {
          if (err) throw err;
          res.json({ result: resp, status: `Created judge ${judge.name}` });
        });
    }
  }
});

// add evaluation
// Judge UUID -> void
router
  .route("/update/judge/:apikey/:judgeid")
  .post(async (req: Request, res: Response) => {
    const dbConnect = dbo.getDb();
    if (!req.params.apikey) {
      res.json({ status: "No API key" });
    } else {
      if (req.params.apikey !== process.env.APIKEY) {
        res.json({ status: "Incorrect API key" });
      } else {
        const query = { _id: new ObjectId(req.params.judgeid) };
        const newEvaluation: Evaluation = {
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
          date: new Date(),
        };

        dbConnect
          .collection("judges")
          .findOne(query, (err: Error, result: any) => {
            if (err) throw err;
            // i have that judge now
            const judgeEvalsCurrent = result.evaluations;
            judgeEvalsCurrent.push(newEvaluation);

            dbConnect
              .collection("judges")
              .updateOne(
                query,
                { $set: { evaluations: judgeEvalsCurrent } },
                (error2: Error, resp: Response) => {
                  if (error2) throw error2;
                  res.json({
                    result: resp,
                    status: `Updated judge ${req.params.judgeid}`,
                  });
                }
              );
          });
      }
    }
  });

// routes to delete
router
  .route("/delete/judge/:apikey")
  .delete(async (req: Request, res: Response) => {
    // body: judge id
    const dbConnect = dbo.getDb();
    if (!req.params.apikey) {
      res.json({ status: "No API key" });
    } else {
      if (req.params.apikey !== process.env.APIKEY) {
        res.json({ status: "Incorrect API key" });
      } else {
        const query = { _id: new ObjectId(req.body.judgeid) };
        dbConnect
          .collection("judges")
          .deleteOne(query, (err: Error, obj: any) => {
            if (!err) res.json({ status: `Deleted judge ${req.body.judgeid}` });
          });
      }
    }
  });

router
  .route("/delete/evaluation/:apikey")
  .delete(async (req: Request, res: Response) => {
    // body: judge id, eval index
    const dbConnect = dbo.getDb();
    if (!req.params.apikey) {
      res.json({ status: "No API key" });
    } else {
      if (req.params.apikey !== process.env.APIKEY) {
        res.json({ status: "Incorrect API key" });
      } else {
        const query = { _id: new ObjectId(req.body.judgeid) };

        dbConnect
          .collection("judges")
          .findOne(query, (err: Error, result: any) => {
            if (err) throw err;
            // i have that judge now
            const judgeEvalsCurrent = result.evaluations;
            const j: Evaluation[] = [];
            for (let i = 0; i < judgeEvalsCurrent.length; i++) {
              if (i !== req.body.index) {
                j.push(judgeEvalsCurrent[i]);
              }
            }

            dbConnect
              .collection("judges")
              .updateOne(
                query,
                { $set: { evaluations: j } },
                (error2: Error, resp: Response) => {
                  if (error2) throw error2;
                  res.json({
                    result: resp,
                    status: `Deleted evaluation ${req.body.index} of judge ${req.body.judgeid}`,
                  });
                }
              );
          });
      }
    }
  });

module.exports = router;
export default router;
