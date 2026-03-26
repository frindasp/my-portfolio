"use server";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function getOrCreateRole(name: string) {
  let role = await prisma.role.findUnique({
    where: { name }
  });

  if (!role) {
    role = await prisma.role.create({
      data: { name }
    });
  }

  return role;
}
