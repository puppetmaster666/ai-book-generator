/**
 * Name Generator - Provides culturally appropriate names based on region, ethnicity, and era.
 * Used to help AI select authentic character names rather than defaulting to overused Western names.
 */

export type Gender = 'male' | 'female' | 'neutral';
export type Era = 'ancient' | 'medieval' | 'victorian' | 'modern' | 'futuristic';

export interface NamePool {
  region: string;
  ethnicities: string[];
  male: string[];
  female: string[];
  neutral: string[];
  surnames: string[];
  // Optional era-specific names
  medieval?: { male: string[]; female: string[] };
  ancient?: { male: string[]; female: string[] };
}

// ============================================================================
// Name Database by Region/Culture
// ============================================================================

const NAME_POOLS: NamePool[] = [
  // === EAST ASIA ===
  {
    region: 'Japan',
    ethnicities: ['Japanese', 'Asian'],
    male: [
      'Haruto', 'Yuto', 'Sota', 'Ren', 'Kaito', 'Asahi', 'Minato', 'Riku',
      'Hiroto', 'Yuki', 'Takumi', 'Kazuki', 'Ryota', 'Kenta', 'Shota',
      'Daiki', 'Kenji', 'Tatsuya', 'Naoki', 'Shinji', 'Akira', 'Hideo',
      'Masaru', 'Noboru', 'Taro', 'Ichiro', 'Jiro', 'Saburo', 'Goro',
      'Koichi', 'Daisuke', 'Ryuji', 'Makoto', 'Yuichi', 'Kenichi'
    ],
    female: [
      'Yui', 'Hina', 'Aoi', 'Himari', 'Mei', 'Rin', 'Mio', 'Ichika',
      'Sakura', 'Akari', 'Yuna', 'Koharu', 'Hana', 'Emma', 'Sara',
      'Misaki', 'Ayaka', 'Nanami', 'Haruka', 'Yuki', 'Kaori', 'Emi',
      'Mariko', 'Keiko', 'Tomoko', 'Michiko', 'Noriko', 'Yoko', 'Reiko',
      'Chiyo', 'Fumiko', 'Hanako', 'Kiyoko', 'Masako', 'Setsuko'
    ],
    neutral: ['Akira', 'Hikaru', 'Makoto', 'Nao', 'Rei', 'Sora', 'Yuki', 'Kaoru', 'Haru', 'Shinobu'],
    surnames: [
      'Tanaka', 'Yamamoto', 'Watanabe', 'Suzuki', 'Takahashi', 'Sato', 'Ito',
      'Nakamura', 'Kobayashi', 'Kato', 'Yoshida', 'Yamada', 'Sasaki', 'Yamaguchi',
      'Matsumoto', 'Inoue', 'Kimura', 'Hayashi', 'Shimizu', 'Yamazaki'
    ]
  },
  {
    region: 'China',
    ethnicities: ['Chinese', 'Asian'],
    male: [
      'Wei', 'Fang', 'Lei', 'Jun', 'Ming', 'Chen', 'Hui', 'Jian',
      'Liang', 'Tao', 'Xiang', 'Yong', 'Zhi', 'Bo', 'Cheng', 'Dong',
      'Feng', 'Gang', 'Hao', 'Jie', 'Kai', 'Long', 'Peng', 'Qiang',
      'Rui', 'Shan', 'Tian', 'Wen', 'Xin', 'Yang', 'Zheng', 'Zhen'
    ],
    female: [
      'Mei', 'Lin', 'Xia', 'Yan', 'Jing', 'Ying', 'Fei', 'Hong',
      'Hui', 'Juan', 'Lan', 'Li', 'Na', 'Ping', 'Qin', 'Rong',
      'Shan', 'Ting', 'Wei', 'Xue', 'Yun', 'Zhen', 'Ai', 'Bao',
      'Chun', 'Dan', 'Fang', 'Hua', 'Jia', 'Lian', 'Min', 'Ning'
    ],
    neutral: ['Xiao', 'Yu', 'Qi', 'An', 'Bai', 'Chen', 'Lin', 'Ming'],
    surnames: [
      'Wang', 'Li', 'Zhang', 'Liu', 'Chen', 'Yang', 'Huang', 'Zhao',
      'Wu', 'Zhou', 'Xu', 'Sun', 'Ma', 'Zhu', 'Hu', 'Guo',
      'Lin', 'He', 'Gao', 'Luo'
    ]
  },
  {
    region: 'Korea',
    ethnicities: ['Korean', 'Asian'],
    male: [
      'Minho', 'Joon', 'Seo-jun', 'Ha-joon', 'Do-yun', 'Shi-woo', 'Joo-won', 'Ye-jun',
      'Jun-seo', 'Ji-ho', 'Hyun-woo', 'Sung-min', 'Tae-hyung', 'Jin-woo', 'Dong-hyun',
      'Seung-ho', 'Kyung-soo', 'Young-jae', 'Min-jun', 'Woo-jin', 'Jae-min', 'Hyun-jin',
      'Sung-jae', 'Ki-tae', 'Dae-sung', 'In-ho', 'Byung-ho', 'Chang-min'
    ],
    female: [
      'Ji-yeon', 'Soo-yeon', 'Min-ji', 'Ha-yoon', 'Seo-yeon', 'Ji-woo', 'Chae-won', 'Su-bin',
      'Ye-eun', 'Yu-na', 'Eun-bi', 'Hye-jin', 'Sun-hee', 'Mi-young', 'Soo-jin', 'Yoon-ah',
      'Hana', 'Da-hye', 'Ji-hye', 'Eun-jung', 'So-yeon', 'Hye-won', 'Min-ah', 'Yeon-seo',
      'Bo-young', 'Ga-young', 'Na-yeon', 'Seul-gi'
    ],
    neutral: ['Jimin', 'Hyun', 'Soo', 'Yoon', 'Min', 'Seung'],
    surnames: [
      'Kim', 'Lee', 'Park', 'Choi', 'Jung', 'Kang', 'Cho', 'Yoon',
      'Jang', 'Lim', 'Han', 'Oh', 'Seo', 'Shin', 'Kwon', 'Hwang',
      'Ahn', 'Song', 'Yoo', 'Hong'
    ]
  },

  // === SOUTH ASIA ===
  {
    region: 'India',
    ethnicities: ['Indian', 'South Asian', 'Hindu', 'Sikh'],
    male: [
      'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan',
      'Krishna', 'Ishaan', 'Shaurya', 'Atharv', 'Dhruv', 'Kabir', 'Ritvik', 'Aarush',
      'Kian', 'Darsh', 'Veer', 'Yash', 'Rohan', 'Nikhil', 'Rahul', 'Vijay',
      'Raj', 'Pradeep', 'Suresh', 'Ganesh', 'Ravi', 'Vikram', 'Amit', 'Deepak'
    ],
    female: [
      'Saanvi', 'Aanya', 'Aadhya', 'Aaradhya', 'Ananya', 'Pari', 'Anika', 'Navya',
      'Diya', 'Myra', 'Sara', 'Priya', 'Aisha', 'Ishita', 'Kavya', 'Riya',
      'Neha', 'Pooja', 'Anjali', 'Shreya', 'Nisha', 'Meera', 'Sunita', 'Lakshmi',
      'Deepika', 'Padma', 'Radha', 'Geeta', 'Sarita', 'Anita', 'Kamala', 'Indira'
    ],
    neutral: ['Kiran', 'Neel', 'Jai', 'Dev', 'Rohan'],
    surnames: [
      'Sharma', 'Verma', 'Gupta', 'Singh', 'Kumar', 'Patel', 'Reddy', 'Nair',
      'Rao', 'Iyer', 'Menon', 'Pillai', 'Kapoor', 'Malhotra', 'Chopra', 'Mehta',
      'Shah', 'Joshi', 'Desai', 'Chatterjee'
    ]
  },

  // === MIDDLE EAST ===
  {
    region: 'Middle East',
    ethnicities: ['Arab', 'Persian', 'Turkish', 'Middle Eastern'],
    male: [
      'Mohammed', 'Ahmed', 'Ali', 'Omar', 'Hassan', 'Hussein', 'Khalid', 'Yusuf',
      'Ibrahim', 'Mustafa', 'Tariq', 'Karim', 'Samir', 'Rashid', 'Nasser', 'Faisal',
      'Reza', 'Amir', 'Darius', 'Cyrus', 'Bahram', 'Navid', 'Arash', 'Mehdi',
      'Emre', 'Burak', 'Kaan', 'Berat', 'Yigit', 'Arda', 'Alp', 'Deniz'
    ],
    female: [
      'Fatima', 'Aisha', 'Maryam', 'Zahra', 'Leila', 'Noor', 'Hana', 'Sara',
      'Yasmin', 'Layla', 'Amira', 'Dina', 'Rania', 'Salma', 'Mariam', 'Huda',
      'Shirin', 'Parisa', 'Nazanin', 'Mina', 'Azadeh', 'Soraya', 'Laleh', 'Niloufar',
      'Elif', 'Zeynep', 'Defne', 'Aylin', 'Selin', 'Ceren', 'Ipek', 'Ebru'
    ],
    neutral: ['Noor', 'Salam', 'Jahan', 'Dana', 'Shams'],
    surnames: [
      'Al-Rashid', 'Al-Farsi', 'Hassan', 'Khan', 'Abbasi', 'Shirazi', 'Tehrani',
      'Yilmaz', 'Ozturk', 'Demir', 'Celik', 'Aydin', 'Arslan', 'Kaya'
    ]
  },

  // === AFRICA ===
  {
    region: 'West Africa',
    ethnicities: ['Nigerian', 'Ghanaian', 'Senegalese', 'West African', 'African'],
    male: [
      'Oluwaseun', 'Chukwuemeka', 'Kwame', 'Kofi', 'Adebayo', 'Olumide', 'Tunde',
      'Babatunde', 'Chidi', 'Emeka', 'Ikenna', 'Obinna', 'Nnamdi', 'Yaw', 'Kwesi',
      'Mamadou', 'Ousmane', 'Ibrahima', 'Moussa', 'Amadou', 'Sekou', 'Boubacar',
      'Ade', 'Femi', 'Dele', 'Segun', 'Wole', 'Kola', 'Dapo', 'Kunle'
    ],
    female: [
      'Adaeze', 'Ngozi', 'Chidinma', 'Amara', 'Adanna', 'Chiamaka', 'Nneka', 'Ifeoma',
      'Akua', 'Ama', 'Abena', 'Efua', 'Adwoa', 'Fatou', 'Aminata', 'Aissatou',
      'Mariama', 'Binta', 'Kadiatou', 'Funke', 'Yetunde', 'Omolara', 'Titilayo',
      'Folake', 'Bukola', 'Kemi', 'Bimpe', 'Ronke', 'Sade', 'Tolu'
    ],
    neutral: ['Chika', 'Ade', 'Temi', 'Fola'],
    surnames: [
      'Okonkwo', 'Adeyemi', 'Okafor', 'Nwosu', 'Eze', 'Mensah', 'Asante', 'Owusu',
      'Diallo', 'Diop', 'Ndiaye', 'Sow', 'Ba', 'Bello', 'Abubakar', 'Ibrahim'
    ]
  },
  {
    region: 'East Africa',
    ethnicities: ['Kenyan', 'Ethiopian', 'Tanzanian', 'East African', 'African'],
    male: [
      'Juma', 'Baraka', 'Tendai', 'Simba', 'Jelani', 'Zuberi', 'Kofi', 'Hamisi',
      'Abebe', 'Bekele', 'Tadesse', 'Haile', 'Girma', 'Teshome', 'Dawit', 'Yonas',
      'Mwangi', 'Kamau', 'Njoroge', 'Ochieng', 'Otieno', 'Kipchoge', 'Kibet', 'Cheruiyot'
    ],
    female: [
      'Amani', 'Zuri', 'Imani', 'Neema', 'Bahati', 'Furaha', 'Asha', 'Zawadi',
      'Tigist', 'Bethlehem', 'Makda', 'Selamawit', 'Meseret', 'Meron', 'Hiwot', 'Rahel',
      'Wanjiku', 'Njeri', 'Wambui', 'Nyambura', 'Akinyi', 'Adhiambo', 'Atieno', 'Awino'
    ],
    neutral: ['Amani', 'Pendo', 'Tumaini', 'Upendo'],
    surnames: [
      'Kimani', 'Mwangi', 'Ochieng', 'Abebe', 'Tadesse', 'Bekele', 'Nyong\'o',
      'Kenyatta', 'Odinga', 'Kibaki', 'Haile', 'Gebrselassie', 'Dibaba'
    ]
  },
  {
    region: 'South Africa',
    ethnicities: ['South African', 'Zulu', 'Xhosa', 'African'],
    male: [
      'Thabo', 'Sipho', 'Bongani', 'Mandla', 'Sizwe', 'Themba', 'Nkosi', 'Sandile',
      'Zolani', 'Luthando', 'Andile', 'Mthunzi', 'Siyabonga', 'Thandolwethu', 'Kagiso',
      'Tshepo', 'Lerato', 'Mpho', 'Katlego', 'Tumelo', 'Refilwe', 'Tlotlo'
    ],
    female: [
      'Nomvula', 'Thandiwe', 'Lindiwe', 'Busisiwe', 'Nokuthula', 'Zinhle', 'Nandi',
      'Ayanda', 'Palesa', 'Lerato', 'Dineo', 'Mpho', 'Kgomotso', 'Tshepiso', 'Keitumetse',
      'Naledi', 'Nolwazi', 'Sindi', 'Ntombi', 'Zodwa', 'Sibongile', 'Thandi'
    ],
    neutral: ['Mpho', 'Lerato', 'Lesedi', 'Kabelo', 'Kgosi'],
    surnames: [
      'Mandela', 'Zuma', 'Mbeki', 'Ramaphosa', 'Dlamini', 'Nkosi', 'Mthembu',
      'Ndlovu', 'Khumalo', 'Ngcobo', 'Molefe', 'Mokoena', 'Mahlangu', 'Sithole'
    ]
  },

  // === EUROPE ===
  {
    region: 'UK',
    ethnicities: ['British', 'English', 'Scottish', 'Welsh', 'Irish', 'European'],
    male: [
      'Oliver', 'George', 'Arthur', 'Noah', 'Muhammad', 'Leo', 'Oscar', 'Harry',
      'Archie', 'Jack', 'Henry', 'Charlie', 'Freddie', 'Alfie', 'Theodore', 'William',
      'Thomas', 'James', 'Edward', 'Alexander', 'Sebastian', 'Benjamin', 'Rupert', 'Hugh',
      'Angus', 'Hamish', 'Callum', 'Finlay', 'Ewan', 'Rhys', 'Dylan', 'Gareth'
    ],
    female: [
      'Olivia', 'Amelia', 'Isla', 'Ava', 'Mia', 'Ivy', 'Lily', 'Isabella',
      'Rosie', 'Sophia', 'Grace', 'Freya', 'Florence', 'Willow', 'Poppy', 'Elsie',
      'Charlotte', 'Eleanor', 'Elizabeth', 'Victoria', 'Arabella', 'Georgiana', 'Beatrice',
      'Fiona', 'Moira', 'Eilidh', 'Isla', 'Rhiannon', 'Cerys', 'Sian', 'Bronwen'
    ],
    neutral: ['Alex', 'Charlie', 'Sam', 'Jamie', 'Morgan', 'Robin', 'Rowan'],
    surnames: [
      'Smith', 'Jones', 'Williams', 'Brown', 'Taylor', 'Davies', 'Wilson', 'Evans',
      'Thomas', 'Johnson', 'Roberts', 'Walker', 'Wright', 'Robinson', 'Thompson',
      'MacDonald', 'Campbell', 'Stewart', 'Murray', 'O\'Brien', 'Murphy', 'Kelly'
    ],
    medieval: {
      male: ['Edmund', 'Aldric', 'Godwin', 'Leofric', 'Wulfric', 'Eadric', 'Cedric', 'Oswald', 'Alfred', 'Athelstan'],
      female: ['Gwyneth', 'Aethelflaed', 'Eadgyth', 'Hilda', 'Rowena', 'Matilda', 'Eleanor', 'Isolde', 'Morgana', 'Guinevere']
    }
  },
  {
    region: 'France',
    ethnicities: ['French', 'European'],
    male: [
      'Gabriel', 'Leo', 'Raphael', 'Louis', 'Lucas', 'Adam', 'Arthur', 'Hugo',
      'Jules', 'Maël', 'Ethan', 'Nathan', 'Paul', 'Antoine', 'Maxime', 'Alexandre',
      'Pierre', 'Jean', 'Jacques', 'Henri', 'Philippe', 'Francois', 'Michel', 'Nicolas',
      'Olivier', 'Sebastien', 'Thierry', 'Christophe', 'Guillaume', 'Romain'
    ],
    female: [
      'Emma', 'Louise', 'Jade', 'Alice', 'Chloe', 'Lea', 'Manon', 'Ines',
      'Camille', 'Lina', 'Rose', 'Anna', 'Mila', 'Julia', 'Zoe', 'Charlotte',
      'Marie', 'Claire', 'Sophie', 'Margaux', 'Helene', 'Isabelle', 'Nathalie', 'Sylvie',
      'Amelie', 'Juliette', 'Colette', 'Genevieve', 'Brigitte', 'Monique'
    ],
    neutral: ['Camille', 'Dominique', 'Claude', 'Maxime', 'Alix'],
    surnames: [
      'Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand',
      'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David',
      'Fontaine', 'Blanc', 'Rousseau', 'Mercier'
    ]
  },
  {
    region: 'Germany',
    ethnicities: ['German', 'European'],
    male: [
      'Noah', 'Ben', 'Finn', 'Leon', 'Elias', 'Paul', 'Henry', 'Luis',
      'Felix', 'Lukas', 'Liam', 'Jonas', 'Maximilian', 'Emil', 'Anton', 'Oskar',
      'Hans', 'Klaus', 'Wolfgang', 'Friedrich', 'Heinrich', 'Dietrich', 'Gerhard', 'Helmut',
      'Stefan', 'Markus', 'Andreas', 'Tobias', 'Matthias', 'Sebastian'
    ],
    female: [
      'Emma', 'Mia', 'Sofia', 'Hannah', 'Emilia', 'Lina', 'Mila', 'Lea',
      'Clara', 'Marie', 'Lena', 'Anna', 'Ella', 'Sophia', 'Amelie', 'Johanna',
      'Greta', 'Heidi', 'Ingrid', 'Helga', 'Ursula', 'Hildegard', 'Gertrud', 'Liesel',
      'Katarina', 'Monika', 'Sabine', 'Petra', 'Brigitte', 'Claudia'
    ],
    neutral: ['Alex', 'Kim', 'Robin', 'Sascha', 'Nikola'],
    surnames: [
      'Muller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker',
      'Schulz', 'Hoffmann', 'Schafer', 'Koch', 'Bauer', 'Richter', 'Klein', 'Wolf',
      'Schroder', 'Neumann', 'Schwarz', 'Zimmermann'
    ]
  },
  {
    region: 'Italy',
    ethnicities: ['Italian', 'European'],
    male: [
      'Leonardo', 'Francesco', 'Alessandro', 'Lorenzo', 'Mattia', 'Andrea', 'Gabriele', 'Riccardo',
      'Tommaso', 'Edoardo', 'Federico', 'Giuseppe', 'Luca', 'Marco', 'Giovanni', 'Antonio',
      'Mario', 'Pietro', 'Paolo', 'Vincenzo', 'Salvatore', 'Domenico', 'Massimo', 'Roberto',
      'Stefano', 'Carlo', 'Fabio', 'Daniele', 'Gianluca', 'Simone'
    ],
    female: [
      'Sofia', 'Giulia', 'Aurora', 'Ginevra', 'Beatrice', 'Alice', 'Vittoria', 'Emma',
      'Chiara', 'Sara', 'Martina', 'Greta', 'Francesca', 'Alessia', 'Anna', 'Elena',
      'Maria', 'Rosa', 'Lucia', 'Giovanna', 'Angela', 'Paola', 'Claudia', 'Valentina',
      'Silvia', 'Federica', 'Elisa', 'Isabella', 'Caterina', 'Giorgia'
    ],
    neutral: ['Andrea', 'Luca', 'Simone'],
    surnames: [
      'Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci',
      'Marino', 'Greco', 'Bruno', 'Gallo', 'Conti', 'De Luca', 'Mancini', 'Costa',
      'Giordano', 'Rizzo', 'Lombardi', 'Moretti'
    ]
  },
  {
    region: 'Spain',
    ethnicities: ['Spanish', 'European', 'Hispanic'],
    male: [
      'Hugo', 'Mateo', 'Martin', 'Lucas', 'Leo', 'Daniel', 'Alejandro', 'Pablo',
      'Manuel', 'Alvaro', 'Adrian', 'David', 'Mario', 'Diego', 'Javier', 'Carlos',
      'Miguel', 'Antonio', 'Francisco', 'Jose', 'Juan', 'Fernando', 'Rafael', 'Pedro',
      'Sergio', 'Ramon', 'Enrique', 'Alberto', 'Luis', 'Roberto'
    ],
    female: [
      'Lucia', 'Sofia', 'Maria', 'Martina', 'Paula', 'Julia', 'Daniela', 'Valeria',
      'Alba', 'Emma', 'Carla', 'Sara', 'Noa', 'Carmen', 'Claudia', 'Valentina',
      'Ana', 'Isabel', 'Elena', 'Pilar', 'Teresa', 'Dolores', 'Rosa', 'Beatriz',
      'Cristina', 'Patricia', 'Raquel', 'Silvia', 'Laura', 'Marta'
    ],
    neutral: ['Alex', 'Andrea', 'Ariel'],
    surnames: [
      'Garcia', 'Rodriguez', 'Martinez', 'Lopez', 'Gonzalez', 'Hernandez', 'Perez', 'Sanchez',
      'Ramirez', 'Torres', 'Flores', 'Rivera', 'Gomez', 'Diaz', 'Reyes', 'Moreno',
      'Jimenez', 'Ruiz', 'Alvarez', 'Romero'
    ]
  },
  {
    region: 'Russia',
    ethnicities: ['Russian', 'Slavic', 'European'],
    male: [
      'Alexander', 'Mikhail', 'Maxim', 'Artem', 'Dmitri', 'Ivan', 'Kirill', 'Nikita',
      'Andrei', 'Sergei', 'Vladimir', 'Alexei', 'Pavel', 'Nikolai', 'Viktor', 'Boris',
      'Oleg', 'Igor', 'Yuri', 'Konstantin', 'Anatoly', 'Grigori', 'Fyodor', 'Roman',
      'Stanislav', 'Timofey', 'Ilya', 'Anton', 'Denis', 'Evgeny'
    ],
    female: [
      'Anastasia', 'Maria', 'Daria', 'Sofia', 'Polina', 'Anna', 'Victoria', 'Elizabeth',
      'Ekaterina', 'Alexandra', 'Natalia', 'Olga', 'Irina', 'Tatiana', 'Svetlana', 'Elena',
      'Valentina', 'Galina', 'Ludmila', 'Nadezhda', 'Marina', 'Larisa', 'Vera', 'Nina',
      'Ksenia', 'Yulia', 'Alina', 'Yelena', 'Veronika', 'Kira'
    ],
    neutral: ['Sasha', 'Zhenya', 'Valya'],
    surnames: [
      'Ivanov', 'Smirnov', 'Kuznetsov', 'Popov', 'Vasiliev', 'Petrov', 'Sokolov', 'Mikhailov',
      'Novikov', 'Fedorov', 'Morozov', 'Volkov', 'Alexeev', 'Lebedev', 'Semenov', 'Egorov',
      'Pavlov', 'Kozlov', 'Stepanov', 'Nikolaev'
    ]
  },
  {
    region: 'Scandinavia',
    ethnicities: ['Swedish', 'Norwegian', 'Danish', 'Finnish', 'Nordic', 'European'],
    male: [
      'Erik', 'Lars', 'Bjorn', 'Magnus', 'Olaf', 'Sven', 'Anders', 'Henrik',
      'Johan', 'Karl', 'Nils', 'Per', 'Gunnar', 'Harald', 'Leif', 'Ragnar',
      'Thor', 'Ivar', 'Axel', 'Oscar', 'Emil', 'Hugo', 'Elias', 'William',
      'Mikkel', 'Morten', 'Jens', 'Kasper', 'Frederik', 'Christian'
    ],
    female: [
      'Astrid', 'Freya', 'Ingrid', 'Sigrid', 'Helga', 'Karin', 'Birgit', 'Liv',
      'Solveig', 'Gudrun', 'Elin', 'Maja', 'Saga', 'Linnea', 'Ebba', 'Ella',
      'Ida', 'Hanna', 'Sofia', 'Emma', 'Wilma', 'Alma', 'Elsa', 'Klara',
      'Freja', 'Nora', 'Sofie', 'Amalie', 'Mathilde', 'Laura'
    ],
    neutral: ['Kim', 'Alex', 'Robin', 'Sam'],
    surnames: [
      'Andersson', 'Johansson', 'Karlsson', 'Nilsson', 'Eriksson', 'Larsson', 'Olsson', 'Persson',
      'Hansen', 'Johansen', 'Olsen', 'Larsen', 'Pedersen', 'Nielsen', 'Jensen', 'Christensen',
      'Virtanen', 'Korhonen', 'Nieminen', 'Makinen'
    ]
  },
  {
    region: 'Greece',
    ethnicities: ['Greek', 'European', 'Mediterranean'],
    male: [
      'Alexandros', 'Dimitrios', 'Georgios', 'Ioannis', 'Konstantinos', 'Nikolaos', 'Panagiotis', 'Christos',
      'Vasilis', 'Michalis', 'Nikos', 'Kostas', 'Yannis', 'Petros', 'Andreas', 'Stavros',
      'Spyros', 'Theodoros', 'Evangelos', 'Apostolos', 'Sotirios', 'Athanasios', 'Leonidas', 'Achilles'
    ],
    female: [
      'Maria', 'Eleni', 'Katerina', 'Dimitra', 'Sofia', 'Anastasia', 'Georgia', 'Ioanna',
      'Konstantina', 'Nikoletta', 'Chrysa', 'Fotini', 'Athina', 'Despina', 'Vasiliki', 'Alexandra',
      'Theodora', 'Evangelia', 'Panagiota', 'Kalliopi', 'Androniki', 'Artemis', 'Ariadne', 'Penelope'
    ],
    neutral: ['Alex', 'Niki', 'Chris'],
    surnames: [
      'Papadopoulos', 'Vlahos', 'Angelopoulos', 'Georgiou', 'Nikolaidis', 'Papadakis', 'Ioannou',
      'Christodoulou', 'Konstantinou', 'Michailidis', 'Dimitriou', 'Alexiou', 'Pappas', 'Karagiannis'
    ],
    ancient: {
      male: ['Achilles', 'Odysseus', 'Perseus', 'Theseus', 'Heracles', 'Jason', 'Orestes', 'Ajax', 'Hector', 'Paris'],
      female: ['Helen', 'Penelope', 'Andromache', 'Cassandra', 'Iphigenia', 'Clytemnestra', 'Electra', 'Antigone', 'Ismene', 'Medea']
    }
  },

  // === AMERICAS ===
  {
    region: 'Mexico',
    ethnicities: ['Mexican', 'Hispanic', 'Latino'],
    male: [
      'Santiago', 'Mateo', 'Sebastian', 'Leonardo', 'Emiliano', 'Diego', 'Miguel', 'Angel',
      'Daniel', 'Alexander', 'Matias', 'Iker', 'Nicolas', 'Samuel', 'Alejandro', 'Carlos',
      'Jose', 'Juan', 'Luis', 'Francisco', 'Pedro', 'Rafael', 'Jesus', 'Eduardo',
      'Arturo', 'Ricardo', 'Fernando', 'Roberto', 'Guillermo', 'Andres'
    ],
    female: [
      'Sofia', 'Valentina', 'Regina', 'Camila', 'Maria Jose', 'Ximena', 'Victoria', 'Isabella',
      'Renata', 'Natalia', 'Lucia', 'Daniela', 'Mariana', 'Emma', 'Paula', 'Alejandra',
      'Gabriela', 'Fernanda', 'Andrea', 'Ana', 'Patricia', 'Rosa', 'Carmen', 'Guadalupe',
      'Adriana', 'Monica', 'Teresa', 'Veronica', 'Leticia', 'Silvia'
    ],
    neutral: ['Guadalupe', 'Angel', 'Cruz'],
    surnames: [
      'Hernandez', 'Garcia', 'Martinez', 'Lopez', 'Gonzalez', 'Rodriguez', 'Perez', 'Sanchez',
      'Ramirez', 'Cruz', 'Flores', 'Gomez', 'Morales', 'Reyes', 'Torres', 'Diaz',
      'Vazquez', 'Ramos', 'Castillo', 'Mendoza'
    ]
  },
  {
    region: 'Brazil',
    ethnicities: ['Brazilian', 'Portuguese', 'Latino'],
    male: [
      'Miguel', 'Arthur', 'Gael', 'Heitor', 'Theo', 'Davi', 'Gabriel', 'Bernardo',
      'Samuel', 'Rafael', 'Pedro', 'Lucas', 'Matheus', 'Bruno', 'Felipe', 'Gustavo',
      'Leonardo', 'Eduardo', 'Thiago', 'Joao', 'Carlos', 'Andre', 'Ricardo', 'Marcelo',
      'Fernando', 'Rodrigo', 'Vinicius', 'Caio', 'Igor', 'Henrique'
    ],
    female: [
      'Helena', 'Alice', 'Laura', 'Maria Alice', 'Sofia', 'Manuela', 'Maitê', 'Liz',
      'Cecilia', 'Isabella', 'Luisa', 'Eloah', 'Julia', 'Heloisa', 'Livia', 'Valentina',
      'Maria', 'Ana', 'Beatriz', 'Fernanda', 'Patricia', 'Camila', 'Mariana', 'Juliana',
      'Leticia', 'Gabriela', 'Rafaela', 'Vitoria', 'Carolina', 'Larissa'
    ],
    neutral: ['Alex', 'Ariel', 'Jo'],
    surnames: [
      'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira',
      'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes',
      'Soares', 'Fernandes', 'Vieira', 'Barbosa'
    ]
  },
  {
    region: 'USA',
    ethnicities: ['American', 'African-American', 'European-American'],
    male: [
      'Liam', 'Noah', 'Oliver', 'James', 'Elijah', 'William', 'Henry', 'Lucas',
      'Benjamin', 'Theodore', 'Jack', 'Levi', 'Alexander', 'Mason', 'Ethan', 'Jacob',
      'Michael', 'Daniel', 'Matthew', 'Andrew', 'Joseph', 'David', 'Christopher', 'John',
      'Tyler', 'Brandon', 'Austin', 'Hunter', 'Jayden', 'Caleb'
    ],
    female: [
      'Olivia', 'Emma', 'Charlotte', 'Amelia', 'Sophia', 'Isabella', 'Mia', 'Evelyn',
      'Harper', 'Luna', 'Camila', 'Gianna', 'Elizabeth', 'Eleanor', 'Ella', 'Abigail',
      'Emily', 'Madison', 'Chloe', 'Grace', 'Avery', 'Scarlett', 'Victoria', 'Riley',
      'Aria', 'Lily', 'Zoey', 'Penelope', 'Layla', 'Nora'
    ],
    neutral: ['Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn', 'Peyton', 'Skyler', 'Dakota'],
    surnames: [
      'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
      'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
      'Taylor', 'Moore', 'Jackson', 'Martin'
    ]
  },
  {
    region: 'African-American',
    ethnicities: ['African-American', 'Black American'],
    male: [
      'Jaylen', 'Malik', 'Darius', 'Terrell', 'Andre', 'DeShawn', 'Tyrone', 'Jamal',
      'Marcus', 'Dwayne', 'Antoine', 'Lamar', 'Kareem', 'Rashid', 'DeAndre', 'Marquis',
      'Jermaine', 'Devonte', 'Tyrell', 'Kendrick', 'Malcolm', 'Trevon', 'Dashawn', 'Jamaal',
      'Terrance', 'Reginald', 'Cornell', 'Jerome', 'Clarence', 'Leroy'
    ],
    female: [
      'Aaliyah', 'Imani', 'Zaria', 'Kiana', 'Jasmine', 'Ebony', 'Tamika', 'Shanice',
      'Latoya', 'Keisha', 'Tanisha', 'Monique', 'Destiny', 'Brianna', 'Kiara', 'Tiana',
      'Precious', 'Diamond', 'Shaniqua', 'LaShonda', 'Niesha', 'Dominique', 'Nia', 'Jada',
      'Aliyah', 'Raven', 'Tierra', 'Ciara', 'Breanna', 'Asia'
    ],
    neutral: ['Jordan', 'Taylor', 'Jaden', 'Cameron', 'Skylar'],
    surnames: [
      'Washington', 'Jefferson', 'Jackson', 'Johnson', 'Williams', 'Brown', 'Davis', 'Robinson',
      'Harris', 'Lewis', 'Walker', 'Hall', 'Allen', 'Young', 'King', 'Wright',
      'Scott', 'Green', 'Baker', 'Adams'
    ]
  },

  // === SPECIAL ERAS ===
  {
    region: 'Fantasy Medieval',
    ethnicities: ['Fantasy', 'Medieval'],
    male: [
      'Aldric', 'Bran', 'Cedric', 'Darian', 'Edmund', 'Finnian', 'Gareth', 'Hadrian',
      'Idris', 'Jareth', 'Kael', 'Lysander', 'Magnus', 'Nolan', 'Orion', 'Percival',
      'Quentin', 'Rowan', 'Silas', 'Theron', 'Ulric', 'Varen', 'Wren', 'Xander',
      'Yorick', 'Zephyr', 'Alaric', 'Bastian', 'Caspian', 'Dorian'
    ],
    female: [
      'Arwen', 'Brielle', 'Calista', 'Dahlia', 'Elara', 'Freya', 'Gwendolyn', 'Helena',
      'Isolde', 'Juliana', 'Katarina', 'Lyra', 'Morgana', 'Niamh', 'Ophelia', 'Persephone',
      'Rowena', 'Seraphina', 'Thalia', 'Una', 'Vivienne', 'Winifred', 'Ximena', 'Yseult',
      'Zelda', 'Astrid', 'Bronwyn', 'Cordelia', 'Drusilla', 'Evangeline'
    ],
    neutral: ['Rowan', 'Sage', 'Wren', 'Morgan', 'Arden', 'Ashby', 'Briar', 'Raven'],
    surnames: [
      'Blackwood', 'Silverthorne', 'Ravenscroft', 'Nightingale', 'Ironforge', 'Stormwind',
      'Darkhollow', 'Brightwater', 'Shadowmere', 'Goldleaf', 'Thornwood', 'Frostborn'
    ]
  },
  {
    region: 'Sci-Fi Futuristic',
    ethnicities: ['Futuristic', 'Sci-Fi'],
    male: [
      'Zephyr', 'Orion', 'Axel', 'Jax', 'Nova', 'Cyrus', 'Kael', 'Dash',
      'Rex', 'Blaze', 'Phoenix', 'Titan', 'Atlas', 'Zenith', 'Vector', 'Quantum',
      'Nexus', 'Cipher', 'Vex', 'Ion', 'Lux', 'Nyx', 'Flux', 'Eon'
    ],
    female: [
      'Nova', 'Luna', 'Lyra', 'Celeste', 'Aurora', 'Zara', 'Astra', 'Vega',
      'Solara', 'Nebula', 'Electra', 'Cosima', 'Andromeda', 'Cassiopeia', 'Galaxia', 'Terra',
      'Phoenix', 'Ember', 'Crystal', 'Trinity', 'Echo', 'Aria', 'Seren', 'Zephyra'
    ],
    neutral: ['Phoenix', 'Nova', 'Echo', 'Zen', 'Kai', 'Lux', 'Quinn', 'Sky', 'Storm', 'Ash'],
    surnames: [
      'Vance', 'Sterling', 'Quantum', 'Nebula', 'Cosmos', 'Stellar', 'Apex', 'Vector',
      'Neon', 'Chrome', 'Flux', 'Nova', 'Onyx', 'Cipher', 'Helix', 'Prism'
    ]
  }
];

