const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 7000;

// middleware
app.use(cors({
    origin: ['http://localhost:5173'], // client site url 
    credentials: true
}));
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.xjpiwvy.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const database = client.db("yamweb"); // provide same database name, which you have created manually. else, it will create new database
        const foodCollection = database.collection("foodItems"); // provide same collection name, which you have created manually. else, it will create new collection
        const purchaseCollection = database.collection("purchased-items")

        app.get('/v1/api/foodItems', async (req, res) => {
            console.log(req.query.foodCategory)
            let query = {}; // get all food
            if (req.query?.foodCategory){
                query = {foodCategory:req.query.foodCategory} // get those category based foods only
            }
            const cursor = foodCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })

        // get the food which carrying the id
        app.get('/v1/api/foodItems/:id', async (req, res) => {
            const id = req.params.id; // get id from client site
            console.log(id)
            const query = { _id: new ObjectId(id) }
            const result = await foodCollection.findOne(query); // find the food which have this id
            console.log(result)
            res.send(result)
        })

        app.post('/v1/api/purchasedItems', async (req, res) => {
            const purchasedItem = req.body;
            console.log(purchasedItem);
            const result = await purchaseCollection.insertOne(purchasedItem);
            res.send(result);
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Yam web server is running')
})

app.listen(PORT, () => {
    console.log(`yam web server is running on http://localhost:${PORT}`)
})