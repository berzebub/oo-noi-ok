<template>
  <q-page class="players-page">
    <!-- Header -->
    <div class="page-header">
      <div class="header-content">
        <h4 class="page-title">จัดการผู้เล่น</h4>
        <p class="page-subtitle">เพิ่ม แก้ไข และจัดการสถานะผู้เล่น</p>
      </div>
      <q-btn
        color="primary"
        label="เพิ่มผู้เล่น"
        icon="person_add"
        @click="openAddDialog"
        size="lg"
        rounded
      />
    </div>

    <!-- Quick Stats -->
    <div class="stats-row">
      <div class="stat-card">
        <q-icon name="group" size="lg" color="primary" />
        <div class="stat-content">
          <div class="stat-number">{{ totalPlayers }}</div>
          <div class="stat-label">ผู้เล่นทั้งหมด</div>
        </div>
      </div>

      <div class="stat-card">
        <q-icon name="sports_tennis" size="lg" color="green" />
        <div class="stat-content">
          <div class="stat-number">{{ activePlayers.length }}</div>
          <div class="stat-label">พร้อมเล่น</div>
        </div>
      </div>
    </div>

    <!-- Player List -->
    <q-card class="players-card">
      <q-card-section>
        <div class="list-header">
          <h6 class="list-title">รายชื่อผู้เล่น</h6>
          <div class="player-count">{{ players.length }} คน</div>
        </div>

        <!-- Empty State -->
        <div v-if="players.length === 0" class="empty-state">
          <q-icon name="group_off" size="4rem" color="grey-5" />
          <div class="empty-title">ยังไม่มีผู้เล่น</div>
          <div class="empty-subtitle">เพิ่มผู้เล่นคนแรกเพื่อเริ่มต้น</div>
          <q-btn
            color="primary"
            label="เพิ่มผู้เล่น"
            icon="person_add"
            @click="openAddDialog"
            class="q-mt-md"
            rounded
          />
        </div>

        <!-- Player Grid -->
        <div v-else class="players-grid">
          <div
            v-for="player in players"
            :key="player.id"
            class="player-card"
            :class="{ 'inactive': !player.isActive }"
          >
            <div class="player-avatar">
              <q-icon
                :name="player.gender === 'male' ? 'male' : 'female'"
                :color="player.gender === 'male' ? 'blue' : 'pink'"
                size="lg"
              />
            </div>

            <div class="player-info">
              <div class="player-name">{{ player.name }}</div>
              <div class="player-gender">
                {{ player.gender === 'male' ? 'ชาย' : 'หญิง' }}
              </div>
            </div>

            <div class="player-status">
              <div class="status-container" @click="togglePlayerActive(player.id)">
                <q-toggle
                  v-model="player.isActive"
                  :color="player.isActive ? 'positive' : 'grey-5'"
                  :loading="player.isUpdating"
                  size="md"
                  @click.stop
                />
                <div class="status-info">
                  <div class="status-label" :class="{ 'status-active': player.isActive }">
                    {{ player.isActive ? 'พร้อมเล่น' : 'ไม่พร้อม' }}
                  </div>
                  <div class="status-hint">แตะเพื่อเปลี่ยน</div>
                </div>
              </div>
            </div>

            <div class="player-actions">
              <q-btn
                flat
                round
                color="primary"
                icon="edit"
                size="sm"
                @click="openEditDialog(player)"
              >
                <q-tooltip>แก้ไข</q-tooltip>
              </q-btn>

              <q-btn
                flat
                round
                color="negative"
                icon="delete"
                size="sm"
                @click="confirmDelete(player)"
              >
                <q-tooltip>ลบ</q-tooltip>
              </q-btn>
            </div>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Add/Edit Player Dialog -->
    <q-dialog v-model="showPlayerDialog" persistent>
      <q-card class="player-dialog">
        <!-- Header with gradient background -->
        <q-card-section class="dialog-header">
          <div class="dialog-header-content">
            <q-icon
              :name="isEditMode ? 'edit' : 'person_add'"
              size="2rem"
              color="white"
              class="dialog-icon"
            />
            <div class="dialog-title">
              {{ isEditMode ? 'แก้ไขผู้เล่น' : 'เพิ่มผู้เล่นใหม่' }}
            </div>
            <div class="dialog-subtitle">
              {{ isEditMode ? 'แก้ไขข้อมูลผู้เล่น' : 'กรอกข้อมูลผู้เล่นใหม่' }}
            </div>
          </div>
        </q-card-section>

        <!-- Form Content -->
        <q-card-section class="dialog-content">
          <!-- Name Input with Icon -->
          <div class="input-group">
            <div class="input-label">
              <q-icon name="badge" size="sm" color="primary" />
              <span>ชื่อผู้เล่น</span>
            </div>
            <q-input
              v-model="playerForm.name"
              placeholder="กรอกชื่อผู้เล่น"
              :rules="[val => !!val || 'กรุณาใส่ชื่อ']"
              ref="nameInput"
              @keyup.enter="savePlayer"
              class="custom-input"
              outlined
              rounded
              dense
              autofocus=""
            >
              <template v-slot:prepend>
                <q-icon name="person" color="grey-6" />
              </template>
            </q-input>
          </div>

          <!-- Gender Selection -->
          <div class="input-group">
            <div class="input-label">
              <q-icon name="wc" size="sm" color="primary" />
              <span>เพศ</span>
            </div>
            <div class="gender-selector">
              <q-btn
                v-for="option in genderOptions"
                :key="option.value"
                :class="{
                  'gender-btn': true,
                  'gender-btn-active': playerForm.gender === option.value,
                  'gender-btn-male': option.value === 'male',
                  'gender-btn-female': option.value === 'female'
                }"
                @click="playerForm.gender = option.value"
                :color="playerForm.gender === option.value ?
                  (option.value === 'male' ? 'blue' : 'pink') : 'grey-3'"
                :text-color="playerForm.gender === option.value ? 'white' : 'grey-7'"
                rounded
                unelevated
                size="md"
              >
                <q-icon
                  :name="option.value === 'male' ? 'male' : 'female'"
                  size="sm"
                  class="q-mr-sm"
                />
                {{ option.label }}
              </q-btn>
            </div>
          </div>
        </q-card-section>

        <!-- Action Buttons -->
        <q-card-actions class="dialog-actions">
          <q-btn
            flat
            label="ยกเลิก"
            color="grey-6"
            v-close-popup
            @click="resetForm"
            size="md"
            class="action-btn cancel-btn"
          />
          <q-btn
            :label="isEditMode ? 'บันทึก' : 'เพิ่มผู้เล่น'"
            :color="isEditMode ? 'green' : 'primary'"
            @click="savePlayer"
            :disable="!playerForm.name.trim()"
            rounded
            unelevated
            size="md"
            class="action-btn save-btn"
            :icon="isEditMode ? 'save' : 'add'"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Delete Confirmation Dialog -->
    <q-dialog v-model="showDeleteConfirm" persistent>
      <q-card class="delete-dialog">
        <q-card-section class="dialog-header">
          <q-icon name="warning" size="2rem" color="negative" />
          <div class="delete-title">ยืนยันการลบ</div>
        </q-card-section>

        <q-card-section>
          <div class="delete-message">
            ต้องการลบ <strong>"{{ playerToDelete?.name }}"</strong> หรือไม่?
          </div>
        </q-card-section>

        <q-card-actions class="dialog-actions">
          <q-btn flat label="ยกเลิก" color="grey" v-close-popup />
          <q-btn
            label="ลบ"
            color="negative"
            @click="deletePlayer"
            v-close-popup
            rounded
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import { useBadmintonStore } from 'stores/badminton-store'
import { useAuthStore } from 'stores/auth-store'
import { useQuasar } from 'quasar'
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  onSnapshot
} from 'firebase/firestore'
import { db } from 'boot/firebase'

