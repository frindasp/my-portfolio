"use server";

import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";

const prisma = new PrismaClient();

export async function getRecentActivities(limit = 5) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("portfolio_session")?.value;
  if (!userId) return [];

  return prisma.historyActivityUser.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getHistoryActivities(page = 1, pageSize = 10) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("portfolio_session")?.value;
  if (!userId) {
    return {
      items: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
    };
  }

  const normalizedPageSize = [10, 20, 40, 80, 100].includes(pageSize) ? pageSize : 10;
  const normalizedPage = page < 1 ? 1 : page;

  const [total, items] = await Promise.all([
    prisma.historyActivityUser.count({ where: { userId } }),
    prisma.historyActivityUser.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip: (normalizedPage - 1) * normalizedPageSize,
      take: normalizedPageSize,
    }),
  ]);

  return {
    items,
    total,
    page: normalizedPage,
    pageSize: normalizedPageSize,
    totalPages: Math.ceil(total / normalizedPageSize),
  };
}