// ============================================================================
// Name Generator Functions
// ============================================================================

/**
 * Get a random item from an array
 */
function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Get multiple random unique items from an array
 */
function randomMultipleFrom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, arr.length));
}

/**
 * Find name pools that match given criteria
 */
export function findNamePools(criteria: {
  region?: string;
  ethnicity?: string;
  era?: Era;
}): NamePool[] {
  return NAME_POOLS.filter(pool => {
    if (criteria.region) {
      const regionMatch = pool.region.toLowerCase().includes(criteria.region.toLowerCase());
      if (regionMatch) return true;
    }
    if (criteria.ethnicity) {
      const ethnicityMatch = pool.ethnicities.some(e =>
        e.toLowerCase().includes(criteria.ethnicity!.toLowerCase())
      );
      if (ethnicityMatch) return true;
    }
    return false;
  });
}

/**
 * Get random names from a specific region/culture
 */
export function getRandomNames(criteria: {
  region?: string;
  ethnicity?: string;
  era?: Era;
  gender?: Gender;
  count?: number;
  includeSurnames?: boolean;
}): { firstName: string; surname?: string }[] {
  const count = criteria.count || 5;
  const pools = findNamePools(criteria);

  if (pools.length === 0) {
    // Fallback to US names
    const fallbackPool = NAME_POOLS.find(p => p.region === 'USA')!;
    pools.push(fallbackPool);
  }

  const results: { firstName: string; surname?: string }[] = [];

  for (let i = 0; i < count; i++) {
    const pool = randomFrom(pools);
    let firstNames: string[];

    // Handle era-specific names
    if (criteria.era === 'medieval' && pool.medieval) {
      firstNames = criteria.gender === 'female' ? pool.medieval.female : pool.medieval.male;
    } else if (criteria.era === 'ancient' && pool.ancient) {
      firstNames = criteria.gender === 'female' ? pool.ancient.female : pool.ancient.male;
    } else {
      // Use gender-specific or neutral names
      if (criteria.gender === 'male') {
        firstNames = pool.male;
      } else if (criteria.gender === 'female') {
        firstNames = pool.female;
      } else {
        firstNames = [...pool.male, ...pool.female, ...pool.neutral];
      }
    }

    const firstName = randomFrom(firstNames);
    const surname = criteria.includeSurnames ? randomFrom(pool.surnames) : undefined;

    results.push({ firstName, surname });
  }

  return results;
}

