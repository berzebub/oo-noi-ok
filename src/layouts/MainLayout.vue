<template>
  <q-layout view="lHh Lpr lFf" class="mobile-layout">
    <!-- Top Header - สำหรับ Mobile/iPad -->
    <q-header elevated class="bg-gradient-primary text-white mobile-header">
      <q-toolbar class="q-pa-md">
        <q-toolbar-title class="text-center">
          <div class="header-title">
            <q-icon name="sports_tennis" size="md" class="q-mr-sm animate-pulse" />
            <span class="text-h5">Quick Badmin</span>
          </div>
          <div class="text-caption header-subtitle">
            ระบบจับคู่แบดมินตันอัตโนมัติ
          </div>
        </q-toolbar-title>

        <div class="header-actions">
          <!-- User Menu -->
          <q-btn-dropdown
            v-if="authStore.isLoggedIn"
            flat
            dense
            rounded
            class="user-menu"
          >
            <template v-slot:label>
              <div class="user-info">
                <q-avatar size="32px">
                  <img
                    v-if="authStore.userPhotoURL && !authStore.isOfflineMode"
                    :src="authStore.userPhotoURL"
                    :alt="authStore.userDisplayName"
                  >
                  <q-icon v-else name="account_circle" />
                </q-avatar>
              </div>
            </template>

            <q-list>
              <q-item>
                <q-item-section>
                  <q-item-label class="text-weight-bold">
                    {{ authStore.isOfflineMode ? 'โหมดออฟไลน์' : authStore.userDisplayName }}
                  </q-item-label>
                  <q-item-label caption v-if="!authStore.isOfflineMode">
                    {{ authStore.userEmail }}
                  </q-item-label>
                </q-item-section>
              </q-item>

              <q-separator />

              <q-item clickable @click="handleLogout">
                <q-item-section avatar>
                  <q-icon name="logout" />
                </q-item-section>
                <q-item-section>ออกจากระบบ</q-item-section>
              </q-item>
            </q-list>
          </q-btn-dropdown>

          <q-btn
            flat
            dense
            round
            icon="info"
            @click="showInfo = true"
            size="lg"
            class="info-btn"
          />
        </div>
      </q-toolbar>
    </q-header>

    <!-- Main Content -->
    <q-page-container class="mobile-content">
      <router-view />
    </q-page-container>

    <!-- Bottom Navigation - เมนูหลักสำหรับ Mobile/iPad -->
    <q-footer elevated class="bg-white text-grey-8 mobile-footer">
      <div class="bottom-nav">
        <div
          v-for="(item, index) in bottomNavItems"
          :key="item.link"
          class="nav-item"
          :class="{ 'nav-item-active': $route.path === item.link }"
          @click="$router.push(item.link)"
        >
          <q-icon
            :name="item.icon"
            size="lg"
            :color="$route.path === item.link ? item.color : 'grey-6'"
            class="nav-icon"
          />
          <div
            class="nav-label"
            :class="$route.path === item.link ? `text-${item.color}` : 'text-grey-6'"
          >
            {{ item.title }}
          </div>
          <div
            v-if="$route.path === item.link"
            class="nav-indicator"
            :style="`background: var(--q-${item.color})`"
          />
        </div>
      </div>
    </q-footer>

    <!-- Floating Quick Action Button -->
    <q-btn
      v-if="$route.path === '/'"
      fab
      icon="shuffle"
      color="primary"
      class="mobile-fab animate-pulse"
      @click="quickMatch"
      size="lg"
    >
      <q-tooltip class="bg-primary text-white" :offset="[10, 10]">
        จับคู่เร็ว
      </q-tooltip>
    </q-btn>

    <!-- Info Dialog -->
    <q-dialog v-model="showInfo" class="mobile-dialog">
      <q-card class="modern-card info-card">
        <q-card-section class="bg-gradient-primary text-white text-center">
          <q-icon name="sports_tennis" size="3rem" class="q-mb-md animate-bounce" />
          <div class="text-h5">Quick Badmin</div>
          <div class="text-subtitle2">v2.0 Mobile Edition</div>
        </q-card-section>

        <q-card-section class="q-pa-lg">
          <div class="feature-list">
            <div class="feature-item">
              <q-icon name="done" color="positive" size="sm" />
              <span>จับคู่อัตโนมัติ 1 คลิก</span>
            </div>
            <div class="feature-item">
              <q-icon name="done" color="positive" size="sm" />
              <span>ป้องกันคู่ซ้ำในเซสชั่น</span>
            </div>
            <div class="feature-item">
              <q-icon name="done" color="positive" size="sm" />
              <span>คำนวณเงินอัตโนมัติ</span>
            </div>
            <div class="feature-item">
              <q-icon name="done" color="positive" size="sm" />
              <span>เหมาะสำหรับ iPad/มือถือ</span>
            </div>
            <div class="feature-item">
              <q-icon name="done" color="positive" size="sm" />
              <span>ไม่ต้องใช้อินเทอร์เน็ต</span>
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="center" class="q-pa-lg">
          <q-btn
            label="เริ่มใช้งาน"
            color="primary"
            size="lg"
            class="full-width"
            v-close-popup
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Loading Overlay -->
    <q-inner-loading :showing="isLoading">
      <q-spinner-dots size="50px" color="primary" />
      <div class="text-primary q-mt-md">กำลังจับคู่...</div>
    </q-inner-loading>
  </q-layout>