const $q = useQuasar()
const badmintonStore = useBadmintonStore()
const authStore = useAuthStore()

// Reactive data
const showPlayerDialog = ref(false)
const showDeleteConfirm = ref(false)
const playerToDelete = ref(null)
const nameInput = ref(null)
const isEditMode = ref(false)
const editingPlayerId = ref(null)

const playerForm = ref({
  name: '',
  gender: 'male'
})

// Computed
const players = computed(() => badmintonStore.players)
const totalPlayers = computed(() => badmintonStore.totalPlayers)
const activePlayers = computed(() => badmintonStore.activePlayers)

// Options
const genderOptions = [
  { label: 'ชาย', value: 'male' },
  { label: 'หญิง', value: 'female' }
]

// Firestore functions
const loadPlayersFromFirestore = async () => {
  if (authStore.isOfflineMode) return

  try {
    const playersRef = collection(db, 'players')
    const q = query(playersRef, where('userId', '==', authStore.userId))

    const querySnapshot = await getDocs(q)
    const firestorePlayers = []

    querySnapshot.forEach((doc) => {
      firestorePlayers.push({
        firestoreId: doc.id,
        ...doc.data()
      })
    })

    // Update local store with Firestore data
    badmintonStore.setPlayersFromFirestore(firestorePlayers)

    console.log(`Loaded ${firestorePlayers.length} players from Firestore`)
  } catch (error) {
    console.error('Error loading players:', error)
    $q.notify({
      type: 'negative',
      message: 'ไม่สามารถโหลดข้อมูลผู้เล่นได้',
      position: 'top'
    })
  }
}