/**
 * Detect the likely cultural setting from a premise/description
 */
export function detectCulturalSetting(text: string): {
  region: string | null;
  era: Era;
  confidence: 'high' | 'medium' | 'low';
} {
  const lowerText = text.toLowerCase();

  // Region detection patterns
  const regionPatterns: { pattern: RegExp; region: string }[] = [
    { pattern: /\b(japan|tokyo|osaka|kyoto|samurai|shogun|ninja|manga|anime)\b/i, region: 'Japan' },
    { pattern: /\b(china|chinese|beijing|shanghai|dynasty|emperor|martial arts|kung fu)\b/i, region: 'China' },
    { pattern: /\b(korea|korean|seoul|k-pop|joseon)\b/i, region: 'Korea' },
    { pattern: /\b(india|indian|mumbai|delhi|bollywood|hindu|sikh|maharaja)\b/i, region: 'India' },
    { pattern: /\b(middle east|arab|persian|iran|iraq|dubai|sultan|caliph)\b/i, region: 'Middle East' },
    { pattern: /\b(nigeria|lagos|west africa|yoruba|igbo|hausa)\b/i, region: 'West Africa' },
    { pattern: /\b(kenya|ethiopia|east africa|swahili|tanzania)\b/i, region: 'East Africa' },
    { pattern: /\b(south africa|johannesburg|cape town|zulu|xhosa|apartheid)\b/i, region: 'South Africa' },
    { pattern: /\b(uk|britain|british|england|english|london|scotland|wales|irish)\b/i, region: 'UK' },
    { pattern: /\b(france|french|paris|provence|lyon)\b/i, region: 'France' },
    { pattern: /\b(germany|german|berlin|munich|bavaria)\b/i, region: 'Germany' },
    { pattern: /\b(italy|italian|rome|milan|venice|sicily)\b/i, region: 'Italy' },
    { pattern: /\b(spain|spanish|madrid|barcelona|andalusia)\b/i, region: 'Spain' },
    { pattern: /\b(russia|russian|moscow|st\. petersburg|soviet)\b/i, region: 'Russia' },
    { pattern: /\b(scandinavia|sweden|norway|denmark|finland|viking|norse)\b/i, region: 'Scandinavia' },
    { pattern: /\b(greece|greek|athens|sparta|acropolis)\b/i, region: 'Greece' },
    { pattern: /\b(mexico|mexican|mexico city|aztec|mayan)\b/i, region: 'Mexico' },
    { pattern: /\b(brazil|brazilian|rio|sao paulo|carnival)\b/i, region: 'Brazil' },
    { pattern: /\b(america|american|usa|new york|los angeles|chicago)\b/i, region: 'USA' },
    { pattern: /\b(african.?american|black american|harlem|hip.?hop)\b/i, region: 'African-American' },
  ];

  // Era detection patterns
  const eraPatterns: { pattern: RegExp; era: Era }[] = [
    { pattern: /\b(ancient|classical|antiquity|rome|greece|egypt|mesopotamia)\b/i, era: 'ancient' },
    { pattern: /\b(medieval|middle ages|knight|castle|feudal|crusade|renaissance)\b/i, era: 'medieval' },
    { pattern: /\b(victorian|19th century|1800s|industrial revolution|steampunk)\b/i, era: 'victorian' },
    { pattern: /\b(future|futuristic|sci-fi|space|cyberpunk|dystopia|2[1-9]\d{2}|3\d{3})\b/i, era: 'futuristic' },
  ];

  // Find region
  let detectedRegion: string | null = null;
  let confidence: 'high' | 'medium' | 'low' = 'low';

  for (const { pattern, region } of regionPatterns) {
    if (pattern.test(lowerText)) {
      detectedRegion = region;
      confidence = 'high';
      break;
    }
  }

  // Find era
  let detectedEra: Era = 'modern';
  for (const { pattern, era } of eraPatterns) {
    if (pattern.test(lowerText)) {
      detectedEra = era;
      break;
    }
  }

  // Check for fantasy setting
  if (/\b(fantasy|magic|wizard|dragon|elf|dwarf|orc|sword\s*(&|and)\s*sorcery)\b/i.test(lowerText)) {
    if (!detectedRegion) {
      detectedRegion = 'Fantasy Medieval';
      confidence = 'medium';
    }
    if (detectedEra === 'modern') {
      detectedEra = 'medieval';
    }
  }

  return { region: detectedRegion, era: detectedEra, confidence };
}

