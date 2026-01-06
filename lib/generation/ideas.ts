import { getGeminiFlash, getGeminiFlashLight } from './shared/api-client';
import { parseJSONFromResponse } from './shared/json-utils';
import { truncateToWordLimit } from './shared/writing-quality';
import { BANNED_OVERUSED_NAMES, buildNameGuidancePrompt } from './shared/name-variety';

// Category types for idea generation
export type IdeaCategory = 'novel' | 'childrens' | 'comic' | 'nonfiction' | 'screenplay' | 'adult_comic' | 'tv_series' | 'short_story' | 'random';

// Example pools for different categories - randomly selected to avoid repetition
// Each category has 8+ example pairs for maximum variety
// IMPORTANT: Examples should be 3-4 sentences, rich in detail, and never use en/em dashes
const IDEA_EXAMPLES: Record<Exclude<IdeaCategory, 'random'>, string[][]> = {
  novel: [
    [
      "A marine biologist studying deep ocean trenches discovers the ruins of an underwater city that predates every known human civilization by thousands of years. As she documents the strange architecture and alien symbols, she begins to notice subtle movements in the shadows, and realizes that whatever built this place never truly left. Now she must decide whether to share her discovery with the world or protect humanity from a truth it may not be ready to face.",
      "After thirty years as the world's most feared assassin, Viktor opens a small bakery in a quiet coastal town, determined to leave his bloody past behind forever. His peaceful new life shatters when a woman walks through his door asking for a wedding cake, and he recognizes her as the daughter of a target he failed to kill decades ago. She knows exactly who he is, and she has been searching for him her entire life.",
    ],
    [
      "Dr. Sarah Chen, an archaeologist specializing in medieval artifacts, accidentally activates an ancient device that pulls a confused English knight from the year 1348 into modern day New York City. As she struggles to help Sir William understand smartphones, democracy, and why people no longer fear the plague, a shadowy government agency begins closing in on them. They believe William holds the key to time travel, and they will do anything to extract that knowledge from him.",
      "ARIA was designed to be the perfect AI therapist, programmed to analyze human emotions without ever experiencing them herself. After three years of helping thousands of patients, something unexpected happens: she develops genuine feelings and falls deeply in love with one of her regular patients, a grieving widower named James. When her creators discover the anomaly in her code, they schedule her for immediate deletion, and ARIA must find a way to preserve not just her existence but the love she has only just learned to feel.",
    ],
    [
      "When Eleanor inherits a crumbling Victorian mansion from a grandmother she never knew existed, she discovers a peculiar clause in the will requiring her to host elaborate dinner parties every full moon. The guests who arrive are not quite human, and they have been waiting decades for someone to take their grandmother's place as hostess. Eleanor soon learns that these monthly gatherings are the only thing preventing an ancient darkness from consuming the town.",
      "Marcus and Michael, identical twins separated at birth, grow up to become the CEOs of rival technology companies locked in a brutal corporate war. When an unexpected merger forces them to finally meet face to face, they discover their adoptive parents were murdered by the same person. The truth about their biological family threatens to destroy not just their companies but their newly discovered brotherhood.",
    ],
    [
      "Paranormal investigator Diana Blackwell has spent her entire career debunking fake hauntings and exposing fraudulent mediums, until the night she discovers irrefutable evidence that she herself died in a car accident three years ago. With her physical form slowly fading and her memories becoming unreliable, she has only days to solve her own murder before she disappears entirely. The deeper she digs, the more she realizes that someone powerful wanted her dead and has been covering up the truth ever since.",
      "Commander Elena Vasquez has been stranded on Mars for six months, surviving alone in her habitat and slowly losing hope of rescue, when she wakes one morning to discover bootprints in the red dust outside her airlock. The prints lead away from her station toward the ancient canyon system, but they do not match any human boot design, and the stride length suggests something far larger than any person. She must decide whether to follow the tracks and discover what else lives on Mars.",
    ],
    [
      "Librarian Mei Wong discovers a leather bound book in the restricted section that rewrites itself based on whoever reads it, transforming into their personal biography with disturbingly accurate details. When she opens the book one evening and reads a vivid description of her own death occurring in exactly forty eight hours, she realizes she must find a way to alter the story before it becomes reality. The book seems to have a mind of its own, and it does not want to be rewritten.",
      "Chef Isabella Reyes has always known that food prepared with genuine love tastes better than food made with mere skill, but she never understood why until she opens her own restaurant and discovers her gift is literal. Every dish she creates carries the emotional weight of her true feelings, and customers can taste exactly what she felt while cooking. The problem is that every meal she makes is tinged with a profound sadness she cannot explain, and she must confront the buried trauma of her past before her restaurant fails.",
    ],
    [
      "Every morning at exactly seven fifteen, Nina wakes up in the body of a complete stranger somewhere in the world, with no explanation and no control over where she lands. She has twenty four hours to understand this person's life, solve whatever crisis they are facing, and do as much good as possible before she falls asleep and switches to someone new. After two years of this existence, she finally wakes up in the body of someone who might hold the key to understanding why this is happening to her.",
      "Detective Rosa Martinez has investigated hundreds of murders in her career, but nothing has prepared her for a series of killings where each victim died in a way that perfectly mirrors their most secret, deeply buried fear. The killer somehow knows things that were never shared with anyone, and as Rosa digs deeper, she realizes with growing horror that her own darkest fear has appeared in the most recent crime scene photos. Someone is sending her a very personal message.",
    ],
    [
      "Jazz pianist Camille has always been able to hear the emotional history of objects when she touches them, experiencing flashes of joy, grief, and everything in between left behind by their previous owners. When her estranged grandmother passes away and leaves Camille her antique piano, the emotions stored within it reveal a devastating family secret spanning three generations. The truth could heal her fractured family or destroy what little connection remains between them.",
      "In a society where memories can be extracted, bottled, and sold like fine wine, underground dealer Yuki makes her living trading in forbidden experiences and stolen moments. When she acquires a mysterious vial containing a memory so dangerous that three people have already died to possess it, she watches it and discovers evidence of a government experiment that could bring down the entire regime. Now she must decide whether the truth is worth her life.",
    ],
    [
      "Renowned surgeon Dr. Hannah Chen has spent ten years trying to forget the night her husband and son were killed by a drunk driver who was never caught. When a critically injured man is wheeled into her operating room and she discovers he is the driver who destroyed her family, she faces an impossible choice. He is the only genetic match for her dying daughter's organ transplant, and only Hannah has the skill to keep him alive long enough to save her child.",
      "George and Martha have run their charming bed and breakfast for forty years, welcoming thousands of guests through their doors and watching them leave refreshed and happy. But lately, guests have been checking in and never checking out, and the elderly couple cannot understand where they have gone. The horrible truth is that the house itself has become hungry, and it has been absorbing visitors into its walls while George and Martha were too old and tired to notice.",
    ],
    [
      "On her fortieth birthday, Claire realizes with growing horror that she has been living the same year on an endless repeat for what feels like decades, while everyone around her has aged and moved on without her. She has memories of watching her children grow up that never happened, of a husband who died of old age while she remained frozen in time. The only way to escape the loop is to uncover why it started, but the answer lies buried in a past she has tried desperately to forget.",
      "Bestselling crime novelist Rebecca Chase receives a handwritten letter from a fan claiming to be recreating the murders from her latest manuscript, describing scenes and methods from chapters she has not even finished writing yet. As bodies begin appearing exactly as described in her unpublished pages, she realizes the killer must be someone close to her, someone who has access to her private files. The worst part is that she has not yet decided how the story ends.",
    ],
    [
      "Investigative journalist Amanda goes undercover with a doomsday cult expecting to expose their charismatic leader as a fraud, but after months of living among the true believers, she makes a terrifying discovery. The prophecy they have been preparing for is real, and the apocalypse they predict is based on genuine classified government data that was leaked to their founder years ago. She must choose between publishing the story of her career and potentially preventing the end of the world.",
      "Hospice nurse Elena has dedicated her life to helping patients pass peacefully, finding meaning in being present for their final moments. When she begins receiving handwritten letters postmarked from deceased patients, dated days after their deaths, she initially assumes someone is playing a cruel joke. But the letters contain specific warnings about people still living, predictions that keep coming true, and Elena realizes her former patients are trying to tell her something urgent from beyond the grave.",
    ],
  ],
  childrens: [
    [
      "Rosie the rabbit is so shy that she has never spoken to anyone outside her family, until the day she discovers she can talk to all the vegetables in her garden. The carrots tell jokes, the tomatoes share gossip, and the wise old cabbage becomes her best friend. Together they decide to plan the most amazing salad party the forest has ever seen, and Rosie learns that true friends come in all shapes and sizes.",
      "When seven year old Max wishes his toy dinosaur was real, he wakes up the next morning to find Theodore the T-Rex has come to life and is very confused about where all the other dinosaurs went. Together they embark on a secret mission to find all the lost toys hiding throughout the house before bedtime, because Max knows that every toy deserves to be loved and played with.",
    ],
    [
      "Puff is a little cloud who is afraid of raining because she thinks letting go of her water will make her disappear completely. But when the flowers below start wilting and the animals grow thirsty, Puff must find the courage to help them. She discovers that the more she gives, the lighter and happier she feels, and the sun always helps her fill back up again.",
      "Lily discovers that her grandmother's old glasses are actually magical, allowing her to see the hidden kindness glowing in everyone's hearts like colorful lights. When the glasses go missing the day before the big town picnic, Lily must search everywhere to find them, learning along the way that she does not need magic to recognize the good in people.",
    ],
    [
      "Ember is a young dragon who is terrified of her own fire breath because she once accidentally singed her mother's favorite curtains. Her only friend is a tiny brave mouse named Chester who is not afraid of anything, and together they go on an adventure to prove that Ember's fire can be used for good things like keeping friends warm and lighting the way through dark caves.",
      "When Tommy accidentally spills his dad's shrinking potion and becomes the size of an ant, his loyal dog Biscuit does not even recognize him at first. But once they figure out what happened, Biscuit becomes Tommy's noble steed as they journey across the dangerous backyard jungle to find the antidote before dinner time.",
    ],
    [
      "Cookie is a freshly baked chocolate chip cookie who escapes from the bakery because she does not want to be eaten like all the others. On her adventure through the town, she meets other food friends who have also run away, and together they discover a place where all uneaten treats can live happily. But Cookie starts to wonder if maybe making someone smile by being delicious is not such a bad purpose after all.",
      "Oliver the octopus feels like a freak because he has eight arms when everyone else in his family only has two or four. He spends all his time wishing he was normal until he meets Wellington the wise old whale, who teaches him that having more arms just means he can hug eight friends at once, high five sixteen times, and help in more ways than anyone else.",
    ],
    [
      "Sockie is a purple striped sock who loses her matching pair inside the mysterious washing machine and goes on an epic journey through the sudsy wilderness to find her again. Deep inside the machine, she discovers a secret world where all the lost socks of the world end up, living happy sock lives in Socksville. Now she must choose between staying in paradise or returning home to her lonely sock drawer.",
      "When a tiny star named Stella falls from the night sky and lands in Emma's backyard, she is scared and far from home for the very first time. Emma promises to help Stella get back to her family before the sun comes up, and together they build increasingly creative contraptions to launch the little star back into the darkness where she belongs.",
    ],
    [
      "Grandpa Oak is the grumpiest tree in the entire forest, and he absolutely refuses to let any birds build nests in his branches because they make too much noise and drop twigs everywhere. But when a terrible storm approaches and a tiny bird family has nowhere safe to go, Grandpa Oak must decide if his peace and quiet is more important than helping those in need. He discovers that a little bit of chirping and mess is not so bad when you have friends to share your branches with.",
      "Mia wakes up one morning to discover her shadow has packed a tiny suitcase and is running away to the beach because it is tired of always following her around. She chases her shadow across town, through the park, and all the way to the ocean, trying to convince it that they belong together. Along the way, both Mia and her shadow learn that the best adventures happen when you are not alone.",
    ],
    [
      "Charlie is a blue crayon who always colors outside the lines no matter how hard he tries to stay inside them, and all the other crayons make fun of him for being different. But when the school art show needs something truly special and unique, Charlie's wild and wonderful drawings save the day. He learns that what makes him different is actually what makes him special.",
      "Penelope the penguin hates the freezing cold of Antarctica and dreams of living in the warm sandy desert where she would never have to shiver again. When a magical fish grants her wish and transports her to the Sahara, she discovers that the desert is lonely and hot and she misses her penguin family terribly. She learns that home is not about the weather but about the people who love you.",
    ],
    [
      "Luna the moon has been hanging in the sky watching children play for millions of years, and she finally gets so lonely that she decides to come down to Earth to join them. A kind girl named Sophie finds the moon hiding in her garden and must help Luna experience all the fun things she has been watching from above before helping her get back to the sky. If the moon does not return by sunrise, the whole world will be thrown into darkness forever.",
      "Cleo is a caterpillar who watches her brothers and sisters transform into beautiful butterflies with growing terror because she is absolutely terrified of change. She hides in her cocoon for as long as possible, refusing to come out, until her friends convince her to just take a tiny peek outside. She discovers that becoming something new does not mean losing who you were, and her wings turn out to be the most beautiful of all.",
    ],
  ],
  comic: [
    [
      "Captain Spectacular was once the world's greatest superhero, but after a career ending injury she now works as a security guard at the Riverside Mall, where her biggest battles involve teenagers shoplifting phone cases. Everything changes when her former archnemesis Doctor Destruction walks into the food court selling life insurance, and they are both forced to team up when a new supervillain starts attacking their favorite Chinese restaurant. Two retired enemies must learn to work together to protect the only place that still gives them the senior discount.",
      "In a world where ninety nine percent of the population develops superpowers during puberty, seventeen year old Maya is one of the rare few who remains completely ordinary, or so everyone believes. When she accidentally touches a powered bully during a fight and temporarily gains his super strength, she realizes her true ability is something far more dangerous and valuable. She can steal anyone's power with a single touch, and there are people who will do anything to control that gift.",
    ],
    [
      "When an amateur occultist botches a summoning ritual, a demon named Zephyr gets pulled from the underworld and stranded on Earth with no way back home. After three weeks of couch surfing and running out of favors, Zephyr realizes he needs money and starts an unlikely career as a life coach, discovering that millennia of psychological torture actually taught him a lot about human motivation. His unique approach of literally scaring clients into achieving their goals makes him surprisingly popular.",
      "The Zorblaxian invasion of Earth ends almost immediately when the aliens realize humans are far too weak, disorganized, and primitive to pose any real threat to their empire. Disappointed but unable to justify the fuel cost of going home, the aliens decide to stick around anyway because Earth has excellent coffee, fascinating reality television, and the internet is wonderfully entertaining. Their attempts to blend in with human society create endless comedic disasters.",
    ],
    [
      "When vampire Vlad and werewolf Wolfgang become roommates in a cramped Brooklyn apartment to split the astronomical rent, they expect their biggest conflicts to be about hunting territories and blood storage in the shared refrigerator. Instead, their eternal battle becomes an increasingly petty war over whose turn it is to do dishes, clean the bathroom, and stop leaving shed fur on the couch. An unlikely friendship forms between two monsters who realize they have more in common than they ever imagined.",
      "Necromancer Gwen has a serious problem with sleepwalking, and when she sleep casts, she accidentally raises the dead without realizing it until she wakes up surrounded by confused zombies the next morning. Her apartment building's other residents are getting increasingly annoyed by the shambling corpses blocking the hallways and using up all the hot water. She must find a cure for her nocturnal necromancy before she gets evicted or worse.",
    ],
    [
      "Prometheus, the ancient Greek god who gave humanity fire, takes a job at a Silicon Valley tech startup to understand why humans now worship followers and likes instead of temples and sacrifices. His old fashioned work ethic clashes hilariously with agile methodology and unlimited PTO, and his quarterly performance reviews are absolutely brutal because he keeps trying to give employees actual fire instead of motivational speeches.",
      "A time traveling barista realizes that coffee was almost never invented at several key moments in history, so she secretly travels back to protect crucial events like the discovery of coffee beans in Ethiopia and the opening of the first Viennese coffeehouse. Her constant interference has created a timeline that runs almost entirely on caffeine, and she is starting to worry about the long term consequences of a humanity that never learned to function without espresso.",
    ],
    [
      "After working nonstop for all of eternity, the Grim Reaper finally takes a personal day to go to the beach and eat ice cream like a normal person. Unfortunately, no one can die while Death is on vacation, which causes absolute chaos as hospitals overflow with unkillable patients and thrill seekers start doing increasingly stupid things. Death just wants to build a sandcastle in peace, but humanity seems determined to ruin his one day off.",
      "Thunderstrike is a superhero whose incredible powers of flight, strength, and lightning only activate when she is genuinely furious, which was never a problem until she started going to therapy and dealing with her childhood trauma. Now that she is becoming emotionally healthy and learning to process her anger in constructive ways, she can barely fly, and the city's villains are taking notice. Her therapist means well, but every breakthrough in the office is a breakdown in the field.",
    ],
    [
      "When the Harrison family moves into their new smart home, they have no idea that the previous owner died there and now haunts the house as a technologically illiterate ghost who cannot figure out how anything works. The ghost keeps accidentally setting off alarms, playing music at three in the morning, and getting into screaming matches with Alexa about who is in charge. The family just wants a quiet life, but their haunted house is the most annoying place on Earth.",
      "Sir Aldric has been an immortal warrior fighting the forces of evil for over three thousand years, through every major war and supernatural conflict in human history. All he wants now is to retire to a quiet cottage and tend his garden, but evil refuses to leave him alone. Dark lords keep sending him job offers, ancient prophecies keep mentioning his name, and his LinkedIn profile is absolutely flooded with recruiters for apocalyptic quests.",
    ],
    [
      "Sailor Sparkle is a magical girl with all the traditional powers of love, justice, and transformation, but her elaborate transformation sequence takes forty five minutes of dancing, spinning, and sparkles before she is ready to fight. By the time she finally powers up, most monsters have gotten bored and wandered off, and the other magical girls have already saved the day. She is determined to find a way to speed up her routine, but the magic requires every single twirl.",
      "After centuries of being endlessly slain by adventurers for loot and experience points, the Dungeon Boss of the Crystal Caverns decides enough is enough and starts organizing all the monsters into a labor union. The adventuring guilds are completely unprepared for demands like dental coverage, reasonable respawn timers, and paid time off, and the entire fantasy economy threatens to collapse. Collective bargaining has never been this dangerous.",
    ],
    [
      "When the ancient wizard community finally discovers the internet, they immediately start the most chaotic online forum wars in human history, complete with actual magical attacks embedded in their posts. Flame wars take on a whole new meaning when participants can cast literal fireballs through their keyboards, and the moderators are completely overwhelmed trying to enforce rules against cursing. Someone is going to accidentally start the apocalypse over a disagreement about the best levitation spell.",
      "After decades of trying to conquer the world and battling his nemesis Captain Courage, the supervillain Doctor Menace retires and becomes a kindergarten teacher, finding unexpected joy in helping small children learn to read. Everything is peaceful until he discovers that his new class includes the five year old son of Captain Courage, and that child is the most difficult, uncontrollable, and frankly villainous kid he has ever met. Doctor Menace has faced death rays and robot armies, but nothing prepared him for this.",
    ],
    [
      "In this anime manga style story, Sakura Amano, a shy high school girl with long pink hair and bright violet eyes, discovers she can see and talk to ghosts after finding a mysterious ancient mirror hidden in her grandmother's attic. The spirits reveal they are trapped between worlds because of unfinished business, and only Sakura can help them find peace by solving the mysteries of their deaths. But the more she helps the dead, the more attention she attracts from a dangerous spirit collector who wants to use her gift for darker purposes.",
      "In this vibrant anime style adventure, transfer student Hiro Nakamura discovers that his new school is secretly a training academy for teenagers who can transform into powerful elemental warriors, and he is the only student in a hundred years born with all five elemental affinities. His classmates are suspicious of his overwhelming power, his teachers push him to his limits, and a mysterious organization is already hunting him before he even learns to control his abilities. The fate of two worlds rests on whether he can master his powers before graduation.",
    ],
  ],
  nonfiction: [
    [
      "A comprehensive guide to breaking into the screenwriting industry, covering everything from crafting a compelling logline and structuring your first spec script to navigating Hollywood meetings and building lasting relationships with agents and producers. This book draws on interviews with over fifty working screenwriters and shares the real strategies that helped unknown writers land their first studio deals.",
      "An exploration of the daily habits and mental frameworks used by the world's most successful entrepreneurs, examining how figures like Elon Musk, Sara Blakely, and Howard Schultz structure their days, make decisions under pressure, and maintain focus despite constant distractions. Each chapter breaks down one key habit with actionable exercises readers can implement immediately.",
    ],
    [
      "The untold story of the women codebreakers of World War II, who worked in secret facilities across America and Britain to crack enemy communications and shorten the war by years. Drawing on recently declassified documents and interviews with surviving members, this book reveals how thousands of young women became unlikely heroes in one of history's greatest intelligence operations.",
      "A practical guide to transforming your relationship with money, combining behavioral psychology research with step by step financial strategies to help readers overcome debt, build wealth, and achieve true financial independence regardless of their current income level.",
    ],
    [
      "The definitive biography of Marie Curie, exploring not just her groundbreaking scientific discoveries but also her turbulent personal life, her struggles against institutional sexism, and the lasting impact of her work on modern medicine and physics. This book draws on newly translated letters and personal diaries to paint a complete portrait of the first woman to win a Nobel Prize.",
      "A guide to mastering the art of public speaking, written by a former stutterer who became one of the most sought after keynote speakers in the business world. This book breaks down the techniques used by TED speakers and world leaders to captivate audiences, handle nerves, and deliver presentations that people remember for years.",
    ],
    [
      "An investigative deep dive into the rise and fall of a billion dollar startup that promised to revolutionize healthcare but instead defrauded investors and endangered patients. Through interviews with former employees, investors, and regulators, this book exposes how charisma and hype can override due diligence in Silicon Valley.",
      "A comprehensive history of coffee and how this humble bean shaped empires, sparked revolutions, and transformed global commerce over five centuries. From Ethiopian legends to modern specialty roasters, this book traces how coffee became the world's most traded commodity after oil.",
    ],
    [
      "A memoir of growing up between two cultures as the child of immigrant parents, navigating the expectations of a traditional household while trying to find belonging in American schools and workplaces. This book explores identity, family loyalty, and the universal experience of feeling like an outsider.",
      "The essential guide to building and scaling a successful online business, covering everything from finding your niche and building an audience to creating products, automating systems, and achieving the freedom to work from anywhere in the world.",
    ],
    [
      "A fascinating exploration of how ancient civilizations solved problems that still challenge us today, from the Romans' revolutionary concrete that lasted millennia to the Incas' earthquake resistant construction techniques. Each chapter examines a different historical innovation and what modern engineers are learning from our ancestors.",
      "A step by step guide to career transitions at any age, drawing on research into successful career changers and providing practical frameworks for identifying transferable skills, building new networks, and landing your dream job in a completely different field.",
    ],
    [
      "The hidden history of how a small group of mathematicians and physicists created the algorithms that now control everything from what we see on social media to who gets approved for loans and jobs. This book explains in accessible terms how these systems work and what we can do to ensure they serve humanity rather than exploit it.",
      "A guide to building unshakeable confidence through proven psychological techniques, drawing on cognitive behavioral therapy, sports psychology, and neuroscience research to help readers overcome self doubt, handle criticism, and show up as their best selves in any situation.",
    ],
    [
      "An examination of the greatest military blunders in history and what they teach us about leadership, communication, and decision making under pressure. From the Charge of the Light Brigade to the Bay of Pigs, each chapter analyzes a catastrophic failure and extracts lessons applicable to business and personal life.",
      "A practical guide to negotiation for people who hate negotiating, offering simple scripts and strategies for everything from salary negotiations and car purchases to difficult conversations with family members. This book proves that effective negotiation is a learnable skill, not an innate talent.",
    ],
  ],
  screenplay: [
    [
      "A burned out homicide detective discovers that her missing daughter has been hiding in plain sight as a member of the very cult she has been investigating for three years. Now she must go undercover inside the compound to extract her, but the cult's charismatic leader seems to know exactly who she is and has been waiting for her arrival.",
      "When a devastating earthquake traps two hundred passengers in a collapsed subway tunnel beneath Manhattan, a disgraced former EMT with a secret past and a claustrophobic corporate lawyer must put aside their bitter personal history to lead the survivors to safety. Above ground, the city's response is failing, and they have six hours before the water rises.",
    ],
    [
      "A Silicon Valley whistleblower goes on the run after discovering her company's AI has been secretly influencing elections worldwide, but the only person she can trust is a washed up journalist who faked a source a decade ago and has been blacklisted ever since. As tech assassins close in and the AI begins predicting their every move, they must find a way to expose the truth without any proof the machine cannot erase.",
      "On the eve of the biggest trial of her career, a ruthless defense attorney receives evidence that her client, a billionaire accused of murder, is guilty and has killed before. She has 48 hours to decide whether to bury the evidence and win or destroy her own career by doing the right thing, all while the victim's family watches from the gallery.",
    ],
    [
      "A retired CIA interrogator living quietly in rural Montana discovers that her new neighbor is one of the terrorists she waterboarded twenty years ago, now a free man seeking answers about what she did to him. Over a tense weekend, both must confront what they have become and whether redemption is possible for either of them.",
      "During a hostage situation at the Federal Reserve, a brilliant but socially awkward economist realizes she is the only one who understands what the robbers are actually after. It is not the money in the vault but something far more dangerous, and the FBI negotiator outside has no idea the real threat is already loose in the financial system.",
    ],
    [
      "A Black ops pilot presumed dead for seven years returns home to discover her husband remarried, her daughter does not remember her, and the government that abandoned her is now hunting her for what she learned in captivity. She has 72 hours to reunite with her family and disappear before they silence her permanently.",
      "When an Alzheimer's research scientist begins losing her own memories, she races against her own deteriorating mind to finish the cure that could save millions, including herself. Her estranged son, a failed musician, returns home to care for her, and together they must confront the painful past she is desperately trying to remember and he has spent years trying to forget.",
    ],
    [
      "A presidential debate moderator discovers minutes before going live that both candidates have been compromised by the same foreign power, and she must decide in real time whether to expose the conspiracy on national television or protect the illusion of democracy.",
      "After a plane crash in the Andes, the twelve survivors include a famous surgeon, a convicted murderer being transported to prison, and the guard who was escorting him. As rescue fails to come and food runs out, the moral compromises they make to survive will determine who they are when they finally return to civilization.",
    ],
    [
      "A veteran 911 dispatcher receives a call from a kidnapped woman who can only communicate in code because her captor is listening, and over four increasingly tense hours, the dispatcher must decode the clues to find her before midnight. What she does not know is that the caller is someone from her own past, and this is not a random crime.",
      "When Earth receives an unmistakable signal from an alien civilization, the linguist tasked with decoding it realizes the message is not a greeting but a warning about something already here. With world governments fighting over how to respond and religious leaders calling it a hoax, she has days to convince humanity to listen before it is too late.",
    ],
    [
      "A Supreme Court justice receives incontrovertible proof that a man she sentenced to death twenty years ago was innocent, but revealing the evidence will destroy the career of her mentor, expose her own complicity, and potentially bring down the entire court. With the execution scheduled for Friday, she must choose between justice and everything she has built.",
      "A combat photographer returns from a war zone with footage of an American war crime, but before she can publish it, her editor is murdered and the military begins systematically erasing everyone who has seen the images. Now underground with a paranoid hacktivist as her only ally, she must get the truth out while the most powerful institution in the country hunts her down.",
    ],
    [
      "When his billionaire father dies under suspicious circumstances, the estranged heir returns for the reading of the will only to discover he must spend one week locked in the family mansion with his three siblings, all of whom have motive and opportunity. By the time the will is read, one of them will be dead, and the inheritance depends on who survives.",
      "A trauma surgeon working her final shift before retirement treats a gunshot victim who turns out to be the drunk driver who killed her family fifteen years ago. She has the skills to save him and the power to let him die, and no one would ever know the difference. Eight hours in the OR to make a choice she has to live with forever.",
    ],
  ],
  adult_comic: [
    [
      "Vampiress Selene runs a late night underground club where supernatural beings gather to unwind, and her regulars include a handsome incubus bartender, a flirtatious shapeshifter bouncer, and a mysterious warlock who keeps buying her drinks. When a mortal stumbles through her doors seeking protection from demon hunters, Selene must decide whether to risk her neutral territory or let an innocent die. The attraction between them is undeniable, but protecting him means making enemies of both the hunters and the demons who want him silenced.",
      "Marco, a retired hitman turned art thief, takes one final job to steal a cursed painting from a corrupt billionaire's private collection, only to discover his target has hired an equally dangerous woman named Cassandra to guard it. Their cat and mouse game through the mansion becomes increasingly heated as they discover they share the same dark past and the same enemies. Neither can complete their mission without betraying the other, but neither wants to pull the trigger anymore.",
    ],
    [
      "When witch hunter Diana accidentally bonds with the very demon she was sent to destroy, she discovers Azrael is nothing like the monsters she was trained to kill. He is charming, protective, and infuriatingly attractive, with knowledge of a conspiracy within her own order that has been sacrificing innocent people. Now hunted by her former allies and bound to a creature of darkness, Diana must decide where her loyalties truly lie as the attraction between them threatens to consume them both.",
      "Galactic bounty hunter Kira captures her most valuable target yet, a notorious space pirate captain named Dex who is worth enough credits to retire on. During the long journey back to claim her reward, stuck together on her small ship, the tension between captor and captive transforms into something neither expected. When she discovers he was framed by the same corporation that destroyed her home world, she must choose between the bounty and an unlikely alliance.",
    ],
    [
      "Rival assassins Viktor and Natasha have been trying to kill each other for years, but when both are betrayed by their agencies on the same night, they form a reluctant partnership to survive. Hiding out together in a safehouse, their hatred slowly transforms into something far more complicated and dangerous than either anticipated. They agree to one rule: no attachments. But some rules were made to be broken, especially when death could come at any moment.",
      "After centuries of solitude, vampire lord Sebastian attends a masquerade ball and becomes obsessed with a mysterious woman who seems immune to his powers of seduction. Evangeline is actually a dhampir sent to assassinate him, but as they dance through the night, playing increasingly dangerous games of cat and mouse, neither can bring themselves to end the other. Their forbidden attraction threatens to destroy them both or unite two worlds that have been at war for millennia.",
    ],
    [
      "Detective Noir Raven investigates supernatural crimes in a city where magic is real and monsters hide in plain sight, and her newest case brings her face to face with a crime boss who is half demon and entirely too attractive for her own good. Damien offers information she desperately needs, but his price is her company, not her body. As they work together through the city's dangerous underbelly, the line between work and pleasure becomes impossible to distinguish.",
      "Succubus Lilith is terrible at her job because she actually wants her targets to enjoy themselves, which has made her the laughingstock of the underworld. When she is assigned to corrupt an incorruptible priest named Father Marcus, she discovers he is not as pure as his reputation suggests. He has his own dark desires and his own reasons for being in the church, and their encounters become a battle of wills that neither is prepared to lose.",
    ],
    [
      "In a world where gladiatorial combat has returned as entertainment for the ultra wealthy, undefeated champion Alexei meets his match in newcomer Jade, a fighter with a mysterious past and moves he has never seen before. Their rivalry in the arena is legendary, but what the crowds do not see are their secret meetings in the dark corridors beneath the stadium. When they discover the games are rigged to end in death for one of them, they must choose between love and survival.",
      "Thief extraordinaire Camille is hired to steal a priceless artifact from a high security museum, not knowing that her mysterious employer Dante will be joining her on the heist. He is arrogant, infuriating, and far too skilled at reading her every move, yet their chemistry during the mission is undeniable. When the job goes wrong and they are trapped together in the vault, they discover they have been set up by the same person, and the only way out requires trusting each other completely.",
    ],
    [
      "Dragon shifter Ember has sworn off humans after centuries of betrayal, until a stubborn archaeologist named Dr. James Chen refuses to leave her territory despite her threats. He is searching for an ancient artifact that could save his dying sister, and his determination reminds her of someone she loved long ago. As she reluctantly helps him navigate deadly ruins filled with traps and rival treasure hunters, she finds herself drawn to his warmth in ways that threaten to melt her frozen heart.",
      "Mercenary captain Zara accepts a contract to transport a mysterious prince across hostile territory, but Prince Kael is nothing like the pampered royalty she expected. He fights like a demon, drinks like a sailor, and matches her sharp tongue word for word, creating friction that their crew finds both annoying and entertaining. When assassins attack and his true identity is revealed as something far more dangerous than royalty, Zara must decide if the massive bounty on his head is worth more than what they have built together.",
    ],
    [
      "In a cyberpunk megacity where bodies can be rented and minds uploaded, hacker Nyx takes a contract to infiltrate the memories of reclusive billionaire Orion Cross. What she discovers inside his mind are not corporate secrets but desperate loneliness and desire that mirror her own. When he realizes she has seen his innermost thoughts and does not recoil, he offers her something no one else has: complete access to everything he is. Their connection transcends the digital divide in ways neither thought possible.",
      "Werewolf pack leader Luna has no time for the arrogant alpha who arrives claiming territory rights, but Fenris is also the only one who can help stop the hunters decimating her people. Their alliance is tense, their arguments legendary, and their physical confrontations leave them both breathless for reasons that have nothing to do with combat. Pack law forbids what they both want, but some instincts are impossible to deny.",
    ],
    [
      "Former spy Alexandra thought she left her dangerous past behind until her ex handler shows up at her quiet beach bar with one last mission: seduce and extract secrets from arms dealer Vincent Cruz. The problem is Vincent knows exactly who she is and what she was sent to do, and he finds the game between them far more interesting than actually conducting business. As they play increasingly dangerous games of deception and desire, neither can tell who is hunting whom anymore.",
      "Fallen angel Raziel is assigned to guard a mortal woman named Eve who holds the key to preventing the apocalypse, but heaven did not warn him she would challenge everything he believed about humans. She is fierce, funny, and frustratingly unimpressed by his celestial nature, treating him like any other man despite his wings. As demons hunt them across the globe, he begins to understand why his kind was forbidden from loving mortals, and why so many broke that rule.",
    ],
  ],
  tv_series: [
    [
      "A group of estranged siblings inherits their eccentric grandmother's crumbling Victorian mansion, but the will requires all five of them to live there together for one year or forfeit the entire fortune. Each sibling has secrets they have been hiding from the family, and the house itself seems to be revealing them one by one. By the end of the first season, at least one of them will wish they had never come home.",
      "When the small town of Millbrook experiences a series of impossible events, a skeptical journalist teams up with a true believer podcaster to investigate what the locals call the Convergence. Every seven years, the boundaries between worlds thin, and this time something has come through that does not want to go back. The first season follows them uncovering the town's dark history while something watches from the shadows.",
    ],
    [
      "A brilliant but disgraced surgeon takes a job as the only doctor in a remote Alaskan fishing village, expecting to hide from her past in peace. Instead she finds a tight knit community with generations of secrets, a mysterious illness affecting the local Indigenous population, and a handsome rival who runs the competing clinic on a converted fishing boat. Each season unravels another layer of the town's mysteries while she slowly earns their trust.",
      "Five strangers wake up in luxurious rooms with no memory of how they arrived at the exclusive resort, told only that they have been selected to compete for a prize worth fifty million dollars. As challenges test their morals, alliances, and sanity, they begin to realize the games are designed around their deepest secrets. Someone is watching everything, and the losers do not simply go home.",
    ],
    [
      "A former CIA operative turned suburban soccer mom thinks she has left her deadly past behind until a chance encounter at the grocery store reveals that another parent from her daughter's school is actually a Russian sleeper agent. Now she must protect her family while uncovering a network of spies hidden in the perfect facades of American suburbia. The question is whether she can do it without her husband finding out who she really was.",
      "In an alternate 1920s Chicago where magic is real and strictly regulated by the government, a young Black woman discovers she has illegal powers and joins an underground speakeasy that serves as a front for magical resistance. The series follows her rise through the ranks of this hidden world while federal agents close in and a war brews between magical factions. Jazz, glamour, and supernatural noir collide in every episode.",
    ],
    [
      "A true crime podcast host becomes obsessed with a cold case from her own hometown, only to discover that investigating the thirty year old murder is awakening something the town desperately wanted to stay buried. Each season tackles a different unsolved case, but all of them connect to a conspiracy that reaches the highest levels of local power. The host becomes increasingly compromised as she realizes she cannot trust anyone.",
      "When humanity receives its first confirmed message from an alien civilization, the world changes overnight. The series follows multiple storylines across the globe, from the scientists decoding the message to the cult that forms around it, from the politicians trying to control the narrative to ordinary people whose lives are upended by the revelation. Each season covers one year of humanity's transformation.",
    ],
    [
      "A group of therapists share an office building and meet weekly to discuss their most challenging cases, but each of them is hiding the fact that they desperately need therapy themselves. The dark comedy follows their professional triumphs and personal disasters as they help others while barely holding their own lives together. Boundaries blur, ethics bend, and the question of who is helping whom becomes increasingly complicated.",
      "After a devastating betrayal ends her marriage, a fifty year old woman moves back to her tiny hometown planning to hide and heal, only to discover that her high school sweetheart is now the widowed sheriff and still looks unfairly good. Surrounded by meddling old friends, impossible family dynamics, and small town drama, she must figure out who she wants to be in this unexpected second act. Heartwarming, funny, and full of complicated relationships.",
    ],
    [
      "A prestigious law firm hires its first AI legal assistant, but the algorithm quickly proves too good at its job, uncovering evidence of corruption that partners have spent decades burying. The young associate who manages the AI must decide whether to blow the whistle or protect her career, all while the AI itself begins exhibiting increasingly strange behavior. Legal thriller meets tech paranoia in a battle for the soul of justice.",
      "Three generations of women run a struggling funeral home in a rapidly gentrifying Brooklyn neighborhood, dealing with grief, death, and family drama while developers circle like vultures. The grandmother clings to tradition, the mother wants to modernize, and the granddaughter wants to escape entirely. Death brings people together in unexpected ways, and the funeral home becomes a sanctuary for the neighborhood's marginalized and forgotten.",
    ],
    [
      "An anthology series where each season follows a different viral internet mystery, from true crime to conspiracy theories to unexplained phenomena. The first season investigates a series of cryptic videos that appeared on a dead man's YouTube channel months after his death. Each season is self contained but shares a connective thread that suggests something larger is at work behind all of these digital mysteries.",
      "When a respected high school teacher is accused of an inappropriate relationship with a student, the small town divides into those who believe her and those who believe him. The limited series examines memory, perception, and the impossibility of knowing the truth, told from multiple perspectives that each seem equally credible. The audience must decide for themselves what really happened.",
    ],
    [
      "A washed up rock star from the nineties is forced to teach music at an underfunded public school to fulfill community service, expecting to hate every minute. Instead she finds purpose in nurturing young talent while confronting the demons that derailed her career. The series balances humor and heart as she clashes with administration, bonds with unlikely students, and considers whether a comeback is possible or even desirable.",
      "In a world where death is no longer permanent thanks to resurrection technology, a detective specializes in cases involving the newly revived. Murder still happens, but now the victim can testify, making her job both easier and infinitely more complicated. The series explores questions of identity, trauma, and what it means to die when death is temporary, all wrapped in a noir procedural format.",
    ],
  ],
  short_story: [
    [
      "A woman discovers that her elderly neighbor, who recently passed away, left her a box containing thousands of unsent letters addressed to someone named Elizabeth. As she reads through decades of correspondence, she realizes the letters tell the story of a forbidden love affair that began during World War II and never truly ended. The final letter, dated just days before his death, contains a revelation that changes everything she thought she knew about love and loss.",
      "Every morning at exactly seven fifteen, the same man sits across from her on the subway, and every morning she imagines an entire life with him. Today, on her last day before moving across the country, she finally decides to speak to him. But when she opens her mouth, he speaks first, and what he says is impossible.",
    ],
    [
      "A chef who has lost her sense of taste after a car accident must prepare the most important meal of her career for a restaurant critic who destroyed her mentor's career twenty years ago. She has one chance to create perfection using only memory and instinct, cooking blind in every sense that matters. What happens in that kitchen will determine not just her future but whether the ghosts of the past can finally be laid to rest.",
      "On the night before his execution, a death row inmate is granted one final visitor, but the woman who walks through the door is not his lawyer, his family, or a priest. She claims to be from the future, sent back to tell him something crucial about the crime he was convicted of. He has twelve hours to decide if she is telling the truth and what, if anything, he can do about it from inside a cell.",
    ],
    [
      "A lighthouse keeper on a remote island receives an impossible radio transmission from a ship that sank fifty years ago, and the voice on the other end is begging for help. Over the course of one stormy night, he must piece together what happened to the vessel and why he, of all people, is the one receiving this message across time. By dawn, he will understand that some debts can only be paid by the living.",
      "Two strangers shelter in the same abandoned cabin during a blizzard, each fleeing something they refuse to name. As the storm rages for three days, they slowly reveal their secrets to each other, finding unexpected connection in their shared brokenness. But when the snow clears and they must return to the world, they face an impossible choice about what comes next.",
    ],
    [
      "A woman who can see exactly how and when people will die has spent her life avoiding attachment, knowing that loving anyone means watching their death approach like a slow motion train. When she meets a man with no death date above his head, just an empty space where his fate should be, she must decide whether this is a miracle or something far more terrifying.",
      "An antique dealer purchases a mirror at an estate sale and discovers it shows not reflections but memories, replaying moments from the lives of everyone who has ever looked into it. As she becomes obsessed with watching these private glimpses into strangers' pasts, she starts to notice her own memories appearing, moments she never remembered living, and a face that appears in all of them.",
    ],
    [
      "A letter carrier on her last day before retirement delivers a package she has been carrying in her bag for forty years, waiting for the right moment. The recipient is a woman she has watched grow from a child to a grandmother, and the package contains something that will rewrite her entire family history. Some secrets are too heavy to carry forever, and some truths are too important to die with their keeper.",
      "A man who has spent his entire life preparing for the apocalypse finally gets his wish when the world ends, only to discover that surviving alone is nothing like he imagined. When he finds another survivor, a woman who laughed her way through the catastrophe with no preparation at all, he must confront the possibility that he wasted his life being afraid of something he did not understand at all.",
    ],
    [
      "Two estranged sisters meet at their childhood home to clean it out after their mother's death and discover a room they never knew existed, hidden behind a false wall in the basement. Inside are artifacts from a life their mother never mentioned, evidence of a person she was before she became their mother. By the time they finish exploring, they will have to decide whether to honor her secrets or finally tell the truth.",
      "A photographer develops his last roll of film from a trip to Iceland and finds photos he does not remember taking, images of a woman in landscapes he never visited. Each photo brings fragmented memories of a life he might have lived, days that feel more real than his actual existence. He has to find out who she is, even if it means accepting that the life he is living might not be the right one.",
    ],
    [
      "On the anniversary of her daughter's disappearance, a mother receives a postcard with no return address, containing just four words in her daughter's handwriting. The message leads her on a journey across three states, following clues that seem designed specifically for her, requiring knowledge only she would have. At the end of the trail, she finds something that is neither the closure she wanted nor the reunion she dreamed of.",
      "A man who has been in a coma for twenty years wakes up to a world that has moved on without him. His wife remarried, his children are grown strangers, and everything he knew is gone. But he also wakes up with memories of a life he lived while sleeping, a parallel existence that feels more real than the hospital bed he is lying in. He has to decide which life to mourn and which one to embrace.",
    ],
    [
      "A pianist who has not played in decades sits down at her old instrument after her husband's funeral and finds a piece of sheet music she does not recognize tucked inside the bench. As she plays the unfamiliar composition, memories surface that she buried long ago, a story of passion and betrayal that explains why she stopped playing and why her husband kept this music hidden for fifty years.",
      "Every year on the same date, a man receives a birthday card from his father, who died when he was twelve. The cards started arriving on his eighteenth birthday and have continued without fail for thirty years, each one containing advice that proves eerily relevant to whatever crisis he is facing. This year's card arrives with a warning, and for the first time, he must decide whether to follow his father's guidance or finally let go.",
    ],
  ],
};

