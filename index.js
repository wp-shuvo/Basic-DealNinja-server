const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const admin = require('firebase-admin');
const port = process.env.PORT || 5001;

// firebase admin

var serviceAccount = require('./dealsninja-firebase-adminsdk.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

app.use(cors());
app.use(express.json());

const logger = (req, res, next) => {
  console.log('login info');
  next();
};

const varifyFireBaseToken = async (req, res, next) => {
  console.log('headers', req.headers.authorization);
  if (!req.headers.authorization) {
    // dont entry
    return res.status(401).send({ message: 'unauthorized access' });
  }
  const token = req.headers.authorization.split(' ')[1];
  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' });
  }

  try {
    const userInfo = await admin.auth().verifyIdToken(token);
    req.token_email = userInfo.email;
    next();
  } catch {
    return res.status(401).send({ message: 'unauthorized access' });
  }
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.0lr5e3w.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.get('/', (req, res) => {
  res.send('server is running!!!');
});

async function run() {
  try {
    await client.connect();

    const db = client.db('DealNinjadb');
    const productsCollection = db.collection('products');

    const bidsCollection = db.collection('Bids');
    const usersCollection = db.collection('Users');

    // Users API

    // Post User API
    app.post('/users', async (req, res) => {
      const newUser = req.body;

      const email = req.body.email;
      const query = { email: email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        res.send('user alrady exits. do not need to insert again');
      } else {
        const result = await usersCollection.insertOne(newUser);
        res.send(result);
      }
    });

    // get all user
    app.get('/users', async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // products APIs
    // POST product API
    app.post('/products', async (req, res) => {
      const newProduct = req.body;
      const result = await productsCollection.insertOne(newProduct);
      res.send(result);
    });

    // get all products API
    app.get('/products', async (req, res) => {
      const email = req.query.email;
      const query = {};

      if (email) {
        query.email = email;
      }

      const result = await productsCollection.find(query).toArray();
      res.send(result);
    });

    // latest apis

    app.get('/latest-products', async (req, res) => {
      const result = await productsCollection
        .find()
        .sort({ created_at: -1 })
        .limit(8)
        .toArray();
      res.send(result);
    });

    // get one products API
    app.get('/products/:id', async (req, res) => {
      const id = req.params.id;

      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ error: 'Invalid product ID' });
      }

      const query = { _id: id };
      console.log(id);
      console.log(query);

      const result = await productsCollection.findOne(query);
      console.log('result for server', result);
      res.json(result);
    });

    // update product data

    app.patch('/products/:id', async (req, res) => {
      const id = req.params.id;
      const updatedProduct = req.body;
      const query = { _id: id };
      const update = {
        $set: updatedProduct,
      };
      const result = await productsCollection.updateOne(query, update);
      res.send(result);
    });

    // delete one product API

    app.delete('/products/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: id };
      const result = await productsCollection.deleteOne(query);
      res.send(result);
    });

    // bids api ✅

    // post bids

    app.post('/bids', async (req, res) => {
      const newBid = req.body;
      const result = await bidsCollection.insertOne(newBid);
      res.send(result);
    });

    // get all bids

    app.get('/bids', logger, varifyFireBaseToken, async (req, res) => {
      const email = req.query.email;
      const query = {};
      if (email) {
        if (email !== req.token_email) {
          return res.status(403).send({
            message: 'Forbidden accessnpm ',
          });
        }
        query.buyer_email = email;
      }

      const cursor = bidsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    //bids data using productId API
    app.get('/Product/bids/:productId', async (req, res) => {
      const productId = req.params.productId;
      const query = {
        product: productId,
      };
      const result = await bidsCollection
        .find(query)
        .sort({ bid: -1 })
        .toArray();

      res.status(200).send(result);
    });
    // get one bid
    app.get('/bids/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bidsCollection.findOne(query);
      res.send(result);
    });
    // delete one bids
    app.delete('/bids/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bidsCollection.deleteOne(query);
      res.send(result);
    });

    await client.db('admin').command({ ping: 1 });
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    );
  } finally {
  }
}
run().catch(console.dir);

app.listen(port, (req, res) => {
  console.log(`Server is Running on ${port}`);
});

//Assimnemt APIS

// // update models data

// app.patch('/update-model/:id:', async (req, res) => {
//   const id = req.params.id;
//   const updatedProduct = req.body;
//   const query = { _id: id };
//   const update = {
//     $set: updatedProduct,
//   };
//   const result = await modelsCollection.updateOne(query, update);
//   res.send(result);
// });

// // delete one model API

// app.delete('/models/:id', async (req, res) => {
//   const id = req.params.id;
//   const query = { _id: id };
//   const result = await modelsCollection.deleteOne(query);
//   res.send(result);
// });