/**
 * Generate a name suggestion prompt section for AI
 */
export function buildNameSuggestionPrompt(
  premise: string,
  numCharacters: number = 5
): string {
  const setting = detectCulturalSetting(premise);

  let pools: NamePool[] = [];

  if (setting.region) {
    pools = findNamePools({ region: setting.region });
  }

  // If no specific region detected, provide diverse options
  if (pools.length === 0) {
    pools = [
      NAME_POOLS.find(p => p.region === 'USA')!,
      NAME_POOLS.find(p => p.region === 'UK')!,
    ];
  }

  // Generate suggested names
  const maleNames = randomMultipleFrom(pools.flatMap(p => p.male), 8);
  const femaleNames = randomMultipleFrom(pools.flatMap(p => p.female), 8);
  const surnames = randomMultipleFrom(pools.flatMap(p => p.surnames), 6);

  const settingNote = setting.region
    ? `Detected setting: ${setting.region} (${setting.era}). Use culturally appropriate names.`
    : 'No specific cultural setting detected. Choose names that fit your story world.';

  return `
=== CHARACTER NAME SUGGESTIONS ===
${settingNote}

SUGGESTED MALE NAMES: ${maleNames.join(', ')}
SUGGESTED FEMALE NAMES: ${femaleNames.join(', ')}
SUGGESTED SURNAMES: ${surnames.join(', ')}

RULES:
- Use names from the suggestions above OR invent culturally-appropriate alternatives
- Match names to the story's setting (Japanese story = Japanese names, etc.)
- NEVER use: Emma, Ethan, Maya, Marcus, Kai, Luna, Aria, Elena, Sarah, Alex, James, Lily, Oliver, Sophia
- Each name should be DISTINCT - avoid similar-sounding names (Max/Mack, Sara/Sarah)
- For historical/fantasy: use era-appropriate names, not modern names in old settings
`;
}