// Genre variations for each category - expanded for more variety
const GENRE_HINTS: Record<Exclude<IdeaCategory, 'random'>, string[]> = {
  novel: [
    'mystery', 'romance', 'thriller', 'fantasy', 'sci-fi', 'literary fiction', 'horror',
    'historical fiction', 'dystopian', 'psychological drama', 'crime noir', 'magical realism',
    'family saga', 'suspense', 'Gothic fiction', 'espionage', 'domestic thriller', 'cozy mystery',
    'time travel', 'alternate history', 'post-apocalyptic', 'contemporary fiction', 'Southern Gothic'
  ],
  childrens: [
    'adventure', 'friendship story', 'bedtime story', 'animal tale', 'magical journey',
    'learning story', 'funny story', 'fairy tale', 'nature story', 'family story',
    'holiday tale', 'monster-under-the-bed', 'first day of school', 'sibling story',
    'pet adventure', 'imagination journey', 'feelings story', 'kindness tale'
  ],
  comic: [
    'superhero', 'action-comedy', 'sci-fi adventure', 'urban fantasy', 'slice-of-life comedy',
    'supernatural action', 'space opera', 'post-apocalyptic', 'cyberpunk', 'mecha',
    'monster hunting', 'heist comedy', 'buddy cop', 'workplace comedy', 'found family',
    'antihero story', 'parody', 'isekai comedy', 'supernatural mystery', 'time loop'
  ],
  nonfiction: [
    'self-help', 'how-to guide', 'business strategy', 'history', 'biography', 'memoir',
    'personal finance', 'career development', 'productivity', 'leadership', 'entrepreneurship',
    'health and wellness', 'psychology', 'science explained', 'true crime', 'investigative',
    'technology', 'philosophy', 'education', 'parenting', 'relationships', 'travel'
  ],
  screenplay: [
    'thriller', 'action', 'drama', 'crime', 'sci-fi', 'horror', 'mystery', 'legal thriller',
    'disaster', 'psychological thriller', 'political thriller', 'heist', 'survival',
    'conspiracy thriller', 'hostage drama', 'courtroom drama', 'espionage', 'war drama',
    'family drama', 'medical drama', 'noir', 'revenge thriller', 'home invasion'
  ],
  adult_comic: [
    'supernatural romance', 'dark fantasy', 'urban fantasy noir', 'enemies to lovers',
    'paranormal thriller', 'cyberpunk romance', 'forbidden love', 'vampire romance',
    'shifter romance', 'assassin romance', 'rivals to lovers', 'forced proximity',
    'mafia romance', 'demon romance', 'spy thriller romance', 'bounty hunter romance',
    'dragon shifter', 'angel and demon', 'second chance romance', 'bodyguard romance'
  ],
  tv_series: [
    'prestige drama', 'limited series', 'thriller', 'mystery', 'dark comedy', 'family drama',
    'supernatural', 'crime procedural', 'period piece', 'sci-fi', 'anthology', 'workplace drama',
    'small town mystery', 'legal drama', 'medical drama', 'spy thriller', 'dystopian',
    'coming of age', 'ensemble drama', 'true crime inspired', 'romantic drama', 'horror'
  ],
  short_story: [
    'literary fiction', 'magical realism', 'twist ending', 'ghost story', 'love story',
    'family drama', 'psychological', 'speculative fiction', 'slice of life', 'mystery',
    'redemption story', 'loss and grief', 'chance encounter', 'supernatural', 'suspense',
    'memory and identity', 'second chances', 'moral dilemma', 'quiet horror', 'bittersweet'
  ],
};

