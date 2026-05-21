import { configureStore } from '@reduxjs/toolkit'
import authReducer from '@/features/auth/model/authSlice.js'
import dataReducer from '@/features/catalog/model/catalogSlice.js'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    data: dataReducer,
  },
})
