"use server"

import { getChartData } from "./chart-data"

export async function fetchChartData() {
  return await getChartData()
}