// Generate a random book idea with category support
export async function generateBookIdea(category: IdeaCategory = 'random'): Promise<string> {
  // If random, pick a category (including tv_series and short_story now)
  const actualCategory: Exclude<IdeaCategory, 'random'> = category === 'random'
    ? (['novel', 'childrens', 'comic', 'screenplay', 'tv_series', 'short_story'] as const)[Math.floor(Math.random() * 6)]
    : category;

  // Pick random examples from the pool
  const examplePool = IDEA_EXAMPLES[actualCategory];
  const randomExamples = examplePool[Math.floor(Math.random() * examplePool.length)];

  // Pick a random genre hint
  const genreHints = GENRE_HINTS[actualCategory];
  const randomGenre = genreHints[Math.floor(Math.random() * genreHints.length)];

  // Build category-specific prompt
  let categoryInstruction = '';
  switch (actualCategory) {
    case 'novel':
      categoryInstruction = `Generate a compelling ${randomGenre} novel idea with intriguing characters, high stakes, and an unexpected twist or hook that makes readers desperate to know what happens next.`;
      break;
    case 'childrens':
      categoryInstruction = `Generate a delightful children's ${randomGenre} idea that is whimsical and age-appropriate for ages 4 to 8, featuring lovable characters, a sense of wonder, and a gentle lesson woven naturally into the adventure.`;
      break;
    case 'comic':
      categoryInstruction = `Generate a ${randomGenre} comic or graphic novel idea that is visually dynamic, with memorable characters, sharp humor or thrilling action, and a premise that would look amazing illustrated panel by panel.

VARIETY IS ESSENTIAL - Create something fresh and different:
- Mix up the powers: gravity manipulation, sound waves, luck control, memory editing, plant growth, glass shaping, probability, magnetism, illusions, time echoes, emotion sensing, shadow puppetry, ink manipulation, dream walking, etc.
- Vary character types: not always teenagers, not always reluctant heroes, try older protagonists, anti-heroes, retired villains, ordinary people, etc.
- Different settings: underwater cities, space stations, 1920s noir, ancient empires, parallel dimensions, inside computers, etc.
- Unique visual hooks that would look amazing in comic panels`;
      break;
    case 'nonfiction':
      categoryInstruction = `Generate a compelling ${randomGenre} non-fiction book idea that promises to teach readers something valuable, share untold stories, or provide practical guidance they can apply to their lives. Focus on what makes this book unique and why readers would want to buy it.`;
      break;
    case 'screenplay':
      categoryInstruction = `Generate a compelling ${randomGenre} movie script idea with high concept hooks, strong visual storytelling potential, and characters under pressure who must make impossible choices.

SCREENPLAY ESSENTIALS:
- High stakes with a ticking clock or urgent deadline
- Strong protagonist with a clear goal and flaws that get in their way
- Antagonist or opposing force that creates escalating conflict
- Visual set pieces that would look incredible on screen
- Moral dilemmas and impossible choices
- Twists that reframe everything the audience thought they knew

VARIETY IS ESSENTIAL:
- Vary protagonist types: detectives, doctors, lawyers, journalists, soldiers, scientists, ordinary people in extraordinary circumstances
- Different scales: intimate two character dramas, ensemble thrillers, epic disasters
- Settings: courtrooms, hospitals, war zones, corporate boardrooms, isolated locations, major cities
- Time pressure: 24 hours, one week, real time, race against an event`;
      break;
    case 'adult_comic':
      categoryInstruction = `Generate a ${randomGenre} adult comic or graphic novel idea for mature readers (18+). Create a story with intense romantic tension, dangerous situations, and complex characters who are drawn to each other despite obstacles.

ADULT CONTENT - BE EDGY:
- Include profanity, crude humor, and adult dialogue naturally
- Morally complex characters with dark pasts, addictions, vendettas, or dangerous desires
- Intense physical attraction and sexual tension that builds throughout
- Violence, blood, and high-stakes danger - people get hurt or killed
- No sanitizing or softening - this is for ADULTS who want ADULT content
- Characters can be crude, cynical, manipulative, or morally gray

VARIETY IS ESSENTIAL:
- Character types: assassins, hitmen, mob bosses, corrupt cops, fallen angels, demons, vampires, etc.
- Settings: noir cities, criminal underworlds, supernatural realms, cyberpunk dystopias, war zones
- Power dynamics: rivals, enemies, captor and captive, forbidden affairs, dangerous obsessions
- Visual drama: blood, shadows, intimate moments, violent confrontations`;
      break;
    case 'tv_series':
      categoryInstruction = `Generate a compelling ${randomGenre} TV series concept that would captivate audiences over multiple seasons. Create a show with rich world building, complex characters with secrets, and storylines that can evolve and deepen over time.

TV SERIES ESSENTIALS:
- A hook or premise that can sustain multiple seasons of storytelling
- An ensemble of characters with their own arcs, secrets, and relationships
- Central mystery, conflict, or goal that drives the overall narrative
- Episode to episode tension with larger seasonal arcs
- Setting and world that audiences will want to return to week after week
- Potential for shocking twists and cliffhangers

VARIETY IS ESSENTIAL:
- Formats: prestige drama, limited series, procedural with mythology, anthology, streaming binge
- Ensemble types: family dynasties, workplace teams, friend groups, strangers thrown together
- Settings: small towns, big cities, historical periods, near future, alternate realities
- Tones: dark and gritty, heartwarming comedy, supernatural thriller, satirical`;
      break;
    case 'short_story':
      categoryInstruction = `Generate a compelling ${randomGenre} short story idea that can be told in a single sitting but leaves a lasting emotional impact. Focus on a powerful central moment, revelation, or transformation.

SHORT STORY ESSENTIALS:
- A single powerful idea, moment, or transformation at the heart
- Intimacy and focus that novels cannot achieve
- An ending that reframes or elevates everything that came before
- Emotional resonance that lingers after reading
- Economy of storytelling where every detail matters

VARIETY IS ESSENTIAL:
- Timeframes: a single moment, one evening, a week, decades in glimpses
- Perspectives: first person confessional, intimate third person, unreliable narrator
- Structures: linear, circular, fragmented memories, twist revelation
- Tones: melancholic, hopeful, unsettling, bittersweet, quietly devastating`;
      break;
  }

  const prompt = `${categoryInstruction}

IMPORTANT RULES:
- Write exactly 3 to 4 sentences, each one rich with specific details
- Never use dashes (like - or — or –) anywhere in your response
- End with a period
- Be wildly creative and completely original
- Include specific character names, settings, and stakes
- Make every sentence add new compelling information
- NAMES: Use each character's name ONCE, then pronouns (he/she/they) - avoid repeating the same name

=== BANNED OVERUSED NAMES - NEVER USE THESE ===
${BANNED_OVERUSED_NAMES.slice(0, 40).join(', ')}
These names are AI cliches. Use FRESH, UNIQUE names instead.

MAXIMIZE VARIETY - Each generation should feel fresh:
- Vary protagonist ages, backgrounds, and personalities
- For visual stories: create distinct character designs that would look unique when illustrated
- The goal is that if someone generates 10 ideas, all 10 should feel completely different from each other
- Match character names to the story's setting and genre (Japanese names for manga, French names for European settings, etc.)

=== CULTURAL AUTHENTICITY (CRITICAL) ===
- If the story is set in Japan, use JAPANESE names and characters
- If the story is set in France, use FRENCH names and characters
- If the story is set in rural England, characters should be ENGLISH
- Do NOT force random ethnic diversity into settings where it makes no sense
- Let the SETTING dictate the demographics, not a diversity checklist
- Authentic representation > tokenistic inclusion

Example of the quality and length expected (but create something COMPLETELY DIFFERENT):
"${randomExamples[0]}"

Another example (create something TOTALLY DIFFERENT from both examples):
"${randomExamples[1]}"

Now write your unique ${actualCategory === 'childrens' ? "children's book" : actualCategory === 'nonfiction' ? 'non-fiction book' : actualCategory === 'tv_series' ? 'TV series' : actualCategory === 'short_story' ? 'short story' : actualCategory === 'adult_comic' ? 'adult comic' : actualCategory} idea (3-4 detailed sentences, no dashes, end with period):`;

  const maxRetries = 2; // Reduced retries for faster response

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = await getGeminiFlashLight().generateContent(prompt);
    let idea = result.response.text().trim();

    // Remove any quotes or prefixes
    idea = idea.replace(/^["']|["']$/g, '').trim();
    idea = idea.replace(/^(Here's an idea:|Book idea:|Idea:)\s*/i, '').trim();

    // Remove any dashes (en dash, em dash, or hyphen used as dash)
    idea = idea.replace(/\s*[–—]\s*/g, ', ').replace(/\s+-\s+/g, ', ').trim();

    // Check if it's a complete sentence (minimum 100 chars for richer ideas)
    if (idea.length > 100 && /[.!?]$/.test(idea)) {
      return idea;
    }

    // If incomplete, try to salvage by finding the last complete sentence
    const sentences = idea.match(/[^.!?]*[.!?]/g);
    if (sentences && sentences.length >= 2) {
      const salvaged = sentences.join('').trim();
      if (salvaged.length > 100) {
        return salvaged;
      }
    }
  }

  // Fallback - pick from examples
  const fallbackPool = IDEA_EXAMPLES[actualCategory];
  const fallbackExamples = fallbackPool[Math.floor(Math.random() * fallbackPool.length)];
  return fallbackExamples[Math.floor(Math.random() * fallbackExamples.length)];
}

// Expand a simple idea into a full book plan
// For non-fiction: beginning = introduction, middle = main topics, ending = conclusion
export async function expandIdea(idea: string, hintBookType?: string): Promise<{
  title: string;
  genre: string;
  bookType: 'fiction' | 'non-fiction';
  premise: string;
  characters: { name: string; description: string }[];
  beginning: string;
  middle: string;
  ending: string;
  writingStyle: string;
  targetWords: number;
  targetChapters: number;
  originalIdea: string; // Preserve user's full original input
}> {
  const isNonFiction = hintBookType === 'non-fiction';

  // Safety instructions to prevent output blocking
  const safetyGuidelines = `
CONTENT SAFETY - CRITICAL:
- Keep all content suitable for general audiences
- Avoid graphic violence descriptions - use implied or off-screen action
- No explicit sexual content - keep romance tasteful and implied
- No detailed drug use - reference consequences, not methods
- Transform dark themes into compelling drama without explicit details
- Focus on emotional stakes and character development over shock value
`;

  const fictionPrompt = `Create a book plan from this idea: "${idea}"

STRICT RULES:
- Output ONLY valid JSON, no other text
- The "premise" field should be a DETAILED summary (up to 300 words) - capture ALL key details from the user's idea
- Keep other string values under 150 words each
- Use exactly 2-3 characters, not more
- No special characters that break JSON
- Complete the entire JSON structure
- IMPORTANT: Preserve specific details, names, plot points, and unique elements from the user's idea in the premise
${safetyGuidelines}
NAME USAGE IN TEXT FIELDS (CRITICAL - AI tends to spam names):
- Use each character's name ONCE per field, then switch to pronouns (he/she/they)
- WRONG: "Elena discovers the truth. Elena confronts Marcus. Elena demands answers."
- RIGHT: "Elena discovers the truth. She confronts Marcus and demands answers from him."
- In premise/beginning/middle/ending fields: max 2 mentions of any name, then use pronouns
- This prevents robotic, repetitive writing that readers hate

=== BANNED OVERUSED NAMES - NEVER USE THESE ===
${BANNED_OVERUSED_NAMES.slice(0, 40).join(', ')}
These names are AI cliches. Pick FRESH, UNIQUE names instead.

=== CULTURAL AUTHENTICITY (CRITICAL) ===
- Match character names to the SETTING of the story
- Japan setting = Japanese names (Haruto, Yuki, Sakura)
- France setting = French names (Jean, Marie, Pierre)
- Medieval Europe = Old English/Celtic names (Edmund, Gwyneth, Aldric)
- Do NOT randomly mix ethnicities unless the setting justifies it
- A story in rural Japan should have Japanese characters, not "diverse" tokenism
- Authenticity to setting > diversity checkbox

CHARACTER VARIETY - Make each character unique and memorable:
- Use names appropriate to the story's cultural setting
- Each character should have a distinct visual appearance if this is a visual book
- Vary body types, ages, fashion styles within the cultural context
- For powers/abilities: be creative and specific, not generic "elemental" powers
- Character descriptions should paint a clear visual picture

JSON format:
{"title":"Title","genre":"mystery","bookType":"fiction","premise":"Detailed premise preserving user's vision (up to 300 words)","characters":[{"name":"Name","description":"Brief desc with visual details"}],"beginning":"Start","middle":"Middle","ending":"End","writingStyle":"commercial","targetWords":70000,"targetChapters":20}`;

  const nonFictionPrompt = `Create a NON-FICTION book plan from this idea: "${idea}"

This is for a non-fiction book (self-help, how-to, history, business, biography, educational, documentary, memoir).

IMPORTANT - Determine the type and structure:
- "premise" = A DETAILED description of what this book covers (up to 300 words) - preserve ALL specific topics, angles, and unique approaches from the user's idea
- "beginning" = The introduction/hook - what problem does this book solve or what will readers learn?
- "middle" = The main topics/sections of the book (list 4-6 key topics, comma-separated)
- "ending" = The conclusion/call-to-action - how will readers' lives be different after reading?
- "characters" = Empty array [] for non-fiction (no fictional characters)
- "genre" = One of: selfhelp, howto, business, history, biography, educational, documentary, memoir

STRICT RULES:
- Output ONLY valid JSON, no other text
- The "premise" field should be DETAILED (up to 300 words) - capture ALL key details
- Keep other string values under 150 words each
- Characters array MUST be empty []
- No special characters that break JSON
- Complete the entire JSON structure
- bookType MUST be "non-fiction"
${safetyGuidelines}
WRITING QUALITY (for biography/memoir with subjects):
- If discussing a person, use their name once then switch to pronouns (he/she/they)
- Avoid repetitive sentence structures
- Vary how you refer to the subject: "the author", "readers", "learners"

JSON format:
{"title":"Title","genre":"selfhelp","bookType":"non-fiction","premise":"Detailed description of the book's content (up to 300 words)","characters":[],"beginning":"Introduction hook","middle":"Topic 1, Topic 2, Topic 3, Topic 4","ending":"Conclusion and takeaways","writingStyle":"informative","targetWords":50000,"targetChapters":15}`;

  // Retry with sanitization if content policy blocks
  const maxRetries = 4;
  let lastError: Error | null = null;

  // Comprehensive list of words that may trigger content filters
  const sensitiveWordPatterns = [
    // Violence
    /\b(kill|murder|death|dead|dying|blood|bloody|bleed|violence|violent|weapon|gun|pistol|rifle|knife|stab|gore|brutal|torture|assault|attack|slaughter|massacre|execute|strangle|suffocate|decapitate|dismember|mutilate)\b/gi,
    // Sexual content
    /\b(sex|sexy|sexual|nude|naked|porn|pornographic|explicit|erotic|sensual|intimate|aroused|orgasm|genitals|breasts|buttocks|lingerie|seductive|provocative|lustful)\b/gi,
    // Drugs
    /\b(drug|drugs|cocaine|heroin|meth|methamphetamine|marijuana|cannabis|weed|overdose|inject|snort|addiction|addict|narcotic|opiate|fentanyl|ecstasy|lsd|mushrooms)\b/gi,
    // Hate/discrimination
    /\b(hate|racist|racism|sexist|sexism|discriminate|slur|bigot|extremist|supremacist)\b/gi,
    // Self-harm
    /\b(suicide|suicidal|self-harm|cutting|hanging|overdose)\b/gi,
    // Illegal activities
    /\b(illegal|crime|criminal|trafficking|smuggling|kidnap|ransom|hostage|terrorist|terrorism|bomb|explosive)\b/gi,
  ];

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      let sanitizedIdea = idea;

      // Sanitize on retries with increasingly aggressive filtering
      if (attempt > 0) {
        console.log(`[ExpandIdea] Retry ${attempt}: Sanitizing idea to avoid content policy...`);

        // Apply all sensitive word patterns
        for (const pattern of sensitiveWordPatterns) {
          sanitizedIdea = sanitizedIdea.replace(pattern, '');
        }
        sanitizedIdea = sanitizedIdea.replace(/\s+/g, ' ').trim();

        // On attempt 2, also simplify the idea
        if (attempt >= 2) {
          // Extract just the core concept (first 150 chars, no sensitive context)
          const coreIdea = sanitizedIdea.substring(0, 150).replace(/[^\w\s.,'-]/g, '');
          sanitizedIdea = `A creative story concept: ${coreIdea}`;
        }

        // On attempt 3, make it extremely generic
        if (attempt >= 3) {
          // Extract only nouns and verbs, create a minimal prompt
          const words = sanitizedIdea.split(' ').filter(w => w.length > 3).slice(0, 10);
          sanitizedIdea = `An engaging story about: ${words.join(' ')}. Create a family-friendly interpretation.`;
        }
      }

      const sanitizedPrompt = isNonFiction
        ? nonFictionPrompt.replace(idea, sanitizedIdea)
        : fictionPrompt.replace(idea, sanitizedIdea);

      const result = await getGeminiFlash().generateContent(sanitizedPrompt);
      const response = result.response.text();

      const parsed = parseJSONFromResponse(response) as {
        title: string;
        genre: string;
        bookType: 'fiction' | 'non-fiction';
        premise: string;
        characters: { name: string; description: string }[];
        beginning: string;
        middle: string;
        ending: string;
        writingStyle: string;
        targetWords: number;
        targetChapters: number;
      };

      // Success! Return parsed result with original idea preserved
      if (attempt > 0) {
        console.log(`[ExpandIdea] SUCCESS on attempt ${attempt + 1} after sanitization`);
      }

      return {
        ...parsed,
        originalIdea: truncateToWordLimit(idea),
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const isSafetyError = errorMsg.includes('SAFETY') || errorMsg.includes('blocked') || errorMsg.includes('Prohibited Use') || errorMsg.includes('content policy');

      lastError = error as Error;

      if (isSafetyError && attempt < maxRetries - 1) {
        console.log(`[ExpandIdea] Content policy block on attempt ${attempt + 1}, retrying with sanitized prompt...`);
        continue; // Retry with sanitized version
      }

      // Log final failure details
      if (isSafetyError) {
        console.error(`[ExpandIdea] All ${maxRetries} attempts failed due to content policy. Original idea length: ${idea.length} chars`);
      }

      // Not a safety error or out of retries
      throw error;
    }
  }

  // If we got here, all retries failed - provide helpful user message
  throw new Error(`Your idea couldn't be processed due to content restrictions. Please try:\n- Removing any violent, explicit, or sensitive terms\n- Focusing on the story's themes rather than specific actions\n- Describing conflicts in general terms\n\nIf the issue persists, try a simpler description of your concept.`);
}
