import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import Toggable from './Toggable'
import BlogForm from './BlogForm'
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Paper
} from '@mui/material'

const BlogList = () => {
  const blogs = useSelector(state => state.blog)

  return (
    <>
      <Toggable buttonLabel="new blog">
        <BlogForm />
      </Toggable>

      <TableContainer component={Paper}>
        <Table>
          <TableBody>
            {blogs
              .sort((a, b) => b.likes - a.likes)
              .map(blog => (
                <TableRow key={blog.id}>
                  <TableCell>
                    <Link to={`/blogs/${blog.id}`}>{blog.title}</Link>
                  </TableCell>
                  <TableCell>
                    {blog.author}
                  </TableCell>
                </TableRow>
              ))
            }
          </TableBody>
        </Table>
      </TableContainer>
    </>
  )
}

export default BlogList
