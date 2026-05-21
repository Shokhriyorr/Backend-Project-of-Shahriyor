import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  setCourses,
  setTeachers,
  setCategories,
  setEnrollments,
  clearEnrollments,
} from '@/features/catalog/model/catalogSlice.js'
import * as catalogApi from '@/features/catalog/api/catalogApi.js'

export function useAppInit() {
  const dispatch = useDispatch()
  const user = useSelector((state) => state.auth.user)

  useEffect(() => {
    const courseParams = user?.role === 'admin' ? {} : { limit: 100 }
    catalogApi.getCourses(courseParams).then((data) => dispatch(setCourses(data)))
    catalogApi.getTeachers().then((data) => dispatch(setTeachers(data)))
    catalogApi.getCategories().then((data) => dispatch(setCategories(data)))
  }, [dispatch, user?.role])

  useEffect(() => {
    if (user?.id) {
      catalogApi.getEnrollments().then((data) => dispatch(setEnrollments(data)))
    } else {
      dispatch(clearEnrollments())
    }
  }, [user, dispatch])
}
