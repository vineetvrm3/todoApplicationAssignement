const express = require('express')
const path = require('path')
const format = require('date-fns/format')
const isValid = require('date-fns/isValid')
const toDate = require('date-fns/toDate')

const {open} = require('sqlite')
const sqlite3 = require('sqlite3')

const app = express()
app.use(express.json())
const dbPath = path.join(__dirname, 'todoApplication.db')

let db = null

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
  }
}

initializeDBAndServer()

const validateRequestQueries = async (request, response, next) => {
  const {search_q, category, priority, status, date} = request.query
  const {todoId} = request.params

  if (category !== undefined) {
    const categoryPossibleValue = ['WORK', 'HOME', 'LEARNING']
    const isValidCategory = categoryPossibleValue.includes(category)
    if (isValidCategory === true) {
      request.category = category
    } else {
      response.status(400)
      response.send('Invalid Todo Category')
      return
    }
  }

  if (priority !== undefined) {
    const priorityPossibleValue = ['HIGH', 'MEDIUM', 'LOW']
    const isValidPriority = priorityPossibleValue.includes(priority)
    if (isValidPriority === true) {
      request.priority = priority
    } else {
      response.status(400)
      response.send('Invalid Todo Priority')
      return
    }
  }

  if (status !== undefined) {
    const statusPossibleValue = ['TO DO', 'IN PROGRESS', 'DONE']
    const isValidStatus = statusPossibleValue.includes(status)
    if (isValidStatus === true) {
      request.status = status
    } else {
      response.status(400)
      response.send('Invalid Todo Status')
      return
    }
  }

  if (date !== undefined) {
    try {
      const myDate = new Date(date)
      const formatedDate = format(new Date(date), 'yyyy-MM-dd')
      const result = toDate(
        new Date(
          `${myDate.getFullYear()}-${myDate.getMonth()}-${myDate.getDate()}`,
        ),
      )
      const isValidDate = await isValid(result)

      if (isValidDate === true) {
        request.date = formatedDate
      } else {
        response.status(400)
        response.send('Invalid Due Date')
        return
      }
    } catch (e) {
      response.status(400)
      response.send('Invalid Due Date')
      return
    }
  }

  request.todoId = todoId
  request.search_q = search_q
  next()
}

const validateRequestBody = (request, response, next) => {
  const {id, todo, category, priority, status, dueDate} = request.body
  const {todoId} = request.params

  if (category !== undefined) {
    const categoryPossibleValue = ['WORK', 'HOME', 'LEARNING']
    const isValidCategory = categoryPossibleValue.includes(category)

    if (isValidCategory === true) {
      request.category = category
    } else {
      response.status(400)
      response.send('Invalid Todo Category')
      return
    }
  }

  if (priority !== undefined) {
    const priorityPossibleValue = ['HIGH', 'MEDIUM', 'LOW']
    const isValidPriority = priorityPossibleValue.includes(priority)
    if (isValidPriority === true) {
      request.priority = priority
    } else {
      response.status(400)
      response.send('Invalid Todo Priority')
      return
    }
  }

  if (status !== undefined) {
    const statusPossibleValue = ['TO DO', 'IN PROGRESS', 'DONE']
    const isValidStatus = statusPossibleValue.includes(status)
    if (isValidStatus === true) {
      request.status = status
    } else {
      response.status(400)
      response.send('Invalid Todo Status')
      return
    }
  }

  if (dueDate !== undefined) {
    try {
      const myDate = new Date(dueDate)
      const formatedDate = format(new Date(dueDate), 'yyyy-MM-dd')
      const result = toDate(new Date(formatedDate))
      const isValidDate = isValid(result)
      if (isValidDate === true) {
        request.dueDate = formatedDate
      } else {
        response.status(400)
        response.send('Invalid Due Date')
        return
      }
    } catch (e) {
      response.status(400)
      response.send('Invalid Due Date')
      return
    }
  }
  request.todo = todo
  request.id = id
  request.todoId = todoId

  next()
}

