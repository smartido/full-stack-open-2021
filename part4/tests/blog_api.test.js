const mongoose = require('mongoose')
const supertest = require('supertest')
const helper = require('../utils/blog_api')
const app = require('../app')
const api = supertest(app)

const Blog = require('../models/blog')
const User = require('../models/user')

beforeEach(async () => {
  await User.deleteMany({})

  await Blog.deleteMany({})

  for (let blog of helper.initialBlogs) {
    let blogObject = new Blog(blog)
    await blogObject.save()
  }
})

describe('when there is initially some blogs saved', () => {
  test('blogs are returned as json', async () => {
    await api.get('/api/blogs')
      .expect(200)
      .expect('Content-Type', /application\/json/)
  })
  
  test('all blogs are returned', async () => {
    const response = await api.get('/api/blogs')
  
    expect(response.body).toHaveLength(helper.initialBlogs.length)
  })
  
  test('a specific blog is within the returned blogs', async () => {
    const response = await api.get('/api/blogs')
  
    const titles = response.body.map(r => r.title)
    expect(titles).toContain('Go To Statement Considered Harmful')
  })
})

test('the unique identifier property of the blog posts is named id', async () => {
  const blogs = await Blog.find({})
  expect(blogs[0].id).toBeDefined()
})

describe('addition of a new blog', () => {
  let headers = {}

  beforeEach(async () => {
    const newUser = {
      username: 'root',
      name: 'Superuser',
      password: 'salainen',
    }

    await api.post('/api/users')
      .send(newUser)

    const result = await api.post('/api/login')
      .send(newUser)

    headers = {
      'Authorization': `bearer ${result.body.token}`
    }
  })

  test('succeeds with valid data', async () => {
    const newBlog = {
      title: 'Canonical string reduction',
      author: 'Edsger W. Dijkstra',
      url: 'http://www.cs.utexas.edu/~EWD/transcriptions/EWD08xx/EWD808.html',
      likes: 12
    }

    await api.post('/api/blogs')
      .set(headers)
      .send(newBlog)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const blogsAtEnd = await helper.blogsInDb()
    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length + 1)

    const titles = blogsAtEnd.map(r => r.title)
    expect(titles).toContain('Canonical string reduction')
  })

  test('if the likes property is missing, it will default to 0 ', async () => {
    const newBlog = {
      title: 'Type wars',
      author: 'Robert C. Martin',
      url: 'http://blog.cleancoder.com/uncle-bob/2016/05/01/TypeWars.html',
    }

    await api.post('/api/blogs')
      .set(headers)
      .send(newBlog)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const blogsAtEnd = await helper.blogsInDb()
    expect(blogsAtEnd[blogsAtEnd.length - 1].likes).toBe(0)
  })

  test('fails with status code 400 if title or url properties are missing', async () => {
    const newBlog = {
      author: 'Robert C. Martin',
      likes: 2
    }

    await api.post('/api/blogs')
      .set(headers)
      .send(newBlog)
      .expect(400)

    const blogsAtEnd = await helper.blogsInDb()
    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length)
  })

  test('fails with status code 401 if a token is not provided', async () => {
    const newBlog = {
      title: 'Canonical string reduction',
      author: 'Edsger W. Dijkstra',
      url: 'http://www.cs.utexas.edu/~EWD/transcriptions/EWD08xx/EWD808.html',
      likes: 12
    }

    const result = await api.post('/api/blogs')
      .send(newBlog)
      .expect(401)

    expect(result.body.error).toContain('invalid token')
    
    const blogsAtEnd = await helper.blogsInDb()
    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length )
  })
})

describe('deletion of a blog', () => {
  let headers = {}

  beforeEach(async () => {
    const newUser = {
      username: 'root',
      name: 'Superuser',
      password: 'salainen',
    }

    await api.post('/api/users')
      .send(newUser)

    const result = await api.post('/api/login')
      .send(newUser)

    headers = {
      'Authorization': `bearer ${result.body.token}`
    }
  })

  test('succeeds with status code 204 if id is valid', async () => {
    const newBlog = {
      title: 'TDD harms architecture',
      author: 'Robert C. Martin',
      url: 'http://blog.cleancoder.com/uncle-bob/2017/03/03/TDD-Harms-Architecture.html',
      likes: 0,
    }

    await api.post('/api/blogs')
      .set(headers)
      .send(newBlog)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const blogsAtStart = await helper.blogsInDb()
    const blogToDelete = blogsAtStart[blogsAtStart.length - 1]

    await api.delete(`/api/blogs/${blogToDelete.id}`)
      .set(headers)
      .expect(204)

    const blogsAtEnd = await helper.blogsInDb()
    expect(blogsAtEnd).toHaveLength(blogsAtStart.length - 1)

    const titles = blogsAtEnd.map(r => r.title)
    expect(titles).not.toContain(blogToDelete.title)
  })

  test('fails with status code 401 if user who deleted the blog is not the user who added it', async () => {
    const blogsAtStart = await helper.blogsInDb()
    const blogToDelete = blogsAtStart[0]

    const result = await api.delete(`/api/blogs/${blogToDelete.id}`)
      .set(headers)
      .expect(401)

    expect(result.body.error).toContain('unauthorized')

    const blogsAtEnd = await helper.blogsInDb()
    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length)
  })
})

describe('update of a blog', () => {
  test('succeeds with status code 204 if id is valid', async () => {
    const blogsAtStart = await helper.blogsInDb()
    const blogToUpdate = blogsAtStart[0]

    const newBlog = {
      title: 'Modified title',
      author: 'Edsger W. Dijkstra',
      url: 'http://www.u.arizona.edu/~rubinson/copyright_violations/Go_To_Considered_Harmful.html',
    }

    await api.put(`/api/blogs/${blogToUpdate.id}`)
      .send(newBlog)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const blogsAtEnd = await helper.blogsInDb()
    expect(blogsAtEnd[0].title).toBe('Modified title')
  })
})

afterAll(() => {
  mongoose.connection.close()
})