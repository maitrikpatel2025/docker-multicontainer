const keys = require('./keys');

// Express App Setup
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors')

const app = express()
app.use(cors());
app.use(bodyParser.json())

// Postgres CLient Setup
const {Pool} = require('pg');
const pgClient = new Pool({
    user: keys.pgUser,
    host: keys.pgHost,
    database: keys.pgDatabase,
    password: keys.pgPassword,
    port : keys.pgPort
});

pgClient.on("connect", (client) => {
    client
      .query("CREATE TABLE IF NOT EXISTS values (number INT)")
      .catch((err) => console.error(err));
  });

// Redis Client setup
const redis = require('redis');

const redisClient = redis.createClient({
    host : keys.redisHost,
    port : keys.redisPort,
    retry_strategy : () => 100
})

const redisPublisher = redisClient.duplicate();

//Express Routes handlers

app.get('/',(req,res)=>{
    res.send("HI");
})

app.get('/values/all', async(req,res)=>{
    const values = await pgClient.query('SELECT * from values')
    res.send(values.rows)    
})

app.get('/values/current',async(req,res)=>{
    redisClient.hgetall('values',(err,values)=>{
        res.send(values);
    })
})

app.post('/values',async(req,res)=>{
    const index =req.body.index;
    if (parseInt(index) > 40){
        return res.status(422).send('Index too high')
    }
    redisClient.hset('values',index,"Nothing yet!")
    redisPublisher.publish('insert',index);
    pgClient.query('INSERT INTP Values(number) Value($1)',[index]);

    res.send({working:true})
})

app.listen(5000, err=>{
  console.log("Listening at 5000!")
})