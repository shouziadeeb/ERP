export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: PaginationMeta
}

export interface CursorPaginationMeta {
  limit: number
  total: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  startCursor: string | null
  endCursor: string | null
}

export interface CursorPaginatedResult<T> {
  data: T[]
  pagination: CursorPaginationMeta
}

export type SortOrder = 'asc' | 'desc'

export interface ListQueryBase {
  page?: number
  limit?: number
  search?: string
  sortBy?: string
  sortOrder?: SortOrder
}
