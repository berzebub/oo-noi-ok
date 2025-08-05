<template>
  <q-page class="settings-page">
    <!-- Header -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">ตั้งค่าการเล่น</h1>
        <p class="page-subtitle">ปรับแต่งจำนวนคอร์ดและเวลาการเล่น</p>
      </div>
    </div>

    <!-- Settings Cards -->
    <div class="settings-container">
      <!-- Courts Setting -->
      <q-card class="setting-card">
        <q-card-section class="card-header">
          <div class="setting-icon">
            <q-icon name="sports_tennis" size="2rem" color="white" />
          </div>
          <div class="setting-info">
            <h3 class="setting-title">จำนวนคอร์ด</h3>
            <p class="setting-desc">กำหนดจำนวนคอร์ดที่ใช้เล่น</p>
          </div>
        </q-card-section>

        <q-card-section class="setting-content">
          <div class="input-wrapper">
            <q-input v-model.number="localSettings.courts" type="number" outlined min="1" max="10" class="modern-input"
              :rules="[val => val > 0 || 'ต้องมากกว่า 0']" />
            <div class="input-controls">
              <q-btn round flat icon="remove" @click="adjustCourts(-1)" :disable="localSettings.courts <= 1"
                class="control-btn" />
              <q-btn round flat icon="add" @click="adjustCourts(1)" :disable="localSettings.courts >= 10"
                class="control-btn" />
            </div>
          </div>
          <div class="setting-note">
            ระหว่าง 1-10 คอร์ด
          </div>
        </q-card-section>
      </q-card>

      <!-- Hours Setting -->
      <q-card class="setting-card">
        <q-card-section class="card-header">
          <div class="setting-icon hours-icon">
            <q-icon name="schedule" size="2rem" color="white" />
          </div>
          <div class="setting-info">
            <h3 class="setting-title">จำนวนชั่วโมง</h3>
            <p class="setting-desc">กำหนดจำนวนชั่วโมงต่อเซสชั่น</p>
          </div>
        </q-card-section>

        <q-card-section class="setting-content">
          <div class="input-wrapper">
            <q-input v-model.number="localSettings.hoursPerSession" type="number" outlined min="0.5" max="8" step="0.5"
              class="modern-input" :rules="[val => val > 0 || 'ต้องมากกว่า 0']" />
            <div class="input-controls">
              <q-btn round flat icon="remove" @click="adjustHours(-0.5)" :disable="localSettings.hoursPerSession <= 0.5"
                class="control-btn" />
              <q-btn round flat icon="add" @click="adjustHours(0.5)" :disable="localSettings.hoursPerSession >= 8"
                class="control-btn" />
            </div>
          </div>
          <div class="setting-note">
            ระหว่าง 0.5-8 ชั่วโมง
          </div>
        </q-card-section>
      </q-card>

      <!-- Winner Stays On Setting -->
      <q-card class="setting-card">
        <q-card-section class="card-header">
          <div class="setting-icon winner-icon">
            <q-icon name="emoji_events" size="2rem" color="white" />
          </div>
          <div class="setting-info">
            <h3 class="setting-title">Winner Stays On</h3>
            <p class="setting-desc">ทีมชนะอยู่ต่อได้กี่เกมส์</p>
          </div>
        </q-card-section>

        <q-card-section class="setting-content">
          <div class="input-wrapper">
            <q-input v-model.number="localSettings.winnerStaysOnWins" type="number" outlined min="1" max="5"
              class="modern-input" :rules="[val => val > 0 || 'ต้องมากกว่า 0']" />
            <div class="input-controls">
              <q-btn round flat icon="remove" @click="adjustWinnerStays(-1)"
                :disable="localSettings.winnerStaysOnWins <= 1" class="control-btn" />
              <q-btn round flat icon="add" @click="adjustWinnerStays(1)" :disable="localSettings.winnerStaysOnWins >= 5"
                class="control-btn" />
            </div>
          </div>
          <div class="setting-note">
            ระหว่าง 1-5 เกมส์ (ชนะติดต่อกันเท่านี้แล้วต้องออกพัก)
          </div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Summary -->
    <q-card class="summary-card">
      <q-card-section>
        <div class="summary-content">
          <div class="summary-item">
            <q-icon name="sports_tennis" color="primary" size="1.5rem" />
            <span class="summary-text">{{ localSettings.courts }} คอร์ด</span>
          </div>
          <div class="summary-divider">×</div>
          <div class="summary-item">
            <q-icon name="schedule" color="green" size="1.5rem" />
            <span class="summary-text">{{ localSettings.hoursPerSession }} ชั่วโมง</span>
          </div>
          <div class="summary-divider">=</div>
          <div class="summary-result">
            <span class="result-text">{{ totalCourtHours }} คอร์ด-ชั่วโมง</span>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Action Buttons -->
    <div class="action-buttons">
      <q-btn color="positive" size="lg" label="บันทึกการตั้งค่า" icon="save" @click="saveSettings" class="save-btn"
        :loading="saving" />
      <q-btn color="grey-6" size="lg" label="รีเซ็ต" icon="refresh" @click="resetToDefault" flat class="reset-btn" />
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useBadmintonStore } from 'stores/badminton-store'
import { useAuthStore } from 'stores/auth-store'
import { useQuasar } from 'quasar'
// Firebase imports removed - now handled in badminton-store.js

