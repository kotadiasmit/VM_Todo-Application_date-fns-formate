const express = require("express");
const app = express();
app.use(express.json());

const format = require("date-fns/format");
const isMatch = require("date-fns/isMatch");
const isValid = require("date-fns/isValid");

const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const dbPath = path.join(__dirname, "todoApplication.db");
let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3003, () => {
      console.log("Server running at http:/localhost:3003");
    });
  } catch (e) {
    console.log(`DB error: ${e.message}`);
    process.exit(1);
  }
};
initializeDbAndServer();

//Returns a list of all todos whose status is 'TO DO'//
app.get("/todos/", async (request, response) => {
  const allURLQuery = request.query;
  const {
    offset = 0,
    limit = 10,
    order = "ASC",
    order_by = "id",
    search_q,
    status,
    priority,
    category,
  } = allURLQuery;

  console.log(allURLQuery);
  console.log(status);
  console.log(priority);
  console.log(search_q);
  let listOfAllTodos;
  let invalidMessage;

  if (
    status !== undefined &&
    priority === undefined &&
    search_q === undefined &&
    category === undefined
  ) {
    if (status === "TO DO" || status === "DONE" || status === "IN PROGRESS") {
      listOfAllTodos = `
        SELECT id, todo, priority, status, category, due_date as dueDate 
        FROM todo
        WHERE status='${status}'`;
    } else {
      invalidMessage = "Invalid Todo Status";
    }
  } else if (
    priority !== undefined &&
    status === undefined &&
    search_q === undefined &&
    category === undefined
  ) {
    if (priority === "HIGH" || priority === "MEDIUM" || priority === "LOW") {
      listOfAllTodos = `
        SELECT id, todo, priority, status, category, due_date as dueDate 
        FROM todo
        WHERE priority='${priority}'`;
    } else {
      invalidMessage = "Invalid Todo Priority";
    }
  } else if (
    status !== undefined &&
    priority !== undefined &&
    search_q === undefined &&
    category === undefined
  ) {
    listOfAllTodos = `
        SELECT id, todo, priority, status, category, due_date as dueDate 
        FROM todo
        WHERE status='${status}' AND priority='${priority}'`;
  } else if (
    status === undefined &&
    priority === undefined &&
    search_q !== undefined &&
    category === undefined
  ) {
    listOfAllTodos = `
        SELECT id, todo, priority, status, category, due_date as dueDate 
        FROM todo
        WHERE todo LIKE'%${search_q}%'`;
  } else if (
    status === undefined &&
    priority === undefined &&
    search_q === undefined &&
    category !== undefined
  ) {
    if (category === "WORK" || category === "HOME" || category === "LEARNING") {
      listOfAllTodos = `
        SELECT id, todo, priority, status, category, due_date as dueDate 
        FROM todo
        WHERE category ='${category}'`;
    } else {
      invalidMessage = "Invalid Todo Category";
    }
  } else if (
    status !== undefined &&
    priority === undefined &&
    search_q === undefined &&
    category !== undefined
  ) {
    listOfAllTodos = `
        SELECT id, todo, priority, status, category, due_date as dueDate 
        FROM todo
        WHERE status='${status}' AND category='${category}'`;
  } else if (
    status === undefined &&
    priority !== undefined &&
    search_q === undefined &&
    category !== undefined
  ) {
    listOfAllTodos = `
        SELECT id, todo, priority, status, category, due_date as dueDate 
        FROM todo
        WHERE category='${category}' AND priority='${priority}'`;
  }
  console.log(listOfAllTodos);
  if (listOfAllTodos !== undefined) {
    const allTodosArray = await db.all(listOfAllTodos);
    console.log(allTodosArray);
    response.send(allTodosArray);
  } else {
    response.status(400);
    response.send(invalidMessage);
  }
});

//Return a specific todo based on the todo ID//
app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `
    SELECT id, todo, priority, status, category, due_date as dueDate FROM todo
    WHERE id=${todoId}`;
  const getTodo = await db.get(getTodoQuery);
  response.send(getTodo);
});

