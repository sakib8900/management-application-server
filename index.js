const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3ermh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }
});

async function run() {
  try {
    // await client.connect();

    const usersCollection = client.db("manage-application").collection("users")
    const tasksCollection = client.db("manage-application").collection("tasks");

    app.get('/users', async(req, res) =>{
      const result = await usersCollection.find().toArray();
      res.send(result)
  })
  app.post('/users', async (req, res) => {
    const user = req.body; 
    const existingUser = await usersCollection.findOne({ email: user.email });

    if (!existingUser) {
        const result = await usersCollection.insertOne(user);
        res.send(result);
    } else {
        res.send({ message: "User already exists" });
    }
  });
  app.post('/tasks', async (req, res) => {
    const task = req.body;
    task.timestamp = new Date();
    task.order = await tasksCollection.countDocuments() + 1;
    const result = await tasksCollection.insertOne(task);
    res.send(result);
  });
app.get('/tasks', async (req, res) => {
  try {
    const tasks = await tasksCollection.find().sort({ order: 1 }).toArray();
    res.send(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).send({ error: "Failed to fetch tasks" });
  }
});

// Update Task 
app.put('/tasks/:id', async (req, res) => {
  try {
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ error: "Invalid task ID format" });
    }
    
    const updatedTask = req.body;
    const filter = { _id: new ObjectId(id) };
    const updateDoc = { 
      $set: { 
        title: updatedTask.title, 
        description: updatedTask.description, 
        category: updatedTask.category 
      } 
    };
    const result = await tasksCollection.updateOne(filter, updateDoc);
    res.send(result);
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).send({ error: "Failed to update task" });
  }
});

// Delete Task
app.delete('/tasks/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ error: "Invalid task ID format" });
    }
    
    const result = await tasksCollection.deleteOne({ _id: new ObjectId(id) });
    res.send(result);
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).send({ error: "Failed to delete task" });
  }
});

// Update Task
app.patch('/tasks/:id/category', async (req, res) => {
  try {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ error: "Invalid task ID format" });
    }
    
    const { category } = req.body;
    const result = await tasksCollection.updateOne({ _id: new ObjectId(id) }, { $set: { category } });
    res.send(result);
  } catch (error) {
    console.error("Error updating task category:", error);
    res.status(500).send({ error: "Failed to update task category" });
  }
});

// Reorder Tasks
app.put('/tasks/reorder', async (req, res) => {
  try {
    const { updatedTasks } = req.body;
    if (!updatedTasks || !Array.isArray(updatedTasks)) {
      return res.status(400).send({ error: "Invalid task data format" });
    }

    const bulkUpdates = [];
    
    for (const task of updatedTasks) {
      if (!task._id || !ObjectId.isValid(task._id)) {
        continue;
      }
      
      bulkUpdates.push({
        updateOne: { 
          filter: { _id: new ObjectId(task._id) }, 
          update: { $set: { order: task.order, category: task.category } } 
        }
      });
    }

    if (bulkUpdates.length === 0) {
      return res.status(400).send({ error: "No valid tasks to update" });
    }
    
    const result = await tasksCollection.bulkWrite(bulkUpdates);
    res.send(result);
  } catch (error) {
    console.error("Error reordering tasks:", error);
    res.status(500).send({ error: "Failed to reorder tasks" });
  }
});

    // Indexing for Faster Query
    await tasksCollection.createIndex({ category: 1, order: 1 });

  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) =>{
    res.send('boss is sitting')
})

app.listen(port, () =>{
    console.log(`running ${port}`)
})