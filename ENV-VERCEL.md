# Variáveis de Ambiente - Vercel
# Configure em: Vercel Dashboard → Settings → Environment Variables

# ===========================================
# FIREBASE CLIENT (Next.js Public)
# ===========================================

NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBcp2qNpvhXHszEXmyW96plVxR9_FTAn6c
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=vitalcar-87179.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=vitalcar-87179

# ===========================================
# FIREBASE ADMIN (Server-side only)
# ===========================================

FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@vitalcar-87179.iam.gserviceaccount.com

# IMPORTANTE: Private key COM \n literais (não quebras reais)
# Use o script abaixo para gerar:
# node -e "const fs=require('fs');const j=JSON.parse(require('fs').readFileSync('service-account.json'));console.log(j.private_key.replace(/\\n/g,'\\\\n'))"
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQD...\n-----END PRIVATE KEY-----\n"

# ===========================================
# CONFIGURAÇÕES NO VERCEL DASHBOARD
# ===========================================

# Settings → Environment Variables
# Todas marcadas: ✅ Production  ✅ Preview  ✅ Development
# Type: Plain Text (NÃO marque "Secret" - o Vercel já criptografa)

# Build & Output Settings:
# Build Command: cd saas && npm run build
# Output Directory: saas/.next
# Root Directory: ./

# ===========================================
# SCRIPT PARA FORMATAR PRIVATE KEY
# ===========================================

# Coloque service-account.json na pasta e rode:
# node -e "
# const fs = require('fs');
# const json = JSON.parse(fs.readFileSync('service-account.json', 'utf8'));
# console.log('--- COPIE PARA VERCEL ---');
# console.log(json.private_key.replace(/\\n/g, '\\\\n'));
# "

# Saída esperada (copie TUDO para o Vercel):
# -----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQD...\n-----END PRIVATE KEY-----\n

# ===========================================
# REGRAS FIRESTORE (Console Firebase → Firestore → Regras)
# ===========================================

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isAdmin() {
      return request.auth != null && request.auth.token.admin == true;
    }
    
    function isValidOrder(data) {
      return data.origem == 'site' &&
             data.uid == 'anon' &&
             data.status == 'pendente';
    }

    match /config/{docId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /ordens/{ordemId} {
      allow read: if request.auth != null;
      
      allow create: if 
        request.resource.data.origem == 'site' &&
        request.resource.data.uid == 'anon' &&
        request.resource.data.status == 'pendente';
      
      allow create, update, delete: if isAdmin();
    }

    match /{document=**} {
      allow read, write: if isAdmin();
    }
  }
}

# ===========================================
# CHECKLIST DE DEPLOY
# ===========================================

☐ FIREBASE_ADMIN_PRIVATE_KEY no Vercel com \n literais
☐ FIREBASE_ADMIN_CLIENT_EMAIL correto
☐ NEXT_PUBLIC_FIREBASE_PROJECT_ID = vitalcar-87179
☐ Regras do Firestore publicadas (permite origem == 'site')
☐ lib/firebase-admin.ts usa getApps().length === 0
☐ app/api/orders/route.ts usa getFirebaseAdmin()
☐ Teste local funciona (npm run dev → POST localhost:3000/api/orders)
☐ Deploy no Vercel → testa em produção