//GET TODOS API
app.get('/todos/', validateRequestQueries, async (request, response) => {
  const {status = '', search_q = '', priority = '', category = ''} = request
  const getTodosQuery = `
    SELECT 
    id,
    todo,
    priority,
    status,
    category,
    due_date AS dueDate
    FROM 
    todo
    WHERE
    todo LIKE '%${search_q}%' AND priority LIKE '%${priority}%' 
        AND status LIKE '%${status}%' AND category LIKE '%${category}%';
  `
  const todoArray = await db.all(getTodosQuery)
  response.send(todoArray)
})

//GET TODO API
app.get(
  '/todos/:todoId/',
  validateRequestQueries,
  async (request, response) => {
    const {todoId} = request

    const getTodoQuery = `
    SELECT 
    id,
    todo,
    priority,
    status,
    category,
    due_date AS dueDate
    FROM
    todo
    WHERE 
    id = "${todoId}";`
    const todo = await db.get(getTodoQuery)
    response.send(todo)
  },
)

//GET AGENDA API
app.get('/agenda/', validateRequestQueries, async (request, response) => {
  const {date} = request

  const getDueDateTodoQuery = `
    SELECT 
    id,
    todo,
    priority,
    status,
    category,
    due_date AS dueDate
    FROM 
    todo 
    WHERE 
    due_date = "${date}";
  `
  const todosArray = await db.all(getDueDateTodoQuery)

  if (todosArray === undefined) {
    response.status(400)
    response.send('Invalid Due Date')
  } else {
    response.send(todosArray)
  }
})

//ADD TODO API
app.post('/todos/', validateRequestBody, async (request, response) => {
  const {id, todo, category, priority, status, dueDate} = request

  const addTodoQuery = `
    INSERT INTO 
    todo(id,todo,priority,status,category,due_date)
    VALUES(
      ${id},
      "${todo}",
      "${priority}",
      "${status}",
      "${category}",
      "${dueDate}"
    );
  `
  await db.run(addTodoQuery)
  response.send('Todo Successfully Added')
})

//UPDATE TODO API
app.put('/todos/:todoId/', validateRequestBody, async (request, response) => {
  const {todoId} = request
  const {priority, todo, status, category, dueDate} = request

  let updateTodoQuery = null

  switch (true) {
    case status !== undefined:
      updateTodoQuery = `
        UPDATE 
        todo
        SET
        status = "${status}"
        WHERE id = ${todoId};
      `
      await db.run(updateTodoQuery)
      response.send('Status Updated')
      break

    case priority !== undefined:
      updateTodoQuery = `
        UPDATE 
        todo
        SET
        priority = "${priority}"
        WHERE id = ${todoId};
      `
      await db.run(updateTodoQuery)
      response.send('Priority Updated')
      break

    case todo !== undefined:
      updateTodoQuery = `
        UPDATE 
        todo
        SET
        todo = "${todo}"
        WHERE id = ${todoId};
      `
      await db.run(updateTodoQuery)
      response.send('Todo Updated')
      break

    case category !== undefined:
      updateTodoQuery = `
        UPDATE 
        todo
        SET
        category = "${category}"
        WHERE id = ${todoId};
      `
      await db.run(updateTodoQuery)
      response.send('Category Updated')
      break

    case dueDate !== undefined:
      updateTodoQuery = `
        UPDATE 
        todo
        SET
        due_date = "${dueDate}"
        WHERE id = ${todoId};
      `
      await db.run(updateTodoQuery)
      response.send('Due Date Updated')
      break
  }
})

//DELETE TODO API
app.delete('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  const deleteTodoQuery = `
        DELETE FROM
        todo 
        WHERE 
        id = ${todoId};
    `
  await db.run(deleteTodoQuery)
  response.send('Todo Deleted')
})

module.exports = app