const savePlayerToFirestore = async (playerData) => {
  if (authStore.isOfflineMode) return null

  try {
    const playersRef = collection(db, 'players')
    const docRef = await addDoc(playersRef, {
      ...playerData,
      userId: authStore.userId,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    console.log('Player saved to Firestore with ID:', docRef.id)
    return docRef.id
  } catch (error) {
    console.error('Error saving player:', error)
    $q.notify({
      type: 'negative',
      message: 'ไม่สามารถบันทึกข้อมูลได้',
      position: 'top'
    })
    return null
  }
}

const updatePlayerInFirestore = async (firestoreId, playerData) => {
  if (authStore.isOfflineMode || !firestoreId) return

  try {
    const playerRef = doc(db, 'players', firestoreId)
    await updateDoc(playerRef, {
      ...playerData,
      updatedAt: new Date()
    })

    console.log('Player updated in Firestore')
  } catch (error) {
    console.error('Error updating player:', error)
    $q.notify({
      type: 'negative',
      message: 'ไม่สามารถอัปเดตข้อมูลได้',
      position: 'top'
    })
  }
}

const deletePlayerFromFirestore = async (firestoreId) => {
  if (authStore.isOfflineMode || !firestoreId) return

  try {
    const playerRef = doc(db, 'players', firestoreId)
    await deleteDoc(playerRef)

    console.log('Player deleted from Firestore')
  } catch (error) {
    console.error('Error deleting player:', error)
    $q.notify({
      type: 'negative',
      message: 'ไม่สามารถลบข้อมูลได้',
      position: 'top'
    })
  }
}

// Load players on component mount
onMounted(() => {
  if (authStore.isLoggedIn && !authStore.isOfflineMode) {
    loadPlayersFromFirestore()
  }
})

// Methods
function resetForm() {
  playerForm.value = {
    name: '',
    gender: 'male'
  }
  isEditMode.value = false
  editingPlayerId.value = null
}

function openAddDialog() {
  resetForm()
  showPlayerDialog.value = true
  nextTick(() => {
    if (nameInput.value) {
      nameInput.value.focus()
    }
  })
}

function openEditDialog(player) {
  playerForm.value = {
    name: player.name,
    gender: player.gender
  }
  isEditMode.value = true
  editingPlayerId.value = player.id
  showPlayerDialog.value = true
  nextTick(() => {
    if (nameInput.value) {
      nameInput.value.focus()
    }
  })
}

async function savePlayer() {
  if (!playerForm.value.name.trim()) {
    $q.notify({
      type: 'warning',
      message: 'กรุณาใส่ชื่อผู้เล่น',
      position: 'top'
    })
    return
  }

  // ตรวจสอบชื่อซ้ำ (ยกเว้นตัวเองถ้าเป็นการแก้ไข)
  const exists = players.value.some(p =>
    p.name.toLowerCase() === playerForm.value.name.trim().toLowerCase() &&
    p.id !== editingPlayerId.value
  )

  if (exists) {
    $q.notify({
      type: 'warning',
      message: 'มีชื่อนี้อยู่แล้ว',
      position: 'top'
    })
    return
  }

  if (isEditMode.value) {
    // แก้ไขผู้เล่น
    const playerData = {
      name: playerForm.value.name.trim(),
      gender: playerForm.value.gender
    }

    badmintonStore.updatePlayer(editingPlayerId.value, playerData)

    // Update in Firestore if not offline
    const player = players.value.find(p => p.id === editingPlayerId.value)
    if (player?.firestoreId) {
      await updatePlayerInFirestore(player.firestoreId, playerData)
    }

    $q.notify({
      type: 'positive',
      message: `แก้ไข "${playerForm.value.name}" แล้ว!`,
      position: 'top'
    })
  } else {
    // เพิ่มผู้เล่นใหม่
    const playerData = {
      name: playerForm.value.name.trim(),
      gender: playerForm.value.gender,
      isActive: true
    }

    // Save to Firestore first (if online)
    const firestoreId = await savePlayerToFirestore(playerData)

    // Add to local store
    const localPlayer = badmintonStore.addPlayer(playerData.name, playerData.gender)

    // Update local player with Firestore ID
    if (firestoreId && localPlayer) {
      badmintonStore.updatePlayer(localPlayer.id, { firestoreId })
    }

    $q.notify({
      type: 'positive',
      message: `เพิ่ม "${playerForm.value.name}" แล้ว!${authStore.isOfflineMode ? ' (ออฟไลน์)' : ''}`,
      position: 'top'
    })
  }

  showPlayerDialog.value = false
  resetForm()
}

async function togglePlayerActive(playerId) {
  const player = players.value.find(p => p.id === playerId)
  if (!player) return

  // Set loading state
  badmintonStore.updatePlayer(playerId, { isUpdating: true })

  try {
    // Toggle in local store
    badmintonStore.togglePlayerActive(playerId)

    // Update in Firestore if not offline
    if (player?.firestoreId) {
      await updatePlayerInFirestore(player.firestoreId, { isActive: player.isActive })
    }

    $q.notify({
      type: player.isActive ? 'positive' : 'info',
      message: `${player.name} ${player.isActive ? 'พร้อมเล่น' : 'ไม่พร้อมเล่น'}`,
      position: 'top',
      timeout: 1500,
      icon: player.isActive ? 'check_circle' : 'pause_circle_filled'
    })
  } catch (error) {
    // Revert on error
    badmintonStore.togglePlayerActive(playerId)

    $q.notify({
      type: 'negative',
      message: 'ไม่สามารถอัปเดตสถานะได้',
      position: 'top'
    })
  } finally {
    // Clear loading state
    badmintonStore.updatePlayer(playerId, { isUpdating: false })
  }
}

function confirmDelete(player) {
  playerToDelete.value = player
  showDeleteConfirm.value = true
}

async function deletePlayer() {
  const player = playerToDelete.value

  // Delete from Firestore if not offline
  if (player?.firestoreId) {
    await deletePlayerFromFirestore(player.firestoreId)
  }

  badmintonStore.removePlayer(player.id)

  $q.notify({
    type: 'positive',
    message: `ลบ "${player.name}" แล้ว!`,
    position: 'top'
  })

  playerToDelete.value = null
}
</script>

<style scoped>
.players-page {
  padding: 20px;
  max-width: 1000px;
  margin: 0 auto;
}

/* Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding: 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border-radius: 16px;
}

.header-content {
  flex: 1;
}

.page-title {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: bold;
  color: #333;
}

.page-subtitle {
  margin: 0;
  color: #666;
  font-size: 16px;
}

/* Stats */
.stats-row {
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.stat-content {
  flex: 1;
}

.stat-number {
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

/* Players Card */
.players-card {
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.list-title {
  margin: 0;
  font-size: 20px;
  font-weight: bold;
  color: #333;
}

.player-count {
  color: #666;
  font-size: 14px;
  background: #f5f5f5;
  padding: 4px 12px;
  border-radius: 16px;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-title {
  font-size: 20px;
  font-weight: bold;
  color: #333;
  margin: 16px 0 8px;
}

.empty-subtitle {
  color: #666;
  margin-bottom: 20px;
}

/* Players Grid */
.players-grid {
  display: grid;
  gap: 16px;
}

.player-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #f9f9f9;
  border-radius: 12px;
  border-left: 4px solid #1976d2;
  transition: all 0.3s ease;
}

.player-card:hover {
  background: #f0f0f0;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.player-card.inactive {
  opacity: 0.6;
  border-left-color: #ccc;
}

.player-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.player-info {
  flex: 1;
}

.player-name {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 4px;
}

.player-gender {
  font-size: 12px;
  color: #666;
}

.player-status {
  text-align: center;
  margin-right: 16px;
}

.status-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: rgba(0, 0, 0, 0.02);
  border: 1px solid transparent;
}

.status-container:hover {
  background: rgba(0, 0, 0, 0.05);
  border-color: rgba(25, 118, 210, 0.2);
  transform: translateY(-1px);
}

.status-container:active {
  transform: translateY(0);
}

.status-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.status-label {
  font-size: 12px;
  font-weight: 600;
  color: #666;
  transition: color 0.3s ease;
}

.status-label.status-active {
  color: #4caf50;
}

.status-hint {
  font-size: 10px;
  color: #999;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.status-container:hover .status-hint {
  opacity: 1;
}

.player-actions {
  display: flex;
  gap: 4px;
}

/* Dialogs */
.player-dialog {
  min-width: 420px;
  max-width: 500px;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
}

.dialog-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 24px;
  text-align: center;
  position: relative;
}

.dialog-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.1) 50%, transparent 70%);
  animation: shimmer 3s infinite;
}

