# TaskFlow

TaskFlow is a full-stack task management and monitoring system that helps users create, manage, track, and organize tasks efficiently.

It also provides an Admin Dashboard where administrators can manage users, assign tasks, and monitor task activity.

## Live Demo

https://task-flow-zeta-eight-30.vercel.app/

## GitHub Repository

https://github.com/Gorang7352/TaskFlow

---

## Features

### User Features

- User registration and login
- JWT-based authentication
- Create tasks
- Edit tasks
- Delete own tasks
- Mark tasks as completed
- Set task priority
- Set due dates
- Assign tasks
- Search tasks
- Filter tasks by category, priority, and status
- Sort tasks
- View task details
- Task completion statistics
- Overdue task tracking
- Assignment notifications
- Assigned date display
- Dashboard analytics

### Admin Features

- Separate Admin Dashboard
- Admin/User Mode switching
- Manage registered users
- Add users to My Users
- Remove users
- Create and assign tasks
- Monitor assigned tasks
- View task statistics
- View priority statistics
- View recent tasks
- Task completion monitoring

### Security & Access Control

- JWT authentication
- Password hashing
- Protected API routes
- Role-based Admin/User access
- Only the task owner can delete a task
- Assigned users cannot delete tasks assigned to them

---

## Tech Stack

### Frontend

- React.js
- Vite
- JavaScript
- HTML5
- CSS3

### Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT
- bcryptjs

### Deployment

- Vercel
- Render
- MongoDB Atlas

### Development Tools

- Git
- GitHub
- VS Code

---

## Application Workflow

```text
User/Admin Registration
        ↓
       Login
        ↓
   JWT Authentication
        ↓
 ┌───────────────┐
 │               │
User Dashboard   Admin Dashboard
 │               │
Create Tasks     Manage Users
 │               │
Edit Tasks       Assign Tasks
 │               │
Complete Tasks   Monitor Tasks
 │               │
Search/Filter    Statistics
 │
Notifications