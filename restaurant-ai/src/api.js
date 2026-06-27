import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' }
})

// Auth
export const register = (data) => api.post('/auth/register', data)
export const login    = (data) => api.post('/auth/login', data)
export const getAllUsers    = ()          => api.get('/auth/users')
export const updateUserRole = (id, role) => api.patch(`/auth/users/${id}/role`, { role })
export const toggleUserActive = (id)     => api.patch(`/auth/users/${id}/toggle`)

// Menu
export const getMenu        = ()       => api.get('/menu/')
export const createMenuItem = (data)   => api.post('/menu/', data)
export const updateMenuItem = (id, data) => api.put(`/menu/${id}`, data)
export const deleteMenuItem = (id)     => api.delete(`/menu/${id}`)
export const toggleMenuItem = (id)     => api.patch(`/menu/${id}/toggle`)

// Inventory
export const getInventory       = ()         => api.get('/inventory/')
export const createIngredient   = (data)     => api.post('/inventory/', data)
export const updateIngredient   = (id, data) => api.put(`/inventory/${id}`, data)
export const deleteIngredient   = (id)       => api.delete(`/inventory/${id}`)
export const restockIngredient  = (id)       => api.patch(`/inventory/${id}/restock`)
export const getStockAlerts     = ()         => api.get('/inventory/alerts')

// Orders
export const getOrders      = ()       => api.get('/orders/')
export const createOrder    = (data)   => api.post('/orders/', data)
export const updateOrderStatus = (id, status) => api.patch(`/orders/${id}/status`, { status })
export const getOrderStats  = ()       => api.get('/orders/stats')

// Alerts
export const getAlerts = () => api.get('/alerts/')

// Sales
export const getDashboardStats   = () => api.get('/sales/dashboard')
export const getWeeklyRevenue    = () => api.get('/sales/weekly')
export const getTopDishes        = () => api.get('/sales/top-dishes')
export const getHourlyOrders     = () => api.get('/sales/hourly')
export const getCategoryRevenue  = () => api.get('/sales/category-revenue')

export const getForecast        = () => api.get('/sales/forecast')
export const getForecastChart   = () => api.get('/sales/forecast/chart')
export const getReorderRecs     = () => api.get('/sales/reorder')

export const updateMenuPrice = (id, price) => api.patch(`/menu/${id}/price`, { price })

export const getReviews    = ()     => api.get('/reviews/')
export const createReview  = (data) => api.post('/reviews/', data)
export const deleteReview  = (id)   => api.delete(`/reviews/${id}`)
export const getReviewStats = ()    => api.get('/reviews/stats')

export const getProfile    = (id)       => api.get(`/auth/me/${id}`)
export const updateProfile = (id, data) => api.patch(`/auth/me/${id}`, data)
export const exportData    = ()         => api.get('/sales/export')
export const resetOrders   = ()         => api.delete('/orders/reset')

export const getRecipe    = (menuItemId)         => api.get(`/recipes/${menuItemId}`)
export const saveRecipe   = (data)               => api.post('/recipes/', data)
export const deleteRecipe = (menuItemId)         => api.delete(`/recipes/${menuItemId}`)

export default api