</template>

<script>
import { defineComponent, ref } from 'vue'
import { useBadmintonStore } from 'src/stores/badminton-store'
import { useAuthStore } from 'src/stores/auth-store'
import { storeToRefs } from 'pinia'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'

export default defineComponent({
  name: 'MainLayout',

  setup () {
    const $q = useQuasar()
    const router = useRouter()
    const showInfo = ref(false)
    const isLoading = ref(false)
    const badmintonStore = useBadmintonStore()
    const authStore = useAuthStore()
    const { activePlayers } = storeToRefs(badmintonStore)

    // Bottom Navigation สำหรับ Mobile/iPad
    const bottomNavItems = [
      {
        title: 'หน้าหลัก',
        icon: 'home',
        link: '/',
        color: 'primary'
      },
      {
        title: 'ผู้เล่น',
        icon: 'group',
        link: '/players',
        color: 'blue'
      },
      {
        title: 'จับคู่',
        icon: 'shuffle',
        link: '/matching',
        color: 'purple'
      },
      {
        title: 'ค่าใช้จ่าย',
        icon: 'payments',
        link: '/payment',
        color: 'green'
      },
      {
        title: 'เพิ่มเติม',
        icon: 'apps',
        link: '/settings',
        color: 'orange'
      }
    ]

    const quickMatch = async () => {
      if (activePlayers.value.length < 4) {
        $q.notify({
          type: 'warning',
          message: 'ต้องมีผู้เล่นอย่างน้อย 4 คน',
          position: 'top',
          timeout: 2000,
          icon: 'warning'
        })
        return
      }

      isLoading.value = true

      // จำลองการประมวลผล
      setTimeout(() => {
        const matches = badmintonStore.generateMatches()
        isLoading.value = false

        if (matches.length > 0) {
          $q.notify({
            type: 'positive',
            message: `🎯 จับคู่สำเร็จ ${matches.length} คอร์ด!`,
            position: 'top',
            timeout: 3000,
            icon: 'celebration',
            actions: [
              {
                label: 'ดูผล',
                color: 'white',
                handler: () => {
                  // จะไปหน้าหลักซึ่งแสดงผลการจับคู่
                }
              }
            ]
          })
        } else {
          $q.notify({
            type: 'negative',
            message: 'ไม่สามารถจับคู่ได้ กรุณาตรวจสอบจำนวนผู้เล่น',
            position: 'top',
            timeout: 3000
          })
        }
      }, 1500)
    }

    const handleLogout = async () => {
      $q.dialog({
        title: 'ออกจากระบบ',
        message: 'ต้องการออกจากระบบหรือไม่?',
        cancel: true,
        persistent: true,
        ok: {
          label: 'ออกจากระบบ',
          color: 'negative'
        },
        cancel: {
          label: 'ยกเลิก',
          flat: true
        }
      }).onOk(async () => {
        const success = await authStore.logout()
        if (success) {
          $q.notify({
            type: 'positive',
            message: 'ออกจากระบบแล้ว',
            position: 'top'
          })
          router.push('/login')
        }
      })
    }

    return {
      showInfo,
      isLoading,
      bottomNavItems,
      quickMatch,
      authStore,
      handleLogout
    }
  }
})
</script>

