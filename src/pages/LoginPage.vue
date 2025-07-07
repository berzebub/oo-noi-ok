<template>
  <div class="login-page">
    <div class="login-container">
      <!-- Header Logo -->
      <div class="logo-section">
        <q-icon name="sports_tennis" size="5rem" color="primary" class="logo-icon" />
        <h1 class="app-title">Quick Badmin</h1>
        <p class="app-subtitle">ระบบจับคู่แบดมินตันอัตโนมัติ</p>
      </div>

      <!-- Login Form -->
      <q-card class="login-card">
        <q-card-section class="text-center q-pa-xl">
          <div class="login-title">ยินดีต้อนรับ</div>
          <div class="login-subtitle">เข้าสู่ระบบเพื่อเริ่มใช้งาน</div>

          <!-- Google Sign In Button -->
          <q-btn
            class="google-btn"
            :loading="isLoading"
            :disable="isLoading"
            @click="signInWithGoogle"
            size="lg"
            rounded
            unelevated
          >
            <q-avatar size="24px" class="q-mr-sm">
              <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google">
            </q-avatar>
            <span>เข้าสู่ระบบด้วย Google</span>
          </q-btn>

          <div class="features-text">
            <div class="feature-item">
              <q-icon name="cloud" color="primary" size="sm" />
              <span>ข้อมูลจะถูกเก็บบน Cloud อัตโนมัติ</span>
            </div>
            <div class="feature-item">
              <q-icon name="security" color="positive" size="sm" />
              <span>ปลอดภัยด้วย Google Authentication</span>
            </div>
          </div>
        </q-card-section>
      </q-card>

      <!-- Demo Mode -->
      <div class="demo-section">
        <q-btn
          flat
          color="grey-7"
          label="ใช้งานแบบออฟไลน์ (ไม่เซฟข้อมูล)"
          icon="cloud_off"
          @click="enterOfflineMode"
          size="md"
          class="demo-btn"
        />
      </div>
    </div>

    <!-- Background Animation -->
    <div class="bg-animation">
      <div class="floating-icon icon-1">
        <q-icon name="sports_tennis" size="md" color="primary" />
      </div>
      <div class="floating-icon icon-2">
        <q-icon name="groups" size="lg" color="blue" />
      </div>
      <div class="floating-icon icon-3">
        <q-icon name="shuffle" size="sm" color="purple" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { auth } from 'boot/firebase'

const router = useRouter()
const $q = useQuasar()
const isLoading = ref(false)

// Google Sign In
const signInWithGoogle = async () => {
  isLoading.value = true

  try {
    const provider = new GoogleAuthProvider()
    provider.addScope('email')
    provider.addScope('profile')

    const result = await signInWithPopup(auth, provider)
    const user = result.user

    $q.notify({
      type: 'positive',
      message: `ยินดีต้อนรับ ${user.displayName}!`,
      position: 'top',
      timeout: 3000
    })

    // Redirect to main page
    router.push('/')

  } catch (error) {
    console.error('Authentication error:', error)

    let message = 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ'

    if (error.code === 'auth/popup-closed-by-user') {
      message = 'การเข้าสู่ระบบถูกยกเลิก'
    } else if (error.code === 'auth/popup-blocked') {
      message = 'Popup ถูกบล็อค กรุณาอนุญาตและลองใหม่'
    }

    $q.notify({
      type: 'negative',
      message,
      position: 'top',
      timeout: 5000
    })
  } finally {
    isLoading.value = false
  }
}

// Enter offline mode
const enterOfflineMode = () => {
  $q.dialog({
    title: 'โหมดออฟไลน์',
    message: 'ในโหมดนี้ข้อมูลจะไม่ถูกเซฟ และจะหายไปเมื่อปิดแอป ต้องการดำเนินการต่อหรือไม่?',
    cancel: true,
    persistent: true,
    ok: {
      label: 'ใช้งานออฟไลน์',
      color: 'orange'
    },
    cancel: {
      label: 'ยกเลิก',
      flat: true
    }
  }).onOk(() => {
    // Set offline mode flag
    localStorage.setItem('offlineMode', 'true')

    $q.notify({
      type: 'info',
      message: 'เข้าสู่โหมดออฟไลน์',
      position: 'top'
    })

    router.push('/')
  })
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  position: relative;
  overflow: hidden;
}

.login-container {
  width: 100%;
  max-width: 400px;
  z-index: 2;
}

.logo-section {
  text-align: center;
  margin-bottom: 40px;
}

.logo-icon {
  animation: bounce 2s infinite;
}

.app-title {
  color: white;
  font-size: 3rem;
  font-weight: bold;
  margin: 16px 0 8px;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

.app-subtitle {
  color: rgba(255, 255, 255, 0.9);
  font-size: 1.1rem;
  margin: 0;
}

.login-card {
  border-radius: 24px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.95);
  margin-bottom: 30px;
}

.login-title {
  font-size: 28px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
}

.login-subtitle {
  color: #666;
  font-size: 16px;
  margin-bottom: 32px;
}

.google-btn {
  width: 100%;
  height: 56px;
  background: white;
  color: #333;
  border: 2px solid #e0e0e0;
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 24px;
  transition: all 0.3s ease;
}

.google-btn:hover {
  border-color: #1976d2;
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(25, 118, 210, 0.2);
}

.features-text {
  margin-top: 20px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.demo-section {
  text-align: center;
}

.demo-btn {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
}

.demo-btn:hover {
  color: white;
  background: rgba(255, 255, 255, 0.1);
}

/* Background Animation */
.bg-animation {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.floating-icon {
  position: absolute;
  animation: float 6s ease-in-out infinite;
  opacity: 0.1;
}

.icon-1 {
  top: 10%;
  left: 10%;
  animation-delay: 0s;
}

.icon-2 {
  top: 60%;
  right: 10%;
  animation-delay: 2s;
}

.icon-3 {
  bottom: 20%;
  left: 20%;
  animation-delay: 4s;
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-20px);
  }
  60% {
    transform: translateY(-10px);
  }
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px) rotate(0deg);
  }
  33% {
    transform: translateY(-20px) rotate(5deg);
  }
  66% {
    transform: translateY(10px) rotate(-5deg);
  }
}

/* Responsive */
@media (max-width: 768px) {
  .login-page {
    padding: 16px;
  }

  .app-title {
    font-size: 2.5rem;
  }

  .login-card {
    margin-bottom: 20px;
  }
}
</style>
