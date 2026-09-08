import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDfr-tttFSGNly3nnl3gx01dnE3tStF9Ts',
  authDomain: 'gen-lang-client-0221694504.firebaseapp.com',
  projectId: 'gen-lang-client-0221694504',
  storageBucket: 'gen-lang-client-0221694504.firebasestorage.app',
  messagingSenderId: '54261765103',
  appId: '1:54261765103:web:0b2b8c94eb1583d78c3b77',
  measurementId: 'G-DEX2G3633M',
  firestoreDatabaseId: 'ai-studio-f2ba9a56-580b-4d13-9d23-b9aadffae8f1'
};

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId);

const collectionsToInspect = [
  'companies',
  'company_users',
  'contacts',
  'services',
  'products',
  'cxc',
  'cxp',
  'cobranzas',
  'pagos-realizados',
  'accounting-entries',
  'bank-transactions',
  'banks',
  'accounting-accounts',
  'fixed-assets',
  'accounting-config'
];

async function run() {
  console.log('Conectando a Firebase Firestore...');
  for (const colName of collectionsToInspect) {
    try {
      const snap = await getDocs(collection(db, colName));
      console.log(`[OK] Coleccion '${colName}': ${snap.size} documentos`);
      if (snap.size > 0 && snap.size <= 2) {
        snap.forEach(d => console.log('   -> Ejemplo:', d.id, JSON.stringify(d.data()).substring(0, 120)));
      }
    } catch (err: any) {
      console.log(`[FALLO] Coleccion '${colName}':`, err.message);
    }
  }
  process.exit(0);
}

run();