<style scoped>
/* Mobile/iPad Layout */
.mobile-layout {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

.mobile-header {
  border-radius: 0 0 24px 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.header-title {
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.header-subtitle {
  opacity: 0.9;
  margin-top: 2px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-menu {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 20px;
}

.user-info {
  display: flex;
  align-items: center;
}

.info-btn {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}

.mobile-content {
  padding-bottom: 80px; /* เผื่อพื้นที่สำหรับ bottom nav */
}

.mobile-footer {
  border-radius: 24px 24px 0 0;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(0, 0, 0, 0.05);
}

.bottom-nav {
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 8px 0;
  height: 70px;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  border-radius: 16px;
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  cursor: pointer;
  position: relative;
  min-width: 60px;
}

.nav-item:active {
  transform: scale(0.95);
}

.nav-item-active {
  background: rgba(25, 118, 210, 0.05);
  transform: translateY(-2px);
}

.nav-icon {
  transition: all 0.3s ease;
  margin-bottom: 4px;
}

.nav-item-active .nav-icon {
  transform: scale(1.1);
}

.nav-label {
  font-size: 11px;
  font-weight: 600;
  text-align: center;
  transition: all 0.3s ease;
}

.nav-indicator {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 32px;
  height: 3px;
  border-radius: 2px;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    width: 0;
  }
  to {
    width: 32px;
  }
}

.mobile-fab {
  position: fixed !important;
  bottom: 90px;
  right: 24px;
  z-index: 1000;
  box-shadow: 0 8px 25px rgba(25, 118, 210, 0.4) !important;
  background: linear-gradient(135deg, #1976d2 0%, #42a5f5 100%) !important;
}

.mobile-fab:hover {
  transform: scale(1.1) rotate(5deg);
}

.mobile-dialog .q-dialog__inner {
  padding: 16px;
}

.info-card {
  max-width: 400px;
  width: 90vw;
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  font-size: 16px;
}

/* Responsive Design */
@media (max-width: 768px) {
  .mobile-header .q-toolbar {
    min-height: 64px;
  }

  .nav-label {
    font-size: 10px;
  }

  .bottom-nav {
    height: 65px;
  }

  .mobile-content {
    padding-bottom: 75px;
  }
}

@media (min-width: 768px) and (max-width: 1024px) {
  /* iPad Styles */
  .nav-item {
    padding: 12px 16px;
    min-width: 80px;
  }

  .nav-label {
    font-size: 12px;
  }

  .bottom-nav {
    height: 75px;
    padding: 12px 0;
  }

  .mobile-fab {
    bottom: 95px;
    right: 32px;
  }
}

/* Animation เสริม */
.nav-item:hover {
  background: rgba(25, 118, 210, 0.08);
}

.nav-item:hover .nav-icon {
  transform: scale(1.05);
}

/* Dark mode support */
.body--dark .mobile-footer {
  background: rgba(30, 30, 30, 0.95);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.body--dark .nav-item-active {
  background: rgba(25, 118, 210, 0.15);
}
</style>
