/**
 * Find users who didn't receive the V2 launch email.
 * Run with: npx tsx scripts/find-unsent-users.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Emails confirmed sent from the logs
const sentEmails = new Set([
  'freddy@heatwriter.com',
  'doggy_bau@yahoo.it',
  'potatoslicer18@protonmail.com',
  'tedriot@gmail.com',
  'bigwetvinyl@gmail.com',
  'delmarle.damien@gmail.com',
  'tinoyom258@hudisk.com',
  'fanio.zilla@gmail.com',
  'brett.jones19@gmail.com',
  'gorlitzerpark@gmail.com',
  'nextgennode@gmail.com',
  'themcdougster@gmail.com',
  'cocrourodogei-5506@yopmail.com',
  'benjamin@zeah.de',
  'tristan.hubert@gmail.com',
  'eveblattner@gmail.com',
  'israellaguancolombia@gmail.com',
  'ffabrevoie@gmail.com',
  'jason.kehrli@gmail.com',
  'crisis2432001@gmail.com',
  'invalidrequest400+400@gmail.com',
  'benjamien@zeah.de',
  'generallayzie@gmail.com',
  'receipe4success@gmail.com',
  'tamixec999@gavrom.com',
  'aks2bang@gmail.com',
  'sidianmorningstar@gmail.com',
  'jacobmtapp8@outlook.com',
  'loya951222@gmail.com',
  'psk.dr.sinandogan@gmail.com',
  'ebo290494@gmail.com',
  'jihedaltair@gmail.com',
  'jonnyman109@yahoo.com',
  'elie.benaroch@gmail.com',
  'kipapas741@akixpres.com',
  'gskirk2010@gmail.com',
  'andreiagodinhomd@gmail.com',
  '982016021@qq.com',
  'gleyssorhavi60@gmail.com',
  'akhona.emails@gmail.com',
  'tinawawira74@gmail.com',
  'bigay5767@gmail.com',
  'gaybi5767@gmail.com',
  'sandwichbreadeater@outlook.com',
  'marcolopolorv@gmail.com',
  'mikeplato@gmail.com',
  'amirxonshodiboyev@gmail.com',
  'jonpedersen@gmail.com',
  'akhona.ngwane@gmail.com',
  'bylokonnor@gmail.com',
  'superkat1@gmail.com',
  'zerowtiktok70@gmail.com',
  'jmfred1109@gmail.com',
  'ayushgu640@gmail.com',
  'pakoh86758@icousd.com',
  'mo.lenuta.id@gmail.com',
  'cristianchiaverina@gmail.com',
  'd47264535@gmail.com',
  'opulente3000@gmail.com',
  'hamyham112@gmail.com',
  'tototopark@gmail.com',
  'rohiniisuresh@gmail.com',
  'shaunisperry@gmail.com',
  'jasonspriggs@mac.com',
  'livingbyday123@gmail.com',
  'azamataa@gmail.com',
  'celsoavfilho@gmail.com',
  'youceftaleb050@gmail.com',
  'marswarrior82@gmail.com',
  'kerljfub@gmail.com',
  'mariandrade470@gmail.com',
  'aicreatordg@gmail.com',
  'rgsmef19@gmail.com',
  'samuelyoussef488@gmail.com',
  'eccentaci@gmail.com',
  'itsdarkidiot@gmail.com',
  'thomassnoeck@hotmail.com',
  'lhllparis@gmail.com',
  'jonathan.basset@gmail.com',
  'pantsandeep11@gmail.com',
  'shkarshkarhssen@gmail.com',
  'onweeke@googlemail.com',
  'wokido6078@hudisk.com',
  'israellaguan@gmail.com',
  'leerraum-truhen3e@icloud.com',
  'hm.gobbo@gmail.com',
  'iamtrashbhitch@gmail.com',
  'fabrevoie@gmail.com',
  'mydemonsaremyangels@gmail.com',
  'lastarcstar@gmail.com',
  'gilzohar@rogers.com',
  'rp0070r@gmail.com',
  'iamshanto7860@gmail.com',
  'bebobbles2012@gmail.com',
  'brandant2001@gmail.com',
  'itsyomama736@gmail.com',
  'tydrodacalmdon@gmail.com',
]);

async function main() {
  const allUsers = await prisma.user.findMany({
    select: { email: true, name: true },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Total users: ${allUsers.length}`);
  console.log(`Already sent: ${sentEmails.size}`);

  const unsent = allUsers.filter(u => !sentEmails.has(u.email.toLowerCase()));

  console.log(`\nUnsent (${unsent.length} users):\n`);
  unsent.forEach(u => {
    console.log(u.email);
  });

  console.log(`\n--- Copy-paste list ---\n`);
  console.log(unsent.map(u => u.email).join('\n'));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