/**
 * Get a complete character name (first + surname) for a specific culture
 */
export function generateFullName(criteria: {
  region?: string;
  ethnicity?: string;
  gender?: Gender;
}): string {
  const names = getRandomNames({
    ...criteria,
    count: 1,
    includeSurnames: true,
  });

  if (names.length === 0) {
    return 'Unknown Character';
  }

  const { firstName, surname } = names[0];
  return surname ? `${firstName} ${surname}` : firstName;
}

/**
 * Generate a set of character names for a story
 */
export function generateCharacterNameSet(
  premise: string,
  numMale: number = 3,
  numFemale: number = 3
): { male: string[]; female: string[]; surnames: string[] } {
  const setting = detectCulturalSetting(premise);

  let pools: NamePool[] = [];
  if (setting.region) {
    pools = findNamePools({ region: setting.region });
  }

  if (pools.length === 0) {
    pools = [NAME_POOLS.find(p => p.region === 'USA')!];
  }

  const allMale = pools.flatMap(p => {
    if (setting.era === 'medieval' && p.medieval) return p.medieval.male;
    if (setting.era === 'ancient' && p.ancient) return p.ancient.male;
    return p.male;
  });

  const allFemale = pools.flatMap(p => {
    if (setting.era === 'medieval' && p.medieval) return p.medieval.female;
    if (setting.era === 'ancient' && p.ancient) return p.ancient.female;
    return p.female;
  });

  const allSurnames = pools.flatMap(p => p.surnames);

  return {
    male: randomMultipleFrom(allMale, numMale),
    female: randomMultipleFrom(allFemale, numFemale),
    surnames: randomMultipleFrom(allSurnames, Math.max(numMale, numFemale)),
  };
}