const $q = useQuasar()
const badmintonStore = useBadmintonStore()
const authStore = useAuthStore()

const saving = ref(false)
const localSettings = ref({
  courts: badmintonStore.gameSettings.courts,
  hoursPerSession: badmintonStore.gameSettings.hoursPerSession,
  winnerStaysOnWins: badmintonStore.gameSettings.winnerStaysOnWins || 2
})

// Computed
const totalCourtHours = computed(() => {
  return localSettings.value.courts * localSettings.value.hoursPerSession
})

// Functions
const adjustCourts = (amount) => {
  const newValue = localSettings.value.courts + amount
  if (newValue >= 1 && newValue <= 10) {
    localSettings.value.courts = newValue
  }
}

const adjustHours = (amount) => {
  const newValue = localSettings.value.hoursPerSession + amount
  if (newValue >= 0.5 && newValue <= 8) {
    localSettings.value.hoursPerSession = newValue
  }
}

const adjustWinnerStays = (amount) => {
  const newValue = localSettings.value.winnerStaysOnWins + amount
  if (newValue >= 1 && newValue <= 5) {
    localSettings.value.winnerStaysOnWins = newValue
  }
}

// Note: Firestore functions have been moved to badminton-store.js for better centralization

const saveSettings = async () => {
  saving.value = true

  try {
    // ใช้ฟังก์ชันใหม่ใน store ที่จัดการทั้ง local update และ Firestore
    const result = await badmintonStore.updateGameSettingsWithFirestore(
      localSettings.value,
      authStore.isOfflineMode ? null : authStore.userId
    )

    if (result.success) {
      $q.notify({
        type: 'positive',
        message: `✅ บันทึกการตั้งค่าแล้ว!${authStore.isOfflineMode ? ' (ออฟไลน์)' : ''}`,
        position: 'top',
        timeout: 3000
      })
    } else {
      throw new Error(result.error || 'Unknown error')
    }
  } catch (error) {
    console.error('Error saving settings:', error)
    $q.notify({
      type: 'negative',
      message: 'เกิดข้อผิดพลาดในการบันทึก',
      position: 'top'
    })
  }

  saving.value = false
}

const resetToDefault = async () => {
  $q.dialog({
    title: 'รีเซ็ตการตั้งค่า',
    message: 'ต้องการรีเซ็ตเป็นค่าเริ่มต้นหรือไม่?',
    ok: {
      label: 'รีเซ็ต',
      color: 'warning'
    },
    cancel: {
      label: 'ยกเลิก',
      color: 'grey'
    },
    persistent: true
  }).onOk(async () => {
    const defaultSettings = {
      courts: 2,
      hoursPerSession: 2,
      winnerStaysOnWins: 2
    }

    localSettings.value = defaultSettings

    // Save default settings using store function
    try {
      const result = await badmintonStore.updateGameSettingsWithFirestore(
        defaultSettings,
        authStore.isOfflineMode ? null : authStore.userId
      )

      if (!result.success) {
        console.error('Error saving reset settings:', result.error)
      }
    } catch (error) {
      console.error('Error saving reset settings:', error)
    }

    $q.notify({
      type: 'warning',
      message: '🔄 รีเซ็ตการตั้งค่าเป็นค่าเริ่มต้นแล้ว',
      position: 'top',
      timeout: 3000
    })
  })
}

