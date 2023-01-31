import express, { Request, Response } from "express";
import conn from "../db/conn";
import dotenv from "dotenv";
import { ObjectId } from "mongodb";
import { createHash } from "crypto";
import { assert } from "console";
import nodemailer from "nodemailer";
import Judge, { computeMean,computeMeanCitation,computeMeanCoverage,computeMeanBias,computeMeanComparison,computeMeanDecision,computeStdev,computeZ } from '../Judge';
import { Evaluation } from "../Evaluation";

dotenv.config();
const router = express.Router();
const dbo = conn;
const [username, password]: [string, string] = [process.env.EMAIL_USERNAME || "", process.env.EMAIL_PASSWORD || ""];

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: username, pass: password },
});

// if it works
router.route("/test").get((_: Request, res: Response) => {
  res.json({ status: "No API key" });
});

// auth
// new auth
router.route("/authy").post((req: Request, res: Response) => {
  const dbConnect = dbo.getDb();
  const un = req.body.username;
  const pw = req.body.password;
  const hash = createHash("sha256").update(`${un}${pw}`).digest("hex");

  dbConnect
    .collection("auth")
    .insertOne(
      { username: un, password: hash },
      (err: Error, resp: Response) => {
        if (err) throw err;
        res.json({ result: hash, status: `Created account ${un}` }); // usernames are not exclusive until i implement that
      }
    );
});

router.route("/authy/:un/:pw").get((req: Request, res: Response) => {
  const dbConnect = dbo.getDb();
  const un = req.params.un;
  const pw = req.params.pw;
  const hash = createHash("sha256").update(`${un}${pw}`).digest("hex");
  dbConnect
    .collection("auth")
    .findOne(
      { username: un, password: hash },
      (err: Error, result: Response) => {
        if (err) throw err;
        if (result) {
          res.json({ result: 1, status: `Found account ${req.params.un}` });
        } else {
          res.json({ result: -1, status: `Not valid account` });
        }
      }
    );
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
        paradigm: ""
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
          divisionName: req.body.dName || "N/A",
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

router
  .route("/get/alleval")
  .post(async (req: Request, res: Response) => {
    const dbConnect = dbo.getDb();
    if (!req.body.apikey) {
      res.json({ status: "No API key" });
    } else {
      if (req.body.apikey !== process.env.APIKEY) {
        res.json({ status: "Incorrect API key" });
      } else {
        const email = req.body.email;
        assert(email);

        // Now, pull all judges and create a spreadsheet
        dbConnect
        .collection("judges")
        .find({})
        .toArray((err: Error, result: any) => { // ew, don't use any!
          if (err) throw err;

          // Found all judges!
          let resultString = "id,judgeName,date,tournament,division,round,prelim,improvement,decision,comparison,citation,coverage,bias,weight\n";
          const judges: Judge[] = result;

          for(const j of judges) {
            const ev = j.evaluations;
            for(const evalu of ev) {
              resultString+=`${j._id},${j.name},${evalu.date.toString()},${evalu.tournamentName},${evalu.divisionName},${evalu.roundName},${evalu.isPrelim},${evalu.isImprovement},${evalu.decision},${evalu.comparison},${evalu.citation},${evalu.coverage},${evalu.bias},${evalu.weight}\n`;
            }
          }

          let overallResultString = "id,judgeName,email,decision,comparison,citation,coverage,bias,avg,stdev,z\n";

          for(const j of judges) {
            overallResultString+=`${j._id},${j.name},${j.email},${computeMeanDecision(j)},${computeMeanComparison(j)},${computeMeanCitation(j)},${computeMeanCoverage(j)},${computeMeanBias(j)},${computeMean(j)},${computeStdev(j) || 0},${computeZ(j,judges)}\n`;
          }

          overallResultString+=`OVERALL,,,${Math.round(1000*(judges.reduce((accum, current) => accum + computeMeanDecision(current),0)/judges.length))/1000},${Math.round(1000*(judges.reduce((accum, current) => accum + computeMeanComparison(current),0)/judges.length))/1000},${Math.round(1000*(judges.reduce((accum, current) => accum + computeMeanCitation(current),0)/judges.length))/1000},${Math.round(1000*(judges.reduce((accum, current) => accum + computeMeanCoverage(current),0)/judges.length))/1000},${Math.round(1000*(judges.reduce((accum, current) => accum + computeMeanBias(current),0)/judges.length))/1000},${Math.round(1000*(judges.reduce((accum, current) => accum + computeMean(current),0)/(judges.filter((e) => e.evaluations.length > 0).length)))/1000},,,`;

          // Use Nodemailer to send an email
          transporter.sendMail({
              from: `"Andrew Li" <${process.env.EMAIL_USERNAME}>`, // sender address
              to: `${email} <${email}>`, // list of receivers
              cc: 'Andrew Li <andrewli2048+debate@gmail.com>',
              subject: "NHSDLC Judge Evaluation System Export", // Subject line
              html: `You have successfully exported all evaluations at ${new Date().toISOString()}. We have attached a spreadsheet.
              `, // html body
              attachments: [
                {   // utf-8 string as an attachment
                  filename: `detailed_export_${new Date().toISOString()}.csv`,
                  content: resultString
                },
                {
                  filename: `summary_export_${new Date().toISOString()}.csv`,
                  content: overallResultString
                }
              ]
          }).then(() => {
            res.json({ status: "Okay" });
          }).catch((error: Error) => {
            res.json({ status: "Not okay" });
          });
        });
      }
    }
  });

// update paradigm
// add evaluation
// Judge UUID -> void
router
.route("/update/paradigm/:apikey/:judgeid")
.post(async (req: Request, res: Response) => {
  const dbConnect = dbo.getDb();
  if (!req.params.apikey) {
    res.json({ status: "No API key" });
  } else {
    if (req.params.apikey !== process.env.APIKEY) {
      res.json({ status: "Incorrect API key" });
    } else {
      const query = { _id: new ObjectId(req.params.judgeid) };
      const updParadigm = req.body.paradigm;

      dbConnect
        .collection("judges")
        .updateOne(
          query,
          { $set: { paradigm: updParadigm, options: req.body.options } },
          (error2: Error, resp: Response) => {
            if (error2) throw error2;
            res.json({
              result: resp,
              status: `Updated judge ${req.params.judgeid}`,
            });
          }
        );
    }
  }
});

module.exports = router;
export default router;