const bcryptjs = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const { connectDB, getDb } = require('./config/db.js');
connectDB();

const userModel = require('./models/userModel.js');

const regionalUsers = [
  {
    role: 'donar', name: 'Sravani Demo', email: 'demo.gudivada.01@raktsetu.test',
    address: 'Gudivada, Krishna District, Andhra Pradesh', phone: '9000000101',
    bloodGroup: 'O+', location: { lat: 16.4353, lng: 80.9955 }, profilePic: '/demo-profiles/donor-1.svg'
  },
  {
    role: 'donar', name: 'Kiran Demo', email: 'demo.gudivada.02@raktsetu.test',
    address: 'Nandivada Road, Gudivada, Andhra Pradesh', phone: '9000000102',
    bloodGroup: 'A+', location: { lat: 16.4228, lng: 80.9808 }, profilePic: '/demo-profiles/donor-2.svg'
  },
  {
    role: 'donar', name: 'Anusha Demo', email: 'demo.gudivada.03@raktsetu.test',
    address: 'Pamarru Road, Gudivada, Andhra Pradesh', phone: '9000000103',
    bloodGroup: 'B+', location: { lat: 16.4481, lng: 81.0142 }, profilePic: '/demo-profiles/donor-3.svg'
  },
  {
    role: 'donar', name: 'Ravi Demo', email: 'demo.gannavaram.01@raktsetu.test',
    address: 'Gannavaram, Krishna District, Andhra Pradesh', phone: '9000000104',
    bloodGroup: 'AB+', location: { lat: 16.5408, lng: 80.8021 }, profilePic: '/demo-profiles/donor-4.svg'
  },
  {
    role: 'donar', name: 'Meena Demo', email: 'demo.vuyyuru.01@raktsetu.test',
    address: 'Vuyyuru, Krishna District, Andhra Pradesh', phone: '9000000105',
    bloodGroup: 'O-', location: { lat: 16.3667, lng: 80.8456 }, profilePic: '/demo-profiles/donor-5.svg'
  },
  {
    role: 'donar', name: 'Teja Demo', email: 'demo.vijayawada.01@raktsetu.test',
    address: 'Benz Circle, Vijayawada, Andhra Pradesh', phone: '9000000106',
    bloodGroup: 'A-', location: { lat: 16.4972, lng: 80.6565 }, profilePic: '/demo-profiles/donor-1.svg'
  },
  {
    role: 'donar', name: 'Divya Demo', email: 'demo.vijayawada.02@raktsetu.test',
    address: 'Governorpet, Vijayawada, Andhra Pradesh', phone: '9000000107',
    bloodGroup: 'B-', location: { lat: 16.5193, lng: 80.6295 }, profilePic: '/demo-profiles/donor-2.svg'
  },
  {
    role: 'donar', name: 'Arjun Demo', email: 'demo.vijayawada.03@raktsetu.test',
    address: 'Kanuru, Vijayawada, Andhra Pradesh', phone: '9000000108',
    bloodGroup: 'AB-', location: { lat: 16.479, lng: 80.698 }, profilePic: '/demo-profiles/donor-3.svg'
  },
  {
    role: 'donar', name: 'Lakshmi Demo', email: 'demo.vijayawada.04@raktsetu.test',
    address: 'Poranki, Vijayawada, Andhra Pradesh', phone: '9000000109',
    bloodGroup: 'O+', location: { lat: 16.481, lng: 80.713 }, profilePic: '/demo-profiles/donor-4.svg'
  },
  {
    role: 'donar', name: 'Nikhil Demo', email: 'demo.vijayawada.05@raktsetu.test',
    address: 'Patamata, Vijayawada, Andhra Pradesh', phone: '9000000110',
    bloodGroup: 'A+', location: { lat: 16.5007, lng: 80.6718 }, profilePic: '/demo-profiles/donor-5.svg'
  },
  {
    role: 'hospital', hospitalName: 'Gudivada Community Hospital (Demo)',
    email: 'demo.hospital.gudivada@raktsetu.test',
    address: 'Gudivada, Krishna District, Andhra Pradesh', phone: '9000000201',
    location: { lat: 16.4353, lng: 80.9955 }
  },
  {
    role: 'hospital', hospitalName: 'Vijayawada Community Hospital (Demo)',
    email: 'demo.hospital.vijayawada@raktsetu.test',
    address: 'Benz Circle, Vijayawada, Andhra Pradesh', phone: '9000000202',
    location: { lat: 16.4972, lng: 80.6565 }
  }
];

async function seedRegionalData() {
  const db = getDb();
  const password = await bcryptjs.hash('demo123', await bcryptjs.genSalt(10));
  let created = 0;
  let skipped = 0;

  try {
    for (const userData of regionalUsers) {
      if (await userModel.findOne({ email: userData.email })) {
        if (userData.role === 'donar') {
          getDb().prepare("UPDATE users SET profilePic = ?, updatedAt = ? WHERE email = ? AND (profilePic IS NULL OR profilePic = '')")
            .run(userData.profilePic, new Date().toISOString(), userData.email);
        }
        skipped++;
        continue;
      }

      const user = new userModel({
        ...userData,
        password,
        isAvailable: true
      });
      await user.save();
      created++;
    }

    console.log(`Regional demo data ready: ${created} created, ${skipped} already present.`);
    console.log('Demo account password: demo123');
  } finally {
    db.close();
  }
}

seedRegionalData().catch(error => {
  console.error('Could not seed regional demo data:', error);
  process.exitCode = 1;
});
