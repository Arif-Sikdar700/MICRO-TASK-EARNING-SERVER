const express = require("express");

const cors = require("cors");
var jwt = require("jsonwebtoken");
const app = express();
require("dotenv").config();
const stripe = require("stripe")(process.env.PAYMENT_SECREACT_KEY);
const port = process.env.PORT || 5000;

// middleware
app.use(
  cors({
    origin: ["https://micro-task-19.web.app", "http://localhost:5173"],
  })
);
app.use(express.json());

app.get("/", (req, res) => {
  res.send("code start");
});
// mindwaler
const veryfiToken = (req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).send({ message: "forbidden access" });
  }
  const token = req.headers.authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, (error, decoded) => {
    if (error) {
      return res.status(404).sen({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
};
 // verify admin middleware
 const verifyAdmin = async (req, res, next) => {
  // console.log('data from verifyToken middleware--->', req.user?.email)
  const email = req.user?.email
  const query = { email }
  const result = await usersCollection.findOne(query)
  if (!result || result?.role !== 'admin')
    return res
      .status(403)
      .send({ message: 'Forbidden Access! Admin Only Actions!' })

  next()
}
// verify seller middleware
const verifySeller = async (req, res, next) => {
  // console.log('data from verifyToken middleware--->', req.user?.email)
  const email = req.user?.email
  const query = { email }
  const result = await usersCollection.findOne(query)
  if (!result || result?.role !== 'seller')
    return res
      .status(403)
      .send({ message: 'Forbidden Access! Seller Only Actions!' })

  next()
}
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.haw69.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    // db create
    const db = client.db("Micro-Task");
    const usersCollection = db.collection("users");
    const taskcollection = db.collection("task");
    const submitTaskCollection = db.collection("submit");
    const paymentCollection = db.collection("paymentHistory");
    const withDrawCollection = db.collection("withdraw");
    // post users
    app.post("/users/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const querry = { email };
      const isExit = await usersCollection.findOne(querry);
      if (isExit) {
        return res.send({ acknowledged: false });
      }
      const result = await usersCollection.insertOne(user);
      console.log(result);
      return res.send(result);
    });
    // get  higest users
    app.get("/users", async (req, res) => {
      const result = await usersCollection
        .find({ role: "worker" })
        .sort({ coin: -1 })
        .limit(6)
        .toArray();

      res.send(result);
    });
    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const querry = { email };
      const result = await usersCollection.findOne(querry);
      return res.send(result);
    });
    app.post("/addTask", async (req, res) => {
      const task = req.body.userInfo;
      const result = await taskcollection.insertOne(task);
      res.send(result);
    });
    app.get("/task/:email", async (req, res) => {
      const email = req.params.email;

      const querry = { "buyer.email": email };
      const result = await taskcollection
        .find(querry)
        .sort({ completion_date: -1 })
        .toArray();

      res.send(result);
    });

    // buyer task delete
    app.delete("/task/:id", async (req, res) => {
      const id = req.params.id;
      const querry = { _id: new ObjectId(id) };

      const result = await taskcollection.deleteOne(querry);

      res.send(result);
    });
    // buyer single data get
    app.get("/taskss/:id", async (req, res) => {
      const id = req.params.id;

      const querry = { _id: new ObjectId(id) };
      const result = await taskcollection.findOne(querry);
      res.send(result);
    });
    // buyerUpdate data
    app.patch("/updateTask/:id", async (req, res) => {
      const id = req.params;
      const updateInfo = req.body;

      const querry = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          title: updateInfo.title,
          completion_date: updateInfo.completion_date,
          task_detail: updateInfo.task_detail,
        },
      };
      const result = await taskcollection.updateOne(querry, updateDoc);

      res.send(result);
    });
    // buyer review
    app.get("/taskReviw/:email", async (req, res) => {
      const email = req.params.email;
      const status = req.query.status;
      console.log(status, email);
      const querry = { "buyer.email": email, status: status };

      const result = await submitTaskCollection.find(querry).toArray();

      res.send(result);
    });
    // coin calculate
    app.patch("/coin/update/:email", async (req, res) => {
      const { totalPaypalAmount, status } = req.body;
      const email = req.params.email;
      const querry = { email };
      let updateCoin = {
        $inc: { coin: -totalPaypalAmount },
      };
      if (status === "increase") {
        updateCoin = {
          $inc: { coin: totalPaypalAmount },
        };
      }
      const result = await usersCollection.updateOne(querry, updateCoin);
      res.send(result);
    });

    // buyer submitions update
    app.patch("/submit_task", async (req, res) => {
      const { email, id, value, amount, taskId } = req.body;

      const query1 = { _id: new ObjectId(id) };
      if (value == "approve") {
        const query = { email: email };
        const idQuerry = { _id: new ObjectId(id) };
        const statusChange = {
          $set: {
            status: value,
          },
        };
        const updateAmount = {
          $inc: { coin: amount },
        };
        const result = await usersCollection.updateOne(query, updateAmount);
        const status = await submitTaskCollection.updateOne(
          idQuerry,
          statusChange
        );
        res.send(result);
      } else {
        const querry = { _id: new ObjectId(taskId) };
        const workerDoc = {
          $inc: {
            required_workers: 1,
          },
        };
        const statusDoc = {
          $set: {
            status: value,
          },
        };
        const result = await taskcollection.updateOne(querry, workerDoc);
        const result1 = await submitTaskCollection.updateOne(query1, statusDoc);

        res.send(result);
      }
    });

    app.get("/taskAll", async (req, res) => {
      const querry = { required_workers: { $gt: 0 } };

      const result = await taskcollection.find(querry).toArray();
      res.send(result);
    });

    // worker submission data
    app.post("/submit_task", async (req, res) => {
      const worker = req.query.worker;
      const submitInfo = req.body;
      const querry = { task_id: submitInfo.task_id };
      // const isExit = await submitTaskCollection.findOne(querry);
      // if (isExit) {
      //   return res
      //     .status(409)
      //     .send({ message: "Already Request Please Wait " });
      // }
      const Workerquerry = { required_workers: submitInfo.required_workers };
      const workerDoc = {
        $inc: {
          required_workers: -1,
        },
      };
      const workerUpdate = await taskcollection.updateOne(
        Workerquerry,
        workerDoc
      );
      const result = await submitTaskCollection.insertOne(submitInfo);

      res.send(result);
    });

    // worker submission get data
    app.get("/submit_task/:email", async (req, res) => {
      const email = req.params.email;
      const querry = { "worker.email": email };
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(3);
      const skip = (page - 1) * limit;
      const result = await submitTaskCollection
        .find(querry)
        .skip(skip)
        .limit(limit)
        .toArray();

      res.send(result);
    });
    // role get
    app.get("/role/:email", async (req, res) => {
      const email = req.params.email;
      const querry = { email };

      const result = await usersCollection.findOne(querry);

      res.send(result);
    });
    // addminHome
    app.get("/adminHomeCount", async (req, res) => {
      const totalWorker = await usersCollection.countDocuments({
        role: "worker",
      });

      const totalBuyer = await usersCollection.countDocuments({
        role: "buyer",
      });
      const totalCoin = await usersCollection
        .aggregate([
          {
            $unwind: "$coin",
          },
          {
            $group: {
              _id: null,
              totalCoins: { $sum: "$coin" },
            },
          },
          { $project: { _id: 0, totalCoins: 1 } },
        ])
        .next();
      const totalWithdrawAmount = await withDrawCollection
        .aggregate([
          {
            $unwind: "$withdrawal_coin",
          },
          {
            $group: {
              _id: null,
              withdrawAmount: { $sum: "$withdrawal_coin" },
            },
          },
          { $project: { _id: 0, withdrawAmount: 1 } },
        ])
        .next();

      res.send({
        totalWorker,
        totalBuyer,
        ...totalCoin,
        ...totalWithdrawAmount,
      });
    });
    // adminall user Get
    app.get("/adminallUser/:email", async (req, res) => {
      const email = req.params.email;

      const querry = { email: { $ne: email } };
      const result = await usersCollection.find(querry).toArray();
      res.send(result);
    });
    // admin delete
    app.delete("/userDeleteAdmin/:id", async (req, res) => {
      const id = req.params.id;
      const querry = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(querry);

      res.send(result);
    });
    // admin get all task
    app.get("/admintask", async (req, res) => {
      const result = await taskcollection.find().toArray();
      res.send(result);
    });
    app.delete("/admintaskDelete/:id", async (req, res) => {
      const id = req.params.id;
      const querry = { _id: new ObjectId(id) };
      const result = await taskcollection.deleteOne(querry);

      res.send(result);
    });
    app.patch("/adminRoleChange/:email", async (req, res) => {
      const role = req.query.role;
     
      const email = req.params.email;
      const querry = { email:email};
      const updateRole = {
        $set: {
          role: role,
        },
      };
      const result = await usersCollection.updateOne(querry, updateRole);
      res.send(result)
    });
    // JWT TOKEN
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "1h",
      });
      res.send({ token });
    });
    // payment section
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;

      const amount = parseInt(price * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({ clientSecret: paymentIntent.client_secret });
    });
    // buyer patch coin update
    app.patch("/buyerCoinUpdate/:email", async (req, res) => {
      const { amount } = req.body;
      const email = req.params.email;
      const querry = { email };
      let coin = 0;
      switch (amount) {
        case 1:
          coin += 10;
          break;
        case 10:
          coin += 150;
          break;
        case 20:
          coin += 500;
          break;
        case 35:
          coin += 1000;
          break;
      }
      const coinUpdate = {
        $inc: {
          coin: coin,
        },
      };

      const result = await usersCollection.updateOne(querry, coinUpdate);

      res.send(result);
    });
    // buyer payment history
    app.post("/paymentHistory", async (req, res) => {
      const { paymentInfo } = req.body;

      const result = await paymentCollection.insertOne(paymentInfo);

      res.send(result);
    });
    // buyer payment history get
    app.get("/paymentHistory/:email", async (req, res) => {
      const email = req.params.email;
      const querry = { email };
      const result = await paymentCollection
        .find(querry)
        .sort({ transtion_date: -1 })
        .toArray();

      res.send(result);
    });
    // buyer home data count
    app.get("/buyerHomeAllCount/:email", async (req, res) => {
      const email = req.params.email;
      const totalTask = await taskcollection
        .aggregate([
          {
            $match: { "buyer.email": email },
          },
          {
            $group: {
              _id: null,
              taskCount: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
            },
          },
        ])
        .next();
      const totalPayment = await submitTaskCollection
        .aggregate([
          {
            $match: { "buyer.email": email, status: "approve" },
          },
          {
            $group: {
              _id: null,
              totalPayment: { $sum: "$payable_amount" },
            },
          },
          {
            $project: {
              _id: 0,
            },
          },
        ])
        .next();

      const totalPendingWorker = await submitTaskCollection
        .aggregate([
          {
            $match: {
              status: { "buyer.email": email, status: "pending" },
            },
          },
          {
            $group: {
              _id: null,
              taskCount: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
            },
          },
        ])
        .next();

      res.send({ ...totalTask, ...totalPendingWorker, ...totalPayment });
    });

    app.get("/workerHomeAdmin/:email", veryfiToken, async (req, res) => {
      const email = req.params.email;

      const totalSubmission = await submitTaskCollection
        .aggregate([
          {
            $match: { "worker.email": email },
          },
          {
            $group: {
              _id: null,
              totalSubmission: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
            },
          },
        ])
        .next();
      const totalpendingsubmission = await submitTaskCollection.count({
        "worker.email": email,
        status: "pending",
      });
      const totalWithdrawAmount = await withDrawCollection
        .aggregate([
          {
            $match: { "worker.email": email },
          },
          {
            $group: {
              _id: null,
              withdrawAmount: { $sum: "$withdrawal_coin" },
            },
          },
          { $project: { _id: 0, withdrawAmount: 1 } },
        ])
        .next();
      
      res.send({
        ...totalSubmission,
        totalpendingsubmission,
        ...totalWithdrawAmount,
      });
    });
    // worker withdraw
    app.post("/workerWithdraw", async (req, res) => {
      const { withdrawalData } = req.body;

      const result = await withDrawCollection.insertOne(withdrawalData);
      res.send(result);
    });
    // admin get
    app.get("/workerWithdraw", async (req, res) => {
      const result = await withDrawCollection.find().toArray();
      res.send(result);
    });
    // admin aprobe
    app.patch("/withdrawalRequest", async (req, res) => {
      const { status, coin, id, email } = req.body;

      const querry = { _id: new ObjectId(id) };

      const querry1 = { email: email };

      const coinUpdate = {
        $inc: { coin: -coin },
      };
      const statusUpdate = {
        $set: {
          status: status,
        },
      };

      const result = await withDrawCollection.updateOne(querry, statusUpdate);
      const result1 = await usersCollection.updateOne(querry1, coinUpdate);

      res.send(result);
    });
    // worker withdraw approve get
    app.get("/workerWithdraw/:email", async (req, res) => {
      const email = req.params.email;
      const status = req.query.status;

      const querry = { "worker.email": email, status: status };
      const result = await submitTaskCollection.find(querry).toArray();

      res.send(result);
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`code running${port}`);
});
