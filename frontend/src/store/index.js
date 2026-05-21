import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice.js'
import dataReducer from './dataSlice.js'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    data: dataReducer,
  },
})
