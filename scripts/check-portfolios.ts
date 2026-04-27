import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const portfolios = await prisma.portfolio.findMany({
    select: {
      id: true,
      title: true,
      behanceUrl: true,
    }
  });
  console.log(JSON.stringify(portfolios, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
