import { createSlice } from '@reduxjs/toolkit'
import { clearStoredSession, getStoredSession } from '../api.js'

const stored = getStoredSession()

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: stored.user,
  },
  reducers: {
    setUser(state, { payload }) {
      state.user = payload
    },
    clearUser(state) {
      state.user = null
      clearStoredSession()
    },
  },
})

export const { setUser, clearUser } = authSlice.actions
export default authSlice.reducer