.dialog-header-content {
  position: relative;
  z-index: 2;
}

.dialog-icon {
  margin-bottom: 8px;
  opacity: 0.9;
}

.dialog-title {
  font-size: 22px;
  font-weight: bold;
  margin-bottom: 4px;
}

.dialog-subtitle {
  font-size: 14px;
  opacity: 0.9;
}

.dialog-content {
  padding: 32px 24px 24px;
  background: linear-gradient(to bottom, #fafbfc 0%, #ffffff 100%);
}

.input-group {
  margin-bottom: 24px;
}

.input-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}

.custom-input {
  border-radius: 12px;
}

.custom-input .q-field__control {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
}

.custom-input.q-field--focused .q-field__control {
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
  transform: translateY(-1px);
}

.gender-selector {
  display: flex;
  gap: 12px;
  width: 100%;
}

.gender-btn {
  flex: 1;
  height: 48px;
  font-weight: 500;
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  border: 2px solid transparent;
}

.gender-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.gender-btn-active {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.gender-btn-male.gender-btn-active {
  box-shadow: 0 6px 16px rgba(33, 150, 243, 0.4);
}

.gender-btn-female.gender-btn-active {
  box-shadow: 0 6px 16px rgba(233, 30, 99, 0.4);
}

.dialog-actions {
  padding: 20px 24px 24px;
  gap: 12px;
  background: #fafbfc;
  border-top: 1px solid #e0e0e0;
}

.action-btn {
  height: 48px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.cancel-btn {
  border: 2px solid #e0e0e0;
  border-radius: 12px;
}

.cancel-btn:hover {
  background: #f5f5f5;
  border-color: #d0d0d0;
}

.save-btn {
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.save-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.save-btn:disabled {
  opacity: 0.6;
  transform: none !important;
  box-shadow: none !important;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(200%);
  }
}

/* Responsive for Dialog */
@media (max-width: 768px) {
  .player-dialog {
    min-width: 320px;
    max-width: 90vw;
    margin: 16px;
  }

  .dialog-content {
    padding: 24px 20px 20px;
  }

  .dialog-actions {
    padding: 16px 20px 20px;
    flex-direction: column;
  }

  .action-btn {
    width: 100%;
    margin: 4px 0;
  }

  .gender-selector {
    flex-direction: column;
    gap: 8px;
  }

  .gender-btn {
    width: 100%;
  }
}

.delete-dialog {
  min-width: 350px;
  border-radius: 16px;
}

.dialog-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.delete-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.delete-message {
  font-size: 16px;
  color: #333;
  text-align: center;
}

/* Responsive */
@media (max-width: 768px) {
  .players-page {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }

  .stats-row {
    flex-direction: column;
  }

  .player-card {
    flex-direction: column;
    text-align: center;
  }

  .player-actions {
    justify-content: center;
  }

  .status-container {
    padding: 6px 8px;
  }

  .status-hint {
    display: none; /* Hide hint on mobile to save space */
  }

  .player-dialog {
    min-width: 300px;
    margin: 16px;
  }
}
</style>