/*Returns a list of all todos with a specific due date 
in the query parameter `/agenda/?date=2021-12-12`*/
app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  console.log(date);
  console.log(isMatch(date, "yyyy-MM-dd"));
  if (isMatch(date, "yyyy-MM-dd")) {
    let formattedDate = format(new Date(date), "yyyy-MM-dd");
    console.log(formattedDate);
    const getTodoQuery = `
    SELECT id, todo, priority, status, category, due_date as dueDate FROM todo
    WHERE due_date='${formattedDate}'`;
    console.log(getTodoQuery);
    const getTodo = await db.all(getTodoQuery);
    console.log(getTodo);
    if (getTodo !== undefined) {
      response.send(getTodo);
    } else {
      response.status(400);
      response.send("Invalid Due Date");
    }
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

//Add the details of a todo//
app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  if (priority === "HIGH" || priority === "LOW" || priority === "MEDIUM") {
    if (status === "TO DO" || status === "IN PROGRESS" || status === "DONE") {
      if (
        category === "WORK" ||
        category === "HOME" ||
        category === "LEARNING"
      ) {
        if (isMatch(dueDate, "yyyy-MM-dd")) {
          const postNewDueDate = format(new Date(dueDate), "yyyy-MM-dd");
          const postTodoQuery = `
  INSERT INTO
    todo (id, todo, category, priority, status, due_date)
  VALUES
    (${id}, '${todo}', '${category}','${priority}', '${status}', '${postNewDueDate}');`;
          await db.run(postTodoQuery);
          //console.log(responseResult);
          response.send("Todo Successfully Added");
        } else {
          response.status(400);
          response.send("Invalid Due Date");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
    } else {
      response.status(400);
      response.send("Invalid Todo Status");
    }
  } else {
    response.status(400);
    response.send("Invalid Todo Priority");
  }
});

//Update the details of a specific todo based on the todo ID//
app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const addTodoRequest = request.body;
  console.log(addTodoRequest);
  const { todo, priority, status, category, dueDate } = addTodoRequest;
  let addTodoQuery;
  let responseSendMessage;

  if (
    status !== undefined &&
    priority === undefined &&
    todo === undefined &&
    category === undefined &&
    dueDate === undefined
  ) {
    if (status === "DONE" || status === "TO DO" || status === "IN PROGRESS") {
      addTodoQuery = `
        UPDATE todo
        SET status='${status}'`;
      responseSendMessage = "Status Updated";
    } else {
      response.status(400);
      responseSendMessage = "Invalid Todo Status";
    }
  } else if (
    priority !== undefined &&
    status === undefined &&
    todo === undefined &&
    category === undefined &&
    dueDate === undefined
  ) {
    if (priority === "HIGH" || priority === "MEDIUM" || priority === "LOW") {
      addTodoQuery = `
        UPDATE todo
        SET priority='${priority}'`;
      responseSendMessage = "Priority Updated";
    } else {
      response.status(400);
      responseSendMessage = "Invalid Todo Priority";
    }
  } else if (
    status === undefined &&
    priority === undefined &&
    todo !== undefined &&
    category === undefined &&
    dueDate === undefined
  ) {
    addTodoQuery = `
        UPDATE todo
        SET todo ='${todo}'`;
    responseSendMessage = "Todo Updated";
  } else if (
    status === undefined &&
    priority === undefined &&
    todo === undefined &&
    category !== undefined &&
    dueDate === undefined
  ) {
    if (category === "WORK" || category === "HOME" || category === "LEARNING") {
      addTodoQuery = `
        UPDATE todo
        SET category ='${category}'`;
      responseSendMessage = "Category Updated";
    } else {
      response.status(400);
      responseSendMessage = "Invalid Todo Category";
    }
  } else if (
    status === undefined &&
    priority === undefined &&
    todo === undefined &&
    category === undefined &&
    dueDate !== undefined
  ) {
    console.log(isMatch(dueDate, "yyyy-MM-dd"));
    if (isMatch(dueDate, "yyyy-MM-dd")) {
      let formattedDate = format(new Date(dueDate), "yyyy-MM-dd");
      addTodoQuery = `
            UPDATE todo
            SET due_date ='${formattedDate}'`;
      responseSendMessage = "Due Date Updated";
    } else {
      response.status(400);
      responseSendMessage = "Invalid Due Date";
    }
  }

  console.log(addTodoQuery);
  if (addTodoQuery !== undefined) {
    const addTodo = await db.run(addTodoQuery);
    response.send(responseSendMessage);
  } else {
    response.send(responseSendMessage);
  }
});

//Delete a todo from the todo table based on the todo ID//
app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
    DELETE FROM todo
    WHERE id=${todoId}`;
  const deleteTodo = await db.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
