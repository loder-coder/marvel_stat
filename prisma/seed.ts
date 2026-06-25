import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ROLE_TRANSLATIONS: Record<string, string> = {
  Duelist: "공격형",
  Vanguard: "수호형",
  Strategist: "지원형"
};

const DEFAULT_HEROES = [
  { heroId: "1011001", name: "Luna Snow", role: "Strategist" },
  { heroId: "1011002", name: "Magneto", role: "Vanguard" },
  { heroId: "1011003", name: "Spider-Man", role: "Duelist" },
  { heroId: "1011004", name: "Scarlet Witch", role: "Duelist" },
  { heroId: "1011005", name: "Thor", role: "Vanguard" }
];

async function main() {
  const client = prisma as unknown as {
    heroTranslation: {
      upsert: (args: {
        where: { heroId: string };
        create: { heroId: string; nameKo: string; roleKo: string };
        update: { nameKo: string; roleKo: string };
      }) => Promise<unknown>;
    };
  };

  for (const hero of DEFAULT_HEROES) {
    await client.heroTranslation.upsert({
      where: { heroId: hero.heroId },
      create: {
        heroId: hero.heroId,
        nameKo: hero.name,
        roleKo: ROLE_TRANSLATIONS[hero.role] ?? hero.role
      },
      update: {
        nameKo: hero.name,
        roleKo: ROLE_TRANSLATIONS[hero.role] ?? hero.role
      }
    });
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
