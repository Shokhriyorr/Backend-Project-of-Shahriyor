import { createSlice } from '@reduxjs/toolkit'

const dataSlice = createSlice({
  name: 'data',
  initialState: {
    courses:     [],
    teachers:    [],
    categories:  [],
    enrolledIds: [],
  },
  reducers: {
    setCourses    (state, { payload }) { state.courses     = payload },
    setTeachers   (state, { payload }) { state.teachers    = payload },
    setCategories (state, { payload }) { state.categories  = payload },
    setEnrollments(state, { payload }) { state.enrolledIds = payload },
    clearEnrollments(state)            { state.enrolledIds = []      },

    courseAdded  (state, { payload }) { state.courses.unshift(payload) },
    courseUpdated(state, { payload }) {
      const i = state.courses.findIndex((c) => c.id === payload.id)
      if (i !== -1) state.courses[i] = payload
    },
    courseRemoved(state, { payload: id }) {
      state.courses = state.courses.filter((c) => c.id !== id)
    },

    teacherAdded  (state, { payload }) { state.teachers.unshift(payload) },
    teacherUpdated(state, { payload }) {
      const i = state.teachers.findIndex((t) => t.id === payload.id)
      if (i !== -1) state.teachers[i] = payload
    },
    teacherRemoved(state, { payload: id }) {
      state.teachers = state.teachers.filter((t) => t.id !== id)
    },

    categoryAdded  (state, { payload }) { state.categories.unshift(payload) },
    categoryUpdated(state, { payload }) {
      const i = state.categories.findIndex((c) => c.id === payload.id)
      if (i !== -1) state.categories[i] = payload
    },
    categoryRemoved(state, { payload: id }) {
      state.categories = state.categories.filter((c) => c.id !== id)
    },

    enrolled  (state, { payload: courseId }) { state.enrolledIds.push(courseId) },
    unenrolled(state, { payload: courseId }) {
      state.enrolledIds = state.enrolledIds.filter((id) => id !== courseId)
    },
  },
})

export const {
  setCourses, setTeachers, setCategories, setEnrollments, clearEnrollments,
  courseAdded, courseUpdated, courseRemoved,
  teacherAdded, teacherUpdated, teacherRemoved,
  categoryAdded, categoryUpdated, categoryRemoved,
  enrolled, unenrolled,
} = dataSlice.actions

export default dataSlice.reducer