// Load settings on component mount
onMounted(async () => {
  if (authStore.isLoggedIn && !authStore.isOfflineMode) {
    // ใช้ฟังก์ชันใหม่จาก store
    const result = await badmintonStore.loadGameSettingsFromFirestore(authStore.userId)

    if (result && result.success) {
      // อัพเดท local settings ให้ตรงกับ store
      localSettings.value = {
        courts: badmintonStore.gameSettings.courts,
        hoursPerSession: badmintonStore.gameSettings.hoursPerSession,
        winnerStaysOnWins: badmintonStore.gameSettings.winnerStaysOnWins || 2
      }
      console.log('Settings loaded successfully')
    } else {
      console.warn('Failed to load settings from Firestore, using defaults')
    }
  }
})

// Watch for external changes
watch(() => badmintonStore.gameSettings, (newSettings) => {
  localSettings.value = {
    courts: newSettings.courts,
    hoursPerSession: newSettings.hoursPerSession,
    winnerStaysOnWins: newSettings.winnerStaysOnWins || 2
  }
}, { deep: true })
</script>

<style scoped>
.settings-page {
  padding: 24px;
  max-width: 800px;
  margin: 0 auto;
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

/* Header */
.page-header {
  text-align: center;
  margin-bottom: 40px;
}

.page-title {
  font-size: 2.5rem;
  font-weight: bold;
  color: #333;
  margin: 0 0 8px 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.page-subtitle {
  font-size: 1.1rem;
  color: #666;
  margin: 0;
}

/* Settings Container */
.settings-container {
  display: grid;
  gap: 24px;
  margin-bottom: 32px;
}

/* Setting Card */
.setting-card {
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: none;
  overflow: hidden;
  background: white;
  transition: all 0.3s ease;
}

.setting-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

.card-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.hours-icon {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%) !important;
}

.winner-icon {
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%) !important;
}

.setting-icon {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.setting-title {
  font-size: 1.4rem;
  font-weight: bold;
  margin: 0 0 4px 0;
}

.setting-desc {
  font-size: 0.9rem;
  opacity: 0.9;
  margin: 0;
}

.setting-content {
  padding: 24px;
}

.input-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.modern-input {
  flex: 1;
}

.modern-input :deep(.q-field__control) {
  border-radius: 12px;
  font-size: 1.2rem;
  font-weight: bold;
  text-align: center;
}

.input-controls {
  display: flex;
  gap: 8px;
}

.control-btn {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border: 2px solid #e0e0e0;
  transition: all 0.2s ease;
}

.control-btn:hover {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: transparent;
}

.setting-note {
  font-size: 0.85rem;
  color: #666;
  text-align: center;
  font-style: italic;
}

/* Summary Card */
.summary-card {
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  margin-bottom: 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.summary-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  flex-wrap: wrap;
  padding: 8px 0;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.1);
  padding: 12px 16px;
  border-radius: 12px;
}

.summary-text {
  font-size: 1.1rem;
  font-weight: bold;
}

.summary-divider {
  font-size: 1.5rem;
  font-weight: bold;
  opacity: 0.7;
}

.summary-result {
  background: rgba(255, 255, 255, 0.2);
  padding: 16px 24px;
  border-radius: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.result-text {
  font-size: 1.2rem;
  font-weight: bold;
}

/* Action Buttons */
.action-buttons {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

.save-btn {
  min-width: 200px;
  border-radius: 12px;
  font-weight: bold;
  padding: 12px 32px;
  background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
}

.reset-btn {
  min-width: 120px;
  border-radius: 12px;
  font-weight: bold;
  padding: 12px 24px;
}

/* Responsive */
@media (max-width: 600px) {
  .settings-page {
    padding: 16px;
  }

  .page-title {
    font-size: 2rem;
  }

  .card-header {
    padding: 20px;
  }

  .setting-content {
    padding: 20px;
  }

  .summary-content {
    flex-direction: column;
    gap: 12px;
  }

  .action-buttons {
    flex-direction: column;
    align-items: center;
  }

  .save-btn {
    min-width: 100%;
  }
}
</style>
