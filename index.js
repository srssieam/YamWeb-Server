const express= require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 7000;

// middleware
app.use(cors());
app.use(express.json());

app.get('/', (req,res)=>{
    res.send('Yam web server is running')
})

app.listen(PORT, ()=>{
    console.log(`yam web server is running on http://localhost:${PORT}`)
})