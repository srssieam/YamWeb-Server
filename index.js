const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 7000;

// middleware
app.use(cors({
    origin: ['http://localhost:5173'], // client site url 
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// created a middleware to verify the token
const verifyToken = (req, res, next) => {
    const token = req?.cookies?.yamweb;   // get the cookie from client site
    // console.log('token in the middleware', token);
    // if no token available
    if (!token) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
    // if token available 
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'unauthorized access' })
        }
        req.user = decoded; // get the user who have token
        next();
    })
}



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

        // auth related operation
        app.post('/v1/api/jwt', async (req, res) => {
            const loggedUser = req.body; // get the loggedUser from client site
            // console.log('user for token', loggedUser);
            const token = jwt.sign(loggedUser, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '2h' }) // generated a token for logged user
            res.cookie('yamweb', token, {
                httpOnly: true,
                secure: true,
                sameSite: 'none'
            })
            res.send({ success: true }); // send success status to client side
        })

        app.post('/v1/api/logout', async (req, res) => {
            const loggedUser = req.body;  // get loggedUser={}
            // console.log('logging out', loggedUser)
            res.clearCookie('yamweb').send({ success: true }) // clear the cookie
        })

        // get food items
        app.get('/v1/api/foodItems', verifyToken, async (req, res) => {
            let query = {}; // get all food
            // console.log('cookies from client site', req.cookies)
            if (req.query?.foodCategory) {
                query = { foodCategory: req.query.foodCategory } // get those category based foods only
                const cursor = foodCollection.find(query);
                const result = await cursor.toArray();
                res.send(result);
                return;
            }

            // console.log(req.query?.email)
            else if (req.query?.email) {
                query = { email: req.query.email } // get those category based foods only
                if (req.user.email !== req.query.email) {  // compare between user email and cookie email 
                    return res.status(403).send({ message: 'forbidden access' })
                }
                const cursor = foodCollection.find(query);
                const result = await cursor.toArray();
                res.send(result);
                return;
            }
            else if (req.query?.page) {
                const page = parseInt(req.query.page); // get page number from client 
                const size = parseInt(req.query.size)  // get itemsPerPage from client
                const result = await foodCollection.find().skip(page * size).limit(size).toArray();  // get products according to page from database 
                res.send(result); // send those products to client site
                return;
            }
            else if (req.query?.search) {
                const filter = req.query.search;
                // console.log(filter)
                const query = {
                    foodName: { $regex: filter, $options: 'i' }
                };
                const cursor = foodCollection.find(query);
                const result = await cursor.toArray();
                res.send(result);
                return;
            }
            else if (req.query?.topItem){
                console.log(req.query.topItem);
                const result = await foodCollection.find().toArray();
                result.sort((a,b)=>{
                    const itemA = a.OrderedCount;
                    const itemB = b.OrderedCount;
                    return itemB - itemA;
                })
                res.send(result.slice(0,6))
                // console.log(result.slice(0,6))
                return;
            }
                const result = await foodCollection.find().toArray();
                res.send(result.slice(0,6))

        })

        app.delete('/v1/api/foodItems/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = foodCollection.deleteOne(query)
            res.send(result)
        })

        // get the food which carrying the id
        app.get('/v1/api/foodItems/:id', async (req, res) => {
            const id = req.params.id; // get id from client site
            // console.log(id)
            const query = { _id: new ObjectId(id) }
            const result = await foodCollection.findOne(query); // find the food which have this id
            // console.log(result)
            res.send(result)
        })

        // add new food item
        app.post('/v1/api/foodItems', async (req, res) => {
            const newItem = req.body;
            // console.log(newItem);
            const result = await foodCollection.insertOne(newItem);
            res.send(result);
        })

        // update ordered count
        app.patch('/v1/api/foodItems/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedOrderedCount = req.body;
            console.log(updatedOrderedCount)
            const updateDoc = {
                $set: {
                    OrderedCount: updatedOrderedCount.totalOrderedCount,
                    quantity: updatedOrderedCount.remainingQuantity,
                }
            };
            const result = await foodCollection.updateOne(filter, updateDoc);
            res.send(result)
        })

        app.put('/v1/api/foodItems/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updatedItems = req.body;
            // console.log(updatedItems)
            const item = {
                $set: {
                    foodName: updatedItems.foodName,
                    foodImage: updatedItems.foodImage,
                    foodCategory: updatedItems.foodCategory,
                    quantity: updatedItems.quantity,
                    price: updatedItems.price,
                    name: updatedItems.name,
                    email: updatedItems.email,
                    foodOrigin: updatedItems.foodOrigin,
                    description: updatedItems.description
                }
            }
            const result = await foodCollection.updateOne(filter, item, options)
            res.send(result)
        })

        // pagination
        app.get('/v1/api/itemsCount', async (req, res) => {
            const count = await foodCollection.estimatedDocumentCount();
            res.send({ count });
        })

        app.get('/v1/api/purchasedItems', verifyToken, async (req, res) => {
            let query = {}; // get all purchased items
            if (req.query?.buyerEmail) {
                query = { buyerEmail: req.query.buyerEmail } // get all purchase item which have this email
            }
            if (req.user.email !== req.query.buyerEmail) {  // compare between user email and cookie email 
                return res.status(403).send({ message: 'forbidden access' })
            }
            const result = await purchaseCollection.find(query).toArray()
            res.send(result)
        })

        app.delete('/v1/api/purchasedItems/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = purchaseCollection.deleteOne(query)
            res.send(result)
        })

        app.post('/v1/api/purchasedItems', async (req, res) => {
            const purchasedItem = req.body;
            // console.log(purchasedItem);
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