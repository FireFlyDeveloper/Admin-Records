/// <reference types="vite/client" />

export const API_BASE_URL = ''
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Dragonfly Platform'
export const MAX_UPLOAD_SIZE = Number(import.meta.env.VITE_MAX_UPLOAD_SIZE) || 104857600
export const DEFAULT_PAGE_SIZE = Number(import.meta.env.VITE_DEFAULT_PAGE_SIZE) || 25