/**
 * Build diverse name suggestions for idea generation (when setting is unknown).
 * Provides name pools from multiple cultures so AI can pick appropriate ones.
 */
export function buildDiverseNamePoolsPrompt(): string {
  // Select random regions for variety
  const selectedRegions = randomMultipleFrom([
    'Japan', 'China', 'Korea', 'India', 'Middle East',
    'West Africa', 'East Africa', 'South Africa',
    'UK', 'France', 'Germany', 'Italy', 'Spain', 'Russia', 'Scandinavia', 'Greece',
    'Mexico', 'Brazil', 'USA', 'African-American',
    'Fantasy Medieval', 'Sci-Fi Futuristic'
  ], 6);

  const nameSections: string[] = [];

  for (const regionName of selectedRegions) {
    const pool = NAME_POOLS.find(p => p.region === regionName);
    if (!pool) continue;

    const maleNames = randomMultipleFrom(pool.male, 4).join(', ');
    const femaleNames = randomMultipleFrom(pool.female, 4).join(', ');

    nameSections.push(`${regionName}: ${maleNames} (M) | ${femaleNames} (F)`);
  }

  return `
=== NAME POOLS BY CULTURE (PICK NAMES THAT FIT YOUR SETTING) ===
${nameSections.join('\n')}

RULES:
- Pick ONE cultural pool and use names consistently from it
- DO NOT mix cultures randomly (no Japanese + Irish + Nigerian in same story unless plot justifies it)
- BANNED NAMES (overused AI cliches): Emma, Ethan, Maya, Marcus, Kai, Luna, Aria, Elena, Sarah, Alex, James, Lily, Oliver, Sophia, Aiden, Liam, Noah
- Match names to setting: Medieval Europe = Aldric, Gwyneth. Japan = Haruto, Sakura. Nigeria = Oluwaseun, Adaeze
`;
}

// ============================================================================
// Exports
// ============================================================================

export { NAME_POOLS };
